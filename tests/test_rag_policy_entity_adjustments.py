"""
Test suite for RAG Policy and Entity Adjustment APIs
Tests the Core Platform Flexibility features:
1. RAG Policy - Custom Red/Amber/Green thresholds for financial metrics
2. Entity Adjustments - Per-entity accounting logic and presentation tweaks
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "Test123!"


class TestRAGPolicyAPIs:
    """Tests for RAG Policy endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_token, test_company):
        """Setup for each test"""
        self.token = auth_token
        self.company_id = test_company['id']
        self.headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    # ==================== GET /api/rag-policies/defaults ====================
    def test_get_default_rag_policies(self):
        """Test GET /api/rag-policies/defaults returns 15 default metrics"""
        response = requests.get(
            f"{BASE_URL}/api/rag-policies/defaults",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert "defaults" in data
        assert "description" in data
        
        # Verify 15 default metrics
        defaults = data["defaults"]
        assert len(defaults) == 15, f"Expected 15 default metrics, got {len(defaults)}"
        
        # Verify expected metrics exist
        expected_metrics = [
            "dso", "dpo", "cash_runway", "ebitda_margin", "gross_margin",
            "current_ratio", "quick_ratio", "revenue_growth", "debt_to_equity",
            "interest_coverage", "working_capital_ratio", "ar_turnover",
            "ap_turnover", "inventory_turnover", "burn_rate"
        ]
        for metric in expected_metrics:
            assert metric in defaults, f"Missing metric: {metric}"
        
        # Verify DSO metric structure (lower is better)
        dso = defaults["dso"]
        assert dso["metric_name"] == "Days Sales Outstanding (DSO)"
        assert "thresholds" in dso
        assert dso["thresholds"]["green_max"] == 30
        assert dso["thresholds"]["amber_max"] == 45
        assert dso["thresholds"]["is_higher_better"] == False
        
        # Verify EBITDA Margin metric structure (higher is better)
        ebitda = defaults["ebitda_margin"]
        assert ebitda["metric_name"] == "EBITDA Margin (%)"
        assert ebitda["thresholds"]["green_min"] == 20
        assert ebitda["thresholds"]["amber_min"] == 10
        assert ebitda["thresholds"]["is_higher_better"] == True
        
        print("✓ GET /api/rag-policies/defaults returns 15 default metrics correctly")
    
    # ==================== GET /api/rag-policies/{company_id} ====================
    def test_get_company_rag_policy_returns_defaults(self):
        """Test GET /api/rag-policies/{company_id} returns defaults when no custom policy"""
        response = requests.get(
            f"{BASE_URL}/api/rag-policies/{self.company_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Should return default policy
        assert data["company_id"] == self.company_id
        assert data["is_default"] == True
        assert "metrics" in data
        assert len(data["metrics"]) == 15
        
        print("✓ GET /api/rag-policies/{company_id} returns defaults when no custom policy")
    
    def test_get_company_rag_policy_not_found(self):
        """Test GET /api/rag-policies/{company_id} with invalid company"""
        response = requests.get(
            f"{BASE_URL}/api/rag-policies/invalid-company-id",
            headers=self.headers
        )
        
        assert response.status_code == 404
        print("✓ GET /api/rag-policies/{company_id} returns 404 for invalid company")
    
    # ==================== POST /api/rag-policies ====================
    def test_create_rag_policy(self):
        """Test POST /api/rag-policies creates new policy"""
        # RAGPolicyCreate expects metrics with RAGMetricConfig structure including metric_id
        custom_metrics = {
            "dso": {
                "metric_id": "dso",
                "metric_name": "Days Sales Outstanding (DSO)",
                "thresholds": {
                    "green_max": 45,  # Custom: 45 instead of 30
                    "amber_max": 75,  # Custom: 75 instead of 45
                    "is_higher_better": False
                },
                "enabled": True
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/rag-policies",
            headers=self.headers,
            json={
                "company_id": self.company_id,
                "metrics": custom_metrics
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        assert data["message"] in ["RAG policy created", "RAG policy updated"]
        
        # Verify policy was created
        get_response = requests.get(
            f"{BASE_URL}/api/rag-policies/{self.company_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        policy = get_response.json()
        assert policy["is_default"] == False
        
        print("✓ POST /api/rag-policies creates new policy")
    
    def test_create_rag_policy_invalid_company(self):
        """Test POST /api/rag-policies with invalid company"""
        response = requests.post(
            f"{BASE_URL}/api/rag-policies",
            headers=self.headers,
            json={
                "company_id": "invalid-company-id",
                "metrics": {}
            }
        )
        
        assert response.status_code == 404
        print("✓ POST /api/rag-policies returns 404 for invalid company")
    
    # ==================== PUT /api/rag-policies/{company_id} ====================
    def test_update_rag_policy(self):
        """Test PUT /api/rag-policies/{company_id} updates policy"""
        # First create a policy
        requests.post(
            f"{BASE_URL}/api/rag-policies",
            headers=self.headers,
            json={
                "company_id": self.company_id,
                "metrics": {"dso": {"metric_name": "DSO", "thresholds": {"green_max": 30}}}
            }
        )
        
        # Update the policy
        updated_metrics = {
            "dso": {
                "metric_name": "Days Sales Outstanding (DSO)",
                "thresholds": {
                    "green_max": 60,  # Updated threshold
                    "amber_max": 90,
                    "is_higher_better": False
                }
            },
            "cash_runway": {
                "metric_name": "Cash Runway (Days)",
                "thresholds": {
                    "green_min": 200,  # Custom threshold
                    "amber_min": 100,
                    "is_higher_better": True
                }
            }
        }
        
        response = requests.put(
            f"{BASE_URL}/api/rag-policies/{self.company_id}",
            headers=self.headers,
            json={"metrics": updated_metrics}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/rag-policies/{self.company_id}",
            headers=self.headers
        )
        policy = get_response.json()
        assert policy["is_default"] == False
        
        print("✓ PUT /api/rag-policies/{company_id} updates policy")
    
    # ==================== DELETE /api/rag-policies/{company_id} ====================
    def test_delete_rag_policy(self):
        """Test DELETE /api/rag-policies/{company_id} resets to defaults"""
        # First create a policy
        requests.post(
            f"{BASE_URL}/api/rag-policies",
            headers=self.headers,
            json={
                "company_id": self.company_id,
                "metrics": {"dso": {"metric_name": "DSO", "thresholds": {"green_max": 50}}}
            }
        )
        
        # Delete the policy
        response = requests.delete(
            f"{BASE_URL}/api/rag-policies/{self.company_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "deleted" in data["message"].lower() or "default" in data["message"].lower()
        
        # Verify it now returns defaults
        get_response = requests.get(
            f"{BASE_URL}/api/rag-policies/{self.company_id}",
            headers=self.headers
        )
        policy = get_response.json()
        assert policy["is_default"] == True
        
        print("✓ DELETE /api/rag-policies/{company_id} resets to defaults")
    
    # ==================== POST /api/rag-policies/{company_id}/evaluate ====================
    def test_evaluate_rag_status_green(self):
        """Test POST /api/rag-policies/{company_id}/evaluate returns green status"""
        # Evaluate with good values
        response = requests.post(
            f"{BASE_URL}/api/rag-policies/{self.company_id}/evaluate",
            headers=self.headers,
            json={
                "dso": 25,  # Below green_max of 30
                "ebitda_margin": 25  # Above green_min of 20
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["company_id"] == self.company_id
        assert "evaluations" in data
        
        # DSO should be green (25 <= 30)
        assert data["evaluations"]["dso"]["status"] == "green"
        assert data["evaluations"]["dso"]["value"] == 25
        
        # EBITDA margin should be green (25 >= 20)
        assert data["evaluations"]["ebitda_margin"]["status"] == "green"
        
        print("✓ POST /api/rag-policies/{company_id}/evaluate returns green status correctly")
    
    def test_evaluate_rag_status_amber(self):
        """Test POST /api/rag-policies/{company_id}/evaluate returns amber status"""
        response = requests.post(
            f"{BASE_URL}/api/rag-policies/{self.company_id}/evaluate",
            headers=self.headers,
            json={
                "dso": 40,  # Between 30 and 45 (amber)
                "ebitda_margin": 15  # Between 10 and 20 (amber)
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # DSO should be amber (30 < 40 <= 45)
        assert data["evaluations"]["dso"]["status"] == "amber"
        
        # EBITDA margin should be amber (10 <= 15 < 20)
        assert data["evaluations"]["ebitda_margin"]["status"] == "amber"
        
        print("✓ POST /api/rag-policies/{company_id}/evaluate returns amber status correctly")
    
    def test_evaluate_rag_status_red(self):
        """Test POST /api/rag-policies/{company_id}/evaluate returns red status"""
        response = requests.post(
            f"{BASE_URL}/api/rag-policies/{self.company_id}/evaluate",
            headers=self.headers,
            json={
                "dso": 60,  # Above amber_max of 45 (red)
                "ebitda_margin": 5  # Below amber_min of 10 (red)
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # DSO should be red (60 > 45)
        assert data["evaluations"]["dso"]["status"] == "red"
        
        # EBITDA margin should be red (5 < 10)
        assert data["evaluations"]["ebitda_margin"]["status"] == "red"
        
        print("✓ POST /api/rag-policies/{company_id}/evaluate returns red status correctly")


class TestEntityAdjustmentAPIs:
    """Tests for Entity Adjustment endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self, auth_token, test_company):
        """Setup for each test"""
        self.token = auth_token
        self.company_id = test_company['id']
        self.headers = {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
        self.created_adjustment_ids = []
    
    def teardown_method(self, method):
        """Cleanup created adjustments after each test"""
        for adj_id in self.created_adjustment_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/entity-adjustments/{adj_id}",
                    headers=self.headers
                )
            except:
                pass
    
    # ==================== GET /api/entity-adjustments/types ====================
    def test_get_adjustment_types(self):
        """Test GET /api/entity-adjustments/types returns 8 types"""
        response = requests.get(
            f"{BASE_URL}/api/entity-adjustments/types",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "types" in data
        types = data["types"]
        assert len(types) == 8, f"Expected 8 adjustment types, got {len(types)}"
        
        # Verify expected types
        expected_types = [
            "currency_translation", "revenue_recognition", "depreciation",
            "inventory_valuation", "consolidation", "intercompany",
            "tax_treatment", "custom"
        ]
        type_values = [t["value"] for t in types]
        for expected in expected_types:
            assert expected in type_values, f"Missing type: {expected}"
        
        # Verify structure of each type
        for t in types:
            assert "value" in t
            assert "label" in t
            assert "description" in t
            assert "example_parameters" in t
        
        print("✓ GET /api/entity-adjustments/types returns 8 types correctly")
    
    # ==================== GET /api/entity-adjustments ====================
    def test_get_entity_adjustments_empty(self):
        """Test GET /api/entity-adjustments returns empty list initially"""
        response = requests.get(
            f"{BASE_URL}/api/entity-adjustments",
            headers=self.headers,
            params={"company_id": self.company_id}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        print("✓ GET /api/entity-adjustments returns list")
    
    # ==================== POST /api/entity-adjustments ====================
    def test_create_entity_adjustment_currency_translation(self):
        """Test POST /api/entity-adjustments creates currency translation adjustment"""
        adjustment_data = {
            "company_id": self.company_id,
            "adjustment_type": "currency_translation",
            "name": "TEST_UK GAAP FX Translation",
            "description": "Use current rate method for balance sheet items",
            "parameters": {
                "method": "current_rate",
                "fx_gain_loss_account": "FX Gain/Loss"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/entity-adjustments",
            headers=self.headers,
            json=adjustment_data
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "id" in data
        assert data["message"] == "Entity adjustment created"
        assert "adjustment" in data
        
        self.created_adjustment_ids.append(data["id"])
        
        # Verify adjustment was created
        adj = data["adjustment"]
        assert adj["name"] == adjustment_data["name"]
        assert adj["adjustment_type"] == "currency_translation"
        assert adj["parameters"]["method"] == "current_rate"
        
        print("✓ POST /api/entity-adjustments creates currency translation adjustment")
    
    def test_create_entity_adjustment_revenue_recognition(self):
        """Test POST /api/entity-adjustments creates revenue recognition adjustment"""
        adjustment_data = {
            "company_id": self.company_id,
            "adjustment_type": "revenue_recognition",
            "name": "TEST_IFRS 15 Revenue Recognition",
            "description": "Point in time recognition on delivery",
            "parameters": {
                "method": "point_in_time",
                "recognition_criteria": "on_delivery"
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/entity-adjustments",
            headers=self.headers,
            json=adjustment_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        self.created_adjustment_ids.append(data["id"])
        
        print("✓ POST /api/entity-adjustments creates revenue recognition adjustment")
    
    def test_create_entity_adjustment_depreciation(self):
        """Test POST /api/entity-adjustments creates depreciation adjustment"""
        adjustment_data = {
            "company_id": self.company_id,
            "adjustment_type": "depreciation",
            "name": "TEST_Straight Line Depreciation Override",
            "description": "Override useful life to 5 years",
            "parameters": {
                "method": "straight_line",
                "useful_life_override": 5
            }
        }
        
        response = requests.post(
            f"{BASE_URL}/api/entity-adjustments",
            headers=self.headers,
            json=adjustment_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data
        self.created_adjustment_ids.append(data["id"])
        
        print("✓ POST /api/entity-adjustments creates depreciation adjustment")
    
    def test_create_entity_adjustment_invalid_company(self):
        """Test POST /api/entity-adjustments with invalid company"""
        response = requests.post(
            f"{BASE_URL}/api/entity-adjustments",
            headers=self.headers,
            json={
                "company_id": "invalid-company-id",
                "adjustment_type": "custom",
                "name": "Test Adjustment"
            }
        )
        
        assert response.status_code == 404
        print("✓ POST /api/entity-adjustments returns 404 for invalid company")
    
    # ==================== PUT /api/entity-adjustments/{id} ====================
    def test_update_entity_adjustment(self):
        """Test PUT /api/entity-adjustments/{id} updates adjustment"""
        # First create an adjustment
        create_response = requests.post(
            f"{BASE_URL}/api/entity-adjustments",
            headers=self.headers,
            json={
                "company_id": self.company_id,
                "adjustment_type": "custom",
                "name": "TEST_Original Name",
                "description": "Original description",
                "parameters": {"key": "value"}
            }
        )
        
        assert create_response.status_code == 200
        adjustment_id = create_response.json()["id"]
        self.created_adjustment_ids.append(adjustment_id)
        
        # Update the adjustment
        update_response = requests.put(
            f"{BASE_URL}/api/entity-adjustments/{adjustment_id}",
            headers=self.headers,
            json={
                "name": "TEST_Updated Name",
                "description": "Updated description",
                "parameters": {"key": "updated_value", "new_key": "new_value"},
                "is_active": False
            }
        )
        
        assert update_response.status_code == 200
        data = update_response.json()
        assert data["message"] == "Entity adjustment updated"
        
        # Verify update
        get_response = requests.get(
            f"{BASE_URL}/api/entity-adjustments/{adjustment_id}",
            headers=self.headers
        )
        assert get_response.status_code == 200
        adj = get_response.json()
        assert adj["name"] == "TEST_Updated Name"
        assert adj["description"] == "Updated description"
        assert adj["is_active"] == False
        
        print("✓ PUT /api/entity-adjustments/{id} updates adjustment")
    
    def test_update_entity_adjustment_not_found(self):
        """Test PUT /api/entity-adjustments/{id} with invalid id"""
        response = requests.put(
            f"{BASE_URL}/api/entity-adjustments/invalid-id",
            headers=self.headers,
            json={"name": "New Name"}
        )
        
        assert response.status_code == 404
        print("✓ PUT /api/entity-adjustments/{id} returns 404 for invalid id")
    
    # ==================== DELETE /api/entity-adjustments/{id} ====================
    def test_delete_entity_adjustment(self):
        """Test DELETE /api/entity-adjustments/{id} deletes adjustment"""
        # First create an adjustment
        create_response = requests.post(
            f"{BASE_URL}/api/entity-adjustments",
            headers=self.headers,
            json={
                "company_id": self.company_id,
                "adjustment_type": "custom",
                "name": "TEST_To Be Deleted"
            }
        )
        
        assert create_response.status_code == 200
        adjustment_id = create_response.json()["id"]
        
        # Delete the adjustment
        delete_response = requests.delete(
            f"{BASE_URL}/api/entity-adjustments/{adjustment_id}",
            headers=self.headers
        )
        
        assert delete_response.status_code == 200
        data = delete_response.json()
        assert data["message"] == "Entity adjustment deleted"
        
        # Verify deletion
        get_response = requests.get(
            f"{BASE_URL}/api/entity-adjustments/{adjustment_id}",
            headers=self.headers
        )
        assert get_response.status_code == 404
        
        print("✓ DELETE /api/entity-adjustments/{id} deletes adjustment")
    
    def test_delete_entity_adjustment_not_found(self):
        """Test DELETE /api/entity-adjustments/{id} with invalid id"""
        response = requests.delete(
            f"{BASE_URL}/api/entity-adjustments/invalid-id",
            headers=self.headers
        )
        
        assert response.status_code == 404
        print("✓ DELETE /api/entity-adjustments/{id} returns 404 for invalid id")
    
    # ==================== GET /api/entity-adjustments/company/{id}/summary ====================
    def test_get_company_adjustments_summary(self):
        """Test GET /api/entity-adjustments/company/{id}/summary returns summary"""
        # Create a few adjustments first
        for adj_type in ["currency_translation", "revenue_recognition", "custom"]:
            response = requests.post(
                f"{BASE_URL}/api/entity-adjustments",
                headers=self.headers,
                json={
                    "company_id": self.company_id,
                    "adjustment_type": adj_type,
                    "name": f"TEST_{adj_type}_adjustment"
                }
            )
            if response.status_code == 200:
                self.created_adjustment_ids.append(response.json()["id"])
        
        # Get summary
        response = requests.get(
            f"{BASE_URL}/api/entity-adjustments/company/{self.company_id}/summary",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["company_id"] == self.company_id
        assert "company_name" in data
        assert "total_adjustments" in data
        assert "active_adjustments" in data
        assert "by_type" in data
        assert "adjustments" in data
        
        # Should have at least the adjustments we created
        assert data["total_adjustments"] >= 3
        
        print("✓ GET /api/entity-adjustments/company/{id}/summary returns summary")
    
    def test_get_company_adjustments_summary_not_found(self):
        """Test GET /api/entity-adjustments/company/{id}/summary with invalid company"""
        response = requests.get(
            f"{BASE_URL}/api/entity-adjustments/company/invalid-company-id/summary",
            headers=self.headers
        )
        
        assert response.status_code == 404
        print("✓ GET /api/entity-adjustments/company/{id}/summary returns 404 for invalid company")


# ==================== FIXTURES ====================

@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    
    if response.status_code == 200:
        return response.json()["token"]
    
    # Try to register if login fails
    register_response = requests.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD, "name": "Test User"}
    )
    
    if register_response.status_code == 200:
        return register_response.json()["token"]
    
    # Try login again
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": TEST_EMAIL, "password": TEST_PASSWORD}
    )
    
    if response.status_code == 200:
        return response.json()["token"]
    
    pytest.skip("Authentication failed - skipping tests")


@pytest.fixture(scope="module")
def test_company(auth_token):
    """Get or create a test company"""
    headers = {
        "Authorization": f"Bearer {auth_token}",
        "Content-Type": "application/json"
    }
    
    # Check for existing companies
    response = requests.get(f"{BASE_URL}/api/companies", headers=headers)
    if response.status_code == 200 and len(response.json()) > 0:
        return response.json()[0]
    
    # Create a test company
    create_response = requests.post(
        f"{BASE_URL}/api/companies",
        headers=headers,
        json={
            "name": "TEST_RAG_Policy_Company",
            "country": "United Kingdom",
            "currency": "GBP",
            "company_type": "Standalone"
        }
    )
    
    if create_response.status_code == 200:
        return create_response.json()
    
    pytest.skip("Could not create test company")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
