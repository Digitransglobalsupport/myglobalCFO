"""
FP&A Module Data Models
Supports multi-dimensional financial planning with driver-based modeling
"""

from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid


# ==================== ENUMS ====================

class VersionType(str, Enum):
    """Planning version types"""
    BUDGET = "budget"
    FORECAST = "forecast"
    ACTUALS = "actuals"
    SCENARIO = "scenario"


class DriverType(str, Enum):
    """Operational driver types"""
    HEADCOUNT = "headcount"
    UNITS = "units"
    PERCENTAGE = "percentage"
    CURRENCY = "currency"
    CUSTOM = "custom"


class TimeGranularity(str, Enum):
    """Time period granularity"""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class UserRole(str, Enum):
    """Enhanced user roles for FP&A permissions"""
    CFO_ADMIN = "cfo_admin"
    FINANCE_ANALYST = "finance_analyst"
    DEPARTMENT_MANAGER = "department_manager"
    EXECUTIVE_VIEWER = "executive_viewer"
    CONTRIBUTOR = "contributor"
    TENANT = "tenant"  # Legacy role
    ADMIN = "admin"    # Legacy role


# ==================== DIMENSION MODELS ====================

class Entity(BaseModel):
    """Legal entity or subsidiary"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str  # Short code (e.g., "US-HQ", "UK-SUB")
    parent_entity_id: Optional[str] = None
    currency: str = "USD"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Department(BaseModel):
    """Organizational department"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str  # Short code (e.g., "SALES", "MKTG")
    entity_id: str
    manager_user_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Product(BaseModel):
    """Product or service line"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str
    category: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CustomerSegment(BaseModel):
    """Customer segment classification"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str  # e.g., "ENT", "SMB", "CONSUMER"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Geography(BaseModel):
    """Geographic region"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str  # e.g., "EMEA", "APAC", "AMER"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class Account(BaseModel):
    """Financial account from chart of accounts"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    code: str  # Account code
    category: str  # Revenue, COGS, OpEx, etc.
    account_type: str  # P&L, Balance Sheet, Cash Flow
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== VERSION MODELS ====================

class PlanningVersion(BaseModel):
    """Planning version (Budget, Forecast, Scenario)"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "2026 Annual Budget", "Q1 2026 Forecast"
    version_type: VersionType
    fiscal_year: int
    start_period: str  # YYYY-MM format
    end_period: str    # YYYY-MM format
    is_rolling: bool = False  # True for rolling forecasts
    rolling_months: Optional[int] = None  # e.g., 12 or 18
    base_version_id: Optional[str] = None  # If cloned from another version
    is_locked: bool = False  # Lock to prevent edits
    created_by: str  # user_id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class PlanningVersionCreate(BaseModel):
    """Create new planning version"""
    name: str
    version_type: VersionType
    fiscal_year: int
    start_period: str
    end_period: str
    is_rolling: bool = False
    rolling_months: Optional[int] = None
    base_version_id: Optional[str] = None


# ==================== PLANNING DATA MODELS ====================

class PlanningData(BaseModel):
    """Multi-dimensional planning data point"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    version_id: str
    
    # 7 Dimensions
    entity_id: Optional[str] = None
    department_id: Optional[str] = None
    time_period: str  # YYYY-MM format
    account_id: str
    product_id: Optional[str] = None
    customer_segment_id: Optional[str] = None
    geography_id: Optional[str] = None
    
    # Value
    value: float
    
    # Audit trail
    created_by: str  # user_id
    updated_by: str  # user_id
    previous_value: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Notes
    notes: Optional[str] = None


class PlanningDataCreate(BaseModel):
    """Create planning data entry"""
    version_id: str
    entity_id: str
    department_id: str
    time_period: str
    account_id: str
    product_id: Optional[str] = None
    customer_segment_id: Optional[str] = None
    geography_id: Optional[str] = None
    value: float
    notes: Optional[str] = None


class PlanningDataBulkCreate(BaseModel):
    """Bulk create planning data"""
    version_id: str
    data_points: List[PlanningDataCreate]


# ==================== DRIVER MODELS ====================

