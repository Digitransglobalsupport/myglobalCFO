"""
Backend Tests for FP&A, Loans, Covenants, and Multi-Entity Consolidation APIs
Tests for:
- FP&A Planning Versions CRUD (with lock/copy features)
- FP&A Drivers CRUD (with duplicate name check)
- Loan Covenant Monitoring (with measurement tracking and status calculation)
- Multi-Entity Consolidation (with FX conversion)
"""

import pytest
import requests
import os
import uuid
from datetime import datetime, timedelta

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://progress-bar-repair-1.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "Test123!"


class TestFXRates:
    """Test FX rates endpoints (no auth required) - Live Frankfurter API (ECB data)"""
    
    def test_get_fx_rates_default_base(self):
        """GET /api/fx/rates returns rates with default EUR base (ECB data)"""
        response = requests.get(f"{BASE_URL}/api/fx/rates")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "base_currency" in data
        assert data["base_currency"] == "EUR"  # Frankfurter API uses EUR as default base
        assert "rates" in data
        assert "EUR" in data["rates"]
        assert data["rates"]["EUR"] == 1.0
        assert "source" in data
        assert "frankfurter" in data["source"].lower()  # Verify live data source
        
    def test_get_fx_rates_with_gbp_base(self):
        """GET /api/fx/rates?base_currency=GBP returns rates relative to GBP"""
        response = requests.get(f"{BASE_URL}/api/fx/rates?base_currency=GBP")
        assert response.status_code == 200
        
        data = response.json()
        assert data["base_currency"] == "GBP"
        assert data["rates"]["GBP"] == 1.0
        
    def test_fx_convert_same_currency(self):
        """GET /api/fx/convert with same currency returns same amount"""
        response = requests.get(f"{BASE_URL}/api/fx/convert?amount=100&from_currency=USD&to_currency=USD")
        assert response.status_code == 200
        
        data = response.json()
        assert data["original_amount"] == 100
        assert data["converted_amount"] == 100
        assert data["fx_rate"] == 1.0
        
    def test_fx_convert_different_currencies(self):
        """GET /api/fx/convert converts between different currencies using live rates"""
        response = requests.get(f"{BASE_URL}/api/fx/convert?amount=100&from_currency=GBP&to_currency=USD")
        assert response.status_code == 200
        
        data = response.json()
        assert data["original_amount"] == 100
        assert data["original_currency"] == "GBP"
        assert data["target_currency"] == "USD"
        assert "converted_amount" in data
        assert "fx_rate" in data
        assert "source" in data
        assert "frankfurter" in data["source"].lower()  # Verify live data source
        # GBP to USD should be > 1 (GBP is stronger)
        assert data["converted_amount"] > 100


class TestFPADriverTypes:
    """Test FP&A driver types endpoint (no auth required)"""
    
    def test_get_driver_types(self):
        """GET /api/fpa/driver-types returns list of driver types"""
        response = requests.get(f"{BASE_URL}/api/fpa/driver-types")
        assert response.status_code == 200
        
        data = response.json()
        assert "driver_types" in data
        assert len(data["driver_types"]) >= 5
        
        # Check structure
        for dt in data["driver_types"]:
            assert "value" in dt
            assert "label" in dt
            assert "description" in dt


