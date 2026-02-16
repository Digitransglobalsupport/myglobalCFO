# ======================= PHASE 1: ORGANIZATIONAL MIGRATION =======================
# This module handles the migration from user_id to org_id isolation
# 
# Migration Strategy:
# 1. Add new collections: organizations, org_memberships, workspaces, workspace_memberships
# 2. Create default org for each existing user
# 3. Update all existing records with org_id
# 4. Implement dual-filter fallback for backward compatibility

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ======================= ENUMS =======================

class OrgRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"


class WorkspaceRole(str, Enum):
    WORKSPACE_ADMIN = "workspace_admin"
    WORKSPACE_MEMBER = "workspace_member"
    CLIENT_ADMIN = "client_admin"
    CLIENT_VIEWER = "client_viewer"


class OrgType(str, Enum):
    DIRECT = "direct"  # Standard customer
    RESELLER = "reseller"  # Fractional CFO with multiple clients


class WorkspaceType(str, Enum):
    INTERNAL = "internal"  # Reseller's own workspace
    CLIENT = "client"  # Client workspace under reseller


class PlanTier(str, Enum):
    FREE = "free"
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"


# ======================= ORGANIZATION MODELS =======================

class Organization(BaseModel):
    """
    Top-level tenant container. All data belongs to an organization.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    slug: str  # URL-friendly identifier
    type: OrgType = OrgType.DIRECT
    owner_id: str  # User who created the org
    
    # Plan & Billing
    plan_id: str = "plan_free"
    plan_overrides: Dict[str, Any] = {}  # Custom limits negotiated
    billing_email: Optional[str] = None
    stripe_customer_id: Optional[str] = None
    
    # Settings
    settings: Dict[str, Any] = {}
    branding: Dict[str, Any] = {}  # For white-label
    
    # Metadata
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    
    # Migration tracking
    migrated_from_user_id: Optional[str] = None  # Track which user this was created from


class OrganizationCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    type: OrgType = OrgType.DIRECT


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    branding: Optional[Dict[str, Any]] = None
    billing_email: Optional[str] = None


# ======================= ORG MEMBERSHIP MODELS =======================

class OrgMembership(BaseModel):
    """
    Links users to organizations with specific roles.
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    org_id: str
    user_id: str
    role: OrgRole = OrgRole.MEMBER
    
    # Invitation tracking
    invited_by: Optional[str] = None
    invited_at: Optional[datetime] = None
    joined_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Status
    is_active: bool = True
    last_accessed_at: Optional[datetime] = None


class OrgMembershipCreate(BaseModel):
    user_id: str
    role: OrgRole = OrgRole.MEMBER


class OrgMembershipUpdate(BaseModel):
    role: Optional[OrgRole] = None
    is_active: Optional[bool] = None


# ======================= WORKSPACE MODELS =======================

