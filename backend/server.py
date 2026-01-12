from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from enum import Enum
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'myglobalcfo_db')]

# JWT Configuration
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'myglobalcfo-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_DAYS = 7

# Create the main app
app = FastAPI(title="MyGlobalCFO API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ======================= ENUMS =======================

class UserRole(str, Enum):
    ADMIN = "admin"
    TENANT = "tenant"

class CompanyType(str, Enum):
    STANDALONE = "Standalone"
    TOPCO = "TopCo"
    SUBSIDIARY = "Subsidiary"

class TransactionType(str, Enum):
    INVOICE = "Invoice"
    BILL = "Bill"
    BANK_TRANSACTION = "Bank Transaction"
    JOURNAL_ENTRY = "Journal Entry"

class TransactionCategory(str, Enum):
    SALES = "Sales"
    MARKETING = "Marketing"
    OPERATIONS = "Operations"
    TECHNOLOGY = "Technology"
    ADMINISTRATION = "Administration"

class TransactionSource(str, Enum):
    EMAIL = "Email"
    XERO = "Xero"
    TRUELAYER = "TrueLayer"
    MANUAL = "Manual"
    QUICKBOOKS = "QuickBooks"
    SAGE = "Sage"

class ReconciliationStatus(str, Enum):
    MATCHED = "Matched"
    PENDING = "Pending"
    UNMATCHED = "Unmatched"

# Note: Currency enum kept for backward compatibility
# New transactions should use currency codes from the currencies collection
class Currency(str, Enum):
    GBP = "GBP"
    USD = "USD"
    EUR = "EUR"
    # Additional common currencies
    JPY = "JPY"
    CNY = "CNY"
    INR = "INR"
    AUD = "AUD"
    CAD = "CAD"
    CHF = "CHF"

class PlanningVersionType(str, Enum):
    BUDGET = "Budget"
    FORECAST = "Forecast"
    ACTUALS = "Actuals"
    SCENARIO = "Scenario"

# ======================= MODELS =======================

# User Models
class UserBase(BaseModel):
    email: EmailStr
    name: str
    role: UserRole = UserRole.TENANT

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ai_advisor_access: bool = True

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    ai_advisor_access: bool

class AuthResponse(BaseModel):
    token: str
    user: UserResponse

# Company Models
class CompanyCreate(BaseModel):
    name: str
    country: str = "United Kingdom"
    country_code: Optional[str] = "GBR"
    currency: str = "GBP"  # ISO 4217 code
    global_region: Optional[str] = None
    company_type: CompanyType = CompanyType.STANDALONE
    parent_company_id: Optional[str] = None
    reporting_currency: Optional[str] = None  # Group reporting currency for consolidation

class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    country: str = "United Kingdom"
    country_code: Optional[str] = "GBR"
    currency: str = "GBP"  # ISO 4217 code
    global_region: Optional[str] = None
    company_type: CompanyType = CompanyType.STANDALONE
    parent_company_id: Optional[str] = None
    reporting_currency: Optional[str] = None  # Group reporting currency for consolidation
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Transaction Models
class TransactionCreate(BaseModel):
    company_id: str
    date: datetime
    description: str
    amount: float
    type: TransactionType
    category: TransactionCategory
    source: TransactionSource
    status: ReconciliationStatus = ReconciliationStatus.PENDING
    counterparty: Optional[str] = None
    reference: Optional[str] = None
    # Multi-currency fields
    transaction_currency: Optional[str] = None  # ISO 4217 - Currency of the original transaction
    reporting_currency: Optional[str] = None    # ISO 4217 - Group currency for consolidation
    reporting_amount: Optional[float] = None    # Amount converted to reporting_currency
    fx_rate: Optional[float] = None             # Exchange rate at transaction time

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    date: datetime
    description: str
    amount: float
    type: TransactionType
    category: TransactionCategory
    source: TransactionSource
    status: ReconciliationStatus = ReconciliationStatus.PENDING
    counterparty: Optional[str] = None
    reference: Optional[str] = None
    # Multi-currency fields
    transaction_currency: Optional[str] = None  # ISO 4217 - Currency of the original transaction
    reporting_currency: Optional[str] = None    # ISO 4217 - Group currency for consolidation
    reporting_amount: Optional[float] = None    # Amount converted to reporting_currency
    fx_rate: Optional[float] = None             # Exchange rate at transaction time
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Dashboard Models
class DashboardMetrics(BaseModel):
    revenue: float = 0.0
    ebitda: float = 0.0
    ebitda_margin: float = 0.0
    cash_balance: float = 0.0
    runway_days: int = 0
    burn_rate: float = 0.0
    quick_ratio: float = 0.0
    revenue_growth: float = 0.0
    ar_current: float = 0.0
    ar_30_days: float = 0.0
    ar_60_days: float = 0.0
    ar_90_plus_days: float = 0.0
    matched_count: int = 0
    pending_count: int = 0
    unmatched_count: int = 0
    transaction_count: int = 0
    cost_centers: List[Dict[str, Any]] = []

# Reconciliation Models
class ReconciliationResult(BaseModel):
    matched_count: int
    pending_count: int
    unmatched_count: int
    newly_matched: int

# Finance Sourcing Models
class FinanceOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    provider: str
    interest_rate: float
    amount_min: float
    amount_max: float
    eligibility: str
    source_url: str

# Integration Models
class IntegrationCreate(BaseModel):
    platform: str
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    api_key: Optional[str] = None

class Integration(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    platform: str
    status: str = "not_connected"
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    api_key: Optional[str] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    last_sync: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Entity Group Models
class EntityGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    entity_ids: List[str] = []

class EntityGroup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = None
    entity_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# FP&A Models
class PlanningVersionCreate(BaseModel):
    name: str
    version_type: PlanningVersionType
    fiscal_year: int
    start_period: str
    end_period: str
    is_rolling: bool = False
    rolling_months: int = 12
    company_id: str

class PlanningVersion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    name: str
    version_type: PlanningVersionType
    fiscal_year: int
    start_period: str
    end_period: str
    is_rolling: bool = False
    rolling_months: int = 12
    is_locked: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class Driver(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    formula: str
    driver_type: str
    linked_accounts: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DriverCreate(BaseModel):
    name: str
    formula: str
    driver_type: str
    linked_accounts: List[str] = []

class DriverUpdate(BaseModel):
    name: Optional[str] = None
    formula: Optional[str] = None
    driver_type: Optional[str] = None
    linked_accounts: Optional[List[str]] = None

class PlanningVersionUpdate(BaseModel):
    name: Optional[str] = None
    version_type: Optional[PlanningVersionType] = None
    fiscal_year: Optional[int] = None
    start_period: Optional[str] = None
    end_period: Optional[str] = None
    is_rolling: Optional[bool] = None
    rolling_months: Optional[int] = None

# ======================= LOAN COVENANT MODELS =======================

class CovenantType(str, Enum):
    DSCR = "DSCR"  # Debt Service Coverage Ratio
    ICR = "ICR"  # Interest Coverage Ratio
    LEVERAGE = "Leverage"  # Debt/EBITDA
    CURRENT_RATIO = "Current Ratio"
    QUICK_RATIO = "Quick Ratio"
    MIN_CASH = "Minimum Cash"
    MAX_CAPEX = "Maximum CapEx"
    NET_WORTH = "Net Worth"
    CUSTOM = "Custom"

class CovenantStatus(str, Enum):
    COMPLIANT = "compliant"
    WARNING = "warning"
    BREACH = "breach"

class LoanCreate(BaseModel):
    company_id: str
    lender_name: str
    loan_type: str  # Term Loan, Revolving, etc.
    principal_amount: float
    currency: str = "GBP"
    interest_rate: float
    start_date: datetime
    maturity_date: datetime
    payment_frequency: str = "Monthly"  # Monthly, Quarterly, Semi-Annual, Annual
    notes: Optional[str] = None

class Loan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    lender_name: str
    loan_type: str
    principal_amount: float
    outstanding_balance: float = 0.0
    currency: str = "GBP"
    interest_rate: float
    start_date: datetime
    maturity_date: datetime
    payment_frequency: str = "Monthly"
    notes: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CovenantCreate(BaseModel):
    loan_id: str
    company_id: str
    covenant_type: CovenantType
    name: str
    requirement_operator: str  # >=, <=, =
    threshold_value: float
    measurement_frequency: str = "Quarterly"  # Monthly, Quarterly, Annual
    grace_period_days: int = 0
    warning_threshold_pct: float = 10.0  # Percentage before breach to trigger warning
    notes: Optional[str] = None

class Covenant(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    loan_id: str
    company_id: str
    covenant_type: CovenantType
    name: str
    requirement_operator: str
    threshold_value: float
    current_value: Optional[float] = None
    status: CovenantStatus = CovenantStatus.COMPLIANT
    headroom_pct: Optional[float] = None
    measurement_frequency: str = "Quarterly"
    grace_period_days: int = 0
    warning_threshold_pct: float = 10.0
    last_measured_at: Optional[datetime] = None
    notes: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CovenantUpdate(BaseModel):
    current_value: Optional[float] = None
    threshold_value: Optional[float] = None
    warning_threshold_pct: Optional[float] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class CovenantMeasurement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    covenant_id: str
    measured_value: float
    status: CovenantStatus
    headroom_pct: float
    measurement_date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None

# ======================= MULTI-ENTITY CONSOLIDATION MODELS =======================

class ConsolidationMethod(str, Enum):
    FULL = "Full"  # 100% consolidation
    PROPORTIONAL = "Proportional"  # Based on ownership %
    EQUITY = "Equity"  # Equity method

# ======================= ENTITY TREE & COA MAPPING MODELS =======================

class EntityType(str, Enum):
    STANDALONE = "standalone"
    SUBSIDIARY = "subsidiary"
    HOLDCO = "holdco"  # Holding company

class ERPProvider(str, Enum):
    SAGE = "sage"
    NETSUITE = "netsuite"
    QUICKBOOKS = "quickbooks"
    XERO = "xero"
    ORACLE = "oracle"
    SAP = "sap"
    EXCEL = "excel"
    MANUAL = "manual"

class ERPConnectionStatus(str, Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    PENDING = "pending"

# Entity Tree Model (for 130+ entities)
class EntityTreeNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    entity_code: str  # Unique entity code (e.g., "UK-001")
    entity_type: EntityType = EntityType.STANDALONE
    parent_entity_id: Optional[str] = None  # For tree hierarchy
    ownership_pct: float = 100.0  # Ownership percentage
    country: str = "United Kingdom"
    country_code: str = "GBR"
    local_currency: str = "GBP"
    reporting_currency: str = "USD"  # Group reporting currency
    segment: Optional[str] = None  # Business segment (e.g., "Retail", "Manufacturing")
    region: Optional[str] = None  # Geographic region
    fiscal_year_end: str = "December"
    consolidation_method: ConsolidationMethod = ConsolidationMethod.FULL
    is_active: bool = True
    # ERP Connection
    erp_provider: Optional[ERPProvider] = None
    erp_connection_status: ERPConnectionStatus = ERPConnectionStatus.DISCONNECTED
    erp_credentials: Optional[Dict[str, Any]] = None  # Encrypted/masked credentials
    last_sync_at: Optional[datetime] = None
    # Data Health
    data_health_pct: float = 0.0  # Percentage of complete data
    missing_mappings: List[str] = []  # List of missing account categories
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class EntityTreeNodeCreate(BaseModel):
    name: str
    entity_code: str
    entity_type: EntityType = EntityType.STANDALONE
    parent_entity_id: Optional[str] = None
    ownership_pct: float = 100.0
    country: str = "United Kingdom"
    country_code: str = "GBR"
    local_currency: str = "GBP"
    reporting_currency: str = "USD"
    segment: Optional[str] = None
    region: Optional[str] = None
    fiscal_year_end: str = "December"
    consolidation_method: ConsolidationMethod = ConsolidationMethod.FULL
    erp_provider: Optional[ERPProvider] = None

class EntityTreeNodeUpdate(BaseModel):
    name: Optional[str] = None
    entity_type: Optional[EntityType] = None
    parent_entity_id: Optional[str] = None
    ownership_pct: Optional[float] = None
    country: Optional[str] = None
    country_code: Optional[str] = None
    local_currency: Optional[str] = None
    reporting_currency: Optional[str] = None
    segment: Optional[str] = None
    region: Optional[str] = None
    fiscal_year_end: Optional[str] = None
    consolidation_method: Optional[ConsolidationMethod] = None
    is_active: Optional[bool] = None
    erp_provider: Optional[ERPProvider] = None

# ======================= CHART OF ACCOUNTS (COA) MAPPING MODELS =======================

# Standard Group Schema Categories (Unified)
GROUP_SCHEMA_CATEGORIES = {
    # Income Statement
    "GROUP_REVENUE": {"name": "Group Revenue", "type": "income", "is_required": True},
    "GROUP_COGS": {"name": "Group Cost of Goods Sold", "type": "expense", "is_required": True},
    "GROUP_GROSS_PROFIT": {"name": "Group Gross Profit", "type": "calculated", "is_required": False},
    "GROUP_OPEX": {"name": "Group Operating Expenses", "type": "expense", "is_required": True},
    "GROUP_SALARIES": {"name": "Group Salaries & Wages", "type": "expense", "is_required": True},
    "GROUP_DEPRECIATION": {"name": "Group Depreciation & Amortization", "type": "expense", "is_required": False},
    "GROUP_EBITDA": {"name": "Group EBITDA", "type": "calculated", "is_required": True},
    "GROUP_EBIT": {"name": "Group EBIT", "type": "calculated", "is_required": False},
    "GROUP_INTEREST_EXPENSE": {"name": "Group Interest Expense", "type": "expense", "is_required": False},
    "GROUP_TAX_EXPENSE": {"name": "Group Tax Expense", "type": "expense", "is_required": False},
    "GROUP_NET_INCOME": {"name": "Group Net Income", "type": "calculated", "is_required": True},
    # Balance Sheet - Assets
    "GROUP_CASH": {"name": "Group Cash & Equivalents", "type": "asset", "is_required": True},
    "GROUP_AR": {"name": "Group Accounts Receivable", "type": "asset", "is_required": True},
    "GROUP_INVENTORY": {"name": "Group Inventory", "type": "asset", "is_required": False},
    "GROUP_PREPAID": {"name": "Group Prepaid Expenses", "type": "asset", "is_required": False},
    "GROUP_CURRENT_ASSETS": {"name": "Group Current Assets", "type": "asset", "is_required": True},
    "GROUP_FIXED_ASSETS": {"name": "Group Fixed Assets", "type": "asset", "is_required": False},
    "GROUP_INTANGIBLES": {"name": "Group Intangible Assets", "type": "asset", "is_required": False},
    "GROUP_TOTAL_ASSETS": {"name": "Group Total Assets", "type": "asset", "is_required": True},
    # Balance Sheet - Liabilities
    "GROUP_AP": {"name": "Group Accounts Payable", "type": "liability", "is_required": True},
    "GROUP_ACCRUED": {"name": "Group Accrued Expenses", "type": "liability", "is_required": False},
    "GROUP_CURRENT_LIABILITIES": {"name": "Group Current Liabilities", "type": "liability", "is_required": True},
    "GROUP_LONG_TERM_DEBT": {"name": "Group Long-Term Debt", "type": "liability", "is_required": True},
    "GROUP_TOTAL_LIABILITIES": {"name": "Group Total Liabilities", "type": "liability", "is_required": True},
    # Balance Sheet - Equity
    "GROUP_EQUITY": {"name": "Group Shareholders' Equity", "type": "equity", "is_required": True},
    "GROUP_RETAINED_EARNINGS": {"name": "Group Retained Earnings", "type": "equity", "is_required": False},
}

# Default Local Account Mappings per ERP
DEFAULT_ERP_MAPPINGS = {
    "sage": {
        "4000": "GROUP_REVENUE",
        "4100": "GROUP_REVENUE",
        "5000": "GROUP_COGS",
        "6000": "GROUP_OPEX",
        "7000": "GROUP_SALARIES",
        "7200": "GROUP_DEPRECIATION",
        "8100": "GROUP_INTEREST_EXPENSE",
        "9000": "GROUP_TAX_EXPENSE",
        "1100": "GROUP_CASH",
        "1200": "GROUP_AR",
        "1300": "GROUP_INVENTORY",
        "2100": "GROUP_AP",
        "2400": "GROUP_LONG_TERM_DEBT",
        "3000": "GROUP_EQUITY",
    },
    "netsuite": {
        "401": "GROUP_REVENUE",
        "501": "GROUP_COGS",
        "601": "GROUP_OPEX",
        "602": "GROUP_SALARIES",
        "701": "GROUP_DEPRECIATION",
        "111": "GROUP_CASH",
        "121": "GROUP_AR",
        "131": "GROUP_INVENTORY",
        "211": "GROUP_AP",
        "251": "GROUP_LONG_TERM_DEBT",
        "311": "GROUP_EQUITY",
    },
    "quickbooks": {
        "Sales": "GROUP_REVENUE",
        "Cost of Sales": "GROUP_COGS",
        "Operating Expenses": "GROUP_OPEX",
        "Payroll Expenses": "GROUP_SALARIES",
        "Checking": "GROUP_CASH",
        "Accounts Receivable": "GROUP_AR",
        "Inventory Asset": "GROUP_INVENTORY",
        "Accounts Payable": "GROUP_AP",
    },
    "xero": {
        "200": "GROUP_REVENUE",
        "300": "GROUP_COGS",
        "400": "GROUP_OPEX",
        "477": "GROUP_SALARIES",
        "090": "GROUP_CASH",
        "610": "GROUP_AR",
        "630": "GROUP_INVENTORY",
        "800": "GROUP_AP",
    },
    "excel": {},
    "manual": {},
}

class COAMapping(BaseModel):
    """Single account code mapping"""
    local_account_code: str
    local_account_name: str
    group_category: str  # GROUP_REVENUE, GROUP_OPEX, etc.
    is_verified: bool = False  # Has been manually verified
    notes: Optional[str] = None

class COAMappingTemplate(BaseModel):
    """Entity-level COA mapping template"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    entity_id: str
    erp_provider: ERPProvider
    mappings: List[Dict[str, Any]] = []  # List of COAMapping dicts
    unmapped_accounts: List[str] = []  # Accounts that need mapping
    is_complete: bool = False
    completion_pct: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class COAMappingCreate(BaseModel):
    entity_id: str
    erp_provider: ERPProvider
    mappings: List[Dict[str, Any]] = []

class COAMappingUpdate(BaseModel):
    mappings: Optional[List[Dict[str, Any]]] = None
    unmapped_accounts: Optional[List[str]] = None

# ======================= DATA GOVERNANCE MODELS =======================

class DataHealthStatus(str, Enum):
    COMPLETE = "complete"  # 100% data health
    PARTIAL = "partial"  # 50-99%
    INCOMPLETE = "incomplete"  # <50%
    CRITICAL = "critical"  # Missing required categories

class MappingAlert(BaseModel):
    """Alert for incomplete mapping"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    entity_id: str
    entity_name: str
    alert_type: str  # "missing_mapping", "stale_data", "validation_error"
    severity: str  # "high", "medium", "low"
    category: str  # The missing category (e.g., "GROUP_EBITDA")
    message: str
    is_blocking: bool = False  # Blocks consolidation if True
    is_resolved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    resolved_at: Optional[datetime] = None

# Required categories for consolidation (admin-configurable)
class RequiredCategoryConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    categories: List[str] = []  # List of GROUP_ categories that are mandatory
    is_strict_mode: bool = False  # If True, blocks consolidation entirely
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ======================= ADJUSTMENT JOURNALS (EXCEL PARITY) =======================

class AdjustmentJournalType(str, Enum):
    MANUAL_ACCRUAL = "manual_accrual"
    INTERCOMPANY_ELIM = "intercompany_elimination"
    FX_ADJUSTMENT = "fx_adjustment"
    RECLASSIFICATION = "reclassification"
    CONSOLIDATION_ADJ = "consolidation_adjustment"
    CUSTOM = "custom"

class AdjustmentJournalEntry(BaseModel):
    """Individual journal line"""
    account_category: str  # GROUP_ category
    debit: float = 0.0
    credit: float = 0.0
    description: Optional[str] = None

class AdjustmentJournal(BaseModel):
    """Group-level adjustment journal (like Excel adjustments)"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    group_id: Optional[str] = None  # Consolidation group
    entity_id: Optional[str] = None  # Or specific entity
    journal_type: AdjustmentJournalType
    period: str  # "2025-01", "2025-Q1", etc.
    description: str
    entries: List[Dict[str, Any]] = []  # List of AdjustmentJournalEntry dicts
    total_debit: float = 0.0
    total_credit: float = 0.0
    is_balanced: bool = True
    is_posted: bool = False
    posted_at: Optional[datetime] = None
    posted_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class AdjustmentJournalCreate(BaseModel):
    group_id: Optional[str] = None
    entity_id: Optional[str] = None
    journal_type: AdjustmentJournalType
    period: str
    description: str
    entries: List[Dict[str, Any]] = []

class AdjustmentJournalUpdate(BaseModel):
    description: Optional[str] = None
    entries: Optional[List[Dict[str, Any]]] = None
    is_posted: Optional[bool] = None

# ======================= ERP INTEGRATION MODELS =======================

class ERPConnection(BaseModel):
    """ERP connection configuration"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    entity_id: str
    provider: ERPProvider
    status: ERPConnectionStatus = ERPConnectionStatus.PENDING
    # Connection details (masked)
    api_url: Optional[str] = None
    client_id: Optional[str] = None
    # Sync settings
    auto_sync: bool = False
    sync_frequency: str = "daily"  # "hourly", "daily", "weekly"
    last_sync_at: Optional[datetime] = None
    last_sync_status: Optional[str] = None
    last_sync_records: int = 0
    # Data pulled
    available_accounts: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ERPConnectionCreate(BaseModel):
    entity_id: str
    provider: ERPProvider
    api_url: Optional[str] = None
    client_id: Optional[str] = None
    client_secret: Optional[str] = None
    api_key: Optional[str] = None
    auto_sync: bool = False
    sync_frequency: str = "daily"

# ======================= MOCK FINANCIAL DATA FOR ENTITIES =======================

def generate_mock_entity_financials(entity_id: str, entity_name: str, currency: str, seed: int = 0) -> Dict[str, Any]:
    """Generate realistic mock financial data for an entity"""
    random.seed(hash(entity_id) + seed)
    
    # Base revenue (varies by entity)
    base_revenue = random.randint(500000, 5000000)
    
    return {
        "entity_id": entity_id,
        "entity_name": entity_name,
        "currency": currency,
        "period": datetime.now(timezone.utc).strftime("%Y-%m"),
        "financials": {
            "GROUP_REVENUE": round(base_revenue, 2),
            "GROUP_COGS": round(base_revenue * random.uniform(0.4, 0.6), 2),
            "GROUP_GROSS_PROFIT": round(base_revenue * random.uniform(0.4, 0.6), 2),
            "GROUP_OPEX": round(base_revenue * random.uniform(0.15, 0.25), 2),
            "GROUP_SALARIES": round(base_revenue * random.uniform(0.1, 0.2), 2),
            "GROUP_DEPRECIATION": round(base_revenue * random.uniform(0.02, 0.05), 2),
            "GROUP_EBITDA": round(base_revenue * random.uniform(0.15, 0.25), 2),
            "GROUP_NET_INCOME": round(base_revenue * random.uniform(0.08, 0.15), 2),
            "GROUP_CASH": round(base_revenue * random.uniform(0.3, 0.6), 2),
            "GROUP_AR": round(base_revenue * random.uniform(0.1, 0.2), 2),
            "GROUP_INVENTORY": round(base_revenue * random.uniform(0.05, 0.15), 2),
            "GROUP_CURRENT_ASSETS": round(base_revenue * random.uniform(0.5, 0.8), 2),
            "GROUP_TOTAL_ASSETS": round(base_revenue * random.uniform(1.2, 2.0), 2),
            "GROUP_AP": round(base_revenue * random.uniform(0.08, 0.15), 2),
            "GROUP_CURRENT_LIABILITIES": round(base_revenue * random.uniform(0.2, 0.4), 2),
            "GROUP_LONG_TERM_DEBT": round(base_revenue * random.uniform(0.3, 0.6), 2),
            "GROUP_TOTAL_LIABILITIES": round(base_revenue * random.uniform(0.5, 1.0), 2),
            "GROUP_EQUITY": round(base_revenue * random.uniform(0.5, 1.0), 2),
        }
    }

class ConsolidationGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    reporting_currency: str = "USD"
    entity_ids: List[str] = []

class ConsolidationGroup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = None
    reporting_currency: str = "USD"
    entity_ids: List[str] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EntityConsolidationConfig(BaseModel):
    entity_id: str
    consolidation_method: ConsolidationMethod = ConsolidationMethod.FULL
    ownership_pct: float = 100.0
    local_currency: str
    fx_rate_to_reporting: float = 1.0

class ConsolidatedFinancials(BaseModel):
    group_id: str
    group_name: str
    reporting_currency: str
    period: str
    total_revenue: float = 0.0
    total_expenses: float = 0.0
    total_ebitda: float = 0.0
    total_cash: float = 0.0
    total_ar: float = 0.0
    total_ap: float = 0.0
    entity_breakdown: List[Dict[str, Any]] = []
    fx_rates_used: Dict[str, float] = {}
    consolidated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# User Preferences Models
class UserPreferences(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    primary_color: str = "#1e3a5f"
    secondary_color: str = "#d4af37"
    background_color: str = "#0a1929"
    text_color: str = "#ffffff"
    enabled_kpis: List[str] = ["revenue", "ebitda", "cash_balance", "runway"]
    mock_data_enabled: bool = True

class UserPreferencesUpdate(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    background_color: Optional[str] = None
    text_color: Optional[str] = None
    enabled_kpis: Optional[List[str]] = None
    mock_data_enabled: Optional[bool] = None

# ======================= RAG POLICY & ENTITY ADJUSTMENTS MODELS =======================

class RAGThreshold(BaseModel):
    """Single metric RAG threshold configuration"""
    green_min: Optional[float] = None  # Minimum value for green
    green_max: Optional[float] = None  # Maximum value for green (for metrics where lower is better)
    amber_min: Optional[float] = None  # Minimum value for amber
    amber_max: Optional[float] = None  # Maximum value for amber
    is_higher_better: bool = True  # True for metrics like revenue, False for DSO

class RAGMetricConfig(BaseModel):
    """Full configuration for a single RAG metric"""
    metric_id: str
    metric_name: str
    thresholds: RAGThreshold
    enabled: bool = True
    notes: Optional[str] = None

# Default RAG thresholds for common financial metrics
DEFAULT_RAG_METRICS = {
    "dso": {"metric_name": "Days Sales Outstanding (DSO)", "thresholds": {"green_max": 30, "amber_max": 45, "is_higher_better": False}},
    "dpo": {"metric_name": "Days Payable Outstanding (DPO)", "thresholds": {"green_min": 30, "amber_min": 20, "is_higher_better": True}},
    "cash_runway": {"metric_name": "Cash Runway (Days)", "thresholds": {"green_min": 180, "amber_min": 90, "is_higher_better": True}},
    "ebitda_margin": {"metric_name": "EBITDA Margin (%)", "thresholds": {"green_min": 20, "amber_min": 10, "is_higher_better": True}},
    "gross_margin": {"metric_name": "Gross Margin (%)", "thresholds": {"green_min": 60, "amber_min": 40, "is_higher_better": True}},
    "current_ratio": {"metric_name": "Current Ratio", "thresholds": {"green_min": 2.0, "amber_min": 1.5, "is_higher_better": True}},
    "quick_ratio": {"metric_name": "Quick Ratio", "thresholds": {"green_min": 1.5, "amber_min": 1.0, "is_higher_better": True}},
    "revenue_growth": {"metric_name": "Revenue Growth (%)", "thresholds": {"green_min": 15, "amber_min": 5, "is_higher_better": True}},
    "debt_to_equity": {"metric_name": "Debt to Equity Ratio", "thresholds": {"green_max": 1.0, "amber_max": 2.0, "is_higher_better": False}},
    "interest_coverage": {"metric_name": "Interest Coverage Ratio", "thresholds": {"green_min": 3.0, "amber_min": 1.5, "is_higher_better": True}},
    "working_capital_ratio": {"metric_name": "Working Capital Ratio", "thresholds": {"green_min": 1.2, "amber_min": 1.0, "is_higher_better": True}},
    "ar_turnover": {"metric_name": "AR Turnover", "thresholds": {"green_min": 12, "amber_min": 8, "is_higher_better": True}},
    "ap_turnover": {"metric_name": "AP Turnover", "thresholds": {"green_min": 8, "amber_min": 6, "is_higher_better": True}},
    "inventory_turnover": {"metric_name": "Inventory Turnover", "thresholds": {"green_min": 6, "amber_min": 4, "is_higher_better": True}},
    "burn_rate": {"metric_name": "Monthly Burn Rate", "thresholds": {"green_max": 50000, "amber_max": 100000, "is_higher_better": False}}
}

class RAGPolicyCreate(BaseModel):
    company_id: str
    metrics: Dict[str, RAGMetricConfig] = {}

class RAGPolicy(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    metrics: Dict[str, Dict[str, Any]] = {}  # metric_id -> RAGMetricConfig dict
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class RAGPolicyUpdate(BaseModel):
    metrics: Optional[Dict[str, Dict[str, Any]]] = None

# Entity Adjustment Types
class AdjustmentType(str, Enum):
    CURRENCY_TRANSLATION = "currency_translation"  # FX translation method
    REVENUE_RECOGNITION = "revenue_recognition"  # Revenue recognition policy
    DEPRECIATION = "depreciation"  # Depreciation method
    INVENTORY_VALUATION = "inventory_valuation"  # Inventory valuation method
    CONSOLIDATION = "consolidation"  # Consolidation method
    INTERCOMPANY = "intercompany"  # Intercompany elimination rules
    TAX_TREATMENT = "tax_treatment"  # Local tax treatment
    CUSTOM = "custom"  # Custom adjustment

class EntityAdjustmentConfig(BaseModel):
    adjustment_type: AdjustmentType
    name: str
    description: Optional[str] = None
    parameters: Dict[str, Any] = {}  # Flexible parameters based on type
    is_active: bool = True

class EntityAdjustmentCreate(BaseModel):
    company_id: str
    adjustment_type: AdjustmentType
    name: str
    description: Optional[str] = None
    parameters: Dict[str, Any] = {}

class EntityAdjustment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    adjustment_type: AdjustmentType
    name: str
    description: Optional[str] = None
    parameters: Dict[str, Any] = {}
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class EntityAdjustmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    parameters: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

# Chat Session Models
class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: Optional[str] = None
    messages: List[ChatMessage] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatSessionCreate(BaseModel):
    company_id: Optional[str] = None

class ChatMessageCreate(BaseModel):
    content: str

# ======================= HELPER FUNCTIONS =======================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    expiration = datetime.now(timezone.utc) + timedelta(days=JWT_EXPIRATION_DAYS)
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": expiration
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

def serialize_datetime(obj):
    if isinstance(obj, datetime):
        return obj.isoformat()
    return obj

def serialize_doc(doc):
    if doc is None:
        return None
    for key, value in doc.items():
        if isinstance(value, datetime):
            doc[key] = value.isoformat()
    return doc

# ======================= AUTH ROUTES =======================

@api_router.post("/auth/register", response_model=AuthResponse)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        role=UserRole.ADMIN  # First user is admin
    )
    
    # Store user with hashed password
    user_dict = user.model_dump()
    user_dict['password_hash'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Create default preferences
    prefs = UserPreferences(user_id=user.id)
    prefs_dict = prefs.model_dump()
    await db.user_preferences.insert_one(prefs_dict)
    
    # Generate token
    token = create_token(user.id, user.email)
    
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role.value,
            ai_advisor_access=user.ai_advisor_access
        )
    )

@api_router.post("/auth/login", response_model=AuthResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'], user['email'])
    
    return AuthResponse(
        token=token,
        user=UserResponse(
            id=user['id'],
            email=user['email'],
            name=user['name'],
            role=user.get('role', 'tenant'),
            ai_advisor_access=user.get('ai_advisor_access', True)
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=current_user['id'],
        email=current_user['email'],
        name=current_user['name'],
        role=current_user.get('role', 'tenant'),
        ai_advisor_access=current_user.get('ai_advisor_access', True)
    )

# ======================= COMPANY ROUTES (NOW USING ENTITY_TREE) =======================
# These routes maintain backward compatibility while using entity_tree as the source

def entity_to_company_format(entity: dict) -> dict:
    """Convert entity_tree node to legacy company format for backward compatibility"""
    entity_type = entity.get('entity_type', 'standalone')
    company_type_map = {
        'standalone': 'Standalone',
        'holdco': 'TopCo',
        'subsidiary': 'Subsidiary'
    }
    return {
        "id": entity.get('id'),
        "user_id": entity.get('user_id'),
        "name": entity.get('name'),
        "country": entity.get('country', 'United Kingdom'),
        "country_code": entity.get('country_code', 'GBR'),
        "currency": entity.get('local_currency', 'GBP'),
        "global_region": entity.get('region'),
        "company_type": company_type_map.get(entity_type, 'Standalone'),
        "parent_company_id": entity.get('parent_entity_id'),
        "reporting_currency": entity.get('reporting_currency'),
        "created_at": entity.get('created_at'),
        # Extended fields from entity_tree
        "entity_code": entity.get('entity_code'),
        "entity_type": entity_type,
        "ownership_pct": entity.get('ownership_pct', 100.0),
        "segment": entity.get('segment'),
        "erp_provider": entity.get('erp_provider'),
        "erp_connection_status": entity.get('erp_connection_status'),
        "data_health_pct": entity.get('data_health_pct', 0.0),
        "is_active": entity.get('is_active', True)
    }

@api_router.post("/companies")
async def create_company(company_data: CompanyCreate, current_user: dict = Depends(get_current_user)):
    """Create a company (now creates in entity_tree)"""
    # Map company_type to entity_type
    company_type = company_data.company_type.value if hasattr(company_data.company_type, 'value') else str(company_data.company_type)
    entity_type_map = {
        'Standalone': 'standalone',
        'TopCo': 'holdco',
        'Subsidiary': 'subsidiary'
    }
    entity_type = entity_type_map.get(company_type, 'standalone')
    
    # Generate entity code
    entity_code = company_data.name.upper().replace(' ', '-')[:15] + '-' + str(uuid.uuid4())[:4].upper()
    
    entity_node = {
        "id": str(uuid.uuid4()),
        "user_id": current_user['id'],
        "name": company_data.name,
        "entity_code": entity_code,
        "entity_type": entity_type,
        "parent_entity_id": company_data.parent_company_id,
        "ownership_pct": 100.0,
        "country": company_data.country,
        "country_code": company_data.country_code,
        "local_currency": company_data.currency,
        "reporting_currency": company_data.reporting_currency or "USD",
        "segment": None,
        "region": company_data.global_region,
        "fiscal_year_end": "December",
        "consolidation_method": "Full",
        "is_active": True,
        "erp_provider": None,
        "erp_connection_status": "disconnected",
        "erp_credentials": None,
        "last_sync_at": None,
        "data_health_pct": 0.0,
        "missing_mappings": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": None
    }
    
    await db.entity_tree.insert_one(entity_node)
    
    return entity_to_company_format(entity_node)

@api_router.get("/companies")
async def get_companies(current_user: dict = Depends(get_current_user)):
    """Get all companies (now from entity_tree)"""
    entities = await db.entity_tree.find(
        {"user_id": current_user['id'], "is_active": True}, 
        {"_id": 0}
    ).sort("name", 1).to_list(500)
    
    return [entity_to_company_format(e) for e in entities]

@api_router.get("/companies/{company_id}")
async def get_company(company_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single company (now from entity_tree)"""
    entity = await db.entity_tree.find_one(
        {"id": company_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not entity:
        raise HTTPException(status_code=404, detail="Company not found")
    
    return entity_to_company_format(entity)

@api_router.put("/companies/{company_id}")
async def update_company(company_id: str, company_data: dict, current_user: dict = Depends(get_current_user)):
    """Update a company (now updates entity_tree)"""
    entity = await db.entity_tree.find_one({
        "id": company_id,
        "user_id": current_user['id']
    })
    if not entity:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Map company fields to entity fields
    update_data = {}
    if 'name' in company_data:
        update_data['name'] = company_data['name']
    if 'country' in company_data:
        update_data['country'] = company_data['country']
    if 'country_code' in company_data:
        update_data['country_code'] = company_data['country_code']
    if 'currency' in company_data:
        update_data['local_currency'] = company_data['currency']
    if 'global_region' in company_data:
        update_data['region'] = company_data['global_region']
    if 'company_type' in company_data:
        entity_type_map = {'Standalone': 'standalone', 'TopCo': 'holdco', 'Subsidiary': 'subsidiary'}
        update_data['entity_type'] = entity_type_map.get(company_data['company_type'], 'standalone')
    if 'parent_company_id' in company_data:
        update_data['parent_entity_id'] = company_data['parent_company_id']
    if 'reporting_currency' in company_data:
        update_data['reporting_currency'] = company_data['reporting_currency']
    
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        await db.entity_tree.update_one({"id": company_id}, {"$set": update_data})
    
    updated_entity = await db.entity_tree.find_one({"id": company_id}, {"_id": 0})
    return entity_to_company_format(updated_entity)

@api_router.delete("/companies/{company_id}")
async def delete_company(company_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a company (soft delete in entity_tree)"""
    entity = await db.entity_tree.find_one({
        "id": company_id,
        "user_id": current_user['id']
    })
    if not entity:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Soft delete
    await db.entity_tree.update_one(
        {"id": company_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Also delete related transactions
    await db.transactions.delete_many({"company_id": company_id})
    
    return {"message": "Company deleted"}

# ======================= TRANSACTION ROUTES =======================

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(tx_data: TransactionCreate, current_user: dict = Depends(get_current_user)):
    # Verify entity ownership (now using entity_tree)
    entity = await db.entity_tree.find_one({"id": tx_data.company_id, "user_id": current_user['id']})
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    tx_dict_data = tx_data.model_dump()
    
    # Auto-populate currency fields from entity if not provided
    if not tx_dict_data.get('transaction_currency'):
        tx_dict_data['transaction_currency'] = entity.get('local_currency', 'GBP')
    if not tx_dict_data.get('reporting_currency'):
        tx_dict_data['reporting_currency'] = entity.get('reporting_currency') or entity.get('local_currency', 'GBP')
    
    # If same currency, reporting_amount equals amount
    if tx_dict_data['transaction_currency'] == tx_dict_data['reporting_currency']:
        tx_dict_data['reporting_amount'] = tx_dict_data['amount']
        tx_dict_data['fx_rate'] = 1.0
    elif not tx_dict_data.get('reporting_amount'):
        # For different currencies without provided conversion, use 1:1 as placeholder
        # Real implementation would fetch live FX rates
        tx_dict_data['reporting_amount'] = tx_dict_data['amount']
        tx_dict_data['fx_rate'] = 1.0
    
    tx = Transaction(**tx_dict_data)
    
    tx_dict = tx.model_dump()
    tx_dict['date'] = tx_dict['date'].isoformat()
    tx_dict['created_at'] = tx_dict['created_at'].isoformat()
    
    await db.transactions.insert_one(tx_dict)
    return tx

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    company_id: Optional[str] = None,
    type: Optional[str] = None,
    category: Optional[str] = None,
    source: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Get user's entities (now using entity_tree)
    entities = await db.entity_tree.find(
        {"user_id": current_user['id'], "is_active": True},
        {"id": 1}
    ).to_list(500)
    entity_ids = [e['id'] for e in entities]
    
    query = {"company_id": {"$in": entity_ids}}
    
    if company_id:
        query["company_id"] = company_id
    if type:
        query["type"] = type
    if category:
        query["category"] = category
    if source:
        query["source"] = source
    if status:
        query["status"] = status
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("date", -1).to_list(500)
    
    for tx in transactions:
        if isinstance(tx.get('date'), str):
            tx['date'] = datetime.fromisoformat(tx['date'])
        if isinstance(tx.get('created_at'), str):
            tx['created_at'] = datetime.fromisoformat(tx['created_at'])
    
    return transactions

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, current_user: dict = Depends(get_current_user)):
    # Get user's companies
    companies = await db.entity_tree.find(
        {"user_id": current_user['id']},
        {"id": 1}
    ).to_list(100)
    company_ids = [c['id'] for c in companies]
    
    result = await db.transactions.delete_one({
        "id": transaction_id,
        "company_id": {"$in": company_ids}
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    return {"message": "Transaction deleted"}

@api_router.delete("/transactions")
async def delete_all_transactions(company_id: str, current_user: dict = Depends(get_current_user)):
    # Verify company ownership
    company = await db.entity_tree.find_one({"id": company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    await db.transactions.delete_many({"company_id": company_id})
    return {"message": "All transactions deleted"}

# ======================= DASHBOARD ROUTES =======================

@api_router.get("/dashboard/{company_id}", response_model=DashboardMetrics)
async def get_dashboard(company_id: str, current_user: dict = Depends(get_current_user)):
    # Verify company ownership
    company = await db.entity_tree.find_one({"id": company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get transactions for this company
    transactions = await db.transactions.find(
        {"company_id": company_id},
        {"_id": 0}
    ).to_list(1000)
    
    if not transactions:
        return DashboardMetrics()
    
    # Calculate metrics
    revenue = sum(tx['amount'] for tx in transactions if tx['amount'] > 0 and tx.get('category') == 'Sales')
    expenses = abs(sum(tx['amount'] for tx in transactions if tx['amount'] < 0))
    ebitda = revenue - expenses
    ebitda_margin = (ebitda / revenue * 100) if revenue > 0 else 0
    
    # Cash balance (simplified: sum of bank transactions)
    cash_balance = sum(tx['amount'] for tx in transactions if tx.get('type') == 'Bank Transaction')
    if cash_balance == 0:
        cash_balance = revenue - expenses
    
    # Burn rate and runway
    monthly_expenses = expenses / 12 if expenses > 0 else 1
    burn_rate = monthly_expenses
    runway_days = int((cash_balance / (burn_rate / 30)) if burn_rate > 0 else 365)
    
    # Quick ratio (simplified)
    current_assets = max(cash_balance, 0) + sum(tx['amount'] for tx in transactions if tx['amount'] > 0 and tx.get('status') == 'Pending')
    current_liabilities = abs(sum(tx['amount'] for tx in transactions if tx['amount'] < 0 and tx.get('status') == 'Pending'))
    quick_ratio = current_assets / current_liabilities if current_liabilities > 0 else 2.0
    
    # Reconciliation counts
    matched_count = len([tx for tx in transactions if tx.get('status') == 'Matched'])
    pending_count = len([tx for tx in transactions if tx.get('status') == 'Pending'])
    unmatched_count = len([tx for tx in transactions if tx.get('status') == 'Unmatched'])
    
    # AR Aging (simplified based on pending invoices)
    ar_current = sum(tx['amount'] for tx in transactions if tx.get('type') == 'Invoice' and tx.get('status') == 'Pending' and tx['amount'] > 0) * 0.4
    ar_30_days = sum(tx['amount'] for tx in transactions if tx.get('type') == 'Invoice' and tx.get('status') == 'Pending' and tx['amount'] > 0) * 0.3
    ar_60_days = sum(tx['amount'] for tx in transactions if tx.get('type') == 'Invoice' and tx.get('status') == 'Pending' and tx['amount'] > 0) * 0.2
    ar_90_plus_days = sum(tx['amount'] for tx in transactions if tx.get('type') == 'Invoice' and tx.get('status') == 'Pending' and tx['amount'] > 0) * 0.1
    
    # Cost centers
    cost_center_amounts = {}
    for tx in transactions:
        if tx['amount'] < 0:
            cat = tx.get('category', 'Other')
            cost_center_amounts[cat] = cost_center_amounts.get(cat, 0) + abs(tx['amount'])
    
    cost_centers = [{"name": k, "amount": v} for k, v in sorted(cost_center_amounts.items(), key=lambda x: x[1], reverse=True)]
    
    return DashboardMetrics(
        revenue=round(revenue, 2),
        ebitda=round(ebitda, 2),
        ebitda_margin=round(ebitda_margin, 2),
        cash_balance=round(cash_balance, 2),
        runway_days=max(runway_days, 0),
        burn_rate=round(burn_rate, 2),
        quick_ratio=round(min(quick_ratio, 10.0), 2),
        revenue_growth=round(random.uniform(5, 25), 2),  # Simplified
        ar_current=round(ar_current, 2),
        ar_30_days=round(ar_30_days, 2),
        ar_60_days=round(ar_60_days, 2),
        ar_90_plus_days=round(ar_90_plus_days, 2),
        matched_count=matched_count,
        pending_count=pending_count,
        unmatched_count=unmatched_count,
        transaction_count=len(transactions),
        cost_centers=cost_centers[:5]
    )

@api_router.get("/dashboard/group/summary")
async def get_group_summary(current_user: dict = Depends(get_current_user)):
    companies = await db.entity_tree.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).to_list(100)
    
    total_revenue = 0
    total_ebitda = 0
    total_cash = 0
    
    for company in companies:
        transactions = await db.transactions.find(
            {"company_id": company['id']},
            {"_id": 0}
        ).to_list(1000)
        
        revenue = sum(tx['amount'] for tx in transactions if tx['amount'] > 0 and tx.get('category') == 'Sales')
        expenses = abs(sum(tx['amount'] for tx in transactions if tx['amount'] < 0))
        cash = sum(tx['amount'] for tx in transactions if tx.get('type') == 'Bank Transaction')
        if cash == 0:
            cash = revenue - expenses
        
        total_revenue += revenue
        total_ebitda += (revenue - expenses)
        total_cash += cash
    
    group_margin = (total_ebitda / total_revenue * 100) if total_revenue > 0 else 0
    
    return {
        "total_revenue": round(total_revenue, 2),
        "total_ebitda": round(total_ebitda, 2),
        "group_margin": round(group_margin, 2),
        "total_cash": round(total_cash, 2),
        "entity_count": len(companies)
    }

# ======================= RECONCILIATION ROUTES =======================

@api_router.post("/reconciliation/auto-match", response_model=ReconciliationResult)
async def auto_reconcile(company_id: str, current_user: dict = Depends(get_current_user)):
    # Verify company ownership
    company = await db.entity_tree.find_one({"id": company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Get pending transactions
    pending = await db.transactions.find(
        {"company_id": company_id, "status": "Pending"},
        {"_id": 0}
    ).to_list(500)
    
    # Auto-match logic (simplified: match 60-80% of pending)
    match_count = int(len(pending) * random.uniform(0.6, 0.8))
    
    for i, tx in enumerate(pending[:match_count]):
        await db.transactions.update_one(
            {"id": tx['id']},
            {"$set": {"status": "Matched"}}
        )
    
    # Get updated counts
    matched = await db.transactions.count_documents({"company_id": company_id, "status": "Matched"})
    pending_count = await db.transactions.count_documents({"company_id": company_id, "status": "Pending"})
    unmatched = await db.transactions.count_documents({"company_id": company_id, "status": "Unmatched"})
    
    return ReconciliationResult(
        matched_count=matched,
        pending_count=pending_count,
        unmatched_count=unmatched,
        newly_matched=match_count
    )

@api_router.get("/reconciliation/status/{company_id}")
async def get_reconciliation_status(company_id: str, current_user: dict = Depends(get_current_user)):
    # Verify company ownership
    company = await db.entity_tree.find_one({"id": company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    matched = await db.transactions.count_documents({"company_id": company_id, "status": "Matched"})
    pending = await db.transactions.count_documents({"company_id": company_id, "status": "Pending"})
    unmatched = await db.transactions.count_documents({"company_id": company_id, "status": "Unmatched"})
    
    return {
        "matched_count": matched,
        "pending_count": pending,
        "unmatched_count": unmatched
    }

# ======================= FINANCE SOURCING ROUTES =======================

@api_router.get("/finance-sourcing", response_model=List[FinanceOption])
async def get_finance_options(current_user: dict = Depends(get_current_user)):
    # Return mock finance options
    options = [
        FinanceOption(
            type="Term Loan",
            provider="Barclays Business",
            interest_rate=6.5,
            amount_min=25000,
            amount_max=500000,
            eligibility="2+ years trading, £100k+ revenue",
            source_url="https://www.barclays.co.uk/business-banking/borrow/"
        ),
        FinanceOption(
            type="Credit Line",
            provider="HSBC UK",
            interest_rate=7.2,
            amount_min=10000,
            amount_max=250000,
            eligibility="1+ year trading, good credit history",
            source_url="https://www.business.hsbc.uk/en-gb/finance-and-borrowing"
        ),
        FinanceOption(
            type="Invoice Finance",
            provider="Funding Circle",
            interest_rate=5.9,
            amount_min=5000,
            amount_max=150000,
            eligibility="B2B invoices, UK registered",
            source_url="https://www.fundingcircle.com/uk/"
        ),
        FinanceOption(
            type="Growth Grant",
            provider="Innovate UK",
            interest_rate=0.0,
            amount_min=25000,
            amount_max=500000,
            eligibility="Innovation-focused, R&D activity",
            source_url="https://www.ukri.org/councils/innovate-uk/"
        ),
        FinanceOption(
            type="Asset Finance",
            provider="Lloyds Bank",
            interest_rate=5.5,
            amount_min=10000,
            amount_max=1000000,
            eligibility="Equipment/vehicle purchase",
            source_url="https://www.lloydsbank.com/business/loans-and-finance.html"
        ),
        FinanceOption(
            type="Revenue Based",
            provider="Clearco",
            interest_rate=8.0,
            amount_min=10000,
            amount_max=2000000,
            eligibility="eCommerce, SaaS businesses",
            source_url="https://clear.co/"
        )
    ]
    return options

# ======================= INTEGRATION ROUTES =======================

@api_router.get("/integrations")
async def get_integrations(current_user: dict = Depends(get_current_user)):
    integrations = await db.integrations.find(
        {"user_id": current_user['id']},
        {"_id": 0, "client_secret": 0, "api_key": 0, "access_token": 0, "refresh_token": 0}
    ).to_list(50)
    
    for i in integrations:
        if isinstance(i.get('created_at'), str):
            i['created_at'] = datetime.fromisoformat(i['created_at'])
        if isinstance(i.get('last_sync'), str) and i.get('last_sync'):
            i['last_sync'] = datetime.fromisoformat(i['last_sync'])
    
    return integrations

@api_router.post("/integrations")
async def create_integration(data: IntegrationCreate, current_user: dict = Depends(get_current_user)):
    # Check if integration already exists
    existing = await db.integrations.find_one({
        "user_id": current_user['id'],
        "platform": data.platform
    })
    
    if existing:
        # Update existing
        await db.integrations.update_one(
            {"id": existing['id']},
            {"$set": {
                "client_id": data.client_id,
                "client_secret": data.client_secret,
                "api_key": data.api_key,
                "status": "connected",
                "last_sync": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "Integration updated", "id": existing['id']}
    
    integration = Integration(
        user_id=current_user['id'],
        platform=data.platform,
        client_id=data.client_id,
        client_secret=data.client_secret,
        api_key=data.api_key,
        status="connected"
    )
    
    int_dict = integration.model_dump()
    int_dict['created_at'] = int_dict['created_at'].isoformat()
    
    await db.integrations.insert_one(int_dict)
    return {"message": "Integration created", "id": integration.id}

@api_router.delete("/integrations/{integration_id}")
async def delete_integration(integration_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.integrations.delete_one({
        "id": integration_id,
        "user_id": current_user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    return {"message": "Integration deleted"}

@api_router.post("/integrations/{integration_id}/sync")
async def sync_integration(integration_id: str, current_user: dict = Depends(get_current_user)):
    integration = await db.integrations.find_one({
        "id": integration_id,
        "user_id": current_user['id']
    })
    
    if not integration:
        raise HTTPException(status_code=404, detail="Integration not found")
    
    # Update last sync time
    await db.integrations.update_one(
        {"id": integration_id},
        {"$set": {"last_sync": datetime.now(timezone.utc).isoformat(), "status": "connected"}}
    )
    
    return {"message": "Sync completed", "last_sync": datetime.now(timezone.utc).isoformat()}

# ======================= ENTITY GROUP ROUTES =======================

@api_router.post("/entity-groups", response_model=EntityGroup)
async def create_entity_group(data: EntityGroupCreate, current_user: dict = Depends(get_current_user)):
    group = EntityGroup(
        user_id=current_user['id'],
        **data.model_dump()
    )
    
    group_dict = group.model_dump()
    group_dict['created_at'] = group_dict['created_at'].isoformat()
    
    await db.entity_groups.insert_one(group_dict)
    return group

@api_router.get("/entity-groups", response_model=List[EntityGroup])
async def get_entity_groups(current_user: dict = Depends(get_current_user)):
    groups = await db.entity_groups.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).to_list(50)
    
    for g in groups:
        if isinstance(g.get('created_at'), str):
            g['created_at'] = datetime.fromisoformat(g['created_at'])
    
    return groups

@api_router.delete("/entity-groups/{group_id}")
async def delete_entity_group(group_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.entity_groups.delete_one({
        "id": group_id,
        "user_id": current_user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Group not found")
    
    return {"message": "Group deleted"}

# ======================= FP&A ROUTES =======================

# Planning Versions - Full CRUD
@api_router.post("/fpa/versions", response_model=PlanningVersion)
async def create_planning_version(data: PlanningVersionCreate, current_user: dict = Depends(get_current_user)):
    # Verify company ownership
    company = await db.entity_tree.find_one({"id": data.company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    version = PlanningVersion(
        user_id=current_user['id'],
        **data.model_dump()
    )
    
    version_dict = version.model_dump()
    version_dict['created_at'] = version_dict['created_at'].isoformat()
    
    await db.planning_versions.insert_one(version_dict)
    return version

@api_router.get("/fpa/versions", response_model=List[PlanningVersion])
async def get_planning_versions(
    company_id: Optional[str] = None,
    version_type: Optional[str] = None,
    fiscal_year: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user['id']}
    if company_id:
        query["company_id"] = company_id
    if version_type:
        query["version_type"] = version_type
    if fiscal_year:
        query["fiscal_year"] = fiscal_year
    
    versions = await db.planning_versions.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for v in versions:
        if isinstance(v.get('created_at'), str):
            v['created_at'] = datetime.fromisoformat(v['created_at'])
    
    return versions

@api_router.get("/fpa/versions/{version_id}")
async def get_planning_version(version_id: str, current_user: dict = Depends(get_current_user)):
    version = await db.planning_versions.find_one(
        {"id": version_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if isinstance(version.get('created_at'), str):
        version['created_at'] = datetime.fromisoformat(version['created_at'])
    
    return version

@api_router.put("/fpa/versions/{version_id}")
async def update_planning_version(version_id: str, data: PlanningVersionUpdate, current_user: dict = Depends(get_current_user)):
    version = await db.planning_versions.find_one({
        "id": version_id,
        "user_id": current_user['id']
    })
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.get('is_locked', False):
        raise HTTPException(status_code=400, detail="Cannot update a locked version")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.planning_versions.update_one(
        {"id": version_id},
        {"$set": update_data}
    )
    
    return {"message": "Version updated", "id": version_id}

@api_router.put("/fpa/versions/{version_id}/lock")
async def toggle_version_lock(version_id: str, current_user: dict = Depends(get_current_user)):
    version = await db.planning_versions.find_one({
        "id": version_id,
        "user_id": current_user['id']
    })
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    new_lock_state = not version.get('is_locked', False)
    await db.planning_versions.update_one(
        {"id": version_id},
        {"$set": {"is_locked": new_lock_state, "locked_at": datetime.now(timezone.utc).isoformat() if new_lock_state else None}}
    )
    
    return {"message": f"Version {'locked' if new_lock_state else 'unlocked'}", "is_locked": new_lock_state}

@api_router.post("/fpa/versions/{version_id}/copy")
async def copy_planning_version(version_id: str, new_name: str, current_user: dict = Depends(get_current_user)):
    """Create a copy of an existing planning version"""
    original = await db.planning_versions.find_one({
        "id": version_id,
        "user_id": current_user['id']
    }, {"_id": 0})
    
    if not original:
        raise HTTPException(status_code=404, detail="Version not found")
    
    # Create new version based on original
    new_version = PlanningVersion(
        user_id=current_user['id'],
        company_id=original['company_id'],
        name=new_name,
        version_type=original['version_type'],
        fiscal_year=original['fiscal_year'],
        start_period=original['start_period'],
        end_period=original['end_period'],
        is_rolling=original.get('is_rolling', False),
        rolling_months=original.get('rolling_months', 12),
        is_locked=False
    )
    
    version_dict = new_version.model_dump()
    version_dict['created_at'] = version_dict['created_at'].isoformat()
    version_dict['copied_from'] = version_id
    
    await db.planning_versions.insert_one(version_dict)
    
    return {"message": "Version copied", "new_id": new_version.id}

@api_router.delete("/fpa/versions/{version_id}")
async def delete_planning_version(version_id: str, current_user: dict = Depends(get_current_user)):
    version = await db.planning_versions.find_one({
        "id": version_id,
        "user_id": current_user['id']
    })
    
    if not version:
        raise HTTPException(status_code=404, detail="Version not found")
    
    if version.get('is_locked', False):
        raise HTTPException(status_code=400, detail="Cannot delete a locked version")
    
    await db.planning_versions.delete_one({"id": version_id})
    
    return {"message": "Version deleted"}

# Drivers - Full CRUD
@api_router.post("/fpa/drivers", response_model=Driver)
async def create_driver(data: DriverCreate, current_user: dict = Depends(get_current_user)):
    # Check for duplicate driver name
    existing = await db.drivers.find_one({
        "user_id": current_user['id'],
        "name": data.name
    })
    if existing:
        raise HTTPException(status_code=400, detail="Driver with this name already exists")
    
    driver = Driver(
        user_id=current_user['id'],
        **data.model_dump()
    )
    
    driver_dict = driver.model_dump()
    driver_dict['created_at'] = driver_dict['created_at'].isoformat()
    
    await db.drivers.insert_one(driver_dict)
    return driver

@api_router.get("/fpa/drivers", response_model=List[Driver])
async def get_drivers(
    driver_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user['id']}
    if driver_type:
        query["driver_type"] = driver_type
    
    drivers = await db.drivers.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    for d in drivers:
        if isinstance(d.get('created_at'), str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
    
    return drivers

@api_router.get("/fpa/drivers/{driver_id}")
async def get_driver(driver_id: str, current_user: dict = Depends(get_current_user)):
    driver = await db.drivers.find_one(
        {"id": driver_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    if isinstance(driver.get('created_at'), str):
        driver['created_at'] = datetime.fromisoformat(driver['created_at'])
    
    return driver

@api_router.put("/fpa/drivers/{driver_id}")
async def update_driver(driver_id: str, data: DriverUpdate, current_user: dict = Depends(get_current_user)):
    driver = await db.drivers.find_one({
        "id": driver_id,
        "user_id": current_user['id']
    })
    
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # Check for duplicate name if name is being updated
    if 'name' in update_data and update_data['name'] != driver.get('name'):
        existing = await db.drivers.find_one({
            "user_id": current_user['id'],
            "name": update_data['name'],
            "id": {"$ne": driver_id}
        })
        if existing:
            raise HTTPException(status_code=400, detail="Driver with this name already exists")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.drivers.update_one(
        {"id": driver_id},
        {"$set": update_data}
    )
    
    return {"message": "Driver updated", "id": driver_id}

@api_router.delete("/fpa/drivers/{driver_id}")
async def delete_driver(driver_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.drivers.delete_one({
        "id": driver_id,
        "user_id": current_user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    return {"message": "Driver deleted"}

@api_router.get("/fpa/driver-types")
async def get_driver_types():
    """Get available driver types"""
    return {
        "driver_types": [
            {"value": "Revenue", "label": "Revenue Driver", "description": "Drivers that impact revenue"},
            {"value": "Cost", "label": "Cost Driver", "description": "Drivers that impact costs"},
            {"value": "Operational", "label": "Operational Driver", "description": "Operational metrics"},
            {"value": "Headcount", "label": "Headcount Driver", "description": "Employee-related drivers"},
            {"value": "Volume", "label": "Volume Driver", "description": "Volume-based drivers"},
            {"value": "Price", "label": "Price Driver", "description": "Pricing-related drivers"}
        ]
    }

# FP&A Overview Stats
@api_router.get("/fpa/overview")
async def get_fpa_overview(current_user: dict = Depends(get_current_user)):
    versions_count = await db.planning_versions.count_documents({"user_id": current_user['id']})
    drivers_count = await db.drivers.count_documents({"user_id": current_user['id']})
    integrations_count = await db.integrations.count_documents({"user_id": current_user['id'], "status": "connected"})
    companies_count = await db.entity_tree.count_documents({"user_id": current_user['id']})
    
    # Get recent versions
    recent_versions = await db.planning_versions.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "planning_dimensions": companies_count * 7,  # 7 dimensions per entity
        "planning_versions": versions_count,
        "drivers_count": drivers_count,
        "integrations_count": integrations_count,
        "entities_count": companies_count,
        "recent_versions": recent_versions
    }

# ======================= LOAN COVENANT MONITORING ROUTES =======================

# Loans CRUD
@api_router.post("/loans")
async def create_loan(data: LoanCreate, current_user: dict = Depends(get_current_user)):
    # Verify company ownership
    company = await db.entity_tree.find_one({"id": data.company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    loan = Loan(
        user_id=current_user['id'],
        outstanding_balance=data.principal_amount,  # Initial balance = principal
        **data.model_dump()
    )
    
    loan_dict = loan.model_dump()
    loan_dict['start_date'] = loan_dict['start_date'].isoformat()
    loan_dict['maturity_date'] = loan_dict['maturity_date'].isoformat()
    loan_dict['created_at'] = loan_dict['created_at'].isoformat()
    
    await db.loans.insert_one(loan_dict)
    
    # Remove _id before returning
    loan_dict.pop('_id', None)
    
    return {"message": "Loan created", "id": loan.id, "loan": loan_dict}

@api_router.get("/loans")
async def get_loans(
    company_id: Optional[str] = None,
    is_active: Optional[bool] = True,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user['id']}
    if company_id:
        query["company_id"] = company_id
    if is_active is not None:
        query["is_active"] = is_active
    
    loans = await db.loans.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    
    # Parse dates
    for loan in loans:
        for date_field in ['start_date', 'maturity_date', 'created_at']:
            if isinstance(loan.get(date_field), str):
                loan[date_field] = datetime.fromisoformat(loan[date_field])
    
    return loans

@api_router.get("/loans/{loan_id}")
async def get_loan(loan_id: str, current_user: dict = Depends(get_current_user)):
    loan = await db.loans.find_one(
        {"id": loan_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    # Get associated covenants
    covenants = await db.covenants.find(
        {"loan_id": loan_id, "user_id": current_user['id']},
        {"_id": 0}
    ).to_list(50)
    
    loan['covenants'] = covenants
    return loan

@api_router.put("/loans/{loan_id}")
async def update_loan(loan_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    loan = await db.loans.find_one({
        "id": loan_id,
        "user_id": current_user['id']
    })
    
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    allowed_fields = ['outstanding_balance', 'interest_rate', 'notes', 'is_active']
    update_data = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid data to update")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.loans.update_one({"id": loan_id}, {"$set": update_data})
    
    return {"message": "Loan updated", "id": loan_id}

@api_router.delete("/loans/{loan_id}")
async def delete_loan(loan_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.loans.delete_one({
        "id": loan_id,
        "user_id": current_user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    # Also delete associated covenants
    await db.covenants.delete_many({"loan_id": loan_id})
    
    return {"message": "Loan and associated covenants deleted"}

# Covenants CRUD
@api_router.post("/covenants")
async def create_covenant(data: CovenantCreate, current_user: dict = Depends(get_current_user)):
    # Verify loan ownership
    loan = await db.loans.find_one({"id": data.loan_id, "user_id": current_user['id']})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    # Verify company ownership
    company = await db.entity_tree.find_one({"id": data.company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    covenant = Covenant(
        user_id=current_user['id'],
        **data.model_dump()
    )
    
    covenant_dict = covenant.model_dump()
    covenant_dict['created_at'] = covenant_dict['created_at'].isoformat()
    if covenant_dict.get('last_measured_at'):
        covenant_dict['last_measured_at'] = covenant_dict['last_measured_at'].isoformat()
    
    await db.covenants.insert_one(covenant_dict)
    
    # Remove _id before returning
    covenant_dict.pop('_id', None)
    
    return {"message": "Covenant created", "id": covenant.id, "covenant": covenant_dict}

@api_router.get("/covenants")
async def get_covenants(
    company_id: Optional[str] = None,
    loan_id: Optional[str] = None,
    status: Optional[str] = None,
    is_active: Optional[bool] = True,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user['id']}
    if company_id:
        query["company_id"] = company_id
    if loan_id:
        query["loan_id"] = loan_id
    if status:
        query["status"] = status
    if is_active is not None:
        query["is_active"] = is_active
    
    covenants = await db.covenants.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    
    # Enrich with loan info
    for cov in covenants:
        loan = await db.loans.find_one({"id": cov['loan_id']}, {"_id": 0, "lender_name": 1, "loan_type": 1})
        if loan:
            cov['lender_name'] = loan.get('lender_name')
            cov['loan_type'] = loan.get('loan_type')
    
    return covenants

@api_router.get("/covenants/{covenant_id}")
async def get_covenant(covenant_id: str, current_user: dict = Depends(get_current_user)):
    covenant = await db.covenants.find_one(
        {"id": covenant_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not covenant:
        raise HTTPException(status_code=404, detail="Covenant not found")
    
    # Get measurement history
    measurements = await db.covenant_measurements.find(
        {"covenant_id": covenant_id},
        {"_id": 0}
    ).sort("measurement_date", -1).limit(12).to_list(12)
    
    covenant['measurement_history'] = measurements
    return covenant

@api_router.put("/covenants/{covenant_id}")
async def update_covenant(covenant_id: str, data: CovenantUpdate, current_user: dict = Depends(get_current_user)):
    covenant = await db.covenants.find_one({
        "id": covenant_id,
        "user_id": current_user['id']
    })
    
    if not covenant:
        raise HTTPException(status_code=404, detail="Covenant not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.covenants.update_one({"id": covenant_id}, {"$set": update_data})
    
    return {"message": "Covenant updated", "id": covenant_id}

@api_router.delete("/covenants/{covenant_id}")
async def delete_covenant(covenant_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.covenants.delete_one({
        "id": covenant_id,
        "user_id": current_user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Covenant not found")
    
    # Also delete measurement history
    await db.covenant_measurements.delete_many({"covenant_id": covenant_id})
    
    return {"message": "Covenant deleted"}

@api_router.post("/covenants/{covenant_id}/measure")
async def record_covenant_measurement(
    covenant_id: str,
    measured_value: float,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Record a new measurement for a covenant and update its status"""
    covenant = await db.covenants.find_one({
        "id": covenant_id,
        "user_id": current_user['id']
    })
    
    if not covenant:
        raise HTTPException(status_code=404, detail="Covenant not found")
    
    threshold = covenant['threshold_value']
    operator = covenant['requirement_operator']
    warning_pct = covenant.get('warning_threshold_pct', 10.0)
    
    # Calculate status and headroom
    if operator == ">=":
        headroom_pct = ((measured_value - threshold) / threshold) * 100 if threshold != 0 else 0
        is_compliant = measured_value >= threshold
        warning_threshold = threshold * (1 + warning_pct / 100)
        is_warning = measured_value < warning_threshold and measured_value >= threshold
    elif operator == "<=":
        headroom_pct = ((threshold - measured_value) / threshold) * 100 if threshold != 0 else 0
        is_compliant = measured_value <= threshold
        warning_threshold = threshold * (1 - warning_pct / 100)
        is_warning = measured_value > warning_threshold and measured_value <= threshold
    else:  # operator == "="
        headroom_pct = 0 if measured_value == threshold else -100
        is_compliant = measured_value == threshold
        is_warning = False
    
    if not is_compliant:
        status = CovenantStatus.BREACH
    elif is_warning:
        status = CovenantStatus.WARNING
    else:
        status = CovenantStatus.COMPLIANT
    
    # Record measurement
    measurement = CovenantMeasurement(
        covenant_id=covenant_id,
        measured_value=measured_value,
        status=status,
        headroom_pct=round(headroom_pct, 2),
        notes=notes
    )
    
    measurement_dict = measurement.model_dump()
    measurement_dict['measurement_date'] = measurement_dict['measurement_date'].isoformat()
    
    await db.covenant_measurements.insert_one(measurement_dict)
    
    # Update covenant with latest measurement
    await db.covenants.update_one(
        {"id": covenant_id},
        {"$set": {
            "current_value": measured_value,
            "status": status.value,
            "headroom_pct": round(headroom_pct, 2),
            "last_measured_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "measurement_id": measurement.id,
        "status": status.value,
        "headroom_pct": round(headroom_pct, 2),
        "is_compliant": is_compliant,
        "is_warning": is_warning
    }

@api_router.get("/covenants/summary/status")
async def get_covenant_summary(
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get summary of covenant statuses"""
    query = {"user_id": current_user['id'], "is_active": True}
    if company_id:
        query["company_id"] = company_id
    
    covenants = await db.covenants.find(query, {"_id": 0}).to_list(200)
    
    summary = {
        "total": len(covenants),
        "compliant": len([c for c in covenants if c.get('status') == 'compliant']),
        "warning": len([c for c in covenants if c.get('status') == 'warning']),
        "breach": len([c for c in covenants if c.get('status') == 'breach']),
        "not_measured": len([c for c in covenants if c.get('current_value') is None])
    }
    
    # Get covenants requiring attention
    attention_needed = [c for c in covenants if c.get('status') in ['warning', 'breach']]
    summary['attention_needed'] = attention_needed
    
    return summary

# ======================= MULTI-ENTITY CONSOLIDATION ROUTES =======================

# ======================= LIVE FX RATES (Frankfurter API - ECB Data) =======================
import httpx

# Cache for FX rates (refresh every 4 hours)
FX_CACHE = {
    "rates": {},
    "base": "EUR",
    "last_fetched": None,
    "cache_duration_seconds": 14400  # 4 hours
}

# Fallback rates if API is unavailable
FALLBACK_FX_RATES = {
    "USD": 1.0,
    "GBP": 1.27,
    "EUR": 1.08,
    "JPY": 0.0067,
    "CNY": 0.14,
    "INR": 0.012,
    "AUD": 0.65,
    "CAD": 0.74,
    "CHF": 1.12
}

async def fetch_live_fx_rates(base_currency: str = "EUR") -> dict:
    """Fetch live FX rates from Frankfurter API (ECB data)"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                f"https://api.frankfurter.dev/v1/latest?base={base_currency}"
            )
            if response.status_code == 200:
                data = response.json()
                # Add base currency with rate 1.0
                data["rates"][base_currency] = 1.0
                return {
                    "rates": data["rates"],
                    "base": base_currency,
                    "date": data.get("date"),
                    "source": "frankfurter"
                }
    except Exception as e:
        logger.warning(f"Failed to fetch live FX rates: {e}")
    return None

async def get_cached_fx_rates(base_currency: str = "EUR") -> dict:
    """Get FX rates with caching"""
    global FX_CACHE
    
    now = datetime.now(timezone.utc)
    cache_valid = (
        FX_CACHE["last_fetched"] is not None and
        FX_CACHE["base"] == base_currency and
        (now - FX_CACHE["last_fetched"]).total_seconds() < FX_CACHE["cache_duration_seconds"]
    )
    
    if not cache_valid:
        live_rates = await fetch_live_fx_rates(base_currency)
        if live_rates:
            FX_CACHE["rates"] = live_rates["rates"]
            FX_CACHE["base"] = base_currency
            FX_CACHE["last_fetched"] = now
            FX_CACHE["date"] = live_rates.get("date")
            FX_CACHE["source"] = "frankfurter"
        else:
            # Use fallback
            FX_CACHE["rates"] = FALLBACK_FX_RATES
            FX_CACHE["base"] = "USD"
            FX_CACHE["source"] = "fallback"
    
    return FX_CACHE

def get_fx_rate_sync(from_currency: str, to_currency: str, rates: dict, base: str) -> float:
    """Calculate FX rate between two currencies using cached rates"""
    if from_currency == to_currency:
        return 1.0
    
    # Convert through base currency
    from_rate = rates.get(from_currency, 1.0)
    to_rate = rates.get(to_currency, 1.0)
    
    if from_rate == 0:
        return 1.0
    
    return to_rate / from_rate

async def get_fx_rate(from_currency: str, to_currency: str) -> float:
    """Get FX rate to convert from_currency to to_currency (async)"""
    if from_currency == to_currency:
        return 1.0
    
    cache = await get_cached_fx_rates("EUR")
    return get_fx_rate_sync(from_currency, to_currency, cache["rates"], cache["base"])

@api_router.get("/fx/rates")
async def get_fx_rates(base_currency: str = "EUR"):
    """Get current FX rates from ECB via Frankfurter API"""
    # Fetch live rates with requested base
    live_rates = await fetch_live_fx_rates(base_currency)
    
    if live_rates:
        return {
            "base_currency": base_currency,
            "rates": live_rates["rates"],
            "date": live_rates.get("date"),
            "as_of": datetime.now(timezone.utc).isoformat(),
            "source": "frankfurter (ECB)"
        }
    
    # Fallback to cached/default rates
    cache = await get_cached_fx_rates("EUR")
    
    # Convert rates to requested base
    base_rate_in_cache = cache["rates"].get(base_currency, 1.0)
    converted_rates = {}
    for currency, rate in cache["rates"].items():
        if base_rate_in_cache != 0:
            converted_rates[currency] = round(rate / base_rate_in_cache, 6)
        else:
            converted_rates[currency] = rate
    
    return {
        "base_currency": base_currency,
        "rates": converted_rates,
        "as_of": datetime.now(timezone.utc).isoformat(),
        "source": cache.get("source", "fallback")
    }

@api_router.get("/fx/convert")
async def convert_currency(
    amount: float,
    from_currency: str,
    to_currency: str
):
    """Convert amount from one currency to another using live rates"""
    rate = await get_fx_rate(from_currency, to_currency)
    converted = amount * rate
    
    return {
        "original_amount": amount,
        "original_currency": from_currency,
        "converted_amount": round(converted, 2),
        "target_currency": to_currency,
        "fx_rate": round(rate, 6),
        "source": "frankfurter (ECB)"
    }

@api_router.get("/fx/historical")
async def get_historical_rates(
    date: str,
    base_currency: str = "EUR",
    symbols: Optional[str] = None
):
    """Get historical FX rates for a specific date"""
    try:
        url = f"https://api.frankfurter.dev/v1/{date}?base={base_currency}"
        if symbols:
            url += f"&symbols={symbols}"
        
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                data["rates"][base_currency] = 1.0
                return {
                    "base_currency": base_currency,
                    "date": data.get("date"),
                    "rates": data["rates"],
                    "source": "frankfurter (ECB)"
                }
            else:
                raise HTTPException(status_code=400, detail="Invalid date or currency")
    except httpx.RequestError as e:
        raise HTTPException(status_code=503, detail="FX service temporarily unavailable")

# Consolidation Groups
@api_router.post("/consolidation/groups")
async def create_consolidation_group(data: ConsolidationGroupCreate, current_user: dict = Depends(get_current_user)):
    # Verify all entity_ids belong to user
    for entity_id in data.entity_ids:
        company = await db.entity_tree.find_one({"id": entity_id, "user_id": current_user['id']})
        if not company:
            raise HTTPException(status_code=400, detail=f"Company {entity_id} not found or not owned by user")
    
    group = ConsolidationGroup(
        user_id=current_user['id'],
        **data.model_dump()
    )
    
    group_dict = group.model_dump()
    group_dict['created_at'] = group_dict['created_at'].isoformat()
    
    await db.consolidation_groups.insert_one(group_dict)
    
    # Remove _id before returning
    group_dict.pop('_id', None)
    
    return {"message": "Consolidation group created", "id": group.id, "group": group_dict}

@api_router.get("/consolidation/groups")
async def get_consolidation_groups(current_user: dict = Depends(get_current_user)):
    groups = await db.consolidation_groups.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).to_list(50)
    
    # Enrich with entity details
    for group in groups:
        entities = []
        for entity_id in group.get('entity_ids', []):
            company = await db.entity_tree.find_one({"id": entity_id}, {"_id": 0, "name": 1, "currency": 1, "country": 1})
            if company:
                entities.append(company)
        group['entities'] = entities
    
    return groups

@api_router.get("/consolidation/groups/{group_id}")
async def get_consolidation_group(group_id: str, current_user: dict = Depends(get_current_user)):
    group = await db.consolidation_groups.find_one(
        {"id": group_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not group:
        raise HTTPException(status_code=404, detail="Consolidation group not found")
    
    # Enrich with full entity details
    entities = []
    for entity_id in group.get('entity_ids', []):
        company = await db.entity_tree.find_one({"id": entity_id}, {"_id": 0})
        if company:
            entities.append(company)
    group['entities'] = entities
    
    return group

@api_router.put("/consolidation/groups/{group_id}")
async def update_consolidation_group(group_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    group = await db.consolidation_groups.find_one({
        "id": group_id,
        "user_id": current_user['id']
    })
    
    if not group:
        raise HTTPException(status_code=404, detail="Consolidation group not found")
    
    allowed_fields = ['name', 'description', 'reporting_currency', 'entity_ids']
    update_data = {k: v for k, v in data.items() if k in allowed_fields and v is not None}
    
    # Verify new entity_ids if provided
    if 'entity_ids' in update_data:
        for entity_id in update_data['entity_ids']:
            company = await db.entity_tree.find_one({"id": entity_id, "user_id": current_user['id']})
            if not company:
                raise HTTPException(status_code=400, detail=f"Company {entity_id} not found")
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No valid data to update")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.consolidation_groups.update_one({"id": group_id}, {"$set": update_data})
    
    return {"message": "Consolidation group updated", "id": group_id}

@api_router.delete("/consolidation/groups/{group_id}")
async def delete_consolidation_group(group_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.consolidation_groups.delete_one({
        "id": group_id,
        "user_id": current_user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Consolidation group not found")
    
    return {"message": "Consolidation group deleted"}

@api_router.post("/consolidation/groups/{group_id}/consolidate")
async def run_consolidation(
    group_id: str,
    period: str = "current",  # current, ytd, or specific period like "2024-Q1"
    current_user: dict = Depends(get_current_user)
):
    """Run consolidation for a group with currency conversion"""
    group = await db.consolidation_groups.find_one({
        "id": group_id,
        "user_id": current_user['id']
    })
    
    if not group:
        raise HTTPException(status_code=404, detail="Consolidation group not found")
    
    reporting_currency = group['reporting_currency']
    entity_ids = group.get('entity_ids', [])
    
    if not entity_ids:
        raise HTTPException(status_code=400, detail="No entities in consolidation group")
    
    # Pre-fetch FX rates for all currencies needed
    fx_cache = await get_cached_fx_rates("EUR")
    
    # Initialize consolidated totals
    total_revenue = 0.0
    total_expenses = 0.0
    total_cash = 0.0
    total_ar = 0.0
    total_ap = 0.0
    entity_breakdown = []
    fx_rates_used = {}
    
    for entity_id in entity_ids:
        company = await db.entity_tree.find_one({"id": entity_id}, {"_id": 0})
        if not company:
            continue
        
        local_currency = company.get('currency', 'USD')
        fx_rate = get_fx_rate_sync(local_currency, reporting_currency, fx_cache["rates"], fx_cache["base"])
        fx_rates_used[local_currency] = round(fx_rate, 6)
        
        # Get transactions for this entity
        transactions = await db.transactions.find(
            {"company_id": entity_id},
            {"_id": 0}
        ).to_list(1000)
        
        # Calculate local currency metrics
        local_revenue = sum(tx['amount'] for tx in transactions if tx['amount'] > 0 and tx.get('category') == 'Sales')
        local_expenses = abs(sum(tx['amount'] for tx in transactions if tx['amount'] < 0))
        local_cash = sum(tx['amount'] for tx in transactions if tx.get('type') == 'Bank Transaction')
        local_ar = sum(tx['amount'] for tx in transactions if tx['amount'] > 0 and tx.get('status') == 'Pending')
        local_ap = abs(sum(tx['amount'] for tx in transactions if tx['amount'] < 0 and tx.get('status') == 'Pending'))
        
        # Convert to reporting currency
        converted_revenue = local_revenue * fx_rate
        converted_expenses = local_expenses * fx_rate
        converted_cash = local_cash * fx_rate
        converted_ar = local_ar * fx_rate
        converted_ap = local_ap * fx_rate
        
        # Add to totals
        total_revenue += converted_revenue
        total_expenses += converted_expenses
        total_cash += converted_cash
        total_ar += converted_ar
        total_ap += converted_ap
        
        entity_breakdown.append({
            "entity_id": entity_id,
            "entity_name": company.get('name'),
            "local_currency": local_currency,
            "fx_rate": round(fx_rate, 6),
            "local_values": {
                "revenue": round(local_revenue, 2),
                "expenses": round(local_expenses, 2),
                "ebitda": round(local_revenue - local_expenses, 2),
                "cash": round(local_cash, 2),
                "ar": round(local_ar, 2),
                "ap": round(local_ap, 2)
            },
            "converted_values": {
                "revenue": round(converted_revenue, 2),
                "expenses": round(converted_expenses, 2),
                "ebitda": round(converted_revenue - converted_expenses, 2),
                "cash": round(converted_cash, 2),
                "ar": round(converted_ar, 2),
                "ap": round(converted_ap, 2)
            }
        })
    
    consolidated = ConsolidatedFinancials(
        group_id=group_id,
        group_name=group['name'],
        reporting_currency=reporting_currency,
        period=period,
        total_revenue=round(total_revenue, 2),
        total_expenses=round(total_expenses, 2),
        total_ebitda=round(total_revenue - total_expenses, 2),
        total_cash=round(total_cash, 2),
        total_ar=round(total_ar, 2),
        total_ap=round(total_ap, 2),
        entity_breakdown=entity_breakdown,
        fx_rates_used=fx_rates_used
    )
    
    # Store consolidation result
    result_dict = consolidated.model_dump()
    result_dict['consolidated_at'] = result_dict['consolidated_at'].isoformat()
    result_dict['user_id'] = current_user['id']
    
    await db.consolidation_results.insert_one(result_dict)
    
    # Remove _id before returning
    result_dict.pop('_id', None)
    
    return result_dict

@api_router.get("/consolidation/results")
async def get_consolidation_results(
    group_id: Optional[str] = None,
    limit: int = 10,
    current_user: dict = Depends(get_current_user)
):
    """Get historical consolidation results"""
    query = {"user_id": current_user['id']}
    if group_id:
        query["group_id"] = group_id
    
    results = await db.consolidation_results.find(
        query,
        {"_id": 0}
    ).sort("consolidated_at", -1).limit(limit).to_list(limit)
    
    return results

@api_router.get("/consolidation/entity-summary")
async def get_entity_summary(current_user: dict = Depends(get_current_user)):
    """Get summary of all entities available for consolidation"""
    companies = await db.entity_tree.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).to_list(100)
    
    summary = {
        "total_entities": len(companies),
        "by_currency": {},
        "by_region": {},
        "entities": []
    }
    
    for company in companies:
        currency = company.get('currency', 'USD')
        region = company.get('global_region', 'Unknown')
        
        summary['by_currency'][currency] = summary['by_currency'].get(currency, 0) + 1
        summary['by_region'][region] = summary['by_region'].get(region, 0) + 1
        
        # Get transaction count for this entity
        tx_count = await db.transactions.count_documents({"company_id": company['id']})
        
        summary['entities'].append({
            "id": company['id'],
            "name": company.get('name'),
            "currency": currency,
            "country": company.get('country'),
            "region": region,
            "transaction_count": tx_count
        })
    
    return summary

# ======================= USER PREFERENCES ROUTES =======================

@api_router.get("/preferences")
async def get_preferences(current_user: dict = Depends(get_current_user)):
    prefs = await db.user_preferences.find_one(
        {"user_id": current_user['id']},
        {"_id": 0}
    )
    
    if not prefs:
        # Create default preferences
        default_prefs = UserPreferences(user_id=current_user['id'])
        prefs_dict = default_prefs.model_dump()
        await db.user_preferences.insert_one(prefs_dict)
        return prefs_dict
    
    return prefs

@api_router.put("/preferences")
async def update_preferences(data: UserPreferencesUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    result = await db.user_preferences.update_one(
        {"user_id": current_user['id']},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Preferences updated"}

# ======================= RAG POLICY ROUTES =======================

@api_router.get("/rag-policies/defaults")
async def get_default_rag_policies():
    """Get default RAG threshold configurations"""
    return {
        "defaults": DEFAULT_RAG_METRICS,
        "description": "Default RAG thresholds. Green indicates healthy, Amber indicates caution, Red indicates concern."
    }

@api_router.get("/rag-policies")
async def get_rag_policies(
    company_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get RAG policies for user's companies"""
    query = {"user_id": current_user['id']}
    if company_id:
        query["company_id"] = company_id
    
    policies = await db.rag_policies.find(query, {"_id": 0}).to_list(100)
    return policies

@api_router.get("/rag-policies/{company_id}")
async def get_company_rag_policy(company_id: str, current_user: dict = Depends(get_current_user)):
    """Get RAG policy for a specific company, or return defaults if none set"""
    # Verify company ownership
    company = await db.entity_tree.find_one({"id": company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    policy = await db.rag_policies.find_one(
        {"company_id": company_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    
    if not policy:
        # Return default policy structure
        return {
            "company_id": company_id,
            "company_name": company.get('name'),
            "metrics": DEFAULT_RAG_METRICS,
            "is_default": True
        }
    
    policy["company_name"] = company.get('name')
    policy["is_default"] = False
    return policy

@api_router.post("/rag-policies")
async def create_rag_policy(data: RAGPolicyCreate, current_user: dict = Depends(get_current_user)):
    """Create or update RAG policy for a company"""
    # Verify company ownership
    company = await db.entity_tree.find_one({"id": data.company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Convert RAGMetricConfig objects to dictionaries for storage
    metrics_dict = {k: v.model_dump() if hasattr(v, 'model_dump') else v for k, v in data.metrics.items()}
    
    # Check if policy already exists
    existing = await db.rag_policies.find_one({
        "company_id": data.company_id,
        "user_id": current_user['id']
    })
    
    if existing:
        # Update existing policy
        await db.rag_policies.update_one(
            {"id": existing['id']},
            {"$set": {
                "metrics": metrics_dict,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"message": "RAG policy updated", "id": existing['id']}
    
    # Create new policy
    policy = RAGPolicy(
        user_id=current_user['id'],
        company_id=data.company_id,
        metrics=metrics_dict
    )
    
    policy_dict = policy.model_dump()
    policy_dict['created_at'] = policy_dict['created_at'].isoformat()
    
    await db.rag_policies.insert_one(policy_dict)
    
    # Remove _id before returning
    policy_dict.pop('_id', None)
    
    return {"message": "RAG policy created", "id": policy.id, "policy": policy_dict}

@api_router.put("/rag-policies/{company_id}")
async def update_rag_policy(
    company_id: str,
    data: RAGPolicyUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update RAG policy for a company"""
    policy = await db.rag_policies.find_one({
        "company_id": company_id,
        "user_id": current_user['id']
    })
    
    if not policy:
        # Create new policy with provided metrics
        new_policy = RAGPolicy(
            user_id=current_user['id'],
            company_id=company_id,
            metrics=data.metrics or {}
        )
        policy_dict = new_policy.model_dump()
        policy_dict['created_at'] = policy_dict['created_at'].isoformat()
        await db.rag_policies.insert_one(policy_dict)
        return {"message": "RAG policy created", "id": new_policy.id}
    
    update_data = {}
    if data.metrics is not None:
        update_data['metrics'] = data.metrics
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.rag_policies.update_one(
        {"id": policy['id']},
        {"$set": update_data}
    )
    
    return {"message": "RAG policy updated", "id": policy['id']}

@api_router.delete("/rag-policies/{company_id}")
async def delete_rag_policy(company_id: str, current_user: dict = Depends(get_current_user)):
    """Delete RAG policy for a company (reverts to defaults)"""
    result = await db.rag_policies.delete_one({
        "company_id": company_id,
        "user_id": current_user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="RAG policy not found")
    
    return {"message": "RAG policy deleted, company will use default thresholds"}

@api_router.post("/rag-policies/{company_id}/evaluate")
async def evaluate_rag_status(
    company_id: str,
    metrics: Dict[str, float],
    current_user: dict = Depends(get_current_user)
):
    """Evaluate RAG status for given metrics based on company policy"""
    # Get policy or use defaults
    policy = await db.rag_policies.find_one({
        "company_id": company_id,
        "user_id": current_user['id']
    })
    
    policy_metrics = policy['metrics'] if policy else DEFAULT_RAG_METRICS
    
    results = {}
    for metric_id, value in metrics.items():
        if metric_id not in policy_metrics:
            results[metric_id] = {"status": "unknown", "value": value}
            continue
        
        config = policy_metrics[metric_id]
        thresholds = config.get('thresholds', {})
        is_higher_better = thresholds.get('is_higher_better', True)
        
        status = "red"  # Default to red
        
        if is_higher_better:
            green_min = thresholds.get('green_min')
            amber_min = thresholds.get('amber_min')
            
            if green_min is not None and value >= green_min:
                status = "green"
            elif amber_min is not None and value >= amber_min:
                status = "amber"
        else:
            green_max = thresholds.get('green_max')
            amber_max = thresholds.get('amber_max')
            
            if green_max is not None and value <= green_max:
                status = "green"
            elif amber_max is not None and value <= amber_max:
                status = "amber"
        
        results[metric_id] = {
            "status": status,
            "value": value,
            "thresholds": thresholds,
            "metric_name": config.get('metric_name', metric_id)
        }
    
    return {"company_id": company_id, "evaluations": results}

# ======================= ENTITY ADJUSTMENT ROUTES =======================

@api_router.get("/entity-adjustments/types")
async def get_adjustment_types():
    """Get available adjustment types with descriptions"""
    return {
        "types": [
            {
                "value": "currency_translation",
                "label": "Currency Translation",
                "description": "FX translation method (current rate, historical rate, average rate)",
                "example_parameters": {"method": "current_rate", "fx_gain_loss_account": "FX Gain/Loss"}
            },
            {
                "value": "revenue_recognition",
                "label": "Revenue Recognition",
                "description": "Revenue recognition policy adjustments",
                "example_parameters": {"method": "point_in_time", "recognition_criteria": "on_delivery"}
            },
            {
                "value": "depreciation",
                "label": "Depreciation Method",
                "description": "Depreciation calculation method",
                "example_parameters": {"method": "straight_line", "useful_life_override": 5}
            },
            {
                "value": "inventory_valuation",
                "label": "Inventory Valuation",
                "description": "Inventory costing method",
                "example_parameters": {"method": "weighted_average", "lower_of_cost_market": True}
            },
            {
                "value": "consolidation",
                "label": "Consolidation Rules",
                "description": "Entity consolidation method",
                "example_parameters": {"method": "full", "ownership_pct": 100, "minority_interest": False}
            },
            {
                "value": "intercompany",
                "label": "Intercompany Eliminations",
                "description": "Intercompany transaction elimination rules",
                "example_parameters": {"eliminate_ic_revenue": True, "eliminate_ic_ar_ap": True}
            },
            {
                "value": "tax_treatment",
                "label": "Tax Treatment",
                "description": "Local tax calculation rules",
                "example_parameters": {"corporate_tax_rate": 19.0, "vat_rate": 20.0, "deferred_tax_method": "liability"}
            },
            {
                "value": "custom",
                "label": "Custom Adjustment",
                "description": "User-defined accounting adjustments",
                "example_parameters": {"adjustment_name": "", "amount": 0, "accounts_affected": []}
            }
        ]
    }

@api_router.get("/entity-adjustments")
async def get_entity_adjustments(
    company_id: Optional[str] = None,
    adjustment_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get entity adjustments"""
    query = {"user_id": current_user['id']}
    if company_id:
        query["company_id"] = company_id
    if adjustment_type:
        query["adjustment_type"] = adjustment_type
    
    adjustments = await db.entity_adjustments.find(query, {"_id": 0}).to_list(200)
    
    # Enrich with company name
    for adj in adjustments:
        company = await db.entity_tree.find_one({"id": adj['company_id']}, {"_id": 0, "name": 1})
        if company:
            adj['company_name'] = company.get('name')
    
    return adjustments

@api_router.get("/entity-adjustments/{adjustment_id}")
async def get_entity_adjustment(adjustment_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single entity adjustment"""
    adjustment = await db.entity_adjustments.find_one(
        {"id": adjustment_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    
    if not adjustment:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    
    return adjustment

@api_router.post("/entity-adjustments")
async def create_entity_adjustment(data: EntityAdjustmentCreate, current_user: dict = Depends(get_current_user)):
    """Create an entity adjustment"""
    # Verify company ownership
    company = await db.entity_tree.find_one({"id": data.company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    adjustment = EntityAdjustment(
        user_id=current_user['id'],
        **data.model_dump()
    )
    
    adj_dict = adjustment.model_dump()
    adj_dict['created_at'] = adj_dict['created_at'].isoformat()
    
    await db.entity_adjustments.insert_one(adj_dict)
    
    # Remove _id before returning
    adj_dict.pop('_id', None)
    
    return {"message": "Entity adjustment created", "id": adjustment.id, "adjustment": adj_dict}

@api_router.put("/entity-adjustments/{adjustment_id}")
async def update_entity_adjustment(
    adjustment_id: str,
    data: EntityAdjustmentUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an entity adjustment"""
    adjustment = await db.entity_adjustments.find_one({
        "id": adjustment_id,
        "user_id": current_user['id']
    })
    
    if not adjustment:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.entity_adjustments.update_one(
        {"id": adjustment_id},
        {"$set": update_data}
    )
    
    return {"message": "Entity adjustment updated", "id": adjustment_id}

@api_router.delete("/entity-adjustments/{adjustment_id}")
async def delete_entity_adjustment(adjustment_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an entity adjustment"""
    result = await db.entity_adjustments.delete_one({
        "id": adjustment_id,
        "user_id": current_user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Adjustment not found")
    
    return {"message": "Entity adjustment deleted"}

@api_router.get("/entity-adjustments/company/{company_id}/summary")
async def get_company_adjustments_summary(company_id: str, current_user: dict = Depends(get_current_user)):
    """Get summary of all adjustments for a company"""
    # Verify company ownership
    company = await db.entity_tree.find_one({"id": company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    adjustments = await db.entity_adjustments.find(
        {"company_id": company_id, "user_id": current_user['id']},
        {"_id": 0}
    ).to_list(100)
    
    # Group by type
    by_type = {}
    for adj in adjustments:
        adj_type = adj.get('adjustment_type', 'custom')
        if adj_type not in by_type:
            by_type[adj_type] = []
        by_type[adj_type].append(adj)
    
    return {
        "company_id": company_id,
        "company_name": company.get('name'),
        "total_adjustments": len(adjustments),
        "active_adjustments": len([a for a in adjustments if a.get('is_active', True)]),
        "by_type": by_type,
        "adjustments": adjustments
    }

# ======================= CHAT SESSION ROUTES =======================

@api_router.post("/chat/sessions")
async def create_chat_session(data: ChatSessionCreate, current_user: dict = Depends(get_current_user)):
    session = ChatSession(
        user_id=current_user['id'],
        company_id=data.company_id
    )
    
    session_dict = session.model_dump()
    session_dict['created_at'] = session_dict['created_at'].isoformat()
    
    await db.chat_sessions.insert_one(session_dict)
    return {"id": session.id, "company_id": session.company_id}

@api_router.get("/chat/sessions")
async def get_chat_sessions(current_user: dict = Depends(get_current_user)):
    sessions = await db.chat_sessions.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    return sessions

@api_router.post("/chat/sessions/{session_id}/messages")
async def add_chat_message(session_id: str, data: ChatMessageCreate, current_user: dict = Depends(get_current_user)):
    session = await db.chat_sessions.find_one({
        "id": session_id,
        "user_id": current_user['id']
    })
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    user_message = ChatMessage(role="user", content=data.content)
    
    # Simple AI response (placeholder - can be replaced with actual AI)
    ai_response_content = f"Based on your query about '{data.content[:50]}...', I recommend reviewing your financial metrics and considering the current market conditions. Would you like me to analyze specific aspects of your finances?"
    
    ai_message = ChatMessage(role="assistant", content=ai_response_content)
    
    await db.chat_sessions.update_one(
        {"id": session_id},
        {"$push": {"messages": {"$each": [
            {"role": "user", "content": data.content, "timestamp": datetime.now(timezone.utc).isoformat()},
            {"role": "assistant", "content": ai_response_content, "timestamp": datetime.now(timezone.utc).isoformat()}
        ]}}}
    )
    
    return {"user_message": data.content, "ai_response": ai_response_content}

# ======================= DEMO DATA ROUTE =======================

@api_router.post("/seed-demo-data")
async def seed_demo_data(company_id: str, current_user: dict = Depends(get_current_user)):
    # Verify company ownership
    company = await db.entity_tree.find_one({"id": company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    currency = company.get('currency', 'GBP')
    
    # Generate demo transactions
    transaction_types = list(TransactionType)
    categories = list(TransactionCategory)
    sources = list(TransactionSource)
    statuses = list(ReconciliationStatus)
    
    counterparties = [
        "Acme Corp", "TechStart Ltd", "GlobalTrade Inc", "ServicePro Ltd",
        "Digital Solutions", "Cloud Services UK", "Marketing Plus", "Office Supplies Co"
    ]
    
    descriptions = [
        "Professional services", "Software subscription", "Office supplies",
        "Marketing campaign", "Consulting fees", "Equipment purchase",
        "Travel expenses", "Training costs", "Insurance premium", "Utility bill"
    ]
    
    transactions = []
    base_date = datetime.now(timezone.utc)
    
    for i in range(50):
        days_ago = random.randint(0, 180)
        tx_date = base_date - timedelta(days=days_ago)
        
        is_income = random.random() > 0.4
        amount = round(random.uniform(500, 50000) * (1 if is_income else -1), 2)
        
        tx = Transaction(
            company_id=company_id,
            date=tx_date,
            description=random.choice(descriptions),
            amount=amount,
            type=random.choice(transaction_types),
            category=TransactionCategory.SALES if is_income else random.choice([c for c in categories if c != TransactionCategory.SALES]),
            source=random.choice(sources),
            status=random.choice(statuses),
            counterparty=random.choice(counterparties),
            reference=f"REF-{str(uuid.uuid4())[:8].upper()}"
        )
        
        tx_dict = tx.model_dump()
        tx_dict['date'] = tx_dict['date'].isoformat()
        tx_dict['created_at'] = tx_dict['created_at'].isoformat()
        transactions.append(tx_dict)
    
    if transactions:
        await db.transactions.insert_many(transactions)
    
    return {
        "message": "Demo data generated",
        "transactions_created": len(transactions)
    }

# ======================= USER PREFERENCES ENDPOINTS =======================

class UserPreferencesUpdate(BaseModel):
    preferences: Dict[str, Any]

@api_router.get("/user/preferences/{pref_type}")
async def get_user_preferences(pref_type: str, current_user: dict = Depends(get_current_user)):
    """Get user preferences by type"""
    prefs = await db.user_preferences.find_one({
        "user_id": current_user['id'],
        "type": pref_type
    }, {"_id": 0})
    
    if not prefs:
        return {"type": pref_type, "preferences": {}}
    
    return prefs

@api_router.put("/user/preferences/{pref_type}")
async def update_user_preferences(
    pref_type: str,
    data: UserPreferencesUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update or create user preferences"""
    await db.user_preferences.update_one(
        {"user_id": current_user['id'], "type": pref_type},
        {
            "$set": {
                "user_id": current_user['id'],
                "type": pref_type,
                "preferences": data.preferences,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"message": "Preferences saved", "type": pref_type}

# ======================= DASHBOARD LAYOUT PREFERENCES =======================

class DashboardLayoutCreate(BaseModel):
    name: str  # e.g., "CFO View", "FP&A View", "My Custom Layout"
    company_id: Optional[str] = None
    is_role_template: bool = False  # True for pre-defined role templates
    role_name: Optional[str] = None  # e.g., "cfo", "fpa", "investor_relations"
    tabs: List[Dict[str, Any]] = []  # List of tab configurations
    widgets: Dict[str, Any] = {}  # Widget positions and visibility

class DashboardLayoutUpdate(BaseModel):
    name: Optional[str] = None
    tabs: Optional[List[Dict[str, Any]]] = None
    widgets: Optional[Dict[str, Any]] = None

@api_router.get("/dashboard-layouts")
async def get_dashboard_layouts(
    company_id: Optional[str] = None,
    include_templates: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Get all dashboard layouts for the user"""
    query = {"user_id": current_user['id']}
    if company_id:
        query["company_id"] = company_id
    
    layouts = await db.dashboard_layouts.find(query, {"_id": 0}).to_list(50)
    
    # Include role-based templates if requested
    if include_templates:
        templates = await db.dashboard_layouts.find({
            "is_role_template": True
        }, {"_id": 0}).to_list(10)
        
        # Add default templates if none exist
        if not templates:
            templates = get_default_role_templates()
        
        layouts = templates + layouts
    
    return layouts

def get_default_role_templates():
    """Return default role-based dashboard templates"""
    return [
        {
            "id": "template-cfo",
            "name": "CFO View",
            "is_role_template": True,
            "role_name": "cfo",
            "description": "Strategic overview with liquidity focus",
            "tabs": [
                {"id": "command-centre", "name": "Command Centre", "visible": True, "order": 1},
                {"id": "profitability", "name": "Profitability & Unit Economics", "visible": True, "order": 2},
                {"id": "cash-working-capital", "name": "Cash & Working Capital", "visible": True, "order": 3},
                {"id": "strategic-capital", "name": "Strategic Capital", "visible": True, "order": 4},
                {"id": "consolidation", "name": "Consolidation", "visible": True, "order": 5},
            ],
            "widgets": {
                "liquidity_strip": {"visible": True, "expanded": True},
                "custom_ratios": {"visible": True, "expanded": True},
                "ai_summary": {"visible": True, "expanded": True}
            }
        },
        {
            "id": "template-fpa",
            "name": "FP&A View",
            "is_role_template": True,
            "role_name": "fpa",
            "description": "Planning and analysis focused",
            "tabs": [
                {"id": "command-centre", "name": "Command Centre", "visible": True, "order": 1},
                {"id": "fpa-drivers", "name": "FP&A Drivers", "visible": True, "order": 2},
                {"id": "profitability", "name": "Profitability & Unit Economics", "visible": True, "order": 3},
                {"id": "what-if", "name": "What-If Modeling", "visible": True, "order": 4},
                {"id": "cash-working-capital", "name": "Cash & Working Capital", "visible": True, "order": 5},
            ],
            "widgets": {
                "liquidity_strip": {"visible": True, "expanded": True},
                "variance_analysis": {"visible": True, "expanded": True},
                "driver_metrics": {"visible": True, "expanded": True}
            }
        },
        {
            "id": "template-ir",
            "name": "Investor Relations View",
            "is_role_template": True,
            "role_name": "investor_relations",
            "description": "Board-ready metrics and reporting",
            "tabs": [
                {"id": "command-centre", "name": "Command Centre", "visible": True, "order": 1},
                {"id": "profitability", "name": "Profitability & Unit Economics", "visible": True, "order": 2},
                {"id": "consolidation", "name": "Consolidation", "visible": True, "order": 3},
                {"id": "covenants", "name": "Loan Covenants", "visible": True, "order": 4},
            ],
            "widgets": {
                "liquidity_strip": {"visible": True, "expanded": True},
                "covenant_status": {"visible": True, "expanded": True},
                "consolidated_metrics": {"visible": True, "expanded": True}
            }
        }
    ]

@api_router.post("/dashboard-layouts")
async def create_dashboard_layout(
    data: DashboardLayoutCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new dashboard layout"""
    layout = {
        "id": str(uuid.uuid4()),
        "user_id": current_user['id'],
        "name": data.name,
        "company_id": data.company_id,
        "is_role_template": False,
        "tabs": data.tabs,
        "widgets": data.widgets,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.dashboard_layouts.insert_one(layout)
    layout.pop('_id', None)
    
    return {"message": "Layout created", "layout": layout}

@api_router.put("/dashboard-layouts/{layout_id}")
async def update_dashboard_layout(
    layout_id: str,
    data: DashboardLayoutUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a dashboard layout"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    result = await db.dashboard_layouts.update_one(
        {"id": layout_id, "user_id": current_user['id'], "is_role_template": False},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Layout not found or cannot be modified")
    
    return {"message": "Layout updated"}

@api_router.delete("/dashboard-layouts/{layout_id}")
async def delete_dashboard_layout(
    layout_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a dashboard layout"""
    result = await db.dashboard_layouts.delete_one({
        "id": layout_id,
        "user_id": current_user['id'],
        "is_role_template": False
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Layout not found or cannot be deleted")
    
    return {"message": "Layout deleted"}

@api_router.post("/dashboard-layouts/{layout_id}/apply")
async def apply_dashboard_layout(
    layout_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Apply a layout (template or user layout) to the user's active view"""
    # Find the layout in database first
    layout = await db.dashboard_layouts.find_one({
        "$or": [
            {"id": layout_id, "user_id": current_user['id']},
            {"id": layout_id, "is_role_template": True}
        ]
    }, {"_id": 0})
    
    # If not found in DB, check default templates
    if not layout:
        default_templates = get_default_role_templates()
        layout = next((t for t in default_templates if t.get("id") == layout_id), None)
    
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    # Save as user's active layout preference
    await db.user_preferences.update_one(
        {"user_id": current_user['id'], "type": "active_layout"},
        {
            "$set": {
                "user_id": current_user['id'],
                "type": "active_layout",
                "preferences": {
                    "active_layout_id": layout_id,
                    "tabs": layout.get('tabs', []),
                    "widgets": layout.get('widgets', {})
                },
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        },
        upsert=True
    )
    
    return {"message": "Layout applied", "layout": layout}

# ======================= CUSTOM RATIOS MODELS =======================

# Available financial variables for ratio formulas
AVAILABLE_FINANCIAL_VARIABLES = {
    # Balance Sheet Items
    "total_cash": {"name": "Total Cash", "category": "Balance Sheet", "default_value": 1455000},
    "accounts_receivable": {"name": "Accounts Receivable", "category": "Balance Sheet", "default_value": 840000},
    "accounts_payable": {"name": "Accounts Payable", "category": "Balance Sheet", "default_value": 420000},
    "inventory": {"name": "Inventory", "category": "Balance Sheet", "default_value": 350000},
    "current_assets": {"name": "Current Assets", "category": "Balance Sheet", "default_value": 2800000},
    "current_liabilities": {"name": "Current Liabilities", "category": "Balance Sheet", "default_value": 1200000},
    "total_assets": {"name": "Total Assets", "category": "Balance Sheet", "default_value": 8500000},
    "total_liabilities": {"name": "Total Liabilities", "category": "Balance Sheet", "default_value": 3200000},
    "total_equity": {"name": "Total Equity", "category": "Balance Sheet", "default_value": 5300000},
    "long_term_debt": {"name": "Long-term Debt", "category": "Balance Sheet", "default_value": 2000000},
    "short_term_debt": {"name": "Short-term Debt", "category": "Balance Sheet", "default_value": 500000},
    "prepaid_expenses": {"name": "Prepaid Expenses", "category": "Balance Sheet", "default_value": 85000},
    "fixed_assets": {"name": "Fixed Assets (Net)", "category": "Balance Sheet", "default_value": 4200000},
    "intangible_assets": {"name": "Intangible Assets", "category": "Balance Sheet", "default_value": 650000},
    "retained_earnings": {"name": "Retained Earnings", "category": "Balance Sheet", "default_value": 2800000},
    
    # Income Statement Items  
    "revenue": {"name": "Revenue", "category": "Income Statement", "default_value": 3750000},
    "cost_of_goods_sold": {"name": "Cost of Goods Sold (COGS)", "category": "Income Statement", "default_value": 1200000},
    "gross_profit": {"name": "Gross Profit", "category": "Income Statement", "default_value": 2550000},
    "operating_expenses": {"name": "Operating Expenses", "category": "Income Statement", "default_value": 1612500},
    "ebitda": {"name": "EBITDA", "category": "Income Statement", "default_value": 937500},
    "depreciation": {"name": "Depreciation", "category": "Income Statement", "default_value": 125000},
    "amortization": {"name": "Amortization", "category": "Income Statement", "default_value": 45000},
    "operating_income": {"name": "Operating Income (EBIT)", "category": "Income Statement", "default_value": 767500},
    "interest_expense": {"name": "Interest Expense", "category": "Income Statement", "default_value": 145000},
    "tax_expense": {"name": "Tax Expense", "category": "Income Statement", "default_value": 118000},
    "net_income": {"name": "Net Income", "category": "Income Statement", "default_value": 504500},
    "selling_expenses": {"name": "Selling Expenses", "category": "Income Statement", "default_value": 375000},
    "admin_expenses": {"name": "Administrative Expenses", "category": "Income Statement", "default_value": 487500},
    "research_development": {"name": "R&D Expenses", "category": "Income Statement", "default_value": 250000},
    
    # Cash Flow Items
    "operating_cash_flow": {"name": "Operating Cash Flow", "category": "Cash Flow", "default_value": 850000},
    "investing_cash_flow": {"name": "Investing Cash Flow", "category": "Cash Flow", "default_value": -350000},
    "financing_cash_flow": {"name": "Financing Cash Flow", "category": "Cash Flow", "default_value": -200000},
    "capital_expenditure": {"name": "Capital Expenditure", "category": "Cash Flow", "default_value": 320000},
    "free_cash_flow": {"name": "Free Cash Flow", "category": "Cash Flow", "default_value": 530000},
    "dividends_paid": {"name": "Dividends Paid", "category": "Cash Flow", "default_value": 150000},
    
    # Working Capital Items
    "working_capital": {"name": "Working Capital", "category": "Working Capital", "default_value": 1600000},
    "net_working_capital": {"name": "Net Working Capital", "category": "Working Capital", "default_value": 1250000},
    
    # Operational Metrics
    "employee_count": {"name": "Employee Count", "category": "Operational", "default_value": 85},
    "monthly_burn_rate": {"name": "Monthly Burn Rate", "category": "Operational", "default_value": 285000},
    "customer_count": {"name": "Customer Count", "category": "Operational", "default_value": 450},
    "days_sales_outstanding": {"name": "Days Sales Outstanding", "category": "Operational", "default_value": 45},
    "days_payable_outstanding": {"name": "Days Payable Outstanding", "category": "Operational", "default_value": 38},
    "inventory_days": {"name": "Inventory Days", "category": "Operational", "default_value": 52},
}

class CustomRatioVariable(BaseModel):
    variable_id: str
    coefficient: float = 1.0  # Multiplier for this variable

class CustomRatioCreate(BaseModel):
    company_id: str
    name: str  # e.g., "Nosa's Liquidity Index"
    description: Optional[str] = None
    formula_type: str = "simple"  # simple, complex
    numerator_variables: List[CustomRatioVariable] = []  # Variables in numerator
    denominator_variables: List[CustomRatioVariable] = []  # Variables in denominator
    operator: str = "/"  # Main operator: /, +, -, *
    constant: float = 0.0  # Optional constant to add/subtract
    unit: str = "ratio"  # ratio, percentage, currency, days, count
    is_higher_better: bool = True
    # RAG Thresholds
    green_threshold: Optional[float] = None
    amber_threshold: Optional[float] = None
    # Visibility
    is_pinned: bool = False  # Pin to main dashboard
    visibility: str = "private"  # private, team (for "Promote to Team" feature)

class CustomRatio(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: str
    name: str
    description: Optional[str] = None
    formula_type: str = "simple"
    numerator_variables: List[Dict[str, Any]] = []
    denominator_variables: List[Dict[str, Any]] = []
    operator: str = "/"
    constant: float = 0.0
    unit: str = "ratio"
    is_higher_better: bool = True
    green_threshold: Optional[float] = None
    amber_threshold: Optional[float] = None
    is_pinned: bool = False
    visibility: str = "private"
    current_value: Optional[float] = None
    last_calculated_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: Optional[datetime] = None

class CustomRatioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    formula_type: Optional[str] = None
    numerator_variables: Optional[List[Dict[str, Any]]] = None
    denominator_variables: Optional[List[Dict[str, Any]]] = None
    operator: Optional[str] = None
    constant: Optional[float] = None
    unit: Optional[str] = None
    is_higher_better: Optional[bool] = None
    green_threshold: Optional[float] = None
    amber_threshold: Optional[float] = None
    is_pinned: Optional[bool] = None
    visibility: Optional[str] = None

# ======================= CUSTOM RATIOS API ROUTES =======================

@api_router.get("/custom-ratios/variables")
async def get_available_variables():
    """Get list of available financial variables for building custom ratios"""
    # Group by category
    by_category = {}
    for var_id, var_info in AVAILABLE_FINANCIAL_VARIABLES.items():
        category = var_info["category"]
        if category not in by_category:
            by_category[category] = []
        by_category[category].append({
            "id": var_id,
            "name": var_info["name"],
            "category": category,
            "default_value": var_info["default_value"]
        })
    
    return {
        "variables": [
            {"id": var_id, "name": info["name"], "category": info["category"], "default_value": info["default_value"]}
            for var_id, info in AVAILABLE_FINANCIAL_VARIABLES.items()
        ],
        "by_category": by_category
    }

def calculate_ratio_value(ratio: dict, variable_values: Dict[str, float] = None) -> float:
    """Calculate the current value of a custom ratio using formula"""
    # Use provided values or defaults
    values = {}
    for var_id, var_info in AVAILABLE_FINANCIAL_VARIABLES.items():
        if variable_values and var_id in variable_values:
            values[var_id] = variable_values[var_id]
        else:
            values[var_id] = var_info["default_value"]
    
    # Calculate numerator
    numerator = 0.0
    for var in ratio.get('numerator_variables', []):
        var_id = var.get('variable_id')
        coefficient = var.get('coefficient', 1.0)
        if var_id in values:
            numerator += values[var_id] * coefficient
    
    # Calculate denominator
    denominator = 0.0
    for var in ratio.get('denominator_variables', []):
        var_id = var.get('variable_id')
        coefficient = var.get('coefficient', 1.0)
        if var_id in values:
            denominator += values[var_id] * coefficient
    
    # Apply operator
    operator = ratio.get('operator', '/')
    constant = ratio.get('constant', 0.0)
    
    if operator == '/':
        if denominator == 0:
            return 0.0
        result = (numerator / denominator) + constant
    elif operator == '*':
        result = (numerator * denominator) + constant
    elif operator == '+':
        result = numerator + denominator + constant
    elif operator == '-':
        result = numerator - denominator + constant
    else:
        result = numerator + constant
    
    # Convert to percentage if needed
    unit = ratio.get('unit', 'ratio')
    if unit == 'percentage':
        result = result * 100
    
    return round(result, 4)

def evaluate_ratio_rag_status(ratio: dict, value: float) -> str:
    """Evaluate RAG status for a custom ratio"""
    green_threshold = ratio.get('green_threshold')
    amber_threshold = ratio.get('amber_threshold')
    is_higher_better = ratio.get('is_higher_better', True)
    
    if green_threshold is None and amber_threshold is None:
        return "unknown"
    
    if is_higher_better:
        if green_threshold is not None and value >= green_threshold:
            return "green"
        elif amber_threshold is not None and value >= amber_threshold:
            return "amber"
        else:
            return "red"
    else:
        if green_threshold is not None and value <= green_threshold:
            return "green"
        elif amber_threshold is not None and value <= amber_threshold:
            return "amber"
        else:
            return "red"

@api_router.post("/custom-ratios")
async def create_custom_ratio(data: CustomRatioCreate, current_user: dict = Depends(get_current_user)):
    """Create a new custom ratio"""
    # Verify company ownership
    company = await db.entity_tree.find_one({"id": data.company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Check for duplicate name
    existing = await db.custom_ratios.find_one({
        "user_id": current_user['id'],
        "company_id": data.company_id,
        "name": data.name
    })
    if existing:
        raise HTTPException(status_code=400, detail="A custom ratio with this name already exists")
    
    ratio = CustomRatio(
        user_id=current_user['id'],
        **data.model_dump()
    )
    
    # Calculate initial value
    ratio_dict = ratio.model_dump()
    ratio_dict['current_value'] = calculate_ratio_value(ratio_dict)
    ratio_dict['last_calculated_at'] = datetime.now(timezone.utc).isoformat()
    ratio_dict['created_at'] = ratio_dict['created_at'].isoformat()
    
    await db.custom_ratios.insert_one(ratio_dict)
    
    # Remove _id before returning
    ratio_dict.pop('_id', None)
    
    return {
        "message": "Custom ratio created successfully",
        "id": ratio.id,
        "ratio": ratio_dict,
        "rag_status": evaluate_ratio_rag_status(ratio_dict, ratio_dict['current_value'])
    }

@api_router.get("/custom-ratios")
async def get_custom_ratios(
    company_id: Optional[str] = None,
    pinned_only: bool = False,
    visibility: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get custom ratios for user/company"""
    query = {"user_id": current_user['id']}
    
    if company_id:
        query["company_id"] = company_id
    if pinned_only:
        query["is_pinned"] = True
    if visibility:
        query["visibility"] = visibility
    
    ratios = await db.custom_ratios.find(query, {"_id": 0}).to_list(100)
    
    # Recalculate values and RAG status
    for ratio in ratios:
        ratio['current_value'] = calculate_ratio_value(ratio)
        ratio['rag_status'] = evaluate_ratio_rag_status(ratio, ratio['current_value'])
        # Get company name
        company = await db.entity_tree.find_one({"id": ratio['company_id']}, {"_id": 0, "name": 1, "currency": 1})
        if company:
            ratio['company_name'] = company.get('name')
            ratio['currency'] = company.get('currency', 'GBP')
    
    return ratios

@api_router.get("/custom-ratios/{ratio_id}")
async def get_custom_ratio(ratio_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single custom ratio"""
    ratio = await db.custom_ratios.find_one({
        "id": ratio_id,
        "user_id": current_user['id']
    }, {"_id": 0})
    
    if not ratio:
        raise HTTPException(status_code=404, detail="Custom ratio not found")
    
    # Recalculate value
    ratio['current_value'] = calculate_ratio_value(ratio)
    ratio['rag_status'] = evaluate_ratio_rag_status(ratio, ratio['current_value'])
    
    return ratio

@api_router.put("/custom-ratios/{ratio_id}")
async def update_custom_ratio(
    ratio_id: str,
    data: CustomRatioUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update a custom ratio"""
    ratio = await db.custom_ratios.find_one({
        "id": ratio_id,
        "user_id": current_user['id']
    })
    
    if not ratio:
        raise HTTPException(status_code=404, detail="Custom ratio not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    # Recalculate if formula changed
    updated_ratio = {**ratio, **update_data}
    update_data['current_value'] = calculate_ratio_value(updated_ratio)
    update_data['last_calculated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.custom_ratios.update_one(
        {"id": ratio_id},
        {"$set": update_data}
    )
    
    return {
        "message": "Custom ratio updated",
        "id": ratio_id,
        "current_value": update_data['current_value'],
        "rag_status": evaluate_ratio_rag_status(updated_ratio, update_data['current_value'])
    }

@api_router.delete("/custom-ratios/{ratio_id}")
async def delete_custom_ratio(ratio_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a custom ratio"""
    result = await db.custom_ratios.delete_one({
        "id": ratio_id,
        "user_id": current_user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Custom ratio not found")
    
    return {"message": "Custom ratio deleted"}

class CalculateRatioRequest(BaseModel):
    variable_values: Optional[Dict[str, float]] = None

@api_router.post("/custom-ratios/{ratio_id}/calculate")
async def calculate_custom_ratio(
    ratio_id: str,
    data: Optional[CalculateRatioRequest] = None,
    current_user: dict = Depends(get_current_user)
):
    """Calculate custom ratio with optional custom variable values"""
    ratio = await db.custom_ratios.find_one({
        "id": ratio_id,
        "user_id": current_user['id']
    }, {"_id": 0})
    
    if not ratio:
        raise HTTPException(status_code=404, detail="Custom ratio not found")
    
    variable_values = data.variable_values if data else None
    value = calculate_ratio_value(ratio, variable_values)
    rag_status = evaluate_ratio_rag_status(ratio, value)
    
    # Update stored value
    await db.custom_ratios.update_one(
        {"id": ratio_id},
        {
            "$set": {
                "current_value": value,
                "last_calculated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    return {
        "ratio_id": ratio_id,
        "name": ratio['name'],
        "value": value,
        "unit": ratio.get('unit', 'ratio'),
        "rag_status": rag_status,
        "is_higher_better": ratio.get('is_higher_better', True),
        "thresholds": {
            "green": ratio.get('green_threshold'),
            "amber": ratio.get('amber_threshold')
        }
    }

@api_router.post("/custom-ratios/{ratio_id}/pin")
async def toggle_pin_custom_ratio(ratio_id: str, current_user: dict = Depends(get_current_user)):
    """Toggle pin status of a custom ratio"""
    ratio = await db.custom_ratios.find_one({
        "id": ratio_id,
        "user_id": current_user['id']
    })
    
    if not ratio:
        raise HTTPException(status_code=404, detail="Custom ratio not found")
    
    new_pin_status = not ratio.get('is_pinned', False)
    
    await db.custom_ratios.update_one(
        {"id": ratio_id},
        {"$set": {"is_pinned": new_pin_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Ratio {'pinned' if new_pin_status else 'unpinned'}", "is_pinned": new_pin_status}

@api_router.post("/custom-ratios/{ratio_id}/promote")
async def promote_ratio_to_team(ratio_id: str, current_user: dict = Depends(get_current_user)):
    """Promote a private ratio to team visibility"""
    ratio = await db.custom_ratios.find_one({
        "id": ratio_id,
        "user_id": current_user['id']
    })
    
    if not ratio:
        raise HTTPException(status_code=404, detail="Custom ratio not found")
    
    new_visibility = "team" if ratio.get('visibility') == 'private' else 'private'
    
    await db.custom_ratios.update_one(
        {"id": ratio_id},
        {"$set": {"visibility": new_visibility, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": f"Ratio visibility changed to {new_visibility}", "visibility": new_visibility}

@api_router.get("/custom-ratios/company/{company_id}/pinned")
async def get_pinned_ratios_for_dashboard(company_id: str, current_user: dict = Depends(get_current_user)):
    """Get pinned custom ratios for dashboard display"""
    # Verify company ownership
    company = await db.entity_tree.find_one({"id": company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    ratios = await db.custom_ratios.find({
        "company_id": company_id,
        "user_id": current_user['id'],
        "is_pinned": True
    }, {"_id": 0}).to_list(20)
    
    # Calculate current values
    result = []
    for ratio in ratios:
        value = calculate_ratio_value(ratio)
        result.append({
            "id": ratio['id'],
            "name": ratio['name'],
            "value": value,
            "unit": ratio.get('unit', 'ratio'),
            "rag_status": evaluate_ratio_rag_status(ratio, value),
            "is_higher_better": ratio.get('is_higher_better', True),
            "visibility": ratio.get('visibility', 'private'),
            "description": ratio.get('description')
        })
    
    return {"company_id": company_id, "pinned_ratios": result}

# ======================= ROOT ROUTE =======================

@api_router.get("/")
async def root():
    return {"message": "MyGlobalCFO API v1.0.0", "status": "operational"}

# ======================= ENTITY TREE MANAGEMENT (Story 1) =======================

@api_router.get("/entity-tree/nodes")
async def get_entity_tree_nodes(
    entity_type: Optional[str] = None,
    parent_id: Optional[str] = None,
    is_active: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """Get all entity tree nodes for the user"""
    query = {"user_id": current_user['id']}
    if entity_type:
        query["entity_type"] = entity_type
    if parent_id:
        query["parent_entity_id"] = parent_id
    if is_active is not None:
        query["is_active"] = is_active
    
    nodes = await db.entity_tree.find(query, {"_id": 0}).sort("name", 1).to_list(500)
    return nodes

@api_router.get("/entity-tree/hierarchy")
async def get_entity_hierarchy(current_user: dict = Depends(get_current_user)):
    """Get full entity hierarchy as a tree structure"""
    nodes = await db.entity_tree.find(
        {"user_id": current_user['id'], "is_active": True},
        {"_id": 0}
    ).to_list(500)
    
    # Build tree structure
    nodes_by_id = {n['id']: {**n, 'children': []} for n in nodes}
    root_nodes = []
    
    for node in nodes:
        node_id = node['id']
        parent_id = node.get('parent_entity_id')
        
        if parent_id and parent_id in nodes_by_id:
            nodes_by_id[parent_id]['children'].append(nodes_by_id[node_id])
        else:
            root_nodes.append(nodes_by_id[node_id])
    
    # Calculate totals
    total_entities = len(nodes)
    holdcos = len([n for n in nodes if n.get('entity_type') == 'holdco'])
    subsidiaries = len([n for n in nodes if n.get('entity_type') == 'subsidiary'])
    standalone = len([n for n in nodes if n.get('entity_type') == 'standalone'])
    
    return {
        "tree": root_nodes,
        "summary": {
            "total_entities": total_entities,
            "holdcos": holdcos,
            "subsidiaries": subsidiaries,
            "standalone": standalone,
            "by_currency": {},
            "by_region": {},
            "by_segment": {}
        }
    }

@api_router.post("/entity-tree/nodes")
async def create_entity_tree_node(
    data: EntityTreeNodeCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new entity in the tree"""
    # Check for duplicate entity code
    existing = await db.entity_tree.find_one({
        "user_id": current_user['id'],
        "entity_code": data.entity_code
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Entity code '{data.entity_code}' already exists")
    
    # Validate parent if provided
    if data.parent_entity_id:
        parent = await db.entity_tree.find_one({
            "id": data.parent_entity_id,
            "user_id": current_user['id']
        })
        if not parent:
            raise HTTPException(status_code=400, detail="Parent entity not found")
        # Ensure parent is holdco
        if parent.get('entity_type') not in ['holdco', 'subsidiary']:
            raise HTTPException(status_code=400, detail="Parent must be a holdco or subsidiary")
    
    node = EntityTreeNode(
        user_id=current_user['id'],
        **data.model_dump()
    )
    
    node_dict = node.model_dump()
    node_dict['created_at'] = node_dict['created_at'].isoformat()
    
    await db.entity_tree.insert_one(node_dict)
    node_dict.pop('_id', None)
    
    return {"message": "Entity created", "entity": node_dict}

@api_router.get("/entity-tree/nodes/{entity_id}")
async def get_entity_tree_node(entity_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single entity node with its children"""
    node = await db.entity_tree.find_one(
        {"id": entity_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not node:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Get children
    children = await db.entity_tree.find(
        {"parent_entity_id": entity_id, "user_id": current_user['id']},
        {"_id": 0}
    ).to_list(100)
    
    node['children'] = children
    node['children_count'] = len(children)
    
    return node

@api_router.put("/entity-tree/nodes/{entity_id}")
async def update_entity_tree_node(
    entity_id: str,
    data: EntityTreeNodeUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an entity node"""
    node = await db.entity_tree.find_one({
        "id": entity_id,
        "user_id": current_user['id']
    })
    if not node:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No data to update")
    
    # Validate new parent if changing
    if 'parent_entity_id' in update_data and update_data['parent_entity_id']:
        # Prevent circular reference
        if update_data['parent_entity_id'] == entity_id:
            raise HTTPException(status_code=400, detail="Cannot set entity as its own parent")
        parent = await db.entity_tree.find_one({
            "id": update_data['parent_entity_id'],
            "user_id": current_user['id']
        })
        if not parent:
            raise HTTPException(status_code=400, detail="Parent entity not found")
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.entity_tree.update_one({"id": entity_id}, {"$set": update_data})
    return {"message": "Entity updated", "id": entity_id}

@api_router.delete("/entity-tree/nodes/{entity_id}")
async def delete_entity_tree_node(entity_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an entity (soft delete - marks as inactive)"""
    node = await db.entity_tree.find_one({
        "id": entity_id,
        "user_id": current_user['id']
    })
    if not node:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Check for children
    children_count = await db.entity_tree.count_documents({
        "parent_entity_id": entity_id,
        "is_active": True
    })
    if children_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete entity with {children_count} active children. Reassign or delete children first."
        )
    
    # Soft delete
    await db.entity_tree.update_one(
        {"id": entity_id},
        {"$set": {"is_active": False, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Entity deleted (deactivated)", "id": entity_id}

@api_router.post("/entity-tree/bulk-import")
async def bulk_import_entities(
    entities: List[EntityTreeNodeCreate],
    current_user: dict = Depends(get_current_user)
):
    """Bulk import entities from Excel or other source"""
    created = []
    errors = []
    
    for entity_data in entities:
        try:
            # Check for duplicate
            existing = await db.entity_tree.find_one({
                "user_id": current_user['id'],
                "entity_code": entity_data.entity_code
            })
            if existing:
                errors.append({"code": entity_data.entity_code, "error": "Already exists"})
                continue
            
            node = EntityTreeNode(
                user_id=current_user['id'],
                **entity_data.model_dump()
            )
            node_dict = node.model_dump()
            node_dict['created_at'] = node_dict['created_at'].isoformat()
            
            await db.entity_tree.insert_one(node_dict)
            created.append(entity_data.entity_code)
        except Exception as e:
            errors.append({"code": entity_data.entity_code, "error": str(e)})
    
    return {
        "message": f"Imported {len(created)} entities",
        "created": created,
        "errors": errors,
        "total_attempted": len(entities)
    }

@api_router.get("/entity-tree/statistics")
async def get_entity_tree_statistics(current_user: dict = Depends(get_current_user)):
    """Get statistics about the entity tree"""
    nodes = await db.entity_tree.find(
        {"user_id": current_user['id'], "is_active": True},
        {"_id": 0}
    ).to_list(500)
    
    # Aggregate statistics
    by_type = {}
    by_currency = {}
    by_region = {}
    by_segment = {}
    total_data_health = 0
    connected_erps = 0
    
    for node in nodes:
        # By type
        entity_type = node.get('entity_type', 'standalone')
        by_type[entity_type] = by_type.get(entity_type, 0) + 1
        
        # By currency
        currency = node.get('local_currency', 'USD')
        by_currency[currency] = by_currency.get(currency, 0) + 1
        
        # By region
        region = node.get('region', 'Unassigned')
        by_region[region] = by_region.get(region, 0) + 1
        
        # By segment
        segment = node.get('segment', 'Unassigned')
        by_segment[segment] = by_segment.get(segment, 0) + 1
        
        # Data health
        total_data_health += node.get('data_health_pct', 0)
        
        # ERP connections
        if node.get('erp_connection_status') == 'connected':
            connected_erps += 1
    
    total_entities = len(nodes)
    avg_data_health = total_data_health / total_entities if total_entities > 0 else 0
    
    return {
        "total_entities": total_entities,
        "by_type": by_type,
        "by_currency": by_currency,
        "by_region": by_region,
        "by_segment": by_segment,
        "avg_data_health_pct": round(avg_data_health, 1),
        "connected_erps": connected_erps,
        "max_supported_entities": 500
    }

# ======================= COA MAPPING ENGINE (Story 2) =======================

@api_router.get("/coa/group-schema")
async def get_group_schema():
    """Get the standard Group Schema categories"""
    return {
        "categories": GROUP_SCHEMA_CATEGORIES,
        "required_categories": [k for k, v in GROUP_SCHEMA_CATEGORIES.items() if v.get('is_required')],
        "optional_categories": [k for k, v in GROUP_SCHEMA_CATEGORIES.items() if not v.get('is_required')]
    }

@api_router.get("/coa/erp-defaults/{provider}")
async def get_erp_default_mappings(provider: str):
    """Get default COA mappings for a specific ERP provider"""
    provider_lower = provider.lower()
    if provider_lower not in DEFAULT_ERP_MAPPINGS:
        raise HTTPException(status_code=404, detail=f"No default mappings for provider: {provider}")
    
    mappings = DEFAULT_ERP_MAPPINGS[provider_lower]
    return {
        "provider": provider_lower,
        "mappings": mappings,
        "mapped_count": len(mappings),
        "group_categories": list(set(mappings.values()))
    }

@api_router.get("/coa/mappings/{entity_id}")
async def get_entity_coa_mapping(entity_id: str, current_user: dict = Depends(get_current_user)):
    """Get COA mapping template for an entity"""
    mapping = await db.coa_mappings.find_one(
        {"entity_id": entity_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    
    if not mapping:
        # Return empty template
        entity = await db.entity_tree.find_one({"id": entity_id}, {"_id": 0})
        return {
            "entity_id": entity_id,
            "entity_name": entity.get('name') if entity else 'Unknown',
            "erp_provider": entity.get('erp_provider') if entity else None,
            "mappings": [],
            "unmapped_accounts": [],
            "is_complete": False,
            "completion_pct": 0.0,
            "required_missing": list(GROUP_SCHEMA_CATEGORIES.keys())
        }
    
    # Calculate missing required categories
    mapped_categories = set(m.get('group_category') for m in mapping.get('mappings', []))
    required = [k for k, v in GROUP_SCHEMA_CATEGORIES.items() if v.get('is_required')]
    missing_required = [r for r in required if r not in mapped_categories]
    
    mapping['required_missing'] = missing_required
    return mapping

@api_router.post("/coa/mappings")
async def create_coa_mapping(data: COAMappingCreate, current_user: dict = Depends(get_current_user)):
    """Create or update COA mapping for an entity"""
    # Verify entity exists
    entity = await db.entity_tree.find_one({
        "id": data.entity_id,
        "user_id": current_user['id']
    })
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Calculate completion
    mapped_categories = set(m.get('group_category') for m in data.mappings)
    required = [k for k, v in GROUP_SCHEMA_CATEGORIES.items() if v.get('is_required')]
    required_mapped = len([r for r in required if r in mapped_categories])
    completion_pct = (required_mapped / len(required) * 100) if required else 100
    
    mapping_template = COAMappingTemplate(
        user_id=current_user['id'],
        entity_id=data.entity_id,
        erp_provider=data.erp_provider,
        mappings=data.mappings,
        is_complete=completion_pct >= 100,
        completion_pct=round(completion_pct, 1)
    )
    
    mapping_dict = mapping_template.model_dump()
    mapping_dict['created_at'] = mapping_dict['created_at'].isoformat()
    
    # Upsert
    await db.coa_mappings.update_one(
        {"entity_id": data.entity_id, "user_id": current_user['id']},
        {"$set": mapping_dict},
        upsert=True
    )
    
    # Update entity data health
    await db.entity_tree.update_one(
        {"id": data.entity_id},
        {"$set": {
            "data_health_pct": completion_pct,
            "missing_mappings": [r for r in required if r not in mapped_categories]
        }}
    )
    
    return {
        "message": "COA mapping saved",
        "entity_id": data.entity_id,
        "completion_pct": round(completion_pct, 1),
        "is_complete": completion_pct >= 100
    }

@api_router.put("/coa/mappings/{entity_id}")
async def update_coa_mapping(
    entity_id: str,
    data: COAMappingUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update COA mapping for an entity"""
    mapping = await db.coa_mappings.find_one({
        "entity_id": entity_id,
        "user_id": current_user['id']
    })
    if not mapping:
        raise HTTPException(status_code=404, detail="Mapping not found for this entity")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Recalculate completion if mappings changed
    if 'mappings' in update_data:
        mapped_categories = set(m.get('group_category') for m in update_data['mappings'])
        required = [k for k, v in GROUP_SCHEMA_CATEGORIES.items() if v.get('is_required')]
        required_mapped = len([r for r in required if r in mapped_categories])
        completion_pct = (required_mapped / len(required) * 100) if required else 100
        update_data['completion_pct'] = round(completion_pct, 1)
        update_data['is_complete'] = completion_pct >= 100
        
        # Update entity data health
        await db.entity_tree.update_one(
            {"id": entity_id},
            {"$set": {
                "data_health_pct": completion_pct,
                "missing_mappings": [r for r in required if r not in mapped_categories]
            }}
        )
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.coa_mappings.update_one(
        {"entity_id": entity_id, "user_id": current_user['id']},
        {"$set": update_data}
    )
    
    return {"message": "COA mapping updated", "entity_id": entity_id}

@api_router.post("/coa/mappings/{entity_id}/apply-defaults")
async def apply_default_coa_mappings(entity_id: str, current_user: dict = Depends(get_current_user)):
    """Apply default ERP mappings to an entity"""
    entity = await db.entity_tree.find_one({
        "id": entity_id,
        "user_id": current_user['id']
    })
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    erp_provider = entity.get('erp_provider', 'manual')
    if not erp_provider or erp_provider not in DEFAULT_ERP_MAPPINGS:
        erp_provider = 'manual'
    
    default_mappings = DEFAULT_ERP_MAPPINGS.get(erp_provider, {})
    
    # Convert to mapping format
    mappings = [
        {
            "local_account_code": code,
            "local_account_name": f"Account {code}",
            "group_category": category,
            "is_verified": False
        }
        for code, category in default_mappings.items()
    ]
    
    # Calculate completion
    mapped_categories = set(m['group_category'] for m in mappings)
    required = [k for k, v in GROUP_SCHEMA_CATEGORIES.items() if v.get('is_required')]
    required_mapped = len([r for r in required if r in mapped_categories])
    completion_pct = (required_mapped / len(required) * 100) if required else 100
    
    mapping_dict = {
        "id": str(uuid.uuid4()),
        "user_id": current_user['id'],
        "entity_id": entity_id,
        "erp_provider": erp_provider,
        "mappings": mappings,
        "is_complete": completion_pct >= 100,
        "completion_pct": round(completion_pct, 1),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.coa_mappings.update_one(
        {"entity_id": entity_id, "user_id": current_user['id']},
        {"$set": mapping_dict},
        upsert=True
    )
    
    return {
        "message": "Default mappings applied",
        "entity_id": entity_id,
        "provider": erp_provider,
        "mappings_count": len(mappings),
        "completion_pct": round(completion_pct, 1)
    }

# ======================= DATA GOVERNANCE (Story 3) =======================

@api_router.get("/data-governance/health")
async def get_data_health_overview(current_user: dict = Depends(get_current_user)):
    """Get overall data health status across all entities"""
    entities = await db.entity_tree.find(
        {"user_id": current_user['id'], "is_active": True},
        {"_id": 0}
    ).to_list(500)
    
    total_entities = len(entities)
    if total_entities == 0:
        return {
            "overall_health_pct": 0,
            "status": "incomplete",
            "total_entities": 0,
            "entities_complete": 0,
            "entities_partial": 0,
            "entities_incomplete": 0,
            "alerts": [],
            "can_consolidate": False
        }
    
    # Categorize entities by health
    complete = [e for e in entities if e.get('data_health_pct', 0) >= 100]
    partial = [e for e in entities if 50 <= e.get('data_health_pct', 0) < 100]
    incomplete = [e for e in entities if e.get('data_health_pct', 0) < 50]
    
    # Calculate overall health
    total_health = sum(e.get('data_health_pct', 0) for e in entities)
    overall_health = total_health / total_entities
    
    # Generate alerts
    alerts = []
    for entity in entities:
        missing = entity.get('missing_mappings', [])
        if missing:
            alerts.append({
                "entity_id": entity['id'],
                "entity_name": entity.get('name', 'Unknown'),
                "alert_type": "missing_mapping",
                "severity": "high" if len(missing) > 5 else "medium",
                "missing_categories": missing[:5],  # Limit to first 5
                "message": f"Missing {len(missing)} required category mappings"
            })
    
    # Check if consolidation is possible
    required_config = await db.required_categories.find_one(
        {"user_id": current_user['id']},
        {"_id": 0}
    )
    strict_mode = required_config.get('is_strict_mode', False) if required_config else False
    can_consolidate = not strict_mode or len(incomplete) == 0
    
    return {
        "overall_health_pct": round(overall_health, 1),
        "status": "complete" if overall_health >= 100 else ("partial" if overall_health >= 50 else "incomplete"),
        "total_entities": total_entities,
        "entities_complete": len(complete),
        "entities_partial": len(partial),
        "entities_incomplete": len(incomplete),
        "alerts": alerts[:20],  # Limit alerts
        "alerts_count": len(alerts),
        "can_consolidate": can_consolidate,
        "strict_mode": strict_mode
    }

@api_router.get("/data-governance/alerts")
async def get_data_governance_alerts(
    severity: Optional[str] = None,
    entity_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all data governance alerts"""
    entities = await db.entity_tree.find(
        {"user_id": current_user['id'], "is_active": True},
        {"_id": 0}
    ).to_list(500)
    
    alerts = []
    for entity in entities:
        if entity_id and entity['id'] != entity_id:
            continue
            
        missing = entity.get('missing_mappings', [])
        entity_health = entity.get('data_health_pct', 0)
        
        # Missing mapping alerts
        if missing:
            alert_severity = "high" if len(missing) > 5 else "medium"
            if severity and alert_severity != severity:
                continue
            alerts.append({
                "id": f"alert_{entity['id']}_mapping",
                "entity_id": entity['id'],
                "entity_name": entity.get('name', 'Unknown'),
                "entity_code": entity.get('entity_code', ''),
                "alert_type": "missing_mapping",
                "severity": alert_severity,
                "missing_categories": missing,
                "message": f"Missing {len(missing)} required category mappings",
                "is_blocking": alert_severity == "high",
                "data_health_pct": entity_health,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        
        # Stale data alerts (no sync in 7 days)
        last_sync = entity.get('last_sync_at')
        if entity.get('erp_connection_status') == 'connected' and last_sync:
            if isinstance(last_sync, str):
                last_sync = datetime.fromisoformat(last_sync.replace('Z', '+00:00'))
            days_since_sync = (datetime.now(timezone.utc) - last_sync).days
            if days_since_sync > 7:
                if severity and severity != 'low':
                    continue
                alerts.append({
                    "id": f"alert_{entity['id']}_stale",
                    "entity_id": entity['id'],
                    "entity_name": entity.get('name', 'Unknown'),
                    "entity_code": entity.get('entity_code', ''),
                    "alert_type": "stale_data",
                    "severity": "low",
                    "message": f"Data not synced for {days_since_sync} days",
                    "is_blocking": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
    
    return {
        "alerts": alerts,
        "total_count": len(alerts),
        "high_severity": len([a for a in alerts if a['severity'] == 'high']),
        "medium_severity": len([a for a in alerts if a['severity'] == 'medium']),
        "low_severity": len([a for a in alerts if a['severity'] == 'low'])
    }

@api_router.get("/data-governance/required-categories")
async def get_required_categories(current_user: dict = Depends(get_current_user)):
    """Get admin-configured required categories"""
    config = await db.required_categories.find_one(
        {"user_id": current_user['id']},
        {"_id": 0}
    )
    
    if not config:
        # Return defaults
        return {
            "categories": [k for k, v in GROUP_SCHEMA_CATEGORIES.items() if v.get('is_required')],
            "is_strict_mode": False,
            "available_categories": list(GROUP_SCHEMA_CATEGORIES.keys())
        }
    
    return {
        "categories": config.get('categories', []),
        "is_strict_mode": config.get('is_strict_mode', False),
        "available_categories": list(GROUP_SCHEMA_CATEGORIES.keys())
    }

@api_router.post("/data-governance/required-categories")
async def set_required_categories(data: dict, current_user: dict = Depends(get_current_user)):
    """Set admin-configured required categories"""
    categories = data.get('categories', [])
    is_strict_mode = data.get('is_strict_mode', False)
    
    # Validate categories
    valid_categories = [c for c in categories if c in GROUP_SCHEMA_CATEGORIES]
    
    config_dict = {
        "id": str(uuid.uuid4()),
        "user_id": current_user['id'],
        "categories": valid_categories,
        "is_strict_mode": is_strict_mode,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.required_categories.update_one(
        {"user_id": current_user['id']},
        {"$set": config_dict},
        upsert=True
    )
    
    return {
        "message": "Required categories updated",
        "categories": valid_categories,
        "is_strict_mode": is_strict_mode
    }

# ======================= ADJUSTMENT JOURNALS (Excel Parity) =======================

@api_router.get("/adjustment-journals")
async def get_adjustment_journals(
    group_id: Optional[str] = None,
    entity_id: Optional[str] = None,
    period: Optional[str] = None,
    is_posted: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get adjustment journals"""
    query = {"user_id": current_user['id']}
    if group_id:
        query["group_id"] = group_id
    if entity_id:
        query["entity_id"] = entity_id
    if period:
        query["period"] = period
    if is_posted is not None:
        query["is_posted"] = is_posted
    
    journals = await db.adjustment_journals.find(query, {"_id": 0}).sort("created_at", -1).to_list(200)
    return journals

@api_router.post("/adjustment-journals")
async def create_adjustment_journal(
    data: AdjustmentJournalCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create an adjustment journal entry"""
    # Calculate totals
    total_debit = sum(e.get('debit', 0) for e in data.entries)
    total_credit = sum(e.get('credit', 0) for e in data.entries)
    is_balanced = abs(total_debit - total_credit) < 0.01
    
    journal = AdjustmentJournal(
        user_id=current_user['id'],
        group_id=data.group_id,
        entity_id=data.entity_id,
        journal_type=data.journal_type,
        period=data.period,
        description=data.description,
        entries=data.entries,
        total_debit=round(total_debit, 2),
        total_credit=round(total_credit, 2),
        is_balanced=is_balanced
    )
    
    journal_dict = journal.model_dump()
    journal_dict['created_at'] = journal_dict['created_at'].isoformat()
    
    await db.adjustment_journals.insert_one(journal_dict)
    journal_dict.pop('_id', None)
    
    return {
        "message": "Adjustment journal created",
        "journal": journal_dict,
        "is_balanced": is_balanced,
        "warning": None if is_balanced else "Journal is not balanced!"
    }

@api_router.get("/adjustment-journals/{journal_id}")
async def get_adjustment_journal(journal_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single adjustment journal"""
    journal = await db.adjustment_journals.find_one(
        {"id": journal_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    return journal

@api_router.put("/adjustment-journals/{journal_id}")
async def update_adjustment_journal(
    journal_id: str,
    data: AdjustmentJournalUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an adjustment journal"""
    journal = await db.adjustment_journals.find_one({
        "id": journal_id,
        "user_id": current_user['id']
    })
    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    
    if journal.get('is_posted') and not data.is_posted:
        raise HTTPException(status_code=400, detail="Cannot unpost a posted journal")
    
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    # Recalculate if entries changed
    if 'entries' in update_data:
        total_debit = sum(e.get('debit', 0) for e in update_data['entries'])
        total_credit = sum(e.get('credit', 0) for e in update_data['entries'])
        update_data['total_debit'] = round(total_debit, 2)
        update_data['total_credit'] = round(total_credit, 2)
        update_data['is_balanced'] = abs(total_debit - total_credit) < 0.01
    
    # Handle posting
    if update_data.get('is_posted') and not journal.get('is_posted'):
        update_data['posted_at'] = datetime.now(timezone.utc).isoformat()
        update_data['posted_by'] = current_user['id']
    
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.adjustment_journals.update_one({"id": journal_id}, {"$set": update_data})
    return {"message": "Journal updated", "id": journal_id}

@api_router.delete("/adjustment-journals/{journal_id}")
async def delete_adjustment_journal(journal_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an adjustment journal (only if not posted)"""
    journal = await db.adjustment_journals.find_one({
        "id": journal_id,
        "user_id": current_user['id']
    })
    if not journal:
        raise HTTPException(status_code=404, detail="Journal not found")
    
    if journal.get('is_posted'):
        raise HTTPException(status_code=400, detail="Cannot delete a posted journal")
    
    await db.adjustment_journals.delete_one({"id": journal_id})
    return {"message": "Journal deleted"}

@api_router.get("/adjustment-journals/types/list")
async def get_adjustment_journal_types():
    """Get available journal types"""
    return {
        "types": [
            {"value": "manual_accrual", "label": "Manual Accrual", "description": "Group-level accruals"},
            {"value": "intercompany_elim", "label": "Intercompany Elimination", "description": "Eliminate IC transactions"},
            {"value": "fx_adjustment", "label": "FX Adjustment", "description": "Currency translation adjustments"},
            {"value": "reclassification", "label": "Reclassification", "description": "Reclassify between accounts"},
            {"value": "consolidation_adj", "label": "Consolidation Adjustment", "description": "General consolidation entries"},
            {"value": "custom", "label": "Custom", "description": "Other adjustments"}
        ]
    }

# ======================= ERP INTEGRATION FRAMEWORK =======================

@api_router.get("/erp/providers")
async def get_erp_providers():
    """Get supported ERP providers"""
    return {
        "providers": [
            {"value": "sage", "name": "Sage", "description": "Sage Business Cloud, Sage 50, Sage Intacct", "has_api": True},
            {"value": "netsuite", "name": "NetSuite", "description": "Oracle NetSuite ERP", "has_api": True},
            {"value": "quickbooks", "name": "QuickBooks", "description": "QuickBooks Online", "has_api": True},
            {"value": "xero", "name": "Xero", "description": "Xero Cloud Accounting", "has_api": True},
            {"value": "oracle", "name": "Oracle", "description": "Oracle Financials Cloud", "has_api": True},
            {"value": "sap", "name": "SAP", "description": "SAP S/4HANA, SAP Business One", "has_api": True},
            {"value": "excel", "name": "Excel Import", "description": "Manual Excel upload", "has_api": False},
            {"value": "manual", "name": "Manual Entry", "description": "Direct data entry", "has_api": False}
        ]
    }

@api_router.get("/erp/connections")
async def get_erp_connections(
    entity_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get ERP connections"""
    query = {"user_id": current_user['id']}
    if entity_id:
        query["entity_id"] = entity_id
    
    connections = await db.erp_connections.find(query, {"_id": 0}).to_list(200)
    return connections

@api_router.post("/erp/connections")
async def create_erp_connection(
    data: ERPConnectionCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create an ERP connection for an entity"""
    # Verify entity
    entity = await db.entity_tree.find_one({
        "id": data.entity_id,
        "user_id": current_user['id']
    })
    if not entity:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    connection = ERPConnection(
        user_id=current_user['id'],
        entity_id=data.entity_id,
        provider=data.provider,
        api_url=data.api_url,
        client_id=data.client_id,
        auto_sync=data.auto_sync,
        sync_frequency=data.sync_frequency,
        status=ERPConnectionStatus.PENDING
    )
    
    conn_dict = connection.model_dump()
    conn_dict['created_at'] = conn_dict['created_at'].isoformat()
    
    await db.erp_connections.insert_one(conn_dict)
    
    # Update entity
    await db.entity_tree.update_one(
        {"id": data.entity_id},
        {"$set": {
            "erp_provider": data.provider,
            "erp_connection_status": "pending"
        }}
    )
    
    conn_dict.pop('_id', None)
    return {"message": "ERP connection created", "connection": conn_dict}

@api_router.post("/erp/connections/{connection_id}/test")
async def test_erp_connection(connection_id: str, current_user: dict = Depends(get_current_user)):
    """Test an ERP connection (mock implementation)"""
    connection = await db.erp_connections.find_one({
        "id": connection_id,
        "user_id": current_user['id']
    })
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    # Mock test - in real implementation, would call ERP API
    import random
    success = random.choice([True, True, True, False])  # 75% success rate for demo
    
    new_status = "connected" if success else "error"
    await db.erp_connections.update_one(
        {"id": connection_id},
        {"$set": {"status": new_status}}
    )
    
    await db.entity_tree.update_one(
        {"id": connection['entity_id']},
        {"$set": {"erp_connection_status": new_status}}
    )
    
    return {
        "success": success,
        "message": "Connection successful" if success else "Connection failed - check credentials",
        "status": new_status
    }

@api_router.post("/erp/connections/{connection_id}/sync")
async def sync_erp_data(connection_id: str, current_user: dict = Depends(get_current_user)):
    """Sync data from ERP (mock implementation)"""
    connection = await db.erp_connections.find_one({
        "id": connection_id,
        "user_id": current_user['id']
    })
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    if connection.get('status') != 'connected':
        raise HTTPException(status_code=400, detail="ERP not connected. Test connection first.")
    
    # Mock sync - generate mock data
    entity = await db.entity_tree.find_one({"id": connection['entity_id']})
    mock_data = generate_mock_entity_financials(
        connection['entity_id'],
        entity.get('name', 'Unknown'),
        entity.get('local_currency', 'USD')
    )
    
    # Store mock financial data
    mock_data['synced_at'] = datetime.now(timezone.utc).isoformat()
    mock_data['connection_id'] = connection_id
    
    await db.entity_financials.update_one(
        {"entity_id": connection['entity_id']},
        {"$set": mock_data},
        upsert=True
    )
    
    # Update connection
    await db.erp_connections.update_one(
        {"id": connection_id},
        {"$set": {
            "last_sync_at": datetime.now(timezone.utc).isoformat(),
            "last_sync_status": "success",
            "last_sync_records": len(mock_data['financials'])
        }}
    )
    
    # Update entity
    await db.entity_tree.update_one(
        {"id": connection['entity_id']},
        {"$set": {
            "last_sync_at": datetime.now(timezone.utc).isoformat(),
            "data_health_pct": 85.0  # Mock - would calculate based on actual data
        }}
    )
    
    return {
        "message": "Sync completed",
        "entity_id": connection['entity_id'],
        "records_synced": len(mock_data['financials']),
        "synced_at": mock_data['synced_at']
    }

@api_router.delete("/erp/connections/{connection_id}")
async def delete_erp_connection(connection_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an ERP connection"""
    connection = await db.erp_connections.find_one({
        "id": connection_id,
        "user_id": current_user['id']
    })
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    await db.erp_connections.delete_one({"id": connection_id})
    
    # Update entity
    await db.entity_tree.update_one(
        {"id": connection['entity_id']},
        {"$set": {
            "erp_provider": None,
            "erp_connection_status": "disconnected"
        }}
    )
    
    return {"message": "Connection deleted"}

# ======================= CONSOLIDATED AGGREGATION WITH DATA HEALTH =======================

class AggregationRequest(BaseModel):
    entity_ids: List[str]
    reporting_currency: str = "USD"
    period: str = "current"
    include_adjustments: bool = True

@api_router.post("/consolidation/aggregate")
async def aggregate_entities(
    data: AggregationRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Aggregate financial data from multiple entities with real-time FX conversion.
    This is the core "True View" consolidation endpoint.
    """
    entity_ids = data.entity_ids
    reporting_currency = data.reporting_currency
    period = data.period
    include_adjustments = data.include_adjustments
    
    if not entity_ids:
        raise HTTPException(status_code=400, detail="At least one entity required")
    
    # Verify entities and check data health
    entities = []
    missing_data_entities = []
    total_health = 0
    
    for entity_id in entity_ids:
        entity = await db.entity_tree.find_one({
            "id": entity_id,
            "user_id": current_user['id'],
            "is_active": True
        }, {"_id": 0})
        
        if not entity:
            continue
        
        entities.append(entity)
        total_health += entity.get('data_health_pct', 0)
        
        if entity.get('data_health_pct', 0) < 50:
            missing_data_entities.append({
                "id": entity['id'],
                "name": entity.get('name'),
                "health_pct": entity.get('data_health_pct', 0),
                "missing": entity.get('missing_mappings', [])[:3]
            })
    
    if not entities:
        raise HTTPException(status_code=400, detail="No valid entities found")
    
    # Check data governance rules
    required_config = await db.required_categories.find_one({"user_id": current_user['id']})
    strict_mode = required_config.get('is_strict_mode', False) if required_config else False
    
    if strict_mode and missing_data_entities:
        return {
            "error": "consolidation_blocked",
            "message": "Consolidation blocked due to incomplete data in strict mode",
            "incomplete_entities": missing_data_entities,
            "data_health_pct": round(total_health / len(entities), 1) if entities else 0
        }
    
    # Fetch FX rates
    try:
        fx_response = await fetch_fx_rates_internal(reporting_currency)
        fx_rates = fx_response.get('rates', {})
    except Exception:
        fx_rates = {"USD": 1.0, "EUR": 0.92, "GBP": 0.79}  # Fallback
    
    # Aggregate financials
    aggregated = {k: 0.0 for k in GROUP_SCHEMA_CATEGORIES.keys()}
    entity_breakdown = []
    
    for entity in entities:
        # Get entity financials
        financials = await db.entity_financials.find_one(
            {"entity_id": entity['id']},
            {"_id": 0}
        )
        
        if not financials:
            # Generate mock data
            financials = generate_mock_entity_financials(
                entity['id'],
                entity.get('name', 'Unknown'),
                entity.get('local_currency', 'USD')
            )
        
        local_currency = entity.get('local_currency', 'USD')
        fx_rate = fx_rates.get(local_currency, 1.0)
        if reporting_currency != 'EUR':
            # Convert through EUR
            reporting_fx = fx_rates.get(reporting_currency, 1.0)
            fx_rate = fx_rate / reporting_fx if reporting_fx else 1.0
        
        ownership_pct = entity.get('ownership_pct', 100.0) / 100.0
        
        # Convert and aggregate
        local_values = financials.get('financials', {})
        converted_values = {}
        
        for category, value in local_values.items():
            converted = value / fx_rate * ownership_pct
            converted_values[category] = round(converted, 2)
            aggregated[category] = aggregated.get(category, 0) + converted
        
        entity_breakdown.append({
            "entity_id": entity['id'],
            "entity_name": entity.get('name'),
            "entity_code": entity.get('entity_code'),
            "entity_type": entity.get('entity_type'),
            "local_currency": local_currency,
            "fx_rate": round(1/fx_rate if fx_rate else 1, 4),
            "ownership_pct": entity.get('ownership_pct', 100.0),
            "data_health_pct": entity.get('data_health_pct', 0),
            "local_values": local_values,
            "converted_values": converted_values
        })
    
    # Apply adjustment journals if requested
    adjustments_applied = []
    if include_adjustments:
        journals = await db.adjustment_journals.find({
            "user_id": current_user['id'],
            "is_posted": True,
            "period": period
        }, {"_id": 0}).to_list(100)
        
        for journal in journals:
            for entry in journal.get('entries', []):
                category = entry.get('account_category')
                if category in aggregated:
                    aggregated[category] += entry.get('debit', 0) - entry.get('credit', 0)
            adjustments_applied.append({
                "id": journal['id'],
                "description": journal.get('description'),
                "type": journal.get('journal_type')
            })
    
    # Round aggregated values
    aggregated = {k: round(v, 2) for k, v in aggregated.items()}
    
    # Calculate overall data health
    overall_health = total_health / len(entities) if entities else 0
    
    return {
        "reporting_currency": reporting_currency,
        "period": period,
        "entity_count": len(entities),
        "data_health_pct": round(overall_health, 1),
        "data_health_status": "complete" if overall_health >= 100 else ("partial" if overall_health >= 50 else "incomplete"),
        "data_health_warning": f"{len(missing_data_entities)} entities have incomplete data" if missing_data_entities else None,
        "aggregated_financials": aggregated,
        "entity_breakdown": entity_breakdown,
        "fx_rates_used": {e.get('local_currency'): round(1/fx_rates.get(e.get('local_currency', 'USD'), 1), 4) for e in entities},
        "adjustments_applied": adjustments_applied,
        "consolidated_at": datetime.now(timezone.utc).isoformat()
    }

# Helper function for FX rates (reuse existing)
async def fetch_fx_rates_internal(base_currency: str = "EUR") -> dict:
    """Internal helper to fetch FX rates"""
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"https://api.frankfurter.app/latest?from={base_currency}")
            if response.status_code == 200:
                data = response.json()
                return {
                    "base": base_currency,
                    "rates": data.get('rates', {}),
                    "source": "Frankfurter (ECB)"
                }
    except Exception:
        pass
    return {"base": base_currency, "rates": {}, "source": "fallback"}

# ======================= REFERENCE DATA ENDPOINTS =======================

@api_router.get("/reference/countries")
async def get_countries():
    """Get list of countries with their global regions from database"""
    countries = await db.countries.find(
        {"is_active": True},
        {"_id": 0, "name": 1, "code": 1, "region": 1, "default_currency": 1}
    ).sort("name", 1).to_list(300)
    
    # Transform to match expected frontend format
    return [
        {
            "country": c["name"],
            "code": c["code"],
            "region": c["region"],
            "default_currency": c["default_currency"]
        }
        for c in countries
    ]

@api_router.get("/reference/currencies")
async def get_currencies():
    """Get list of ISO currency codes with symbols from database"""
    currencies = await db.currencies.find(
        {"is_active": True},
        {"_id": 0, "code": 1, "name": 1, "symbol": 1, "decimal_places": 1}
    ).sort("code", 1).to_list(200)
    return currencies

@api_router.get("/reference/currency/{code}")
async def get_currency_by_code(code: str):
    """Get single currency by ISO code"""
    currency = await db.currencies.find_one(
        {"code": code.upper(), "is_active": True},
        {"_id": 0}
    )
    if not currency:
        raise HTTPException(status_code=404, detail=f"Currency {code} not found")
    return currency

@api_router.get("/reference/regions")
async def get_regions():
    """Get list of unique global regions"""
    regions = await db.entity_groups_master.find(
        {"is_system": True},
        {"_id": 0, "name": 1, "description": 1, "region_code": 1, "reporting_currency": 1}
    ).to_list(10)
    
    if regions:
        return regions
    # Fallback if no system groups exist
    return [
        {"name": "APAC", "description": "Asia-Pacific Region", "region_code": "APAC", "reporting_currency": "USD"},
        {"name": "EMEA", "description": "Europe, Middle East and Africa", "region_code": "EMEA", "reporting_currency": "EUR"},
        {"name": "Americas", "description": "North, Central and South America", "region_code": "Americas", "reporting_currency": "USD"}
    ]

# ======================= USER PREFERENCES =======================

@api_router.get("/user/consolidated-currency")
async def get_consolidated_currency(current_user: dict = Depends(get_current_user)):
    """Get user's preferred currency for consolidated view"""
    prefs = await db.user_preferences.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if prefs and "consolidated_currency" in prefs:
        return {"consolidated_currency": prefs["consolidated_currency"]}
    return {"consolidated_currency": "USD"}

@api_router.put("/user/consolidated-currency")
async def set_consolidated_currency(data: dict, current_user: dict = Depends(get_current_user)):
    """Set user's preferred currency for consolidated view"""
    currency = data.get("consolidated_currency", "USD")
    await db.user_preferences.update_one(
        {"user_id": current_user["id"]},
        {"$set": {"consolidated_currency": currency}},
        upsert=True
    )
    return {"consolidated_currency": currency, "message": "Consolidated currency updated successfully"}

# ======================= HEALTH CHECK =======================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
