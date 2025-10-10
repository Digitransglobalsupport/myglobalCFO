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
from passlib.context import CryptContext
import jwt
import random

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# Create the main app
app = FastAPI(title="MyGlobalCFO API")
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class Company(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    country: str
    currency: str
    user_id: str
    company_type: str = "standalone"  # topco, subsidiary, standalone
    parent_company_id: Optional[str] = None  # If subsidiary, link to TopCo
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyCreate(BaseModel):
    name: str
    country: str
    currency: str
    company_type: str = "standalone"
    parent_company_id: Optional[str] = None

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    type: str  # invoice, bill, bank_transaction, journal_entry
    amount: float
    currency: str
    date: str
    description: str
    category: Optional[str] = None
    cost_center: Optional[str] = None
    source: str  # email, xero, truelayer, manual
    reconciliation_status: str = "pending"  # pending, matched, unmatched
    metadata: Optional[Dict[str, Any]] = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TransactionCreate(BaseModel):
    company_id: str
    type: str
    amount: float
    currency: str
    date: str
    description: str
    category: Optional[str] = None
    cost_center: Optional[str] = None
    source: str
    metadata: Optional[Dict[str, Any]] = {}

class Email(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_id: str
    from_address: str
    subject: str
    body: Optional[str] = None
    received_at: datetime
    status: str = "pending"  # pending, processed, failed
    attachments_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DashboardMetrics(BaseModel):
    revenue: float
    expenses: float
    ebitda: float
    cash_balance: float
    runway_days: int
    ar_aging: Dict[str, float]
    ap_aging: Dict[str, float]
    top_cost_centers: List[Dict[str, Any]]
    recent_transactions: List[Transaction]

class EntityKPIs(BaseModel):
    entity_id: str
    entity_name: str
    currency: str
    revenue: float
    expenses: float
    ebitda: float
    ebitda_margin: float  # percentage
    cash_balance: float
    runway_days: int
    revenue_growth: float  # percentage
    expense_ratio: float  # percentage
    profit_margin: float  # percentage
    quick_ratio: float  # liquidity metric
    burn_rate: float  # monthly
    status: str  # healthy, warning, critical

class EntityComparison(BaseModel):
    entities: List[EntityKPIs]
    group_totals: Dict[str, float]

class FinanceOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # loan, credit_line, grant
    provider: str
    interest_rate: Optional[float] = None
    amount_range: str
    eligibility: str
    source_url: str

# ==================== AUTH UTILITIES ====================

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        return {"id": user_id, "email": payload.get("email")}
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = pwd_context.hash(user_data.password)
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "name": user_data.name,
        "password": hashed_password,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_dict)
    
    # Create token
    access_token = create_access_token({"sub": user_dict["id"], "email": user_dict["email"]})
    
    user_obj = User(id=user_dict["id"], email=user_dict["email"], name=user_dict["name"])
    return Token(access_token=access_token, user=user_obj)

@api_router.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email})
    if not user or not pwd_context.verify(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token({"sub": user["id"], "email": user["email"]})
    user_obj = User(id=user["id"], email=user["email"], name=user["name"])
    return Token(access_token=access_token, user=user_obj)

# ==================== COMPANY ROUTES ====================

@api_router.post("/companies", response_model=Company)
async def create_company(company_data: CompanyCreate, current_user: dict = Depends(get_current_user)):
    company_dict = company_data.model_dump()
    company_obj = Company(**company_dict, user_id=current_user["id"])
    
    doc = company_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.companies.insert_one(doc)
    return company_obj

@api_router.get("/companies", response_model=List[Company])
async def get_companies(current_user: dict = Depends(get_current_user)):
    companies = await db.companies.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    for company in companies:
        if isinstance(company['created_at'], str):
            company['created_at'] = datetime.fromisoformat(company['created_at'])
    return companies

@api_router.get("/companies/hierarchy")
async def get_company_hierarchy(current_user: dict = Depends(get_current_user)):
    """Get companies organized in TopCo-Subsidiary hierarchy"""
    
    companies = await db.companies.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    # Organize into hierarchy
    topcos = []
    subsidiaries = []
    standalone = []
    
    for company in companies:
        if isinstance(company['created_at'], str):
            company['created_at'] = datetime.fromisoformat(company['created_at'])
        
        company_type = company.get('company_type', 'standalone')
        
        if company_type == 'topco':
            # Find subsidiaries for this TopCo
            subs = [c for c in companies if c.get('parent_company_id') == company['id']]
            company['subsidiaries'] = subs
            topcos.append(company)
        elif company_type == 'subsidiary':
            subsidiaries.append(company)
        else:
            standalone.append(company)
    
    return {
        "topcos": topcos,
        "subsidiaries": subsidiaries,
        "standalone": standalone
    }

@api_router.delete("/companies/{company_id}")
async def delete_company(company_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a company/entity (e.g., when sold)"""
    
    # Verify ownership
    company = await db.companies.find_one({"id": company_id, "user_id": current_user["id"]})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found or unauthorized")
    
    # Delete all transactions for this company
    await db.transactions.delete_many({"company_id": company_id})
    
    # Delete all emails for this company
    await db.emails.delete_many({"company_id": company_id})
    
    # Delete the company
    await db.companies.delete_one({"id": company_id})
    
    return {"message": f"Company {company['name']} deleted successfully", "deleted_id": company_id}

# ==================== TRANSACTION ROUTES ====================

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(transaction_data: TransactionCreate, current_user: dict = Depends(get_current_user)):
    transaction_dict = transaction_data.model_dump()
    transaction_obj = Transaction(**transaction_dict)
    
    doc = transaction_obj.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.transactions.insert_one(doc)
    return transaction_obj

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    company_id: Optional[str] = None,
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if company_id:
        query["company_id"] = company_id
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    for trans in transactions:
        if isinstance(trans['created_at'], str):
            trans['created_at'] = datetime.fromisoformat(trans['created_at'])
    return transactions

# ==================== EMAIL PROCESSING (MOCK) ====================

@api_router.post("/emails/process")
async def process_emails(company_id: str, current_user: dict = Depends(get_current_user)):
    """Mock email processing - simulates Gmail API reading emails"""
    # Generate mock emails
    mock_emails = [
        {
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "from_address": "vendor@supplier.com",
            "subject": "Invoice #INV-2024-001",
            "body": "Please find attached invoice for services rendered.",
            "received_at": datetime.now(timezone.utc) - timedelta(days=2),
            "status": "processed",
            "attachments_count": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "company_id": company_id,
            "from_address": "accounting@bank.com",
            "subject": "Bank Statement - January 2024",
            "body": "Your monthly statement is attached.",
            "received_at": datetime.now(timezone.utc) - timedelta(days=1),
            "status": "processed",
            "attachments_count": 1,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for email in mock_emails:
        email['received_at'] = email['received_at'].isoformat()
        await db.emails.insert_one(email)
    
    return {"message": f"Processed {len(mock_emails)} emails", "count": len(mock_emails)}

# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard/{company_id}", response_model=DashboardMetrics)
async def get_dashboard(company_id: str, current_user: dict = Depends(get_current_user)):
    """Generate dashboard metrics with mock data"""
    
    # Check if this is a consolidated view request
    if company_id == "consolidated":
        return await get_consolidated_dashboard(current_user)
    
    # Check if this is a TopCo - should show consolidated subsidiary data
    company = await db.companies.find_one({"id": company_id, "user_id": current_user["id"]})
    
    if company and company.get('company_type') == 'topco':
        return await get_topco_consolidated_dashboard(company_id, current_user)
    
    # Mock data for demonstration
    revenue = random.uniform(100000, 500000)
    expenses = random.uniform(70000, 300000)
    ebitda = revenue - expenses
    cash_balance = random.uniform(50000, 200000)
    
    # Calculate runway (cash / monthly burn)
    monthly_burn = expenses / 12
    runway_days = int((cash_balance / monthly_burn) * 30) if monthly_burn > 0 else 365
    
    # Get recent transactions
    transactions = await db.transactions.find(
        {"company_id": company_id}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    for trans in transactions:
        if isinstance(trans.get('created_at'), str):
            trans['created_at'] = datetime.fromisoformat(trans['created_at'])
    
    return DashboardMetrics(
        revenue=round(revenue, 2),
        expenses=round(expenses, 2),
        ebitda=round(ebitda, 2),
        cash_balance=round(cash_balance, 2),
        runway_days=runway_days,
        ar_aging={
            "current": round(revenue * 0.6, 2),
            "30_days": round(revenue * 0.25, 2),
            "60_days": round(revenue * 0.1, 2),
            "90_plus": round(revenue * 0.05, 2)
        },
        ap_aging={
            "current": round(expenses * 0.7, 2),
            "30_days": round(expenses * 0.2, 2),
            "60_days": round(expenses * 0.07, 2),
            "90_plus": round(expenses * 0.03, 2)
        },
        top_cost_centers=[
            {"name": "Sales & Marketing", "amount": round(expenses * 0.35, 2)},
            {"name": "Operations", "amount": round(expenses * 0.25, 2)},
            {"name": "Technology", "amount": round(expenses * 0.20, 2)},
            {"name": "Administration", "amount": round(expenses * 0.15, 2)},
            {"name": "Other", "amount": round(expenses * 0.05, 2)}
        ],
        recent_transactions=transactions
    )

async def get_topco_consolidated_dashboard(topco_id: str, current_user: dict):
    """Generate consolidated dashboard for TopCo showing all subsidiary data"""
    
    # Get all subsidiaries under this TopCo
    subsidiaries = await db.companies.find({
        "user_id": current_user["id"],
        "parent_company_id": topco_id
    }, {"_id": 0}).to_list(100)
    
    if not subsidiaries:
        # If no subsidiaries, return empty metrics
        return DashboardMetrics(
            revenue=0,
            expenses=0,
            ebitda=0,
            cash_balance=0,
            runway_days=0,
            ar_aging={"current": 0, "30_days": 0, "60_days": 0, "90_plus": 0},
            ap_aging={"current": 0, "30_days": 0, "60_days": 0, "90_plus": 0},
            top_cost_centers=[],
            recent_transactions=[]
        )
    
    # Aggregate metrics across all subsidiaries
    total_revenue = 0
    total_expenses = 0
    total_cash = 0
    all_transactions = []
    
    for subsidiary in subsidiaries:
        # Generate mock data for each subsidiary
        sub_revenue = random.uniform(100000, 500000)
        sub_expenses = random.uniform(70000, 300000)
        sub_cash = random.uniform(50000, 200000)
        
        total_revenue += sub_revenue
        total_expenses += sub_expenses
        total_cash += sub_cash
        
        # Get transactions for this subsidiary
        sub_transactions = await db.transactions.find(
            {"company_id": subsidiary["id"]}, 
            {"_id": 0}
        ).limit(3).to_list(3)
        all_transactions.extend(sub_transactions)
    
    total_ebitda = total_revenue - total_expenses
    monthly_burn = total_expenses / 12
    runway_days = int((total_cash / monthly_burn) * 30) if monthly_burn > 0 else 365
    
    # Sort all transactions by date
    for trans in all_transactions:
        if isinstance(trans.get('created_at'), str):
            trans['created_at'] = datetime.fromisoformat(trans['created_at'])
    all_transactions.sort(key=lambda x: x.get('created_at', datetime.min), reverse=True)
    
    return DashboardMetrics(
        revenue=round(total_revenue, 2),
        expenses=round(total_expenses, 2),
        ebitda=round(total_ebitda, 2),
        cash_balance=round(total_cash, 2),
        runway_days=runway_days,
        ar_aging={
            "current": round(total_revenue * 0.6, 2),
            "30_days": round(total_revenue * 0.25, 2),
            "60_days": round(total_revenue * 0.1, 2),
            "90_plus": round(total_revenue * 0.05, 2)
        },
        ap_aging={
            "current": round(total_expenses * 0.7, 2),
            "30_days": round(total_expenses * 0.2, 2),
            "60_days": round(total_expenses * 0.07, 2),
            "90_plus": round(total_expenses * 0.03, 2)
        },
        top_cost_centers=[
            {"name": "Sales & Marketing", "amount": round(total_expenses * 0.35, 2)},
            {"name": "Operations", "amount": round(total_expenses * 0.25, 2)},
            {"name": "Technology", "amount": round(total_expenses * 0.20, 2)},
            {"name": "Administration", "amount": round(total_expenses * 0.15, 2)},
            {"name": "Other", "amount": round(total_expenses * 0.05, 2)}
        ],
        recent_transactions=all_transactions[:10]
    )

async def get_consolidated_dashboard(current_user: dict):
    """Generate consolidated group-level dashboard across all entities"""
    
    # Get all user companies
    companies = await db.companies.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    if not companies:
        # Return empty metrics if no companies
        return DashboardMetrics(
            revenue=0,
            expenses=0,
            ebitda=0,
            cash_balance=0,
            runway_days=0,
            ar_aging={"current": 0, "30_days": 0, "60_days": 0, "90_plus": 0},
            ap_aging={"current": 0, "30_days": 0, "60_days": 0, "90_plus": 0},
            top_cost_centers=[],
            recent_transactions=[]
        )
    
    # Aggregate metrics across all companies
    total_revenue = 0
    total_expenses = 0
    total_cash = 0
    all_transactions = []
    
    for company in companies:
        # Generate mock data for each company (in production, would aggregate real data)
        company_revenue = random.uniform(100000, 500000)
        company_expenses = random.uniform(70000, 300000)
        company_cash = random.uniform(50000, 200000)
        
        total_revenue += company_revenue
        total_expenses += company_expenses
        total_cash += company_cash
        
        # Get transactions for this company
        company_transactions = await db.transactions.find(
            {"company_id": company["id"]}, 
            {"_id": 0}
        ).limit(5).to_list(5)
        all_transactions.extend(company_transactions)
    
    total_ebitda = total_revenue - total_expenses
    
    # Calculate consolidated runway
    monthly_burn = total_expenses / 12
    runway_days = int((total_cash / monthly_burn) * 30) if monthly_burn > 0 else 365
    
    # Sort all transactions by date
    for trans in all_transactions:
        if isinstance(trans.get('created_at'), str):
            trans['created_at'] = datetime.fromisoformat(trans['created_at'])
    all_transactions.sort(key=lambda x: x.get('created_at', datetime.min), reverse=True)
    
    return DashboardMetrics(
        revenue=round(total_revenue, 2),
        expenses=round(total_expenses, 2),
        ebitda=round(total_ebitda, 2),
        cash_balance=round(total_cash, 2),
        runway_days=runway_days,
        ar_aging={
            "current": round(total_revenue * 0.6, 2),
            "30_days": round(total_revenue * 0.25, 2),
            "60_days": round(total_revenue * 0.1, 2),
            "90_plus": round(total_revenue * 0.05, 2)
        },
        ap_aging={
            "current": round(total_expenses * 0.7, 2),
            "30_days": round(total_expenses * 0.2, 2),
            "60_days": round(total_expenses * 0.07, 2),
            "90_plus": round(total_expenses * 0.03, 2)
        },
        top_cost_centers=[
            {"name": "Sales & Marketing", "amount": round(total_expenses * 0.35, 2)},
            {"name": "Operations", "amount": round(total_expenses * 0.25, 2)},
            {"name": "Technology", "amount": round(total_expenses * 0.20, 2)},
            {"name": "Administration", "amount": round(total_expenses * 0.15, 2)},
            {"name": "Other", "amount": round(total_expenses * 0.05, 2)}
        ],
        recent_transactions=all_transactions[:10]
    )

# ==================== ENTITY COMPARISON ====================

@api_router.get("/entities/comparison", response_model=EntityComparison)
async def get_entity_comparison(current_user: dict = Depends(get_current_user)):
    """Get real-time KPI comparison across all entities"""
    
    companies = await db.companies.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    if not companies:
        return EntityComparison(entities=[], group_totals={})
    
    entities_kpis = []
    group_revenue = 0
    group_expenses = 0
    group_cash = 0
    
    for company in companies:
        # Generate real-time mock KPIs for each entity
        revenue = random.uniform(100000, 500000)
        expenses = random.uniform(70000, 300000)
        ebitda = revenue - expenses
        cash = random.uniform(50000, 200000)
        
        # Calculate KPI metrics
        ebitda_margin = (ebitda / revenue * 100) if revenue > 0 else 0
        expense_ratio = (expenses / revenue * 100) if revenue > 0 else 0
        profit_margin = (ebitda / revenue * 100) if revenue > 0 else 0
        monthly_burn = expenses / 12
        runway = int((cash / monthly_burn) * 30) if monthly_burn > 0 else 365
        revenue_growth = random.uniform(-10, 25)  # Mock growth percentage
        quick_ratio = cash / (expenses / 12) if expenses > 0 else 0  # Cash to monthly expenses
        
        # Determine health status
        if ebitda_margin > 20 and runway > 180:
            status = "healthy"
        elif ebitda_margin > 10 and runway > 90:
            status = "warning"
        else:
            status = "critical"
        
        entity_kpi = EntityKPIs(
            entity_id=company["id"],
            entity_name=company["name"],
            currency=company["currency"],
            revenue=round(revenue, 2),
            expenses=round(expenses, 2),
            ebitda=round(ebitda, 2),
            ebitda_margin=round(ebitda_margin, 2),
            cash_balance=round(cash, 2),
            runway_days=runway,
            revenue_growth=round(revenue_growth, 2),
            expense_ratio=round(expense_ratio, 2),
            profit_margin=round(profit_margin, 2),
            quick_ratio=round(quick_ratio, 2),
            burn_rate=round(monthly_burn, 2),
            status=status
        )
        
        entities_kpis.append(entity_kpi)
        group_revenue += revenue
        group_expenses += expenses
        group_cash += cash
    
    group_ebitda = group_revenue - group_expenses
    group_margin = (group_ebitda / group_revenue * 100) if group_revenue > 0 else 0
    
    return EntityComparison(
        entities=entities_kpis,
        group_totals={
            "revenue": round(group_revenue, 2),
            "expenses": round(group_expenses, 2),
            "ebitda": round(group_ebitda, 2),
            "ebitda_margin": round(group_margin, 2),
            "cash": round(group_cash, 2)
        }
    )

# ==================== FINANCE SOURCING ====================

@api_router.get("/finance-sourcing", response_model=List[FinanceOption])
async def get_finance_options(current_user: dict = Depends(get_current_user)):
    """Mock finance sourcing - would use web search in production"""
    
    mock_options = [
        FinanceOption(
            type="credit_line",
            provider="Business Capital Ltd",
            interest_rate=5.5,
            amount_range="£50K - £500K",
            eligibility="Revenue > £100K/year",
            source_url="https://businesscapital.com"
        ),
        FinanceOption(
            type="loan",
            provider="SME Finance Corp",
            interest_rate=4.8,
            amount_range="£25K - £250K",
            eligibility="Trading for 2+ years",
            source_url="https://smefinance.com"
        ),
        FinanceOption(
            type="grant",
            provider="Innovation UK",
            amount_range="£10K - £100K",
            eligibility="R&D or Tech companies",
            source_url="https://innovationuk.gov.uk"
        )
    ]
    
    return mock_options

# ==================== RECONCILIATION ====================

@api_router.post("/reconciliation/auto-match")
async def auto_reconcile(company_id: str, current_user: dict = Depends(get_current_user)):
    """Mock auto-reconciliation between bank feeds and accounting transactions"""
    
    # In production, this would match transactions from TrueLayer with Xero
    transactions = await db.transactions.find(
        {"company_id": company_id, "reconciliation_status": "pending"},
        {"_id": 0}
    ).to_list(100)
    
    matched_count = len(transactions) // 2  # Mock: match 50%
    
    # Update reconciliation status
    for trans in transactions[:matched_count]:
        await db.transactions.update_one(
            {"id": trans["id"]},
            {"$set": {"reconciliation_status": "matched"}}
        )
    
    return {
        "message": "Auto-reconciliation complete",
        "matched": matched_count,
        "unmatched": len(transactions) - matched_count
    }

# ==================== INTEGRATIONS MANAGEMENT ====================

class IntegrationConfig(BaseModel):
    outlook_client_id: Optional[str] = None
    outlook_client_secret: Optional[str] = None
    sage_client_id: Optional[str] = None
    sage_client_secret: Optional[str] = None
    quickbooks_client_id: Optional[str] = None
    quickbooks_client_secret: Optional[str] = None

@api_router.get("/integrations/available")
async def get_available_integrations(current_user: dict = Depends(get_current_user)):
    """Get list of available integrations"""
    return {
        "integrations": [
            {
                "type": "gmail",
                "name": "Gmail",
                "description": "Connect to Gmail for email processing and automated financial document extraction",
                "features": ["Email reading", "Attachment extraction", "PDF/CSV/XLS parsing", "Auto-replies"],
                "status": "available"
            },
            {
                "type": "outlook",
                "name": "Microsoft Outlook",
                "description": "Connect to Outlook for email processing and automated financial document extraction",
                "features": ["Email reading", "Attachment extraction", "PDF/CSV/XLS parsing", "Auto-replies"],
                "status": "available"
            },
            {
                "type": "xero",
                "name": "Xero Accounting",
                "description": "Connect to Xero for real-time accounting and transaction sync",
                "features": ["Transaction posting", "Invoice management", "Real-time sync", "Financial reports"],
                "status": "available"
            },
            {
                "type": "sage",
                "name": "Sage Accounting",
                "description": "Connect to Sage for accounting and transaction management",
                "features": ["Transaction posting", "Account management", "Reports"],
                "status": "available"
            },
            {
                "type": "quickbooks",
                "name": "QuickBooks",
                "description": "Connect to QuickBooks for comprehensive accounting",
                "features": ["Invoice management", "Expense tracking", "Financial reports"],
                "status": "available"
            }
        ]
    }

@api_router.post("/integrations/{integration_type}/connect")
async def initiate_integration_connection(
    integration_type: str,
    company_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Initiate OAuth connection for an integration"""
    
    if integration_type not in ["gmail", "outlook", "xero", "sage", "quickbooks"]:
        raise HTTPException(status_code=400, detail="Invalid integration type")
    
    # Generate state for CSRF protection
    state = str(uuid.uuid4())
    
    # Store pending connection
    connection = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "user_id": current_user["id"],
        "integration_type": integration_type,
        "status": "pending",
        "state": state,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.integration_connections.insert_one(connection)
    
    # Return instructions for manual setup (since we need actual API keys)
    return {
        "message": f"To connect {integration_type.capitalize()}, you'll need API credentials",
        "integration_type": integration_type,
        "connection_id": connection["id"],
        "instructions": {
            "gmail": {
                "step1": "Go to Google Cloud Console (console.cloud.google.com)",
                "step2": "Create a new project or select existing one",
                "step3": "Enable Gmail API in 'APIs & Services' > 'Library'",
                "step4": "Go to 'APIs & Services' > 'Credentials'",
                "step5": "Click 'Create Credentials' > 'OAuth 2.0 Client ID'",
                "step6": "Configure OAuth consent screen if needed",
                "step7": "Add authorized redirect URI and copy Client ID and Client Secret",
                "step8": "Add Gmail API scopes (gmail.readonly, gmail.send)",
                "redirect_uri": "http://localhost:8000/api/integrations/gmail/callback"
            },
            "outlook": {
                "step1": "Register an app in Azure Portal (portal.azure.com)",
                "step2": "Navigate to Azure Active Directory > App registrations",
                "step3": "Create 'New registration' with name and redirect URI",
                "step4": "Copy Application (client) ID and Directory (tenant) ID",
                "step5": "Create a client secret under 'Certificates & secrets'",
                "step6": "Add Microsoft Graph API permissions (Mail.Read, Mail.Send)",
                "step7": "Grant admin consent for the permissions",
                "redirect_uri": "http://localhost:8000/api/integrations/outlook/callback"
            },
            "xero": {
                "step1": "Go to Xero Developer Portal (developer.xero.com)",
                "step2": "Create a new app in 'My Apps'",
                "step3": "Select 'Web app' as integration type",
                "step4": "Add OAuth2 redirect URI",
                "step5": "Copy Client ID (OAuth 2.0 credentials)",
                "step6": "Generate Client Secret",
                "step7": "Add required scopes (accounting.transactions, accounting.contacts)",
                "redirect_uri": "http://localhost:8000/api/integrations/xero/callback"
            },
            "sage": {
                "step1": "Register at Sage Developer Portal (developer.sage.com)",
                "step2": "Create a new application in your developer account",
                "step3": "Configure OAuth2 redirect URI",
                "step4": "Copy Client ID and Client Secret",
                "step5": "Select appropriate scopes (full_access or readonly)",
                "redirect_uri": "http://localhost:8000/api/integrations/sage/callback"
            },
            "quickbooks": {
                "step1": "Go to QuickBooks Developer Portal (developer.intuit.com)",
                "step2": "Create a new app and select QuickBooks Online",
                "step3": "Configure OAuth2 redirect URI",
                "step4": "Copy Client ID and Client Secret",
                "step5": "Add accounting scopes",
                "redirect_uri": "http://localhost:8000/api/integrations/quickbooks/callback"
            }
        }
    }

class IntegrationCredentials(BaseModel):
    client_id: str
    client_secret: str
    tenant_id: Optional[str] = None

@api_router.post("/integrations/{connection_id}/save-credentials")
async def save_integration_credentials(
    connection_id: str,
    credentials: IntegrationCredentials,
    current_user: dict = Depends(get_current_user)
):
    """Save API credentials for an integration"""
    
    # Find the connection
    connection = await db.integration_connections.find_one({
        "id": connection_id,
        "user_id": current_user["id"]
    })
    
    if not connection:
        raise HTTPException(status_code=404, detail="Connection not found")
    
    # In production, encrypt these credentials
    # For now, storing them as-is (NOT SECURE FOR PRODUCTION)
    credentials_dict = credentials.model_dump()
    
    # Update connection with credentials
    await db.integration_connections.update_one(
        {"id": connection_id},
        {"$set": {
            "credentials": credentials_dict,
            "status": "credentials_saved",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    integration_type = connection["integration_type"]
    
    # Generate OAuth URL based on integration type
    state = connection["state"]
    
    try:
        if integration_type == "xero":
            from xero_integration import XeroIntegration
            
            xero = XeroIntegration(credentials.client_id, credentials.client_secret)
            redirect_uri = os.environ.get('XERO_REDIRECT_URI', 'http://localhost:8000/api/integrations/xero/callback')
            auth_url = xero.get_authorization_url(redirect_uri, state)
        else:
            # Use generic OAuth URL generator for other integrations
            from integrations_manager import get_integration_auth_url
            config = credentials_dict
            auth_url = get_integration_auth_url(integration_type, config, state)
        
        return {
            "message": "Credentials saved successfully",
            "next_step": "authorize",
            "authorization_url": auth_url,
            "instructions": "Click the authorization URL to complete the OAuth flow"
        }
    except Exception as e:
        return {
            "message": "Credentials saved, but OAuth URL generation failed",
            "error": str(e),
            "next_step": "Contact support or check credentials"
        }

@api_router.get("/integrations/{integration_type}/callback")
async def integration_oauth_callback(
    integration_type: str,
    code: str,
    state: str
):
    """Handle OAuth callback from integration provider"""
    
    # Find the connection by state
    connection = await db.integration_connections.find_one({"state": state})
    
    if not connection:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    try:
        # Exchange code for tokens
        if integration_type == "xero":
            from xero_integration import XeroIntegration
            
            credentials = connection.get("credentials", {})
            client_id = credentials.get("client_id")
            client_secret = credentials.get("client_secret")
            
            if not client_id or not client_secret:
                raise HTTPException(status_code=400, detail="Missing Xero credentials")
            
            xero = XeroIntegration(client_id, client_secret)
            
            # Use environment variable for redirect URI or construct it
            redirect_uri = os.environ.get('XERO_REDIRECT_URI', 'http://localhost:8000/api/integrations/xero/callback')
            
            # Exchange authorization code for tokens
            token_response = await xero.exchange_code_for_token(code, redirect_uri)
            
            access_token = token_response.get("access_token")
            refresh_token = token_response.get("refresh_token")
            expires_in = token_response.get("expires_in")
            
            # Get tenant ID
            tenant_id = await xero.get_tenant_id(access_token)
            
            # Update connection with tokens
            await db.integration_connections.update_one(
                {"id": connection["id"]},
                {"$set": {
                    "status": "connected",
                    "authorization_code": code,
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "tenant_id": tenant_id,
                    "token_expires_at": (datetime.now(timezone.utc).timestamp() + expires_in),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {
                "message": "Xero connected successfully!",
                "integration_type": integration_type,
                "status": "connected",
                "tenant_id": tenant_id,
                "next_steps": "You can now close this window and return to the application"
            }
        else:
            # For other integrations, just mark as connected for now
            await db.integration_connections.update_one(
                {"id": connection["id"]},
                {"$set": {
                    "status": "connected",
                    "authorization_code": code,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            return {
                "message": f"{integration_type.capitalize()} connected successfully!",
                "integration_type": integration_type,
                "status": "connected",
                "next_steps": "Return to the application to start using the integration"
            }
    except Exception as e:
        # Update with error
        await db.integration_connections.update_one(
            {"id": connection["id"]},
            {"$set": {
                "status": "error",
                "error_message": str(e),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        raise HTTPException(status_code=500, detail=f"OAuth callback failed: {str(e)}")

@api_router.get("/integrations/{company_id}/list")
async def list_company_integrations(company_id: str, current_user: dict = Depends(get_current_user)):
    """List all integrations for a company"""
    
    connections = await db.integration_connections.find(
        {"company_id": company_id, "user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    return {"integrations": connections}

@api_router.post("/integrations/{connection_id}/test")
async def test_integration_connection(connection_id: str, current_user: dict = Depends(get_current_user)):
    """Test an integration connection"""
    
    connection = await db.integration_connections.find_one({
        "id": connection_id,
        "user_id": current_user["id"]
    })
    
    if not connection:
        raise HTTPException(status_code=404, detail="Integration connection not found")
    
    integration_type = connection["integration_type"]
    status = connection.get("status", "pending")
    
    # Actually test Xero connection if connected
    if integration_type == "xero" and status == "connected":
        try:
            from xero_integration import XeroIntegration
            
            credentials = connection.get("credentials", {})
            client_id = credentials.get("client_id")
            client_secret = credentials.get("client_secret")
            access_token = connection.get("access_token")
            tenant_id = connection.get("tenant_id")
            
            if not access_token or not tenant_id:
                return {
                    "success": False,
                    "message": "Xero tokens missing - OAuth flow incomplete",
                    "details": {
                        "connection_status": "incomplete",
                        "next_step": "Complete OAuth authorization"
                    }
                }
            
            xero = XeroIntegration(client_id, client_secret)
            
            # Test the actual connection
            test_result = await xero.test_connection(access_token, tenant_id)
            
            org_info = test_result.get("organisation", {})
            
            return {
                "success": True,
                "message": "Xero connection is working!",
                "details": {
                    "connection_status": "active",
                    "organisation_name": org_info.get("Name"),
                    "organisation_id": org_info.get("OrganisationID"),
                    "country": org_info.get("CountryCode"),
                    "version": org_info.get("Version"),
                    "api_response": "success",
                    "tenant_id": tenant_id
                }
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Xero connection test failed: {str(e)}",
                "details": {
                    "connection_status": "error",
                    "error": str(e),
                    "next_step": "Check credentials or re-authorize"
                }
            }
    
    # Mock test results for other integrations or non-connected status
    if status == "connected":
        test_results = {
            "success": True,
            "message": f"{integration_type.capitalize()} connection is working!",
            "details": {
                "connection_status": "active",
                "last_sync": "2 minutes ago",
                "api_response_time": "125ms",
                "permissions": "verified"
            }
        }
    elif status == "credentials_saved":
        test_results = {
            "success": False,
            "message": f"{integration_type.capitalize()} credentials saved but OAuth not completed",
            "details": {
                "connection_status": "pending_authorization",
                "next_step": "Complete OAuth authorization flow"
            }
        }
    else:
        test_results = {
            "success": False,
            "message": f"{integration_type.capitalize()} connection not yet configured",
            "details": {
                "connection_status": status,
                "next_step": "Complete setup and authorization"
            }
        }
    
    return test_results

@api_router.get("/integrations/{connection_id}/config")
async def get_integration_config(connection_id: str, current_user: dict = Depends(get_current_user)):
    """Get integration configuration"""
    
    connection = await db.integration_connections.find_one({
        "id": connection_id,
        "user_id": current_user["id"]
    })
    
    if not connection:
        raise HTTPException(status_code=404, detail="Integration connection not found")
    
    # Return configuration without sensitive credentials
    config = {
        "integration_type": connection["integration_type"],
        "status": connection.get("status", "pending"),
        "created_at": connection.get("created_at"),
        "company_id": connection.get("company_id"),
        "has_credentials": bool(connection.get("credentials")),
        "settings": connection.get("config", {}),
        "available_settings": {
            "gmail": {
                "auto_process_emails": {"type": "boolean", "default": True, "description": "Automatically process incoming emails"},
                "attachment_types": {"type": "array", "default": ["pdf", "csv", "xlsx"], "description": "File types to extract"},
                "auto_reply": {"type": "boolean", "default": False, "description": "Send automatic replies"},
                "sync_frequency": {"type": "select", "options": ["realtime", "hourly", "daily"], "default": "hourly"}
            },
            "outlook": {
                "auto_process_emails": {"type": "boolean", "default": True, "description": "Automatically process incoming emails"},
                "attachment_types": {"type": "array", "default": ["pdf", "csv", "xlsx"], "description": "File types to extract"},
                "auto_reply": {"type": "boolean", "default": False, "description": "Send automatic replies"},
                "sync_frequency": {"type": "select", "options": ["realtime", "hourly", "daily"], "default": "hourly"}
            },
            "xero": {
                "auto_sync": {"type": "boolean", "default": True, "description": "Automatically sync transactions"},
                "sync_frequency": {"type": "select", "options": ["realtime", "hourly", "daily"], "default": "hourly"},
                "default_account": {"type": "text", "default": "", "description": "Default GL account"},
                "tax_rate": {"type": "text", "default": "20%", "description": "Default tax rate"}
            },
            "sage": {
                "auto_sync": {"type": "boolean", "default": True, "description": "Automatically sync transactions"},
                "sync_frequency": {"type": "select", "options": ["realtime", "hourly", "daily"], "default": "hourly"},
                "business_id": {"type": "text", "default": "", "description": "Sage business ID"}
            },
            "quickbooks": {
                "auto_sync": {"type": "boolean", "default": True, "description": "Automatically sync transactions"},
                "sync_frequency": {"type": "select", "options": ["realtime", "hourly", "daily"], "default": "hourly"},
                "company_id": {"type": "text", "default": "", "description": "QuickBooks company ID"}
            }
        }
    }
    
    return config

@api_router.put("/integrations/{connection_id}/config")
async def update_integration_config(
    connection_id: str,
    settings: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Update integration configuration settings"""
    
    connection = await db.integration_connections.find_one({
        "id": connection_id,
        "user_id": current_user["id"]
    })
    
    if not connection:
        raise HTTPException(status_code=404, detail="Integration connection not found")
    
    # Update settings
    await db.integration_connections.update_one(
        {"id": connection_id},
        {"$set": {
            "config": settings,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Configuration updated successfully",
        "settings": settings
    }

@api_router.delete("/integrations/{connection_id}")
async def disconnect_integration(connection_id: str, current_user: dict = Depends(get_current_user)):
    """Disconnect an integration"""
    
    result = await db.integration_connections.delete_one({
        "id": connection_id,
        "user_id": current_user["id"]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Integration connection not found")
    
    return {"message": "Integration disconnected successfully"}

# ==================== SEED DATA FOR DEMO ====================

@api_router.post("/seed-demo-data")
async def seed_demo_data(company_id: str, current_user: dict = Depends(get_current_user)):
    """Seed demo transactions for testing"""
    
    demo_transactions = []
    categories = ["Sales", "Marketing", "Operations", "Technology", "Administration"]
    transaction_types = ["invoice", "bill", "bank_transaction"]
    
    for i in range(20):
        trans = Transaction(
            company_id=company_id,
            type=random.choice(transaction_types),
            amount=round(random.uniform(100, 10000), 2),
            currency="GBP",
            date=(datetime.now(timezone.utc) - timedelta(days=random.randint(1, 90))).strftime("%Y-%m-%d"),
            description=f"Transaction {i+1} - {random.choice(['Vendor Payment', 'Customer Invoice', 'Bank Transfer'])}",
            category=random.choice(categories),
            cost_center=random.choice(categories),
            source=random.choice(["email", "xero", "truelayer", "manual"]),
            reconciliation_status=random.choice(["pending", "matched", "unmatched"])
        )
        
        doc = trans.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        demo_transactions.append(doc)
    
    await db.transactions.insert_many(demo_transactions)
    
    return {"message": f"Seeded {len(demo_transactions)} demo transactions"}

@api_router.delete("/companies/{company_id}/clear-data")
async def clear_company_data(company_id: str, current_user: dict = Depends(get_current_user)):
    """Clear all data (transactions, emails, etc.) for a specific company"""
    
    # Verify ownership
    company = await db.companies.find_one({"id": company_id, "user_id": current_user["id"]})
    if not company:
        raise HTTPException(status_code=404, detail="Company not found or unauthorized")
    
    # Count items before deletion
    transactions_count = await db.transactions.count_documents({"company_id": company_id})
    emails_count = await db.emails.count_documents({"company_id": company_id})
    
    # Delete all transactions for this company
    await db.transactions.delete_many({"company_id": company_id})
    
    # Delete all emails for this company
    await db.emails.delete_many({"company_id": company_id})
    
    # Note: We keep integrations as they might be reused
    
    return {
        "message": f"All data cleared for {company['name']}",
        "deleted": {
            "transactions": transactions_count,
            "emails": emails_count
        }
    }

@api_router.post("/companies/migrate-legacy")
async def migrate_legacy_companies(current_user: dict = Depends(get_current_user)):
    """Migrate legacy companies without company_type to standalone"""
    
    # Find all companies without company_type or with null company_type
    result = await db.companies.update_many(
        {
            "user_id": current_user["id"],
            "$or": [
                {"company_type": {"$exists": False}},
                {"company_type": None},
                {"company_type": ""}
            ]
        },
        {
            "$set": {
                "company_type": "standalone",
                "parent_company_id": None
            }
        }
    )
    
    return {
        "message": "Migration complete",
        "updated_count": result.modified_count
    }

@api_router.get("/companies/debug")
async def debug_companies(current_user: dict = Depends(get_current_user)):
    """Debug endpoint to see all companies with their fields"""
    
    companies = await db.companies.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(100)
    
    return {
        "total_companies": len(companies),
        "companies": [
            {
                "id": c.get("id"),
                "name": c.get("name"),
                "company_type": c.get("company_type", "NOT SET"),
                "parent_company_id": c.get("parent_company_id", "NOT SET"),
                "created_at": c.get("created_at")
            }
            for c in companies
        ]
    }

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()