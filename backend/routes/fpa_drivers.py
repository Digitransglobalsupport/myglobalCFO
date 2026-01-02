"""
FP&A Drivers and Formulas Routes
Manage operational drivers and calculation formulas
"""

from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone
import logging

from models.fpa_models import (
    Driver, DriverCreate, DriverValue, DriverValueCreate,
    Formula, FormulaCreate
)
from services.fpa_calculation_engine import CalculationEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fpa/drivers", tags=["FP&A Drivers"])


def get_drivers_router(db: AsyncIOMotorDatabase, get_current_user):
    """Create FPA drivers router with dependencies"""
    
    calc_engine = CalculationEngine(db)
    
    # ==================== DRIVER ROUTES ====================
    
    @router.get("/", response_model=List[Driver])
    async def list_drivers(
        entity_id: str = None,
        department_id: str = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List all drivers"""
        try:
            query = {"is_active": True}
            
            if entity_id:
                query["entity_id"] = entity_id
            if department_id:
                query["department_id"] = department_id
            
            drivers = await db.drivers.find(query, {"_id": 0}).to_list(None)
            return drivers
        except Exception as e:
            logger.error(f"Error listing drivers: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/", response_model=Driver)
    async def create_driver(
        driver_data: DriverCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create new operational driver"""
        try:
            # Check if code already exists
            existing = await db.drivers.find_one({"code": driver_data.code}, {"_id": 0})
            if existing:
                raise HTTPException(status_code=400, detail="Driver code already exists")
            
            import uuid
            driver_dict = driver_data.model_dump()
            driver_dict["id"] = str(uuid.uuid4())
            driver_dict["is_active"] = True
            driver_dict["created_by"] = current_user["id"]
            driver_dict["created_at"] = datetime.now(timezone.utc)
            
            await db.drivers.insert_one(driver_dict)
            
            return driver_dict
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating driver: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/{driver_id}", response_model=Driver)
    async def get_driver(
        driver_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get driver by ID"""
        try:
            driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
            if not driver:
                raise HTTPException(status_code=404, detail="Driver not found")
            return driver
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting driver: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.put("/{driver_id}", response_model=Driver)
    async def update_driver(
        driver_id: str,
        driver_data: DriverCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Update driver"""
        try:
            driver = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
            if not driver:
                raise HTTPException(status_code=404, detail="Driver not found")
            
            update_dict = driver_data.model_dump()
            
            await db.drivers.update_one(
                {"id": driver_id},
                {"$set": update_dict}
            )
            
            updated = await db.drivers.find_one({"id": driver_id}, {"_id": 0})
            return updated
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating driver: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.delete("/{driver_id}")
    async def delete_driver(
        driver_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Soft delete driver"""
        try:
            await db.drivers.update_one(
                {"id": driver_id},
                {"$set": {"is_active": False}}
            )
            return {"success": True, "message": "Driver deactivated"}
        except Exception as e:
            logger.error(f"Error deleting driver: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== DRIVER VALUE ROUTES ====================
    
    @router.post("/values", response_model=DriverValue)
    async def create_driver_value(
        value_data: DriverValueCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create or update driver value"""
        try:
            # Check if value already exists
            query = {
                "driver_id": value_data.driver_id,
                "version_id": value_data.version_id,
                "time_period": value_data.time_period
            }
            
            if value_data.entity_id:
                query["entity_id"] = value_data.entity_id
            if value_data.department_id:
                query["department_id"] = value_data.department_id
            if value_data.product_id:
                query["product_id"] = value_data.product_id
            
            existing = await db.driver_values.find_one(query, {"_id": 0})
            
            if existing:
                # Update
                await db.driver_values.update_one(
                    {"id": existing["id"]},
                    {
                        "$set": {
                            "value": value_data.value,
                            "previous_value": existing.get("value"),
                            "updated_by": current_user["id"],
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                )
                updated = await db.driver_values.find_one({"id": existing["id"]}, {"_id": 0})
                
                # Trigger recalculation of dependent accounts
                await calc_engine.recalculate_dependent_accounts(
                    changed_driver_ids=[value_data.driver_id],
                    version_id=value_data.version_id,
                    time_period=value_data.time_period,
                    entity_id=value_data.entity_id,
                    department_id=value_data.department_id,
                    user_id=current_user["id"]
                )
                
                return updated
            else:
                # Create
                import uuid
                value_dict = value_data.model_dump()
                value_dict["id"] = str(uuid.uuid4())
                value_dict["created_by"] = current_user["id"]
                value_dict["updated_by"] = current_user["id"]
                value_dict["created_at"] = datetime.now(timezone.utc)
                value_dict["updated_at"] = datetime.now(timezone.utc)
                
                await db.driver_values.insert_one(value_dict)
                
                # Trigger recalculation of dependent accounts
                await calc_engine.recalculate_dependent_accounts(
                    changed_driver_ids=[value_data.driver_id],
                    version_id=value_data.version_id,
                    time_period=value_data.time_period,
                    entity_id=value_data.entity_id,
                    department_id=value_data.department_id,
                    user_id=current_user["id"]
                )
                
                return value_dict
                
        except Exception as e:
            logger.error(f"Error creating driver value: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/values/{driver_id}")
    async def get_driver_values(
        driver_id: str,
        version_id: str,
        start_period: str = None,
        end_period: str = None,
        current_user: dict = Depends(get_current_user)
    ):
        """Get driver values for a driver across time periods"""
        try:
            query = {
                "driver_id": driver_id,
                "version_id": version_id
            }
            
            if start_period and end_period:
                query["time_period"] = {"$gte": start_period, "$lte": end_period}
            
            values = await db.driver_values.find(query, {"_id": 0}).to_list(None)
            return values
            
        except Exception as e:
            logger.error(f"Error getting driver values: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== FORMULA ROUTES ====================
    
    @router.get("/formulas/", response_model=List[Formula])
    async def list_formulas(
        account_id: str = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List all formulas"""
        try:
            query = {"is_active": True}
            
            if account_id:
                query["account_id"] = account_id
            
            formulas = await db.formulas.find(query, {"_id": 0}).to_list(None)
            return formulas
        except Exception as e:
            logger.error(f"Error listing formulas: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/formulas/", response_model=Formula)
    async def create_formula(
        formula_data: FormulaCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create new formula"""
        try:
            # Validate formula
            validation = await calc_engine.validate_formula(
                formula_data.expression,
                formula_data.dependencies
            )
            
            if not validation["valid"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid formula: {', '.join(validation['errors'])}"
                )
            
            import uuid
            formula_dict = formula_data.model_dump()
            formula_dict["id"] = str(uuid.uuid4())
            formula_dict["is_active"] = True
            formula_dict["created_by"] = current_user["id"]
            formula_dict["created_at"] = datetime.now(timezone.utc)
            formula_dict["updated_at"] = datetime.now(timezone.utc)
            
            await db.formulas.insert_one(formula_dict)
            
            return formula_dict
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating formula: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/formulas/validate")
    async def validate_formula(
        expression: str,
        dependencies: List[str],
        current_user: dict = Depends(get_current_user)
    ):
        """Validate a formula expression"""
        try:
            validation = await calc_engine.validate_formula(expression, dependencies)
            return validation
        except Exception as e:
            logger.error(f"Error validating formula: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.delete("/formulas/{formula_id}")
    async def delete_formula(
        formula_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Soft delete formula"""
        try:
            await db.formulas.update_one(
                {"id": formula_id},
                {"$set": {"is_active": False}}
            )
            return {"success": True, "message": "Formula deactivated"}
        except Exception as e:
            logger.error(f"Error deleting formula: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return router
