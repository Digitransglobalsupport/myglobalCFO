#!/usr/bin/env python3
"""
MyGlobalCFO Backend API Testing
Tests all backend APIs for the Enterprise CFO Agent Platform
"""

import requests
import json
import sys
import os
from datetime import datetime

# Backend URL from frontend .env
BACKEND_URL = "https://progress-bar-repair-1.preview.emergentagent.com/api"

# Test credentials provided
TEST_EMAIL = "demo@myglobalcfo.com"
TEST_PASSWORD = "Demo123456!"
TEST_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNTRlMzE5ZjYtZTU3My00MjljLWFiODYtNDdmODkwNGVjYmE5IiwiZW1haWwiOiJkZW1vQG15Z2xvYmFsY2ZvLmNvbSIsImV4cCI6MTc2ODU1OTQ0Nn0.30k7KuMdQCqHaUyqlAX4dFKbmutlXgwIBRvGW0WxwdI"
COMPANY_ID = "a43efa60-290c-4a36-b62c-e3681d955188"

class MyGlobalCFOTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = TEST_TOKEN
        self.user_id = None
        self.company_id = COMPANY_ID
        self.test_results = []
        
    def log(self, message):
        """Log test messages with timestamp"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {message}")
        
    def get_auth_headers(self):
        """Get authorization headers"""
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    def run_test(self, test_name, test_func):
        """Run a single test and track results"""
        self.log(f"🔍 Testing {test_name}...")
        try:
            result = test_func()
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{status} - {test_name}")
            self.test_results.append((test_name, result))
            return result
        except Exception as e:
            self.log(f"❌ FAIL - {test_name}: {str(e)}")
            self.test_results.append((test_name, False))
            return False
    
    def test_health_check(self):
        """Test GET /api/health"""
        try:
            response = self.session.get(f"{BACKEND_URL}/health")
            if response.status_code == 200:
                data = response.json()
                return "status" in data and data["status"] == "healthy"
            return False
        except Exception as e:
            self.log(f"Health check error: {e}")
            return False
    
    def test_root_endpoint(self):
        """Test GET /api/"""
        try:
            response = self.session.get(f"{BACKEND_URL}/")
            if response.status_code == 200:
                data = response.json()
                return "message" in data and "MyGlobalCFO API" in data["message"]
            return False
        except Exception as e:
            self.log(f"Root endpoint error: {e}")
            return False
    
    def test_auth_me(self):
        """Test GET /api/auth/me"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/auth/me",
                headers=self.get_auth_headers()
            )
            if response.status_code == 200:
                data = response.json()
                self.user_id = data.get("id")
                return "email" in data and data["email"] == TEST_EMAIL
            return False
        except Exception as e:
            self.log(f"Auth me error: {e}")
            return False
    
    def test_auth_login(self):
        """Test POST /api/auth/login"""
        try:
            login_data = {
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            }
            response = self.session.post(f"{BACKEND_URL}/auth/login", json=login_data)
            if response.status_code == 200:
                data = response.json()
                return "token" in data and "user" in data
            return False
        except Exception as e:
            self.log(f"Login error: {e}")
            return False
    
    def test_get_companies(self):
        """Test GET /api/companies"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/companies",
                headers=self.get_auth_headers()
            )
            if response.status_code == 200:
                companies = response.json()
                return isinstance(companies, list)
            return False
        except Exception as e:
            self.log(f"Get companies error: {e}")
            return False
    
    def test_dashboard_metrics(self):
        """Test GET /api/dashboard/{company_id}"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/dashboard/{self.company_id}",
                headers=self.get_auth_headers()
            )
            if response.status_code == 200:
                data = response.json()
                required_fields = ["revenue", "ebitda", "cash_balance", "runway_days"]
                return all(field in data for field in required_fields)
            return False
        except Exception as e:
            self.log(f"Dashboard metrics error: {e}")
            return False
    
    def test_get_transactions(self):
        """Test GET /api/transactions"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/transactions",
                headers=self.get_auth_headers()
            )
            if response.status_code == 200:
                transactions = response.json()
                return isinstance(transactions, list)
            return False
        except Exception as e:
            self.log(f"Get transactions error: {e}")
            return False
    
    def test_seed_demo_data(self):
        """Test POST /api/seed-demo-data"""
        try:
            response = self.session.post(
                f"{BACKEND_URL}/seed-demo-data",
                params={"company_id": self.company_id},
                headers=self.get_auth_headers()
            )
            if response.status_code == 200:
                data = response.json()
                return "message" in data and "transactions_created" in data
            return False
        except Exception as e:
            self.log(f"Seed demo data error: {e}")
            return False
    
    def test_auto_reconciliation(self):
        """Test POST /api/reconciliation/auto-match"""
        try:
            response = self.session.post(
                f"{BACKEND_URL}/reconciliation/auto-match",
                params={"company_id": self.company_id},
                headers=self.get_auth_headers()
            )
            if response.status_code == 200:
                data = response.json()
                required_fields = ["matched_count", "pending_count", "unmatched_count", "newly_matched"]
                return all(field in data for field in required_fields)
            return False
        except Exception as e:
            self.log(f"Auto reconciliation error: {e}")
            return False
    
    def test_finance_sourcing(self):
        """Test GET /api/finance-sourcing"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/finance-sourcing",
                headers=self.get_auth_headers()
            )
            if response.status_code == 200:
                options = response.json()
                return isinstance(options, list) and len(options) > 0
            return False
        except Exception as e:
            self.log(f"Finance sourcing error: {e}")
            return False
    
    def test_integrations(self):
        """Test GET /api/integrations"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/integrations",
                headers=self.get_auth_headers()
            )
            if response.status_code == 200:
                integrations = response.json()
                return isinstance(integrations, list)
            return False
        except Exception as e:
            self.log(f"Integrations error: {e}")
            return False
    
    def test_fpa_overview(self):
        """Test GET /api/fpa/overview"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/fpa/overview",
                headers=self.get_auth_headers()
            )
            if response.status_code == 200:
                data = response.json()
                required_fields = ["planning_dimensions", "planning_versions", "drivers_count"]
                return all(field in data for field in required_fields)
            return False
        except Exception as e:
            self.log(f"FP&A overview error: {e}")
            return False
    
    def test_fpa_versions(self):
        """Test GET /api/fpa/versions"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/fpa/versions",
                headers=self.get_auth_headers()
            )
            if response.status_code == 200:
                versions = response.json()
                return isinstance(versions, list)
            return False
        except Exception as e:
            self.log(f"FP&A versions error: {e}")
            return False
    
    def test_preferences(self):
        """Test GET /api/preferences"""
        try:
            response = self.session.get(
                f"{BACKEND_URL}/preferences",
                headers=self.get_auth_headers()
            )
            if response.status_code == 200:
                prefs = response.json()
                return isinstance(prefs, dict)
            return False
        except Exception as e:
            self.log(f"Preferences error: {e}")
            return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        self.log("🚀 Starting MyGlobalCFO Backend API Tests")
        self.log(f"Backend URL: {BACKEND_URL}")
        self.log(f"Test Email: {TEST_EMAIL}")
        
        # Run all tests
        self.run_test("Health Check", self.test_health_check)
        self.run_test("Root Endpoint", self.test_root_endpoint)
        self.run_test("Auth Me", self.test_auth_me)
        self.run_test("Auth Login", self.test_auth_login)
        self.run_test("Get Companies", self.test_get_companies)
        self.run_test("Dashboard Metrics", self.test_dashboard_metrics)
        self.run_test("Get Transactions", self.test_get_transactions)
        self.run_test("Seed Demo Data", self.test_seed_demo_data)
        self.run_test("Auto Reconciliation", self.test_auto_reconciliation)
        self.run_test("Finance Sourcing", self.test_finance_sourcing)
        self.run_test("Integrations", self.test_integrations)
        self.run_test("FP&A Overview", self.test_fpa_overview)
        self.run_test("FP&A Versions", self.test_fpa_versions)
        self.run_test("User Preferences", self.test_preferences)
        
        # Summary
        self.print_summary()
        
        # Return success if all tests passed
        return all(result for _, result in self.test_results)
    
    def print_summary(self):
        """Print test summary"""
        self.log("\n" + "="*60)
        self.log("📊 BACKEND API TEST SUMMARY")
        self.log("="*60)
        
        passed = sum(1 for _, result in self.test_results if result)
        failed = len(self.test_results) - passed
        
        for test_name, result in self.test_results:
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{status} - {test_name}")
        
        self.log("="*60)
        self.log(f"Total Tests: {len(self.test_results)} | Passed: {passed} | Failed: {failed}")
        
        if failed == 0:
            self.log("🎉 ALL BACKEND TESTS PASSED!")
        else:
            self.log(f"⚠️ {failed} test(s) failed - see details above")

def main():
    """Main test execution"""
    tester = MyGlobalCFOTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()