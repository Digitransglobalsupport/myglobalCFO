# ======================= ORGANIZATION API ROUTES =======================
# These routes handle organization and workspace management
# Import into server.py: from org_routes import org_router

from fastapi import APIRouter, HTTPException, Depends
from typing import List, Optional
from datetime import datetime, timezone
import uuid

from org_models import (
    Organization, OrganizationCreate, OrganizationUpdate,
    OrgMembership, OrgMembershipCreate, OrgMembershipUpdate,
    Workspace, WorkspaceCreate, WorkspaceUpdate,
    WorkspaceMembership, WorkspaceRole, OrgRole,
    generate_slug, DEFAULT_PLANS
)


# ======================= HELPER: GET ORG CONTEXT =======================

async def get_org_context(current_user: dict, db) -> dict:
    """
    Extract organization context from current user.
    Returns org_id and workspace_id for filtering.
    
    Backward Compatibility:
    - If user has active_org_id: use org-based filtering
    - If not: fall back to user_id filtering (legacy mode)
    """
    org_id = current_user.get('active_org_id')
    workspace_id = current_user.get('active_workspace_id')
    
    if org_id:
        return {
            "org_id": org_id,
            "workspace_id": workspace_id,
            "legacy_mode": False
        }
    
    # Legacy mode: try to find user's org from membership
    membership = await db.org_memberships.find_one({
        "user_id": current_user['id'],
        "is_active": True
    })
    
    if membership:
        org_id = membership.get('org_id')
        # Get default workspace
        workspace = await db.workspaces.find_one({
            "org_id": org_id,
            "is_default": True
        })
        workspace_id = workspace.get('id') if workspace else None
        
        return {
            "org_id": org_id,
            "workspace_id": workspace_id,
            "legacy_mode": False
        }
    
    # True legacy mode: no org exists
    return {
        "org_id": None,
        "workspace_id": None,
        "user_id": current_user['id'],
        "legacy_mode": True
    }


def build_data_query(org_context: dict) -> dict:
    """
    Build MongoDB query based on org context.
    Supports both org-based and legacy user-based filtering.
    """
    if org_context.get('legacy_mode'):
        return {"user_id": org_context['user_id']}
    
    if org_context.get('workspace_id'):
        return {"workspace_id": org_context['workspace_id']}
    
    if org_context.get('org_id'):
        return {"org_id": org_context['org_id']}
    
    # Fallback - should not happen
    raise HTTPException(status_code=500, detail="Unable to determine data context")


# ======================= ORGANIZATION ROUTES =======================

