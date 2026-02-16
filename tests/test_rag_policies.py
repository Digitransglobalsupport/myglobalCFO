"""
RAG Policy Integration Tests
Tests for RAG (Red/Amber/Green) policy endpoints and evaluation logic
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://asset-path-fixes.preview.emergentagent.com')

class TestRAGPolicies:
    """RAG Policy API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures - login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get auth token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test@example.com",
            "password": "Test123!"
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user = login_response.json().get("user")
        else:
            # Try to register if login fails
            register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": "test@example.com",
                "password": "Test123!",
                "name": "Test User"
            })
            if register_response.status_code == 200:
                token = register_response.json().get("token")
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.user = register_response.json().get("user")
            else:
                pytest.skip("Could not authenticate")
        
        # Get or create a test company
        companies_response = self.session.get(f"{BASE_URL}/api/companies")
        if companies_response.status_code == 200 and len(companies_response.json()) > 0:
            self.company = companies_response.json()[0]
        else:
            # Create a test company
            create_response = self.session.post(f"{BASE_URL}/api/companies", json={
                "name": "TEST_RAG_Company",
                "country": "United Kingdom",
                "currency": "GBP",
                "company_type": "Standalone"
            })
            if create_response.status_code == 200:
                self.company = create_response.json()
            else:
                pytest.skip("Could not create test company")
    
    # ==================== RAG DEFAULTS TESTS ====================
    
    def test_get_rag_defaults(self):
        """Test GET /api/rag-policies/defaults - should return default thresholds"""
        response = self.session.get(f"{BASE_URL}/api/rag-policies/defaults")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "defaults" in data, "Response should contain 'defaults' key"
        
        defaults = data["defaults"]
        
        # Verify DSO defaults (lower is better)
        assert "dso" in defaults, "DSO should be in defaults"
        assert defaults["dso"]["thresholds"]["green_max"] == 30, "DSO green_max should be 30"
        assert defaults["dso"]["thresholds"]["amber_max"] == 45, "DSO amber_max should be 45"
        assert defaults["dso"]["thresholds"]["is_higher_better"] == False, "DSO is_higher_better should be False"
        
        # Verify DPO defaults (higher is better)
        assert "dpo" in defaults, "DPO should be in defaults"
        assert defaults["dpo"]["thresholds"]["green_min"] == 30, "DPO green_min should be 30"
        assert defaults["dpo"]["thresholds"]["amber_min"] == 20, "DPO amber_min should be 20"
        assert defaults["dpo"]["thresholds"]["is_higher_better"] == True, "DPO is_higher_better should be True"
        
        # Verify Cash Runway defaults
        assert "cash_runway" in defaults, "cash_runway should be in defaults"
        assert defaults["cash_runway"]["thresholds"]["green_min"] == 180, "Cash runway green_min should be 180"
        assert defaults["cash_runway"]["thresholds"]["amber_min"] == 90, "Cash runway amber_min should be 90"
        
        # Verify EBITDA Margin defaults
        assert "ebitda_margin" in defaults, "ebitda_margin should be in defaults"
        assert defaults["ebitda_margin"]["thresholds"]["green_min"] == 20, "EBITDA margin green_min should be 20"
        assert defaults["ebitda_margin"]["thresholds"]["amber_min"] == 10, "EBITDA margin amber_min should be 10"
        
        # Verify Quick Ratio defaults
        assert "quick_ratio" in defaults, "quick_ratio should be in defaults"
        assert defaults["quick_ratio"]["thresholds"]["green_min"] == 1.5, "Quick ratio green_min should be 1.5"
        assert defaults["quick_ratio"]["thresholds"]["amber_min"] == 1.0, "Quick ratio amber_min should be 1.0"
        
        # Verify Revenue Growth defaults
        assert "revenue_growth" in defaults, "revenue_growth should be in defaults"
        assert defaults["revenue_growth"]["thresholds"]["green_min"] == 15, "Revenue growth green_min should be 15"
        assert defaults["revenue_growth"]["thresholds"]["amber_min"] == 5, "Revenue growth amber_min should be 5"
        
        print("✓ RAG defaults endpoint returns correct default thresholds")
    
    # ==================== RAG POLICY GET TESTS ====================
    
    def test_get_company_rag_policy_defaults(self):
        """Test GET /api/rag-policies/{company_id} - returns defaults when no custom policy"""
        company_id = self.company["id"]
        
        response = self.session.get(f"{BASE_URL}/api/rag-policies/{company_id}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "company_id" in data, "Response should contain company_id"
        assert data["company_id"] == company_id, "Company ID should match"
        assert "metrics" in data, "Response should contain metrics"
        assert "is_default" in data, "Response should indicate if using defaults"
        
        print(f"✓ Company RAG policy endpoint returns data (is_default: {data.get('is_default')})")
    
    # ==================== RAG EVALUATE TESTS ====================
    
    def test_evaluate_dso_green(self):
        """Test DSO evaluation - value within green threshold"""
        company_id = self.company["id"]
        
        # DSO of 25 should be green (green_max=30)
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "dso": 25
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "evaluations" in data, "Response should contain evaluations"
        assert "dso" in data["evaluations"], "DSO should be in evaluations"
        assert data["evaluations"]["dso"]["status"] == "green", f"DSO 25 should be green, got {data['evaluations']['dso']['status']}"
        
        print("✓ DSO evaluation returns GREEN for value 25 (threshold: ≤30)")
    
    def test_evaluate_dso_amber(self):
        """Test DSO evaluation - value within amber threshold"""
        company_id = self.company["id"]
        
        # DSO of 35 should be amber (green_max=30, amber_max=45)
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "dso": 35
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["evaluations"]["dso"]["status"] == "amber", f"DSO 35 should be amber, got {data['evaluations']['dso']['status']}"
        
        print("✓ DSO evaluation returns AMBER for value 35 (threshold: ≤45)")
    
    def test_evaluate_dso_red(self):
        """Test DSO evaluation - value above amber threshold"""
        company_id = self.company["id"]
        
        # DSO of 50 should be red (above amber_max=45)
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "dso": 50
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["evaluations"]["dso"]["status"] == "red", f"DSO 50 should be red, got {data['evaluations']['dso']['status']}"
        
        print("✓ DSO evaluation returns RED for value 50 (threshold: >45)")
    
    def test_evaluate_dpo_green(self):
        """Test DPO evaluation - value above green threshold (higher is better)"""
        company_id = self.company["id"]
        
        # DPO of 35 should be green (green_min=30)
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "dpo": 35
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["evaluations"]["dpo"]["status"] == "green", f"DPO 35 should be green, got {data['evaluations']['dpo']['status']}"
        
        print("✓ DPO evaluation returns GREEN for value 35 (threshold: ≥30)")
    
    def test_evaluate_dpo_amber(self):
        """Test DPO evaluation - value within amber threshold"""
        company_id = self.company["id"]
        
        # DPO of 25 should be amber (amber_min=20, green_min=30)
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "dpo": 25
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["evaluations"]["dpo"]["status"] == "amber", f"DPO 25 should be amber, got {data['evaluations']['dpo']['status']}"
        
        print("✓ DPO evaluation returns AMBER for value 25 (threshold: ≥20)")
    
    def test_evaluate_dpo_red(self):
        """Test DPO evaluation - value below amber threshold"""
        company_id = self.company["id"]
        
        # DPO of 15 should be red (below amber_min=20)
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "dpo": 15
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["evaluations"]["dpo"]["status"] == "red", f"DPO 15 should be red, got {data['evaluations']['dpo']['status']}"
        
        print("✓ DPO evaluation returns RED for value 15 (threshold: <20)")
    
    def test_evaluate_cash_runway_green(self):
        """Test Cash Runway evaluation - value above green threshold"""
        company_id = self.company["id"]
        
        # Cash runway of 200 days should be green (green_min=180)
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "cash_runway": 200
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["evaluations"]["cash_runway"]["status"] == "green", f"Cash runway 200 should be green, got {data['evaluations']['cash_runway']['status']}"
        
        print("✓ Cash Runway evaluation returns GREEN for value 200 (threshold: ≥180)")
    
    def test_evaluate_cash_runway_amber(self):
        """Test Cash Runway evaluation - value within amber threshold"""
        company_id = self.company["id"]
        
        # Cash runway of 120 days should be amber (amber_min=90, green_min=180)
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "cash_runway": 120
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["evaluations"]["cash_runway"]["status"] == "amber", f"Cash runway 120 should be amber, got {data['evaluations']['cash_runway']['status']}"
        
        print("✓ Cash Runway evaluation returns AMBER for value 120 (threshold: ≥90)")
    
    def test_evaluate_cash_runway_red(self):
        """Test Cash Runway evaluation - value below amber threshold"""
        company_id = self.company["id"]
        
        # Cash runway of 60 days should be red (below amber_min=90)
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "cash_runway": 60
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["evaluations"]["cash_runway"]["status"] == "red", f"Cash runway 60 should be red, got {data['evaluations']['cash_runway']['status']}"
        
        print("✓ Cash Runway evaluation returns RED for value 60 (threshold: <90)")
    
    def test_evaluate_ebitda_margin_green(self):
        """Test EBITDA Margin evaluation - value above green threshold"""
        company_id = self.company["id"]
        
        # EBITDA margin of 25% should be green (green_min=20)
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "ebitda_margin": 25
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["evaluations"]["ebitda_margin"]["status"] == "green", f"EBITDA margin 25 should be green, got {data['evaluations']['ebitda_margin']['status']}"
        
        print("✓ EBITDA Margin evaluation returns GREEN for value 25% (threshold: ≥20%)")
    
    def test_evaluate_quick_ratio_green(self):
        """Test Quick Ratio evaluation - value above green threshold"""
        company_id = self.company["id"]
        
        # Quick ratio of 1.8 should be green (green_min=1.5)
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "quick_ratio": 1.8
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["evaluations"]["quick_ratio"]["status"] == "green", f"Quick ratio 1.8 should be green, got {data['evaluations']['quick_ratio']['status']}"
        
        print("✓ Quick Ratio evaluation returns GREEN for value 1.8 (threshold: ≥1.5)")
    
    def test_evaluate_revenue_growth_green(self):
        """Test Revenue Growth evaluation - value above green threshold"""
        company_id = self.company["id"]
        
        # Revenue growth of 18.5% should be green (green_min=15)
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "revenue_growth": 18.5
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["evaluations"]["revenue_growth"]["status"] == "green", f"Revenue growth 18.5 should be green, got {data['evaluations']['revenue_growth']['status']}"
        
        print("✓ Revenue Growth evaluation returns GREEN for value 18.5% (threshold: ≥15%)")
    
    def test_evaluate_multiple_metrics(self):
        """Test evaluating multiple metrics at once"""
        company_id = self.company["id"]
        
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "dso": 45,  # Should be amber (green_max=30, amber_max=45)
            "dpo": 38,  # Should be green (green_min=30)
            "cash_runway": 145,  # Should be amber (amber_min=90, green_min=180)
            "ebitda_margin": 25,  # Should be green (green_min=20)
            "quick_ratio": 1.8,  # Should be green (green_min=1.5)
            "revenue_growth": 18.5  # Should be green (green_min=15)
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        evaluations = data["evaluations"]
        
        # Verify all metrics are evaluated
        assert len(evaluations) == 6, f"Expected 6 evaluations, got {len(evaluations)}"
        
        # Verify each metric has status and thresholds
        for metric_id, evaluation in evaluations.items():
            assert "status" in evaluation, f"{metric_id} should have status"
            assert "value" in evaluation, f"{metric_id} should have value"
            assert "thresholds" in evaluation, f"{metric_id} should have thresholds"
            assert evaluation["status"] in ["green", "amber", "red"], f"{metric_id} status should be green/amber/red"
        
        # Verify specific statuses
        assert evaluations["dso"]["status"] == "amber", f"DSO 45 should be amber"
        assert evaluations["dpo"]["status"] == "green", f"DPO 38 should be green"
        assert evaluations["cash_runway"]["status"] == "amber", f"Cash runway 145 should be amber"
        assert evaluations["ebitda_margin"]["status"] == "green", f"EBITDA margin 25 should be green"
        assert evaluations["quick_ratio"]["status"] == "green", f"Quick ratio 1.8 should be green"
        assert evaluations["revenue_growth"]["status"] == "green", f"Revenue growth 18.5 should be green"
        
        print("✓ Multiple metrics evaluation returns correct statuses for all metrics")
    
    def test_evaluate_unknown_metric(self):
        """Test evaluating an unknown metric returns 'unknown' status"""
        company_id = self.company["id"]
        
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "unknown_metric": 100
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["evaluations"]["unknown_metric"]["status"] == "unknown", "Unknown metric should return 'unknown' status"
        
        print("✓ Unknown metric evaluation returns 'unknown' status")
    
    # ==================== RAG POLICY CRUD TESTS ====================
    
    def test_create_custom_rag_policy(self):
        """Test creating a custom RAG policy for a company"""
        company_id = self.company["id"]
        
        # Create custom policy with different thresholds
        custom_metrics = {
            "dso": {
                "metric_name": "Days Sales Outstanding (DSO)",
                "thresholds": {
                    "green_max": 45,  # More lenient than default 30
                    "amber_max": 60,  # More lenient than default 45
                    "is_higher_better": False
                },
                "enabled": True
            }
        }
        
        response = self.session.put(f"{BASE_URL}/api/rag-policies/{company_id}", json={
            "metrics": custom_metrics
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the custom policy is applied
        get_response = self.session.get(f"{BASE_URL}/api/rag-policies/{company_id}")
        assert get_response.status_code == 200
        
        policy_data = get_response.json()
        assert policy_data.get("is_default") == False, "Policy should not be default after customization"
        
        print("✓ Custom RAG policy created successfully")
    
    def test_evaluate_with_custom_policy(self):
        """Test that evaluation uses custom policy thresholds"""
        company_id = self.company["id"]
        
        # First set custom policy with lenient DSO thresholds
        custom_metrics = {
            "dso": {
                "metric_name": "Days Sales Outstanding (DSO)",
                "thresholds": {
                    "green_max": 45,  # More lenient than default 30
                    "amber_max": 60,  # More lenient than default 45
                    "is_higher_better": False
                },
                "enabled": True
            }
        }
        
        self.session.put(f"{BASE_URL}/api/rag-policies/{company_id}", json={
            "metrics": custom_metrics
        })
        
        # Now evaluate DSO of 40 - should be green with custom policy (but amber with defaults)
        response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "dso": 40
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # With custom policy (green_max=45), DSO 40 should be green
        assert data["evaluations"]["dso"]["status"] == "green", f"DSO 40 should be green with custom policy, got {data['evaluations']['dso']['status']}"
        
        print("✓ Evaluation correctly uses custom policy thresholds")
    
    def test_delete_custom_policy_reverts_to_defaults(self):
        """Test that deleting custom policy reverts to defaults"""
        company_id = self.company["id"]
        
        # Delete custom policy
        delete_response = self.session.delete(f"{BASE_URL}/api/rag-policies/{company_id}")
        # May return 200 or 404 if no policy exists
        assert delete_response.status_code in [200, 404], f"Expected 200 or 404, got {delete_response.status_code}"
        
        # Verify policy is now default
        get_response = self.session.get(f"{BASE_URL}/api/rag-policies/{company_id}")
        assert get_response.status_code == 200
        
        policy_data = get_response.json()
        assert policy_data.get("is_default") == True, "Policy should be default after deletion"
        
        # Evaluate DSO of 40 - should now be amber with default policy (green_max=30)
        eval_response = self.session.post(f"{BASE_URL}/api/rag-policies/{company_id}/evaluate", json={
            "dso": 40
        })
        
        assert eval_response.status_code == 200
        eval_data = eval_response.json()
        assert eval_data["evaluations"]["dso"]["status"] == "amber", f"DSO 40 should be amber with default policy, got {eval_data['evaluations']['dso']['status']}"
        
        print("✓ Deleting custom policy correctly reverts to default thresholds")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
