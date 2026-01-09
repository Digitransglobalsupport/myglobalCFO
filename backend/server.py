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

class Currency(str, Enum):
    GBP = "GBP"
    USD = "USD"
    EUR = "EUR"

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
    currency: Currency = Currency.GBP
    global_region: Optional[str] = None
    company_type: CompanyType = CompanyType.STANDALONE
    parent_company_id: Optional[str] = None

class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    country: str = "United Kingdom"
    currency: Currency = Currency.GBP
    global_region: Optional[str] = None
    company_type: CompanyType = CompanyType.STANDALONE
    parent_company_id: Optional[str] = None
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
    
    tx = Transaction(**tx_data.model_dump())
    
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

@api_router.post("/fpa/versions", response_model=PlanningVersion)
async def create_planning_version(data: PlanningVersionCreate, current_user: dict = Depends(get_current_user)):
    version = PlanningVersion(
        user_id=current_user['id'],
        **data.model_dump()
    )
    
    version_dict = version.model_dump()
    version_dict['created_at'] = version_dict['created_at'].isoformat()
    
    await db.planning_versions.insert_one(version_dict)
    return version

@api_router.get("/fpa/versions", response_model=List[PlanningVersion])
async def get_planning_versions(current_user: dict = Depends(get_current_user)):
    versions = await db.planning_versions.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).to_list(50)
    
    for v in versions:
        if isinstance(v.get('created_at'), str):
            v['created_at'] = datetime.fromisoformat(v['created_at'])
    
    return versions

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
        {"$set": {"is_locked": new_lock_state}}
    )
    
    return {"message": f"Version {'locked' if new_lock_state else 'unlocked'}", "is_locked": new_lock_state}

@api_router.delete("/fpa/versions/{version_id}")
async def delete_planning_version(version_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.planning_versions.delete_one({
        "id": version_id,
        "user_id": current_user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Version not found")
    
    return {"message": "Version deleted"}

# Drivers
@api_router.post("/fpa/drivers", response_model=Driver)
async def create_driver(data: DriverCreate, current_user: dict = Depends(get_current_user)):
    driver = Driver(
        user_id=current_user['id'],
        **data.model_dump()
    )
    
    driver_dict = driver.model_dump()
    driver_dict['created_at'] = driver_dict['created_at'].isoformat()
    
    await db.drivers.insert_one(driver_dict)
    return driver

@api_router.get("/fpa/drivers", response_model=List[Driver])
async def get_drivers(current_user: dict = Depends(get_current_user)):
    drivers = await db.drivers.find(
        {"user_id": current_user['id']},
        {"_id": 0}
    ).to_list(100)
    
    for d in drivers:
        if isinstance(d.get('created_at'), str):
            d['created_at'] = datetime.fromisoformat(d['created_at'])
    
    return drivers

@api_router.delete("/fpa/drivers/{driver_id}")
async def delete_driver(driver_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.drivers.delete_one({
        "id": driver_id,
        "user_id": current_user['id']
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Driver not found")
    
    return {"message": "Driver deleted"}

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
    """Get list of countries with their global regions"""
    import json
    data_file = Path(__file__).parent / "data" / "countries_regions.json"
    with open(data_file, "r", encoding="utf-8") as f:
        return json.load(f)

@api_router.get("/reference/currencies")
async def get_currencies():
    """Get list of ISO currency codes"""
    import json
    data_file = Path(__file__).parent / "data" / "currencies.json"
    with open(data_file, "r", encoding="utf-8") as f:
        return json.load(f)

@api_router.get("/reference/regions")
async def get_regions():
    """Get list of unique global regions"""
    return ["APAC", "EMEA", "Americas"]

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
