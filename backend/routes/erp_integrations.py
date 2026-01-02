"""ERP Integration API Routes

Provides endpoints for managing ERP integrations, triggering syncs,
and retrieving integration data.
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Global ERP manager instance (will be initialized in server.py)
erp_manager = None
sync_scheduler = None


def get_erp_manager():
    """Dependency to get ERP manager"""
    if erp_manager is None:
        raise HTTPException(status_code=500, detail="ERP manager not initialized")
    return erp_manager


def get_sync_scheduler():
    """Dependency to get sync scheduler"""
    if sync_scheduler is None:
        raise HTTPException(status_code=500, detail="Sync scheduler not initialized")
    return sync_scheduler


class IntegrationConfig(BaseModel):
    """Model for integration configuration"""
    platform: str
    auth_type: str  # 'oauth2' or 'api_key'
    config: Dict[str, Any]


class SyncRequest(BaseModel):
    """Model for sync request"""
    platform: Optional[str] = None
    days_back: int = 30


@router.get("/platforms")
async def get_available_platforms():
    """Get list of all available ERP platforms"""
    platforms = [
        {
            "id": "netsuite",
            "name": "NetSuite",
            "category": "Enterprise",
            "auth_types": ["oauth2", "tba"],
            "description": "Oracle NetSuite ERP for mid-to-large enterprises"
        },
        {
            "id": "dynamics_finance",
            "name": "Microsoft Dynamics 365 Finance",
            "category": "Enterprise",
            "auth_types": ["oauth2"],
            "description": "Microsoft enterprise finance and operations platform"
        },
        {
            "id": "dynamics_bc",
            "name": "Microsoft Dynamics 365 Business Central",
            "category": "SMB",
            "auth_types": ["oauth2"],
            "description": "Microsoft business management solution for SMBs"
        },
        {
            "id": "sap_s4hana",
            "name": "SAP S/4HANA",
            "category": "Enterprise",
            "auth_types": ["oauth2", "api_key"],
            "description": "SAP next-generation ERP suite"
        },
        {
            "id": "workday",
            "name": "Workday Finance",
            "category": "Enterprise",
            "auth_types": ["oauth2"],
            "description": "Cloud-based finance and HR management"
        },
        {
            "id": "zoho_books",
            "name": "Zoho Books",
            "category": "SMB",
            "auth_types": ["oauth2", "api_key"],
            "description": "Online accounting software for small businesses"
        },
        {
            "id": "freeagent",
            "name": "FreeAgent",
            "category": "SMB",
            "auth_types": ["oauth2"],
            "description": "UK-focused accounting for freelancers and SMBs"
        },
        {
            "id": "freshbooks",
            "name": "FreshBooks",
            "category": "SMB",
            "auth_types": ["oauth2"],
            "description": "Cloud accounting for freelancers and small businesses"
        },
        {
            "id": "clearbooks",
            "name": "Clear Books",
            "category": "SMB",
            "auth_types": ["oauth2", "api_key"],
            "description": "UK online accounting software"
        },
        {
            "id": "crunch",
            "name": "Crunch Accounting",
            "category": "SMB",
            "auth_types": ["oauth2"],
            "description": "UK accounting for contractors and freelancers"
        },
        {
            "id": "kashflow",
            "name": "KashFlow",
            "category": "SMB",
            "auth_types": ["api_key"],
            "description": "UK small business accounting software"
        },
        {
            "id": "quickbooks",
            "name": "QuickBooks Online",
            "category": "SMB",
            "auth_types": ["oauth2"],
            "description": "Popular accounting software for small businesses"
        },
        {
            "id": "xero",
            "name": "Xero",
            "category": "SMB",
            "auth_types": ["oauth2"],
            "description": "Cloud accounting software"
        },
        {
            "id": "sage",
            "name": "Sage",
            "category": "SMB",
            "auth_types": ["oauth2"],
            "description": "Business management software"
        }
    ]
    
    return {"platforms": platforms}


@router.get("/connected")
async def get_connected_platforms(manager = Depends(get_erp_manager)):
    """Get list of currently connected platforms"""
    try:
        connected = await manager.get_connected_platforms()
        statuses = await manager.get_all_platform_statuses()
        
        return {
            "connected_platforms": connected,
            "statuses": statuses
        }
    except Exception as e:
        logger.error(f"Error getting connected platforms: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/connect")
async def connect_platform(
    config: IntegrationConfig,
    manager = Depends(get_erp_manager)
):
    """Connect a new ERP platform"""
    try:
        success = await manager.initialize_service(config.platform, config.config)
        
        if success:
            return {
                "success": True,
                "message": f"Successfully connected to {config.platform}",
                "platform": config.platform
            }
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to connect to {config.platform}"
            )
    except Exception as e:
        logger.error(f"Error connecting platform {config.platform}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/disconnect/{platform}")
async def disconnect_platform(
    platform: str,
    manager = Depends(get_erp_manager)
):
    """Disconnect an ERP platform"""
    try:
        success = await manager.disconnect_platform(platform)
        
        if success:
            return {
                "success": True,
                "message": f"Successfully disconnected from {platform}"
            }
        else:
            raise HTTPException(
                status_code=404,
                detail=f"Platform {platform} not found or not connected"
            )
    except Exception as e:
        logger.error(f"Error disconnecting platform {platform}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync")
async def trigger_sync(
    request: SyncRequest,
    manager = Depends(get_erp_manager)
):
    """Trigger data synchronization"""
    try:
        if request.platform:
            # Sync specific platform
            result = await manager.sync_platform_data(request.platform, request.days_back)
        else:
            # Sync all platforms
            result = await manager.sync_all_active_platforms()
        
        return {
            "success": True,
            "sync_results": result,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error triggering sync: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sync/status")
async def get_sync_status(scheduler = Depends(get_sync_scheduler)):
    """Get synchronization scheduler status"""
    try:
        status = scheduler.get_status()
        return status
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{platform}")
async def get_platform_status(
    platform: str,
    manager = Depends(get_erp_manager)
):
    """Get sync status for a specific platform"""
    try:
        status = await manager.get_platform_status(platform)
        
        if status:
            return status
        else:
            raise HTTPException(
                status_code=404,
                detail=f"No status found for platform {platform}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting platform status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data/financial")
async def get_aggregated_financial_data(
    days_back: int = 30,
    manager = Depends(get_erp_manager)
):
    """Get aggregated financial data from all platforms"""
    try:
        data = await manager.get_aggregated_financial_data(days_back)
        return data
    except Exception as e:
        logger.error(f"Error getting financial data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data/invoices")
async def get_recent_invoices(
    limit: int = 50,
    manager = Depends(get_erp_manager)
):
    """Get recent invoices from all connected platforms"""
    try:
        invoices = await manager.get_recent_invoices(limit)
        return {"invoices": invoices, "count": len(invoices)}
    except Exception as e:
        logger.error(f"Error getting invoices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data/expenses")
async def get_recent_expenses(
    limit: int = 50,
    manager = Depends(get_erp_manager)
):
    """Get recent expenses from all connected platforms"""
    try:
        expenses = await manager.get_recent_expenses(limit)
        return {"expenses": expenses, "count": len(expenses)}
    except Exception as e:
        logger.error(f"Error getting expenses: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ERP Integrations API",
        "timestamp": datetime.utcnow().isoformat()
    }
