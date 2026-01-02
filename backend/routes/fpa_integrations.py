"""
FP&A Integration Routes
OAuth connections and data sync for accounting and CRM platforms
"""

from fastapi import APIRouter, HTTPException, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import logging
import os

from models.integration_models import (
    OAuthConnection, OAuthConnectionCreate, OAuthTokenUpdate,
    IntegrationType, IntegrationStatus
)
from services.oauth_service import OAuthService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fpa/integrations", tags=["FP&A Integrations"])


def get_integrations_router(db: AsyncIOMotorDatabase, get_current_user):
    """Create FPA integrations router with dependencies"""
    
    # Initialize OAuth service (in production, get base_url from config)
    oauth_service = OAuthService(base_url=os.environ.get('APP_BASE_URL', 'http://localhost:3000'))
    
    # OAuth credentials (in production, store securely in environment or secret manager)
    OAUTH_CREDENTIALS = {
        'xero': {
            'client_id': os.environ.get('XERO_CLIENT_ID', 'demo_client_id'),
            'client_secret': os.environ.get('XERO_CLIENT_SECRET', 'demo_secret'),
        },
        'quickbooks': {
            'client_id': os.environ.get('QB_CLIENT_ID', 'demo_client_id'),
            'client_secret': os.environ.get('QB_CLIENT_SECRET', 'demo_secret'),
        },
        'sage': {
            'client_id': os.environ.get('SAGE_CLIENT_ID', 'demo_client_id'),
            'client_secret': os.environ.get('SAGE_CLIENT_SECRET', 'demo_secret'),
        },
        'hubspot': {
            'client_id': os.environ.get('HUBSPOT_CLIENT_ID', 'demo_client_id'),
            'client_secret': os.environ.get('HUBSPOT_CLIENT_SECRET', 'demo_secret'),
        },
        'salesforce': {
            'client_id': os.environ.get('SF_CLIENT_ID', 'demo_client_id'),
            'client_secret': os.environ.get('SF_CLIENT_SECRET', 'demo_secret'),
        }
    }
    
    @router.get("/status")
    async def get_integration_status(current_user: dict = Depends(get_current_user)):
        """Get status of all integrations for current user"""
        try:
            # Check both oauth_connections (FP&A specific) and integration_connections (Dashboard)
            fpa_connections = await db.oauth_connections.find(
                {"user_id": current_user["id"]},
                {"_id": 0}
            ).to_list(None)
            
            # Check dashboard integrations (integration_connections collection)
            dashboard_connections = await db.integration_connections.find(
                {"user_id": current_user["id"]},
                {"_id": 0}
            ).to_list(None)
            
            # Create status dict for all platforms
            status = {}
            for platform in ['xero', 'quickbooks', 'sage', 'hubspot', 'salesforce']:
                # First check FP&A connections
                fpa_conn = next((c for c in fpa_connections if c.get('integration_type') == platform), None)
                # Then check dashboard connections
                dash_conn = next((c for c in dashboard_connections if c.get('integration_type') == platform), None)
                
                # Use whichever connection exists (prefer dashboard for consistency)
                connection = dash_conn if dash_conn else fpa_conn
                
                if connection:
                    status[platform] = {
                        'connected': connection.get('status') in ['connected', 'active'],
                        'status': connection.get('status', 'connected'),
                        'tenant_name': connection.get('tenant_name') or connection.get('organization_name'),
                        'connected_at': connection.get('connected_at') or connection.get('created_at'),
                        'last_sync_at': connection.get('last_sync_at'),
                        'source': 'dashboard' if dash_conn else 'fpa',
                        'connection_id': connection.get('id')
                    }
                else:
                    status[platform] = {
                        'connected': False,
                        'status': 'disconnected'
                    }
            
            return status
            
        except Exception as e:
            logger.error(f"Error getting integration status: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/{platform}/auth-url")
    async def get_auth_url(
        platform: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Generate OAuth authorization URL for a platform"""
        try:
            # Validate platform
            if platform not in OAUTH_CREDENTIALS:
                raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")
            
            # Get credentials
            creds = OAUTH_CREDENTIALS[platform]
            
            # Generate redirect URI
            redirect_uri = f"{oauth_service.base_url}/api/fpa/integrations/{platform}/callback"
            
            # Generate auth URL
            auth_data = oauth_service.generate_auth_url(
                platform=platform,
                client_id=creds['client_id'],
                redirect_uri=redirect_uri
            )
            
            if not auth_data:
                raise HTTPException(status_code=500, detail="Failed to generate auth URL")
            
            # Store pending connection
            import uuid
            connection_doc = {
                'id': str(uuid.uuid4()),
                'user_id': current_user['id'],
                'integration_type': platform,
                'status': 'pending',
                'created_at': datetime.now(timezone.utc)
            }
            
            await db.oauth_connections.update_one(
                {'user_id': current_user['id'], 'integration_type': platform},
                {'$set': connection_doc},
                upsert=True
            )
            
            return auth_data
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error generating auth URL: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/{platform}/callback")
    async def oauth_callback(
        platform: str,
        code: str = Query(...),
        state: str = Query(...),
        error: Optional[str] = Query(None)
    ):
        """Handle OAuth callback from platform"""
        try:
            # Check for errors
            if error:
                logger.error(f"OAuth error: {error}")
                return {"error": error, "message": "Authorization failed"}
            
            # Verify state
            state_data = oauth_service.verify_state(state)
            if not state_data:
                raise HTTPException(status_code=400, detail="Invalid or expired state")
            
            # Get credentials
            creds = OAUTH_CREDENTIALS.get(platform)
            if not creds:
                raise HTTPException(status_code=400, detail=f"Unknown platform: {platform}")
            
            # Exchange code for token
            redirect_uri = f"{oauth_service.base_url}/api/fpa/integrations/{platform}/callback"
            
            token_data = await oauth_service.exchange_code_for_token(
                platform=platform,
                code=code,
                client_id=creds['client_id'],
                client_secret=creds['client_secret'],
                redirect_uri=redirect_uri
            )
            
            if not token_data:
                raise HTTPException(status_code=500, detail="Failed to exchange code for token")
            
            # Find pending connection and update with tokens
            connection = await db.oauth_connections.find_one(
                {'integration_type': platform, 'status': 'pending'}
            )
            
            if connection:
                # Calculate token expiry
                expires_at = datetime.now(timezone.utc) + timedelta(seconds=token_data.get('expires_in', 3600))
                
                await db.oauth_connections.update_one(
                    {'id': connection['id']},
                    {
                        '$set': {
                            'access_token': token_data['access_token'],
                            'refresh_token': token_data.get('refresh_token'),
                            'token_expires_at': expires_at,
                            'status': 'connected',
                            'connected_at': datetime.now(timezone.utc),
                            'updated_at': datetime.now(timezone.utc)
                        }
                    }
                )
            
            # Redirect to success page
            return {
                "success": True,
                "message": f"Successfully connected to {oauth_service.get_platform_display_name(platform)}",
                "redirect": f"/fpa-integrations?success={platform}"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error in OAuth callback: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/{platform}/disconnect")
    async def disconnect_integration(
        platform: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Disconnect an integration"""
        try:
            result = await db.oauth_connections.update_one(
                {
                    'user_id': current_user['id'],
                    'integration_type': platform
                },
                {
                    '$set': {
                        'status': 'disconnected',
                        'disconnected_at': datetime.now(timezone.utc),
                        'access_token': None,
                        'refresh_token': None
                    }
                }
            )
            
            if result.modified_count == 0:
                raise HTTPException(status_code=404, detail="Connection not found")
            
            return {"success": True, "message": f"Disconnected from {platform}"}
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error disconnecting integration: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/{platform}/sync")
    async def trigger_sync(
        platform: str,
        sync_type: str = Query("actuals", description="Type of sync: actuals, pipeline"),
        current_user: dict = Depends(get_current_user)
    ):
        """Trigger manual data sync from platform"""
        try:
            # Check both connection sources
            fpa_connection = await db.oauth_connections.find_one(
                {
                    'user_id': current_user['id'],
                    'integration_type': platform,
                    'status': 'connected'
                },
                {"_id": 0}
            )
            
            dashboard_connection = await db.integration_connections.find_one(
                {
                    'user_id': current_user['id'],
                    'integration_type': platform,
                    'status': {'$in': ['connected', 'active']}
                },
                {"_id": 0}
            )
            
            # Use whichever connection exists
            connection = dashboard_connection if dashboard_connection else fpa_connection
            
            if not connection:
                raise HTTPException(status_code=400, detail=f"Not connected to {platform}. Please connect via Dashboard → Integrations first.")
            
            # Create sync job
            import uuid
            sync_job = {
                'id': str(uuid.uuid4()),
                'connection_id': connection['id'],
                'integration_type': platform,
                'sync_type': sync_type,
                'status': 'completed',  # Mock as completed for demo
                'records_synced': 125,  # Demo data
                'records_failed': 0,
                'created_at': datetime.now(timezone.utc)
            }
            
            await db.data_syncs.insert_one(sync_job)
            
            # Update last_sync_at for the connection
            if dashboard_connection:
                await db.integration_connections.update_one(
                    {'id': connection['id']},
                    {'$set': {'last_sync_at': datetime.now(timezone.utc)}}
                )
            else:
                await db.oauth_connections.update_one(
                    {'id': connection['id']},
                    {'$set': {'last_sync_at': datetime.now(timezone.utc)}}
                )
            
            # In production, trigger background job here
            logger.info(f"Sync job created: {sync_job['id']} for {platform}")
            
            return {
                "success": True,
                "message": f"Sync initiated for {platform}",
                "sync_job_id": sync_job['id']
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error triggering sync: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/sync-history")
    async def get_sync_history(
        limit: int = Query(10, ge=1, le=50),
        current_user: dict = Depends(get_current_user)
    ):
        """Get sync history for current user"""
        try:
            # Get user's connections from both sources
            fpa_connections = await db.oauth_connections.find(
                {'user_id': current_user['id']},
                {'_id': 0, 'id': 1}
            ).to_list(None)
            
            dashboard_connections = await db.integration_connections.find(
                {'user_id': current_user['id']},
                {'_id': 0, 'id': 1}
            ).to_list(None)
            
            connection_ids = [c['id'] for c in fpa_connections] + [c['id'] for c in dashboard_connections]
            
            # Get sync jobs
            syncs = await db.data_syncs.find(
                {'connection_id': {'$in': connection_ids}},
                {"_id": 0}
            ).sort('created_at', -1).limit(limit).to_list(limit)
            
            return syncs
            
        except Exception as e:
            logger.error(f"Error getting sync history: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return router
