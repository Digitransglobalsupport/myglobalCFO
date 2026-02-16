# ======================= DATABASE SCHEMA & INDEX MANAGEMENT =======================
# This module handles database indexes for multi-tenant query optimization
#
# Partial Indexes:
# - Only index documents where org_id/workspace_id exist
# - Ensures queries only scan data within a specific tenant's silo
# - Dramatically improves query performance for large datasets
#
# Usage:
#   python db_indexes.py --check    # Check current indexes
#   python db_indexes.py --create   # Create all indexes

import asyncio
import os
import sys
import argparse
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import IndexModel, ASCENDING, DESCENDING
from dotenv import load_dotenv

# Load environment
load_dotenv()

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'realtime_finance_test')


# ======================= COLLECTIONS TO INDEX =======================

def get_tenant_data_collections():
    """
    Collections that contain tenant-scoped data.
    These need partial indexes on org_id and workspace_id.
    """
    return [
        "companies",
        "entities",
        "transactions",
        "consolidation_groups",
        "erp_accounts",
        "shared_integrations",
        "chat_history",
        "scheduled_reports",
        "dashboard_layouts",
        "coa_mappings",
        "bank_connections",
        "bank_transactions",
        "upload_batches",
        "financial_analysis",
        "audit_entries",
        "alerts",
        "custom_reports",
        "custom_ratios",
        "benchmarks",
        "scenario_analyses",
        "funding_requirements",
        "funding_sources",
        "what_if_scenarios",
        "policy_library",
    ]


# ======================= INDEX DEFINITIONS =======================

def get_partial_index_definitions():
    """
    Define partial indexes for multi-tenant data isolation.
    
    Partial indexes only include documents that match the filter expression,
    making them smaller and more efficient for tenant-scoped queries.
    """
    indexes = []
    
    for collection in get_tenant_data_collections():
        # Primary tenant isolation index: org_id + workspace_id compound
        # This is the most commonly used query pattern
        indexes.append({
            "collection": collection,
            "name": f"idx_{collection}_tenant_isolation",
            "keys": [("org_id", ASCENDING), ("workspace_id", ASCENDING)],
            "partial_filter": {
                "org_id": {"$exists": True, "$ne": None}
            },
            "background": True
        })
        
        # Secondary index: org_id only (for org-wide queries)
        indexes.append({
            "collection": collection,
            "name": f"idx_{collection}_org_id",
            "keys": [("org_id", ASCENDING)],
            "partial_filter": {
                "org_id": {"$exists": True, "$ne": None}
            },
            "background": True
        })
        
        # Tertiary index: workspace_id only (for workspace-specific queries)
        indexes.append({
            "collection": collection,
            "name": f"idx_{collection}_workspace_id",
            "keys": [("workspace_id", ASCENDING)],
            "partial_filter": {
                "workspace_id": {"$exists": True, "$ne": None}
            },
            "background": True
        })
    
    # Add specialized indexes for frequently queried collections
    specialized_indexes = [
        # Transactions: often queried by date within a tenant
        {
            "collection": "transactions",
            "name": "idx_transactions_tenant_date",
            "keys": [("org_id", ASCENDING), ("workspace_id", ASCENDING), ("date", DESCENDING)],
            "partial_filter": {"org_id": {"$exists": True, "$ne": None}},
            "background": True
        },
        # Transactions: status queries within a tenant
        {
            "collection": "transactions",
            "name": "idx_transactions_tenant_status",
            "keys": [("org_id", ASCENDING), ("workspace_id", ASCENDING), ("status", ASCENDING)],
            "partial_filter": {"org_id": {"$exists": True, "$ne": None}},
            "background": True
        },
        # Companies: often queried by type within a tenant
        {
            "collection": "companies",
            "name": "idx_companies_tenant_type",
            "keys": [("org_id", ASCENDING), ("workspace_id", ASCENDING), ("type", ASCENDING)],
            "partial_filter": {"org_id": {"$exists": True, "$ne": None}},
            "background": True
        },
        # Audit entries: time-based queries within a tenant
        {
            "collection": "audit_entries",
            "name": "idx_audit_tenant_timestamp",
            "keys": [("org_id", ASCENDING), ("workspace_id", ASCENDING), ("timestamp", DESCENDING)],
            "partial_filter": {"org_id": {"$exists": True, "$ne": None}},
            "background": True
        },
        # Chat history: session-based queries within a tenant
        {
            "collection": "chat_history",
            "name": "idx_chat_tenant_session",
            "keys": [("org_id", ASCENDING), ("workspace_id", ASCENDING), ("session_id", ASCENDING)],
            "partial_filter": {"org_id": {"$exists": True, "$ne": None}},
            "background": True
        },
    ]
    
    indexes.extend(specialized_indexes)
    
    return indexes


