"""
Seed script for FP&A dimensions
Creates initial entities, departments, accounts, etc.
"""

import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import uuid
from dotenv import load_dotenv
from pathlib import Path

async def seed_dimensions():
    """Seed initial dimension data"""
    
    # Load environment variables
    ROOT_DIR = Path(__file__).parent
    load_dotenv(ROOT_DIR / '.env')
    
    # Connect to MongoDB
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🌱 Seeding FP&A dimensions...")
    
    # 1. ENTITIES
    entities = [
        {"id": str(uuid.uuid4()), "name": "Global HQ", "code": "HQ", "currency": "USD", "parent_entity_id": None, "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "US Operations", "code": "US-OPS", "currency": "USD", "parent_entity_id": None, "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "EMEA Operations", "code": "EMEA-OPS", "currency": "EUR", "parent_entity_id": None, "is_active": True, "created_at": datetime.now(timezone.utc)},
    ]
    
    # Check if entities already exist
    count = await db.entities.count_documents({})
    if count == 0:
        await db.entities.insert_many(entities)
        print(f"✅ Created {len(entities)} entities")
    else:
        print(f"ℹ️  Entities already exist ({count})")
    
    # Get first entity ID for departments
    first_entity = await db.entities.find_one({}, {"_id": 0})
    entity_id = first_entity["id"] if first_entity else entities[0]["id"]
    
    # 2. DEPARTMENTS
    departments = [
        {"id": str(uuid.uuid4()), "name": "Sales", "code": "SALES", "entity_id": entity_id, "manager_user_id": None, "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Marketing", "code": "MKTG", "entity_id": entity_id, "manager_user_id": None, "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Engineering", "code": "ENG", "entity_id": entity_id, "manager_user_id": None, "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Operations", "code": "OPS", "entity_id": entity_id, "manager_user_id": None, "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Finance", "code": "FIN", "entity_id": entity_id, "manager_user_id": None, "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Customer Success", "code": "CS", "entity_id": entity_id, "manager_user_id": None, "is_active": True, "created_at": datetime.now(timezone.utc)},
    ]
    
    count = await db.departments.count_documents({})
    if count == 0:
        await db.departments.insert_many(departments)
        print(f"✅ Created {len(departments)} departments")
    else:
        print(f"ℹ️  Departments already exist ({count})")
    
    # 3. ACCOUNTS (Chart of Accounts)
    accounts = [
        # Revenue
        {"id": str(uuid.uuid4()), "name": "Product Revenue", "code": "REV-PROD", "category": "Revenue", "account_type": "P&L", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Service Revenue", "code": "REV-SVC", "category": "Revenue", "account_type": "P&L", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Subscription Revenue", "code": "REV-SUB", "category": "Revenue", "account_type": "P&L", "is_active": True, "created_at": datetime.now(timezone.utc)},
        
        # COGS
        {"id": str(uuid.uuid4()), "name": "Cost of Goods Sold", "code": "COGS", "category": "COGS", "account_type": "P&L", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Cost of Services", "code": "COS", "category": "COGS", "account_type": "P&L", "is_active": True, "created_at": datetime.now(timezone.utc)},
        
        # Operating Expenses
        {"id": str(uuid.uuid4()), "name": "Salaries & Wages", "code": "OPEX-SAL", "category": "OpEx", "account_type": "P&L", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Benefits", "code": "OPEX-BEN", "category": "OpEx", "account_type": "P&L", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Marketing Expenses", "code": "OPEX-MKT", "category": "OpEx", "account_type": "P&L", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Office Rent", "code": "OPEX-RENT", "category": "OpEx", "account_type": "P&L", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Software & Tools", "code": "OPEX-SW", "category": "OpEx", "account_type": "P&L", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Travel & Entertainment", "code": "OPEX-TRV", "category": "OpEx", "account_type": "P&L", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Professional Services", "code": "OPEX-PROF", "category": "OpEx", "account_type": "P&L", "is_active": True, "created_at": datetime.now(timezone.utc)},
        
        # Other
        {"id": str(uuid.uuid4()), "name": "Interest Income", "code": "INT-INC", "category": "Other Income", "account_type": "P&L", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Interest Expense", "code": "INT-EXP", "category": "Other Expense", "account_type": "P&L", "is_active": True, "created_at": datetime.now(timezone.utc)},
    ]
    
    count = await db.accounts.count_documents({})
    if count == 0:
        await db.accounts.insert_many(accounts)
        print(f"✅ Created {len(accounts)} accounts")
    else:
        print(f"ℹ️  Accounts already exist ({count})")
    
    # 4. PRODUCTS
    products = [
        {"id": str(uuid.uuid4()), "name": "Core Platform", "code": "CORE", "category": "Software", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Enterprise Suite", "code": "ENT", "category": "Software", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Professional Services", "code": "PROF-SVC", "category": "Services", "is_active": True, "created_at": datetime.now(timezone.utc)},
    ]
    
    count = await db.products.count_documents({})
    if count == 0:
        await db.products.insert_many(products)
        print(f"✅ Created {len(products)} products")
    else:
        print(f"ℹ️  Products already exist ({count})")
    
    # 5. CUSTOMER SEGMENTS
    segments = [
        {"id": str(uuid.uuid4()), "name": "Enterprise", "code": "ENT", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "Mid-Market", "code": "MID", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "SMB", "code": "SMB", "is_active": True, "created_at": datetime.now(timezone.utc)},
    ]
    
    count = await db.customer_segments.count_documents({})
    if count == 0:
        await db.customer_segments.insert_many(segments)
        print(f"✅ Created {len(segments)} customer segments")
    else:
        print(f"ℹ️  Customer segments already exist ({count})")
    
    # 6. GEOGRAPHIES
    geographies = [
        {"id": str(uuid.uuid4()), "name": "Americas", "code": "AMER", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "EMEA", "code": "EMEA", "is_active": True, "created_at": datetime.now(timezone.utc)},
        {"id": str(uuid.uuid4()), "name": "APAC", "code": "APAC", "is_active": True, "created_at": datetime.now(timezone.utc)},
    ]
    
    count = await db.geographies.count_documents({})
    if count == 0:
        await db.geographies.insert_many(geographies)
        print(f"✅ Created {len(geographies)} geographies")
    else:
        print(f"ℹ️  Geographies already exist ({count})")
    
    print("\n🎉 FP&A dimension seeding complete!")
    
    # Print summary
    print("\n📊 Summary:")
    print(f"  Entities: {await db.entities.count_documents({'is_active': True})}")
    print(f"  Departments: {await db.departments.count_documents({'is_active': True})}")
    print(f"  Accounts: {await db.accounts.count_documents({'is_active': True})}")
    print(f"  Products: {await db.products.count_documents({'is_active': True})}")
    print(f"  Segments: {await db.customer_segments.count_documents({'is_active': True})}")
    print(f"  Geographies: {await db.geographies.count_documents({'is_active': True})}")

if __name__ == "__main__":
    asyncio.run(seed_dimensions())
