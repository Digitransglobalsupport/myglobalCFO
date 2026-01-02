from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import time
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import random
import shutil
from financial_advisor import FinancialAdvisor

# Import Longtail Logging utilities early
from logging_utils import longtail_tracker, log_db_operation, log_integration

# FP&A Module Imports
from routes.fpa_planning import get_fpa_router
from routes.fpa_drivers import get_drivers_router
from routes.fpa_dimensions import get_dimensions_router
from routes.fpa_integrations import get_integrations_router
from routes.fpa_admin import get_admin_router
from routes.fpa_ai import router as fpa_ai_router
from routes.fpa_phase4 import get_phase4_router
from routes.fpa_assets import get_assets_router
from routes.cfo_dashboard import get_dashboard_router

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s'
)
logger = logging.getLogger(__name__)

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
    role: str = "tenant"  # admin or tenant
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str
    confirm_password: str

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

class TimeSeriesDataPoint(BaseModel):
    date: str
    revenue: float
    expenses: float
    ebitda: float
    cash_balance: float
    profit_margin: float

class EntityHistoricalData(BaseModel):
    entity_id: str
    entity_name: str
    currency: str
    time_period: str  # 1d, 7d, 30d, 6m, ytd, 3y, 5y
    data_points: List[TimeSeriesDataPoint]
    summary: EntityKPIs