def get_system_collection_indexes():
    """
    Indexes for system/management collections (not tenant-scoped data).
    """
    return [
        # Organizations
        {
            "collection": "organizations",
            "name": "idx_organizations_slug",
            "keys": [("slug", ASCENDING)],
            "unique": True,
            "background": True
        },
        {
            "collection": "organizations",
            "name": "idx_organizations_owner",
            "keys": [("owner_id", ASCENDING)],
            "background": True
        },
        # Workspaces
        {
            "collection": "workspaces",
            "name": "idx_workspaces_org",
            "keys": [("org_id", ASCENDING)],
            "background": True
        },
        {
            "collection": "workspaces",
            "name": "idx_workspaces_org_slug",
            "keys": [("org_id", ASCENDING), ("slug", ASCENDING)],
            "unique": True,
            "background": True
        },
        # Org Memberships
        {
            "collection": "org_memberships",
            "name": "idx_org_memberships_org_user",
            "keys": [("org_id", ASCENDING), ("user_id", ASCENDING)],
            "unique": True,
            "background": True
        },
        {
            "collection": "org_memberships",
            "name": "idx_org_memberships_user",
            "keys": [("user_id", ASCENDING)],
            "background": True
        },
        # Workspace Memberships
        {
            "collection": "workspace_memberships",
            "name": "idx_workspace_memberships_ws_user",
            "keys": [("workspace_id", ASCENDING), ("user_id", ASCENDING)],
            "unique": True,
            "background": True
        },
        {
            "collection": "workspace_memberships",
            "name": "idx_workspace_memberships_user",
            "keys": [("user_id", ASCENDING)],
            "background": True
        },
        # Users
        {
            "collection": "users",
            "name": "idx_users_email",
            "keys": [("email", ASCENDING)],
            "unique": True,
            "background": True
        },
        {
            "collection": "users",
            "name": "idx_users_active_org",
            "keys": [("active_org_id", ASCENDING)],
            "partial_filter": {"active_org_id": {"$exists": True, "$ne": None}},
            "background": True
        },
        # Plans
        {
            "collection": "plans",
            "name": "idx_plans_public",
            "keys": [("is_public", ASCENDING), ("display_order", ASCENDING)],
            "background": True
        },
    ]


# ======================= INDEX MANAGER CLASS =======================