class TestFPAPlanningVersions:
    """Test FP&A Planning Versions CRUD"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate")
        
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get a company for testing
        companies_response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        companies = companies_response.json()
        if not companies:
            pytest.skip("No companies available")
        self.company_id = companies[0]["id"]
        
    def test_create_planning_version(self):
        """POST /api/fpa/versions creates a new planning version"""
        unique_name = f"TEST_Budget_{uuid.uuid4().hex[:8]}"
        
        version_data = {
            "name": unique_name,
            "version_type": "Budget",
            "fiscal_year": 2025,
            "start_period": "2025-01",
            "end_period": "2025-12",
            "is_rolling": False,
            "rolling_months": 12,
            "company_id": self.company_id
        }
        
        response = requests.post(
            f"{BASE_URL}/api/fpa/versions",
            json=version_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == unique_name
        assert data["version_type"] == "Budget"
        assert data["fiscal_year"] == 2025
        assert data["is_locked"] == False
        assert "id" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/fpa/versions/{data['id']}", headers=self.headers)
        
    def test_get_planning_versions_list(self):
        """GET /api/fpa/versions returns list of versions"""
        response = requests.get(f"{BASE_URL}/api/fpa/versions", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_single_planning_version(self):
        """GET /api/fpa/versions/{id} returns single version"""
        # Create a version first
        unique_name = f"TEST_Forecast_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/fpa/versions",
            json={
                "name": unique_name,
                "version_type": "Forecast",
                "fiscal_year": 2025,
                "start_period": "2025-01",
                "end_period": "2025-12",
                "company_id": self.company_id
            },
            headers=self.headers
        )
        
        version_id = create_response.json()["id"]
        
        try:
            # Get the version
            response = requests.get(f"{BASE_URL}/api/fpa/versions/{version_id}", headers=self.headers)
            assert response.status_code == 200
            
            data = response.json()
            assert data["id"] == version_id
            assert data["name"] == unique_name
        finally:
            requests.delete(f"{BASE_URL}/api/fpa/versions/{version_id}", headers=self.headers)
            
    def test_update_planning_version(self):
        """PUT /api/fpa/versions/{id} updates a version"""
        # Create a version first
        unique_name = f"TEST_Scenario_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/fpa/versions",
            json={
                "name": unique_name,
                "version_type": "Scenario",
                "fiscal_year": 2025,
                "start_period": "2025-01",
                "end_period": "2025-12",
                "company_id": self.company_id
            },
            headers=self.headers
        )
        
        version_id = create_response.json()["id"]
        
        try:
            # Update the version
            new_name = f"TEST_Updated_{uuid.uuid4().hex[:8]}"
            response = requests.put(
                f"{BASE_URL}/api/fpa/versions/{version_id}",
                json={"name": new_name, "fiscal_year": 2026},
                headers=self.headers
            )
            assert response.status_code == 200
            
            # Verify update
            get_response = requests.get(f"{BASE_URL}/api/fpa/versions/{version_id}", headers=self.headers)
            data = get_response.json()
            assert data["name"] == new_name
            assert data["fiscal_year"] == 2026
        finally:
            requests.delete(f"{BASE_URL}/api/fpa/versions/{version_id}", headers=self.headers)
            
    def test_toggle_version_lock(self):
        """PUT /api/fpa/versions/{id}/lock toggles lock state"""
        # Create a version first
        unique_name = f"TEST_Lock_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/fpa/versions",
            json={
                "name": unique_name,
                "version_type": "Budget",
                "fiscal_year": 2025,
                "start_period": "2025-01",
                "end_period": "2025-12",
                "company_id": self.company_id
            },
            headers=self.headers
        )
        
        version_id = create_response.json()["id"]
        
        try:
            # Lock the version
            lock_response = requests.put(
                f"{BASE_URL}/api/fpa/versions/{version_id}/lock",
                headers=self.headers
            )
            assert lock_response.status_code == 200
            assert lock_response.json()["is_locked"] == True
            
            # Unlock the version
            unlock_response = requests.put(
                f"{BASE_URL}/api/fpa/versions/{version_id}/lock",
                headers=self.headers
            )
            assert unlock_response.status_code == 200
            assert unlock_response.json()["is_locked"] == False
        finally:
            requests.delete(f"{BASE_URL}/api/fpa/versions/{version_id}", headers=self.headers)
            
    def test_cannot_update_locked_version(self):
        """Cannot update a locked version"""
        # Create and lock a version
        unique_name = f"TEST_LockedUpdate_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/fpa/versions",
            json={
                "name": unique_name,
                "version_type": "Budget",
                "fiscal_year": 2025,
                "start_period": "2025-01",
                "end_period": "2025-12",
                "company_id": self.company_id
            },
            headers=self.headers
        )
        
        version_id = create_response.json()["id"]
        
        try:
            # Lock the version
            requests.put(f"{BASE_URL}/api/fpa/versions/{version_id}/lock", headers=self.headers)
            
            # Try to update - should fail
            update_response = requests.put(
                f"{BASE_URL}/api/fpa/versions/{version_id}",
                json={"name": "New Name"},
                headers=self.headers
            )
            assert update_response.status_code == 400
            assert "locked" in update_response.json()["detail"].lower()
            
            # Unlock for cleanup
            requests.put(f"{BASE_URL}/api/fpa/versions/{version_id}/lock", headers=self.headers)
        finally:
            requests.delete(f"{BASE_URL}/api/fpa/versions/{version_id}", headers=self.headers)
            
    def test_copy_planning_version(self):
        """POST /api/fpa/versions/{id}/copy creates a copy"""
        # Create a version first
        unique_name = f"TEST_Original_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/fpa/versions",
            json={
                "name": unique_name,
                "version_type": "Budget",
                "fiscal_year": 2025,
                "start_period": "2025-01",
                "end_period": "2025-12",
                "company_id": self.company_id
            },
            headers=self.headers
        )
        
        version_id = create_response.json()["id"]
        copy_name = f"TEST_Copy_{uuid.uuid4().hex[:8]}"
        
        try:
            # Copy the version
            copy_response = requests.post(
                f"{BASE_URL}/api/fpa/versions/{version_id}/copy?new_name={copy_name}",
                headers=self.headers
            )
            assert copy_response.status_code == 200
            
            new_id = copy_response.json()["new_id"]
            
            # Verify copy
            get_response = requests.get(f"{BASE_URL}/api/fpa/versions/{new_id}", headers=self.headers)
            data = get_response.json()
            assert data["name"] == copy_name
            assert data["fiscal_year"] == 2025
            assert data["is_locked"] == False  # Copy should be unlocked
            
            # Cleanup copy
            requests.delete(f"{BASE_URL}/api/fpa/versions/{new_id}", headers=self.headers)
        finally:
            requests.delete(f"{BASE_URL}/api/fpa/versions/{version_id}", headers=self.headers)
            
    def test_delete_planning_version(self):
        """DELETE /api/fpa/versions/{id} deletes a version"""
        # Create a version
        unique_name = f"TEST_Delete_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/fpa/versions",
            json={
                "name": unique_name,
                "version_type": "Budget",
                "fiscal_year": 2025,
                "start_period": "2025-01",
                "end_period": "2025-12",
                "company_id": self.company_id
            },
            headers=self.headers
        )
        
        version_id = create_response.json()["id"]
        
        # Delete the version
        delete_response = requests.delete(f"{BASE_URL}/api/fpa/versions/{version_id}", headers=self.headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/fpa/versions/{version_id}", headers=self.headers)
        assert get_response.status_code == 404
        
    def test_cannot_delete_locked_version(self):
        """Cannot delete a locked version"""
        # Create and lock a version
        unique_name = f"TEST_LockedDelete_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/fpa/versions",
            json={
                "name": unique_name,
                "version_type": "Budget",
                "fiscal_year": 2025,
                "start_period": "2025-01",
                "end_period": "2025-12",
                "company_id": self.company_id
            },
            headers=self.headers
        )
        
        version_id = create_response.json()["id"]
        
        try:
            # Lock the version
            requests.put(f"{BASE_URL}/api/fpa/versions/{version_id}/lock", headers=self.headers)
            
            # Try to delete - should fail
            delete_response = requests.delete(f"{BASE_URL}/api/fpa/versions/{version_id}", headers=self.headers)
            assert delete_response.status_code == 400
            
            # Unlock for cleanup
            requests.put(f"{BASE_URL}/api/fpa/versions/{version_id}/lock", headers=self.headers)
        finally:
            requests.delete(f"{BASE_URL}/api/fpa/versions/{version_id}", headers=self.headers)


class TestFPADrivers:
    """Test FP&A Drivers CRUD"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate")
        
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_create_driver(self):
        """POST /api/fpa/drivers creates a new driver"""
        unique_name = f"TEST_Driver_{uuid.uuid4().hex[:8]}"
        
        driver_data = {
            "name": unique_name,
            "formula": "revenue * 0.1",
            "driver_type": "Revenue",
            "linked_accounts": ["4000", "4100"]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/fpa/drivers",
            json=driver_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == unique_name
        assert data["formula"] == "revenue * 0.1"
        assert data["driver_type"] == "Revenue"
        assert "id" in data
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/fpa/drivers/{data['id']}", headers=self.headers)
        
    def test_duplicate_driver_name_rejected(self):
        """Cannot create driver with duplicate name"""
        unique_name = f"TEST_DupDriver_{uuid.uuid4().hex[:8]}"
        
        # Create first driver
        create_response = requests.post(
            f"{BASE_URL}/api/fpa/drivers",
            json={
                "name": unique_name,
                "formula": "cost * 0.05",
                "driver_type": "Cost"
            },
            headers=self.headers
        )
        
        driver_id = create_response.json()["id"]
        
        try:
            # Try to create duplicate
            dup_response = requests.post(
                f"{BASE_URL}/api/fpa/drivers",
                json={
                    "name": unique_name,
                    "formula": "different formula",
                    "driver_type": "Cost"
                },
                headers=self.headers
            )
            assert dup_response.status_code == 400
            assert "already exists" in dup_response.json()["detail"].lower()
        finally:
            requests.delete(f"{BASE_URL}/api/fpa/drivers/{driver_id}", headers=self.headers)
            
    def test_get_drivers_list(self):
        """GET /api/fpa/drivers returns list of drivers"""
        response = requests.get(f"{BASE_URL}/api/fpa/drivers", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_single_driver(self):
        """GET /api/fpa/drivers/{id} returns single driver"""
        # Create a driver first
        unique_name = f"TEST_GetDriver_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/fpa/drivers",
            json={
                "name": unique_name,
                "formula": "headcount * 5000",
                "driver_type": "Headcount"
            },
            headers=self.headers
        )
        
        driver_id = create_response.json()["id"]
        
        try:
            response = requests.get(f"{BASE_URL}/api/fpa/drivers/{driver_id}", headers=self.headers)
            assert response.status_code == 200
            
            data = response.json()
            assert data["id"] == driver_id
            assert data["name"] == unique_name
        finally:
            requests.delete(f"{BASE_URL}/api/fpa/drivers/{driver_id}", headers=self.headers)
            
    def test_update_driver(self):
        """PUT /api/fpa/drivers/{id} updates a driver"""
        # Create a driver first
        unique_name = f"TEST_UpdateDriver_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/fpa/drivers",
            json={
                "name": unique_name,
                "formula": "volume * price",
                "driver_type": "Volume"
            },
            headers=self.headers
        )
        
        driver_id = create_response.json()["id"]
        
        try:
            # Update the driver
            response = requests.put(
                f"{BASE_URL}/api/fpa/drivers/{driver_id}",
                json={"formula": "volume * price * 1.1"},
                headers=self.headers
            )
            assert response.status_code == 200
            
            # Verify update
            get_response = requests.get(f"{BASE_URL}/api/fpa/drivers/{driver_id}", headers=self.headers)
            data = get_response.json()
            assert data["formula"] == "volume * price * 1.1"
        finally:
            requests.delete(f"{BASE_URL}/api/fpa/drivers/{driver_id}", headers=self.headers)
            
    def test_delete_driver(self):
        """DELETE /api/fpa/drivers/{id} deletes a driver"""
        # Create a driver
        unique_name = f"TEST_DeleteDriver_{uuid.uuid4().hex[:8]}"
        create_response = requests.post(
            f"{BASE_URL}/api/fpa/drivers",
            json={
                "name": unique_name,
                "formula": "test",
                "driver_type": "Operational"
            },
            headers=self.headers
        )
        
        driver_id = create_response.json()["id"]
        
        # Delete the driver
        delete_response = requests.delete(f"{BASE_URL}/api/fpa/drivers/{driver_id}", headers=self.headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/fpa/drivers/{driver_id}", headers=self.headers)
        assert get_response.status_code == 404


class TestFPAOverview:
    """Test FP&A Overview endpoint"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate")
        
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_get_fpa_overview(self):
        """GET /api/fpa/overview returns overview stats"""
        response = requests.get(f"{BASE_URL}/api/fpa/overview", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "planning_versions" in data
        assert "drivers_count" in data
        assert "entities_count" in data


class TestLoans:
    """Test Loans CRUD"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate")
        
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get a company for testing
        companies_response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        companies = companies_response.json()
        if not companies:
            pytest.skip("No companies available")
        self.company_id = companies[0]["id"]
        
    def test_create_loan(self):
        """POST /api/loans creates a new loan"""
        loan_data = {
            "company_id": self.company_id,
            "lender_name": f"TEST_Bank_{uuid.uuid4().hex[:8]}",
            "loan_type": "Term Loan",
            "principal_amount": 1000000,
            "currency": "GBP",
            "interest_rate": 5.5,
            "start_date": "2024-01-01T00:00:00Z",
            "maturity_date": "2029-01-01T00:00:00Z",
            "payment_frequency": "Monthly",
            "notes": "Test loan"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/loans",
            json=loan_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["loan"]["principal_amount"] == 1000000
        assert data["loan"]["outstanding_balance"] == 1000000  # Initial balance = principal
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/loans/{data['id']}", headers=self.headers)
        
    def test_get_loans_list(self):
        """GET /api/loans returns list of loans"""
        response = requests.get(f"{BASE_URL}/api/loans", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_single_loan(self):
        """GET /api/loans/{id} returns single loan with covenants"""
        # Create a loan first
        create_response = requests.post(
            f"{BASE_URL}/api/loans",
            json={
                "company_id": self.company_id,
                "lender_name": f"TEST_GetLoan_{uuid.uuid4().hex[:8]}",
                "loan_type": "Revolving",
                "principal_amount": 500000,
                "currency": "USD",
                "interest_rate": 6.0,
                "start_date": "2024-01-01T00:00:00Z",
                "maturity_date": "2027-01-01T00:00:00Z"
            },
            headers=self.headers
        )
        
        loan_id = create_response.json()["id"]
        
        try:
            response = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=self.headers)
            assert response.status_code == 200
            
            data = response.json()
            assert data["id"] == loan_id
            assert "covenants" in data  # Should include associated covenants
        finally:
            requests.delete(f"{BASE_URL}/api/loans/{loan_id}", headers=self.headers)
            
    def test_update_loan(self):
        """PUT /api/loans/{id} updates a loan"""
        # Create a loan first
        create_response = requests.post(
            f"{BASE_URL}/api/loans",
            json={
                "company_id": self.company_id,
                "lender_name": f"TEST_UpdateLoan_{uuid.uuid4().hex[:8]}",
                "loan_type": "Term Loan",
                "principal_amount": 750000,
                "currency": "GBP",
                "interest_rate": 5.0,
                "start_date": "2024-01-01T00:00:00Z",
                "maturity_date": "2028-01-01T00:00:00Z"
            },
            headers=self.headers
        )
        
        loan_id = create_response.json()["id"]
        
        try:
            # Update the loan
            response = requests.put(
                f"{BASE_URL}/api/loans/{loan_id}",
                json={"outstanding_balance": 700000, "interest_rate": 5.25},
                headers=self.headers
            )
            assert response.status_code == 200
            
            # Verify update
            get_response = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=self.headers)
            data = get_response.json()
            assert data["outstanding_balance"] == 700000
            assert data["interest_rate"] == 5.25
        finally:
            requests.delete(f"{BASE_URL}/api/loans/{loan_id}", headers=self.headers)
            
    def test_delete_loan(self):
        """DELETE /api/loans/{id} deletes a loan and associated covenants"""
        # Create a loan
        create_response = requests.post(
            f"{BASE_URL}/api/loans",
            json={
                "company_id": self.company_id,
                "lender_name": f"TEST_DeleteLoan_{uuid.uuid4().hex[:8]}",
                "loan_type": "Term Loan",
                "principal_amount": 250000,
                "currency": "GBP",
                "interest_rate": 4.5,
                "start_date": "2024-01-01T00:00:00Z",
                "maturity_date": "2026-01-01T00:00:00Z"
            },
            headers=self.headers
        )
        
        loan_id = create_response.json()["id"]
        
        # Delete the loan
        delete_response = requests.delete(f"{BASE_URL}/api/loans/{loan_id}", headers=self.headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/loans/{loan_id}", headers=self.headers)
        assert get_response.status_code == 404


class TestCovenants:
    """Test Covenants CRUD and Measurement"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token, create test loan"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate")
        
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get a company for testing
        companies_response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        companies = companies_response.json()
        if not companies:
            pytest.skip("No companies available")
        self.company_id = companies[0]["id"]
        
        # Create a test loan
        loan_response = requests.post(
            f"{BASE_URL}/api/loans",
            json={
                "company_id": self.company_id,
                "lender_name": f"TEST_CovenantLoan_{uuid.uuid4().hex[:8]}",
                "loan_type": "Term Loan",
                "principal_amount": 1000000,
                "currency": "GBP",
                "interest_rate": 5.0,
                "start_date": "2024-01-01T00:00:00Z",
                "maturity_date": "2029-01-01T00:00:00Z"
            },
            headers=self.headers
        )
        self.loan_id = loan_response.json()["id"]
        
    def teardown_method(self, method):
        """Cleanup test loan"""
        if hasattr(self, 'loan_id'):
            requests.delete(f"{BASE_URL}/api/loans/{self.loan_id}", headers=self.headers)
        
    def test_create_covenant(self):
        """POST /api/covenants creates a new covenant"""
        covenant_data = {
            "loan_id": self.loan_id,
            "company_id": self.company_id,
            "covenant_type": "DSCR",
            "name": f"TEST_DSCR_{uuid.uuid4().hex[:8]}",
            "requirement_operator": ">=",
            "threshold_value": 1.25,
            "measurement_frequency": "Quarterly",
            "warning_threshold_pct": 10.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/covenants",
            json=covenant_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["covenant"]["covenant_type"] == "DSCR"
        assert data["covenant"]["threshold_value"] == 1.25
        
    def test_get_covenants_list(self):
        """GET /api/covenants returns list of covenants"""
        response = requests.get(f"{BASE_URL}/api/covenants", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_single_covenant(self):
        """GET /api/covenants/{id} returns single covenant with measurement history"""
        # Create a covenant first
        create_response = requests.post(
            f"{BASE_URL}/api/covenants",
            json={
                "loan_id": self.loan_id,
                "company_id": self.company_id,
                "covenant_type": "ICR",
                "name": f"TEST_ICR_{uuid.uuid4().hex[:8]}",
                "requirement_operator": ">=",
                "threshold_value": 3.0,
                "measurement_frequency": "Quarterly"
            },
            headers=self.headers
        )
        
        covenant_id = create_response.json()["id"]
        
        response = requests.get(f"{BASE_URL}/api/covenants/{covenant_id}", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert data["id"] == covenant_id
        assert "measurement_history" in data
        
    def test_update_covenant(self):
        """PUT /api/covenants/{id} updates a covenant"""
        # Create a covenant first
        create_response = requests.post(
            f"{BASE_URL}/api/covenants",
            json={
                "loan_id": self.loan_id,
                "company_id": self.company_id,
                "covenant_type": "Leverage",
                "name": f"TEST_Leverage_{uuid.uuid4().hex[:8]}",
                "requirement_operator": "<=",
                "threshold_value": 4.0,
                "measurement_frequency": "Quarterly"
            },
            headers=self.headers
        )
        
        covenant_id = create_response.json()["id"]
        
        # Update the covenant
        response = requests.put(
            f"{BASE_URL}/api/covenants/{covenant_id}",
            json={"threshold_value": 3.5, "warning_threshold_pct": 15.0},
            headers=self.headers
        )
        assert response.status_code == 200
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/covenants/{covenant_id}", headers=self.headers)
        data = get_response.json()
        assert data["threshold_value"] == 3.5
        assert data["warning_threshold_pct"] == 15.0
        
    def test_delete_covenant(self):
        """DELETE /api/covenants/{id} deletes a covenant"""
        # Create a covenant
        create_response = requests.post(
            f"{BASE_URL}/api/covenants",
            json={
                "loan_id": self.loan_id,
                "company_id": self.company_id,
                "covenant_type": "Minimum Cash",
                "name": f"TEST_MinCash_{uuid.uuid4().hex[:8]}",
                "requirement_operator": ">=",
                "threshold_value": 500000,
                "measurement_frequency": "Monthly"
            },
            headers=self.headers
        )
        
        assert create_response.status_code == 200, f"Create failed: {create_response.text}"
        covenant_id = create_response.json()["id"]
        
        # Delete the covenant
        delete_response = requests.delete(f"{BASE_URL}/api/covenants/{covenant_id}", headers=self.headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/covenants/{covenant_id}", headers=self.headers)
        assert get_response.status_code == 404
        
    def test_record_covenant_measurement_compliant(self):
        """POST /api/covenants/{id}/measure records measurement and calculates status"""
        # Create a covenant with >= operator
        create_response = requests.post(
            f"{BASE_URL}/api/covenants",
            json={
                "loan_id": self.loan_id,
                "company_id": self.company_id,
                "covenant_type": "DSCR",
                "name": f"TEST_MeasureDSCR_{uuid.uuid4().hex[:8]}",
                "requirement_operator": ">=",
                "threshold_value": 1.25,
                "measurement_frequency": "Quarterly",
                "warning_threshold_pct": 10.0
            },
            headers=self.headers
        )
        
        covenant_id = create_response.json()["id"]
        
        # Record a compliant measurement (1.5 >= 1.25)
        measure_response = requests.post(
            f"{BASE_URL}/api/covenants/{covenant_id}/measure?measured_value=1.5",
            headers=self.headers
        )
        
        assert measure_response.status_code == 200
        data = measure_response.json()
        assert data["status"] == "compliant"
        assert data["is_compliant"] == True
        assert data["headroom_pct"] > 0
        
    def test_record_covenant_measurement_warning(self):
        """Measurement near threshold triggers warning status"""
        # Create a covenant
        create_response = requests.post(
            f"{BASE_URL}/api/covenants",
            json={
                "loan_id": self.loan_id,
                "company_id": self.company_id,
                "covenant_type": "DSCR",
                "name": f"TEST_WarningDSCR_{uuid.uuid4().hex[:8]}",
                "requirement_operator": ">=",
                "threshold_value": 1.25,
                "measurement_frequency": "Quarterly",
                "warning_threshold_pct": 10.0  # Warning at 1.375 (1.25 * 1.1)
            },
            headers=self.headers
        )
        
        covenant_id = create_response.json()["id"]
        
        # Record a measurement in warning zone (1.30 is between 1.25 and 1.375)
        measure_response = requests.post(
            f"{BASE_URL}/api/covenants/{covenant_id}/measure?measured_value=1.30",
            headers=self.headers
        )
        
        assert measure_response.status_code == 200
        data = measure_response.json()
        assert data["status"] == "warning"
        assert data["is_compliant"] == True
        assert data["is_warning"] == True
        
    def test_record_covenant_measurement_breach(self):
        """Measurement below threshold triggers breach status"""
        # Create a covenant
        create_response = requests.post(
            f"{BASE_URL}/api/covenants",
            json={
                "loan_id": self.loan_id,
                "company_id": self.company_id,
                "covenant_type": "DSCR",
                "name": f"TEST_BreachDSCR_{uuid.uuid4().hex[:8]}",
                "requirement_operator": ">=",
                "threshold_value": 1.25,
                "measurement_frequency": "Quarterly"
            },
            headers=self.headers
        )
        
        covenant_id = create_response.json()["id"]
        
        # Record a breach measurement (1.0 < 1.25)
        measure_response = requests.post(
            f"{BASE_URL}/api/covenants/{covenant_id}/measure?measured_value=1.0",
            headers=self.headers
        )
        
        assert measure_response.status_code == 200
        data = measure_response.json()
        assert data["status"] == "breach"
        assert data["is_compliant"] == False
        
    def test_get_covenant_summary(self):
        """GET /api/covenants/summary/status returns summary of covenant statuses"""
        response = requests.get(f"{BASE_URL}/api/covenants/summary/status", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "total" in data
        assert "compliant" in data
        assert "warning" in data
        assert "breach" in data
        assert "attention_needed" in data


class TestConsolidationGroups:
    """Test Consolidation Groups CRUD"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate")
        
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
        # Get companies for testing
        companies_response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        self.companies = companies_response.json()
        
    def test_create_consolidation_group(self):
        """POST /api/consolidation/groups creates a new group"""
        entity_ids = [c["id"] for c in self.companies[:2]] if len(self.companies) >= 2 else []
        
        group_data = {
            "name": f"TEST_Group_{uuid.uuid4().hex[:8]}",
            "description": "Test consolidation group",
            "reporting_currency": "USD",
            "entity_ids": entity_ids
        }
        
        response = requests.post(
            f"{BASE_URL}/api/consolidation/groups",
            json=group_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["group"]["reporting_currency"] == "USD"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/consolidation/groups/{data['id']}", headers=self.headers)
        
    def test_get_consolidation_groups_list(self):
        """GET /api/consolidation/groups returns list of groups"""
        response = requests.get(f"{BASE_URL}/api/consolidation/groups", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_single_consolidation_group(self):
        """GET /api/consolidation/groups/{id} returns single group"""
        # Create a group first
        create_response = requests.post(
            f"{BASE_URL}/api/consolidation/groups",
            json={
                "name": f"TEST_GetGroup_{uuid.uuid4().hex[:8]}",
                "reporting_currency": "EUR",
                "entity_ids": []
            },
            headers=self.headers
        )
        
        group_id = create_response.json()["id"]
        
        try:
            response = requests.get(f"{BASE_URL}/api/consolidation/groups/{group_id}", headers=self.headers)
            assert response.status_code == 200
            
            data = response.json()
            assert data["id"] == group_id
        finally:
            requests.delete(f"{BASE_URL}/api/consolidation/groups/{group_id}", headers=self.headers)
            
    def test_update_consolidation_group(self):
        """PUT /api/consolidation/groups/{id} updates a group"""
        # Create a group first
        create_response = requests.post(
            f"{BASE_URL}/api/consolidation/groups",
            json={
                "name": f"TEST_UpdateGroup_{uuid.uuid4().hex[:8]}",
                "reporting_currency": "GBP",
                "entity_ids": []
            },
            headers=self.headers
        )
        
        group_id = create_response.json()["id"]
        
        try:
            # Update the group
            response = requests.put(
                f"{BASE_URL}/api/consolidation/groups/{group_id}",
                json={"description": "Updated description", "reporting_currency": "USD"},
                headers=self.headers
            )
            assert response.status_code == 200
            
            # Verify update
            get_response = requests.get(f"{BASE_URL}/api/consolidation/groups/{group_id}", headers=self.headers)
            data = get_response.json()
            assert data["description"] == "Updated description"
            assert data["reporting_currency"] == "USD"
        finally:
            requests.delete(f"{BASE_URL}/api/consolidation/groups/{group_id}", headers=self.headers)
            
    def test_delete_consolidation_group(self):
        """DELETE /api/consolidation/groups/{id} deletes a group"""
        # Create a group
        create_response = requests.post(
            f"{BASE_URL}/api/consolidation/groups",
            json={
                "name": f"TEST_DeleteGroup_{uuid.uuid4().hex[:8]}",
                "reporting_currency": "USD",
                "entity_ids": []
            },
            headers=self.headers
        )
        
        group_id = create_response.json()["id"]
        
        # Delete the group
        delete_response = requests.delete(f"{BASE_URL}/api/consolidation/groups/{group_id}", headers=self.headers)
        assert delete_response.status_code == 200
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/consolidation/groups/{group_id}", headers=self.headers)
        assert get_response.status_code == 404
        
    def test_run_consolidation(self):
        """POST /api/consolidation/groups/{id}/consolidate runs consolidation"""
        # Create a group with entities
        entity_ids = [c["id"] for c in self.companies[:2]] if len(self.companies) >= 2 else []
        
        create_response = requests.post(
            f"{BASE_URL}/api/consolidation/groups",
            json={
                "name": f"TEST_ConsolidateGroup_{uuid.uuid4().hex[:8]}",
                "reporting_currency": "USD",
                "entity_ids": entity_ids
            },
            headers=self.headers
        )
        
        group_id = create_response.json()["id"]
        
        try:
            # Run consolidation
            response = requests.post(
                f"{BASE_URL}/api/consolidation/groups/{group_id}/consolidate",
                headers=self.headers
            )
            assert response.status_code == 200
            
            data = response.json()
            assert "group_id" in data
            assert "reporting_currency" in data
            assert "total_revenue" in data
            assert "fx_rates_used" in data
        finally:
            requests.delete(f"{BASE_URL}/api/consolidation/groups/{group_id}", headers=self.headers)


class TestConsolidationResults:
    """Test Consolidation Results endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            pytest.skip("Could not authenticate")
        
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_get_consolidation_results(self):
        """GET /api/consolidation/results returns consolidation results"""
        response = requests.get(f"{BASE_URL}/api/consolidation/results", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
    def test_get_entity_summary(self):
        """GET /api/consolidation/entity-summary returns entity summary"""
        response = requests.get(f"{BASE_URL}/api/consolidation/entity-summary", headers=self.headers)
        assert response.status_code == 200
        
        data = response.json()
        assert "entities" in data
        assert "total_entities" in data
        assert "by_currency" in data


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
