"""
Seed script for Phase 3: Driver-Based Modeling
Creates sample drivers, formulas, and demo data
"""

import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
from uuid import uuid4
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]


async def seed_drivers():
    """Create sample operational drivers"""
    print("🚀 Seeding operational drivers...")
    
    # Get first entity and department for demo
    entity = await db.entities.find_one({"is_active": True}, {"_id": 0})
    department = await db.departments.find_one({"is_active": True}, {"_id": 0})
    
    if not entity or not department:
        print("❌ No entities or departments found. Please run seed_fpa_dimensions.py first")
        return
    
    # Get a test user
    user = await db.users.find_one({}, {"_id": 0})
    if not user:
        print("❌ No users found")
        return
    
    user_id = user["id"]
    
    drivers = [
        {
            "id": str(uuid4()),
            "name": "Sales Headcount",
            "code": "HC_SALES",
            "driver_type": "headcount",
            "description": "Number of sales employees",
            "unit": "employees",
            "entity_id": None,
            "department_id": None,
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid4()),
            "name": "Engineering Headcount",
            "code": "HC_ENG",
            "driver_type": "headcount",
            "description": "Number of engineering employees",
            "unit": "employees",
            "entity_id": None,
            "department_id": None,
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid4()),
            "name": "Average Salary - Sales",
            "code": "AVG_SAL_SALES",
            "driver_type": "currency",
            "description": "Average annual salary for sales employees",
            "unit": "USD",
            "entity_id": None,
            "department_id": None,
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid4()),
            "name": "Average Salary - Engineering",
            "code": "AVG_SAL_ENG",
            "driver_type": "currency",
            "description": "Average annual salary for engineering employees",
            "unit": "USD",
            "entity_id": None,
            "department_id": None,
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid4()),
            "name": "Units Sold",
            "code": "UNITS_SOLD",
            "driver_type": "units",
            "description": "Total units sold per month",
            "unit": "units",
            "entity_id": None,
            "department_id": None,
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid4()),
            "name": "Average Selling Price",
            "code": "AVG_PRICE",
            "driver_type": "currency",
            "description": "Average price per unit",
            "unit": "USD",
            "entity_id": None,
            "department_id": None,
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid4()),
            "name": "Cost of Goods Sold per Unit",
            "code": "COGS_PER_UNIT",
            "driver_type": "currency",
            "description": "Variable cost per unit sold",
            "unit": "USD",
            "entity_id": None,
            "department_id": None,
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid4()),
            "name": "Marketing Budget Growth",
            "code": "MKT_GROWTH",
            "driver_type": "percentage",
            "description": "Monthly marketing budget growth rate",
            "unit": "%",
            "entity_id": None,
            "department_id": None,
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid4()),
            "name": "Inflation Rate",
            "code": "INFLATION",
            "driver_type": "percentage",
            "description": "Annual inflation rate for cost adjustments",
            "unit": "%",
            "entity_id": None,
            "department_id": None,
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc)
        }
    ]
    
    # Check if drivers already exist
    existing = await db.drivers.count_documents({"code": {"$in": [d["code"] for d in drivers]}})
    if existing > 0:
        print(f"⚠️  Found {existing} existing drivers. Skipping driver creation.")
        return drivers
    
    # Insert drivers
    await db.drivers.insert_many(drivers)
    print(f"✅ Created {len(drivers)} operational drivers")
    
    return drivers


async def seed_formulas():
    """Create sample formulas linking drivers to accounts"""
    print("🚀 Seeding driver-based formulas...")
    
    # Get accounts
    revenue_account = await db.accounts.find_one({"category": "Revenue"}, {"_id": 0})
    cogs_account = await db.accounts.find_one({"category": "COGS"}, {"_id": 0})
    opex_accounts = await db.accounts.find({"category": "OpEx"}, {"_id": 0}).to_list(10)
    
    if not revenue_account or not cogs_account:
        print("❌ Required accounts not found. Please run seed_fpa_dimensions.py first")
        return
    
    # Get user
    user = await db.users.find_one({}, {"_id": 0})
    if not user:
        print("❌ No users found")
        return
    
    user_id = user["id"]
    
    formulas = [
        {
            "id": str(uuid4()),
            "name": "Revenue from Units Sold",
            "account_id": revenue_account["id"],
            "expression": "UNITS_SOLD * AVG_PRICE",
            "dependencies": ["UNITS_SOLD", "AVG_PRICE"],
            "entity_id": None,
            "department_id": None,
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        },
        {
            "id": str(uuid4()),
            "name": "Cost of Goods Sold",
            "account_id": cogs_account["id"],
            "expression": "UNITS_SOLD * COGS_PER_UNIT",
            "dependencies": ["UNITS_SOLD", "COGS_PER_UNIT"],
            "entity_id": None,
            "department_id": None,
            "is_active": True,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
    ]
    
    # Add salary expense formulas if we have OpEx accounts
    if opex_accounts:
        salary_account = next((acc for acc in opex_accounts if "salary" in acc["name"].lower() or "payroll" in acc["name"].lower()), None)
        
        if salary_account:
            formulas.append({
                "id": str(uuid4()),
                "name": "Total Sales Salary Expense",
                "account_id": salary_account["id"],
                "expression": "HC_SALES * AVG_SAL_SALES * (1 + INFLATION / 100) / 12",
                "dependencies": ["HC_SALES", "AVG_SAL_SALES", "INFLATION"],
                "entity_id": None,
                "department_id": None,
                "is_active": True,
                "created_by": user_id,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })
            
            formulas.append({
                "id": str(uuid4()),
                "name": "Total Engineering Salary Expense",
                "account_id": salary_account["id"],
                "expression": "HC_ENG * AVG_SAL_ENG * (1 + INFLATION / 100) / 12",
                "dependencies": ["HC_ENG", "AVG_SAL_ENG", "INFLATION"],
                "entity_id": None,
                "department_id": None,
                "is_active": True,
                "created_by": user_id,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            })
    
    # Check if formulas already exist
    existing = await db.formulas.count_documents({"name": {"$in": [f["name"] for f in formulas]}})
    if existing > 0:
        print(f"⚠️  Found {existing} existing formulas. Skipping formula creation.")
        return
    
    # Insert formulas
    await db.formulas.insert_many(formulas)
    print(f"✅ Created {len(formulas)} driver-based formulas")


async def main():
    print("=" * 60)
    print("PHASE 3: Driver-Based Modeling - Data Seeding")
    print("=" * 60)
    
    try:
        # Seed drivers
        await seed_drivers()
        
        # Seed formulas
        await seed_formulas()
        
        print("\n✅ Phase 3 seeding completed successfully!")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        import traceback
        traceback.print_exc()
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
