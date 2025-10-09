"""
Integration Manager for External API Connections
Handles OAuth2 flows and API key management for:
- Outlook (Microsoft Graph)
- Sage Accounting
- QuickBooks
"""

from pydantic import BaseModel
from typing import Optional, Dict, List
from datetime import datetime, timezone
import uuid

class IntegrationConnection(BaseModel):
    id: str
    company_id: str
    integration_type: str  # outlook, sage, quickbooks
    status: str  # pending, connected, error, disconnected
    credentials: Optional[Dict] = {}
    created_at: datetime
    updated_at: datetime
    config: Optional[Dict] = {}

class OutlookConfig(BaseModel):
    """Outlook/Microsoft Graph Configuration"""
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    tenant_id: Optional[str] = None
    redirect_uri: str = "http://localhost:8000/api/integrations/outlook/callback"
    scopes: List[str] = ["https://graph.microsoft.com/.default"]
    
    # OAuth URLs
    auth_url: str = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/authorize"
    token_url: str = "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"
    graph_api_base: str = "https://graph.microsoft.com/v1.0"

class SageConfig(BaseModel):
    """Sage Accounting Configuration"""
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    redirect_uri: str = "http://localhost:8000/api/integrations/sage/callback"
    scopes: List[str] = ["full_access"]
    
    # OAuth URLs (vary by region)
    auth_url: str = "https://www.sageone.com/oauth2/auth/central?filter=apiv3.1"
    token_url_uk: str = "https://app.sageone.com/oauth2/token"
    token_url_us: str = "https://oauth.na.sageone.com/token"
    token_url_eu: str = "https://oauth.eu.sageone.com/token"
    api_base: str = "https://api.accounting.sage.com/v3.1"

class QuickBooksConfig(BaseModel):
    """QuickBooks Configuration"""
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    redirect_uri: str = "http://localhost:8000/api/integrations/quickbooks/callback"
    scopes: List[str] = ["com.intuit.quickbooks.accounting"]
    environment: str = "sandbox"  # or "production"
    
    # OAuth URLs
    auth_url_sandbox: str = "https://appcenter.intuit.com/connect/oauth2"
    auth_url_production: str = "https://appcenter.intuit.com/connect/oauth2"
    token_url: str = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
    api_base_sandbox: str = "https://sandbox-quickbooks.api.intuit.com/v3"
    api_base_production: str = "https://quickbooks.api.intuit.com/v3"

def get_integration_auth_url(integration_type: str, config: Dict, state: str) -> str:
    """Generate OAuth2 authorization URL for integration"""
    
    if integration_type == "outlook":
        outlook_config = OutlookConfig(**config)
        tenant_id = outlook_config.tenant_id or "common"
        auth_url = outlook_config.auth_url.format(tenant_id=tenant_id)
        params = {
            "client_id": outlook_config.client_id,
            "response_type": "code",
            "redirect_uri": outlook_config.redirect_uri,
            "response_mode": "query",
            "scope": " ".join(outlook_config.scopes),
            "state": state
        }
        return f"{auth_url}?{'&'.join([f'{k}={v}' for k, v in params.items()])}"
    
    elif integration_type == "sage":
        sage_config = SageConfig(**config)
        params = {
            "client_id": sage_config.client_id,
            "response_type": "code",
            "redirect_uri": sage_config.redirect_uri,
            "scope": " ".join(sage_config.scopes),
            "state": state
        }
        return f"{sage_config.auth_url}&{'&'.join([f'{k}={v}' for k, v in params.items()])}"
    
    elif integration_type == "quickbooks":
        qb_config = QuickBooksConfig(**config)
        auth_url = qb_config.auth_url_sandbox if qb_config.environment == "sandbox" else qb_config.auth_url_production
        params = {
            "client_id": qb_config.client_id,
            "response_type": "code",
            "redirect_uri": qb_config.redirect_uri,
            "scope": " ".join(qb_config.scopes),
            "state": state
        }
        return f"{auth_url}?{'&'.join([f'{k}={v}' for k, v in params.items()])}"
    
    raise ValueError(f"Unknown integration type: {integration_type}")

def create_integration_connection(company_id: str, integration_type: str) -> IntegrationConnection:
    """Create a new integration connection record"""
    return IntegrationConnection(
        id=str(uuid.uuid4()),
        company_id=company_id,
        integration_type=integration_type,
        status="pending",
        credentials={},
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
        config={}
    )
