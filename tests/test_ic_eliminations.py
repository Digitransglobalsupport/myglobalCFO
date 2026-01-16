"""
Test Suite for Inter-Company (IC) Eliminations Feature
Tests IC Transaction CRUD, Auto-Matching, Manual Matching, Unmatching, 
Elimination Rules, Run Eliminations, and Statistics APIs
"""
import pytest
import requests
import os
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "Test123!"


class TestICEliminationsFeature:
    """Test suite for IC Eliminations feature"""
    
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
        """Get headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    @pytest.fixture(scope="class")
    def entities(self, auth_headers):
        """Get or create test entities"""
        # Get existing entities
        response = requests.get(f"{BASE_URL}/api/companies", headers=auth_headers)
        if response.status_code == 200 and len(response.json()) >= 2:
            return response.json()[:2]
        
        # Create test entities if needed
        entities = []
        for i, (name, currency) in enumerate([("TEST_UK_Entity", "GBP"), ("TEST_US_Entity", "USD")]):
            response = requests.post(f"{BASE_URL}/api/companies", headers=auth_headers, json={
                "name": name,
                "country": "United Kingdom" if i == 0 else "United States",
                "currency": currency
            })
            if response.status_code == 200:
                entities.append(response.json())
        
        if len(entities) < 2:
            pytest.skip("Could not create test entities")
        return entities
    
    # ==================== IC TRANSACTION CRUD TESTS ====================
    
    def test_create_ic_transaction_sale(self, auth_headers, entities):
        """Test creating an IC sale transaction"""
        tx_data = {
            "source_entity_id": entities[0]["id"],
            "counterparty_entity_id": entities[1]["id"],
            "transaction_type": "sale",
            "description": "TEST_IC Sale - Services",
            "amount": 50000.00,
            "currency": "USD",
            "transaction_date": datetime.now().isoformat(),
            "reference": "TEST-INV-001"
        }
        
        response = requests.post(f"{BASE_URL}/api/ic-transactions", headers=auth_headers, json=tx_data)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["source_entity_id"] == entities[0]["id"]
        assert data["counterparty_entity_id"] == entities[1]["id"]
        assert data["transaction_type"] == "sale"
        assert data["amount"] == 50000.00
        assert data["status"] in ["pending", "matched"]  # May auto-match
        assert "id" in data
        
        # Store for cleanup
        self.__class__.created_tx_id = data["id"]
    
    def test_create_ic_transaction_purchase(self, auth_headers, entities):
        """Test creating an IC purchase transaction (counterparty side)"""
        tx_data = {
            "source_entity_id": entities[1]["id"],
            "counterparty_entity_id": entities[0]["id"],
            "transaction_type": "purchase",
            "description": "TEST_IC Purchase - Services",
            "amount": 50000.00,
            "currency": "USD",
            "transaction_date": datetime.now().isoformat(),
            "reference": "TEST-INV-001"
        }
        
        response = requests.post(f"{BASE_URL}/api/ic-transactions", headers=auth_headers, json=tx_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["transaction_type"] == "purchase"
        assert data["amount"] == 50000.00
        
        self.__class__.created_tx_id_2 = data["id"]
    
    def test_create_ic_transaction_loan(self, auth_headers, entities):
        """Test creating an IC loan transaction"""
        tx_data = {
            "source_entity_id": entities[0]["id"],
            "counterparty_entity_id": entities[1]["id"],
            "transaction_type": "loan",
            "description": "TEST_IC Intercompany Loan",
            "amount": 100000.00,
            "currency": "GBP",
            "transaction_date": datetime.now().isoformat(),
            "reference": "TEST-LOAN-001"
        }
        
        response = requests.post(f"{BASE_URL}/api/ic-transactions", headers=auth_headers, json=tx_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["transaction_type"] == "loan"
    
    def test_create_ic_transaction_management_fee(self, auth_headers, entities):
        """Test creating an IC management fee transaction"""
        tx_data = {
            "source_entity_id": entities[0]["id"],
            "counterparty_entity_id": entities[1]["id"],
            "transaction_type": "management_fee",
            "description": "TEST_IC Management Fee Q4",
            "amount": 25000.00,
            "currency": "USD",
            "transaction_date": datetime.now().isoformat(),
            "reference": "TEST-MF-001"
        }
        
        response = requests.post(f"{BASE_URL}/api/ic-transactions", headers=auth_headers, json=tx_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["transaction_type"] == "management_fee"
    
    def test_create_ic_transaction_same_entity_fails(self, auth_headers, entities):
        """Test that creating IC transaction with same source and counterparty fails"""
        tx_data = {
            "source_entity_id": entities[0]["id"],
            "counterparty_entity_id": entities[0]["id"],  # Same entity
            "transaction_type": "sale",
            "description": "Invalid IC Transaction",
            "amount": 10000.00,
            "currency": "USD",
            "transaction_date": datetime.now().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/ic-transactions", headers=auth_headers, json=tx_data)
        
        assert response.status_code == 400
        assert "same entity" in response.json().get("detail", "").lower()
    
    def test_get_ic_transactions(self, auth_headers):
        """Test getting all IC transactions"""
        response = requests.get(f"{BASE_URL}/api/ic-transactions", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # Should have at least the transactions we created
        assert len(data) >= 1
    
    def test_get_ic_transactions_filter_by_status(self, auth_headers):
        """Test filtering IC transactions by status"""
        response = requests.get(f"{BASE_URL}/api/ic-transactions?status=pending", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        # All returned should be pending
        for tx in data:
            assert tx["status"] == "pending"
    
    def test_get_single_ic_transaction(self, auth_headers):
        """Test getting a single IC transaction by ID"""
        if not hasattr(self.__class__, 'created_tx_id'):
            pytest.skip("No transaction ID available")
        
        response = requests.get(f"{BASE_URL}/api/ic-transactions/{self.__class__.created_tx_id}", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == self.__class__.created_tx_id
    
    def test_update_ic_transaction(self, auth_headers):
        """Test updating an IC transaction"""
        if not hasattr(self.__class__, 'created_tx_id'):
            pytest.skip("No transaction ID available")
        
        update_data = {
            "description": "TEST_Updated IC Sale Description",
            "reference": "TEST-INV-001-UPDATED"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/ic-transactions/{self.__class__.created_tx_id}",
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["description"] == "TEST_Updated IC Sale Description"
        assert data["reference"] == "TEST-INV-001-UPDATED"
    
    # ==================== IC ELIMINATION RULES TESTS ====================
    
    def test_get_ic_elimination_rules(self, auth_headers):
        """Test getting IC elimination rules"""
        response = requests.get(f"{BASE_URL}/api/ic-elimination-rules", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_ic_elimination_rule(self, auth_headers):
        """Test creating an IC elimination rule"""
        rule_data = {
            "name": "TEST_IC Elimination Rule",
            "amount_tolerance_pct": 0.02,  # 2% tolerance
            "date_tolerance_days": 45,
            "require_reference_match": False,
            "auto_match_enabled": True
        }
        
        response = requests.post(f"{BASE_URL}/api/ic-elimination-rules", headers=auth_headers, json=rule_data)
        
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_IC Elimination Rule"
        assert data["amount_tolerance_pct"] == 0.02
        assert data["date_tolerance_days"] == 45
        
        self.__class__.created_rule_id = data["id"]
    
    def test_update_ic_elimination_rule(self, auth_headers):
        """Test updating an IC elimination rule"""
        if not hasattr(self.__class__, 'created_rule_id'):
            pytest.skip("No rule ID available")
        
        update_data = {
            "amount_tolerance_pct": 0.03,  # Update to 3%
            "date_tolerance_days": 60
        }
        
        response = requests.put(
            f"{BASE_URL}/api/ic-elimination-rules/{self.__class__.created_rule_id}",
            headers=auth_headers,
            json=update_data
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["amount_tolerance_pct"] == 0.03
        assert data["date_tolerance_days"] == 60
    
    # ==================== IC STATISTICS TESTS ====================
    
    def test_get_ic_statistics(self, auth_headers):
        """Test getting IC elimination statistics"""
        response = requests.get(f"{BASE_URL}/api/ic-eliminations/statistics", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify expected fields
        assert "total_count" in data
        assert "pending_count" in data
        assert "matched_count" in data
        assert "eliminated_count" in data
        assert "total_ic_amount" in data
        
        # Counts should be non-negative
        assert data["total_count"] >= 0
        assert data["pending_count"] >= 0
        assert data["matched_count"] >= 0
        assert data["eliminated_count"] >= 0
    
    # ==================== AUTO-MATCH TESTS ====================
    
    def test_auto_match_ic_transactions(self, auth_headers):
        """Test auto-matching IC transactions"""
        response = requests.post(f"{BASE_URL}/api/ic-eliminations/auto-match", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure - API returns these fields
        assert "newly_matched" in data
        assert "total_pending" in data or "pending_count" in data
        assert "total_matched" in data or "matched_count" in data
        
        # newly_matched should be non-negative
        assert data["newly_matched"] >= 0
    
    # ==================== MANUAL MATCH/UNMATCH TESTS ====================
    
    def test_manual_match_ic_transactions(self, auth_headers, entities):
        """Test manually matching two IC transactions"""
        # Create two transactions to match
        tx1_data = {
            "source_entity_id": entities[0]["id"],
            "counterparty_entity_id": entities[1]["id"],
            "transaction_type": "sale",
            "description": "TEST_Manual Match Sale",
            "amount": 75000.00,
            "currency": "USD",
            "transaction_date": datetime.now().isoformat(),
            "reference": "TEST-MANUAL-001"
        }
        
        tx2_data = {
            "source_entity_id": entities[1]["id"],
            "counterparty_entity_id": entities[0]["id"],
            "transaction_type": "purchase",
            "description": "TEST_Manual Match Purchase",
            "amount": 75000.00,
            "currency": "USD",
            "transaction_date": datetime.now().isoformat(),
            "reference": "TEST-MANUAL-001"
        }
        
        # Create both transactions
        resp1 = requests.post(f"{BASE_URL}/api/ic-transactions", headers=auth_headers, json=tx1_data)
        resp2 = requests.post(f"{BASE_URL}/api/ic-transactions", headers=auth_headers, json=tx2_data)
        
        if resp1.status_code != 200 or resp2.status_code != 200:
            pytest.skip("Could not create transactions for manual match test")
        
        tx1_id = resp1.json()["id"]
        tx2_id = resp2.json()["id"]
        
        # Check if they're already matched (auto-match may have kicked in)
        tx1_status = resp1.json().get("status")
        tx2_status = resp2.json().get("status")
        
        if tx1_status == "matched" or tx2_status == "matched":
            # Already matched by auto-match, test passes
            self.__class__.manual_match_tx1 = tx1_id
            self.__class__.manual_match_tx2 = tx2_id
            return
        
        # Manual match
        match_response = requests.post(
            f"{BASE_URL}/api/ic-transactions/manual-match",
            headers=auth_headers,
            json={
                "transaction_id_1": tx1_id,
                "transaction_id_2": tx2_id
            }
        )
        
        assert match_response.status_code == 200
        assert "matched" in match_response.json().get("message", "").lower()
        
        # Verify both are now matched
        verify1 = requests.get(f"{BASE_URL}/api/ic-transactions/{tx1_id}", headers=auth_headers)
        verify2 = requests.get(f"{BASE_URL}/api/ic-transactions/{tx2_id}", headers=auth_headers)
        
        assert verify1.json()["status"] == "matched"
        assert verify2.json()["status"] == "matched"
        
        self.__class__.manual_match_tx1 = tx1_id
        self.__class__.manual_match_tx2 = tx2_id
    
    def test_unmatch_ic_transaction(self, auth_headers):
        """Test unmatching an IC transaction"""
        if not hasattr(self.__class__, 'manual_match_tx1'):
            pytest.skip("No matched transaction available")
        
        # Unmatch
        response = requests.post(
            f"{BASE_URL}/api/ic-transactions/unmatch/{self.__class__.manual_match_tx1}",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        assert "unmatch" in response.json().get("message", "").lower()
        
        # Verify both are now pending
        verify1 = requests.get(f"{BASE_URL}/api/ic-transactions/{self.__class__.manual_match_tx1}", headers=auth_headers)
        verify2 = requests.get(f"{BASE_URL}/api/ic-transactions/{self.__class__.manual_match_tx2}", headers=auth_headers)
        
        assert verify1.json()["status"] == "pending"
        assert verify2.json()["status"] == "pending"
    
    # ==================== GENERATE MOCK DATA TEST ====================
    
    def test_generate_mock_ic_data(self, auth_headers):
        """Test generating mock IC transaction data"""
        response = requests.post(f"{BASE_URL}/api/ic-transactions/generate-mock", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "transactions" in data
        assert "Created" in data["message"]
        assert len(data["transactions"]) >= 3  # Should create 3-5 pairs
    
    # ==================== RUN ELIMINATIONS TEST ====================
    
    def test_run_ic_eliminations(self, auth_headers):
        """Test running IC eliminations"""
        # First, ensure we have some matched transactions
        # Run auto-match first
        requests.post(f"{BASE_URL}/api/ic-eliminations/auto-match", headers=auth_headers)
        
        # Check if we have matched transactions
        stats = requests.get(f"{BASE_URL}/api/ic-eliminations/statistics", headers=auth_headers)
        matched_count = stats.json().get("matched_count", 0)
        
        # Run eliminations
        response = requests.post(f"{BASE_URL}/api/ic-eliminations/run", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify response structure
        if matched_count > 0:
            assert "eliminated_count" in data
            assert "elimination_entries" in data
            assert data["eliminated_count"] >= 0
        else:
            # No matched transactions to eliminate
            assert "message" in data or "eliminated_count" in data
    
    def test_get_ic_elimination_results(self, auth_headers):
        """Test getting IC elimination results history"""
        response = requests.get(f"{BASE_URL}/api/ic-eliminations/results", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    # ==================== CLEANUP ====================
    
    def test_delete_ic_transaction(self, auth_headers):
        """Test deleting an IC transaction"""
        # Create a transaction to delete
        tx_data = {
            "source_entity_id": None,  # Will be set below
            "counterparty_entity_id": None,
            "transaction_type": "other",
            "description": "TEST_To Be Deleted",
            "amount": 1000.00,
            "currency": "USD",
            "transaction_date": datetime.now().isoformat()
        }
        
        # Get entities
        entities_resp = requests.get(f"{BASE_URL}/api/companies", headers=auth_headers)
        if entities_resp.status_code != 200 or len(entities_resp.json()) < 2:
            pytest.skip("Not enough entities for delete test")
        
        entities = entities_resp.json()
        tx_data["source_entity_id"] = entities[0]["id"]
        tx_data["counterparty_entity_id"] = entities[1]["id"]
        
        # Create
        create_resp = requests.post(f"{BASE_URL}/api/ic-transactions", headers=auth_headers, json=tx_data)
        if create_resp.status_code != 200:
            pytest.skip("Could not create transaction for delete test")
        
        tx_id = create_resp.json()["id"]
        
        # Delete
        delete_resp = requests.delete(f"{BASE_URL}/api/ic-transactions/{tx_id}", headers=auth_headers)
        
        assert delete_resp.status_code == 200
        assert "deleted" in delete_resp.json().get("message", "").lower()
        
        # Verify deleted
        verify_resp = requests.get(f"{BASE_URL}/api/ic-transactions/{tx_id}", headers=auth_headers)
        assert verify_resp.status_code == 404
    
    def test_delete_ic_elimination_rule(self, auth_headers):
        """Test deleting an IC elimination rule"""
        if not hasattr(self.__class__, 'created_rule_id'):
            pytest.skip("No rule ID available")
        
        response = requests.delete(
            f"{BASE_URL}/api/ic-elimination-rules/{self.__class__.created_rule_id}",
            headers=auth_headers
        )
        
        assert response.status_code == 200


class TestICTransactionTypes:
    """Test all IC transaction types"""
    
    @pytest.fixture(scope="class")
    def auth_headers(self):
        """Get auth headers"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            token = response.json().get("token")
            return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def entities(self, auth_headers):
        """Get entities"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=auth_headers)
        if response.status_code == 200 and len(response.json()) >= 2:
            return response.json()[:2]
        pytest.skip("Not enough entities")
    
    @pytest.mark.parametrize("tx_type", [
        "sale", "purchase", "loan", "dividend", 
        "management_fee", "royalty", "transfer", "other"
    ])
    def test_create_transaction_type(self, auth_headers, entities, tx_type):
        """Test creating each transaction type"""
        tx_data = {
            "source_entity_id": entities[0]["id"],
            "counterparty_entity_id": entities[1]["id"],
            "transaction_type": tx_type,
            "description": f"TEST_IC {tx_type.replace('_', ' ').title()}",
            "amount": 10000.00,
            "currency": "USD",
            "transaction_date": datetime.now().isoformat()
        }
        
        response = requests.post(f"{BASE_URL}/api/ic-transactions", headers=auth_headers, json=tx_data)
        
        assert response.status_code == 200, f"Failed for type {tx_type}: {response.text}"
        assert response.json()["transaction_type"] == tx_type


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