def create_org_routes(db, get_current_user, require_admin):
    """Factory function to create organization routes with dependencies"""
    
    router = APIRouter(prefix="/org", tags=["Organizations"])
    
    # ==================== ORGANIZATIONS ====================
    
    @router.get("/organizations")
    async def get_user_organizations(current_user: dict = Depends(get_current_user)):
        """Get all organizations the user belongs to"""
        memberships = await db.org_memberships.find({
            "user_id": current_user['id'],
            "is_active": True
        }).to_list(100)
        
        org_ids = [m['org_id'] for m in memberships]
        
        organizations = await db.organizations.find(
            {"id": {"$in": org_ids}},
            {"_id": 0}
        ).to_list(100)
        
        # Add user's role to each org
        membership_map = {m['org_id']: m['role'] for m in memberships}
        for org in organizations:
            org['user_role'] = membership_map.get(org['id'])
        
        return {
            "organizations": organizations,
            "active_org_id": current_user.get('active_org_id')
        }
    
    @router.get("/organizations/{org_id}")
    async def get_organization(org_id: str, current_user: dict = Depends(get_current_user)):
        """Get organization details"""
        # Verify membership
        membership = await db.org_memberships.find_one({
            "org_id": org_id,
            "user_id": current_user['id'],
            "is_active": True
        })
        if not membership:
            raise HTTPException(status_code=403, detail="Not a member of this organization")
        
        org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        org['user_role'] = membership['role']
        return org
    
    @router.post("/organizations")
    async def create_organization(
        org_data: OrganizationCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a new organization"""
        slug = org_data.slug or generate_slug(org_data.name)
        
        # Check slug uniqueness
        existing = await db.organizations.find_one({"slug": slug})
        if existing:
            slug = f"{slug}-{str(uuid.uuid4())[:8]}"
        
        org = Organization(
            name=org_data.name,
            slug=slug,
            type=org_data.type,
            owner_id=current_user['id'],
            billing_email=current_user.get('email')
        )
        
        org_dict = org.model_dump()
        org_dict['created_at'] = org_dict['created_at'].isoformat()
        
        await db.organizations.insert_one(org_dict)
        
        # Create owner membership
        membership = OrgMembership(
            org_id=org.id,
            user_id=current_user['id'],
            role=OrgRole.OWNER
        )
        membership_dict = membership.model_dump()
        membership_dict['joined_at'] = membership_dict['joined_at'].isoformat()
        await db.org_memberships.insert_one(membership_dict)
        
        # Create default workspace
        workspace = Workspace(
            org_id=org.id,
            name="Default Workspace",
            slug="default",
            created_by=current_user['id'],
            is_default=True
        )
        workspace_dict = workspace.model_dump()
        workspace_dict['created_at'] = workspace_dict['created_at'].isoformat()
        await db.workspaces.insert_one(workspace_dict)
        
        # Create workspace membership
        ws_membership = WorkspaceMembership(
            workspace_id=workspace.id,
            user_id=current_user['id'],
            role=WorkspaceRole.WORKSPACE_ADMIN,
            granted_by=current_user['id']
        )
        ws_membership_dict = ws_membership.model_dump()
        ws_membership_dict['granted_at'] = ws_membership_dict['granted_at'].isoformat()
        await db.workspace_memberships.insert_one(ws_membership_dict)
        
        return {
            "organization": {k: v for k, v in org_dict.items() if k != '_id'},
            "workspace": {k: v for k, v in workspace_dict.items() if k != '_id'}
        }
    
    @router.put("/organizations/{org_id}")
    async def update_organization(
        org_id: str,
        update_data: OrganizationUpdate,
        current_user: dict = Depends(get_current_user)
    ):
        """Update organization (owner/admin only)"""
        membership = await db.org_memberships.find_one({
            "org_id": org_id,
            "user_id": current_user['id'],
            "role": {"$in": [OrgRole.OWNER.value, OrgRole.ADMIN.value]},
            "is_active": True
        })
        if not membership:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
        update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        await db.organizations.update_one(
            {"id": org_id},
            {"$set": update_dict}
        )
        
        updated = await db.organizations.find_one({"id": org_id}, {"_id": 0})
        return updated
    
    @router.post("/organizations/{org_id}/switch")
    async def switch_organization(
        org_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Switch active organization context"""
        membership = await db.org_memberships.find_one({
            "org_id": org_id,
            "user_id": current_user['id'],
            "is_active": True
        })
        if not membership:
            raise HTTPException(status_code=403, detail="Not a member of this organization")
        
        # Get default workspace
        workspace = await db.workspaces.find_one({
            "org_id": org_id,
            "is_default": True
        })
        
        workspace_id = workspace['id'] if workspace else None
        
        # Update user's active context
        await db.users.update_one(
            {"id": current_user['id']},
            {"$set": {
                "active_org_id": org_id,
                "active_workspace_id": workspace_id
            }}
        )
        
        return {
            "message": "Organization switched",
            "org_id": org_id,
            "workspace_id": workspace_id,
            "requires_new_token": True  # Frontend should request new token
        }
    
    # ==================== ORG MEMBERS ====================
    
    @router.get("/organizations/{org_id}/members")
    async def get_org_members(
        org_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get organization members"""
        # Verify membership
        membership = await db.org_memberships.find_one({
            "org_id": org_id,
            "user_id": current_user['id'],
            "is_active": True
        })
        if not membership:
            raise HTTPException(status_code=403, detail="Not a member of this organization")
        
        memberships = await db.org_memberships.find(
            {"org_id": org_id, "is_active": True},
            {"_id": 0}
        ).to_list(100)
        
        # Get user details
        user_ids = [m['user_id'] for m in memberships]
        users = await db.users.find(
            {"id": {"$in": user_ids}},
            {"_id": 0, "password": 0}
        ).to_list(100)
        
        user_map = {u['id']: u for u in users}
        
        for m in memberships:
            m['user'] = user_map.get(m['user_id'], {})
        
        return {"members": memberships}
    
    @router.post("/organizations/{org_id}/members")
    async def invite_org_member(
        org_id: str,
        member_data: OrgMembershipCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Invite a user to the organization (admin only)"""
        # Verify admin
        membership = await db.org_memberships.find_one({
            "org_id": org_id,
            "user_id": current_user['id'],
            "role": {"$in": [OrgRole.OWNER.value, OrgRole.ADMIN.value]},
            "is_active": True
        })
        if not membership:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check if user exists
        user = await db.users.find_one({"id": member_data.user_id})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if already a member
        existing = await db.org_memberships.find_one({
            "org_id": org_id,
            "user_id": member_data.user_id
        })
        if existing:
            raise HTTPException(status_code=400, detail="User is already a member")
        
        new_membership = OrgMembership(
            org_id=org_id,
            user_id=member_data.user_id,
            role=member_data.role,
            invited_by=current_user['id'],
            invited_at=datetime.now(timezone.utc)
        )
        
        membership_dict = new_membership.model_dump()
        membership_dict['joined_at'] = membership_dict['joined_at'].isoformat()
        membership_dict['invited_at'] = membership_dict['invited_at'].isoformat()
        
        await db.org_memberships.insert_one(membership_dict)
        
        return {k: v for k, v in membership_dict.items() if k != '_id'}
    
    @router.delete("/organizations/{org_id}/members/{user_id}")
    async def remove_org_member(
        org_id: str,
        user_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Remove a member from the organization"""
        # Verify admin
        membership = await db.org_memberships.find_one({
            "org_id": org_id,
            "user_id": current_user['id'],
            "role": {"$in": [OrgRole.OWNER.value, OrgRole.ADMIN.value]},
            "is_active": True
        })
        if not membership:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Cannot remove owner
        target_membership = await db.org_memberships.find_one({
            "org_id": org_id,
            "user_id": user_id
        })
        if target_membership and target_membership.get('role') == OrgRole.OWNER.value:
            raise HTTPException(status_code=400, detail="Cannot remove organization owner")
        
        result = await db.org_memberships.delete_one({
            "org_id": org_id,
            "user_id": user_id
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Member not found")
        
        # Also remove workspace memberships
        await db.workspace_memberships.delete_many({
            "workspace_id": {"$in": await get_org_workspace_ids(db, org_id)},
            "user_id": user_id
        })
        
        return {"message": "Member removed"}
    
    # ==================== WORKSPACES ====================
    
    @router.get("/workspaces")
    async def get_user_workspaces(current_user: dict = Depends(get_current_user)):
        """Get all workspaces the user has access to"""
        # Get from workspace memberships
        ws_memberships = await db.workspace_memberships.find({
            "user_id": current_user['id'],
            "is_active": True
        }).to_list(100)
        
        ws_ids = [m['workspace_id'] for m in ws_memberships]
        
        # Also get workspaces from orgs user owns/admins
        org_memberships = await db.org_memberships.find({
            "user_id": current_user['id'],
            "role": {"$in": [OrgRole.OWNER.value, OrgRole.ADMIN.value]},
            "is_active": True
        }).to_list(100)
        
        org_ids = [m['org_id'] for m in org_memberships]
        
        # Get all workspaces
        workspaces = await db.workspaces.find({
            "$or": [
                {"id": {"$in": ws_ids}},
                {"org_id": {"$in": org_ids}}
            ]
        }, {"_id": 0}).to_list(100)
        
        return {
            "workspaces": workspaces,
            "active_workspace_id": current_user.get('active_workspace_id')
        }
    
    @router.post("/workspaces")
    async def create_workspace(
        workspace_data: WorkspaceCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create a new workspace (requires sub_tenancy feature)"""
        org_context = await get_org_context(current_user, db)
        
        if org_context.get('legacy_mode'):
            raise HTTPException(
                status_code=400, 
                detail="Please complete organization setup first"
            )
        
        org_id = org_context['org_id']
        
        # Check if user has permission
        membership = await db.org_memberships.find_one({
            "org_id": org_id,
            "user_id": current_user['id'],
            "role": {"$in": [OrgRole.OWNER.value, OrgRole.ADMIN.value]},
            "is_active": True
        })
        if not membership:
            raise HTTPException(status_code=403, detail="Admin access required")
        
        # Check plan allows sub-tenancy
        org = await db.organizations.find_one({"id": org_id})
        plan = await db.plans.find_one({"id": org.get('plan_id', 'plan_free')})
        
        if not plan or not plan.get('features', {}).get('sub_tenancy', False):
            raise HTTPException(
                status_code=403, 
                detail="Sub-tenancy feature requires Enterprise plan"
            )
        
        slug = workspace_data.slug or generate_slug(workspace_data.name)
        
        # Check slug uniqueness within org
        existing = await db.workspaces.find_one({
            "org_id": org_id,
            "slug": slug
        })
        if existing:
            slug = f"{slug}-{str(uuid.uuid4())[:8]}"
        
        workspace = Workspace(
            org_id=org_id,
            name=workspace_data.name,
            slug=slug,
            type=workspace_data.type,
            plan_id=workspace_data.plan_id,
            allow_client_login=workspace_data.allow_client_login,
            created_by=current_user['id']
        )
        
        workspace_dict = workspace.model_dump()
        workspace_dict['created_at'] = workspace_dict['created_at'].isoformat()
        
        await db.workspaces.insert_one(workspace_dict)
        
        # Create workspace membership for creator
        ws_membership = WorkspaceMembership(
            workspace_id=workspace.id,
            user_id=current_user['id'],
            role=WorkspaceRole.WORKSPACE_ADMIN,
            granted_by=current_user['id']
        )
        ws_membership_dict = ws_membership.model_dump()
        ws_membership_dict['granted_at'] = ws_membership_dict['granted_at'].isoformat()
        await db.workspace_memberships.insert_one(ws_membership_dict)
        
        return {k: v for k, v in workspace_dict.items() if k != '_id'}
    
    @router.post("/workspaces/{workspace_id}/switch")
    async def switch_workspace(
        workspace_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Switch active workspace context"""
        # Verify access
        workspace = await db.workspaces.find_one({"id": workspace_id})
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        
        has_access = await verify_workspace_access(
            db, current_user['id'], workspace_id, workspace['org_id']
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="No access to this workspace")
        
        # Update user's active context
        await db.users.update_one(
            {"id": current_user['id']},
            {"$set": {
                "active_org_id": workspace['org_id'],
                "active_workspace_id": workspace_id
            }}
        )
        
        return {
            "message": "Workspace switched",
            "workspace_id": workspace_id,
            "org_id": workspace['org_id'],
            "requires_new_token": True
        }
    
    # ==================== PLANS ====================
    
    @router.get("/plans")
    async def get_plans():
        """Get available plans"""
        plans = await db.plans.find(
            {"is_public": True},
            {"_id": 0}
        ).sort("display_order", 1).to_list(100)
        return {"plans": plans}
    
    @router.get("/plans/{plan_id}")
    async def get_plan(plan_id: str):
        """Get plan details"""
        plan = await db.plans.find_one({"id": plan_id}, {"_id": 0})
        if not plan:
            raise HTTPException(status_code=404, detail="Plan not found")
        return plan
    
    # ==================== FEATURE CHECK ====================
    
    @router.get("/features/check/{feature}")
    async def check_feature(
        feature: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Check if current org/workspace has access to a feature"""
        org_context = await get_org_context(current_user, db)
        
        if org_context.get('legacy_mode'):
            # Legacy users get free plan features
            plan = await db.plans.find_one({"id": "plan_free"})
        else:
            # Get workspace plan or org plan
            workspace_id = org_context.get('workspace_id')
            if workspace_id:
                workspace = await db.workspaces.find_one({"id": workspace_id})
                plan_id = workspace.get('plan_id') if workspace else None
            else:
                plan_id = None
            
            if not plan_id:
                org = await db.organizations.find_one({"id": org_context['org_id']})
                plan_id = org.get('plan_id', 'plan_free') if org else 'plan_free'
            
            plan = await db.plans.find_one({"id": plan_id})
        
        has_feature = plan.get('features', {}).get(feature, False) if plan else False
        
        return {
            "feature": feature,
            "has_access": has_feature,
            "plan_id": plan.get('id') if plan else None,
            "plan_name": plan.get('name') if plan else None
        }
    
    return router


# ==================== HELPER FUNCTIONS ====================

async def get_org_workspace_ids(db, org_id: str) -> List[str]:
    """Get all workspace IDs for an organization"""
    workspaces = await db.workspaces.find(
        {"org_id": org_id},
        {"id": 1}
    ).to_list(100)
    return [w['id'] for w in workspaces]


async def verify_workspace_access(db, user_id: str, workspace_id: str, org_id: str) -> bool:
    """Check if user has access to a workspace"""
    # Direct workspace membership
    ws_membership = await db.workspace_memberships.find_one({
        "workspace_id": workspace_id,
        "user_id": user_id,
        "is_active": True
    })
    if ws_membership:
        return True
    
    # Org owner/admin has access to all workspaces
    org_membership = await db.org_memberships.find_one({
        "org_id": org_id,
        "user_id": user_id,
        "role": {"$in": [OrgRole.OWNER.value, OrgRole.ADMIN.value]},
        "is_active": True
    })
    if org_membership:
        return True
    
    return False
