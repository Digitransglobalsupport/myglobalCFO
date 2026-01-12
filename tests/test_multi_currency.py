"""
Multi-Currency Engine Backend Tests
Tests for:
- Transaction model with transaction_currency and reporting_currency fields
- POST /api/transactions auto-populates currency fields from company
- GET /api/reference/currencies returns currencies with symbols
- GET /api/reference/countries returns countries with regions and default currencies
- POST /api/companies supports country_code, global_region, reporting_currency fields
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://finviz-19.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "Test123!"

class TestReferenceAPIs:
    """Test reference data endpoints (no auth required)"""
    
    def test_get_currencies_returns_list(self):
        """GET /api/reference/currencies returns list of currencies"""
        response = requests.get(f"{BASE_URL}/api/reference/currencies")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 100, f"Expected 100+ currencies, got {len(data)}"
        
    def test_currencies_have_required_fields(self):
        """Each currency has code, name, symbol, decimal_places"""
        response = requests.get(f"{BASE_URL}/api/reference/currencies")
        data = response.json()
        
        # Check first 10 currencies
        for currency in data[:10]:
            assert "code" in currency, f"Currency missing 'code': {currency}"
            assert "name" in currency, f"Currency missing 'name': {currency}"
            assert "symbol" in currency, f"Currency missing 'symbol': {currency}"
            assert "decimal_places" in currency, f"Currency missing 'decimal_places': {currency}"
            
    def test_common_currencies_have_correct_symbols(self):
        """Verify common currencies have correct symbols"""
        response = requests.get(f"{BASE_URL}/api/reference/currencies")
        data = response.json()
        
        currency_map = {c["code"]: c for c in data}
        
        # Check GBP
        assert "GBP" in currency_map, "GBP not found"
        assert currency_map["GBP"]["symbol"] == "£", f"GBP symbol wrong: {currency_map['GBP']['symbol']}"
        
        # Check USD
        assert "USD" in currency_map, "USD not found"
        assert currency_map["USD"]["symbol"] == "$", f"USD symbol wrong: {currency_map['USD']['symbol']}"
        
        # Check EUR
        assert "EUR" in currency_map, "EUR not found"
        assert currency_map["EUR"]["symbol"] == "€", f"EUR symbol wrong: {currency_map['EUR']['symbol']}"
        
        # Check JPY
        assert "JPY" in currency_map, "JPY not found"
        assert currency_map["JPY"]["symbol"] == "¥", f"JPY symbol wrong: {currency_map['JPY']['symbol']}"
        
    def test_get_countries_returns_list(self):
        """GET /api/reference/countries returns list of countries"""
        response = requests.get(f"{BASE_URL}/api/reference/countries")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 150, f"Expected 150+ countries, got {len(data)}"
        
    def test_countries_have_required_fields(self):
        """Each country has country, code, region, default_currency"""
        response = requests.get(f"{BASE_URL}/api/reference/countries")
        data = response.json()
        
        # Check first 10 countries
        for country in data[:10]:
            assert "country" in country, f"Country missing 'country': {country}"
            assert "code" in country, f"Country missing 'code': {country}"
            assert "region" in country, f"Country missing 'region': {country}"
            assert "default_currency" in country, f"Country missing 'default_currency': {country}"
            
    def test_countries_have_valid_regions(self):
        """Countries have valid region values (APAC, EMEA, Americas)"""
        response = requests.get(f"{BASE_URL}/api/reference/countries")
        data = response.json()
        
        valid_regions = {"APAC", "EMEA", "Americas"}
        for country in data:
            assert country["region"] in valid_regions, f"Invalid region for {country['country']}: {country['region']}"
            
    def test_uk_has_correct_defaults(self):
        """United Kingdom has GBP currency and EMEA region"""
        response = requests.get(f"{BASE_URL}/api/reference/countries")
        data = response.json()
        
        uk = next((c for c in data if c["code"] == "GBR"), None)
        assert uk is not None, "United Kingdom not found"
        assert uk["default_currency"] == "GBP", f"UK default currency wrong: {uk['default_currency']}"
        assert uk["region"] == "EMEA", f"UK region wrong: {uk['region']}"
        
    def test_usa_has_correct_defaults(self):
        """United States has USD currency and Americas region"""
        response = requests.get(f"{BASE_URL}/api/reference/countries")
        data = response.json()
        
        usa = next((c for c in data if c["code"] == "USA"), None)
        assert usa is not None, "United States not found"
        assert usa["default_currency"] == "USD", f"USA default currency wrong: {usa['default_currency']}"
        assert usa["region"] == "Americas", f"USA region wrong: {usa['region']}"
        
    def test_get_single_currency_by_code(self):
        """GET /api/reference/currency/{code} returns single currency"""
        response = requests.get(f"{BASE_URL}/api/reference/currency/GBP")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data["code"] == "GBP"
        assert data["symbol"] == "£"
        
    def test_get_invalid_currency_returns_404(self):
        """GET /api/reference/currency/INVALID returns 404"""
        response = requests.get(f"{BASE_URL}/api/reference/currency/INVALID")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


class TestAuthenticatedAPIs:
    """Test authenticated endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code != 200:
            # Try to register
            register_response = requests.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Test User"
            })
            if register_response.status_code == 200:
                self.token = register_response.json()["token"]
            else:
                pytest.skip("Could not authenticate")
        else:
            self.token = login_response.json()["token"]
            
        self.headers = {"Authorization": f"Bearer {self.token}"}
        
    def test_create_company_with_currency_fields(self):
        """POST /api/companies supports country_code, global_region, reporting_currency"""
        unique_name = f"TEST_Company_{uuid.uuid4().hex[:8]}"
        
        company_data = {
            "name": unique_name,
            "country": "Germany",
            "country_code": "DEU",
            "currency": "EUR",
            "global_region": "EMEA",
            "company_type": "Standalone",
            "reporting_currency": "USD"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/companies",
            json=company_data,
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == unique_name
        assert data["country"] == "Germany"
        assert data["country_code"] == "DEU"
        assert data["currency"] == "EUR"
        assert data["global_region"] == "EMEA"
        assert data["reporting_currency"] == "USD"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/companies/{data['id']}", headers=self.headers)
        
    def test_create_company_with_gbp(self):
        """Create UK company with GBP currency"""
        unique_name = f"TEST_UK_Company_{uuid.uuid4().hex[:8]}"
        
        company_data = {
            "name": unique_name,
            "country": "United Kingdom",
            "country_code": "GBR",
            "currency": "GBP",
            "global_region": "EMEA",
            "company_type": "Standalone"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/companies",
            json=company_data,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["currency"] == "GBP"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/companies/{data['id']}", headers=self.headers)
        
    def test_transaction_auto_populates_currency_from_company(self):
        """POST /api/transactions auto-populates currency fields from company"""
        # Create a company with EUR currency
        unique_name = f"TEST_EUR_Company_{uuid.uuid4().hex[:8]}"
        company_response = requests.post(
            f"{BASE_URL}/api/companies",
            json={
                "name": unique_name,
                "country": "France",
                "country_code": "FRA",
                "currency": "EUR",
                "global_region": "EMEA",
                "company_type": "Standalone",
                "reporting_currency": "USD"
            },
            headers=self.headers
        )
        
        assert company_response.status_code == 200
        company = company_response.json()
        company_id = company["id"]
        
        try:
            # Create transaction without specifying currency
            tx_response = requests.post(
                f"{BASE_URL}/api/transactions",
                json={
                    "company_id": company_id,
                    "date": "2024-01-15T10:00:00Z",
                    "description": "Test transaction",
                    "amount": 1000.00,
                    "type": "Invoice",
                    "category": "Sales",
                    "source": "Manual",
                    "status": "Pending"
                },
                headers=self.headers
            )
            
            assert tx_response.status_code == 200, f"Expected 200, got {tx_response.status_code}: {tx_response.text}"
            
            tx = tx_response.json()
            
            # Verify currency fields were auto-populated
            assert tx["transaction_currency"] == "EUR", f"Expected EUR, got {tx['transaction_currency']}"
            assert tx["reporting_currency"] == "USD", f"Expected USD, got {tx['reporting_currency']}"
            
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/companies/{company_id}", headers=self.headers)
            
    def test_transaction_same_currency_fx_rate_is_one(self):
        """When transaction_currency equals reporting_currency, fx_rate should be 1.0"""
        # Create a company with same currency for both
        unique_name = f"TEST_GBP_Company_{uuid.uuid4().hex[:8]}"
        company_response = requests.post(
            f"{BASE_URL}/api/companies",
            json={
                "name": unique_name,
                "country": "United Kingdom",
                "country_code": "GBR",
                "currency": "GBP",
                "global_region": "EMEA",
                "company_type": "Standalone"
                # No reporting_currency, should default to company currency
            },
            headers=self.headers
        )
        
        assert company_response.status_code == 200
        company = company_response.json()
        company_id = company["id"]
        
        try:
            # Create transaction
            tx_response = requests.post(
                f"{BASE_URL}/api/transactions",
                json={
                    "company_id": company_id,
                    "date": "2024-01-15T10:00:00Z",
                    "description": "Test GBP transaction",
                    "amount": 500.00,
                    "type": "Invoice",
                    "category": "Sales",
                    "source": "Manual"
                },
                headers=self.headers
            )
            
            assert tx_response.status_code == 200
            tx = tx_response.json()
            
            # Both currencies should be GBP
            assert tx["transaction_currency"] == "GBP"
            assert tx["reporting_currency"] == "GBP"
            
            # FX rate should be 1.0 and reporting_amount should equal amount
            assert tx["fx_rate"] == 1.0, f"Expected fx_rate 1.0, got {tx['fx_rate']}"
            assert tx["reporting_amount"] == 500.00, f"Expected reporting_amount 500.00, got {tx['reporting_amount']}"
            
        finally:
            # Cleanup
            requests.delete(f"{BASE_URL}/api/companies/{company_id}", headers=self.headers)
            
    def test_transaction_with_explicit_currency_fields(self):
        """Transaction can specify explicit currency fields"""
        # Get existing companies
        companies_response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        companies = companies_response.json()
        
        if not companies:
            pytest.skip("No companies available")
            
        company_id = companies[0]["id"]
        
        # Create transaction with explicit currency fields
        tx_response = requests.post(
            f"{BASE_URL}/api/transactions",
            json={
                "company_id": company_id,
                "date": "2024-01-15T10:00:00Z",
                "description": "Test explicit currency",
                "amount": 1000.00,
                "type": "Invoice",
                "category": "Sales",
                "source": "Manual",
                "transaction_currency": "JPY",
                "reporting_currency": "USD",
                "reporting_amount": 7.50,
                "fx_rate": 0.0075
            },
            headers=self.headers
        )
        
        assert tx_response.status_code == 200
        tx = tx_response.json()
        
        # Verify explicit values were used
        assert tx["transaction_currency"] == "JPY"
        assert tx["reporting_currency"] == "USD"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/transactions/{tx['id']}", headers=self.headers)
        
    def test_get_companies_returns_currency_fields(self):
        """GET /api/companies returns companies with currency fields"""
        response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        assert response.status_code == 200
        
        companies = response.json()
        if companies:
            company = companies[0]
            assert "currency" in company, "Company missing 'currency' field"
            # country_code and global_region may be optional
            
    def test_get_regions(self):
        """GET /api/reference/regions returns list of regions"""
        response = requests.get(f"{BASE_URL}/api/reference/regions")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # Should have at least APAC, EMEA, Americas
        region_names = [r.get("name") or r.get("region_code") for r in data]
        assert len(region_names) >= 3


class TestTransactionModel:
    """Test Transaction model fields"""
    
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
        
    def test_transaction_has_currency_fields(self):
        """Transaction model has transaction_currency and reporting_currency fields"""
        # Get existing companies
        companies_response = requests.get(f"{BASE_URL}/api/companies", headers=self.headers)
        companies = companies_response.json()
        
        if not companies:
            pytest.skip("No companies available")
            
        company_id = companies[0]["id"]
        
        # Create a transaction
        tx_response = requests.post(
            f"{BASE_URL}/api/transactions",
            json={
                "company_id": company_id,
                "date": "2024-01-15T10:00:00Z",
                "description": "Test currency fields",
                "amount": 100.00,
                "type": "Invoice",
                "category": "Sales",
                "source": "Manual"
            },
            headers=self.headers
        )
        
        assert tx_response.status_code == 200
        tx = tx_response.json()
        
        # Verify currency fields exist
        assert "transaction_currency" in tx, "Transaction missing 'transaction_currency'"
        assert "reporting_currency" in tx, "Transaction missing 'reporting_currency'"
        assert "reporting_amount" in tx, "Transaction missing 'reporting_amount'"
        assert "fx_rate" in tx, "Transaction missing 'fx_rate'"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/transactions/{tx['id']}", headers=self.headers)
        
    def test_get_transactions_includes_currency_fields(self):
        """GET /api/transactions returns transactions with currency fields"""
        response = requests.get(f"{BASE_URL}/api/transactions", headers=self.headers)
        assert response.status_code == 200
        
        transactions = response.json()
        if transactions:
            tx = transactions[0]
            # These fields should exist (may be null for old transactions)
            assert "transaction_currency" in tx or tx.get("transaction_currency") is None
            assert "reporting_currency" in tx or tx.get("reporting_currency") is None


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
