# ======================= PHASE 1: MIGRATION SCRIPT =======================
# Run this script to migrate from user_id to org_id isolation
#
# IMPORTANT: 
# - Run on a test environment first
# - Backup your database before running
# - Can be run multiple times (idempotent)
#
# Usage:
#   python migration_to_org.py --dry-run  # Preview changes
#   python migration_to_org.py --execute  # Execute migration

import asyncio
import os
import sys
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional
import uuid
import argparse
from motor.motor_asyncio import AsyncIOMotorClient

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from org_models import (
    Organization, OrgMembership, Workspace, WorkspaceMembership,
    OrgRole, WorkspaceRole, OrgType, WorkspaceType,
    generate_slug, get_collections_to_migrate, DEFAULT_PLANS
)


# ======================= CONFIGURATION =======================

MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'myglobalcfo')
BATCH_SIZE = 100  # Process records in batches


# ======================= MIGRATION CLASS =======================

class OrgMigration:
    def __init__(self, dry_run: bool = True):
        self.dry_run = dry_run
        self.client = None
        self.db = None
        self.stats = {
            "users_processed": 0,
            "orgs_created": 0,
            "workspaces_created": 0,
            "memberships_created": 0,
            "records_updated": {},
            "errors": []
        }
    
    async def connect(self):
        """Connect to MongoDB"""
        print(f"Connecting to MongoDB...")
        self.client = AsyncIOMotorClient(MONGO_URL)
        self.db = self.client[DB_NAME]
        
        # Test connection
        await self.db.command('ping')
        print(f"Connected to database: {DB_NAME}")
    
    async def disconnect(self):
        """Disconnect from MongoDB"""
        if self.client:
            self.client.close()
            print("Disconnected from MongoDB")
    
    async def run_migration(self):
        """Main migration entry point"""
        print("\n" + "="*60)
        print("PHASE 1: ORGANIZATIONAL MIGRATION")
        print("="*60)
        print(f"Mode: {'DRY RUN (no changes)' if self.dry_run else 'EXECUTE (making changes)'}")
        print(f"Database: {DB_NAME}")
        print("="*60 + "\n")
        
        try:
            await self.connect()
            
            # Step 1: Seed plans
            await self.seed_plans()
            
            # Step 2: Create orgs for existing users
            await self.create_orgs_for_users()
            
            # Step 3: Migrate data records
            await self.migrate_data_records()
            
            # Step 4: Create indexes
            await self.create_indexes()
            
            # Print summary
            self.print_summary()
            
        except Exception as e:
            print(f"\n❌ Migration failed: {str(e)}")
            self.stats["errors"].append(str(e))
            raise
        finally:
            await self.disconnect()
    
    async def seed_plans(self):
        """Seed the plans collection if empty"""
        print("\n📋 Step 1: Seeding Plans...")
        
        existing_plans = await self.db.plans.count_documents({})
        if existing_plans > 0:
            print(f"   Plans already exist ({existing_plans} found). Skipping.")
            return
        
        if self.dry_run:
            print(f"   [DRY RUN] Would insert {len(DEFAULT_PLANS)} plans")
        else:
            await self.db.plans.insert_many(DEFAULT_PLANS)
            print(f"   ✅ Inserted {len(DEFAULT_PLANS)} plans")
    
    async def create_orgs_for_users(self):
        """Create a default organization for each existing user"""
        print("\n👥 Step 2: Creating Organizations for Existing Users...")
        
        # Get all users
        users = await self.db.users.find({}).to_list(None)
        print(f"   Found {len(users)} users to process")
        
        for user in users:
            user_id = user.get('id') or str(user.get('_id'))
            user_email = user.get('email', 'unknown')
            user_name = user.get('name', user_email.split('@')[0])
            
            # Check if org already exists for this user
            existing_org = await self.db.organizations.find_one({
                "migrated_from_user_id": user_id
            })
            
            if existing_org:
                print(f"   ⏭️  User {user_email}: Org already exists")
                continue
            
            # Create organization
            org_name = f"{user_name}'s Organization"
            org_slug = generate_slug(org_name) + f"-{user_id[:8]}"
            
            org = {
                "id": str(uuid.uuid4()),
                "name": org_name,
                "slug": org_slug,
                "type": OrgType.DIRECT.value,
                "owner_id": user_id,
                "plan_id": "plan_free",
                "plan_overrides": {},
                "billing_email": user_email,
                "settings": {},
                "branding": {},
                "created_at": datetime.now(timezone.utc).isoformat(),
                "migrated_from_user_id": user_id
            }
            
            # Create default workspace
            workspace = {
                "id": str(uuid.uuid4()),
                "org_id": org["id"],
                "name": "Default Workspace",
                "slug": "default",
                "type": WorkspaceType.INTERNAL.value,
                "plan_id": None,  # Inherit from org
                "settings": {},
                "allow_client_login": False,
                "created_by": user_id,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "is_default": True
            }
            
            # Create org membership (owner)
            org_membership = {
                "id": str(uuid.uuid4()),
                "org_id": org["id"],
                "user_id": user_id,
                "role": OrgRole.OWNER.value,
                "joined_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True
            }
            
            # Create workspace membership
            workspace_membership = {
                "id": str(uuid.uuid4()),
                "workspace_id": workspace["id"],
                "user_id": user_id,
                "role": WorkspaceRole.WORKSPACE_ADMIN.value,
                "granted_by": user_id,
                "granted_at": datetime.now(timezone.utc).isoformat(),
                "is_active": True
            }
            
            if self.dry_run:
                print(f"   [DRY RUN] Would create org '{org_name}' for {user_email}")
            else:
                await self.db.organizations.insert_one(org)
                await self.db.workspaces.insert_one(workspace)
                await self.db.org_memberships.insert_one(org_membership)
                await self.db.workspace_memberships.insert_one(workspace_membership)
                
                # Update user with active org/workspace
                await self.db.users.update_one(
                    {"id": user_id},
                    {"$set": {
                        "active_org_id": org["id"],
                        "active_workspace_id": workspace["id"]
                    }}
                )
                
                print(f"   ✅ Created org for {user_email}")
            
            self.stats["users_processed"] += 1
            self.stats["orgs_created"] += 1
            self.stats["workspaces_created"] += 1
            self.stats["memberships_created"] += 2
    
    async def migrate_data_records(self):
        """Add org_id and workspace_id to all existing data records"""
        print("\n📊 Step 3: Migrating Data Records...")
        
        collections = get_collections_to_migrate()
        print(f"   Collections to migrate: {len(collections)}")
        
        for collection_name in collections:
            await self.migrate_collection(collection_name)
    
    async def migrate_collection(self, collection_name: str):
        """Migrate a single collection"""
        collection = self.db[collection_name]
        
        # Count records without org_id
        unmigrated_count = await collection.count_documents({
            "org_id": {"$exists": False},
            "user_id": {"$exists": True}
        })
        
        if unmigrated_count == 0:
            print(f"   ⏭️  {collection_name}: No records to migrate")
            return
        
        print(f"   🔄 {collection_name}: Migrating {unmigrated_count} records...")
        
        # Get user -> org mapping
        user_org_map = await self.get_user_org_map()
        
        # Process in batches
        migrated = 0
        cursor = collection.find({
            "org_id": {"$exists": False},
            "user_id": {"$exists": True}
        }).batch_size(BATCH_SIZE)
        
        batch = []
        async for record in cursor:
            user_id = record.get('user_id')
            org_info = user_org_map.get(user_id)
            
            if not org_info:
                self.stats["errors"].append(
                    f"No org found for user_id {user_id} in {collection_name}"
                )
                continue
            
            update_op = {
                "filter": {"_id": record["_id"]},
                "update": {"$set": {
                    "org_id": org_info["org_id"],
                    "workspace_id": org_info["workspace_id"]
                }}
            }
            batch.append(update_op)
            
            if len(batch) >= BATCH_SIZE:
                if not self.dry_run:
                    await self.execute_batch_update(collection, batch)
                migrated += len(batch)
                batch = []
        
        # Process remaining batch
        if batch:
            if not self.dry_run:
                await self.execute_batch_update(collection, batch)
            migrated += len(batch)
        
        self.stats["records_updated"][collection_name] = migrated
        status = "[DRY RUN]" if self.dry_run else "✅"
        print(f"   {status} {collection_name}: Migrated {migrated} records")
    
    async def execute_batch_update(self, collection, batch: List[Dict]):
        """Execute batch updates"""
        for op in batch:
            await collection.update_one(op["filter"], op["update"])
    
    async def get_user_org_map(self) -> Dict[str, Dict]:
        """Build mapping of user_id -> org_id, workspace_id"""
        user_org_map = {}
        
        async for membership in self.db.org_memberships.find({}):
            user_id = membership.get("user_id")
            org_id = membership.get("org_id")
            
            # Get default workspace for this org
            workspace = await self.db.workspaces.find_one({
                "org_id": org_id,
                "is_default": True
            })
            
            workspace_id = workspace.get("id") if workspace else None
            
            user_org_map[user_id] = {
                "org_id": org_id,
                "workspace_id": workspace_id
            }
        
        return user_org_map
    
    async def create_indexes(self):
        """Create indexes for new collections"""
        print("\n🔑 Step 4: Creating Indexes...")
        
        indexes = [
            # Organizations
            ("organizations", [("slug", 1)], {"unique": True}),
            ("organizations", [("owner_id", 1)], {}),
            
            # Workspaces
            ("workspaces", [("org_id", 1)], {}),
            ("workspaces", [("org_id", 1), ("slug", 1)], {"unique": True}),
            
            # Memberships
            ("org_memberships", [("org_id", 1), ("user_id", 1)], {"unique": True}),
            ("org_memberships", [("user_id", 1)], {}),
            ("workspace_memberships", [("workspace_id", 1), ("user_id", 1)], {"unique": True}),
            ("workspace_memberships", [("user_id", 1)], {}),
            
            # Data collections - org_id index
            ("companies", [("org_id", 1)], {}),
            ("transactions", [("org_id", 1)], {}),
            ("shared_integrations", [("org_id", 1)], {}),
        ]
        
        for collection_name, keys, options in indexes:
            if self.dry_run:
                print(f"   [DRY RUN] Would create index on {collection_name}: {keys}")
            else:
                try:
                    await self.db[collection_name].create_index(keys, **options)
                    print(f"   ✅ Created index on {collection_name}: {keys}")
                except Exception as e:
                    if "already exists" in str(e).lower():
                        print(f"   ⏭️  Index already exists on {collection_name}: {keys}")
                    else:
                        print(f"   ⚠️  Failed to create index on {collection_name}: {e}")
    
    def print_summary(self):
        """Print migration summary"""
        print("\n" + "="*60)
        print("MIGRATION SUMMARY")
        print("="*60)
        print(f"Mode: {'DRY RUN' if self.dry_run else 'EXECUTED'}")
        print(f"\nUsers processed: {self.stats['users_processed']}")
        print(f"Organizations created: {self.stats['orgs_created']}")
        print(f"Workspaces created: {self.stats['workspaces_created']}")
        print(f"Memberships created: {self.stats['memberships_created']}")
        
        print(f"\nRecords updated by collection:")
        for collection, count in self.stats["records_updated"].items():
            print(f"  - {collection}: {count}")
        
        if self.stats["errors"]:
            print(f"\n⚠️  Errors encountered: {len(self.stats['errors'])}")
            for error in self.stats["errors"][:10]:
                print(f"  - {error}")
            if len(self.stats["errors"]) > 10:
                print(f"  ... and {len(self.stats['errors']) - 10} more")
        
        print("\n" + "="*60)
        if self.dry_run:
            print("This was a DRY RUN. No changes were made.")
            print("Run with --execute to apply changes.")
        else:
            print("✅ Migration completed successfully!")
        print("="*60)


# ======================= MAIN =======================

async def main():
    parser = argparse.ArgumentParser(description="Migrate to org-based isolation")
    parser.add_argument('--dry-run', action='store_true', default=True,
                        help='Preview changes without executing (default)')
    parser.add_argument('--execute', action='store_true',
                        help='Execute the migration')
    
    args = parser.parse_args()
    
    dry_run = not args.execute
    
    migration = OrgMigration(dry_run=dry_run)
    await migration.run_migration()


if __name__ == "__main__":
    asyncio.run(main())
