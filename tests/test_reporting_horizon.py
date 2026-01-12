"""
Test suite for Reporting Horizon Selector feature
Tests the horizon-based data filtering and preferences persistence
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "Test123!"


class TestReportingHorizonPreferences:
    """Tests for reporting horizon preferences API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip(f"Authentication failed: {login_response.status_code}")
    
    def test_get_reporting_horizon_preferences(self):
        """Test GET /api/user/preferences/reporting-horizon"""
        response = self.session.get(f"{BASE_URL}/api/user/preferences/reporting-horizon")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "type" in data
        assert data["type"] == "reporting-horizon"
        assert "preferences" in data
        print(f"✓ GET reporting-horizon preferences: {data}")
    
    def test_update_reporting_horizon_preferences(self):
        """Test PUT /api/user/preferences/reporting-horizon"""
        # Set horizon to 6M
        update_data = {
            "preferences": {
                "globalHorizon": "6m",
                "customStartDate": None,
                "customEndDate": None,
                "compareToPrior": False,
                "widgetOverrides": {}
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/user/preferences/reporting-horizon",
            json=update_data
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ PUT reporting-horizon preferences: Updated to 6M")
        
        # Verify the update persisted
        get_response = self.session.get(f"{BASE_URL}/api/user/preferences/reporting-horizon")
        assert get_response.status_code == 200
        
        prefs = get_response.json().get("preferences", {})
        assert prefs.get("globalHorizon") == "6m", f"Expected '6m', got {prefs.get('globalHorizon')}"
        print(f"✓ Verified horizon preference persisted: {prefs.get('globalHorizon')}")
    
    def test_update_compare_to_prior_toggle(self):
        """Test updating Compare to Prior Period toggle"""
        update_data = {
            "preferences": {
                "globalHorizon": "30d",
                "compareToPrior": True,
                "widgetOverrides": {}
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/user/preferences/reporting-horizon",
            json=update_data
        )
        
        assert response.status_code == 200
        
        # Verify
        get_response = self.session.get(f"{BASE_URL}/api/user/preferences/reporting-horizon")
        prefs = get_response.json().get("preferences", {})
        assert prefs.get("compareToPrior") == True, f"Expected True, got {prefs.get('compareToPrior')}"
        print(f"✓ Compare to Prior toggle updated and persisted")
    
    def test_custom_date_range(self):
        """Test setting custom date range"""
        update_data = {
            "preferences": {
                "globalHorizon": "custom",
                "customStartDate": "2026-01-01T00:00:00.000Z",
                "customEndDate": "2026-03-31T00:00:00.000Z",
                "compareToPrior": False,
                "widgetOverrides": {}
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/user/preferences/reporting-horizon",
            json=update_data
        )
        
        assert response.status_code == 200
        
        # Verify
        get_response = self.session.get(f"{BASE_URL}/api/user/preferences/reporting-horizon")
        prefs = get_response.json().get("preferences", {})
        assert prefs.get("globalHorizon") == "custom"
        assert prefs.get("customStartDate") is not None
        assert prefs.get("customEndDate") is not None
        print(f"✓ Custom date range set and persisted")


class TestDashboardMetrics:
    """Tests for dashboard metrics API"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_get_group_summary(self):
        """Test GET /api/dashboard/group/summary"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/group/summary")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Verify expected fields exist
        assert "total_revenue" in data or "entity_count" in data
        print(f"✓ Group summary retrieved: {data}")
    
    def test_get_company_dashboard(self):
        """Test GET /api/dashboard/{company_id}"""
        # First get companies
        companies_response = self.session.get(f"{BASE_URL}/api/companies")
        
        if companies_response.status_code == 200 and companies_response.json():
            company_id = companies_response.json()[0].get("id")
            
            response = self.session.get(f"{BASE_URL}/api/dashboard/{company_id}")
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            print(f"✓ Company dashboard retrieved for {company_id}")
        else:
            pytest.skip("No companies available for testing")


class TestRAGPolicies:
    """Tests for RAG policy display on dashboard"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_get_rag_defaults(self):
        """Test GET /api/rag-policies/defaults"""
        response = self.session.get(f"{BASE_URL}/api/rag-policies/defaults")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "defaults" in data
        
        defaults = data["defaults"]
        # Verify expected metrics exist
        expected_metrics = ["dso", "dpo", "cash_runway", "ebitda_margin"]
        for metric in expected_metrics:
            assert metric in defaults, f"Missing metric: {metric}"
        
        print(f"✓ RAG defaults retrieved with {len(defaults)} metrics")
    
    def test_evaluate_metrics_against_rag(self):
        """Test POST /api/rag-policies/{company_id}/evaluate"""
        # Get a company first
        companies_response = self.session.get(f"{BASE_URL}/api/companies")
        
        if companies_response.status_code == 200 and companies_response.json():
            company_id = companies_response.json()[0].get("id")
            
            # Evaluate metrics
            metrics_to_evaluate = {
                "dso": 45,
                "dpo": 38,
                "cash_runway": 145,
                "ebitda_margin": 25,
                "quick_ratio": 1.8
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/rag-policies/{company_id}/evaluate",
                json=metrics_to_evaluate
            )
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert "evaluations" in data
            
            evaluations = data["evaluations"]
            # Verify each metric has a status
            for metric_id, evaluation in evaluations.items():
                assert "status" in evaluation, f"Missing status for {metric_id}"
                assert evaluation["status"] in ["green", "amber", "red", "unknown"]
            
            print(f"✓ RAG evaluation completed: {len(evaluations)} metrics evaluated")
        else:
            pytest.skip("No companies available for testing")


class TestCustomRatios:
    """Tests for custom ratios on dashboard"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_get_pinned_ratios(self):
        """Test GET /api/custom-ratios/company/{company_id}/pinned"""
        # Get a company first
        companies_response = self.session.get(f"{BASE_URL}/api/companies")
        
        if companies_response.status_code == 200 and companies_response.json():
            company_id = companies_response.json()[0].get("id")
            
            response = self.session.get(f"{BASE_URL}/api/custom-ratios/company/{company_id}/pinned")
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert "pinned_ratios" in data
            
            print(f"✓ Pinned ratios retrieved: {len(data['pinned_ratios'])} ratios")
        else:
            pytest.skip("No companies available for testing")
    
    def test_get_financial_variables(self):
        """Test GET /api/custom-ratios/variables"""
        response = self.session.get(f"{BASE_URL}/api/custom-ratios/variables")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "variables" in data
        
        variables = data["variables"]
        assert len(variables) > 0, "Expected at least one variable"
        
        # Verify variable structure
        first_var = variables[0]
        assert "id" in first_var
        assert "name" in first_var
        assert "category" in first_var
        
        print(f"✓ Financial variables retrieved: {len(variables)} variables")


class TestDashboardLayouts:
    """Tests for dashboard layouts"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
        else:
            pytest.skip("Authentication failed")
    
    def test_get_dashboard_layouts(self):
        """Test GET /api/dashboard-layouts"""
        response = self.session.get(f"{BASE_URL}/api/dashboard-layouts")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        # Should have layouts or templates
        assert isinstance(data, list) or "layouts" in data or "templates" in data
        
        print(f"✓ Dashboard layouts retrieved")
    
    def test_get_active_layout_preference(self):
        """Test GET /api/user/preferences/active_layout"""
        response = self.session.get(f"{BASE_URL}/api/user/preferences/active_layout")
        
        # May return 200 with data or 404 if not set
        assert response.status_code in [200, 404], f"Unexpected status: {response.status_code}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Active layout preference: {data}")
        else:
            print(f"✓ No active layout preference set (expected)")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
