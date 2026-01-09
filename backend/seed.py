#!/usr/bin/env python3
"""
Database Seed Script for MyGlobalCFO
====================================
This script populates the MongoDB database with initial reference data:
- Currencies (ISO 4217 codes with symbols)
- Countries (with regions and default currencies)
- Default Entity Groups (APAC, EMEA, Americas)

Usage:
    python seed.py                 # Seed all data
    python seed.py --currencies    # Seed only currencies
    python seed.py --countries     # Seed only countries
    python seed.py --groups        # Seed only entity groups
    python seed.py --clear         # Clear all reference data before seeding
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import argparse

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'myglobalcfo')

# Data files
DATA_DIR = ROOT_DIR / 'data'
CURRENCIES_FILE = DATA_DIR / 'currencies.json'
COUNTRIES_FILE = DATA_DIR / 'countries_regions.json'


def load_json_file(filepath: Path) -> list:
    """Load JSON data from file."""
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


async def seed_currencies(db, clear: bool = False):
    """Seed currencies collection with ISO 4217 currency data."""
    print("\n📦 Seeding currencies...")
    
    if clear:
        result = await db.currencies.delete_many({})
        print(f"   Cleared {result.deleted_count} existing currencies")
    
    currencies = load_json_file(CURRENCIES_FILE)
    
    # Add metadata
    for currency in currencies:
        currency['is_active'] = True
        currency['created_at'] = datetime.now(timezone.utc).isoformat()
    
    # Use upsert to avoid duplicates
    inserted_count = 0
    updated_count = 0
    
    for currency in currencies:
        result = await db.currencies.update_one(
            {'code': currency['code']},
            {'$set': currency},
            upsert=True
        )
        if result.upserted_id:
            inserted_count += 1
        elif result.modified_count:
            updated_count += 1
    
    total = await db.currencies.count_documents({})
    print(f"   ✅ Currencies: {inserted_count} inserted, {updated_count} updated, {total} total")
    return total


async def seed_countries(db, clear: bool = False):
    """Seed countries collection with ISO 3166 country data."""
    print("\n🌍 Seeding countries...")
    
    if clear:
        result = await db.countries.delete_many({})
        print(f"   Cleared {result.deleted_count} existing countries")
    
    countries = load_json_file(COUNTRIES_FILE)
    
    # Transform to match schema
    country_docs = []
    for c in countries:
        country_docs.append({
            'name': c['country'],
            'code': c['code'],
            'region': c['region'],
            'default_currency': c['default_currency'],
            'is_active': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        })
    
    # Use upsert to avoid duplicates
    inserted_count = 0
    updated_count = 0
    
    for country in country_docs:
        result = await db.countries.update_one(
            {'code': country['code']},
            {'$set': country},
            upsert=True
        )
        if result.upserted_id:
            inserted_count += 1
        elif result.modified_count:
            updated_count += 1
    
    total = await db.countries.count_documents({})
    print(f"   ✅ Countries: {inserted_count} inserted, {updated_count} updated, {total} total")
    return total


async def seed_entity_groups(db, clear: bool = False):
    """Seed default entity groups (APAC, EMEA, Americas)."""
    print("\n🏢 Seeding default entity groups...")
    
    if clear:
        # Only clear system-created groups
        result = await db.entity_groups_master.delete_many({'is_system': True})
        print(f"   Cleared {result.deleted_count} existing system groups")
    
    default_groups = [
        {
            'name': 'APAC',
            'description': 'Asia-Pacific Region',
            'region_code': 'APAC',
            'reporting_currency': 'USD',
            'is_system': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'name': 'EMEA',
            'description': 'Europe, Middle East and Africa',
            'region_code': 'EMEA',
            'reporting_currency': 'EUR',
            'is_system': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        },
        {
            'name': 'Americas',
            'description': 'North, Central and South America',
            'region_code': 'Americas',
            'reporting_currency': 'USD',
            'is_system': True,
            'created_at': datetime.now(timezone.utc).isoformat()
        }
    ]
    
    inserted_count = 0
    updated_count = 0
    
    for group in default_groups:
        result = await db.entity_groups_master.update_one(
            {'region_code': group['region_code']},
            {'$set': group},
            upsert=True
        )
        if result.upserted_id:
            inserted_count += 1
        elif result.modified_count:
            updated_count += 1
    
    total = await db.entity_groups_master.count_documents({})
    print(f"   ✅ Entity Groups: {inserted_count} inserted, {updated_count} updated, {total} total")
    return total


async def create_indexes(db):
    """Create recommended indexes for optimal performance."""
    print("\n🔧 Creating indexes...")
    
    try:
        # Currencies indexes
        await db.currencies.create_index('code', unique=True)
        print("   ✅ currencies.code (unique)")
        
        # Countries indexes
        await db.countries.create_index('code', unique=True)
        await db.countries.create_index('region')
        print("   ✅ countries.code (unique)")
        print("   ✅ countries.region")
        
        # Companies indexes
        await db.companies.create_index('user_id')
        await db.companies.create_index('currency')
        await db.companies.create_index('global_region')
        print("   ✅ companies.user_id")
        print("   ✅ companies.currency")
        print("   ✅ companies.global_region")
        
        # Transactions indexes
        await db.transactions.create_index([('company_id', 1), ('date', -1)])
        await db.transactions.create_index('transaction_currency')
        await db.transactions.create_index('reporting_currency')
        print("   ✅ transactions.(company_id, date)")
        print("   ✅ transactions.transaction_currency")
        print("   ✅ transactions.reporting_currency")
        
    except Exception as e:
        print(f"   ⚠️ Index creation warning: {e}")


async def verify_seed(db):
    """Verify the seed data was inserted correctly."""
    print("\n📊 Verification:")
    
    currencies_count = await db.currencies.count_documents({})
    countries_count = await db.countries.count_documents({})
    groups_count = await db.entity_groups_master.count_documents({})
    
    # Sample verification
    gbp = await db.currencies.find_one({'code': 'GBP'}, {'_id': 0})
    uk = await db.countries.find_one({'code': 'GBR'}, {'_id': 0})
    
    print(f"   Total Currencies: {currencies_count}")
    print(f"   Total Countries: {countries_count}")
    print(f"   Total Entity Groups: {groups_count}")
    
    if gbp:
        print(f"\n   Sample Currency (GBP):")
        print(f"      Name: {gbp.get('name')}")
        print(f"      Symbol: {gbp.get('symbol')}")
    
    if uk:
        print(f"\n   Sample Country (United Kingdom):")
        print(f"      Code: {uk.get('code')}")
        print(f"      Region: {uk.get('region')}")
        print(f"      Default Currency: {uk.get('default_currency')}")
    
    return currencies_count > 0 and countries_count > 0


async def main():
    """Main seed function."""
    parser = argparse.ArgumentParser(description='Seed MyGlobalCFO database')
    parser.add_argument('--currencies', action='store_true', help='Seed only currencies')
    parser.add_argument('--countries', action='store_true', help='Seed only countries')
    parser.add_argument('--groups', action='store_true', help='Seed only entity groups')
    parser.add_argument('--clear', action='store_true', help='Clear existing data before seeding')
    parser.add_argument('--indexes', action='store_true', help='Create indexes only')
    args = parser.parse_args()
    
    # Default to seeding everything if no specific flag is provided
    seed_all = not (args.currencies or args.countries or args.groups or args.indexes)
    
    print("=" * 50)
    print("🚀 MyGlobalCFO Database Seeder")
    print("=" * 50)
    print(f"\nConnecting to: {MONGO_URL}")
    print(f"Database: {DB_NAME}")
    
    try:
        client = AsyncIOMotorClient(MONGO_URL)
        db = client[DB_NAME]
        
        # Test connection
        await client.admin.command('ping')
        print("✅ Connected to MongoDB\n")
        
        if args.indexes:
            await create_indexes(db)
        else:
            if seed_all or args.currencies:
                await seed_currencies(db, args.clear)
            
            if seed_all or args.countries:
                await seed_countries(db, args.clear)
            
            if seed_all or args.groups:
                await seed_entity_groups(db, args.clear)
            
            if seed_all:
                await create_indexes(db)
            
            await verify_seed(db)
        
        print("\n" + "=" * 50)
        print("✅ Seeding completed successfully!")
        print("=" * 50)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)
    finally:
        client.close()


if __name__ == '__main__':
    asyncio.run(main())