class Driver(BaseModel):
    """Operational driver for driver-based modeling"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # e.g., "Sales Headcount", "Units Sold"
    code: str  # Short code for formulas (e.g., "HC_SALES", "UNITS")
    driver_type: DriverType
    description: Optional[str] = None
    unit: Optional[str] = None  # e.g., "employees", "units", "%"
    
    # Dimensions this driver applies to
    entity_id: Optional[str] = None
    department_id: Optional[str] = None
    
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DriverValue(BaseModel):
    """Driver value for a specific time period"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    driver_id: str
    version_id: str
    time_period: str  # YYYY-MM format
    
    # Optional dimensions for more specific values
    entity_id: Optional[str] = None
    department_id: Optional[str] = None
    product_id: Optional[str] = None
    
    value: float
    
    # Audit trail
    created_by: str
    updated_by: str
    previous_value: Optional[float] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class DriverCreate(BaseModel):
    """Create new driver"""
    name: str
    code: str
    driver_type: DriverType
    description: Optional[str] = None
    unit: Optional[str] = None
    entity_id: Optional[str] = None
    department_id: Optional[str] = None


class DriverValueCreate(BaseModel):
    """Create driver value"""
    driver_id: str
    version_id: str
    time_period: str
    entity_id: Optional[str] = None
    department_id: Optional[str] = None
    product_id: Optional[str] = None
    value: float


# ==================== FORMULA MODELS ====================

class Formula(BaseModel):
    """Formula linking drivers to financial accounts"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    account_id: str  # The account this formula calculates
    
    # Formula expression (e.g., "HC_SALES * AVG_SALARY * (1 + INFLATION)")
    expression: str
    
    # Dependencies (driver codes or other account codes)
    dependencies: List[str]  # e.g., ["HC_SALES", "AVG_SALARY", "INFLATION"]
    
    # Optional dimension filters
    entity_id: Optional[str] = None
    department_id: Optional[str] = None
    
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class FormulaCreate(BaseModel):
    """Create new formula"""
    name: str
    account_id: str
    expression: str
    dependencies: List[str]
    entity_id: Optional[str] = None
    department_id: Optional[str] = None


# ==================== USER PERMISSION MODELS ====================

class UserPermission(BaseModel):
    """Granular user permissions for FP&A access"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    role: UserRole
    
    # Dimension-level access
    entity_ids: Optional[List[str]] = None  # None = all access
    department_ids: Optional[List[str]] = None
    account_category_access: Optional[List[str]] = None  # e.g., ["Revenue", "OpEx"]
    
    # Feature access
    can_create_versions: bool = False
    can_edit_drivers: bool = False
    can_create_formulas: bool = False
    can_lock_versions: bool = False
    can_manage_users: bool = False
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserPermissionCreate(BaseModel):
    """Create user permission"""
    user_id: str
    role: UserRole
    entity_ids: Optional[List[str]] = None
    department_ids: Optional[List[str]] = None
    account_category_access: Optional[List[str]] = None
    can_create_versions: bool = False
    can_edit_drivers: bool = False
    can_create_formulas: bool = False
    can_lock_versions: bool = False
    can_manage_users: bool = False


# ==================== AUDIT TRAIL MODELS ====================

class AuditLog(BaseModel):
    """Audit trail for all FP&A changes"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_email: str
    action: str  # create, update, delete
    entity_type: str  # planning_data, driver_value, formula, etc.
    entity_id: str
    
    # Changed data
    previous_value: Optional[Dict[str, Any]] = None
    new_value: Optional[Dict[str, Any]] = None
    
    # Context
    version_id: Optional[str] = None
    ip_address: Optional[str] = None
    
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# ==================== QUERY MODELS ====================

class PlanningDataQuery(BaseModel):
    """Query model for filtering planning data"""
    version_id: Optional[str] = None
    entity_ids: Optional[List[str]] = None
    department_ids: Optional[List[str]] = None
    account_ids: Optional[List[str]] = None
    product_ids: Optional[List[str]] = None
    customer_segment_ids: Optional[List[str]] = None
    geography_ids: Optional[List[str]] = None
    start_period: Optional[str] = None
    end_period: Optional[str] = None


# ==================== RESPONSE MODELS ====================

class DimensionSummary(BaseModel):
    """Summary of dimension counts"""
    entities: int
    departments: int
    accounts: int
    products: int
    customer_segments: int
    geographies: int
    
    
class VersionSummary(BaseModel):
    """Summary of a planning version"""
    version: PlanningVersion
    data_point_count: int
    last_updated: datetime
    contributors: List[str]  # user_ids who contributed
