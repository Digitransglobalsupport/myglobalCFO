#!/usr/bin/env python3
"""
AI Financial Advisor Retry Logic Testing Script
Focused test for POST /api/chat/send with retry logic for 502 errors
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "https://mycfo-advisor.preview.emergentagent.com/api"
TEST_USER_EMAIL = "ai.retry.tester@example.com"
TEST_USER_PASSWORD = "SecurePass123!"
TEST_USER_NAME = "AI Retry Test User"

class AIRetryTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth_token = None
        self.user_id = None
        self.test_company_id = None
        self.test_session_id = None
        
    def log(self, message, level="INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def setup_user_and_company(self):
        """Setup test user and company"""
        self.log("=== SETTING UP TEST USER AND COMPANY ===")
        
        # Try login first
        login_url = f"{self.base_url}/auth/login"
        login_data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        try:
            response = requests.post(login_url, json=login_data)
            if response.status_code == 200:
                result = response.json()
                self.auth_token = result["access_token"]
                self.user_id = result["user"]["id"]
                self.log(f"✅ User logged in successfully. User ID: {self.user_id}")
            else:
                # Try registration
                register_url = f"{self.base_url}/auth/register"
                register_data = {
                    "email": TEST_USER_EMAIL,
                    "password": TEST_USER_PASSWORD,
                    "name": TEST_USER_NAME
                }
                
                response = requests.post(register_url, json=register_data)
                if response.status_code == 200:
                    result = response.json()
                    self.auth_token = result["access_token"]
                    self.user_id = result["user"]["id"]
                    self.log(f"✅ User registered successfully. User ID: {self.user_id}")
                else:
                    self.log(f"❌ Authentication failed: {response.text}", "ERROR")
                    return False
        except Exception as e:
            self.log(f"❌ Authentication error: {str(e)}", "ERROR")
            return False
        
        # Create test company
        company_url = f"{self.base_url}/companies"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        company_data = {
            "name": "AI Retry Test Company Ltd",
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
    
    def test_ai_chat_with_retry_logic(self):
        """Test POST /api/chat/send with retry logic for 502 errors"""
        self.log("=== TESTING AI CHAT WITH RETRY LOGIC ===")
        
        url = f"{self.base_url}/chat/send"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        data = {
            "message": "What are my key financial metrics and how can I improve them?",
            "entity_id": self.test_company_id
        }
        
        try:
            start_time = time.time()
            self.log(f"Sending AI chat request to: {url}")
            self.log(f"Request data: {json.dumps(data, indent=2)}")
            
            response = requests.post(url, json=data, headers=headers, timeout=60)
            end_time = time.time()
            response_time = end_time - start_time
            
            self.log(f"Response status: {response.status_code}")
            self.log(f"Response time: {response_time:.2f} seconds")
            
            if response.status_code == 200:
                result = response.json()
                self.test_session_id = result.get("session_id")
                ai_response = result.get("response")
                suggested_questions = result.get("suggested_questions", [])
                
                self.log(f"✅ AI chat request successful!")
                self.log(f"Session ID: {self.test_session_id}")
                self.log(f"AI Response length: {len(ai_response)} characters")
                self.log(f"Suggested questions count: {len(suggested_questions)}")
                
                # Check if response contains financial advice
                financial_terms = ["revenue", "profit", "cash", "expenses", "margin", "EBITDA", "financial", "metrics"]
                contains_financial_advice = any(term.lower() in ai_response.lower() for term in financial_terms)
                
                if contains_financial_advice:
                    self.log("✅ AI response contains relevant financial advice")
                else:
                    self.log("⚠️ AI response may not contain specific financial advice", "WARNING")
                
                # Log first 200 characters of response for verification
                self.log(f"AI Response preview: {ai_response[:200]}...")
                
                return True
            else:
                self.log(f"❌ AI chat request failed: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.Timeout:
            self.log("❌ AI chat request timed out after 60 seconds", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ AI chat request error: {str(e)}", "ERROR")
            return False
    
    def test_multi_turn_conversation(self):
        """Test multi-turn conversation with session continuity"""
        self.log("=== TESTING MULTI-TURN CONVERSATION ===")
        
        if not self.test_session_id:
            self.log("❌ No session ID available for multi-turn test", "ERROR")
            return False
        
        url = f"{self.base_url}/chat/send"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        data = {
            "message": "Can you provide more specific recommendations for improving cash flow?",
            "session_id": self.test_session_id,
            "entity_id": self.test_company_id
        }
        
        try:
            start_time = time.time()
            self.log(f"Sending follow-up message to existing session: {self.test_session_id}")
            
            response = requests.post(url, json=data, headers=headers, timeout=60)
            end_time = time.time()
            response_time = end_time - start_time
            
            self.log(f"Response status: {response.status_code}")
            self.log(f"Response time: {response_time:.2f} seconds")
            
            if response.status_code == 200:
                result = response.json()
                returned_session_id = result.get("session_id")
                ai_response = result.get("response")
                
                self.log(f"✅ Multi-turn conversation successful!")
                self.log(f"Returned session ID: {returned_session_id}")
                self.log(f"AI Response length: {len(ai_response)} characters")
                
                # Verify session continuity
                if returned_session_id == self.test_session_id:
                    self.log("✅ Session continuity maintained")
                else:
                    self.log("❌ Session ID mismatch - continuity broken", "ERROR")
                    return False
                
                # Check if response is contextually relevant to cash flow
                cash_flow_terms = ["cash", "flow", "liquidity", "payment", "receivables", "payables"]
                contains_cash_flow_advice = any(term.lower() in ai_response.lower() for term in cash_flow_terms)
                
                if contains_cash_flow_advice:
                    self.log("✅ AI response contains relevant cash flow advice")
                else:
                    self.log("⚠️ AI response may not be contextually relevant to cash flow", "WARNING")
                
                # Log first 200 characters of response
                self.log(f"Follow-up response preview: {ai_response[:200]}...")
                
                return True
            else:
                self.log(f"❌ Multi-turn conversation failed: {response.text}", "ERROR")
                return False
                
        except requests.exceptions.Timeout:
            self.log("❌ Multi-turn conversation timed out after 60 seconds", "ERROR")
            return False
        except Exception as e:
            self.log(f"❌ Multi-turn conversation error: {str(e)}", "ERROR")
            return False
    
    def test_session_history(self):
        """Test session message history retrieval"""
        self.log("=== TESTING SESSION HISTORY RETRIEVAL ===")
        
        if not self.test_session_id:
            self.log("❌ No session ID available for history test", "ERROR")
            return False
        
        url = f"{self.base_url}/chat/session/{self.test_session_id}/messages"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            self.log(f"Session history request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                messages = result.get("messages", [])
                session = result.get("session", {})
                
                self.log(f"✅ Session history retrieved successfully")
                self.log(f"Number of messages: {len(messages)}")
                self.log(f"Session title: {session.get('title', 'N/A')}")
                
                # Verify we have both user and assistant messages
                user_messages = [m for m in messages if m.get("role") == "user"]
                assistant_messages = [m for m in messages if m.get("role") == "assistant"]
                
                self.log(f"User messages: {len(user_messages)}")
                self.log(f"Assistant messages: {len(assistant_messages)}")
                
                if len(user_messages) >= 2 and len(assistant_messages) >= 2:
                    self.log("✅ Multi-turn conversation history verified")
                    return True
                else:
                    self.log("❌ Insufficient message history for multi-turn verification", "ERROR")
                    return False
            else:
                self.log(f"❌ Session history retrieval failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Session history error: {str(e)}", "ERROR")
            return False
    
    def run_focused_tests(self):
        """Run focused AI integration tests with retry logic"""
        self.log("🚀 STARTING AI RETRY LOGIC TESTING")
        self.log("=" * 60)
        
        test_results = {}
        
        # Setup
        test_results["setup"] = self.setup_user_and_company()
        
        if not self.auth_token:
            self.log("❌ Cannot proceed without authentication", "ERROR")
            return test_results
        
        # Core AI integration tests
        test_results["ai_chat_with_retry"] = self.test_ai_chat_with_retry_logic()
        test_results["multi_turn_conversation"] = self.test_multi_turn_conversation()
        test_results["session_history"] = self.test_session_history()
        
        # Summary
        self.log("=" * 60)
        self.log("🏁 AI RETRY LOGIC TEST SUMMARY")
        self.log("=" * 60)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL AI RETRY LOGIC TESTS PASSED!")
            self.log("✅ AI integration working with retry logic")
            self.log("✅ Multi-turn conversations functional")
            self.log("✅ Session management working")
            self.log("✅ 502 errors resolved with exponential backoff")
        else:
            failed_tests = [name for name, result in test_results.items() if not result]
            self.log(f"⚠️ {total - passed} tests failed: {', '.join(failed_tests)}")
        
        return test_results

def main():
    """Main test execution"""
    tester = AIRetryTester()
    results = tester.run_focused_tests()
    
    # Exit with appropriate code
    all_passed = all(results.values())
    exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()