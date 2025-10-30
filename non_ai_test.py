#!/usr/bin/env python3
"""
Test non-AI endpoints to verify they're working correctly
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "https://mycfo-advisor.preview.emergentagent.com/api"
TEST_USER_EMAIL = "non.ai.tester@example.com"
TEST_USER_PASSWORD = "SecurePass123!"
TEST_USER_NAME = "Non AI Test User"

class NonAITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth_token = None
        self.user_id = None
        self.test_company_id = None
        
    def log(self, message, level="INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def setup_user_and_company(self):
        """Setup test user and company"""
        self.log("=== SETTING UP TEST USER AND COMPANY ===")
        
        # Try registration
        register_url = f"{self.base_url}/auth/register"
        register_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        }
        
        try:
            response = requests.post(register_url, json=register_data)
            if response.status_code == 200:
                result = response.json()
                self.auth_token = result["access_token"]
                self.user_id = result["user"]["id"]
                self.log(f"✅ User registered successfully. User ID: {self.user_id}")
            elif "already registered" in response.text:
                # Try login
                login_url = f"{self.base_url}/auth/login"
                login_data = {
                    "email": TEST_USER_EMAIL,
                    "password": TEST_USER_PASSWORD
                }
                response = requests.post(login_url, json=login_data)
                if response.status_code == 200:
                    result = response.json()
                    self.auth_token = result["access_token"]
                    self.user_id = result["user"]["id"]
                    self.log(f"✅ User logged in successfully. User ID: {self.user_id}")
                else:
                    self.log(f"❌ Login failed: {response.text}", "ERROR")
                    return False
            else:
                self.log(f"❌ Registration failed: {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Authentication error: {str(e)}", "ERROR")
            return False
        
        # Create test company
        company_url = f"{self.base_url}/companies"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        company_data = {
            "name": "Non AI Test Company Ltd",
            "country": "UK",
            "currency": "GBP",
            "company_type": "standalone"
        }
        
        try:
            response = requests.post(company_url, json=company_data, headers=headers)
            if response.status_code == 200:
                result = response.json()
                self.test_company_id = result["id"]
                self.log(f"✅ Test company created successfully. Company ID: {self.test_company_id}")
                return True
            else:
                self.log(f"❌ Company creation failed: {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Company creation error: {str(e)}", "ERROR")
            return False
    
    def test_get_chat_sessions(self):
        """Test GET /api/chat/sessions"""
        self.log("=== TESTING GET CHAT SESSIONS ===")
        
        url = f"{self.base_url}/chat/sessions"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                sessions = result.get("sessions", [])
                self.log(f"✅ Chat sessions endpoint working. Sessions count: {len(sessions)}")
                return True
            else:
                self.log(f"❌ Get chat sessions failed: {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Get chat sessions error: {str(e)}", "ERROR")
            return False
    
    def test_get_suggested_questions(self):
        """Test GET /api/chat/suggested-questions"""
        self.log("=== TESTING GET SUGGESTED QUESTIONS ===")
        
        url = f"{self.base_url}/chat/suggested-questions"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                questions = result.get("questions", [])
                self.log(f"✅ Suggested questions endpoint working. Questions count: {len(questions)}")
                
                # Log some example questions
                for i, question in enumerate(questions[:3]):
                    self.log(f"Example question {i+1}: {question}")
                
                return True
            else:
                self.log(f"❌ Get suggested questions failed: {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Get suggested questions error: {str(e)}", "ERROR")
            return False
    
    def test_get_suggested_questions_with_entity(self):
        """Test GET /api/chat/suggested-questions with entity_id"""
        self.log("=== TESTING GET SUGGESTED QUESTIONS WITH ENTITY ===")
        
        url = f"{self.base_url}/chat/suggested-questions"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        params = {"entity_id": self.test_company_id}
        
        try:
            response = requests.get(url, headers=headers, params=params)
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                questions = result.get("questions", [])
                self.log(f"✅ Entity-specific suggested questions working. Questions count: {len(questions)}")
                
                # Log some example questions
                for i, question in enumerate(questions[:3]):
                    self.log(f"Example entity question {i+1}: {question}")
                
                return True
            else:
                self.log(f"❌ Get entity-specific suggested questions failed: {response.text}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Get entity-specific suggested questions error: {str(e)}", "ERROR")
            return False
    
    def run_non_ai_tests(self):
        """Run non-AI endpoint tests"""
        self.log("🚀 STARTING NON-AI ENDPOINT TESTING")
        self.log("=" * 50)
        
        test_results = {}
        
        # Setup
        test_results["setup"] = self.setup_user_and_company()
        
        if not self.auth_token:
            self.log("❌ Cannot proceed without authentication", "ERROR")
            return test_results
        
        # Non-AI endpoint tests
        test_results["get_chat_sessions"] = self.test_get_chat_sessions()
        test_results["get_suggested_questions"] = self.test_get_suggested_questions()
        test_results["get_suggested_questions_with_entity"] = self.test_get_suggested_questions_with_entity()
        
        # Summary
        self.log("=" * 50)
        self.log("🏁 NON-AI ENDPOINT TEST SUMMARY")
        self.log("=" * 50)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL NON-AI ENDPOINTS WORKING!")
        else:
            failed_tests = [name for name, result in test_results.items() if not result]
            self.log(f"⚠️ {total - passed} tests failed: {', '.join(failed_tests)}")
        
        return test_results

def main():
    """Main test execution"""
    tester = NonAITester()
    results = tester.run_non_ai_tests()
    
    # Exit with appropriate code
    all_passed = all(results.values())
    exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()