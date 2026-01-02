"""
FP&A Planning Routes
Core CRUD operations for planning data
"""

from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime, timezone
import logging

from models.fpa_models import (
    PlanningVersion, PlanningVersionCreate,
    PlanningData, PlanningDataCreate, PlanningDataBulkCreate,
    PlanningDataQuery, VersionSummary
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fpa/planning", tags=["FP&A Planning"])


def get_fpa_router(db: AsyncIOMotorDatabase, get_current_user):
    """Create FPA planning router with dependencies"""
    
    @router.get("/versions", response_model=List[PlanningVersion])
    async def list_versions(current_user: dict = Depends(get_current_user)):
        """List all planning versions"""
        try:
            versions = await db.planning_versions.find({}, {"_id": 0}).to_list(None)
            return versions
        except Exception as e:
            logger.error(f"Error listing versions: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/versions", response_model=PlanningVersion)
    async def create_version(
        version_data: PlanningVersionCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create new planning version"""
        try:
            # Check permissions (implement based on user role)
            # For now, allow all authenticated users
            
            # Check for duplicate name
            existing = await db.planning_versions.find_one(
                {"name": version_data.name},
                {"_id": 0}
            )
            if existing:
                raise HTTPException(
                    status_code=400,
                    detail=f"A planning version with name '{version_data.name}' already exists. Please choose a different name."
                )
            
            version_dict = version_data.model_dump()
            version_dict["created_by"] = current_user["id"]
            version_dict["created_at"] = datetime.now(timezone.utc)
            version_dict["updated_at"] = datetime.now(timezone.utc)
            
            # Generate ID
            import uuid
            version_dict["id"] = str(uuid.uuid4())
            version_dict["is_locked"] = False
            
            await db.planning_versions.insert_one(version_dict)
            
            return version_dict
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating version: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/versions/{version_id}", response_model=VersionSummary)
    async def get_version_summary(
        version_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get version with summary statistics"""
        try:
            version = await db.planning_versions.find_one(
                {"id": version_id},
                {"_id": 0}
            )
            
            if not version:
                raise HTTPException(status_code=404, detail="Version not found")
            
            # Count data points
            data_count = await db.planning_data.count_documents({"version_id": version_id})
            
            # Get last update time
            last_data = await db.planning_data.find_one(
                {"version_id": version_id},
                {"_id": 0, "updated_at": 1},
                sort=[("updated_at", -1)]
            )
            
            last_updated = last_data["updated_at"] if last_data else version["created_at"]
            
            # Get unique contributors
            pipeline = [
                {"$match": {"version_id": version_id}},
                {"$group": {"_id": "$created_by"}},
                {"$limit": 10}
            ]
            
            contributors_cursor = db.planning_data.aggregate(pipeline)
            contributors = [doc["_id"] async for doc in contributors_cursor]
            
            return {
                "version": version,
                "data_point_count": data_count,
                "last_updated": last_updated,
                "contributors": contributors
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting version summary: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/data", response_model=PlanningData)
    async def create_planning_data(
        data: PlanningDataCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create or update planning data point"""
        try:
            # Check if data point already exists
            query = {
                "version_id": data.version_id,
                "entity_id": data.entity_id,
                "department_id": data.department_id,
                "time_period": data.time_period,
                "account_id": data.account_id
            }
            
            if data.product_id:
                query["product_id"] = data.product_id
            if data.customer_segment_id:
                query["customer_segment_id"] = data.customer_segment_id
            if data.geography_id:
                query["geography_id"] = data.geography_id
            
            existing = await db.planning_data.find_one(query, {"_id": 0})
            
            if existing:
                # Update existing
                await db.planning_data.update_one(
                    {"id": existing["id"]},
                    {
                        "$set": {
                            "value": data.value,
                            "previous_value": existing.get("value"),
                            "notes": data.notes,
                            "updated_by": current_user["id"],
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
                
                # Create audit log
                await _create_audit_log(
                    db,
                    user_id=current_user["id"],
                    user_email=current_user["email"],
                    action="update",
                    entity_type="planning_data",
                    entity_id=existing["id"],
                    previous_value={"value": existing.get("value")},
                    new_value={"value": data.value},
                    version_id=data.version_id
                )
                
                updated = await db.planning_data.find_one({"id": existing["id"]}, {"_id": 0})
                return updated
            else:
                # Create new
                import uuid
                data_dict = data.model_dump()
                data_dict["id"] = str(uuid.uuid4())
                data_dict["created_by"] = current_user["id"]
                data_dict["updated_by"] = current_user["id"]
                data_dict["created_at"] = datetime.now(timezone.utc)
                data_dict["updated_at"] = datetime.now(timezone.utc)
                
                await db.planning_data.insert_one(data_dict)
                
                # Create audit log
                await _create_audit_log(
                    db,
                    user_id=current_user["id"],
                    user_email=current_user["email"],
                    action="create",
                    entity_type="planning_data",
                    entity_id=data_dict["id"],
                    new_value={"value": data.value},
                    version_id=data.version_id
                )
                
                return data_dict
                
        except Exception as e:
            logger.error(f"Error creating planning data: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/data/bulk", response_model=dict)
    async def create_planning_data_bulk(
        bulk_data: PlanningDataBulkCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Bulk create planning data"""
        try:
            created = 0
            updated = 0
            
            for data_point in bulk_data.data_points:
                result = await create_planning_data(data_point, current_user)
                if result:
                    # Check if it was an update or create
                    if result.get("previous_value") is not None:
                        updated += 1
                    else:
                        created += 1
            
            return {
                "success": True,
                "created": created,
                "updated": updated,
                "total": len(bulk_data.data_points)
            }
            
        except Exception as e:
            logger.error(f"Error bulk creating planning data: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/data/query", response_model=List[PlanningData])
    async def query_planning_data(
        query: PlanningDataQuery,
        current_user: dict = Depends(get_current_user)
    ):
        """Query planning data with filters"""
        try:
            filter_dict = {}
            
            if query.version_id:
                filter_dict["version_id"] = query.version_id
            
            if query.entity_ids:
                filter_dict["entity_id"] = {"$in": query.entity_ids}
            
            if query.department_ids:
                filter_dict["department_id"] = {"$in": query.department_ids}
            
            if query.account_ids:
                filter_dict["account_id"] = {"$in": query.account_ids}
            
            if query.product_ids:
                filter_dict["product_id"] = {"$in": query.product_ids}
            
            if query.customer_segment_ids:
                filter_dict["customer_segment_id"] = {"$in": query.customer_segment_ids}
            
            if query.geography_ids:
                filter_dict["geography_id"] = {"$in": query.geography_ids}
            
            # Time period range
            if query.start_period and query.end_period:
                filter_dict["time_period"] = {
                    "$gte": query.start_period,
                    "$lte": query.end_period
                }
            elif query.start_period:
                filter_dict["time_period"] = {"$gte": query.start_period}
            elif query.end_period:
                filter_dict["time_period"] = {"$lte": query.end_period}
            
            data = await db.planning_data.find(filter_dict, {"_id": 0}).to_list(1000)
            
            return data
            
        except Exception as e:
            logger.error(f"Error querying planning data: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.delete("/data/{data_id}")
    async def delete_planning_data(
        data_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete planning data point"""
        try:
            # Get data for audit
            data = await db.planning_data.find_one({"id": data_id}, {"_id": 0})
            
            if not data:
                raise HTTPException(status_code=404, detail="Data not found")
            
            # Delete
            await db.planning_data.delete_one({"id": data_id})
            
            # Create audit log
            await _create_audit_log(
                db,
                user_id=current_user["id"],
                user_email=current_user["email"],
                action="delete",
                entity_type="planning_data",
                entity_id=data_id,
                previous_value={"value": data.get("value")},
                version_id=data.get("version_id")
            )
            
            return {"success": True, "message": "Data deleted"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting planning data: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return router


async def _create_audit_log(
    db: AsyncIOMotorDatabase,
    user_id: str,
    user_email: str,
    action: str,
    entity_type: str,
    entity_id: str,
    previous_value: dict = None,
    new_value: dict = None,
    version_id: str = None
):
    """Helper to create audit log entry"""
    import uuid
    
    log_entry = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "user_email": user_email,
        "action": action,
        "entity_type": entity_type,
        "entity_id": entity_id,
        "previous_value": previous_value,
        "new_value": new_value,
        "version_id": version_id,
        "timestamp": datetime.now(timezone.utc)
    }
    
    await db.audit_logs.insert_one(log_entry)
