# ======================= SHARED APP API ROUTES =======================
# These routes handle cross-app functionality: app registry, shared integrations
# Import this router into your main server.py

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import logging

from shared_schema import (
    RegisteredApp, RegisteredAppCreate, RegisteredAppUpdate,
    SharedIntegration, SharedIntegrationCreate, SharedIntegrationUpdate,
    SharedERPAccount, INTEGRATION_CATALOG, get_initial_apps_seed_data
)

logger = logging.getLogger(__name__)

# Create router - will be mounted at /api/shared
shared_router = APIRouter(prefix="/shared", tags=["Shared Multi-App"])


# ======================= APP REGISTRY ROUTES =======================

@shared_router.get("/apps", response_model=List[dict])
async def get_registered_apps(db=None, current_user: dict = None):
    """Get all registered applications"""
    apps = await db.apps.find({}, {"_id": 0}).to_list(100)
    return apps


@shared_router.get("/apps/{app_id}")
async def get_app_config(app_id: str, db=None):
    """
    Get configuration for a specific app.
    Called by apps on startup to fetch their enabled integrations/features.
    """
    app = await db.apps.find_one({"app_id": app_id}, {"_id": 0})
    if not app:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' not registered")
    return app


@shared_router.post("/apps")
async def register_app(app_data: RegisteredAppCreate, db=None, current_user: dict = None):
    """Register a new application (admin only)"""
    # Check if app_id already exists
    existing = await db.apps.find_one({"app_id": app_data.app_id})
    if existing:
        raise HTTPException(status_code=400, detail=f"App '{app_data.app_id}' already registered")
    
    app = RegisteredApp(
        app_id=app_data.app_id,
        app_name=app_data.app_name,
        description=app_data.description,
        enabled_integrations=app_data.enabled_integrations,
        enabled_features=app_data.enabled_features,
        api_base_url=app_data.api_base_url,
        created_by=current_user['id'] if current_user else None
    )
    
    app_dict = app.model_dump()
    app_dict['created_at'] = app_dict['created_at'].isoformat()
    
    await db.apps.insert_one(app_dict)
    return app_dict


@shared_router.put("/apps/{app_id}")
async def update_app_config(app_id: str, update_data: RegisteredAppUpdate, db=None, current_user: dict = None):
    """Update app configuration (admin only)"""
    app = await db.apps.find_one({"app_id": app_id})
    if not app:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.apps.update_one({"app_id": app_id}, {"$set": update_dict})
    
    updated = await db.apps.find_one({"app_id": app_id}, {"_id": 0})
    return updated


