"""
FP&A Dimensions Routes
Manage entities, departments, products, segments, geographies, accounts
"""

from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone
import logging
import uuid

from models.fpa_models import (
    Entity, Department, Product, CustomerSegment, Geography, Account,
    DimensionSummary
)
from pydantic import BaseModel

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fpa/dimensions", tags=["FP&A Dimensions"])


# Simple create models (without ID)
class EntityCreate(BaseModel):
    name: str
    code: str
    parent_entity_id: str = None
    currency: str = "USD"

class DepartmentCreate(BaseModel):
    name: str
    code: str
    entity_id: str
    manager_user_id: str = None

class ProductCreate(BaseModel):
    name: str
    code: str
    category: str = None

class CustomerSegmentCreate(BaseModel):
    name: str
    code: str

class GeographyCreate(BaseModel):
    name: str
    code: str

class AccountCreate(BaseModel):
    name: str
    code: str
    category: str
    account_type: str


def get_dimensions_router(db: AsyncIOMotorDatabase, get_current_user):
    """Create FPA dimensions router with dependencies"""
    
    # ==================== ENTITY ROUTES ====================
    
    @router.get("/entities", response_model=List[Entity])
    async def list_entities(current_user: dict = Depends(get_current_user)):
        """List all entities"""
        try:
            entities = await db.entities.find({"is_active": True}, {"_id": 0}).to_list(None)
            return entities
        except Exception as e:
            logger.error(f"Error listing entities: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/entities", response_model=Entity)
    async def create_entity(
        entity_data: EntityCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create new entity"""
        try:
            entity_dict = entity_data.model_dump()
            entity_dict["id"] = str(uuid.uuid4())
            entity_dict["is_active"] = True
            entity_dict["created_at"] = datetime.now(timezone.utc)
            
            await db.entities.insert_one(entity_dict)
            return entity_dict
        except Exception as e:
            logger.error(f"Error creating entity: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.delete("/entities/{entity_id}")
    async def delete_entity(
        entity_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Soft delete entity"""
        try:
            await db.entities.update_one(
                {"id": entity_id},
                {"$set": {"is_active": False}}
            )
            return {"success": True}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== DEPARTMENT ROUTES ====================
    
    @router.get("/departments", response_model=List[Department])
    async def list_departments(
        entity_id: str = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List all departments"""
        try:
            query = {"is_active": True}
            if entity_id:
                query["entity_id"] = entity_id
            
            departments = await db.departments.find(query, {"_id": 0}).to_list(None)
            return departments
        except Exception as e:
            logger.error(f"Error listing departments: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/departments", response_model=Department)
    async def create_department(
        dept_data: DepartmentCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create new department"""
        try:
            dept_dict = dept_data.model_dump()
            dept_dict["id"] = str(uuid.uuid4())
            dept_dict["is_active"] = True
            dept_dict["created_at"] = datetime.now(timezone.utc)
            
            await db.departments.insert_one(dept_dict)
            return dept_dict
        except Exception as e:
            logger.error(f"Error creating department: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.delete("/departments/{dept_id}")
    async def delete_department(
        dept_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Soft delete department"""
        try:
            await db.departments.update_one(
                {"id": dept_id},
                {"$set": {"is_active": False}}
            )
            return {"success": True}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== PRODUCT ROUTES ====================
    
    @router.get("/products", response_model=List[Product])
    async def list_products(current_user: dict = Depends(get_current_user)):
        """List all products"""
        try:
            products = await db.products.find({"is_active": True}, {"_id": 0}).to_list(None)
            return products
        except Exception as e:
            logger.error(f"Error listing products: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/products", response_model=Product)
    async def create_product(
        product_data: ProductCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create new product"""
        try:
            product_dict = product_data.model_dump()
            product_dict["id"] = str(uuid.uuid4())
            product_dict["is_active"] = True
            product_dict["created_at"] = datetime.now(timezone.utc)
            
            await db.products.insert_one(product_dict)
            return product_dict
        except Exception as e:
            logger.error(f"Error creating product: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.delete("/products/{product_id}")
    async def delete_product(
        product_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Soft delete product"""
        try:
            await db.products.update_one(
                {"id": product_id},
                {"$set": {"is_active": False}}
            )
            return {"success": True}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== CUSTOMER SEGMENT ROUTES ====================
    
    @router.get("/segments", response_model=List[CustomerSegment])
    async def list_segments(current_user: dict = Depends(get_current_user)):
        """List all customer segments"""
        try:
            segments = await db.customer_segments.find({"is_active": True}, {"_id": 0}).to_list(None)
            return segments
        except Exception as e:
            logger.error(f"Error listing segments: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/segments", response_model=CustomerSegment)
    async def create_segment(
        segment_data: CustomerSegmentCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create new customer segment"""
        try:
            segment_dict = segment_data.model_dump()
            segment_dict["id"] = str(uuid.uuid4())
            segment_dict["is_active"] = True
            segment_dict["created_at"] = datetime.now(timezone.utc)
            
            await db.customer_segments.insert_one(segment_dict)
            return segment_dict
        except Exception as e:
            logger.error(f"Error creating segment: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.delete("/segments/{segment_id}")
    async def delete_segment(
        segment_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Soft delete segment"""
        try:
            await db.customer_segments.update_one(
                {"id": segment_id},
                {"$set": {"is_active": False}}
            )
            return {"success": True}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== GEOGRAPHY ROUTES ====================
    
    @router.get("/geographies", response_model=List[Geography])
    async def list_geographies(current_user: dict = Depends(get_current_user)):
        """List all geographies"""
        try:
            geographies = await db.geographies.find({"is_active": True}, {"_id": 0}).to_list(None)
            return geographies
        except Exception as e:
            logger.error(f"Error listing geographies: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/geographies", response_model=Geography)
    async def create_geography(
        geo_data: GeographyCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create new geography"""
        try:
            geo_dict = geo_data.model_dump()
            geo_dict["id"] = str(uuid.uuid4())
            geo_dict["is_active"] = True
            geo_dict["created_at"] = datetime.now(timezone.utc)
            
            await db.geographies.insert_one(geo_dict)
            return geo_dict
        except Exception as e:
            logger.error(f"Error creating geography: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.delete("/geographies/{geo_id}")
    async def delete_geography(
        geo_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Soft delete geography"""
        try:
            await db.geographies.update_one(
                {"id": geo_id},
                {"$set": {"is_active": False}}
            )
            return {"success": True}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== ACCOUNT ROUTES ====================
    
    @router.get("/accounts", response_model=List[Account])
    async def list_accounts(
        category: str = None,
        account_type: str = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List all accounts"""
        try:
            query = {"is_active": True}
            if category:
                query["category"] = category
            if account_type:
                query["account_type"] = account_type
            
            accounts = await db.accounts.find(query, {"_id": 0}).to_list(None)
            return accounts
        except Exception as e:
            logger.error(f"Error listing accounts: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/accounts", response_model=Account)
    async def create_account(
        account_data: AccountCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create new account"""
        try:
            account_dict = account_data.model_dump()
            account_dict["id"] = str(uuid.uuid4())
            account_dict["is_active"] = True
            account_dict["created_at"] = datetime.now(timezone.utc)
            
            await db.accounts.insert_one(account_dict)
            return account_dict
        except Exception as e:
            logger.error(f"Error creating account: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.delete("/accounts/{account_id}")
    async def delete_account(
        account_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Soft delete account"""
        try:
            await db.accounts.update_one(
                {"id": account_id},
                {"$set": {"is_active": False}}
            )
            return {"success": True}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== SUMMARY ROUTE ====================
    
    @router.get("/summary", response_model=DimensionSummary)
    async def get_dimension_summary(current_user: dict = Depends(get_current_user)):
        """Get count summary of all dimensions"""
        try:
            entities = await db.entities.count_documents({"is_active": True})
            departments = await db.departments.count_documents({"is_active": True})
            accounts = await db.accounts.count_documents({"is_active": True})
            products = await db.products.count_documents({"is_active": True})
            segments = await db.customer_segments.count_documents({"is_active": True})
            geographies = await db.geographies.count_documents({"is_active": True})
            
            return {
                "entities": entities,
                "departments": departments,
                "accounts": accounts,
                "products": products,
                "customer_segments": segments,
                "geographies": geographies
            }
        except Exception as e:
            logger.error(f"Error getting dimension summary: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return router
