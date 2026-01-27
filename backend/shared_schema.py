# ======================= SHARED MULTI-APP SCHEMA =======================
# This file defines the schema for cross-application integration sharing
# Both realtime-finance and realtime-pmo (and future apps) use these models

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ======================= APP REGISTRY =======================

class AppStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    MAINTENANCE = "maintenance"


class RegisteredApp(BaseModel):
    """
    Represents a registered application that can access shared resources.
    Stored in 'apps' collection in MongoDB.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    app_id: str  # Unique identifier: 'realtime-finance', 'realtime-pmo', etc.
    app_name: str  # Display name: 'Realtime Finance', 'Realtime PMO'
    description: Optional[str] = None
    status: AppStatus = AppStatus.ACTIVE
    
    # Feature & Integration Permissions
    enabled_integrations: List[str] = []  # ['xero', 'quickbooks', 'truelayer', etc.]
    enabled_features: List[str] = []  # ['dashboard', 'reconciliation', 'reports']
    
    # Metadata
    api_base_url: Optional[str] = None  # For cross-app API calls if needed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    created_by: Optional[str] = None  # user_id of creator


class RegisteredAppCreate(BaseModel):
    app_id: str
    app_name: str
    description: Optional[str] = None
    enabled_integrations: List[str] = []
    enabled_features: List[str] = []
    api_base_url: Optional[str] = None


class RegisteredAppUpdate(BaseModel):
    app_name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[AppStatus] = None
    enabled_integrations: Optional[List[str]] = None
    enabled_features: Optional[List[str]] = None
    api_base_url: Optional[str] = None


# ======================= SHARED INTEGRATION SCHEMA =======================

class SharedIntegrationStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    PENDING = "pending"
    SYNCING = "syncing"


class SharedIntegration(BaseModel):
    """
    Shared integration record - visible across all authorized apps.
    When a user connects Xero in realtime-finance, it shows in realtime-pmo too.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # Primary link - integrations are shared at user level
    platform: str  # 'xero', 'quickbooks', 'truelayer', 'gmail', etc.
    status: SharedIntegrationStatus = SharedIntegrationStatus.DISCONNECTED
    
    # Origin tracking (for debugging/audit)
    source_app_id: str  # Which app created this integration
    source_app_name: Optional[str] = None  # Denormalized for display
    
    # Credentials (encrypted in production)
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    api_key: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    
    # Sync metadata
    last_sync_at: Optional[datetime] = None
    last_sync_status: Optional[str] = None
    last_sync_records: int = 0
    total_syncs: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    connected_at: Optional[datetime] = None


class SharedIntegrationCreate(BaseModel):
    platform: str
    source_app_id: str
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    api_key: Optional[str] = None


class SharedIntegrationUpdate(BaseModel):
    status: Optional[SharedIntegrationStatus] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    api_key: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None


# ======================= SHARED ERP ACCOUNT SCHEMA =======================

