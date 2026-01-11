"""
Test Suite for Metric & Reporting Customization Features
- Custom Ratios API (Define Your Ratio)
- Dashboard Layouts API (Role-based templates, Tab management)
- User Preferences API (Reporting Horizons)
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "Test123!"


class TestAuthSetup:
    """Authentication setup for all tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        # Try login first
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if response.status_code == 200:
            return response.json().get("token")
        
        # If login fails, try register
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Test User"
        })
        
        if response.status_code == 200:
            return response.json().get("token")
        
        pytest.skip("Authentication failed - skipping tests")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Get auth headers"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def test_company(self, auth_headers):
        """Get or create a test company"""
        # First check if company exists
        response = requests.get(f"{BASE_URL}/api/companies", headers=auth_headers)
        if response.status_code == 200:
            companies = response.json()
            if companies:
                return companies[0]
        
        # Create new company
        response = requests.post(f"{BASE_URL}/api/companies", headers=auth_headers, json={
            "name": f"TEST_MetricCustomization_{uuid.uuid4().hex[:8]}",
            "country": "United Kingdom",
            "currency": "GBP",
            "company_type": "Standalone"
        })
        
        if response.status_code == 200:
            return response.json()
        
        pytest.skip("Could not create test company")


class TestCustomRatiosVariables(TestAuthSetup):
    """Test Custom Ratios Variables API"""
    
    def test_get_available_variables(self, auth_headers):
        """Test GET /api/custom-ratios/variables - returns 43 financial variables"""
        response = requests.get(f"{BASE_URL}/api/custom-ratios/variables", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "variables" in data
        assert "by_category" in data
        
        # Verify we have variables
        variables = data["variables"]
        assert len(variables) > 30, f"Expected 30+ variables, got {len(variables)}"
        
        # Verify categories exist
        categories = data["by_category"]
        expected_categories = ["Balance Sheet", "Income Statement", "Cash Flow", "Working Capital", "Operational"]
        for cat in expected_categories:
            assert cat in categories, f"Missing category: {cat}"
        
        # Verify variable structure
        sample_var = variables[0]
        assert "id" in sample_var
        assert "name" in sample_var
        assert "category" in sample_var
        assert "default_value" in sample_var
        
        print(f"✓ Found {len(variables)} financial variables across {len(categories)} categories")


class TestCustomRatiosCRUD(TestAuthSetup):
    """Test Custom Ratios CRUD operations"""
    
    def test_create_custom_ratio(self, auth_headers, test_company):
        """Test POST /api/custom-ratios - create a custom ratio"""
        ratio_name = f"TEST_Liquidity_Index_{uuid.uuid4().hex[:6]}"
        
        response = requests.post(f"{BASE_URL}/api/custom-ratios", headers=auth_headers, json={
            "company_id": test_company["id"],
            "name": ratio_name,
            "description": "Custom liquidity metric for testing",
            "numerator_variables": [
                {"variable_id": "total_cash", "coefficient": 1.0},
                {"variable_id": "accounts_receivable", "coefficient": 0.5}
            ],
            "denominator_variables": [
                {"variable_id": "current_liabilities", "coefficient": 1.0}
            ],
            "operator": "/",
            "constant": 0,
            "unit": "ratio",
            "is_higher_better": True,
            "green_threshold": 2.0,
            "amber_threshold": 1.5,
            "is_pinned": True,
            "visibility": "private"
        })
        
        assert response.status_code == 200, f"Failed to create ratio: {response.text}"
        data = response.json()
        
        assert "id" in data
        assert "ratio" in data
        assert data["ratio"]["name"] == ratio_name
        assert data["ratio"]["is_pinned"] == True
        assert "current_value" in data["ratio"]
        assert "rag_status" in data
        
        print(f"✓ Created custom ratio: {ratio_name} with value {data['ratio']['current_value']}")
        
        # Store for cleanup
        self.__class__.created_ratio_id = data["id"]
        return data["id"]
    
    def test_get_custom_ratios(self, auth_headers, test_company):
        """Test GET /api/custom-ratios - list custom ratios"""
        response = requests.get(
            f"{BASE_URL}/api/custom-ratios",
            headers=auth_headers,
            params={"company_id": test_company["id"]}
        )
        
        assert response.status_code == 200
        ratios = response.json()
        
        assert isinstance(ratios, list)
        
        if ratios:
            ratio = ratios[0]
            assert "id" in ratio
            assert "name" in ratio
            assert "current_value" in ratio
            assert "rag_status" in ratio
            print(f"✓ Found {len(ratios)} custom ratios")
        else:
            print("✓ No custom ratios found (empty list)")
    
    def test_get_pinned_ratios(self, auth_headers, test_company):
        """Test GET /api/custom-ratios with pinned_only filter"""
        response = requests.get(
            f"{BASE_URL}/api/custom-ratios",
            headers=auth_headers,
            params={"company_id": test_company["id"], "pinned_only": True}
        )
        
        assert response.status_code == 200
        ratios = response.json()
        
        # All returned ratios should be pinned
        for ratio in ratios:
            assert ratio.get("is_pinned") == True
        
        print(f"✓ Found {len(ratios)} pinned ratios")
    
    def test_get_single_ratio(self, auth_headers):
        """Test GET /api/custom-ratios/{ratio_id}"""
        if not hasattr(self.__class__, 'created_ratio_id'):
            pytest.skip("No ratio created to test")
        
        ratio_id = self.__class__.created_ratio_id
        response = requests.get(f"{BASE_URL}/api/custom-ratios/{ratio_id}", headers=auth_headers)
        
        assert response.status_code == 200
        ratio = response.json()
        
        assert ratio["id"] == ratio_id
        assert "current_value" in ratio
        assert "rag_status" in ratio
        
        print(f"✓ Retrieved ratio: {ratio['name']}")
    
    def test_update_custom_ratio(self, auth_headers):
        """Test PUT /api/custom-ratios/{ratio_id}"""
        if not hasattr(self.__class__, 'created_ratio_id'):
            pytest.skip("No ratio created to test")
        
        ratio_id = self.__class__.created_ratio_id
        response = requests.put(
            f"{BASE_URL}/api/custom-ratios/{ratio_id}",
            headers=auth_headers,
            json={
                "description": "Updated description for testing",
                "green_threshold": 2.5,
                "amber_threshold": 1.8
            }
        )
        
        assert response.status_code == 200
        print("✓ Updated custom ratio thresholds")
    
    def test_pin_toggle_ratio(self, auth_headers):
        """Test POST /api/custom-ratios/{ratio_id}/pin"""
        if not hasattr(self.__class__, 'created_ratio_id'):
            pytest.skip("No ratio created to test")
        
        ratio_id = self.__class__.created_ratio_id
        response = requests.post(f"{BASE_URL}/api/custom-ratios/{ratio_id}/pin", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "is_pinned" in data
        
        print(f"✓ Toggled pin status to: {data['is_pinned']}")
    
    def test_promote_ratio_visibility(self, auth_headers):
        """Test POST /api/custom-ratios/{ratio_id}/promote"""
        if not hasattr(self.__class__, 'created_ratio_id'):
            pytest.skip("No ratio created to test")
        
        ratio_id = self.__class__.created_ratio_id
        response = requests.post(f"{BASE_URL}/api/custom-ratios/{ratio_id}/promote", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert "visibility" in data
        
        print(f"✓ Changed visibility to: {data['visibility']}")
    
    def test_calculate_ratio(self, auth_headers):
        """Test POST /api/custom-ratios/{ratio_id}/calculate"""
        if not hasattr(self.__class__, 'created_ratio_id'):
            pytest.skip("No ratio created to test")
        
        ratio_id = self.__class__.created_ratio_id
        response = requests.post(
            f"{BASE_URL}/api/custom-ratios/{ratio_id}/calculate",
            headers=auth_headers,
            json={
                "variable_values": {
                    "total_cash": 2000000,
                    "accounts_receivable": 500000,
                    "current_liabilities": 1000000
                }
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "value" in data
        assert "rag_status" in data
        
        print(f"✓ Calculated ratio value: {data['value']} (status: {data['rag_status']})")
    
    def test_delete_custom_ratio(self, auth_headers):
        """Test DELETE /api/custom-ratios/{ratio_id}"""
        if not hasattr(self.__class__, 'created_ratio_id'):
            pytest.skip("No ratio created to test")
        
        ratio_id = self.__class__.created_ratio_id
        response = requests.delete(f"{BASE_URL}/api/custom-ratios/{ratio_id}", headers=auth_headers)
        
        assert response.status_code == 200
        print("✓ Deleted custom ratio")


class TestDashboardLayouts(TestAuthSetup):
    """Test Dashboard Layouts API"""
    
    def test_get_dashboard_layouts_with_templates(self, auth_headers):
        """Test GET /api/dashboard-layouts - includes role-based templates"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard-layouts",
            headers=auth_headers,
            params={"include_templates": True}
        )
        
        assert response.status_code == 200
        layouts = response.json()
        
        assert isinstance(layouts, list)
        
        # Should include role-based templates
        template_names = [l.get("name") for l in layouts if l.get("is_role_template")]
        expected_templates = ["CFO View", "FP&A View", "Investor Relations View"]
        
        for expected in expected_templates:
            assert expected in template_names, f"Missing template: {expected}"
        
        print(f"✓ Found {len(layouts)} layouts including {len(template_names)} role templates")
    
    def test_role_template_structure(self, auth_headers):
        """Test that role templates have correct structure"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard-layouts",
            headers=auth_headers,
            params={"include_templates": True}
        )
        
        assert response.status_code == 200
        layouts = response.json()
        
        # Find CFO template
        cfo_template = next((l for l in layouts if l.get("name") == "CFO View"), None)
        assert cfo_template is not None, "CFO View template not found"
        
        # Verify structure
        assert cfo_template.get("is_role_template") == True
        assert cfo_template.get("role_name") == "cfo"
        assert "tabs" in cfo_template
        assert "widgets" in cfo_template
        assert "description" in cfo_template
        
        # Verify tabs structure
        tabs = cfo_template.get("tabs", [])
        assert len(tabs) > 0
        
        for tab in tabs:
            assert "id" in tab
            assert "name" in tab
            assert "visible" in tab
            assert "order" in tab
        
        print(f"✓ CFO View template has {len(tabs)} tabs configured")
    
    def test_create_custom_layout(self, auth_headers):
        """Test POST /api/dashboard-layouts - create custom layout"""
        layout_name = f"TEST_Custom_Layout_{uuid.uuid4().hex[:6]}"
        
        response = requests.post(f"{BASE_URL}/api/dashboard-layouts", headers=auth_headers, json={
            "name": layout_name,
            "tabs": [
                {"id": "command-centre", "name": "Command Centre", "visible": True, "order": 1},
                {"id": "fpa", "name": "FP&A", "visible": True, "order": 2},
                {"id": "settings", "name": "Settings", "visible": True, "order": 3}
            ],
            "widgets": {
                "liquidity_strip": {"visible": True, "expanded": True}
            }
        })
        
        assert response.status_code == 200
        data = response.json()
        
        assert "layout" in data
        assert data["layout"]["name"] == layout_name
        
        print(f"✓ Created custom layout: {layout_name}")
        
        # Store for cleanup
        self.__class__.created_layout_id = data["layout"]["id"]
        return data["layout"]["id"]
    
    def test_apply_layout(self, auth_headers):
        """Test POST /api/dashboard-layouts/{layout_id}/apply"""
        # Apply CFO template
        response = requests.get(
            f"{BASE_URL}/api/dashboard-layouts",
            headers=auth_headers,
            params={"include_templates": True}
        )
        
        layouts = response.json()
        cfo_template = next((l for l in layouts if l.get("name") == "CFO View"), None)
        
        if not cfo_template:
            pytest.skip("CFO template not found")
        
        response = requests.post(
            f"{BASE_URL}/api/dashboard-layouts/{cfo_template['id']}/apply",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "layout" in data
        assert data["layout"]["name"] == "CFO View"
        
        print("✓ Applied CFO View layout")
    
    def test_update_layout(self, auth_headers):
        """Test PUT /api/dashboard-layouts/{layout_id}"""
        if not hasattr(self.__class__, 'created_layout_id'):
            pytest.skip("No layout created to test")
        
        layout_id = self.__class__.created_layout_id
        response = requests.put(
            f"{BASE_URL}/api/dashboard-layouts/{layout_id}",
            headers=auth_headers,
            json={
                "name": "Updated Test Layout",
                "tabs": [
                    {"id": "command-centre", "name": "Dashboard", "visible": True, "order": 1}
                ]
            }
        )
        
        assert response.status_code == 200
        print("✓ Updated custom layout")
    
    def test_delete_layout(self, auth_headers):
        """Test DELETE /api/dashboard-layouts/{layout_id}"""
        if not hasattr(self.__class__, 'created_layout_id'):
            pytest.skip("No layout created to test")
        
        layout_id = self.__class__.created_layout_id
        response = requests.delete(f"{BASE_URL}/api/dashboard-layouts/{layout_id}", headers=auth_headers)
        
        assert response.status_code == 200
        print("✓ Deleted custom layout")


class TestUserPreferences(TestAuthSetup):
    """Test User Preferences API for Reporting Horizons"""
    
    def test_get_reporting_horizon_preferences(self, auth_headers):
        """Test GET /api/user/preferences/reporting-horizon"""
        response = requests.get(
            f"{BASE_URL}/api/user/preferences/reporting-horizon",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "type" in data
        assert data["type"] == "reporting-horizon"
        
        print("✓ Retrieved reporting horizon preferences")
    
    def test_update_reporting_horizon_preferences(self, auth_headers):
        """Test PUT /api/user/preferences/reporting-horizon"""
        response = requests.put(
            f"{BASE_URL}/api/user/preferences/reporting-horizon",
            headers=auth_headers,
            json={
                "preferences": {
                    "globalHorizon": "60d",
                    "compareToPrior": True,
                    "widgetOverrides": {}
                }
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["type"] == "reporting-horizon"
        
        print("✓ Updated reporting horizon to 60 days with compare to prior")
    
    def test_get_active_layout_preferences(self, auth_headers):
        """Test GET /api/user/preferences/active_layout"""
        response = requests.get(
            f"{BASE_URL}/api/user/preferences/active_layout",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "type" in data
        assert data["type"] == "active_layout"
        
        print("✓ Retrieved active layout preferences")
    
    def test_update_active_layout_preferences(self, auth_headers):
        """Test PUT /api/user/preferences/active_layout"""
        response = requests.put(
            f"{BASE_URL}/api/user/preferences/active_layout",
            headers=auth_headers,
            json={
                "preferences": {
                    "active_layout_id": "custom",
                    "tabs": [
                        {"id": "command-centre", "name": "Command Centre", "visible": True, "order": 1},
                        {"id": "fpa", "name": "FP&A", "visible": True, "order": 2}
                    ]
                }
            }
        )
        
        assert response.status_code == 200
        print("✓ Updated active layout preferences")


class TestPinnedRatiosForDashboard(TestAuthSetup):
    """Test pinned ratios endpoint for dashboard strip"""
    
    def test_get_pinned_ratios_for_company(self, auth_headers, test_company):
        """Test GET /api/custom-ratios/company/{company_id}/pinned"""
        response = requests.get(
            f"{BASE_URL}/api/custom-ratios/company/{test_company['id']}/pinned",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Response format is {"company_id": ..., "pinned_ratios": [...]}
        assert "company_id" in data
        assert "pinned_ratios" in data
        assert isinstance(data["pinned_ratios"], list)
        
        # All returned should be pinned
        for ratio in data["pinned_ratios"]:
            assert "id" in ratio
            assert "name" in ratio
            assert "value" in ratio
            assert "rag_status" in ratio
        
        print(f"✓ Found {len(data['pinned_ratios'])} pinned ratios for dashboard strip")


class TestIntegrationFlow(TestAuthSetup):
    """Test complete integration flow"""
    
    def test_full_custom_ratio_workflow(self, auth_headers, test_company):
        """Test complete workflow: create ratio -> pin -> calculate -> display"""
        # 1. Create ratio
        ratio_name = f"TEST_Integration_Ratio_{uuid.uuid4().hex[:6]}"
        
        create_response = requests.post(f"{BASE_URL}/api/custom-ratios", headers=auth_headers, json={
            "company_id": test_company["id"],
            "name": ratio_name,
            "description": "Integration test ratio",
            "numerator_variables": [
                {"variable_id": "ebitda", "coefficient": 1.0}
            ],
            "denominator_variables": [
                {"variable_id": "revenue", "coefficient": 1.0}
            ],
            "operator": "/",
            "unit": "percentage",
            "is_higher_better": True,
            "green_threshold": 20,
            "amber_threshold": 10,
            "is_pinned": True
        })
        
        assert create_response.status_code == 200
        ratio_id = create_response.json()["id"]
        
        # 2. Verify it appears in pinned list
        pinned_response = requests.get(
            f"{BASE_URL}/api/custom-ratios/company/{test_company['id']}/pinned",
            headers=auth_headers
        )
        
        assert pinned_response.status_code == 200
        pinned_ratios = pinned_response.json()
        
        found = any(r["id"] == ratio_id for r in pinned_ratios)
        assert found, "Created ratio not found in pinned list"
        
        # 3. Calculate with custom values
        calc_response = requests.post(
            f"{BASE_URL}/api/custom-ratios/{ratio_id}/calculate",
            headers=auth_headers,
            json={
                "variable_values": {
                    "ebitda": 500000,
                    "revenue": 2000000
                }
            }
        )
        
        assert calc_response.status_code == 200
        calc_data = calc_response.json()
        
        # EBITDA margin should be 25% (500000/2000000 * 100)
        assert calc_data["value"] == 25.0
        assert calc_data["rag_status"] == "green"  # 25% > 20% threshold
        
        # 4. Cleanup
        requests.delete(f"{BASE_URL}/api/custom-ratios/{ratio_id}", headers=auth_headers)
        
        print("✓ Full custom ratio workflow completed successfully")
    
    def test_dashboard_layout_workflow(self, auth_headers):
        """Test complete layout workflow: get templates -> apply -> customize"""
        # 1. Get templates
        templates_response = requests.get(
            f"{BASE_URL}/api/dashboard-layouts",
            headers=auth_headers,
            params={"include_templates": True}
        )
        
        assert templates_response.status_code == 200
        layouts = templates_response.json()
        
        # 2. Find FP&A template
        fpa_template = next((l for l in layouts if l.get("name") == "FP&A View"), None)
        assert fpa_template is not None
        
        # 3. Apply template
        apply_response = requests.post(
            f"{BASE_URL}/api/dashboard-layouts/{fpa_template['id']}/apply",
            headers=auth_headers
        )
        
        assert apply_response.status_code == 200
        
        # 4. Verify active layout updated
        prefs_response = requests.get(
            f"{BASE_URL}/api/user/preferences/active_layout",
            headers=auth_headers
        )
        
        assert prefs_response.status_code == 200
        prefs = prefs_response.json()
        
        assert prefs.get("preferences", {}).get("active_layout_id") == fpa_template["id"]
        
        print("✓ Dashboard layout workflow completed successfully")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
