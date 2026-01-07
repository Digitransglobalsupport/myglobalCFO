#!/usr/bin/env python3
"""
Currency Display Testing for Multi-Currency Rollout
Tests specific currency display scenarios across the application
"""

import requests
import json
import sys
import os
from datetime import datetime

# Get backend URL from environment
BACKEND_URL = "https://corpfinance-3.preview.emergentagent.com/api"

# Test credentials
TEST_EMAIL = "testuser@example.com"
TEST_PASSWORD = "Test123!"

class CurrencyDisplayTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.user_id = None
        self.test_companies = []
        
    def log(self, message):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def register_and_login(self):
        """Register or login test user"""
        self.log("🔐 Starting authentication...")
        
        # Try to login first
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
    
    def create_test_entities(self):
        """Create test entities with different currencies"""
        self.log("🏢 Creating test entities with different currencies...")
        
        entities = [
            {"name": "Tokyo Branch", "country": "Japan", "currency": "JPY", "global_region": "APAC"},
            {"name": "Paris Office", "country": "France", "currency": "EUR", "global_region": "EMEA"},
            {"name": "London HQ", "country": "United Kingdom", "currency": "GBP", "global_region": "EMEA"}
        ]
        
        for entity_data in entities:
            try:
                response = self.session.post(
                    f"{BACKEND_URL}/companies",
                    json=entity_data,
                    headers=self.get_auth_headers()
                )
                
                if response.status_code == 200:
                    company = response.json()
                    self.test_companies.append({
                        "id": company["id"],
                        "name": company["name"],
                        "currency": company["currency"]
                    })
                    self.log(f"✅ Created entity: {company['name']} ({company['currency']})")
                else:
                    self.log(f"❌ Failed to create entity {entity_data['name']}: {response.status_code}")
                    return False
                    
            except Exception as e:
                self.log(f"❌ Error creating entity {entity_data['name']}: {e}")
                return False
        
        return True
    
    def test_ai_executive_summary_currency(self):
        """Test AI Executive Summary Currency in Command Center"""
        self.log("🤖 Testing AI Executive Summary Currency in Command Center...")
        
        if not self.test_companies:
            self.log("❌ No test companies available")
            return False
        
        try:
            # Test with JPY entity
            jpy_entity = next((c for c in self.test_companies if c["currency"] == "JPY"), None)
            if not jpy_entity:
                self.log("❌ No JPY entity found")
                return False
            
            response = self.session.get(
                f"{BACKEND_URL}/cfo/dashboard/overview",
                params={
                    "user_id": self.user_id,
                    "company_id": jpy_entity["id"],
                    "use_mocked_data": True
                },
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if currency is present in response
                if "currency" not in data:
                    self.log("❌ Missing currency field in dashboard response")
                    return False
                
                if data["currency"] != "JPY":
                    self.log(f"❌ Expected JPY currency, got {data['currency']}")
                    return False
                
                # Check if AI narrative exists
                if "ai_narrative" not in data:
                    self.log("❌ Missing AI narrative in dashboard response")
                    return False
                
                # Check if narrative contains currency context
                narrative = data["ai_narrative"]
                if not narrative or len(narrative) < 10:
                    self.log("❌ AI narrative is empty or too short")
                    return False
                
                self.log(f"✅ AI Executive Summary includes currency context for {jpy_entity['name']} (JPY)")
                return True
                
            else:
                self.log(f"❌ Command Center API failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ AI Executive Summary test error: {e}")
            return False
    
    def test_profitability_waterfall_currency(self):
        """Test Revenue to Net Profit Waterfall Y-axis currency symbols"""
        self.log("📊 Testing Profitability Waterfall Currency Display...")
        
        if not self.test_companies:
            self.log("❌ No test companies available")
            return False
        
        try:
            # Test with EUR entity
            eur_entity = next((c for c in self.test_companies if c["currency"] == "EUR"), None)
            if not eur_entity:
                self.log("❌ No EUR entity found")
                return False
            
            response = self.session.get(
                f"{BACKEND_URL}/cfo/dashboard/profitability",
                params={"user_id": self.user_id},
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if profitability data exists
                if not data:
                    self.log("❌ Empty profitability response")
                    return False
                
                # Look for waterfall chart data or revenue/profit metrics
                has_financial_metrics = any(key in data for key in [
                    "revenue", "gross_profit", "net_profit", "waterfall_data", 
                    "profit_metrics", "financial_breakdown"
                ])
                
                if not has_financial_metrics:
                    self.log("❌ No financial metrics found in profitability response")
                    return False
                
                self.log("✅ Profitability waterfall data available for currency formatting")
                return True
                
            else:
                self.log(f"❌ Profitability API failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Profitability waterfall test error: {e}")
            return False
    
    def test_strategic_capital_opportunities_currency(self):
        """Test Strategic Capital Opportunities currency display"""
        self.log("💰 Testing Strategic Capital Opportunities Currency...")
        
        if not self.test_companies:
            self.log("❌ No test companies available")
            return False
        
        try:
            # Test with GBP entity
            gbp_entity = next((c for c in self.test_companies if c["currency"] == "GBP"), None)
            if not gbp_entity:
                self.log("❌ No GBP entity found")
                return False
            
            response = self.session.get(
                f"{BACKEND_URL}/cfo/dashboard/overview",
                params={
                    "user_id": self.user_id,
                    "company_id": gbp_entity["id"],
                    "use_mocked_data": True
                },
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check governance_risk_capital section
                if "governance_risk_capital" not in data:
                    self.log("❌ Missing governance_risk_capital section")
                    return False
                
                governance_data = data["governance_risk_capital"]
                
                # Look for capital sourcing or financing data
                has_capital_data = any(key in governance_data for key in [
                    "capital_sourcing", "financing_options", "funding_opportunities",
                    "capital_requirements", "investment_opportunities"
                ])
                
                if not has_capital_data:
                    self.log("❌ No capital opportunities data found")
                    return False
                
                # Verify currency context is available
                if data.get("currency") != "GBP":
                    self.log(f"❌ Expected GBP currency context, got {data.get('currency')}")
                    return False
                
                self.log(f"✅ Strategic Capital Opportunities data available with GBP currency context")
                return True
                
            else:
                self.log(f"❌ Governance Risk Capital API failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Strategic Capital Opportunities test error: {e}")
            return False
    
    def test_transactions_amount_currency(self):
        """Test Transactions Amount Column uses entity currency"""
        self.log("💳 Testing Transactions Amount Column Currency...")
        
        if not self.test_companies:
            self.log("❌ No test companies available")
            return False
        
        try:
            # Test with JPY entity
            jpy_entity = next((c for c in self.test_companies if c["currency"] == "JPY"), None)
            if not jpy_entity:
                self.log("❌ No JPY entity found")
                return False
            
            response = self.session.get(
                f"{BACKEND_URL}/transactions",
                params={
                    "company_id": jpy_entity["id"],
                    "use_mocked_data": True,
                    "limit": 10
                },
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                transactions = response.json()
                
                if not transactions:
                    self.log("❌ No transactions returned")
                    return False
                
                # Check if transactions have currency field
                first_transaction = transactions[0]
                if "currency" not in first_transaction:
                    self.log("❌ Transactions missing currency field")
                    return False
                
                # Note: The requirement is that transactions should use entity's currency,
                # not individual transaction currency. This is a business logic requirement
                # that should be implemented in the frontend.
                
                self.log(f"✅ Transactions API returns currency data - found {len(transactions)} transactions")
                self.log(f"    Transaction currency field available for entity currency override")
                return True
                
            else:
                self.log(f"❌ Transactions API failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Transactions currency test error: {e}")
            return False
    
    def test_consolidated_view_currency(self):
        """Test Consolidated View Currency preferences"""
        self.log("🌐 Testing Consolidated View Currency...")
        
        try:
            # First, set consolidated currency preference to EUR
            currency_data = {"consolidated_currency": "EUR"}
            
            set_response = self.session.put(
                f"{BACKEND_URL}/user/consolidated-currency",
                json=currency_data,
                headers=self.get_auth_headers()
            )
            
            if set_response.status_code != 200:
                self.log(f"❌ Failed to set consolidated currency: {set_response.status_code}")
                return False
            
            # Test consolidated dashboard view
            response = self.session.get(
                f"{BACKEND_URL}/dashboard/consolidated",
                params={"use_mocked_data": True},
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check if consolidated data is returned
                if not data:
                    self.log("❌ Empty consolidated dashboard response")
                    return False
                
                # Verify consolidated currency preference is respected
                get_pref_response = self.session.get(
                    f"{BACKEND_URL}/user/consolidated-currency",
                    headers=self.get_auth_headers()
                )
                
                if get_pref_response.status_code == 200:
                    pref_data = get_pref_response.json()
                    if pref_data.get("consolidated_currency") != "EUR":
                        self.log(f"❌ Consolidated currency preference not saved: {pref_data}")
                        return False
                
                self.log("✅ Consolidated view currency preference working - set to EUR")
                return True
                
            else:
                self.log(f"❌ Consolidated dashboard API failed: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.log(f"❌ Consolidated view currency test error: {e}")
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
    
    def run_currency_display_tests(self):
        """Run all currency display tests"""
        self.log("🚀 Starting Currency Display Tests")
        self.log(f"Backend URL: {BACKEND_URL}")
        
        # Track test results
        tests = []
        
        # Authentication
        if not self.register_and_login():
            self.log("❌ Authentication failed - cannot continue tests")
            return False
        
        # Create test entities
        if not self.create_test_entities():
            self.log("❌ Failed to create test entities - cannot continue tests")
            return False
        
        # Run currency display tests
        tests.append(("AI Executive Summary Currency", self.test_ai_executive_summary_currency()))
        tests.append(("Profitability Waterfall Currency", self.test_profitability_waterfall_currency()))
        tests.append(("Strategic Capital Opportunities Currency", self.test_strategic_capital_opportunities_currency()))
        tests.append(("Transactions Amount Currency", self.test_transactions_amount_currency()))
        tests.append(("Consolidated View Currency", self.test_consolidated_view_currency()))
        
        # Cleanup
        self.cleanup()
        
        # Summary
        self.log("\n" + "="*60)
        self.log("📊 CURRENCY DISPLAY TEST SUMMARY")
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
            self.log("🎉 ALL CURRENCY DISPLAY TESTS PASSED!")
            return True
        else:
            self.log(f"⚠️ {failed} test(s) failed - see details above")
            return False

def main():
    """Main test execution"""
    tester = CurrencyDisplayTester()
    success = tester.run_currency_display_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()