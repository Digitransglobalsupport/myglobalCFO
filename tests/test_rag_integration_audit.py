"""
RAG Integration Audit Tests
Tests RAG policy settings work for all KPIs across the application:
- CFO Command Center
- FP&A Command Center
- Entity KPIs Page
- Multi-Entity Consolidation Page
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "Test123!"


class TestRAGPolicyEndpoints:
    """Test RAG policy API endpoints"""
    
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
            self.user = login_response.json().get("user")
        else:
            # Try to register if login fails
            register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
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
                "name": "RAG Test Company",
                "country": "United Kingdom",
                "currency": "GBP"
            })
            if create_response.status_code == 200:
                self.company = create_response.json()
            else:
                pytest.skip("Could not create test company")
        
        yield
    
    def test_get_rag_policy_defaults(self):
        """Test GET /api/rag-policies/defaults returns default metrics"""
        response = self.session.get(f"{BASE_URL}/api/rag-policies/defaults")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify defaults structure
        assert "defaults" in data
        defaults = data["defaults"]
        
        # Check key metrics are present
        expected_metrics = ["dso", "dpo", "cash_runway", "ebitda_margin", "quick_ratio", "gross_margin"]
        for metric in expected_metrics:
            assert metric in defaults, f"Missing metric: {metric}"
        
        # Verify DSO threshold structure (is_higher_better = False)
        dso = defaults["dso"]
        assert "thresholds" in dso or "green_max" in dso
        
        print(f"✓ RAG defaults returned with {len(defaults)} metrics")
    
    def test_get_company_rag_policy(self):
        """Test GET /api/rag-policies/{company_id} returns policy or defaults"""
        company_id = self.company["id"]
        response = self.session.get(f"{BASE_URL}/api/rag-policies/{company_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        assert "company_id" in data
        assert "metrics" in data
        assert data["company_id"] == company_id
        
        # Check if is_default flag is present
        assert "is_default" in data
        
        print(f"✓ RAG policy for company {company_id} retrieved (is_default: {data.get('is_default')})")
    
    def test_evaluate_rag_metrics_dso(self):
        """Test POST /api/rag-policies/{company_id}/evaluate for DSO metric"""
        company_id = self.company["id"]
        
        # Test DSO evaluation (lower is better)
        # Default thresholds: green_max=30, amber_max=45
        test_cases = [
            {"dso": 25, "expected_status": "green"},   # Below green_max
            {"dso": 35, "expected_status": "amber"},   # Between green_max and amber_max
            {"dso": 50, "expected_status": "red"},     # Above amber_max
        ]
        
        for test in test_cases:
            response = self.session.post(
                f"{BASE_URL}/api/rag-policies/{company_id}/evaluate",
                json={"dso": test["dso"]}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert "evaluations" in data
            assert "dso" in data["evaluations"]
            
            dso_eval = data["evaluations"]["dso"]
            assert "status" in dso_eval
            assert "value" in dso_eval
            assert dso_eval["value"] == test["dso"]
            
            # Verify status matches expected
            assert dso_eval["status"] == test["expected_status"], \
                f"DSO {test['dso']}: expected {test['expected_status']}, got {dso_eval['status']}"
            
            print(f"✓ DSO {test['dso']} days → {dso_eval['status']}")
    
    def test_evaluate_rag_metrics_dpo(self):
        """Test POST /api/rag-policies/{company_id}/evaluate for DPO metric"""
        company_id = self.company["id"]
        
        # Test DPO evaluation (higher is better)
        # Default thresholds: green_min=30, amber_min=20
        test_cases = [
            {"dpo": 35, "expected_status": "green"},   # Above green_min
            {"dpo": 25, "expected_status": "amber"},   # Between amber_min and green_min
            {"dpo": 15, "expected_status": "red"},     # Below amber_min
        ]
        
        for test in test_cases:
            response = self.session.post(
                f"{BASE_URL}/api/rag-policies/{company_id}/evaluate",
                json={"dpo": test["dpo"]}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            dpo_eval = data["evaluations"]["dpo"]
            assert dpo_eval["status"] == test["expected_status"], \
                f"DPO {test['dpo']}: expected {test['expected_status']}, got {dpo_eval['status']}"
            
            print(f"✓ DPO {test['dpo']} days → {dpo_eval['status']}")
    
    def test_evaluate_rag_metrics_quick_ratio(self):
        """Test POST /api/rag-policies/{company_id}/evaluate for Quick Ratio"""
        company_id = self.company["id"]
        
        # Test Quick Ratio evaluation (higher is better)
        # Default thresholds: green_min=1.5, amber_min=1.0
        test_cases = [
            {"quick_ratio": 1.8, "expected_status": "green"},   # Above green_min
            {"quick_ratio": 1.2, "expected_status": "amber"},   # Between amber_min and green_min
            {"quick_ratio": 0.8, "expected_status": "red"},     # Below amber_min
        ]
        
        for test in test_cases:
            response = self.session.post(
                f"{BASE_URL}/api/rag-policies/{company_id}/evaluate",
                json={"quick_ratio": test["quick_ratio"]}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            qr_eval = data["evaluations"]["quick_ratio"]
            assert qr_eval["status"] == test["expected_status"], \
                f"Quick Ratio {test['quick_ratio']}: expected {test['expected_status']}, got {qr_eval['status']}"
            
            print(f"✓ Quick Ratio {test['quick_ratio']} → {qr_eval['status']}")
    
    def test_evaluate_rag_metrics_cash_runway(self):
        """Test POST /api/rag-policies/{company_id}/evaluate for Cash Runway"""
        company_id = self.company["id"]
        
        # Test Cash Runway evaluation (higher is better)
        # Default thresholds: green_min=180, amber_min=90
        test_cases = [
            {"cash_runway": 200, "expected_status": "green"},   # Above green_min
            {"cash_runway": 120, "expected_status": "amber"},   # Between amber_min and green_min
            {"cash_runway": 60, "expected_status": "red"},      # Below amber_min
        ]
        
        for test in test_cases:
            response = self.session.post(
                f"{BASE_URL}/api/rag-policies/{company_id}/evaluate",
                json={"cash_runway": test["cash_runway"]}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            cr_eval = data["evaluations"]["cash_runway"]
            assert cr_eval["status"] == test["expected_status"], \
                f"Cash Runway {test['cash_runway']}: expected {test['expected_status']}, got {cr_eval['status']}"
            
            print(f"✓ Cash Runway {test['cash_runway']} days → {cr_eval['status']}")
    
    def test_evaluate_rag_metrics_gross_margin(self):
        """Test POST /api/rag-policies/{company_id}/evaluate for Gross Margin"""
        company_id = self.company["id"]
        
        # Test Gross Margin evaluation (higher is better)
        # Default thresholds: green_min=60, amber_min=40
        test_cases = [
            {"gross_margin": 68, "expected_status": "green"},   # Above green_min
            {"gross_margin": 50, "expected_status": "amber"},   # Between amber_min and green_min
            {"gross_margin": 30, "expected_status": "red"},     # Below amber_min
        ]
        
        for test in test_cases:
            response = self.session.post(
                f"{BASE_URL}/api/rag-policies/{company_id}/evaluate",
                json={"gross_margin": test["gross_margin"]}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            gm_eval = data["evaluations"]["gross_margin"]
            assert gm_eval["status"] == test["expected_status"], \
                f"Gross Margin {test['gross_margin']}%: expected {test['expected_status']}, got {gm_eval['status']}"
            
            print(f"✓ Gross Margin {test['gross_margin']}% → {gm_eval['status']}")
    
    def test_evaluate_multiple_metrics_at_once(self):
        """Test evaluating multiple metrics in a single request"""
        company_id = self.company["id"]
        
        # Evaluate multiple metrics at once (simulating CFO Command Center)
        metrics_to_evaluate = {
            "dso": 45,
            "dpo": 38,
            "cash_runway": 145,
            "ebitda_margin": 25,
            "quick_ratio": 1.8,
            "revenue_growth": 18.5,
            "gross_margin": 68
        }
        
        response = self.session.post(
            f"{BASE_URL}/api/rag-policies/{company_id}/evaluate",
            json=metrics_to_evaluate
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "evaluations" in data
        evaluations = data["evaluations"]
        
        # Verify all metrics were evaluated
        for metric_id in metrics_to_evaluate.keys():
            assert metric_id in evaluations, f"Missing evaluation for {metric_id}"
            assert "status" in evaluations[metric_id]
            assert "value" in evaluations[metric_id]
            assert evaluations[metric_id]["value"] == metrics_to_evaluate[metric_id]
        
        print(f"✓ Batch evaluation returned {len(evaluations)} metric evaluations")
        for metric_id, eval_data in evaluations.items():
            print(f"  - {metric_id}: {eval_data['value']} → {eval_data['status']}")
    
    def test_evaluate_returns_thresholds(self):
        """Test that evaluation response includes threshold information"""
        company_id = self.company["id"]
        
        response = self.session.post(
            f"{BASE_URL}/api/rag-policies/{company_id}/evaluate",
            json={"dso": 45}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        dso_eval = data["evaluations"]["dso"]
        
        # Verify thresholds are included in response
        assert "thresholds" in dso_eval, "Thresholds should be included in evaluation response"
        
        thresholds = dso_eval["thresholds"]
        assert "is_higher_better" in thresholds
        assert thresholds["is_higher_better"] == False  # DSO: lower is better
        
        print(f"✓ Evaluation includes thresholds: {thresholds}")


class TestRAGPolicyCustomization:
    """Test custom RAG policy creation and updates"""
    
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
            pytest.skip("Could not authenticate")
        
        # Get test company
        companies_response = self.session.get(f"{BASE_URL}/api/companies")
        if companies_response.status_code == 200 and len(companies_response.json()) > 0:
            self.company = companies_response.json()[0]
        else:
            pytest.skip("No test company available")
        
        yield
        
        # Cleanup: Delete custom policy to reset to defaults
        self.session.delete(f"{BASE_URL}/api/rag-policies/{self.company['id']}")
    
    def test_create_custom_rag_policy(self):
        """Test creating a custom RAG policy with modified thresholds"""
        company_id = self.company["id"]
        
        # Create custom policy with stricter DSO threshold
        custom_metrics = {
            "dso": {
                "metric_id": "dso",
                "metric_name": "Days Sales Outstanding (DSO)",
                "thresholds": {
                    "green_max": 25,  # Stricter than default 30
                    "amber_max": 35,  # Stricter than default 45
                    "is_higher_better": False
                },
                "enabled": True
            }
        }
        
        response = self.session.post(f"{BASE_URL}/api/rag-policies", json={
            "company_id": company_id,
            "metrics": custom_metrics
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "id" in data or "message" in data
        
        print(f"✓ Custom RAG policy created/updated")
        
        # Verify custom thresholds are applied
        eval_response = self.session.post(
            f"{BASE_URL}/api/rag-policies/{company_id}/evaluate",
            json={"dso": 28}  # Would be green with defaults, amber with custom
        )
        
        assert eval_response.status_code == 200
        eval_data = eval_response.json()
        
        # With custom thresholds (green_max=25), DSO of 28 should be amber
        dso_status = eval_data["evaluations"]["dso"]["status"]
        assert dso_status == "amber", f"Expected amber with custom thresholds, got {dso_status}"
        
        print(f"✓ Custom thresholds applied: DSO 28 → {dso_status}")
    
    def test_update_rag_policy(self):
        """Test updating an existing RAG policy"""
        company_id = self.company["id"]
        
        # Update policy with new thresholds
        updated_metrics = {
            "quick_ratio": {
                "metric_id": "quick_ratio",
                "metric_name": "Quick Ratio",
                "thresholds": {
                    "green_min": 2.0,  # Stricter than default 1.5
                    "amber_min": 1.5,  # Stricter than default 1.0
                    "is_higher_better": True
                },
                "enabled": True
            }
        }
        
        response = self.session.put(
            f"{BASE_URL}/api/rag-policies/{company_id}",
            json={"metrics": updated_metrics}
        )
        
        assert response.status_code == 200
        
        print(f"✓ RAG policy updated")
    
    def test_delete_rag_policy_resets_to_defaults(self):
        """Test that deleting a policy reverts to defaults"""
        company_id = self.company["id"]
        
        # First create a custom policy
        self.session.post(f"{BASE_URL}/api/rag-policies", json={
            "company_id": company_id,
            "metrics": {
                "dso": {
                    "metric_id": "dso",
                    "metric_name": "DSO",
                    "thresholds": {"green_max": 20, "amber_max": 30, "is_higher_better": False},
                    "enabled": True
                }
            }
        })
        
        # Delete the policy
        delete_response = self.session.delete(f"{BASE_URL}/api/rag-policies/{company_id}")
        assert delete_response.status_code == 200
        
        # Verify policy returns defaults
        get_response = self.session.get(f"{BASE_URL}/api/rag-policies/{company_id}")
        assert get_response.status_code == 200
        
        data = get_response.json()
        assert data.get("is_default") == True
        
        print(f"✓ Policy deleted, reverted to defaults")


class TestDashboardEndpoints:
    """Test dashboard endpoints that use RAG evaluations"""
    
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
            pytest.skip("Could not authenticate")
        
        # Get test company
        companies_response = self.session.get(f"{BASE_URL}/api/companies")
        if companies_response.status_code == 200 and len(companies_response.json()) > 0:
            self.company = companies_response.json()[0]
        else:
            pytest.skip("No test company available")
        
        yield
    
    def test_dashboard_metrics_endpoint(self):
        """Test GET /api/dashboard/{company_id} returns metrics for RAG evaluation"""
        company_id = self.company["id"]
        
        response = self.session.get(f"{BASE_URL}/api/dashboard/{company_id}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify metrics that can be used for RAG evaluation are present
        expected_fields = ["runway_days", "quick_ratio", "revenue_growth", "ebitda_margin"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Dashboard metrics returned for RAG evaluation")
        print(f"  - runway_days: {data.get('runway_days')}")
        print(f"  - quick_ratio: {data.get('quick_ratio')}")
        print(f"  - revenue_growth: {data.get('revenue_growth')}")
        print(f"  - ebitda_margin: {data.get('ebitda_margin')}")
    
    def test_group_summary_endpoint(self):
        """Test GET /api/dashboard/group/summary returns group metrics"""
        response = self.session.get(f"{BASE_URL}/api/dashboard/group/summary")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify group summary fields
        expected_fields = ["total_revenue", "total_ebitda", "group_margin", "total_cash", "entity_count"]
        for field in expected_fields:
            assert field in data, f"Missing field: {field}"
        
        print(f"✓ Group summary returned")
        print(f"  - total_revenue: {data.get('total_revenue')}")
        print(f"  - group_margin: {data.get('group_margin')}%")
        print(f"  - entity_count: {data.get('entity_count')}")


class TestMultiEntityRAGEvaluation:
    """Test RAG evaluation across multiple entities"""
    
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
            pytest.skip("Could not authenticate")
        
        # Get all companies
        companies_response = self.session.get(f"{BASE_URL}/api/companies")
        if companies_response.status_code == 200:
            self.companies = companies_response.json()
        else:
            self.companies = []
        
        yield
    
    def test_evaluate_rag_for_multiple_entities(self):
        """Test RAG evaluation works for multiple entities (Entity KPIs Page scenario)"""
        if len(self.companies) == 0:
            pytest.skip("No companies available for multi-entity test")
        
        results = {}
        
        for company in self.companies[:3]:  # Test up to 3 companies
            company_id = company["id"]
            
            # Simulate metrics for each entity
            metrics = {
                "ebitda_margin": 22 + len(results) * 3,
                "revenue_growth": 15 + len(results) * 5,
                "quick_ratio": 1.8 + len(results) * 0.2,
                "cash_runway": 145 + len(results) * 30
            }
            
            response = self.session.post(
                f"{BASE_URL}/api/rag-policies/{company_id}/evaluate",
                json=metrics
            )
            
            assert response.status_code == 200
            data = response.json()
            
            results[company_id] = {
                "company_name": company.get("name"),
                "evaluations": data.get("evaluations", {})
            }
        
        print(f"✓ RAG evaluation completed for {len(results)} entities")
        for company_id, result in results.items():
            print(f"  - {result['company_name']}:")
            for metric, eval_data in result['evaluations'].items():
                print(f"    • {metric}: {eval_data.get('value')} → {eval_data.get('status')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
