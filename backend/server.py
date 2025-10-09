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
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyCreate(BaseModel):
    name: str
    country: str
    currency: str

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