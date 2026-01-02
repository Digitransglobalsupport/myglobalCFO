"""
FP&A Admin Routes
User permission management and role assignment
"""

from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime, timezone
import logging
import uuid

from models.fpa_models import UserPermission, UserPermissionCreate, UserRole

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fpa/admin", tags=["FP&A Admin"])


def get_admin_router(db: AsyncIOMotorDatabase, get_current_user, require_admin):
    """Create FPA admin router with dependencies"""
    
    async def require_fpa_admin(current_user: dict = Depends(get_current_user)) -> dict:
        """Require either global admin OR FPA can_manage_users permission"""
        logger.info(f"Checking FPA admin access for user {current_user.get('email')} with role {current_user.get('role')}")
        
        # Global admins always have access
        if current_user.get("role") == "admin":
            logger.info(f"User {current_user.get('email')} has global admin access")
            return current_user
        
        # Check FP&A specific permission
        fpa_permission = await db.user_permissions.find_one(
            {"user_id": current_user["id"]},
            {"_id": 0}
        )
        
        logger.info(f"FPA permission for user {current_user.get('email')}: {fpa_permission}")
        
        if fpa_permission and fpa_permission.get("can_manage_users"):
            logger.info(f"User {current_user.get('email')} has FPA can_manage_users permission")
            return current_user
        
        logger.warning(f"User {current_user.get('email')} denied FPA admin access")
        raise HTTPException(status_code=403, detail="FP&A admin access required")
    
    @router.get("/users")
    async def list_users(current_user: dict = Depends(get_current_user)):
        """List all users with their FP&A permissions"""
        try:
            # Get all users
            users = await db.users.find({}, {"_id": 0, "hashed_password": 0}).to_list(None)
            
            # Get FP&A permissions for each user
            for user in users:
                permission = await db.user_permissions.find_one(
                    {"user_id": user["id"]},
                    {"_id": 0}
                )
                user["fpa_permission"] = permission
            
            return users
            
        except Exception as e:
            logger.error(f"Error listing users: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/permissions/{user_id}")
    async def get_user_permission(
        user_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get FP&A permission for a specific user"""
        try:
            permission = await db.user_permissions.find_one(
                {"user_id": user_id},
                {"_id": 0}
            )
            
            if not permission:
                # Return default permission structure
                return {
                    "user_id": user_id,
                    "role": "contributor",
                    "entity_ids": None,
                    "department_ids": None,
                    "account_category_access": None,
                    "can_create_versions": False,
                    "can_edit_drivers": False,
                    "can_create_formulas": False,
                    "can_lock_versions": False,
                    "can_manage_users": False
                }
            
            return permission
            
        except Exception as e:
            logger.error(f"Error getting user permission: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/permissions")
    async def create_or_update_permission(
        permission_data: UserPermissionCreate,
        current_user: dict = Depends(require_fpa_admin)
    ):
        """Create or update user permission (Admin only)"""
        try:
            logger.info(f"Attempting to create/update permission for user {permission_data.user_id} with role {permission_data.role}")
            logger.info(f"Permission data: {permission_data.model_dump()}")
            
            # Check if user exists
            user = await db.users.find_one({"id": permission_data.user_id}, {"_id": 0})
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            # Check if permission already exists
            existing = await db.user_permissions.find_one(
                {"user_id": permission_data.user_id},
                {"_id": 0}
            )
            
            permission_dict = permission_data.model_dump()
            
            if existing:
                # Update
                permission_dict["updated_at"] = datetime.now(timezone.utc)
                
                await db.user_permissions.update_one(
                    {"id": existing["id"]},
                    {"$set": permission_dict}
                )
                
                updated = await db.user_permissions.find_one(
                    {"id": existing["id"]},
                    {"_id": 0}
                )
                
                return updated
            else:
                # Create
                permission_dict["id"] = str(uuid.uuid4())
                permission_dict["created_at"] = datetime.now(timezone.utc)
                permission_dict["updated_at"] = datetime.now(timezone.utc)
                
                await db.user_permissions.insert_one(permission_dict)
                
                return permission_dict
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating/updating permission: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.delete("/permissions/{user_id}")
    async def delete_permission(
        user_id: str,
        current_user: dict = Depends(require_fpa_admin)
    ):
        """Delete user permission (Admin only)"""
        try:
            result = await db.user_permissions.delete_one({"user_id": user_id})
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Permission not found")
            
            return {"success": True, "message": "Permission deleted"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting permission: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/roles")
    async def list_roles(current_user: dict = Depends(get_current_user)):
        """Get list of available FP&A roles with descriptions"""
        try:
            roles = [
                {
                    "value": "cfo_admin",
                    "label": "CFO/Finance Admin",
                    "description": "Full access to all FP&A features and data",
                    "permissions": {
                        "can_create_versions": True,
                        "can_edit_drivers": True,
                        "can_create_formulas": True,
                        "can_lock_versions": True,
                        "can_manage_users": True
                    }
                },
                {
                    "value": "finance_analyst",
                    "label": "Finance Analyst",
                    "description": "Can create/edit forecasts and scenarios, view all data",
                    "permissions": {
                        "can_create_versions": True,
                        "can_edit_drivers": True,
                        "can_create_formulas": True,
                        "can_lock_versions": False,
                        "can_manage_users": False
                    }
                },
                {
                    "value": "department_manager",
                    "label": "Department Manager",
                    "description": "Can manage department budget: create versions, formulas, drivers, lock versions, and add users",
                    "permissions": {
                        "can_create_versions": True,
                        "can_edit_drivers": True,
                        "can_create_formulas": True,
                        "can_lock_versions": True,
                        "can_manage_users": True
                    }
                },
                {
                    "value": "executive_viewer",
                    "label": "Executive Viewer",
                    "description": "Read-only access to reports and dashboards",
                    "permissions": {
                        "can_create_versions": False,
                        "can_edit_drivers": False,
                        "can_create_formulas": False,
                        "can_lock_versions": False,
                        "can_manage_users": False
                    }
                },
                {
                    "value": "contributor",
                    "label": "Contributor",
                    "description": "Can input data for assigned tasks, limited view",
                    "permissions": {
                        "can_create_versions": False,
                        "can_edit_drivers": False,
                        "can_create_formulas": False,
                        "can_lock_versions": False,
                        "can_manage_users": False
                    }
                }
            ]
            
            return roles
            
        except Exception as e:
            logger.error(f"Error listing roles: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/my-permissions")
    async def get_my_permissions(current_user: dict = Depends(get_current_user)):
        """Get current user's FP&A permissions"""
        try:
            permission = await db.user_permissions.find_one(
                {"user_id": current_user["id"]},
                {"_id": 0}
            )
            
            # If no permission set, return default contributor
            if not permission:
                return {
                    "user_id": current_user["id"],
                    "role": "contributor",
                    "can_create_versions": False,
                    "can_edit_drivers": False,
                    "can_create_formulas": False,
                    "can_lock_versions": False,
                    "can_manage_users": False
                }
            
            return permission
            
        except Exception as e:
            logger.error(f"Error getting my permissions: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/bulk-assign-role")
    async def bulk_assign_role(
        user_ids: List[str],
        role: UserRole,
        current_user: dict = Depends(require_fpa_admin)
    ):
        """Bulk assign role to multiple users (Admin only)"""
        try:
            updated_count = 0
            
            for user_id in user_ids:
                # Check if permission exists
                existing = await db.user_permissions.find_one({"user_id": user_id})
                
                # Set permissions based on role
                permissions = {
                    "cfo_admin": {
                        "can_create_versions": True,
                        "can_edit_drivers": True,
                        "can_create_formulas": True,
                        "can_lock_versions": True,
                        "can_manage_users": True
                    },
                    "finance_analyst": {
                        "can_create_versions": True,
                        "can_edit_drivers": True,
                        "can_create_formulas": True,
                        "can_lock_versions": False,
                        "can_manage_users": False
                    },
                    "department_manager": {
                        "can_create_versions": True,
                        "can_edit_drivers": True,
                        "can_create_formulas": True,
                        "can_lock_versions": True,
                        "can_manage_users": True
                    },
                    "executive_viewer": {
                        "can_create_versions": False,
                        "can_edit_drivers": False,
                        "can_create_formulas": False,
                        "can_lock_versions": False,
                        "can_manage_users": False
                    },
                    "contributor": {
                        "can_create_versions": False,
                        "can_edit_drivers": False,
                        "can_create_formulas": False,
                        "can_lock_versions": False,
                        "can_manage_users": False
                    }
                }.get(role, {
                    "can_create_versions": False,
                    "can_edit_drivers": False,
                    "can_create_formulas": False,
                    "can_lock_versions": False,
                    "can_manage_users": False
                })
                
                if existing:
                    await db.user_permissions.update_one(
                        {"id": existing["id"]},
                        {
                            "$set": {
                                "role": role,
                                **permissions,
                                "updated_at": datetime.now(timezone.utc)
                            }
                        }
                    )
                else:
                    new_permission = {
                        "id": str(uuid.uuid4()),
                        "user_id": user_id,
                        "role": role,
                        **permissions,
                        "created_at": datetime.now(timezone.utc),
                        "updated_at": datetime.now(timezone.utc)
                    }
                    await db.user_permissions.insert_one(new_permission)
                
                updated_count += 1
            
            return {
                "success": True,
                "message": f"Updated {updated_count} users with role {role}"
            }
            
        except Exception as e:
            logger.error(f"Error bulk assigning role: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return router
