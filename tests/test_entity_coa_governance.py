"""
Test Suite for Core Consolidation & Data Integrity Features
- Story 1: Entity Tree Management (130+ entities, holdco/subsidiary types)
- Story 2: COA Mapping (local codes to group schema translation)
- Story 3: Data Governance (alerts, health indicators, required categories)
- Adjustment Journals CRUD
- ERP Providers list
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "Test123!"

class TestAuth:
    """Authentication tests"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("token")
        # Try to register if login fails
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
        return {"Authorization": f"Bearer {auth_token}", "Content-Type": "application/json"}


class TestEntityTreeManagement(TestAuth):
    """Story 1: Entity Tree Management Tests"""
    
    def test_get_entity_tree_nodes(self, auth_headers):
        """Test GET /api/entity-tree/nodes"""
        response = requests.get(f"{BASE_URL}/api/entity-tree/nodes", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/entity-tree/nodes - Found {len(data)} entities")
    
    def test_get_entity_hierarchy(self, auth_headers):
        """Test GET /api/entity-tree/hierarchy"""
        response = requests.get(f"{BASE_URL}/api/entity-tree/hierarchy", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "tree" in data
        assert "summary" in data
        assert "total_entities" in data["summary"]
        print(f"✓ GET /api/entity-tree/hierarchy - Total entities: {data['summary']['total_entities']}")
    
    def test_get_entity_statistics(self, auth_headers):
        """Test GET /api/entity-tree/statistics"""
        response = requests.get(f"{BASE_URL}/api/entity-tree/statistics", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_entities" in data
        assert "by_type" in data
        assert "by_currency" in data
        print(f"✓ GET /api/entity-tree/statistics - Stats retrieved")
    
    def test_create_holdco_entity(self, auth_headers):
        """Test creating a holdco entity"""
        unique_code = f"TEST-HOLDCO-{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "name": "Test Holding Company",
            "entity_code": unique_code,
            "entity_type": "holdco",
            "country": "United Kingdom",
            "country_code": "GBR",
            "local_currency": "GBP",
            "reporting_currency": "USD",
            "segment": "Corporate",
            "region": "EMEA"
        }
        response = requests.post(f"{BASE_URL}/api/entity-tree/nodes", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "entity" in data
        assert data["entity"]["entity_type"] == "holdco"
        print(f"✓ POST /api/entity-tree/nodes - Created holdco: {unique_code}")
        return data["entity"]["id"]
    
    def test_create_subsidiary_entity(self, auth_headers):
        """Test creating a subsidiary entity"""
        # First create a holdco to be the parent
        holdco_code = f"TEST-PARENT-{uuid.uuid4().hex[:6].upper()}"
        holdco_payload = {
            "name": "Parent Holdco",
            "entity_code": holdco_code,
            "entity_type": "holdco",
            "country": "United Kingdom",
            "country_code": "GBR",
            "local_currency": "GBP",
            "reporting_currency": "USD"
        }
        holdco_response = requests.post(f"{BASE_URL}/api/entity-tree/nodes", json=holdco_payload, headers=auth_headers)
        assert holdco_response.status_code == 200
        holdco_id = holdco_response.json()["entity"]["id"]
        
        # Now create subsidiary
        sub_code = f"TEST-SUB-{uuid.uuid4().hex[:6].upper()}"
        sub_payload = {
            "name": "Test Subsidiary Ltd",
            "entity_code": sub_code,
            "entity_type": "subsidiary",
            "parent_entity_id": holdco_id,
            "ownership_pct": 100.0,
            "country": "Germany",
            "country_code": "DEU",
            "local_currency": "EUR",
            "reporting_currency": "USD",
            "erp_provider": "sage"
        }
        response = requests.post(f"{BASE_URL}/api/entity-tree/nodes", json=sub_payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["entity"]["entity_type"] == "subsidiary"
        assert data["entity"]["parent_entity_id"] == holdco_id
        print(f"✓ POST /api/entity-tree/nodes - Created subsidiary with parent: {sub_code}")
    
    def test_get_single_entity_node(self, auth_headers):
        """Test GET /api/entity-tree/nodes/{entity_id}"""
        # First get list of entities
        list_response = requests.get(f"{BASE_URL}/api/entity-tree/nodes", headers=auth_headers)
        entities = list_response.json()
        if not entities:
            pytest.skip("No entities to test")
        
        entity_id = entities[0]["id"]
        response = requests.get(f"{BASE_URL}/api/entity-tree/nodes/{entity_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == entity_id
        assert "children" in data
        print(f"✓ GET /api/entity-tree/nodes/{entity_id} - Entity retrieved")
    
    def test_update_entity_node(self, auth_headers):
        """Test PUT /api/entity-tree/nodes/{entity_id}"""
        # Create entity first
        unique_code = f"TEST-UPDATE-{uuid.uuid4().hex[:6].upper()}"
        create_payload = {
            "name": "Entity to Update",
            "entity_code": unique_code,
            "entity_type": "standalone",
            "country": "France",
            "local_currency": "EUR"
        }
        create_response = requests.post(f"{BASE_URL}/api/entity-tree/nodes", json=create_payload, headers=auth_headers)
        entity_id = create_response.json()["entity"]["id"]
        
        # Update entity
        update_payload = {
            "name": "Updated Entity Name",
            "segment": "Retail"
        }
        response = requests.put(f"{BASE_URL}/api/entity-tree/nodes/{entity_id}", json=update_payload, headers=auth_headers)
        assert response.status_code == 200
        print(f"✓ PUT /api/entity-tree/nodes/{entity_id} - Entity updated")
    
    def test_duplicate_entity_code_rejected(self, auth_headers):
        """Test that duplicate entity codes are rejected"""
        unique_code = f"TEST-DUP-{uuid.uuid4().hex[:6].upper()}"
        payload = {
            "name": "First Entity",
            "entity_code": unique_code,
            "entity_type": "standalone"
        }
        # Create first entity
        requests.post(f"{BASE_URL}/api/entity-tree/nodes", json=payload, headers=auth_headers)
        
        # Try to create duplicate
        payload["name"] = "Duplicate Entity"
        response = requests.post(f"{BASE_URL}/api/entity-tree/nodes", json=payload, headers=auth_headers)
        assert response.status_code == 400
        print(f"✓ Duplicate entity code correctly rejected")


class TestCOAMapping(TestAuth):
    """Story 2: COA Mapping Tests"""
    
    def test_get_group_schema(self, auth_headers):
        """Test GET /api/coa/group-schema"""
        response = requests.get(f"{BASE_URL}/api/coa/group-schema", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert "required_categories" in data
        assert "optional_categories" in data
        assert "GROUP_REVENUE" in data["categories"]
        assert "GROUP_EBITDA" in data["categories"]
        print(f"✓ GET /api/coa/group-schema - {len(data['categories'])} categories")
    
    def test_get_erp_default_mappings_sage(self, auth_headers):
        """Test GET /api/coa/erp-defaults/sage"""
        response = requests.get(f"{BASE_URL}/api/coa/erp-defaults/sage", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "sage"
        assert "mappings" in data
        assert len(data["mappings"]) > 0
        print(f"✓ GET /api/coa/erp-defaults/sage - {data['mapped_count']} mappings")
    
    def test_get_erp_default_mappings_netsuite(self, auth_headers):
        """Test GET /api/coa/erp-defaults/netsuite"""
        response = requests.get(f"{BASE_URL}/api/coa/erp-defaults/netsuite", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "netsuite"
        print(f"✓ GET /api/coa/erp-defaults/netsuite - {data['mapped_count']} mappings")
    
    def test_create_coa_mapping(self, auth_headers):
        """Test POST /api/coa/mappings"""
        # First create an entity
        unique_code = f"TEST-COA-{uuid.uuid4().hex[:6].upper()}"
        entity_payload = {
            "name": "COA Test Entity",
            "entity_code": unique_code,
            "entity_type": "subsidiary",
            "erp_provider": "sage"
        }
        entity_response = requests.post(f"{BASE_URL}/api/entity-tree/nodes", json=entity_payload, headers=auth_headers)
        entity_id = entity_response.json()["entity"]["id"]
        
        # Create COA mapping
        mapping_payload = {
            "entity_id": entity_id,
            "erp_provider": "sage",
            "mappings": [
                {"local_account_code": "4000", "local_account_name": "Sales Revenue", "group_category": "GROUP_REVENUE"},
                {"local_account_code": "5000", "local_account_name": "Cost of Sales", "group_category": "GROUP_COGS"},
                {"local_account_code": "6000", "local_account_name": "Operating Expenses", "group_category": "GROUP_OPEX"}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/coa/mappings", json=mapping_payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "completion_pct" in data
        print(f"✓ POST /api/coa/mappings - Completion: {data['completion_pct']}%")
    
    def test_get_entity_coa_mapping(self, auth_headers):
        """Test GET /api/coa/mappings/{entity_id}"""
        # Get entities
        entities_response = requests.get(f"{BASE_URL}/api/entity-tree/nodes", headers=auth_headers)
        entities = entities_response.json()
        if not entities:
            pytest.skip("No entities to test")
        
        entity_id = entities[0]["id"]
        response = requests.get(f"{BASE_URL}/api/coa/mappings/{entity_id}", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "entity_id" in data
        assert "mappings" in data
        print(f"✓ GET /api/coa/mappings/{entity_id} - Mapping retrieved")
    
    def test_apply_default_coa_mappings(self, auth_headers):
        """Test POST /api/coa/mappings/{entity_id}/apply-defaults"""
        # Create entity with ERP provider
        unique_code = f"TEST-DEFAULTS-{uuid.uuid4().hex[:6].upper()}"
        entity_payload = {
            "name": "Default Mapping Test",
            "entity_code": unique_code,
            "entity_type": "subsidiary",
            "erp_provider": "netsuite"
        }
        entity_response = requests.post(f"{BASE_URL}/api/entity-tree/nodes", json=entity_payload, headers=auth_headers)
        entity_id = entity_response.json()["entity"]["id"]
        
        # Apply defaults
        response = requests.post(f"{BASE_URL}/api/coa/mappings/{entity_id}/apply-defaults", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == "netsuite"
        assert data["mappings_count"] > 0
        print(f"✓ POST /api/coa/mappings/{entity_id}/apply-defaults - Applied {data['mappings_count']} mappings")


class TestDataGovernance(TestAuth):
    """Story 3: Data Governance Tests"""
    
    def test_get_data_health_overview(self, auth_headers):
        """Test GET /api/data-governance/health"""
        response = requests.get(f"{BASE_URL}/api/data-governance/health", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "overall_health_pct" in data
        assert "total_entities" in data
        assert "entities_complete" in data
        assert "entities_partial" in data
        assert "entities_incomplete" in data
        assert "can_consolidate" in data
        print(f"✓ GET /api/data-governance/health - Health: {data['overall_health_pct']}%")
    
    def test_get_data_governance_alerts(self, auth_headers):
        """Test GET /api/data-governance/alerts"""
        response = requests.get(f"{BASE_URL}/api/data-governance/alerts", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "alerts" in data
        assert "total_count" in data
        assert "high_severity" in data
        assert "medium_severity" in data
        print(f"✓ GET /api/data-governance/alerts - {data['total_count']} alerts")
    
    def test_get_required_categories(self, auth_headers):
        """Test GET /api/data-governance/required-categories"""
        response = requests.get(f"{BASE_URL}/api/data-governance/required-categories", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "categories" in data
        assert "is_strict_mode" in data
        assert "available_categories" in data
        print(f"✓ GET /api/data-governance/required-categories - {len(data['categories'])} required")
    
    def test_set_required_categories(self, auth_headers):
        """Test POST /api/data-governance/required-categories"""
        payload = {
            "categories": ["GROUP_REVENUE", "GROUP_EBITDA", "GROUP_CASH", "GROUP_NET_INCOME"],
            "is_strict_mode": False
        }
        response = requests.post(f"{BASE_URL}/api/data-governance/required-categories", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["message"] == "Required categories updated"
        print(f"✓ POST /api/data-governance/required-categories - Config saved")


class TestAdjustmentJournals(TestAuth):
    """Adjustment Journals CRUD Tests"""
    
    def test_get_journal_types(self, auth_headers):
        """Test GET /api/adjustment-journals/types/list"""
        response = requests.get(f"{BASE_URL}/api/adjustment-journals/types/list", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "types" in data
        assert len(data["types"]) > 0
        type_values = [t["value"] for t in data["types"]]
        assert "manual_accrual" in type_values
        assert "intercompany_elim" in type_values
        print(f"✓ GET /api/adjustment-journals/types/list - {len(data['types'])} types")
    
    def test_create_adjustment_journal(self, auth_headers):
        """Test POST /api/adjustment-journals"""
        payload = {
            "journal_type": "manual_accrual",
            "period": "2025-01",
            "description": "Test accrual journal",
            "entries": [
                {"account_category": "GROUP_OPEX", "debit": 10000, "credit": 0, "description": "Accrued expense"},
                {"account_category": "GROUP_AP", "debit": 0, "credit": 10000, "description": "Accrued payable"}
            ]
        }
        response = requests.post(f"{BASE_URL}/api/adjustment-journals", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "journal" in data
        assert data["is_balanced"] == True
        print(f"✓ POST /api/adjustment-journals - Journal created, balanced: {data['is_balanced']}")
        return data["journal"]["id"]
    
    def test_get_adjustment_journals(self, auth_headers):
        """Test GET /api/adjustment-journals"""
        response = requests.get(f"{BASE_URL}/api/adjustment-journals", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/adjustment-journals - {len(data)} journals")
    
    def test_create_unbalanced_journal_warning(self, auth_headers):
        """Test that unbalanced journals return warning"""
        payload = {
            "journal_type": "custom",
            "period": "2025-01",
            "description": "Unbalanced test journal",
            "entries": [
                {"account_category": "GROUP_OPEX", "debit": 10000, "credit": 0},
                {"account_category": "GROUP_AP", "debit": 0, "credit": 5000}  # Unbalanced
            ]
        }
        response = requests.post(f"{BASE_URL}/api/adjustment-journals", json=payload, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["is_balanced"] == False
        assert data["warning"] is not None
        print(f"✓ Unbalanced journal warning returned correctly")


class TestERPProviders(TestAuth):
    """ERP Integration Tests"""
    
    def test_get_erp_providers(self, auth_headers):
        """Test GET /api/erp/providers"""
        response = requests.get(f"{BASE_URL}/api/erp/providers", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        provider_values = [p["value"] for p in data["providers"]]
        assert "sage" in provider_values
        assert "netsuite" in provider_values
        assert "quickbooks" in provider_values
        assert "xero" in provider_values
        print(f"✓ GET /api/erp/providers - {len(data['providers'])} providers")
    
    def test_get_erp_connections(self, auth_headers):
        """Test GET /api/erp/connections"""
        response = requests.get(f"{BASE_URL}/api/erp/connections", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/erp/connections - {len(data)} connections")


class TestConsolidationAggregation(TestAuth):
    """Consolidation with FX Conversion Tests"""
    
    def test_get_consolidation_groups(self, auth_headers):
        """Test GET /api/consolidation/groups"""
        response = requests.get(f"{BASE_URL}/api/consolidation/groups", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ GET /api/consolidation/groups - {len(data)} groups")
    
    def test_get_entity_summary(self, auth_headers):
        """Test GET /api/consolidation/entity-summary"""
        response = requests.get(f"{BASE_URL}/api/consolidation/entity-summary", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_entities" in data
        assert "by_currency" in data
        assert "entities" in data
        print(f"✓ GET /api/consolidation/entity-summary - {data['total_entities']} entities")


# Run tests
if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