class SharedERPAccount(BaseModel):
    """
    ERP Account that can be shared across apps.
    Example: A Sage account connected in Finance app is visible in PMO app.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str  # 'UK Finance - Sage'
    provider: str  # 'sage', 'netsuite', 'xero', etc.
    description: Optional[str] = None
    
    # Origin tracking
    source_app_id: str
    source_app_name: Optional[str] = None
    
    # Connection details
    status: str = "pending"  # 'connected', 'error', 'pending', 'disconnected'
    api_url: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    api_key: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_expires_at: Optional[datetime] = None
    
    # Sync settings
    auto_sync: bool = False
    sync_frequency: str = "daily"
    last_sync_at: Optional[datetime] = None
    last_test_result: Optional[str] = None
    last_tested_at: Optional[datetime] = None
    total_syncs: int = 0
    
    # Usage
    linked_entity_count: int = 0
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None


# ======================= AVAILABLE INTEGRATIONS CATALOG =======================

# All available integrations that apps can enable
INTEGRATION_CATALOG = {
    # ERP Systems
    "xero": {
        "name": "Xero",
        "category": "ERP",
        "description": "Cloud accounting for SMBs",
        "auth_methods": ["OAuth2"],
        "icon": "xero"
    },
    "quickbooks": {
        "name": "QuickBooks",
        "category": "ERP",
        "description": "Small business accounting",
        "auth_methods": ["OAuth2"],
        "icon": "quickbooks"
    },
    "sage": {
        "name": "Sage",
        "category": "ERP",
        "description": "Accounting & payroll",
        "auth_methods": ["OAuth2"],
        "icon": "sage"
    },
    "netsuite": {
        "name": "NetSuite",
        "category": "ERP",
        "description": "Oracle NetSuite ERP",
        "auth_methods": ["OAuth2", "TBA"],
        "icon": "netsuite"
    },
    "dynamics365": {
        "name": "Microsoft Dynamics 365",
        "category": "ERP",
        "description": "Enterprise-grade ERP",
        "auth_methods": ["OAuth2"],
        "icon": "microsoft"
    },
    "sap": {
        "name": "SAP S/4HANA",
        "category": "ERP",
        "description": "SAP Enterprise ERP",
        "auth_methods": ["OAuth2", "API Key"],
        "icon": "sap"
    },
    
    # Banking
    "truelayer": {
        "name": "TrueLayer",
        "category": "Banking",
        "description": "Real-time bank feeds",
        "auth_methods": ["OAuth2"],
        "icon": "bank"
    },
    "plaid": {
        "name": "Plaid",
        "category": "Banking",
        "description": "Bank account linking",
        "auth_methods": ["OAuth2"],
        "icon": "bank"
    },
    
    # Email
    "gmail": {
        "name": "Gmail",
        "category": "Email",
        "description": "Email monitoring & attachments",
        "auth_methods": ["OAuth2"],
        "icon": "gmail"
    },
    "outlook": {
        "name": "Outlook",
        "category": "Email",
        "description": "Microsoft email integration",
        "auth_methods": ["OAuth2"],
        "icon": "outlook"
    },
    
    # Project Management (for PMO)
    "jira": {
        "name": "Jira",
        "category": "Project Management",
        "description": "Issue & project tracking",
        "auth_methods": ["OAuth2", "API Key"],
        "icon": "jira"
    },
    "asana": {
        "name": "Asana",
        "category": "Project Management",
        "description": "Work management platform",
        "auth_methods": ["OAuth2"],
        "icon": "asana"
    },
    "monday": {
        "name": "Monday.com",
        "category": "Project Management",
        "description": "Work OS platform",
        "auth_methods": ["API Key"],
        "icon": "monday"
    },
    
    # Communication
    "slack": {
        "name": "Slack",
        "category": "Communication",
        "description": "Team messaging",
        "auth_methods": ["OAuth2"],
        "icon": "slack"
    },
    "teams": {
        "name": "Microsoft Teams",
        "category": "Communication",
        "description": "Team collaboration",
        "auth_methods": ["OAuth2"],
        "icon": "teams"
    },
}

# Default integrations for new apps
DEFAULT_ENABLED_INTEGRATIONS = [
    "xero", "quickbooks", "sage", "truelayer", "gmail", "outlook"
]


# ======================= SEED DATA =======================

def get_initial_apps_seed_data() -> List[dict]:
    """
    Returns seed data for the apps collection.
    Run this once to initialize the apps registry.
    """
    return [
        {
            "id": str(uuid.uuid4()),
            "app_id": "digitrans-global",
            "app_name": "Digitrans Global",
            "description": "Corporate website and main portal",
            "status": "active",
            "enabled_integrations": [],  # Corporate site doesn't need integrations
            "enabled_features": ["landing", "contact", "about"],
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "app_id": "realtime-finance",
            "app_name": "Realtime Finance",
            "description": "CFO toolkit and financial management platform",
            "status": "active",
            "enabled_integrations": [
                "xero", "quickbooks", "sage", "netsuite", "dynamics365", "sap",
                "truelayer", "plaid", "gmail", "outlook", "slack"
            ],
            "enabled_features": [
                "dashboard", "reconciliation", "reports", "consolidation",
                "entity-tree", "coa-mapping", "agent-hub", "strategic-capital"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
        {
            "id": str(uuid.uuid4()),
            "app_id": "realtime-pmo",
            "app_name": "Realtime PMO",
            "description": "Project Management Office - tracks project costs vs budgets",
            "status": "active",
            "enabled_integrations": [
                # All integrations enabled as requested
                "xero", "quickbooks", "sage", "netsuite", "dynamics365", "sap",
                "truelayer", "plaid", "gmail", "outlook",
                "jira", "asana", "monday", "slack", "teams"
            ],
            "enabled_features": [
                "dashboard", "projects", "budgets", "timesheets",
                "resource-management", "reports"
            ],
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
    ]