class Workspace(BaseModel):
    """
    Sub-tenant within an organization. Enables reseller model.
    For direct customers: 1 org = 1 default workspace
    For resellers: 1 org = multiple client workspaces
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    org_id: str
    name: str
    slug: str
    type: WorkspaceType = WorkspaceType.INTERNAL
    
    # Plan (can be different from org plan for reseller clients)
    plan_id: Optional[str] = None  # If None, inherit from org
    
    # Settings
    settings: Dict[str, Any] = {}
    
    # Client settings (for reseller model)
    allow_client_login: bool = False
    client_contact_email: Optional[str] = None
    
    # Metadata
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None
    
    # Migration tracking
    is_default: bool = False  # True for auto-created workspaces


class WorkspaceCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    type: WorkspaceType = WorkspaceType.INTERNAL
    plan_id: Optional[str] = None
    allow_client_login: bool = False


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    plan_id: Optional[str] = None
    allow_client_login: Optional[bool] = None


# ======================= WORKSPACE MEMBERSHIP MODELS =======================

class WorkspaceMembership(BaseModel):
    """
    Links users to specific workspaces (for granular access control).
    """
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str
    user_id: str
    role: WorkspaceRole = WorkspaceRole.WORKSPACE_MEMBER
    
    # Access control
    granted_by: str
    granted_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Status
    is_active: bool = True


# ======================= PLAN MODELS =======================

class Plan(BaseModel):
    """
    Defines feature access and limits for each pricing tier.
    """
    id: str
    name: str
    description: str
    price_monthly: float
    price_yearly: float
    
    # Feature flags
    features: Dict[str, bool] = {}
    
    # Limits
    limits: Dict[str, int] = {}
    
    # Display
    is_public: bool = True
    display_order: int = 0


# Default plans
DEFAULT_PLANS = [
    {
        "id": "plan_free",
        "name": "Free",
        "description": "Get started with basic features",
        "price_monthly": 0,
        "price_yearly": 0,
        "features": {
            "ai_editing": False,
            "strategic_capital": False,
            "data_room": False,
            "api_access": False,
            "white_label": False,
            "sub_tenancy": False,
            "advanced_reports": False,
            "email_support": True,
        },
        "limits": {
            "max_entities": 5,
            "max_users": 1,
            "max_workspaces": 1,
            "max_integrations": 2,
            "max_transactions_monthly": 1000,
        },
        "is_public": True,
        "display_order": 0
    },
    {
        "id": "plan_starter",
        "name": "Starter",
        "description": "For small businesses getting organized",
        "price_monthly": 29,
        "price_yearly": 290,
        "features": {
            "ai_editing": False,
            "strategic_capital": False,
            "data_room": False,
            "api_access": False,
            "white_label": False,
            "sub_tenancy": False,
            "advanced_reports": True,
            "email_support": True,
        },
        "limits": {
            "max_entities": 10,
            "max_users": 3,
            "max_workspaces": 1,
            "max_integrations": 5,
            "max_transactions_monthly": 10000,
        },
        "is_public": True,
        "display_order": 1
    },
    {
        "id": "plan_professional",
        "name": "Professional",
        "description": "For growing finance teams",
        "price_monthly": 99,
        "price_yearly": 990,
        "features": {
            "ai_editing": True,
            "strategic_capital": True,
            "data_room": False,
            "api_access": True,
            "white_label": False,
            "sub_tenancy": False,
            "advanced_reports": True,
            "email_support": True,
            "priority_support": True,
        },
        "limits": {
            "max_entities": 50,
            "max_users": 10,
            "max_workspaces": 1,
            "max_integrations": 20,
            "max_transactions_monthly": 100000,
        },
        "is_public": True,
        "display_order": 2
    },
    {
        "id": "plan_enterprise",
        "name": "Enterprise",
        "description": "For CFOs and resellers with multiple clients",
        "price_monthly": 299,
        "price_yearly": 2990,
        "features": {
            "ai_editing": True,
            "strategic_capital": True,
            "data_room": True,
            "api_access": True,
            "white_label": True,
            "sub_tenancy": True,
            "advanced_reports": True,
            "email_support": True,
            "priority_support": True,
            "dedicated_support": True,
        },
        "limits": {
            "max_entities": -1,  # Unlimited
            "max_users": -1,
            "max_workspaces": -1,
            "max_integrations": -1,
            "max_transactions_monthly": -1,
        },
        "is_public": True,
        "display_order": 3
    }
]


# ======================= JWT CLAIMS EXTENSION =======================

class ExtendedTokenClaims(BaseModel):
    """
    Extended JWT claims for org/workspace context.
    """
    # Standard claims
    sub: str  # user_id
    email: str
    name: str
    role: str
    
    # Org context (NEW)
    org_id: Optional[str] = None
    org_role: Optional[str] = None
    
    # Workspace context (NEW)
    workspace_id: Optional[str] = None
    workspace_role: Optional[str] = None
    
    # Backward compatibility
    legacy_mode: bool = False  # True if user hasn't been migrated


# ======================= HELPER FUNCTIONS =======================

def generate_slug(name: str) -> str:
    """Generate URL-friendly slug from name"""
    import re
    slug = name.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'[\s_]+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    slug = slug.strip('-')
    return slug[:50]  # Limit length


def get_collections_to_migrate() -> List[str]:
    """
    List of collections that need org_id/workspace_id added.
    """
    return [
        "companies",
        "entities", 
        "transactions",
        "consolidation_groups",
        "erp_accounts",
        "shared_integrations",
        "chat_history",
        "scheduled_reports",
        "dashboard_layouts",
        "coa_mappings",
        "bank_connections",
        "bank_transactions",
        "upload_batches",
        "financial_analysis",
        "audit_entries",
        "alerts",
        "custom_reports",
        "custom_ratios",
        "benchmarks",
        "scenario_analyses",
        "funding_requirements",
        "funding_sources",
        "what_if_scenarios",
        "policy_library",
    ]
