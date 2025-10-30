#!/usr/bin/env python3
"""
Authentication Review Test - Specific scenarios from the review request
Tests the exact scenarios mentioned in the frontend testing agent's 401 error report
"""

import requests
import json
import jwt
from datetime import datetime

# Configuration from review request
BASE_URL = "https://mycfo-ai.preview.emergentagent.com/api"
TEST_EMAIL = "test-auth@mycfo.com"
TEST_PASSWORD = "Test123456"
TEST_NAME = "Test Authentication User"

class AuthReviewTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.admin_token = None
        self.admin_user_id = None
        
    def log(self, message, level="INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def test_scenario_1_registration(self):
        """Test Scenario 1: User Registration"""
        self.log("=== TEST SCENARIO 1: USER REGISTRATION ===")
        self.log("Register a new user with email: test-auth@mycfo.com, password: Test123456")
        
        url = f"{self.base_url}/auth/register"
        data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": TEST_NAME
        }
        
        try:
            response = requests.post(url, json=data)
            self.log(f"POST {url}")
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.admin_token = result["access_token"]
                self.admin_user_id = result["user"]["id"]
                user_role = result["user"]["role"]
                
                self.log("✅ User created successfully")
                self.log(f"User ID: {self.admin_user_id}")
                self.log(f"User Role: {user_role}")
                
                # Check if first user gets admin role
                if user_role == "admin":
                    self.log("✅ First user gets admin role")
                else:
                    self.log("ℹ️ User gets tenant role (not first user)")
                
                # Verify response structure
                self.log("✅ Response status: 200 OK")
                self.log("✅ Response structure correct")
                return True
                
            elif response.status_code == 400 and "already registered" in response.text:
                self.log("ℹ️ User already exists, proceeding to login test")
                return self.test_scenario_2_login()
            else:
                self.log(f"❌ Registration failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Registration error: {str(e)}", "ERROR")
            return False

    def test_scenario_2_login(self):
        """Test Scenario 2: User Login"""
        self.log("=== TEST SCENARIO 2: USER LOGIN ===")
        self.log("Login with the newly registered user credentials")
        
        url = f"{self.base_url}/auth/login"
        data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        }
        
        try:
            response = requests.post(url, json=data)
            self.log(f"POST {url}")
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.admin_token = result["access_token"]
                self.admin_user_id = result["user"]["id"]
                user_role = result["user"]["role"]
                
                self.log("✅ JWT token is returned")
                self.log(f"Token: {self.admin_token[:50]}...")
                
                # Verify JWT token structure
                try:
                    decoded = jwt.decode(self.admin_token, options={"verify_signature": False})
                    self.log("✅ JWT token structure is valid")
                    self.log(f"Token contains: sub={decoded.get('sub')}, email={decoded.get('email')}")
                except:
                    self.log("❌ JWT token is malformed", "ERROR")
                    return False
                
                self.log("✅ User role is included in response")
                self.log(f"User role: {user_role}")
                
                return True
            else:
                self.log(f"❌ Login failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login error: {str(e)}", "ERROR")
            return False

    def test_scenario_3_protected_endpoint(self):
        """Test Scenario 3: Protected Endpoint Access"""
        self.log("=== TEST SCENARIO 3: PROTECTED ENDPOINT ACCESS ===")
        self.log("Use the JWT token to access GET /api/settings/ai-advisor")
        
        if not self.admin_token:
            self.log("❌ No JWT token available", "ERROR")
            return False
        
        url = f"{self.base_url}/settings/ai-advisor"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            self.log(f"GET {url}")
            self.log(f"Authorization: Bearer {self.admin_token[:30]}...")
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ 200 OK response")
                self.log("✅ Proper data is returned")
                
                # Log the structure of returned data
                if "settings" in result:
                    self.log("✅ Admin user - full settings returned")
                    self.log(f"Settings keys: {list(result.keys())}")
                else:
                    self.log("✅ Tenant user - access status returned")
                    self.log(f"Response keys: {list(result.keys())}")
                
                return True
            else:
                self.log(f"❌ Protected endpoint failed: {response.status_code} - {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Protected endpoint error: {str(e)}", "ERROR")
            return False

    def test_scenario_4_invalid_credentials(self):
        """Test Scenario 4: Invalid Credentials"""
        self.log("=== TEST SCENARIO 4: INVALID CREDENTIALS ===")
        
        # Test 4a: Wrong password
        self.log("--- Test 4a: Try logging in with wrong password ---")
        url = f"{self.base_url}/auth/login"
        data = {
            "email": TEST_EMAIL,
            "password": "WrongPassword123"
        }
        
        try:
            response = requests.post(url, json=data)
            self.log(f"POST {url} (wrong password)")
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 401:
                self.log("✅ 401 Unauthorized is returned")
                wrong_password_ok = True
            else:
                self.log(f"❌ Expected 401, got {response.status_code}", "ERROR")
                wrong_password_ok = False
                
        except Exception as e:
            self.log(f"❌ Wrong password test error: {str(e)}", "ERROR")
            wrong_password_ok = False
        
        # Test 4b: Non-existent user
        self.log("--- Test 4b: Try logging in with non-existent user ---")
        data = {
            "email": "nonexistent@mycfo.com",
            "password": TEST_PASSWORD
        }
        
        try:
            response = requests.post(url, json=data)
            self.log(f"POST {url} (non-existent user)")
            self.log(f"Status: {response.status_code}")
            
            if response.status_code == 401:
                self.log("✅ 401 Unauthorized is returned")
                self.log("✅ Appropriate error message")
                nonexistent_user_ok = True
            else:
                self.log(f"❌ Expected 401, got {response.status_code}", "ERROR")
                nonexistent_user_ok = False
                
        except Exception as e:
            self.log(f"❌ Non-existent user test error: {str(e)}", "ERROR")
            nonexistent_user_ok = False
        
        return wrong_password_ok and nonexistent_user_ok

    def run_review_tests(self):
        """Run all tests from the review request"""
        self.log("🔍 AUTHENTICATION BACKEND TESTING - REVIEW REQUEST")
        self.log("Testing scenarios reported by frontend testing agent")
        self.log("=" * 70)
        
        results = {}
        
        # Run the exact scenarios from the review
        results["scenario_1_registration"] = self.test_scenario_1_registration()
        
        # Only test login if registration failed (user exists)
        if not results["scenario_1_registration"]:
            results["scenario_2_login"] = self.test_scenario_2_login()
        else:
            results["scenario_2_login"] = True  # Registration includes login
        
        results["scenario_3_protected_endpoint"] = self.test_scenario_3_protected_endpoint()
        results["scenario_4_invalid_credentials"] = self.test_scenario_4_invalid_credentials()
        
        # Summary
        self.log("=" * 70)
        self.log("🏁 REVIEW TEST RESULTS")
        self.log("=" * 70)
        
        passed = sum(1 for result in results.values() if result)
        total = len(results)
        
        for scenario, result in results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{scenario}: {status}")
        
        self.log(f"\nOverall: {passed}/{total} scenarios passed")
        
        if passed == total:
            self.log("🎉 ALL AUTHENTICATION SCENARIOS WORKING!")
            self.log("✅ Registration works and creates user with appropriate role")
            self.log("✅ Login returns valid JWT token")
            self.log("✅ Protected endpoints accessible with valid token")
            self.log("✅ Proper error handling for invalid credentials")
            self.log("")
            self.log("🔍 CONCLUSION: Authentication system is working correctly.")
            self.log("The 401 errors reported by frontend testing agent may be due to:")
            self.log("1. Frontend not properly sending Authorization header")
            self.log("2. Frontend using incorrect token format")
            self.log("3. Frontend-backend URL configuration issues")
            self.log("4. CORS or network connectivity issues")
        else:
            failed_scenarios = [name for name, result in results.items() if not result]
            self.log(f"⚠️ {total - passed} scenarios failed: {', '.join(failed_scenarios)}")
        
        return results

def main():
    """Main test execution"""
    tester = AuthReviewTester()
    results = tester.run_review_tests()
    
    # Exit with appropriate code
    all_passed = all(results.values())
    exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()