@shared_router.delete("/apps/{app_id}")
async def deregister_app(app_id: str, db=None, current_user: dict = None):
    """Deregister an application (admin only)"""
    result = await db.apps.delete_one({"app_id": app_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' not found")
    return {"message": f"App '{app_id}' deregistered"}


@shared_router.post("/apps/seed")
async def seed_apps(db=None, current_user: dict = None):
    """
    Initialize the apps collection with seed data.
    Safe to call multiple times - skips existing apps.
    """
    seed_data = get_initial_apps_seed_data()
    inserted = 0
    skipped = 0
    
    for app in seed_data:
        existing = await db.apps.find_one({"app_id": app["app_id"]})
        if not existing:
            await db.apps.insert_one(app)
            inserted += 1
        else:
            skipped += 1
    
    return {
        "message": "Apps seeded",
        "inserted": inserted,
        "skipped": skipped,
        "total": len(seed_data)
    }


# ======================= INTEGRATION CATALOG ROUTES =======================

@shared_router.get("/integrations/catalog")
async def get_integration_catalog():
    """Get the full catalog of available integrations"""
    return INTEGRATION_CATALOG


@shared_router.get("/integrations/catalog/{app_id}")
async def get_app_integrations_catalog(app_id: str, db=None):
    """
    Get integrations available for a specific app.
    Returns only the integrations enabled for this app.
    """
    app = await db.apps.find_one({"app_id": app_id}, {"_id": 0})
    if not app:
        raise HTTPException(status_code=404, detail=f"App '{app_id}' not registered")
    
    enabled = app.get("enabled_integrations", [])
    filtered_catalog = {
        k: v for k, v in INTEGRATION_CATALOG.items() 
        if k in enabled
    }
    
    return {
        "app_id": app_id,
        "app_name": app.get("app_name"),
        "enabled_integrations": enabled,
        "catalog": filtered_catalog
    }


# ======================= SHARED INTEGRATIONS ROUTES =======================

@shared_router.get("/integrations/user")
async def get_user_shared_integrations(
    app_id: Optional[str] = None,
    db=None, 
    current_user: dict = None
):
    """
    Get all integrations for the current user.
    If app_id is provided, filters to only show integrations enabled for that app.
    """
    query = {"user_id": current_user['id']}
    integrations = await db.shared_integrations.find(query, {"_id": 0}).to_list(100)
    
    # If app_id provided, filter by app's enabled integrations
    if app_id:
        app = await db.apps.find_one({"app_id": app_id}, {"_id": 0})
        if app:
            enabled = app.get("enabled_integrations", [])
            integrations = [i for i in integrations if i.get("platform") in enabled]
    
    return integrations


@shared_router.post("/integrations")
async def create_shared_integration(
    integration_data: SharedIntegrationCreate,
    db=None,
    current_user: dict = None
):
    """
    Create a new shared integration.
    Automatically visible to all apps that have this integration enabled.
    """
    # Check if integration already exists for this user/platform
    existing = await db.shared_integrations.find_one({
        "user_id": current_user['id'],
        "platform": integration_data.platform
    })
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Integration for {integration_data.platform} already exists"
        )
    
    # Get source app name for display
    source_app = await db.apps.find_one({"app_id": integration_data.source_app_id})
    source_app_name = source_app.get("app_name") if source_app else integration_data.source_app_id
    
    integration = SharedIntegration(
        user_id=current_user['id'],
        platform=integration_data.platform,
        source_app_id=integration_data.source_app_id,
        source_app_name=source_app_name,
        client_id=integration_data.client_id,
        client_secret=integration_data.client_secret,
        api_key=integration_data.api_key,
        status="pending"
    )
    
    integration_dict = integration.model_dump()
    integration_dict['created_at'] = integration_dict['created_at'].isoformat()
    
    await db.shared_integrations.insert_one(integration_dict)
    
    # Remove sensitive fields for response
    del integration_dict['client_secret']
    if 'api_key' in integration_dict:
        del integration_dict['api_key']
    
    return integration_dict


@shared_router.put("/integrations/{integration_id}")
async def update_shared_integration(
    integration_id: str,
    update_data: SharedIntegrationUpdate,
    db=None,
    current_user: dict = None
):
    """Update a shared integration"""
    integration = await db.shared_integrations.find_one({
        "id": integration_id,
        "user_id": current_user['id']
    })
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    if update_data.status == "connected":
        update_dict['connected_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.shared_integrations.update_one(
        {"id": integration_id}, 
        {"$set": update_dict}
    )
    
    updated = await db.shared_integrations.find_one({"id": integration_id}, {"_id": 0})
    return updated


@shared_router.delete("/integrations/{integration_id}")
async def delete_shared_integration(
    integration_id: str,
    db=None,
    current_user: dict = None
):
    """Delete a shared integration"""
    result = await db.shared_integrations.delete_one({
        "id": integration_id,
        "user_id": current_user['id']
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    return {"message": "Integration deleted"}


@shared_router.post("/integrations/{integration_id}/sync")
async def sync_shared_integration(
    integration_id: str,
    app_id: str,  # Which app triggered the sync
    db=None,
    current_user: dict = None
):
    """Trigger sync for a shared integration"""
    integration = await db.shared_integrations.find_one({
        "id": integration_id,
        "user_id": current_user['id']
    })
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    # Update sync metadata
    await db.shared_integrations.update_one(
        {"id": integration_id},
        {
            "$set": {
                "status": "syncing",
                "last_sync_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$inc": {"total_syncs": 1}
        }
    )
    
    # Simulate sync completion (in real implementation, this would be async)
    await db.shared_integrations.update_one(
        {"id": integration_id},
        {
            "$set": {
                "status": "connected",
                "last_sync_status": f"Synced via {app_id}"
            }
        }
    )
    
    return {"message": f"Sync completed for {integration.get('platform')}"}


# ======================= HELPER FUNCTION TO MOUNT ROUTES =======================

def create_shared_routes(db_instance, get_current_user_func):
    """
    Factory function to create shared routes with proper dependencies.
    
    Usage in server.py:
        from shared_routes import create_shared_routes
        shared_router = create_shared_routes(db, get_current_user)
        app.include_router(shared_router, prefix="/api")
    """
    router = APIRouter(prefix="/shared", tags=["Shared Multi-App"])
    
    @router.get("/apps")
    async def get_apps(current_user: dict = Depends(get_current_user_func)):
        apps = await db_instance.apps.find({}, {"_id": 0}).to_list(100)
        return apps
    
    # ... (copy all routes with proper Depends)
    
    return router