class FinanceOption(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # loan, credit_line, grant
    provider: str
    interest_rate: Optional[float] = None
    amount_range: str
    eligibility: str
    source_url: str


class KPILayout(BaseModel):
    i: str  # identifier
    x: int
    y: int
    w: int
    h: int

class KPIConfig(BaseModel):
    id: str
    label: str
    enabled: bool = True
    order: int

class UserPreferences(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    primary_color: str = "#1e3a5f"
    secondary_color: str = "#2d4a6f"
    accent_color: str = "#d4af37"
    background_gradient_start: str = "#1e3a5f"
    background_gradient_end: str = "#3d5a7f"
    kpi_layout: Optional[List[KPILayout]] = None
    kpi_config: Optional[List[KPIConfig]] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserPreferencesUpdate(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    background_gradient_start: Optional[str] = None
    background_gradient_end: Optional[str] = None
    kpi_layout: Optional[List[KPILayout]] = None
    kpi_config: Optional[List[KPIConfig]] = None

# ==================== OCR MODELS ====================

class LineItem(BaseModel):
    description: str
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    amount: float

class ExtractedData(BaseModel):
    vendor: Optional[str] = None
    amount: Optional[float] = None
    currency: Optional[str] = "USD"
    date: Optional[str] = None
    description: Optional[str] = None
    suggested_cost_center: Optional[str] = None
    line_items: Optional[List[LineItem]] = []
    tax_amount: Optional[float] = None
    subtotal: Optional[float] = None
    invoice_number: Optional[str] = None
    payment_method: Optional[str] = None

class OcrDraft(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_id: Optional[str] = None
    file_name: str
    file_path: str
    file_size: int
    mime_type: str
    extracted_data: ExtractedData
    status: str = "draft"  # draft, approved, rejected
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OcrDraftUpdate(BaseModel):
    company_id: Optional[str] = None
    extracted_data: Optional[ExtractedData] = None
    status: Optional[str] = None

class OcrDraftApprove(BaseModel):
    company_id: str
    cost_center: Optional[str] = None
    category: Optional[str] = None

# ==================== CHAT MODELS ====================

class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    session_id: str
    user_id: str
    entity_id: Optional[str] = None
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatSession(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    entity_id: Optional[str] = None
    title: str = "New Conversation"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None
    entity_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    session_id: str
    message_id: str
    suggested_questions: List[str] = []


# ==================== AI ADVISOR SETTINGS MODELS ====================

class AIAdvisorSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str  # The admin who owns these settings
    global_enabled: bool = True  # Global toggle for AI Advisor
    authorized_user_ids: List[str] = []  # List of tenant user IDs authorized to access
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AIAdvisorSettingsUpdate(BaseModel):
    global_enabled: Optional[bool] = None
    authorized_user_ids: Optional[List[str]] = None

# ==================== ENTITY GROUP MODELS ====================

class EntityGroup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    name: str
    description: Optional[str] = None
    entity_ids: List[str] = []  # List of company/entity IDs in this group
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class EntityGroupCreate(BaseModel):
    name: str
    description: Optional[str] = None
    entity_ids: List[str] = []

class EntityGroupUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    entity_ids: Optional[List[str]] = None

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
        
        # Fetch user to get role
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return {
            "id": user_id, 
            "email": payload.get("email"),
            "role": user.get("role", "tenant")
        }
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency to require admin role"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=Token)
@longtail_tracker()
async def register(user_data: UserCreate):
    logger.info(f"[LONGTAIL] Registration attempt for email: {user_data.email}")
    
    # Check if user exists
    import time
    start_time = time.time()
    existing = await db.users.find_one({"email": user_data.email})
    log_db_operation("QUERY", "users", time.time() - start_time, 1 if existing else 0)
    
    if existing:
        logger.warning(f"[LONGTAIL] Registration failed - email already exists: {user_data.email}")
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Validate password strength
    is_valid, message = validate_password(user_data.password)
    if not is_valid:
        logger.warning(f"[LONGTAIL] Registration failed - weak password for: {user_data.email}")
        raise HTTPException(status_code=400, detail=message)
    
    # Check if this is the first user (make them admin)
    start_time = time.time()
    user_count = await db.users.count_documents({})
    log_db_operation("COUNT", "users", time.time() - start_time)
    user_role = "admin" if user_count == 0 else "tenant"
    
    # Create user
    hashed_password = pwd_context.hash(user_data.password)
    user_dict = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "name": user_data.name,
        "role": user_role,
        "password": hashed_password,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    start_time = time.time()
    await db.users.insert_one(user_dict)
    log_db_operation("INSERT", "users", time.time() - start_time, 1)
    
    # Create token
    access_token = create_access_token({"sub": user_dict["id"], "email": user_dict["email"]})
    
    logger.info(f"[LONGTAIL] User registered successfully: {user_data.email} | Role: {user_role} | ID: {user_dict['id']}")
    
    user_obj = User(id=user_dict["id"], email=user_dict["email"], name=user_dict["name"], role=user_role)
    return Token(access_token=access_token, user=user_obj)

@api_router.post("/auth/login", response_model=Token)
@longtail_tracker()
async def login(credentials: UserLogin):
    logger.info(f"[LONGTAIL] Login attempt for email: {credentials.email}")
    
    start_time = time.time()
    user = await db.users.find_one({"email": credentials.email})
    log_db_operation("QUERY", "users", time.time() - start_time, 1 if user else 0)
    
    if not user or not pwd_context.verify(credentials.password, user["password"]):
        logger.warning(f"[LONGTAIL] Login failed for email: {credentials.email}")
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token({"sub": user["id"], "email": user["email"]})
    user_obj = User(
        id=user["id"], 
        email=user["email"], 
        name=user["name"],
        role=user.get("role", "tenant")
    )
    
    logger.info(f"[LONGTAIL] Login successful: {credentials.email} | Role: {user.get('role', 'tenant')} | ID: {user['id']}")
    
    return Token(access_token=access_token, user=user_obj)

def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password meets requirements:
    - Minimum 8 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one digit
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not any(c.isupper() for c in password):
        return False, "Password must contain at least one uppercase letter"
    
    if not any(c.islower() for c in password):
        return False, "Password must contain at least one lowercase letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    
    return True, "Password is valid"

def create_reset_token(email: str) -> str:
    """Create a password reset token valid for 1 hour"""
    to_encode = {
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=1),
        "type": "password_reset"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

@api_router.post("/auth/forgot-password")
async def forgot_password(request: PasswordResetRequest):
    """Initiate password reset process"""
    # Check if user exists
    user = await db.users.find_one({"email": request.email})
    if not user:
        # For security, don't reveal if email exists or not
        return {"message": "If an account with that email exists, a password reset link has been sent."}
    
    # Generate reset token
    reset_token = create_reset_token(request.email)
    
    # Store reset token in database with expiration
    reset_record = {
        "id": str(uuid.uuid4()),
        "email": request.email,
        "token": reset_token,
        "used": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    }
    await db.password_resets.insert_one(reset_record)
    
    # In a real application, send email here
    # For now, we'll return the token (ONLY FOR DEVELOPMENT)
    # TODO: Integrate email service (SendGrid, AWS SES, etc.)
    
    return {
        "message": "If an account with that email exists, a password reset link has been sent.",
        "reset_token": reset_token,  # Remove this in production
        "reset_link": f"http://localhost:3000/reset-password?token={reset_token}"  # Remove this in production
    }

@api_router.post("/auth/reset-password")
async def reset_password(reset_data: PasswordReset):
    """Reset password using the token"""
    # Validate passwords match
    if reset_data.new_password != reset_data.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    
    # Validate password strength
    is_valid, message = validate_password(reset_data.new_password)
    if not is_valid:
        raise HTTPException(status_code=400, detail=message)
    
    # Verify token
    try:
        payload = jwt.decode(reset_data.token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("email")
        token_type = payload.get("type")
        
        if token_type != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid token type")
        
        if not email:
            raise HTTPException(status_code=400, detail="Invalid token")
            
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=400, detail="Reset link has expired. Please request a new one.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=400, detail="Invalid or malformed token")
    
    # Check if token has been used
    reset_record = await db.password_resets.find_one({"token": reset_data.token, "used": False})
    if not reset_record:
        raise HTTPException(status_code=400, detail="This reset link has already been used or is invalid")
    
    # Get user
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update password
    hashed_password = pwd_context.hash(reset_data.new_password)
    await db.users.update_one(
        {"email": email},
        {"$set": {"password": hashed_password, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Mark token as used
    await db.password_resets.update_one(
        {"token": reset_data.token},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Password has been reset successfully. You can now login with your new password."}

@api_router.get("/auth/verify-reset-token/{token}")
async def verify_reset_token(token: str):
    """Verify if a reset token is valid and not expired"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("email")
        token_type = payload.get("type")
        
        if token_type != "password_reset":
            return {"valid": False, "message": "Invalid token type"}
        
        if not email:
            return {"valid": False, "message": "Invalid token"}
        
        # Check if token has been used
        reset_record = await db.password_resets.find_one({"token": token, "used": False})
        if not reset_record:
            return {"valid": False, "message": "This reset link has already been used"}
        
        return {"valid": True, "email": email}
        
    except jwt.ExpiredSignatureError:
        return {"valid": False, "message": "Reset link has expired"}
    except jwt.PyJWTError:
        return {"valid": False, "message": "Invalid token"}

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
    use_mocked_data: bool = True,
    current_user: dict = Depends(get_current_user)
):
    # If mock is OFF, only return transactions that have a real source
    # For now, return empty array when mock is off to avoid showing previously generated mock data
    if not use_mocked_data:
        return []
    
    # Mock is ON - check database first
    query = {}
    if company_id:
        query["company_id"] = company_id
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("created_at", -1).to_list(limit)
    
    # If no transactions exist and mock is on, generate some mock data temporarily
    if not transactions and use_mocked_data:
        mock_transactions = [
            {
                "id": f"txn_{i}",
                "company_id": company_id or "demo",
                "date": (datetime.now(timezone.utc) - timedelta(days=i)).isoformat(),
                "description": f"Mock Transaction {i+1}",
                "amount": round(random.uniform(-5000, 5000), 2),
                "type": random.choice(["income", "expense"]),
                "category": random.choice(["Sales", "Marketing", "Operations", "Payroll"]),
                "source": "Mock Data",
                "currency": "GBP",
                "reconciliation_status": random.choice(["matched", "pending", "unmatched"]),
                "created_at": datetime.now(timezone.utc) - timedelta(days=i)
            }
            for i in range(10)
        ]
        return mock_transactions
    
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
async def get_dashboard(company_id: str, use_mocked_data: bool = True, current_user: dict = Depends(get_current_user)):
    """Generate dashboard metrics - respects mock data toggle"""
    
    # Check if this is a consolidated view request
    if company_id == "consolidated":
        return await get_consolidated_dashboard(current_user, use_mocked_data)
    
    # Check if this is a TopCo - should show consolidated subsidiary data
    company = await db.companies.find_one({"id": company_id, "user_id": current_user["id"]})
    
    if company and company.get('company_type') == 'topco':
        return await get_topco_consolidated_dashboard(company_id, current_user, use_mocked_data)
    
    # If mock data is enabled, generate mock metrics
    if use_mocked_data:
        revenue = random.uniform(100000, 500000)
        expenses = random.uniform(70000, 300000)
        ebitda = revenue - expenses
        cash_balance = random.uniform(50000, 200000)
        
        # Calculate runway (cash / monthly burn)
        monthly_burn = expenses / 12
        runway_days = int((cash_balance / monthly_burn) * 30) if monthly_burn > 0 else 365
        
        # Get recent transactions (still fetch real ones if available)
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
    
    # Mock is OFF - get real data only
    if not company:
        # No company found
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
    
    # Get real transactions
    transactions = await db.transactions.find(
        {"company_id": company_id}, 
        {"_id": 0}
    ).sort("created_at", -1).limit(10).to_list(10)
    
    for trans in transactions:
        if isinstance(trans.get('created_at'), str):
            trans['created_at'] = datetime.fromisoformat(trans['created_at'])
    
    # Calculate real metrics from transactions
    revenue_trans = [t for t in transactions if t.get('type') == 'income']
    expense_trans = [t for t in transactions if t.get('type') == 'expense']
    
    revenue = sum([abs(t.get('amount', 0)) for t in revenue_trans])
    expenses = sum([abs(t.get('amount', 0)) for t in expense_trans])
    ebitda = revenue - expenses
    cash_balance = company.get('cash_balance', 0)
    
    # Calculate runway
    monthly_burn = expenses / 12 if expenses > 0 else 0
    runway_days = int((cash_balance / monthly_burn) * 30) if monthly_burn > 0 else 0
    
    return DashboardMetrics(
        revenue=round(revenue, 2),
        expenses=round(expenses, 2),
        ebitda=round(ebitda, 2),
        cash_balance=round(cash_balance, 2),
        runway_days=runway_days,
        ar_aging={"current": 0, "30_days": 0, "60_days": 0, "90_plus": 0},  # Would need real AR data
        ap_aging={"current": 0, "30_days": 0, "60_days": 0, "90_plus": 0},  # Would need real AP data
        top_cost_centers=[],  # Would need categorized expense data
        recent_transactions=transactions
    )

async def get_topco_consolidated_dashboard(topco_id: str, current_user: dict, use_mocked_data: bool = True):
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

async def get_consolidated_dashboard(current_user: dict, use_mocked_data: bool = True):
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


@api_router.get("/entities/{entity_id}/historical", response_model=EntityHistoricalData)
async def get_entity_historical_data(
    entity_id: str,
    time_period: str = "30d",  # 1d, 7d, 30d, 6m, ytd, 3y, 5y
    current_user: dict = Depends(get_current_user)
):
    """Get historical time-series data for an entity"""
    
    # Verify entity belongs to user
    company = await db.companies.find_one({
        "id": entity_id,
        "user_id": current_user["id"]
    }, {"_id": 0})
    
    if not company:
        raise HTTPException(status_code=404, detail="Entity not found")
    
    # Determine number of data points based on time period
    now = datetime.now(timezone.utc)
    year_start = datetime(now.year, 1, 1, tzinfo=timezone.utc)
    ytd_days = (now - year_start).days
    
    data_points_config = {
        "1d": {"days": 1, "points": 24, "interval_hours": 1},
        "7d": {"days": 7, "points": 7, "interval_hours": 24},
        "30d": {"days": 30, "points": 30, "interval_hours": 24},
        "6m": {"days": 180, "points": 26, "interval_hours": 24 * 7},  # weekly
        "ytd": {"days": ytd_days, 
                "points": min(52, ytd_days // 7),
                "interval_hours": 24 * 7},
        "3y": {"days": 1095, "points": 36, "interval_hours": 24 * 30},  # monthly (3 years)
        "5y": {"days": 1825, "points": 60, "interval_hours": 24 * 30}   # monthly (5 years)
    }
    
    config = data_points_config.get(time_period, data_points_config["30d"])
    num_points = config["points"]
    
    # Generate time-series data points
    data_points = []
    base_revenue = random.uniform(100000, 500000)
    base_expenses = random.uniform(70000, 300000)
    base_cash = random.uniform(50000, 200000)
    
    for i in range(num_points):
        # Create date going backwards from now
        if time_period == "1d":
            date = datetime.now(timezone.utc) - timedelta(hours=(num_points - i - 1))
            date_str = date.strftime("%Y-%m-%d %H:00")
        else:
            date = datetime.now(timezone.utc) - timedelta(days=(num_points - i - 1) * (config["interval_hours"] // 24))
            date_str = date.strftime("%Y-%m-%d")
        
        # Add some variance to simulate realistic trends
        variance = random.uniform(0.85, 1.15)
        growth_factor = 1 + (i / num_points) * 0.2  # Slight upward trend
        
        revenue = base_revenue * variance * growth_factor
        expenses = base_expenses * variance * (1 + (i / num_points) * 0.1)
        ebitda = revenue - expenses
        cash_balance = base_cash * (1 + (i / num_points) * 0.15)
        profit_margin = (ebitda / revenue * 100) if revenue > 0 else 0
        
        data_points.append(TimeSeriesDataPoint(
            date=date_str,
            revenue=round(revenue, 2),
            expenses=round(expenses, 2),
            ebitda=round(ebitda, 2),
            cash_balance=round(cash_balance, 2),
            profit_margin=round(profit_margin, 2)
        ))
    
    # Calculate summary (current metrics)
    latest = data_points[-1] if data_points else None
    if latest:
        revenue = latest.revenue
        expenses = latest.expenses
        ebitda = latest.ebitda
        cash = latest.cash_balance
    else:
        revenue = base_revenue
        expenses = base_expenses
        ebitda = revenue - expenses
        cash = base_cash
    
    ebitda_margin = (ebitda / revenue * 100) if revenue > 0 else 0
    expense_ratio = (expenses / revenue * 100) if revenue > 0 else 0
    profit_margin = (ebitda / revenue * 100) if revenue > 0 else 0
    monthly_burn = expenses / 12
    runway = int((cash / monthly_burn) * 30) if monthly_burn > 0 else 365
    quick_ratio = cash / (expenses / 12) if expenses > 0 else 0
    
    # Calculate growth (compare first and last data point)
    if len(data_points) > 1:
        revenue_growth = ((data_points[-1].revenue - data_points[0].revenue) / data_points[0].revenue * 100)
    else:
        revenue_growth = 0
    
    # Determine status
    if ebitda_margin > 20 and runway > 180:
        status = "healthy"
    elif ebitda_margin > 10 and runway > 90:
        status = "warning"
    else:
        status = "critical"
    
    summary = EntityKPIs(
        entity_id=entity_id,
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
    
    return EntityHistoricalData(
        entity_id=entity_id,
        entity_name=company["name"],
        currency=company["currency"],
        time_period=time_period,
        data_points=data_points,
        summary=summary
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


# ==================== USER PREFERENCES ====================

@api_router.get("/user/preferences", response_model=UserPreferences)
async def get_user_preferences(current_user: dict = Depends(get_current_user)):
    """Get user's customization preferences"""
    
    prefs = await db.user_preferences.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not prefs:
        # Return default preferences
        default_prefs = UserPreferences(
            user_id=current_user["id"],
            primary_color="#1e3a5f",
            secondary_color="#2d4a6f",
            accent_color="#d4af37",
            background_gradient_start="#1e3a5f",
            background_gradient_end="#3d5a7f",
            kpi_layout=None
        )
        
        # Save default preferences
        prefs_dict = default_prefs.model_dump()
        await db.user_preferences.insert_one(prefs_dict)
        
        return default_prefs
    
    return UserPreferences(**prefs)

@api_router.put("/user/preferences", response_model=UserPreferences)
async def update_user_preferences(
    preferences: UserPreferencesUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user's customization preferences"""
    
    # Get existing preferences
    existing = await db.user_preferences.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not existing:
        # Create new preferences
        new_prefs = UserPreferences(
            user_id=current_user["id"],
            **preferences.model_dump(exclude_none=True)
        )
        prefs_dict = new_prefs.model_dump()
        await db.user_preferences.insert_one(prefs_dict)
        return new_prefs
    
    # Update existing preferences
    update_data = preferences.model_dump(exclude_none=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.user_preferences.update_one(
        {"user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    # Return updated preferences
    updated = await db.user_preferences.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    
    return UserPreferences(**updated)

@api_router.post("/user/preferences/reset")
async def reset_user_preferences(current_user: dict = Depends(get_current_user)):
    """Reset user preferences to default"""
    
    default_prefs = UserPreferences(
        user_id=current_user["id"],
        primary_color="#1e3a5f",
        secondary_color="#2d4a6f",
        accent_color="#d4af37",
        background_gradient_start="#1e3a5f",
        background_gradient_end="#3d5a7f",
        kpi_layout=None
    )
    
    prefs_dict = default_prefs.model_dump()
    
    await db.user_preferences.update_one(
        {"user_id": current_user["id"]},
        {"$set": prefs_dict},
        upsert=True
    )
    
    return {"message": "Preferences reset to default", "preferences": default_prefs}


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
            },
            {
                "type": "truelayer",
                "name": "TrueLayer",
                "description": "Connect to bank accounts via TrueLayer Open Banking API for real-time account data and payment initiation",
                "features": ["Account information", "Transaction history", "Real-time balances", "Payment initiation"],
                "status": "available"
            },
            {
                "type": "plaid",
                "name": "Plaid",
                "description": "Connect to bank accounts via Plaid for secure financial data access and payment processing",
                "features": ["Account verification", "Transaction sync", "Balance checking", "Payment initiation"],
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
    
    if integration_type not in ["gmail", "outlook", "xero", "sage", "quickbooks", "truelayer", "plaid"]:
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
            },
            "truelayer": {
                "step1": "Go to TrueLayer Console (console.truelayer.com)",
                "step2": "Create an account and register your application",
                "step3": "Configure redirect URIs in your application settings",
                "step4": "Copy Client ID and Client Secret from application details",
                "step5": "Select required scopes (accounts, balance, transactions, payments)",
                "step6": "For sandbox testing, use sandbox credentials",
                "redirect_uri": "http://localhost:8000/api/integrations/truelayer/callback"
            },
            "plaid": {
                "step1": "Go to Plaid Dashboard (dashboard.plaid.com)",
                "step2": "Sign up for a Plaid account and create a new application",
                "step3": "Select sandbox environment for testing",
                "step4": "Copy Client ID and Secret from Keys section",
                "step5": "Configure webhook URLs for transaction and item updates",
                "step6": "Use test credentials: user_good / pass_good for sandbox",
                "redirect_uri": "http://localhost:8000/api/integrations/plaid/callback"
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
    """List all integrations for a company (includes all sources)"""
    
    user_id = current_user["id"]
    
    # Get all integration connections from integration_connections collection
    integration_connections = await db.integration_connections.find(
        {"$or": [{"company_id": company_id}, {"user_id": user_id}]},
        {"_id": 0}
    ).to_list(1000)
    
    # Get legacy integrations from integrations collection  
    legacy_integrations = await db.integrations.find(
        {"user_id": user_id},
        {"_id": 0}
    ).to_list(1000)
    
    # Combine and normalize all integrations
    all_integrations = []
    
    # Process integration_connections
    for connection in integration_connections:
        all_integrations.append(connection)
    
    # Process legacy integrations (avoid duplicates)
    existing_types = {integ.get("integration_type") for integ in all_integrations}
    for legacy in legacy_integrations:
        legacy_type = legacy.get("name", "").lower().replace(" ", "_")
        if legacy_type not in existing_types:
            all_integrations.append({
                "id": legacy.get("id"),
                "integration_type": legacy_type,
                "status": legacy.get("status", "unknown"),
                "created_at": legacy.get("created_at"),
                "updated_at": legacy.get("updated_at"),
                "company_id": company_id,
                "source": "legacy"
            })
    
    return {"integrations": all_integrations}

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
    
    # Test TrueLayer connection if connected
    if integration_type == "truelayer" and status == "connected":
        try:
            from truelayer_integration import TrueLayerIntegration
            
            credentials = connection.get("credentials", {})
            client_id = credentials.get("client_id") or os.getenv("TRUELAYER_CLIENT_ID")
            client_secret = credentials.get("client_secret") or os.getenv("TRUELAYER_CLIENT_SECRET")
            access_token = connection.get("access_token")
            environment = os.getenv("TRUELAYER_ENVIRONMENT", "sandbox")
            
            if not access_token:
                return {
                    "success": False,
                    "message": "TrueLayer tokens missing - OAuth flow incomplete",
                    "details": {
                        "connection_status": "incomplete",
                        "next_step": "Complete OAuth authorization"
                    }
                }
            
            truelayer = TrueLayerIntegration(client_id, client_secret, environment)
            test_result = await truelayer.test_connection(access_token)
            
            return test_result
        except Exception as e:
            return {
                "success": False,
                "message": f"TrueLayer connection test failed: {str(e)}",
                "details": {
                    "connection_status": "error",
                    "error": str(e),
                    "next_step": "Check credentials or re-authorize"
                }
            }
    
    # Test Plaid connection if connected
    if integration_type == "plaid" and status == "connected":
        try:
            from plaid_integration import PlaidIntegration
            
            credentials = connection.get("credentials", {})
            client_id = credentials.get("client_id") or os.getenv("PLAID_CLIENT_ID")
            secret = credentials.get("client_secret") or os.getenv("PLAID_SECRET")
            access_token = connection.get("access_token")
            environment = os.getenv("PLAID_ENV", "sandbox")
            
            if not access_token:
                return {
                    "success": False,
                    "message": "Plaid tokens missing - Link flow incomplete",
                    "details": {
                        "connection_status": "incomplete",
                        "next_step": "Complete Plaid Link flow"
                    }
                }
            
            plaid = PlaidIntegration(client_id, secret, environment)
            test_result = await plaid.test_connection(access_token)
            
            return test_result
        except Exception as e:
            return {
                "success": False,
                "message": f"Plaid connection test failed: {str(e)}",
                "details": {
                    "connection_status": "error",
                    "error": str(e),
                    "next_step": "Check credentials or re-authenticate"
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
    """Disconnect an integration (supports both new and legacy integrations)"""
    
    # Try deleting from integration_connections first
    result = await db.integration_connections.delete_one({
        "id": connection_id,
        "user_id": current_user["id"]
    })
    
    if result.deleted_count > 0:
        return {"message": "Integration disconnected successfully"}
    
    # If not found, try legacy integrations collection
    legacy_result = await db.integrations.delete_one({
        "id": connection_id,
        "user_id": current_user["id"]
    })
    
    if legacy_result.deleted_count > 0:
        return {"message": "Integration disconnected successfully"}
    
    # Not found in either collection
    raise HTTPException(status_code=404, detail="Integration connection not found")

# ==================== TRUELAYER INTEGRATION ENDPOINTS ====================

@api_router.post("/integrations/truelayer/link-token")
async def create_truelayer_auth_link(company_id: str, current_user: dict = Depends(get_current_user)):
    """Create TrueLayer authorization link"""
    from truelayer_integration import TrueLayerIntegration
    
    client_id = os.getenv("TRUELAYER_CLIENT_ID")
    client_secret = os.getenv("TRUELAYER_CLIENT_SECRET")
    environment = os.getenv("TRUELAYER_ENVIRONMENT", "sandbox")
    
    truelayer = TrueLayerIntegration(client_id, client_secret, environment)
    
    # Generate state for CSRF protection
    state = str(uuid.uuid4())
    
    # Store pending connection
    connection = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "user_id": current_user["id"],
        "integration_type": "truelayer",
        "status": "pending",
        "state": state,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.integration_connections.insert_one(connection)
    
    redirect_uri = os.getenv("TRUELAYER_REDIRECT_URI", "http://localhost:8000/api/integrations/truelayer/callback")
    auth_url = truelayer.get_authorization_url(redirect_uri, state)
    
    return {
        "auth_url": auth_url,
        "connection_id": connection["id"],
        "state": state
    }

@api_router.get("/integrations/truelayer/callback")
async def truelayer_oauth_callback(code: str, state: str):
    """Handle TrueLayer OAuth callback"""
    from truelayer_integration import TrueLayerIntegration
    
    # Find the connection by state
    connection = await db.integration_connections.find_one({"state": state, "integration_type": "truelayer"})
    
    if not connection:
        raise HTTPException(status_code=400, detail="Invalid state parameter")
    
    try:
        client_id = os.getenv("TRUELAYER_CLIENT_ID")
        client_secret = os.getenv("TRUELAYER_CLIENT_SECRET")
        environment = os.getenv("TRUELAYER_ENVIRONMENT", "sandbox")
        redirect_uri = os.getenv("TRUELAYER_REDIRECT_URI", "http://localhost:8000/api/integrations/truelayer/callback")
        
        truelayer = TrueLayerIntegration(client_id, client_secret, environment)
        token_response = await truelayer.exchange_code_for_token(code, redirect_uri)
        
        access_token = token_response.get("access_token")
        refresh_token = token_response.get("refresh_token")
        expires_in = token_response.get("expires_in")
        
        # Update connection with tokens
        await db.integration_connections.update_one(
            {"id": connection["id"]},
            {"$set": {
                "status": "connected",
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_expires_at": datetime.now(timezone.utc).timestamp() + expires_in,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        return {
            "message": "TrueLayer connected successfully!",
            "status": "connected",
            "next_steps": "You can now close this window and return to the application"
        }
    except Exception as e:
        await db.integration_connections.update_one(
            {"id": connection["id"]},
            {"$set": {
                "status": "error",
                "error_message": str(e),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        raise HTTPException(status_code=500, detail=f"TrueLayer callback failed: {str(e)}")

@api_router.get("/integrations/truelayer/{connection_id}/accounts")
async def get_truelayer_accounts(connection_id: str, current_user: dict = Depends(get_current_user)):
    """Get TrueLayer accounts"""
    from truelayer_integration import TrueLayerIntegration
    
    connection = await db.integration_connections.find_one({
        "id": connection_id,
        "user_id": current_user["id"],
        "integration_type": "truelayer"
    })
    
    if not connection:
        raise HTTPException(status_code=404, detail="TrueLayer connection not found")
    
    if connection.get("status") != "connected":
        raise HTTPException(status_code=400, detail="TrueLayer connection not active")
    
    client_id = os.getenv("TRUELAYER_CLIENT_ID")
    client_secret = os.getenv("TRUELAYER_CLIENT_SECRET")
    environment = os.getenv("TRUELAYER_ENVIRONMENT", "sandbox")
    access_token = connection.get("access_token")
    
    truelayer = TrueLayerIntegration(client_id, client_secret, environment)
    accounts_data = await truelayer.get_accounts(access_token)
    
    # Get balances for each account
    accounts_with_balance = []
    for account in accounts_data.get("results", []):
        account_id = account.get("account_id")
        try:
            balance_data = await truelayer.get_account_balance(access_token, account_id)
            account["balance"] = balance_data.get("results", [{}])[0]
        except:
            account["balance"] = None
        
        accounts_with_balance.append(account)
    
    return {"accounts": accounts_with_balance}

@api_router.get("/integrations/truelayer/{connection_id}/transactions")
async def get_truelayer_transactions(
    connection_id: str,
    account_id: str,
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get TrueLayer transactions"""
    from truelayer_integration import TrueLayerIntegration
    
    connection = await db.integration_connections.find_one({
        "id": connection_id,
        "user_id": current_user["id"],
        "integration_type": "truelayer"
    })
    
    if not connection:
        raise HTTPException(status_code=404, detail="TrueLayer connection not found")
    
    if connection.get("status") != "connected":
        raise HTTPException(status_code=400, detail="TrueLayer connection not active")
    
    client_id = os.getenv("TRUELAYER_CLIENT_ID")
    client_secret = os.getenv("TRUELAYER_CLIENT_SECRET")
    environment = os.getenv("TRUELAYER_ENVIRONMENT", "sandbox")
    access_token = connection.get("access_token")
    
    truelayer = TrueLayerIntegration(client_id, client_secret, environment)
    transactions = await truelayer.get_account_transactions(access_token, account_id, from_date, to_date)
    
    return transactions

# ==================== PLAID INTEGRATION ENDPOINTS ====================

@api_router.post("/integrations/plaid/link-token")
async def create_plaid_link_token(company_id: str, current_user: dict = Depends(get_current_user)):
    """Create Plaid Link token"""
    from plaid_integration import PlaidIntegration
    
    client_id = os.getenv("PLAID_CLIENT_ID")
    secret = os.getenv("PLAID_SECRET")
    environment = os.getenv("PLAID_ENV", "sandbox")
    products = os.getenv("PLAID_PRODUCTS", "auth,transactions").split(",")
    country_codes = os.getenv("PLAID_COUNTRY_CODES", "US,GB").split(",")
    
    plaid = PlaidIntegration(client_id, secret, environment)
    
    link_token_data = await plaid.create_link_token(
        user_id=current_user["id"],
        client_name="MyGlobalCFO",
        products=products,
        country_codes=country_codes,
        webhook_url=None,
        redirect_uri=None
    )
    
    if "error" in link_token_data:
        raise HTTPException(status_code=400, detail=link_token_data["error"])
    
    # Store pending connection
    connection = {
        "id": str(uuid.uuid4()),
        "company_id": company_id,
        "user_id": current_user["id"],
        "integration_type": "plaid",
        "status": "pending",
        "link_token": link_token_data["link_token"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.integration_connections.insert_one(connection)
    
    return {
        "link_token": link_token_data["link_token"],
        "connection_id": connection["id"],
        "expiration": link_token_data["expiration"]
    }

@api_router.post("/integrations/plaid/exchange-token")
async def exchange_plaid_token(
    public_token: str,
    connection_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Exchange Plaid public token for access token"""
    from plaid_integration import PlaidIntegration
    
    connection = await db.integration_connections.find_one({
        "id": connection_id,
        "user_id": current_user["id"],
        "integration_type": "plaid"
    })
    
    if not connection:
        raise HTTPException(status_code=404, detail="Plaid connection not found")
    
    client_id = os.getenv("PLAID_CLIENT_ID")
    secret = os.getenv("PLAID_SECRET")
    environment = os.getenv("PLAID_ENV", "sandbox")
    
    plaid = PlaidIntegration(client_id, secret, environment)
    token_data = await plaid.exchange_public_token(public_token)
    
    if "error" in token_data:
        raise HTTPException(status_code=400, detail=token_data["error"])
    
    # Update connection with access token
    await db.integration_connections.update_one(
        {"id": connection_id},
        {"$set": {
            "status": "connected",
            "access_token": token_data["access_token"],
            "item_id": token_data["item_id"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Plaid connected successfully!",
        "status": "connected"
    }

@api_router.get("/integrations/plaid/{connection_id}/accounts")
async def get_plaid_accounts(connection_id: str, current_user: dict = Depends(get_current_user)):
    """Get Plaid accounts"""
    from plaid_integration import PlaidIntegration
    
    connection = await db.integration_connections.find_one({
        "id": connection_id,
        "user_id": current_user["id"],
        "integration_type": "plaid"
    })
    
    if not connection:
        raise HTTPException(status_code=404, detail="Plaid connection not found")
    
    if connection.get("status") != "connected":
        raise HTTPException(status_code=400, detail="Plaid connection not active")
    
    client_id = os.getenv("PLAID_CLIENT_ID")
    secret = os.getenv("PLAID_SECRET")
    environment = os.getenv("PLAID_ENV", "sandbox")
    access_token = connection.get("access_token")
    
    plaid = PlaidIntegration(client_id, secret, environment)
    accounts_data = await plaid.get_accounts(access_token)
    
    if "error" in accounts_data:
        raise HTTPException(status_code=400, detail=accounts_data["error"])
    
    return accounts_data

@api_router.post("/integrations/plaid/{connection_id}/sync-transactions")
async def sync_plaid_transactions(
    connection_id: str,
    cursor: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Sync Plaid transactions"""
    from plaid_integration import PlaidIntegration
    
    connection = await db.integration_connections.find_one({
        "id": connection_id,
        "user_id": current_user["id"],
        "integration_type": "plaid"
    })
    
    if not connection:
        raise HTTPException(status_code=404, detail="Plaid connection not found")
    
    if connection.get("status") != "connected":
        raise HTTPException(status_code=400, detail="Plaid connection not active")
    
    client_id = os.getenv("PLAID_CLIENT_ID")
    secret = os.getenv("PLAID_SECRET")
    environment = os.getenv("PLAID_ENV", "sandbox")
    access_token = connection.get("access_token")
    
    plaid = PlaidIntegration(client_id, secret, environment)
    
    # Get stored cursor if not provided
    if not cursor:
        cursor = connection.get("transaction_cursor")
    
    transactions_data = await plaid.sync_transactions(access_token, cursor)
    
    if "error" in transactions_data:
        raise HTTPException(status_code=400, detail=transactions_data["error"])
    
    # Update stored cursor
    await db.integration_connections.update_one(
        {"id": connection_id},
        {"$set": {
            "transaction_cursor": transactions_data["next_cursor"],
            "last_sync": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return transactions_data

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

# ==================== OCR ROUTES ====================

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("/app/backend/uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@api_router.post("/ocr/upload")
async def upload_receipt(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload receipt or PDF for OCR processing"""
    try:
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        file_extension = Path(file.filename).suffix
        saved_file_name = f"{file_id}{file_extension}"
        file_path = UPLOAD_DIR / saved_file_name
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Get file size
        file_size = os.path.getsize(file_path)
        
        # Validate file was saved
        if file_size == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        
        logger.info(f"File saved: {file_path}, size: {file_size} bytes")
        
        # Determine MIME type
        mime_type = file.content_type or "application/octet-stream"
        
        # Map common file extensions to proper MIME types for Gemini
        if file_extension.lower() in ['.jpg', '.jpeg']:
            mime_type = 'image/jpeg'
        elif file_extension.lower() == '.png':
            mime_type = 'image/png'
        elif file_extension.lower() == '.pdf':
            mime_type = 'application/pdf'
        elif file_extension.lower() == '.heic':
            mime_type = 'image/heic'
        
        logger.info(f"File MIME type: {mime_type}")
        
        # Process with OCR + LLM for data extraction
        try:
            import json
            import pytesseract
            from PIL import Image
            from emergentintegrations.llm.chat import LlmChat, UserMessage
            import subprocess
            
            # Check if tesseract is installed, install if missing
            tesseract_path = '/usr/bin/tesseract'
            if not os.path.exists(tesseract_path):
                logger.warning("Tesseract not found, attempting to install...")
                try:
                    subprocess.run(['apt-get', 'update'], check=True, capture_output=True)
                    subprocess.run(['apt-get', 'install', '-y', 'tesseract-ocr', 'tesseract-ocr-eng'], check=True, capture_output=True)
                    logger.info("Tesseract installed successfully")
                except Exception as install_error:
                    logger.error(f"Failed to install tesseract: {install_error}")
                    raise Exception("Tesseract OCR not available. Please contact support.")
            
            # Set tesseract path explicitly
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
            
            llm_key = os.environ.get('EMERGENT_LLM_KEY')
            if not llm_key:
                raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")
            
            logger.info(f"Starting OCR processing for file: {file.filename}")
            
            # Step 1: Extract text from image/PDF using pytesseract
            logger.info("Extracting text using OCR...")
            
            # Check if it's a PDF
            if mime_type == "application/pdf":
                logger.info("Processing PDF file...")
                from pdf2image import convert_from_path
                
                # Check if poppler is installed, install if missing
                poppler_path = '/usr/bin/pdftoppm'
                if not os.path.exists(poppler_path):
                    logger.warning("Poppler not found, attempting to install...")
                    try:
                        subprocess.run(['apt-get', 'update'], check=True, capture_output=True)
                        subprocess.run(['apt-get', 'install', '-y', 'poppler-utils'], check=True, capture_output=True)
                        logger.info("Poppler installed successfully")
                    except Exception as install_error:
                        logger.error(f"Failed to install poppler: {install_error}")
                        raise Exception("Poppler utilities not available. Please contact support.")
                
                # Convert PDF to images with explicit poppler path
                images = convert_from_path(
                    file_path, 
                    dpi=300, 
                    first_page=1, 
                    last_page=5,
                    poppler_path='/usr/bin'
                )
                
                # Extract text from all pages
                extracted_text = ""
                for i, image in enumerate(images):
                    logger.info(f"Extracting text from page {i+1}...")
                    page_text = pytesseract.image_to_string(image)
                    extracted_text += page_text + "\n\n"
                
                logger.info(f"Extracted text from {len(images)} pages")
            else:
                # It's an image file
                logger.info("Processing image file...")
                image = Image.open(file_path)
                extracted_text = pytesseract.image_to_string(image)
            
            logger.info(f"Extracted text: {extracted_text[:300]}...")
            
            if not extracted_text.strip():
                raise Exception("No text could be extracted from the image")
            
            # Step 2: Use LLM to structure the extracted text
            logger.info("Structuring data with LLM...")
            chat = LlmChat(
                api_key=llm_key,
                session_id=f"ocr-{file_id}",
                system_message="You are an expert at analyzing receipt and invoice text and extracting structured financial data. Always return valid JSON."
            ).with_model("openai", "gpt-4o-mini")
            
            extraction_prompt = f"""I have extracted the following text from a receipt/invoice using OCR. Please analyze it and extract structured data.

OCR Text:
{extracted_text}

Extract the following information and return ONLY a JSON object with this exact structure:

{{
    "vendor": "Business or vendor name",
    "amount": 99.99,
    "currency": "USD",
    "date": "2025-01-14",
    "description": "Brief description of what was purchased",
    "invoice_number": "INV-12345",
    "tax_amount": 9.99,
    "subtotal": 89.99,
    "payment_method": "Credit Card",
    "line_items": [
        {{
            "description": "Item name",
            "quantity": 1,
            "unit_price": 10.00,
            "amount": 10.00
        }}
    ],
    "suggested_cost_center": "Office Supplies"
}}

For suggested_cost_center, choose from: Office Supplies, Travel & Accommodation, Meals & Entertainment, Marketing & Advertising, Software & Technology, Professional Services, Utilities, Rent & Facilities, or Equipment & Hardware.

If any field is not found in the text, use null or empty string. Return ONLY the JSON object, no markdown, no explanations."""
            
            user_message = UserMessage(text=extraction_prompt)
            response = await chat.send_message(user_message)
            
            logger.info(f"Received response from LLM: {response[:200]}...")
            
            # Parse the response
            response_text = response.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                parts = response_text.split("```")
                if len(parts) >= 2:
                    response_text = parts[1]
                    if response_text.startswith("json"):
                        response_text = response_text[4:].strip()
            
            # Clean up any leading/trailing whitespace
            response_text = response_text.strip()
            
            logger.info(f"Parsing JSON response: {response_text[:200]}...")
            extracted_data = json.loads(response_text)
            logger.info(f"Successfully extracted data: {extracted_data}")
            
            # Create OCR draft
            draft_dict = {
                "id": str(uuid.uuid4()),
                "user_id": current_user["id"],
                "company_id": None,
                "file_name": file.filename,
                "file_path": str(file_path),
                "file_size": file_size,
                "mime_type": mime_type,
                "extracted_data": extracted_data,
                "status": "draft",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.ocr_drafts.insert_one(draft_dict)
            
            response_data = {
                "id": draft_dict["id"],
                "file_name": file.filename,
                "extracted_data": extracted_data,
                "status": "draft"
            }
            
            logger.info(f"Returning response: {response_data}")
            return JSONResponse(content=response_data)
            
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            logger.error(f"OCR processing error: {str(e)}")
            logger.error(f"Full traceback: {error_details}")
            
            # If OCR fails, still save the file but with empty extracted data
            draft_dict = {
                "id": str(uuid.uuid4()),
                "user_id": current_user["id"],
                "company_id": None,
                "file_name": file.filename,
                "file_path": str(file_path),
                "file_size": file_size,
                "mime_type": mime_type,
                "extracted_data": {
                    "vendor": "",
                    "amount": 0,
                    "currency": "USD",
                    "date": "",
                    "description": f"Failed to extract from {file.filename}",
                    "invoice_number": "",
                    "suggested_cost_center": "",
                    "line_items": [],
                    "tax_amount": 0,
                    "subtotal": 0,
                    "payment_method": ""
                },
                "status": "draft",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            await db.ocr_drafts.insert_one(draft_dict)
            
            error_response = {
                "id": draft_dict["id"],
                "file_name": file.filename,
                "extracted_data": draft_dict["extracted_data"],
                "status": "draft",
                "error": f"OCR processing failed. Please fill in the details manually. Error: {str(e)}"
            }
            
            logger.info(f"Returning error response: {error_response}")
            return JSONResponse(content=error_response)
            
    except Exception as e:
        logger.error(f"File upload error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"File upload failed: {str(e)}")

@api_router.get("/ocr/drafts")
async def get_ocr_drafts(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all OCR drafts for current user"""
    query = {"user_id": current_user["id"]}
    if status:
        query["status"] = status
    
    drafts = await db.ocr_drafts.find(query, {"_id": 0}).sort("created_at", -1).to_list(length=100)
    return drafts

@api_router.get("/ocr/drafts/{draft_id}")
async def get_ocr_draft(
    draft_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get specific OCR draft"""
    draft = await db.ocr_drafts.find_one({"id": draft_id, "user_id": current_user["id"]}, {"_id": 0})
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft

@api_router.put("/ocr/drafts/{draft_id}")
async def update_ocr_draft(
    draft_id: str,
    update_data: OcrDraftUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update OCR draft (modify extracted data, assign company, etc.)"""
    draft = await db.ocr_drafts.find_one({"id": draft_id, "user_id": current_user["id"]})
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.ocr_drafts.update_one(
        {"id": draft_id},
        {"$set": update_dict}
    )
    
    updated_draft = await db.ocr_drafts.find_one({"id": draft_id}, {"_id": 0})
    return updated_draft

@api_router.post("/ocr/drafts/{draft_id}/approve")
async def approve_ocr_draft(
    draft_id: str,
    approve_data: OcrDraftApprove,
    current_user: dict = Depends(get_current_user)
):
    """Approve OCR draft and create transaction"""
    draft = await db.ocr_drafts.find_one({"id": draft_id, "user_id": current_user["id"]})
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    if draft.get("status") == "approved":
        raise HTTPException(status_code=400, detail="Draft already approved")
    
    # Verify company exists and belongs to user
    company = await db.companies.find_one({
        "id": approve_data.company_id,
        "user_id": current_user["id"]
    })
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    
    # Create transaction from extracted data
    extracted = draft.get("extracted_data", {})
    
    transaction_dict = {
        "id": str(uuid.uuid4()),
        "company_id": approve_data.company_id,
        "type": "bill",  # Receipt/invoice is typically a bill
        "amount": extracted.get("amount", 0),
        "currency": extracted.get("currency", "USD"),
        "date": extracted.get("date", datetime.now(timezone.utc).strftime("%Y-%m-%d")),
        "description": extracted.get("description", f"Receipt from {extracted.get('vendor', 'Unknown vendor')}"),
        "category": approve_data.category or "Uncategorized",
        "cost_center": approve_data.cost_center or extracted.get("suggested_cost_center"),
        "source": "ocr",
        "reconciliation_status": "pending",
        "metadata": {
            "ocr_draft_id": draft_id,
            "vendor": extracted.get("vendor"),
            "invoice_number": extracted.get("invoice_number"),
            "payment_method": extracted.get("payment_method"),
            "line_items": extracted.get("line_items", []),
            "tax_amount": extracted.get("tax_amount"),
            "subtotal": extracted.get("subtotal"),
            "file_name": draft.get("file_name"),
            "file_path": draft.get("file_path")
        },
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.transactions.insert_one(transaction_dict)
    
    # Update draft status
    await db.ocr_drafts.update_one(
        {"id": draft_id},
        {"$set": {
            "status": "approved",
            "company_id": approve_data.company_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Draft approved and transaction created",
        "transaction_id": transaction_dict["id"],
        "draft_id": draft_id
    }

@api_router.delete("/ocr/drafts/{draft_id}")
async def delete_ocr_draft(
    draft_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete OCR draft and associated file"""
    draft = await db.ocr_drafts.find_one({"id": draft_id, "user_id": current_user["id"]})
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    # Delete file if it exists
    file_path = Path(draft.get("file_path", ""))
    if file_path.exists():
        file_path.unlink()
    
    # Delete from database
    await db.ocr_drafts.delete_one({"id": draft_id})
    
    return {"message": "Draft deleted successfully"}

# ==================== AI FINANCIAL ADVISOR CHAT ROUTES ====================

# Helper functions for chat context
def generate_historical_data(entity_id: str, time_period: str = "30d"):
    """Generate historical data points for an entity"""
    now = datetime.now(timezone.utc)
    year_start = datetime(now.year, 1, 1, tzinfo=timezone.utc)
    ytd_days = (now - year_start).days
    
    data_points_config = {
        "1d": {"days": 1, "points": 24, "interval_hours": 1},
        "7d": {"days": 7, "points": 7, "interval_hours": 24},
        "30d": {"days": 30, "points": 30, "interval_hours": 24},
        "6m": {"days": 180, "points": 26, "interval_hours": 24 * 7},
        "ytd": {"days": ytd_days, 
                "points": min(52, ytd_days // 7),
                "interval_hours": 24 * 7},
        "3y": {"days": 1095, "points": 36, "interval_hours": 24 * 30},  # monthly (3 years)
        "5y": {"days": 1825, "points": 60, "interval_hours": 24 * 30}   # monthly (5 years)
    }
    
    config = data_points_config.get(time_period, data_points_config["30d"])
    num_points = config["points"]
    
    # Generate time-series data points
    data_points = []
    base_revenue = random.uniform(100000, 500000)
    base_expenses = random.uniform(70000, 300000)
    base_cash = random.uniform(50000, 200000)
    
    for i in range(num_points):
        if time_period == "1d":
            date = datetime.now(timezone.utc) - timedelta(hours=(num_points - i - 1))
            date_str = date.strftime("%Y-%m-%d %H:00")
        else:
            date = datetime.now(timezone.utc) - timedelta(days=(num_points - i - 1) * (config["interval_hours"] // 24))
            date_str = date.strftime("%Y-%m-%d")
        
        variance = random.uniform(0.85, 1.15)
        growth_factor = 1 + (i / num_points) * 0.2
        
        revenue = base_revenue * variance * growth_factor
        expenses = base_expenses * variance * (1 + (i / num_points) * 0.1)
        ebitda = revenue - expenses
        cash_balance = base_cash * (1 + (i / num_points) * 0.15)
        profit_margin = (ebitda / revenue * 100) if revenue > 0 else 0
        
        data_points.append({
            "date": date_str,
            "revenue": round(revenue, 2),
            "expenses": round(expenses, 2),
            "ebitda": round(ebitda, 2),
            "cash_balance": round(cash_balance, 2),
            "profit_margin": round(profit_margin, 2)
        })
    
    return data_points

def calculate_kpis(entity_id: str, data_points: List[Dict]):
    """Calculate KPIs from data points"""
    if not data_points:
        return {}
    
    latest = data_points[-1]
    revenue = latest["revenue"]
    expenses = latest["expenses"]
    ebitda = latest["ebitda"]
    cash = latest["cash_balance"]
    
    ebitda_margin = (ebitda / revenue * 100) if revenue > 0 else 0
    expense_ratio = (expenses / revenue * 100) if revenue > 0 else 0
    profit_margin = (ebitda / revenue * 100) if revenue > 0 else 0
    monthly_burn = expenses / 12
    runway = int((cash / monthly_burn) * 30) if monthly_burn > 0 else 365
    quick_ratio = cash / (expenses / 12) if expenses > 0 else 0
    
    # Calculate growth
    if len(data_points) > 1:
        revenue_growth = ((data_points[-1]["revenue"] - data_points[0]["revenue"]) / data_points[0]["revenue"] * 100)
    else:
        revenue_growth = 0
    
    return {
        "revenue": round(revenue, 2),
        "expenses": round(expenses, 2),
        "ebitda": round(ebitda, 2),
        "ebitda_margin": round(ebitda_margin, 2),
        "cash_balance": round(cash, 2),
        "runway_days": runway,
        "revenue_growth": round(revenue_growth, 2),
        "expense_ratio": round(expense_ratio, 2),
        "profit_margin": round(profit_margin, 2),
        "quick_ratio": round(quick_ratio, 2),
        "burn_rate": round(monthly_burn, 2)
    }

financial_advisor = FinancialAdvisor()

@api_router.post("/chat/send", response_model=ChatResponse)
async def send_chat_message(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send a message to the AI financial advisor"""
    try:
        user_id = current_user["id"]
        
        # Create or get session
        session_id = request.session_id
        if not session_id:
            # Create new session
            session = ChatSession(
                user_id=user_id,
                entity_id=request.entity_id,
                title=request.message[:50] + "..." if len(request.message) > 50 else request.message
            )
            session_dict = session.model_dump()
            await db.chat_sessions.insert_one(session_dict)
            session_id = session.id
        else:
            # Update existing session
            await db.chat_sessions.update_one(
                {"id": session_id, "user_id": user_id},
                {"$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        
        # Get entity data if entity_id provided
        entity_data = None
        historical_data = None
        if request.entity_id:
            entity = await db.companies.find_one({"id": request.entity_id})
            if entity:
                entity_data = {
                    "entity_name": entity.get("name"),
                    "industry": entity.get("industry"),
                    "currency": entity.get("currency", "EUR")
                }
                
                # Get historical data
                time_period = "30d"
                data_points = generate_historical_data(entity.get("id"), time_period)
                summary = calculate_kpis(entity.get("id"), data_points)
                historical_data = {
                    "data_points": data_points,
                    "summary": summary
                }
        
        # Save user message
        user_message = ChatMessage(
            session_id=session_id,
            user_id=user_id,
            entity_id=request.entity_id,
            role="user",
            content=request.message
        )
        user_message_dict = user_message.model_dump()
        user_message_dict["timestamp"] = user_message_dict["timestamp"].isoformat()
        await db.chat_messages.insert_one(user_message_dict)
        
        # Get AI response
        ai_response = await financial_advisor.send_message(
            session_id=session_id,
            user_message=request.message,
            entity_data=entity_data,
            historical_data=historical_data
        )
        
        # Save AI response
        assistant_message = ChatMessage(
            session_id=session_id,
            user_id=user_id,
            entity_id=request.entity_id,
            role="assistant",
            content=ai_response
        )
        assistant_message_dict = assistant_message.model_dump()
        assistant_message_dict["timestamp"] = assistant_message_dict["timestamp"].isoformat()
        await db.chat_messages.insert_one(assistant_message_dict)
        
        # Get suggested questions
        suggested_questions = FinancialAdvisor.get_suggested_questions(entity_data)
        
        return ChatResponse(
            response=ai_response,
            session_id=session_id,
            message_id=assistant_message.id,
            suggested_questions=suggested_questions
        )
        
    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/chat/sessions")
async def get_chat_sessions(current_user: dict = Depends(get_current_user)):
    """Get all chat sessions for the current user"""
    user_id = current_user["id"]
    sessions = await db.chat_sessions.find(
        {"user_id": user_id}, {"_id": 0}
    ).sort("updated_at", -1).to_list(length=100)
    
    return {"sessions": sessions}

@api_router.get("/chat/session/{session_id}/messages")
async def get_session_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get all messages for a specific chat session"""
    user_id = current_user["id"]
    
    # Verify session belongs to user
    session = await db.chat_sessions.find_one({"id": session_id, "user_id": user_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    messages = await db.chat_messages.find(
        {"session_id": session_id}, {"_id": 0}
    ).sort("timestamp", 1).to_list(length=1000)
    
    return {"messages": messages, "session": session}

@api_router.delete("/chat/session/{session_id}")
async def delete_chat_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete a chat session and all its messages"""
    user_id = current_user["id"]
    
    # Verify session belongs to user
    session = await db.chat_sessions.find_one({"id": session_id, "user_id": user_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Delete messages
    await db.chat_messages.delete_many({"session_id": session_id})
    
    # Delete session
    await db.chat_sessions.delete_one({"id": session_id})
    
    return {"message": "Session deleted successfully"}

@api_router.get("/chat/suggested-questions")
async def get_suggested_questions(
    entity_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get suggested questions for the chat"""
    entity_data = None
    
    if entity_id:
        entity = await db.companies.find_one({"id": entity_id})
        if entity:
            entity_data = {
                "entity_name": entity.get("name"),
                "industry": entity.get("industry"),
                "currency": entity.get("currency", "EUR")
            }
    
    questions = FinancialAdvisor.get_suggested_questions(entity_data)
    return {"questions": questions}


# ==================== AI ADVISOR SETTINGS ROUTES ====================

@api_router.get("/settings/ai-advisor")
async def get_ai_advisor_settings(current_user: dict = Depends(get_current_user)):
    """Get AI Advisor access settings (for displaying access status to any user)"""
    
    # If user is admin, return their settings
    if current_user.get("role") == "admin":
        settings = await db.ai_advisor_settings.find_one(
            {"user_id": current_user["id"]},
            {"_id": 0}
        )
        
        if not settings:
            # Create default settings for admin
            default_settings = AIAdvisorSettings(
                user_id=current_user["id"],
                global_enabled=True,
                authorized_user_ids=[]
            )
            settings_dict = default_settings.model_dump()
            settings_dict['created_at'] = settings_dict['created_at'].isoformat()
            settings_dict['updated_at'] = settings_dict['updated_at'].isoformat()
            await db.ai_advisor_settings.insert_one(settings_dict)
            settings = settings_dict
        
        # Get all users for the admin to see
        all_users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(100)
        
        # Convert datetime fields to ISO strings for JSON serialization
        for user in all_users:
            if isinstance(user.get('created_at'), datetime):
                user['created_at'] = user['created_at'].isoformat()
        
        return {
            "settings": settings,
            "is_admin": True,
            "has_access": True,
            "all_users": all_users
        }
    else:
        # For tenants, check if they have access
        # Find admin's settings (first admin user)
        admin_user = await db.users.find_one({"role": "admin"})
        if not admin_user:
            return {
                "is_admin": False,
                "has_access": False,
                "settings": {"global_enabled": False}
            }
        
        settings = await db.ai_advisor_settings.find_one(
            {"user_id": admin_user["id"]},
            {"_id": 0}
        )
        
        if not settings:
            return {
                "is_admin": False,
                "has_access": False,
                "settings": {"global_enabled": False}
            }
        
        # Check if tenant has access
        # If global_enabled is True, all users have access
        # Otherwise, check if user is in authorized_user_ids list
        has_access = (
            settings.get("global_enabled", False) or 
            current_user["id"] in settings.get("authorized_user_ids", [])
        )
        
        return {
            "is_admin": False,
            "has_access": has_access,
            "settings": {
                "global_enabled": settings.get("global_enabled", False)
            }
        }

@api_router.put("/settings/ai-advisor")
async def update_ai_advisor_settings(
    settings_update: AIAdvisorSettingsUpdate,
    current_user: dict = Depends(require_admin)
):
    """Update AI Advisor settings (admin only)"""
    
    # Get existing settings
    existing = await db.ai_advisor_settings.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    
    if not existing:
        # Create new settings
        new_settings = AIAdvisorSettings(
            user_id=current_user["id"],
            **settings_update.model_dump(exclude_none=True)
        )
        settings_dict = new_settings.model_dump()
        settings_dict['created_at'] = settings_dict['created_at'].isoformat()
        settings_dict['updated_at'] = settings_dict['updated_at'].isoformat()
        await db.ai_advisor_settings.insert_one(settings_dict)
        return {"message": "AI Advisor settings created", "settings": settings_dict}
    
    # Update existing settings
    update_data = settings_update.model_dump(exclude_none=True)
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.ai_advisor_settings.update_one(
        {"user_id": current_user["id"]},
        {"$set": update_data}
    )
    
    # Return updated settings
    updated = await db.ai_advisor_settings.find_one(
        {"user_id": current_user["id"]},
        {"_id": 0}
    )
    
    return {"message": "AI Advisor settings updated", "settings": updated}

# ==================== ENTITY GROUPS ROUTES ====================

@api_router.post("/entity-groups", response_model=EntityGroup)
async def create_entity_group(
    group_data: EntityGroupCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create a new entity group"""
    
    # Verify all entity IDs belong to the user
    for entity_id in group_data.entity_ids:
        entity = await db.companies.find_one({
            "id": entity_id,
            "user_id": current_user["id"]
        })
        if not entity:
            raise HTTPException(
                status_code=400,
                detail=f"Entity {entity_id} not found or doesn't belong to you"
            )
    
    # Create group
    group = EntityGroup(
        user_id=current_user["id"],
        **group_data.model_dump()
    )
    
    group_dict = group.model_dump()
    group_dict['created_at'] = group_dict['created_at'].isoformat()
    group_dict['updated_at'] = group_dict['updated_at'].isoformat()
    
    await db.entity_groups.insert_one(group_dict)
    
    return group

@api_router.get("/entity-groups", response_model=List[EntityGroup])
async def get_entity_groups(current_user: dict = Depends(get_current_user)):
    """Get all entity groups for the current user"""
    
    groups = await db.entity_groups.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    
    for group in groups:
        if isinstance(group.get('created_at'), str):
            group['created_at'] = datetime.fromisoformat(group['created_at'])
        if isinstance(group.get('updated_at'), str):
            group['updated_at'] = datetime.fromisoformat(group['updated_at'])
    
    return groups

@api_router.get("/entity-groups/{group_id}", response_model=EntityGroup)
async def get_entity_group(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific entity group"""
    
    group = await db.entity_groups.find_one({
        "id": group_id,
        "user_id": current_user["id"]
    }, {"_id": 0})
    
    if not group:
        raise HTTPException(status_code=404, detail="Entity group not found")
    
    if isinstance(group.get('created_at'), str):
        group['created_at'] = datetime.fromisoformat(group['created_at'])
    if isinstance(group.get('updated_at'), str):
        group['updated_at'] = datetime.fromisoformat(group['updated_at'])
    
    return EntityGroup(**group)

@api_router.put("/entity-groups/{group_id}", response_model=EntityGroup)
async def update_entity_group(
    group_id: str,
    group_update: EntityGroupUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update an entity group"""
    
    # Check if group exists and belongs to user
    group = await db.entity_groups.find_one({
        "id": group_id,
        "user_id": current_user["id"]
    })
    
    if not group:
        raise HTTPException(status_code=404, detail="Entity group not found")
    
    # Verify new entity IDs if provided
    update_data = group_update.model_dump(exclude_none=True)
    if "entity_ids" in update_data:
        for entity_id in update_data["entity_ids"]:
            entity = await db.companies.find_one({
                "id": entity_id,
                "user_id": current_user["id"]
            })
            if not entity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Entity {entity_id} not found or doesn't belong to you"
                )
    
    # Update group
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.entity_groups.update_one(
        {"id": group_id},
        {"$set": update_data}
    )
    
    # Return updated group
    updated = await db.entity_groups.find_one({
        "id": group_id
    }, {"_id": 0})
    
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return EntityGroup(**updated)

@api_router.delete("/entity-groups/{group_id}")
async def delete_entity_group(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Delete an entity group"""
    
    # Check if group exists and belongs to user
    group = await db.entity_groups.find_one({
        "id": group_id,
        "user_id": current_user["id"]
    })
    
    if not group:
        raise HTTPException(status_code=404, detail="Entity group not found")
    
    await db.entity_groups.delete_one({"id": group_id})
    
    return {"message": "Entity group deleted successfully", "deleted_id": group_id}

@api_router.get("/entity-groups/{group_id}/dashboard", response_model=DashboardMetrics)
async def get_entity_group_dashboard(
    group_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get combined dashboard metrics for all entities in a group"""
    
    # Get the group
    group = await db.entity_groups.find_one({
        "id": group_id,
        "user_id": current_user["id"]
    }, {"_id": 0})
    
    if not group:
        raise HTTPException(status_code=404, detail="Entity group not found")
    
    entity_ids = group.get("entity_ids", [])
    
    if not entity_ids:
        # Return empty metrics
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
    
    # Aggregate metrics across all entities in the group
    total_revenue = 0
    total_expenses = 0
    total_cash = 0
    all_transactions = []
    
    for entity_id in entity_ids:
        # Verify entity belongs to user
        entity = await db.companies.find_one({
            "id": entity_id,
            "user_id": current_user["id"]
        })
        
        if not entity:
            continue
        
        # Generate mock data for each entity (in production, would aggregate real data)
        entity_revenue = random.uniform(100000, 500000)
        entity_expenses = random.uniform(70000, 300000)
        entity_cash = random.uniform(50000, 200000)
        
        total_revenue += entity_revenue
        total_expenses += entity_expenses
        total_cash += entity_cash
        
        # Get transactions for this entity
        entity_transactions = await db.transactions.find(
            {"company_id": entity_id}, 
            {"_id": 0}
        ).limit(5).to_list(5)
        all_transactions.extend(entity_transactions)
    
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

# ==================== FP&A MODULE ROUTERS ====================
# Register FP&A routers
fpa_planning_router = get_fpa_router(db, get_current_user)
fpa_drivers_router = get_drivers_router(db, get_current_user)
fpa_dimensions_router = get_dimensions_router(db, get_current_user)
fpa_integrations_router = get_integrations_router(db, get_current_user)
fpa_admin_router = get_admin_router(db, get_current_user, require_admin)
fpa_phase4_router = get_phase4_router(db, get_current_user)

api_router.include_router(fpa_planning_router)
api_router.include_router(fpa_drivers_router)
api_router.include_router(fpa_dimensions_router)
api_router.include_router(fpa_integrations_router)
api_router.include_router(fpa_admin_router)
api_router.include_router(fpa_ai_router, prefix="/fpa/ai", tags=["FP&A AI"])
api_router.include_router(fpa_phase4_router)
fpa_assets_router = get_assets_router(db, get_current_user)
api_router.include_router(fpa_assets_router)

# ERP Integrations Router (Initialize before CFO Dashboard)
from routes import erp_integrations
from services.erp_integration_manager import ERPIntegrationManager
from services.erp_sync_scheduler import ERPSyncScheduler

# Initialize ERP manager and scheduler
erp_integration_manager = ERPIntegrationManager(db)
erp_sync_scheduler_instance = ERPSyncScheduler(erp_integration_manager)

# Set global instances in router module
erp_integrations.erp_manager = erp_integration_manager
erp_integrations.sync_scheduler = erp_sync_scheduler_instance

api_router.include_router(erp_integrations.router, prefix="/erp", tags=["ERP Integrations"])

# CFO Dashboard Router (with ERP manager integration)
from routes.cfo_dashboard import get_dashboard_router_with_erp
cfo_dashboard_router = get_dashboard_router_with_erp(db, erp_integration_manager)
api_router.include_router(cfo_dashboard_router, prefix="/cfo", tags=["CFO Command Center"])

# Include router
app.include_router(api_router)

# Add CORS middleware first
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add Longtail Logging Middleware for comprehensive request tracking
from logging_middleware import LongtailLoggingMiddleware
app.add_middleware(LongtailLoggingMiddleware)

# ==================== LONGTAIL LOGGING ENDPOINTS ====================

from logging_utils import global_logger

@api_router.get("/longtail/stats")
@longtail_tracker()
async def get_longtail_stats(current_user: dict = Depends(get_current_user)):
    """
    Get comprehensive execution statistics from longtail logging
    Shows performance metrics, success rates, and execution history
    """
    logger.info(f"[LONGTAIL] Stats requested by user: {current_user.get('email')}")
    
    stats = global_logger.get_execution_stats()
    
    return {
        "status": "success",
        "data": stats,
        "message": "Longtail logging statistics retrieved successfully"
    }

@api_router.get("/longtail/history")
@longtail_tracker()
async def get_longtail_history(
    limit: int = 100,
    current_user: dict = Depends(get_current_user)
):
    """
    Get recent execution history from longtail logging
    """
    logger.info(f"[LONGTAIL] History requested by user: {current_user.get('email')} | Limit: {limit}")
    
    # Get last N entries
    history = global_logger.execution_history[-limit:]
    
    return {
        "status": "success",
        "data": history,
        "count": len(history),
        "message": f"Retrieved last {len(history)} execution records"
    }

# ==================== END LONGTAIL ENDPOINTS ====================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting ERP sync scheduler...")
    erp_sync_scheduler_instance.start()

@app.on_event("shutdown")
async def shutdown_db_client():
    """Cleanup on shutdown"""
    logger.info("Stopping ERP sync scheduler...")
    erp_sync_scheduler_instance.stop()
    logger.info("Closing ERP connections...")
    await erp_integration_manager.close_all()
    logger.info("Closing MongoDB connection...")
    client.close()


# =======================
# EMAIL AUTOMATION ENDPOINTS
# =======================
from gmail_integration import GmailIntegration
from email_automation_service import EmailAutomationService
from accounting_integrations import XeroIntegration

# Initialize email automation service
email_automation_service = None

@app.on_event("startup")
async def startup_email_automation():
    global email_automation_service
    try:
        db_name = os.environ.get('DB_NAME', 'myglobalcfo_db')
        email_automation_service = EmailAutomationService(client, db_name)
        await email_automation_service.initialize()
        logger.info("Email automation service initialized")
    except Exception as e:
        logger.error(f"Failed to initialize email automation service: {str(e)}")


# Gmail OAuth endpoints
@api_router.post("/email/gmail/connect")
async def connect_gmail(current_user: dict = Depends(get_current_user)):
    """Initiate Gmail OAuth connection"""
    try:
        gmail = GmailIntegration(
            client_id=os.getenv('GMAIL_CLIENT_ID'),
            client_secret=os.getenv('GMAIL_CLIENT_SECRET'),
            redirect_uri=os.getenv('GMAIL_REDIRECT_URI')
        )
        
        state = str(uuid.uuid4())
        auth_url = gmail.create_auth_url(state)
        
        # Store state for verification
        await db.oauth_states.insert_one({
            'user_id': current_user['id'],
            'state': state,
            'provider': 'gmail',
            'created_at': datetime.now(timezone.utc)
        })
        
        return {'auth_url': auth_url}
    
    except Exception as e:
        logger.error(f"Error connecting Gmail: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/email/gmail/callback")
async def gmail_callback(code: str, state: str):
    """Handle Gmail OAuth callback"""
    try:
        # Verify state
        oauth_state = await db.oauth_states.find_one({'state': state, 'provider': 'gmail'})
        
        if not oauth_state:
            raise HTTPException(status_code=400, detail="Invalid state")
        
        user_id = oauth_state['user_id']
        
        # Exchange code for tokens
        gmail = GmailIntegration(
            client_id=os.getenv('GMAIL_CLIENT_ID'),
            client_secret=os.getenv('GMAIL_CLIENT_SECRET'),
            redirect_uri=os.getenv('GMAIL_REDIRECT_URI')
        )
        
        tokens = gmail.exchange_code_for_tokens(code)
        
        # Store tokens
        await db.email_integrations.update_one(
            {'user_id': user_id, 'provider': 'gmail'},
            {'$set': {
                'user_id': user_id,
                'provider': 'gmail',
                'access_token': tokens['access_token'],
                'refresh_token': tokens['refresh_token'],
                'token_expiry': tokens['token_expiry'],
                'status': 'active',
                'connected_at': datetime.now(timezone.utc)
            }},
            upsert=True
        )
        
        # Delete used state
        await db.oauth_states.delete_one({'_id': oauth_state['_id']})
        
        return {"message": "Gmail connected successfully"}
    
    except Exception as e:
        logger.error(f"Error in Gmail callback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Xero OAuth endpoints
@api_router.post("/accounting/xero/connect")
async def connect_xero(current_user: dict = Depends(get_current_user)):
    """Initiate Xero OAuth connection"""
    try:
        xero_client_id = os.getenv('XERO_CLIENT_ID')
        xero_redirect_uri = os.getenv('XERO_REDIRECT_URI')
        
        if not xero_client_id:
            raise HTTPException(status_code=400, detail="Xero not configured")
        
        state = str(uuid.uuid4())
        
        # Build Xero auth URL
        auth_url = (
            f"https://login.xero.com/identity/connect/authorize?"
            f"response_type=code&"
            f"client_id={xero_client_id}&"
            f"redirect_uri={xero_redirect_uri}&"
            f"scope=accounting.transactions accounting.contacts accounting.settings&"
            f"state={state}"
        )
        
        # Store state
        await db.oauth_states.insert_one({
            'user_id': current_user['id'],
            'state': state,
            'provider': 'xero',
            'created_at': datetime.now(timezone.utc)
        })
        
        return {'auth_url': auth_url}
    
    except Exception as e:
        logger.error(f"Error connecting Xero: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/accounting/xero/callback")
async def xero_callback(code: str, state: str):
    """Handle Xero OAuth callback"""
    try:
        # Verify state
        oauth_state = await db.oauth_states.find_one({'state': state, 'provider': 'xero'})
        
        if not oauth_state:
            raise HTTPException(status_code=400, detail="Invalid state")
        
        user_id = oauth_state['user_id']
        
        # Exchange code for tokens
        token_url = "https://identity.xero.com/connect/token"
        
        response = requests.post(
            token_url,
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            data={
                'grant_type': 'authorization_code',
                'code': code,
                'redirect_uri': os.getenv('XERO_REDIRECT_URI'),
                'client_id': os.getenv('XERO_CLIENT_ID'),
                'client_secret': os.getenv('XERO_CLIENT_SECRET')
            }
        )
        
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to exchange code")
        
        tokens = response.json()
        
        # Get tenant ID (organization)
        connections_response = requests.get(
            "https://api.xero.com/connections",
            headers={'Authorization': f"Bearer {tokens['access_token']}"}
        )
        
        if connections_response.status_code == 200:
            connections = connections_response.json()
            if connections:
                tenant_id = connections[0]['tenantId']
            else:
                raise HTTPException(status_code=400, detail="No Xero organization found")
        else:
            raise HTTPException(status_code=400, detail="Failed to get Xero connections")
        
        # Store tokens
        await db.accounting_integrations.update_one(
            {'user_id': user_id, 'provider': 'xero'},
            {'$set': {
                'user_id': user_id,
                'provider': 'xero',
                'access_token': tokens['access_token'],
                'refresh_token': tokens['refresh_token'],
                'tenant_id': tenant_id,
                'client_id': os.getenv('XERO_CLIENT_ID'),
                'client_secret': os.getenv('XERO_CLIENT_SECRET'),
                'status': 'active',
                'connected_at': datetime.now(timezone.utc)
            }},
            upsert=True
        )
        
        # Delete used state
        await db.oauth_states.delete_one({'_id': oauth_state['_id']})
        
        return {"message": "Xero connected successfully"}
    
    except Exception as e:
        logger.error(f"Error in Xero callback: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Email monitoring control
@api_router.post("/email/monitoring/start")
async def start_email_monitoring(current_user: dict = Depends(get_current_user)):
    """Start email monitoring for current user"""
    try:
        if not email_automation_service:
            raise HTTPException(status_code=503, detail="Email automation service not available")
        
        # Start monitoring in background
        asyncio.create_task(email_automation_service.start_monitoring(current_user['id']))
        
        return {"message": "Email monitoring started", "poll_interval": 300}
    
    except Exception as e:
        logger.error(f"Error starting email monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.post("/email/monitoring/stop")
async def stop_email_monitoring(current_user: dict = Depends(get_current_user)):
    """Stop email monitoring"""
    try:
        if not email_automation_service:
            raise HTTPException(status_code=503, detail="Email automation service not available")
        
        email_automation_service.stop_monitoring()
        
        return {"message": "Email monitoring stopped"}
    
    except Exception as e:
        logger.error(f"Error stopping email monitoring: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/email/monitoring/stats")
async def get_monitoring_stats(current_user: dict = Depends(get_current_user)):
    """Get email monitoring statistics"""
    try:
        if not email_automation_service:
            raise HTTPException(status_code=503, detail="Email automation service not available")
        
        stats = email_automation_service.get_stats()
        
        return stats
    
    except Exception as e:
        logger.error(f"Error getting stats: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# Extracted invoices endpoints
@api_router.get("/invoices/extracted")
async def get_extracted_invoices(
    limit: int = 20,
    skip: int = 0,
    current_user: dict = Depends(get_current_user)
):
    """Get list of extracted invoices"""
    try:
        invoices = await db.extracted_invoices.find(
            {'user_id': current_user['id']}
        ).sort('extracted_at', -1).skip(skip).limit(limit).to_list(length=limit)
        
        # Convert ObjectId to string
        for invoice in invoices:
            invoice['_id'] = str(invoice['_id'])
        
        total = await db.extracted_invoices.count_documents({'user_id': current_user['id']})
        
        return {
            'invoices': invoices,
            'total': total,
            'limit': limit,
            'skip': skip
        }
    
    except Exception as e:
        logger.error(f"Error getting extracted invoices: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@api_router.get("/integrations/status")
async def get_integrations_status(current_user: dict = Depends(get_current_user)):
    """Get status of all integrations"""
    try:
        email_integration = await db.email_integrations.find_one({
            'user_id': current_user['id'],
            'provider': 'gmail'
        })
        
        accounting_integrations = await db.accounting_integrations.find({
            'user_id': current_user['id']
        }).to_list(length=10)
        
        return {
            'email': {
                'gmail': {
                    'connected': email_integration is not None,
                    'status': email_integration.get('status') if email_integration else None
                }
            },
            'accounting': {
                integration.get('provider'): {
                    'connected': True,
                    'status': integration.get('status')
                }
                for integration in accounting_integrations
            }
        }
    
    except Exception as e:
        logger.error(f"Error getting integrations status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))