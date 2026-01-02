"""
Integration Models for OAuth 2.0 connections
Supports Xero, QuickBooks, Sage, HubSpot, Salesforce
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


class IntegrationType(str, Enum):
    """Supported integration types"""
    XERO = "xero"
    QUICKBOOKS = "quickbooks"
    SAGE = "sage"
    HUBSPOT = "hubspot"
    SALESFORCE = "salesforce"


class IntegrationStatus(str, Enum):
    """Integration connection status"""
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    EXPIRED = "expired"


class SyncStatus(str, Enum):
    """Data sync status"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


# ==================== OAUTH CONNECTION MODELS ====================

class OAuthConnection(BaseModel):
    """OAuth 2.0 connection details"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    integration_type: IntegrationType
    status: IntegrationStatus = IntegrationStatus.DISCONNECTED
    
    # OAuth tokens (encrypted in production)
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    
    # Integration-specific data
    tenant_id: Optional[str] = None  # Xero tenant, QB company ID, etc.
    tenant_name: Optional[str] = None
    
    # Metadata
    scopes: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = {}
    
    # Timestamps
    connected_at: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None
    disconnected_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class OAuthConnectionCreate(BaseModel):
    """Create OAuth connection"""
    integration_type: IntegrationType


class OAuthTokenUpdate(BaseModel):
    """Update OAuth tokens after callback"""
    access_token: str
    refresh_token: Optional[str] = None
    expires_in: int  # seconds
    tenant_id: Optional[str] = None
    tenant_name: Optional[str] = None
    scopes: Optional[str] = None


# ==================== SYNC MODELS ====================

class DataSync(BaseModel):
    """Data synchronization job"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    connection_id: str
    integration_type: IntegrationType
    sync_type: str  # actuals, pipeline, full
    status: SyncStatus = SyncStatus.PENDING
    
    # Sync details
    records_synced: int = 0
    records_failed: int = 0
    error_message: Optional[str] = None
    
    # Time range
    sync_start_date: Optional[str] = None
    sync_end_date: Optional[str] = None
    
    # Timestamps
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DataSyncCreate(BaseModel):
    """Create sync job"""
    connection_id: str
    sync_type: str = "actuals"
    sync_start_date: Optional[str] = None
    sync_end_date: Optional[str] = None


# ==================== WEBHOOK MODELS ====================

class WebhookSubscription(BaseModel):
    """Webhook subscription for real-time updates"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    connection_id: str
    integration_type: IntegrationType
    webhook_id: str  # External webhook ID from provider
    
    # Event types subscribed to
    event_types: list[str]  # e.g., ["invoice.created", "payment.received"]
    
    # Webhook details
    webhook_url: str  # Our endpoint
    webhook_secret: Optional[str] = None
    
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_received_at: Optional[datetime] = None


class WebhookEvent(BaseModel):
    """Received webhook event"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    subscription_id: str
    integration_type: IntegrationType
    event_type: str
    
    # Event data
    payload: Dict[str, Any]
    
    # Processing
    processed: bool = False
    processed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    
    received_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== INTEGRATION MAPPING MODELS ====================

class AccountMapping(BaseModel):
    """Map external accounts to internal accounts"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    connection_id: str
    
    # External account (from Xero, QB, etc.)
    external_account_id: str
    external_account_code: str
    external_account_name: str
    external_account_type: str
    
    # Internal FP&A account
    internal_account_id: str
    
    # Auto-mapping confidence (if AI-suggested)
    confidence_score: Optional[float] = None
    is_confirmed: bool = False
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class EntityMapping(BaseModel):
    """Map external entities to internal entities"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    connection_id: str
    
    # External entity
    external_entity_id: str
    external_entity_name: str
    
    # Internal FP&A entity
    internal_entity_id: str
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
