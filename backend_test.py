#!/usr/bin/env python3
"""
Backend API Testing for Multi-Currency Display Rollout
Tests currency support across backend APIs and entity management
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://test-deploy-fix.preview.emergentagent.com/api"

# Test credentials
TEST_EMAIL = "testuser@example.com"
TEST_PASSWORD = "Test123!"

class MultiCurrencyTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_companies = []  # Store multiple test companies
        
    def log(self, message):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def register_and_login(self):
        """Register or login test user"""
        self.log("🔐 Starting authentication...")
        
        # Try to register first (in case user doesn't exist)
        register_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Test User"
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/register", json=register_data)
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log(f"✅ User registered successfully: {data['user']['email']}")
                return True
        except Exception as e:
            self.log(f"Registration failed (user may already exist): {e}")
        
        # Try to login
        login_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        try:
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data["access_token"]
                self.user_id = data["user"]["id"]
                self.log(f"✅ User logged in successfully: {data['user']['email']}")
                return True
            else:
                self.log(f"❌ Login failed: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            self.log(f"❌ Login error: {e}")
            return False
    
    def get_auth_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    def test_reference_countries(self):
        """Test GET /api/reference/countries endpoint"""
        self.log("🌍 Testing GET /api/reference/countries...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/reference/countries")
            
            if response.status_code == 200:
                countries = response.json()
                
                # Validate structure
                if not isinstance(countries, list):
                    self.log("❌ Countries response is not a list")
                    return False
                
                if len(countries) == 0:
                    self.log("❌ Countries list is empty")
                    return False
                
                # Check first country structure
                first_country = countries[0]
                required_fields = ["country", "region"]
                
                for field in required_fields:
                    if field not in first_country:
                        self.log(f"❌ Missing field '{field}' in country data")
                        return False
                
                # Check for specific countries and regions
                japan_found = False
                apac_regions = []
                
                for country in countries:
                    if country["country"] == "Japan":
                        japan_found = True
                        if country["region"] != "APAC":
                            self.log(f"❌ Japan should be in APAC region, found: {country['region']}")
                            return False
                    
                    if country["region"] not in apac_regions:
                        apac_regions.append(country["region"])
                
                if not japan_found:
                    self.log("❌ Japan not found in countries list")
                    return False
                
                # Check for all expected regions
                expected_regions = ["APAC", "EMEA", "Americas", "Antarctica & Remote"]
                for region in expected_regions:
                    if region not in apac_regions:
                        self.log(f"❌ Missing region: {region}")
                        return False
                
                self.log(f"✅ Countries endpoint working - {len(countries)} countries found with all regions")
                return True
                
            else:
                self.log(f"❌ Countries endpoint failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Countries endpoint error: {e}")
            return False
    
    def test_reference_currencies(self):
        """Test GET /api/reference/currencies endpoint"""
        self.log("💱 Testing GET /api/reference/currencies...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/reference/currencies")
            
            if response.status_code == 200:
                currencies = response.json()
                
                # Validate structure
                if not isinstance(currencies, list):
                    self.log("❌ Currencies response is not a list")
                    return False
                
                if len(currencies) == 0:
                    self.log("❌ Currencies list is empty")
                    return False
                
                # Check first currency structure
                first_currency = currencies[0]
                required_fields = ["code", "name"]
                
                for field in required_fields:
                    if field not in first_currency:
                        self.log(f"❌ Missing field '{field}' in currency data")
                        return False
                
                # Check for specific currencies
                usd_found = False
                jpy_found = False
                
                for currency in currencies:
                    if currency["code"] == "USD":
                        usd_found = True
                        if currency["name"] != "US Dollar":
                            self.log(f"❌ USD name incorrect: {currency['name']}")
                            return False
                    
                    if currency["code"] == "JPY":
                        jpy_found = True
                        if currency["name"] != "Japanese Yen":
                            self.log(f"❌ JPY name incorrect: {currency['name']}")
                            return False
                
                if not usd_found:
                    self.log("❌ USD not found in currencies list")
                    return False
                
                if not jpy_found:
                    self.log("❌ JPY not found in currencies list")
                    return False
                
                self.log(f"✅ Currencies endpoint working - {len(currencies)} currencies found")
                return True
                
            else:
                self.log(f"❌ Currencies endpoint failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Currencies endpoint error: {e}")
            return False
    
    def test_reference_regions(self):
        """Test GET /api/reference/regions endpoint"""
        self.log("🌐 Testing GET /api/reference/regions...")
        
        try:
            response = self.session.get(f"{BACKEND_URL}/reference/regions")
            
            if response.status_code == 200:
                regions = response.json()
                
                # Validate structure
                if not isinstance(regions, list):
                    self.log("❌ Regions response is not a list")
                    return False
                
                expected_regions = ["APAC", "EMEA", "Americas", "Antarctica & Remote"]
                
                if len(regions) != len(expected_regions):
                    self.log(f"❌ Expected {len(expected_regions)} regions, got {len(regions)}")
                    return False
                
                for region in expected_regions:
                    if region not in regions:
                        self.log(f"❌ Missing region: {region}")
                        return False
                
                self.log(f"✅ Regions endpoint working - all {len(regions)} regions found")
                return True
                
            else:
                self.log(f"❌ Regions endpoint failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Regions endpoint error: {e}")
            return False
    
    def test_create_jpy_company(self):
        """Test POST /api/companies with JPY currency (Japan)"""
        self.log("🏢 Testing POST /api/companies with JPY currency...")
        
        try:
            company_data = {
                "name": "Tokyo Branch",
                "country": "Japan",
                "currency": "JPY",
                "global_region": "APAC"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/companies",
                json=company_data,
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                company = response.json()
                
                # Validate response structure
                required_fields = ["id", "name", "country", "currency", "global_region", "user_id"]
                
                for field in required_fields:
                    if field not in company:
                        self.log(f"❌ Missing field '{field}' in company response")
                        return False
                
                # Validate field values
                if company["currency"] != "JPY":
                    self.log(f"❌ Company currency mismatch: {company['currency']}")
                    return False
                
                if company["country"] != "Japan":
                    self.log(f"❌ Company country mismatch: {company['country']}")
                    return False
                
                # Store company ID for cleanup and further testing
                self.test_companies.append({
                    "id": company["id"],
                    "name": company["name"],
                    "currency": company["currency"]
                })
                
                self.log(f"✅ JPY company created successfully: {company['name']} ({company['currency']})")
                return True
                
            else:
                self.log(f"❌ JPY company creation failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ JPY company creation error: {e}")
            return False
    
    def test_create_eur_company(self):
        """Test POST /api/companies with EUR currency (France)"""
        self.log("🏢 Testing POST /api/companies with EUR currency...")
        
        try:
            company_data = {
                "name": "Paris Office",
                "country": "France",
                "currency": "EUR",
                "global_region": "EMEA"
            }
            
            response = self.session.post(
                f"{BACKEND_URL}/companies",
                json=company_data,
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                company = response.json()
                
                # Validate currency
                if company["currency"] != "EUR":
                    self.log(f"❌ Company currency mismatch: {company['currency']}")
                    return False
                
                # Store company ID for cleanup and further testing
                self.test_companies.append({
                    "id": company["id"],
                    "name": company["name"],
                    "currency": company["currency"]
                })
                
                self.log(f"✅ EUR company created successfully: {company['name']} ({company['currency']})")
                return True
                
            else:
                self.log(f"❌ EUR company creation failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ EUR company creation error: {e}")
            return False
    
    def test_dashboard_currency_field(self):
        """Test GET /api/cfo/dashboard/overview returns currency field"""
        self.log("💱 Testing GET /api/cfo/dashboard/overview for currency field...")
        
        if not self.test_companies:
            self.log("❌ No test companies available for dashboard test")
            return False
        
        try:
            # Test with JPY company
            jpy_company = next((c for c in self.test_companies if c["currency"] == "JPY"), None)
            if not jpy_company:
                self.log("❌ No JPY company found for testing")
                return False
            
            response = self.session.get(
                f"{BACKEND_URL}/cfo/dashboard/overview",
                params={
                    "user_id": self.user_id,
                    "company_id": jpy_company["id"],
                    "use_mocked_data": True
                },
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                dashboard_data = response.json()
                
                # Check if currency field is present
                if "currency" not in dashboard_data:
                    self.log("❌ Missing 'currency' field in dashboard response")
                    return False
                
                # Verify currency matches the company's currency
                if dashboard_data["currency"] != "JPY":
                    self.log(f"❌ Dashboard currency mismatch: expected JPY, got {dashboard_data['currency']}")
                    return False
                
                # Check if company_name is present
                if "company_name" not in dashboard_data:
                    self.log("❌ Missing 'company_name' field in dashboard response")
                    return False
                
                self.log(f"✅ Dashboard returns correct currency: {dashboard_data['currency']} for {dashboard_data['company_name']}")
                return True
                
            else:
                self.log(f"❌ Dashboard endpoint failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Dashboard currency test error: {e}")
            return False
    
    def test_get_consolidated_currency(self):
        """Test GET /api/user/consolidated-currency endpoint"""
        self.log("💰 Testing GET /api/user/consolidated-currency...")
        
        try:
            response = self.session.get(
                f"{BACKEND_URL}/user/consolidated-currency",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate structure
                if "consolidated_currency" not in data:
                    self.log("❌ Missing 'consolidated_currency' field in response")
                    return False
                
                # Should be a valid currency code (USD, EUR, GBP, etc.)
                currency = data["consolidated_currency"]
                if not currency or len(currency) != 3:
                    self.log(f"❌ Invalid currency format: {currency}")
                    return False
                
                self.log(f"✅ Get consolidated currency working - current: {currency}")
                return True
                
            else:
                self.log(f"❌ Get consolidated currency failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Get consolidated currency error: {e}")
            return False
    
    def test_set_consolidated_currency(self):
        """Test PUT /api/user/consolidated-currency endpoint"""
        self.log("💱 Testing PUT /api/user/consolidated-currency...")
        
        try:
            # Set to EUR
            currency_data = {"consolidated_currency": "EUR"}
            
            response = self.session.put(
                f"{BACKEND_URL}/user/consolidated-currency",
                json=currency_data,
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Validate structure
                required_fields = ["consolidated_currency", "message"]
                
                for field in required_fields:
                    if field not in data:
                        self.log(f"❌ Missing field '{field}' in response")
                        return False
                
                if data["consolidated_currency"] != "EUR":
                    self.log(f"❌ Currency not set correctly: {data['consolidated_currency']}")
                    return False
                
                # Verify by getting the currency again
                get_response = self.session.get(
                    f"{BACKEND_URL}/user/consolidated-currency",
                    headers=self.get_auth_headers()
                )
                
                if get_response.status_code == 200:
                    get_data = get_response.json()
                    if get_data["consolidated_currency"] != "EUR":
                        self.log(f"❌ Currency not persisted correctly: {get_data['consolidated_currency']}")
                        return False
                
                self.log(f"✅ Set consolidated currency working - set to: {data['consolidated_currency']}")
                return True
                
            else:
                self.log(f"❌ Set consolidated currency failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Set consolidated currency error: {e}")
            return False
    
    def cleanup(self):
        """Clean up test data"""
        for company in self.test_companies:
            try:
                response = self.session.delete(
                    f"{BACKEND_URL}/companies/{company['id']}",
                    headers=self.get_auth_headers()
                )
                if response.status_code == 200:
                    self.log(f"🧹 Test company cleaned up: {company['name']}")
                else:
                    self.log(f"⚠️ Failed to clean up company {company['name']}: {response.status_code}")
            except Exception as e:
                self.log(f"⚠️ Cleanup error for {company['name']}: {e}")
    
    def run_all_tests(self):
        """Run all Multi-Currency Display tests"""
        self.log("🚀 Starting Multi-Currency Display Backend Tests")
        self.log(f"Backend URL: {BACKEND_URL}")
        
        # Track test results
        tests = []
        
        # Authentication
        if not self.register_and_login():
            self.log("❌ Authentication failed - cannot continue tests")
            return False
        
        # Run all tests
        tests.append(("Reference Countries", self.test_reference_countries()))
        tests.append(("Reference Currencies", self.test_reference_currencies()))
        tests.append(("Reference Regions", self.test_reference_regions()))
        tests.append(("Create JPY Company", self.test_create_jpy_company()))
        tests.append(("Create EUR Company", self.test_create_eur_company()))
        tests.append(("Dashboard Currency Field", self.test_dashboard_currency_field()))
        tests.append(("Get Consolidated Currency", self.test_get_consolidated_currency()))
        tests.append(("Set Consolidated Currency", self.test_set_consolidated_currency()))
        
        # Cleanup
        self.cleanup()
        
        # Summary
        self.log("\n" + "="*60)
        self.log("📊 TEST SUMMARY")
        self.log("="*60)
        
        passed = 0
        failed = 0
        
        for test_name, result in tests:
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{status} - {test_name}")
            if result:
                passed += 1
            else:
                failed += 1
        
        self.log("="*60)
        self.log(f"Total Tests: {len(tests)} | Passed: {passed} | Failed: {failed}")
        
        if failed == 0:
            self.log("🎉 ALL TESTS PASSED - Multi-Currency Display working correctly!")
            return True
        else:
            self.log(f"⚠️ {failed} test(s) failed - see details above")
            return False

def main():
    """Main test execution"""
    tester = MultiCurrencyTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()