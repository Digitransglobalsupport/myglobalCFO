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

# ======================= COMPANY ROUTES =======================

@api_router.post("/companies", response_model=Company)
async def create_company(company_data: CompanyCreate, current_user: dict = Depends(get_current_user)):
    company = Company(
        user_id=current_user['id'],
        **company_data.model_dump()
    )
    
    company_dict = company.model_dump()
    company_dict['created_at'] = company_dict['created_at'].isoformat()
    
    await db.companies.insert_one(company_dict)
    return company

@api_router.get("/companies", response_model=List[Company])
async def get_companies(current_user: dict = Depends(get_current_user)):
    companies = await db.companies.find(
        {"user_id": current_user['id']}, 
        {"_id": 0}
    ).to_list(100)
    
    for c in companies:
        if isinstance(c.get('created_at'), str):
            c['created_at'] = datetime.fromisoformat(c['created_at'])
    
    return companies

@api_router.get("/companies/{company_id}", response_model=Company)
async def get_company(company_id: str, current_user: dict = Depends(get_current_user)):
    company = await db.companies.find_one(
        {"id": company_id, "user_id": current_user['id']},
        {"_id": 0}
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    if isinstance(company.get('created_at'), str):
        company['created_at'] = datetime.fromisoformat(company['created_at'])
    
    return company

@api_router.delete("/companies/{company_id}")
async def delete_company(company_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.companies.delete_one({"id": company_id, "user_id": current_user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Also delete related transactions
    await db.transactions.delete_many({"company_id": company_id})
    
    return {"message": "Company deleted"}

# ======================= TRANSACTION ROUTES =======================

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(tx_data: TransactionCreate, current_user: dict = Depends(get_current_user)):
    # Verify company ownership
    company = await db.companies.find_one({"id": tx_data.company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    tx_dict_data = tx_data.model_dump()
    
    # Auto-populate currency fields from company if not provided
    if not tx_dict_data.get('transaction_currency'):
        tx_dict_data['transaction_currency'] = company.get('currency', 'GBP')
    if not tx_dict_data.get('reporting_currency'):
        tx_dict_data['reporting_currency'] = company.get('reporting_currency') or company.get('currency', 'GBP')
    
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
    # Get user's companies
    companies = await db.companies.find(
        {"user_id": current_user['id']},
        {"id": 1}
    ).to_list(100)
    company_ids = [c['id'] for c in companies]
    
    query = {"company_id": {"$in": company_ids}}
    
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
    companies = await db.companies.find(
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
    company = await db.companies.find_one({"id": company_id, "user_id": current_user['id']})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    await db.transactions.delete_many({"company_id": company_id})
    return {"message": "All transactions deleted"}

# ======================= DASHBOARD ROUTES =======================

@api_router.get("/dashboard/{company_id}", response_model=DashboardMetrics)
async def get_dashboard(company_id: str, current_user: dict = Depends(get_current_user)):
    # Verify company ownership
    company = await db.companies.find_one({"id": company_id, "user_id": current_user['id']})
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
    companies = await db.companies.find(
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
    company = await db.companies.find_one({"id": company_id, "user_id": current_user['id']})
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
    company = await db.companies.find_one({"id": company_id, "user_id": current_user['id']})
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
    company = await db.companies.find_one({"id": data.company_id, "user_id": current_user['id']})
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
    companies_count = await db.companies.count_documents({"user_id": current_user['id']})
    
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
    company = await db.companies.find_one({"id": data.company_id, "user_id": current_user['id']})
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
    company = await db.companies.find_one({"id": data.company_id, "user_id": current_user['id']})
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

# Mock FX rates (in production, this would fetch from an API)
MOCK_FX_RATES = {
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

def get_fx_rate(from_currency: str, to_currency: str) -> float:
    """Get FX rate to convert from_currency to to_currency"""
    if from_currency == to_currency:
        return 1.0
    
    # Convert through USD as base
    from_rate = MOCK_FX_RATES.get(from_currency, 1.0)
    to_rate = MOCK_FX_RATES.get(to_currency, 1.0)
    
    return from_rate / to_rate

@api_router.get("/fx/rates")
async def get_fx_rates(base_currency: str = "USD"):
    """Get current FX rates relative to base currency"""
    base_rate = MOCK_FX_RATES.get(base_currency, 1.0)
    
    rates = {}
    for currency, rate in MOCK_FX_RATES.items():
        rates[currency] = round(rate / base_rate, 6)
    
    return {
        "base_currency": base_currency,
        "rates": rates,
        "as_of": datetime.now(timezone.utc).isoformat(),
        "source": "mock"  # Indicate this is mock data
    }

@api_router.get("/fx/convert")
async def convert_currency(
    amount: float,
    from_currency: str,
    to_currency: str
):
    """Convert amount from one currency to another"""
    rate = get_fx_rate(from_currency, to_currency)
    converted = amount * rate
    
    return {
        "original_amount": amount,
        "original_currency": from_currency,
        "converted_amount": round(converted, 2),
        "target_currency": to_currency,
        "fx_rate": round(rate, 6)
    }

# Consolidation Groups
@api_router.post("/consolidation/groups")
async def create_consolidation_group(data: ConsolidationGroupCreate, current_user: dict = Depends(get_current_user)):
    # Verify all entity_ids belong to user
    for entity_id in data.entity_ids:
        company = await db.companies.find_one({"id": entity_id, "user_id": current_user['id']})
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
            company = await db.companies.find_one({"id": entity_id}, {"_id": 0, "name": 1, "currency": 1, "country": 1})
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
        company = await db.companies.find_one({"id": entity_id}, {"_id": 0})
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
            company = await db.companies.find_one({"id": entity_id, "user_id": current_user['id']})
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
    
    # Initialize consolidated totals
    total_revenue = 0.0
    total_expenses = 0.0
    total_cash = 0.0
    total_ar = 0.0
    total_ap = 0.0
    entity_breakdown = []
    fx_rates_used = {}
    
    for entity_id in entity_ids:
        company = await db.companies.find_one({"id": entity_id}, {"_id": 0})
        if not company:
            continue
        
        local_currency = company.get('currency', 'USD')
        fx_rate = get_fx_rate(local_currency, reporting_currency)
        fx_rates_used[local_currency] = fx_rate
        
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
            "fx_rate": fx_rate,
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
    companies = await db.companies.find(
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
    company = await db.companies.find_one({"id": company_id, "user_id": current_user['id']})
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

# ======================= ROOT ROUTE =======================

@api_router.get("/")
async def root():
    return {"message": "MyGlobalCFO API v1.0.0", "status": "operational"}

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