class IndexManager:
    def __init__(self):
        self.client = None
        self.db = None
        self.stats = {
            "checked": 0,
            "created": 0,
            "skipped": 0,
            "errors": []
        }
    
    async def connect(self):
        """Connect to MongoDB"""
        print(f"Connecting to MongoDB...")
        self.client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.client[DB_NAME]
        await self.db.command('ping')
        print(f"Connected to database: {DB_NAME}")
    
    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            print("Disconnected from MongoDB")
    
    async def check_indexes(self):
        """Check current indexes on all collections"""
        print("\n" + "="*60)
        print("CURRENT INDEX STATUS")
        print("="*60 + "\n")
        
        all_collections = set(get_tenant_data_collections())
        all_collections.update(["organizations", "workspaces", "org_memberships", 
                                "workspace_memberships", "users", "plans"])
        
        for collection_name in sorted(all_collections):
            try:
                collection = self.db[collection_name]
                indexes = await collection.index_information()
                
                print(f"\n📁 {collection_name}:")
                for idx_name, idx_info in indexes.items():
                    if idx_name == "_id_":
                        continue
                    
                    keys = idx_info.get('key', [])
                    partial = "🔸 PARTIAL" if 'partialFilterExpression' in idx_info else ""
                    unique = "🔹 UNIQUE" if idx_info.get('unique') else ""
                    
                    print(f"   • {idx_name}: {keys} {partial} {unique}")
                
                self.stats["checked"] += 1
                
            except Exception as e:
                print(f"   ⚠️  Error checking {collection_name}: {e}")
    
    async def create_all_indexes(self):
        """Create all required indexes"""
        print("\n" + "="*60)
        print("CREATING PARTIAL INDEXES FOR MULTI-TENANT ISOLATION")
        print("="*60 + "\n")
        
        # Get all index definitions
        all_indexes = get_partial_index_definitions() + get_system_collection_indexes()
        
        print(f"Total indexes to create: {len(all_indexes)}\n")
        
        for idx_def in all_indexes:
            await self.create_index(idx_def)
        
        self.print_summary()
    
    async def create_index(self, idx_def: dict):
        """Create a single index"""
        collection_name = idx_def["collection"]
        index_name = idx_def["name"]
        keys = idx_def["keys"]
        
        try:
            collection = self.db[collection_name]
            
            # Check if index already exists
            existing_indexes = await collection.index_information()
            if index_name in existing_indexes:
                print(f"   ⏭️  {collection_name}.{index_name}: Already exists")
                self.stats["skipped"] += 1
                return
            
            # Build index options
            options = {
                "name": index_name,
                "background": idx_def.get("background", True)
            }
            
            if idx_def.get("unique"):
                options["unique"] = True
            
            if idx_def.get("partial_filter"):
                options["partialFilterExpression"] = idx_def["partial_filter"]
            
            # Create the index
            await collection.create_index(keys, **options)
            
            partial_tag = " (PARTIAL)" if idx_def.get("partial_filter") else ""
            print(f"   ✅ {collection_name}.{index_name}: Created{partial_tag}")
            self.stats["created"] += 1
            
        except Exception as e:
            error_msg = f"{collection_name}.{index_name}: {str(e)}"
            print(f"   ❌ {error_msg}")
            self.stats["errors"].append(error_msg)
    
    def print_summary(self):
        """Print creation summary"""
        print("\n" + "="*60)
        print("INDEX CREATION SUMMARY")
        print("="*60)
        print(f"\nIndexes created: {self.stats['created']}")
        print(f"Indexes skipped (already exist): {self.stats['skipped']}")
        
        if self.stats["errors"]:
            print(f"\n⚠️  Errors: {len(self.stats['errors'])}")
            for error in self.stats["errors"]:
                print(f"   - {error}")
        
        print("\n" + "="*60)
        print("✅ Index management complete!")
        print("="*60)


# ======================= STARTUP HOOK =======================

async def ensure_indexes_on_startup(db):
    """
    Call this function during app startup to ensure indexes exist.
    Safe to call multiple times - will skip existing indexes.
    """
    manager = IndexManager()
    manager.db = db
    
    all_indexes = get_partial_index_definitions() + get_system_collection_indexes()
    
    for idx_def in all_indexes:
        try:
            collection = db[idx_def["collection"]]
            existing = await collection.index_information()
            
            if idx_def["name"] not in existing:
                options = {
                    "name": idx_def["name"],
                    "background": True
                }
                if idx_def.get("unique"):
                    options["unique"] = True
                if idx_def.get("partial_filter"):
                    options["partialFilterExpression"] = idx_def["partial_filter"]
                
                await collection.create_index(idx_def["keys"], **options)
                
        except Exception:
            pass  # Silently skip errors during startup


# ======================= MAIN =======================

async def main():
    parser = argparse.ArgumentParser(description="Manage database indexes for multi-tenant isolation")
    parser.add_argument('--check', action='store_true', help='Check current indexes')
    parser.add_argument('--create', action='store_true', help='Create all indexes')
    
    args = parser.parse_args()
    
    if not args.check and not args.create:
        parser.print_help()
        return
    
    manager = IndexManager()
    
    try:
        await manager.connect()
        
        if args.check:
            await manager.check_indexes()
        
        if args.create:
            await manager.create_all_indexes()
            
    finally:
        await manager.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
