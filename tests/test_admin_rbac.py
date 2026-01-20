"""
Test Admin Feature-Control Panel with RBAC
Tests:
- Admin route protection (only admins can access /admin)
- Tenant users get 403 Forbidden when accessing /admin
- GET /api/admin/config returns system config for admins
- GET /api/admin/config returns 403 for tenants
- PUT /api/admin/config updates system config
- GET /api/admin/users returns all users for admins
- PUT /api/admin/users/{id}/role changes user role
- GET /api/system/config/public returns visibility config (no auth)
- GET /api/system/features returns feature flags for authenticated users
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "test@example.com"
ADMIN_PASSWORD = "Test123!"
TENANT_EMAIL = "tenant@example.com"
TENANT_PASSWORD = "Test123!"


class TestAdminRBAC:
    """Test Admin RBAC functionality"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin user token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def tenant_token(self):
        """Get tenant user token - create if doesn't exist"""
        # Try to login first
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TENANT_EMAIL,
            "password": TENANT_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        # If login fails, try to register
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TENANT_EMAIL,
            "password": TENANT_PASSWORD,
            "name": "Tenant User"
        })
        if response.status_code == 200:
            return response.json().get("token")
        
        pytest.skip(f"Tenant user setup failed: {response.status_code} - {response.text}")
    
    @pytest.fixture(scope="class")
    def admin_headers(self, admin_token):
        """Headers with admin auth"""
        return {
            "Authorization": f"Bearer {admin_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def tenant_headers(self, tenant_token):
        """Headers with tenant auth"""
        return {
            "Authorization": f"Bearer {tenant_token}",
            "Content-Type": "application/json"
        }
    
    # ==================== PUBLIC ENDPOINTS ====================
    
    def test_public_config_no_auth(self):
        """GET /api/system/config/public - should work without auth"""
        response = requests.get(f"{BASE_URL}/api/system/config/public")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "site_landing_visible" in data, "Missing site_landing_visible"
        assert "site_login_allowed" in data, "Missing site_login_allowed"
        assert isinstance(data["site_landing_visible"], bool), "site_landing_visible should be boolean"
        assert isinstance(data["site_login_allowed"], bool), "site_login_allowed should be boolean"
        print(f"✓ Public config: landing={data['site_landing_visible']}, login={data['site_login_allowed']}")
    
    # ==================== ADMIN CONFIG ENDPOINTS ====================
    
    def test_admin_get_config_success(self, admin_headers):
        """GET /api/admin/config - admin should get full config"""
        response = requests.get(f"{BASE_URL}/api/admin/config", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # Verify all expected fields
        expected_fields = [
            "enable_fetch_bridge",
            "enable_predictive_mapping",
            "enable_variance_resolver",
            "enable_strategic_capital",
            "enable_data_room",
            "site_landing_visible",
            "site_login_allowed"
        ]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        print(f"✓ Admin config retrieved with all {len(expected_fields)} fields")
    
    def test_admin_get_config_forbidden_for_tenant(self, tenant_headers):
        """GET /api/admin/config - tenant should get 403"""
        response = requests.get(f"{BASE_URL}/api/admin/config", headers=tenant_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Missing error detail"
        print(f"✓ Tenant correctly blocked from admin config: {data['detail']}")
    
    def test_admin_update_config(self, admin_headers):
        """PUT /api/admin/config - admin should update config"""
        # First get current config
        get_response = requests.get(f"{BASE_URL}/api/admin/config", headers=admin_headers)
        original_config = get_response.json()
        
        # Toggle a feature
        new_value = not original_config.get("enable_fetch_bridge", False)
        update_response = requests.put(
            f"{BASE_URL}/api/admin/config",
            headers=admin_headers,
            json={"enable_fetch_bridge": new_value}
        )
        assert update_response.status_code == 200, f"Expected 200, got {update_response.status_code}: {update_response.text}"
        
        updated_data = update_response.json()
        assert updated_data["enable_fetch_bridge"] == new_value, "Config not updated correctly"
        assert "updated_at" in updated_data, "Missing updated_at timestamp"
        assert "updated_by" in updated_data, "Missing updated_by field"
        
        # Restore original value
        requests.put(
            f"{BASE_URL}/api/admin/config",
            headers=admin_headers,
            json={"enable_fetch_bridge": original_config.get("enable_fetch_bridge", False)}
        )
        print(f"✓ Admin config updated and restored successfully")
    
    def test_admin_update_config_forbidden_for_tenant(self, tenant_headers):
        """PUT /api/admin/config - tenant should get 403"""
        response = requests.put(
            f"{BASE_URL}/api/admin/config",
            headers=tenant_headers,
            json={"enable_fetch_bridge": True}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Tenant correctly blocked from updating admin config")
    
    # ==================== ADMIN USERS ENDPOINTS ====================
    
    def test_admin_get_users_success(self, admin_headers):
        """GET /api/admin/users - admin should get all users"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Expected list of users"
        assert len(data) > 0, "Expected at least one user"
        
        # Verify user structure (no password_hash)
        for user in data:
            assert "id" in user, "Missing user id"
            assert "email" in user, "Missing user email"
            assert "role" in user, "Missing user role"
            assert "password_hash" not in user, "password_hash should not be exposed"
        
        print(f"✓ Admin retrieved {len(data)} users")
    
    def test_admin_get_users_forbidden_for_tenant(self, tenant_headers):
        """GET /api/admin/users - tenant should get 403"""
        response = requests.get(f"{BASE_URL}/api/admin/users", headers=tenant_headers)
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Tenant correctly blocked from getting users list")
    
    def test_admin_update_user_role(self, admin_headers, tenant_headers):
        """PUT /api/admin/users/{id}/role - admin should update user role"""
        # Get tenant user ID
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        users = users_response.json()
        
        tenant_user = next((u for u in users if u["email"] == TENANT_EMAIL), None)
        if not tenant_user:
            pytest.skip("Tenant user not found")
        
        tenant_id = tenant_user["id"]
        original_role = tenant_user["role"]
        
        # Change role to admin
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{tenant_id}/role?role=admin",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify change
        verify_response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        updated_users = verify_response.json()
        updated_tenant = next((u for u in updated_users if u["id"] == tenant_id), None)
        assert updated_tenant["role"] == "admin", "Role not updated"
        
        # Restore original role
        requests.put(
            f"{BASE_URL}/api/admin/users/{tenant_id}/role?role={original_role}",
            headers=admin_headers
        )
        print(f"✓ User role updated and restored successfully")
    
    def test_admin_update_user_role_invalid_role(self, admin_headers):
        """PUT /api/admin/users/{id}/role - invalid role should fail"""
        # Get any user
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        users = users_response.json()
        
        if not users:
            pytest.skip("No users found")
        
        user_id = users[0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/role?role=superadmin",
            headers=admin_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        print("✓ Invalid role correctly rejected")
    
    def test_admin_cannot_demote_self(self, admin_headers):
        """PUT /api/admin/users/{id}/role - admin cannot demote themselves"""
        # Get admin user ID
        me_response = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers)
        admin_id = me_response.json()["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{admin_id}/role?role=tenant",
            headers=admin_headers
        )
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "demote" in data.get("detail", "").lower() or "yourself" in data.get("detail", "").lower(), \
            f"Expected self-demotion error message, got: {data}"
        print("✓ Admin correctly prevented from demoting themselves")
    
    def test_admin_update_role_forbidden_for_tenant(self, tenant_headers, admin_headers):
        """PUT /api/admin/users/{id}/role - tenant should get 403"""
        # Get any user ID
        users_response = requests.get(f"{BASE_URL}/api/admin/users", headers=admin_headers)
        users = users_response.json()
        
        if not users:
            pytest.skip("No users found")
        
        user_id = users[0]["id"]
        
        response = requests.put(
            f"{BASE_URL}/api/admin/users/{user_id}/role?role=admin",
            headers=tenant_headers
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Tenant correctly blocked from updating user roles")
    
    # ==================== FEATURE FLAGS ENDPOINT ====================
    
    def test_feature_flags_for_authenticated_user(self, admin_headers):
        """GET /api/system/features - authenticated user gets feature flags"""
        response = requests.get(f"{BASE_URL}/api/system/features", headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        expected_flags = [
            "enable_fetch_bridge",
            "enable_predictive_mapping",
            "enable_variance_resolver",
            "enable_strategic_capital",
            "enable_data_room"
        ]
        for flag in expected_flags:
            assert flag in data, f"Missing feature flag: {flag}"
            assert isinstance(data[flag], bool), f"{flag} should be boolean"
        
        print(f"✓ Feature flags retrieved: {data}")
    
    def test_feature_flags_for_tenant(self, tenant_headers):
        """GET /api/system/features - tenant also gets feature flags"""
        response = requests.get(f"{BASE_URL}/api/system/features", headers=tenant_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "enable_fetch_bridge" in data, "Missing feature flag"
        print("✓ Tenant can access feature flags")
    
    def test_feature_flags_requires_auth(self):
        """GET /api/system/features - requires authentication"""
        response = requests.get(f"{BASE_URL}/api/system/features")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
        print("✓ Feature flags correctly requires authentication")
    
    # ==================== VISIBILITY TOGGLES ====================
    
    def test_visibility_toggles_update(self, admin_headers):
        """Test updating visibility toggles"""
        # Get current config
        get_response = requests.get(f"{BASE_URL}/api/admin/config", headers=admin_headers)
        original = get_response.json()
        
        # Toggle site_landing_visible
        new_landing = not original.get("site_landing_visible", True)
        update_response = requests.put(
            f"{BASE_URL}/api/admin/config",
            headers=admin_headers,
            json={"site_landing_visible": new_landing}
        )
        assert update_response.status_code == 200
        
        # Verify public endpoint reflects change
        public_response = requests.get(f"{BASE_URL}/api/system/config/public")
        public_data = public_response.json()
        assert public_data["site_landing_visible"] == new_landing, "Public config not updated"
        
        # Restore
        requests.put(
            f"{BASE_URL}/api/admin/config",
            headers=admin_headers,
            json={"site_landing_visible": original.get("site_landing_visible", True)}
        )
        print("✓ Visibility toggles update correctly and reflect in public config")


class TestAdminConfigPersistence:
    """Test that config changes persist correctly"""
    
    @pytest.fixture(scope="class")
    def admin_headers(self):
        """Get admin headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("token")
            return {
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json"
            }
        pytest.skip("Admin login failed")
    
    def test_config_changes_persist(self, admin_headers):
        """Test that config changes are saved to database"""
        # Get original config
        original_response = requests.get(f"{BASE_URL}/api/admin/config", headers=admin_headers)
        original = original_response.json()
        
        # Make multiple changes
        changes = {
            "enable_fetch_bridge": True,
            "enable_predictive_mapping": True,
            "enable_variance_resolver": False
        }
        
        update_response = requests.put(
            f"{BASE_URL}/api/admin/config",
            headers=admin_headers,
            json=changes
        )
        assert update_response.status_code == 200
        
        # Verify by fetching again
        verify_response = requests.get(f"{BASE_URL}/api/admin/config", headers=admin_headers)
        verified = verify_response.json()
        
        for key, value in changes.items():
            assert verified[key] == value, f"{key} not persisted correctly"
        
        # Restore original values
        restore_data = {k: original.get(k, False) for k in changes.keys()}
        requests.put(f"{BASE_URL}/api/admin/config", headers=admin_headers, json=restore_data)
        
        print("✓ Config changes persist correctly")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
