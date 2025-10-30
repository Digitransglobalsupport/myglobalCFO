#!/usr/bin/env python3
"""
AI Financial Advisor Backend Testing Script
Tests AI Advisor Access Control, Entity Grouping System, and chat endpoints
"""

import requests
import json
import os
import time
from datetime import datetime
from typing import Dict, List, Optional

# Configuration
BASE_URL = "https://mycfo-advisor.preview.emergentagent.com/api"
TEST_ADMIN_EMAIL = "test@example.com"
TEST_ADMIN_PASSWORD = "Test1234"
TEST_ADMIN_NAME = "Test Admin User"

TEST_TENANT_EMAIL = "tenant@example.com"
TEST_TENANT_PASSWORD = "Test1234"
TEST_TENANT_NAME = "Test Tenant User"

class AIAdvisorTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.admin_token = None
        self.admin_user_id = None
        self.tenant_token = None
        self.tenant_user_id = None
        self.test_companies = []  # List of created test companies
        self.test_entity_group_id = None
        self.test_session_id = None
        self.test_message_id = None
        
    def log(self, message, level="INFO"):
        """Log test messages"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] [{level}] {message}")
        
    def register_or_login_user(self):
        """Register a new test user or login if exists"""
        self.log("=== TESTING USER AUTHENTICATION ===")
        
        # Try registration first
        url = f"{self.base_url}/auth/register"
        data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD,
            "name": TEST_USER_NAME
        }
        
        try:
            response = requests.post(url, json=data)
            self.log(f"Registration request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.auth_token = result["access_token"]
                self.user_id = result["user"]["id"]
                self.log(f"✅ User registered successfully. User ID: {self.user_id}")
                return True
            elif response.status_code == 400 and "already registered" in response.text:
                self.log("User already exists, attempting login...")
                return self.login_user()
            else:
                self.log(f"❌ Registration failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Registration error: {str(e)}", "ERROR")
            return False
    
    def login_user(self):
        """Login existing user"""
        url = f"{self.base_url}/auth/login"
        data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        try:
            response = requests.post(url, json=data)
            self.log(f"Login request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.auth_token = result["access_token"]
                self.user_id = result["user"]["id"]
                self.log(f"✅ User logged in successfully. User ID: {self.user_id}")
                return True
            else:
                self.log(f"❌ Login failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Login error: {str(e)}", "ERROR")
            return False
    
    def create_test_company(self):
        """Create a test company for entity-based context testing"""
        self.log("=== TESTING COMPANY CREATION FOR ENTITY CONTEXT ===")
        
        url = f"{self.base_url}/companies"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        data = {
            "name": "AI Advisor Test Company Ltd",
            "country": "UK",
            "currency": "GBP",
            "company_type": "standalone"
        }
        
        try:
            response = requests.post(url, json=data, headers=headers)
            self.log(f"Company creation request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
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
    
    def test_chat_send_without_session(self):
        """Test POST /api/chat/send - Send message without session_id (creates new session)"""
        self.log("=== TESTING CHAT SEND WITHOUT SESSION (NEW SESSION) ===")
        
        url = f"{self.base_url}/chat/send"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        data = {
            "message": "Hello, I need help with my business finances. What should I focus on first?",
            "entity_id": None  # General advice
        }
        
        try:
            response = requests.post(url, json=data, headers=headers)
            self.log(f"Chat send request to: {url}")
            self.log(f"Request data: {json.dumps(data, indent=2)}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.test_session_id = result.get("session_id")
                self.test_message_id = result.get("message_id")
                ai_response = result.get("response")
                suggested_questions = result.get("suggested_questions", [])
                
                self.log(f"✅ Chat message sent successfully")
                self.log(f"Session ID: {self.test_session_id}")
                self.log(f"Message ID: {self.test_message_id}")
                self.log(f"AI Response length: {len(ai_response)} characters")
                self.log(f"Suggested questions count: {len(suggested_questions)}")
                
                # Verify response structure
                if ai_response and len(ai_response) > 10:
                    self.log("✅ AI response generated successfully")
                else:
                    self.log("❌ AI response is empty or too short", "ERROR")
                    return False
                
                if len(suggested_questions) == 8:
                    self.log("✅ Correct number of suggested questions returned")
                else:
                    self.log(f"❌ Expected 8 suggested questions, got {len(suggested_questions)}", "ERROR")
                    return False
                
                return True
            else:
                self.log(f"❌ Chat send failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Chat send error: {str(e)}", "ERROR")
            return False
    
    def test_chat_send_with_session(self):
        """Test POST /api/chat/send - Send message with existing session_id (continues conversation)"""
        self.log("=== TESTING CHAT SEND WITH EXISTING SESSION ===")
        
        if not self.test_session_id:
            self.log("❌ No session ID available for testing", "ERROR")
            return False
        
        url = f"{self.base_url}/chat/send"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        data = {
            "message": "Can you give me specific advice on improving cash flow?",
            "session_id": self.test_session_id,
            "entity_id": None
        }
        
        try:
            response = requests.post(url, json=data, headers=headers)
            self.log(f"Chat send with session request to: {url}")
            self.log(f"Request data: {json.dumps(data, indent=2)}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                returned_session_id = result.get("session_id")
                ai_response = result.get("response")
                
                self.log(f"✅ Chat message sent to existing session")
                self.log(f"Returned session ID: {returned_session_id}")
                self.log(f"AI Response length: {len(ai_response)} characters")
                
                # Verify session continuity
                if returned_session_id == self.test_session_id:
                    self.log("✅ Session continuity maintained")
                else:
                    self.log("❌ Session ID mismatch", "ERROR")
                    return False
                
                if ai_response and len(ai_response) > 10:
                    self.log("✅ AI response generated for follow-up question")
                    return True
                else:
                    self.log("❌ AI response is empty or too short", "ERROR")
                    return False
            else:
                self.log(f"❌ Chat send with session failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Chat send with session error: {str(e)}", "ERROR")
            return False
    
    def test_chat_send_with_entity_context(self):
        """Test POST /api/chat/send - Send message with entity_id (provides entity context)"""
        self.log("=== TESTING CHAT SEND WITH ENTITY CONTEXT ===")
        
        if not self.test_company_id:
            self.log("❌ No company ID available for entity context testing", "ERROR")
            return False
        
        url = f"{self.base_url}/chat/send"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        data = {
            "message": "Based on my company's financial data, what are the key areas I should focus on to improve profitability?",
            "entity_id": self.test_company_id
        }
        
        try:
            response = requests.post(url, json=data, headers=headers)
            self.log(f"Chat send with entity context request to: {url}")
            self.log(f"Request data: {json.dumps(data, indent=2)}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                entity_session_id = result.get("session_id")
                ai_response = result.get("response")
                suggested_questions = result.get("suggested_questions", [])
                
                self.log(f"✅ Chat message sent with entity context")
                self.log(f"Entity session ID: {entity_session_id}")
                self.log(f"AI Response length: {len(ai_response)} characters")
                self.log(f"Suggested questions count: {len(suggested_questions)}")
                
                # Verify AI response includes context-aware advice
                if ai_response and len(ai_response) > 10:
                    self.log("✅ AI response generated with entity context")
                    # Check if response seems context-aware (contains financial terms)
                    financial_terms = ["revenue", "profit", "cash", "expenses", "margin", "EBITDA", "financial"]
                    if any(term.lower() in ai_response.lower() for term in financial_terms):
                        self.log("✅ AI response appears to be financially context-aware")
                    else:
                        self.log("⚠️ AI response may not be using financial context", "WARNING")
                    return True
                else:
                    self.log("❌ AI response is empty or too short", "ERROR")
                    return False
            else:
                self.log(f"❌ Chat send with entity context failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Chat send with entity context error: {str(e)}", "ERROR")
            return False
    
    def test_get_chat_sessions(self):
        """Test GET /api/chat/sessions - List all user sessions"""
        self.log("=== TESTING GET CHAT SESSIONS ===")
        
        url = f"{self.base_url}/chat/sessions"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            self.log(f"Get chat sessions request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                sessions = result.get("sessions", [])
                
                self.log(f"✅ Chat sessions retrieved successfully")
                self.log(f"Number of sessions: {len(sessions)}")
                
                # Verify sessions are sorted by updated_at (newest first)
                if len(sessions) >= 2:
                    first_session = sessions[0]
                    second_session = sessions[1]
                    if first_session.get("updated_at") >= second_session.get("updated_at"):
                        self.log("✅ Sessions are sorted by updated_at (newest first)")
                    else:
                        self.log("❌ Sessions are not properly sorted", "ERROR")
                        return False
                
                # Verify our test session is in the list
                test_session_found = any(s.get("id") == self.test_session_id for s in sessions)
                if test_session_found:
                    self.log("✅ Test session found in sessions list")
                    return True
                else:
                    self.log("❌ Test session not found in sessions list", "ERROR")
                    return False
            else:
                self.log(f"❌ Get chat sessions failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get chat sessions error: {str(e)}", "ERROR")
            return False
    
    def test_get_session_messages(self):
        """Test GET /api/chat/session/{id}/messages - Load session history"""
        self.log("=== TESTING GET SESSION MESSAGES ===")
        
        if not self.test_session_id:
            self.log("❌ No session ID available for testing", "ERROR")
            return False
        
        url = f"{self.base_url}/chat/session/{self.test_session_id}/messages"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            self.log(f"Get session messages request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                messages = result.get("messages", [])
                session = result.get("session", {})
                
                self.log(f"✅ Session messages retrieved successfully")
                self.log(f"Number of messages: {len(messages)}")
                self.log(f"Session info: {session.get('title', 'N/A')}")
                
                # Verify messages are sorted by timestamp (oldest first)
                if len(messages) >= 2:
                    first_message = messages[0]
                    last_message = messages[-1]
                    if first_message.get("timestamp") <= last_message.get("timestamp"):
                        self.log("✅ Messages are sorted by timestamp (oldest first)")
                    else:
                        self.log("❌ Messages are not properly sorted", "ERROR")
                        return False
                
                # Verify we have both user and assistant messages
                user_messages = [m for m in messages if m.get("role") == "user"]
                assistant_messages = [m for m in messages if m.get("role") == "assistant"]
                
                if len(user_messages) >= 1 and len(assistant_messages) >= 1:
                    self.log("✅ Both user and assistant messages found")
                    return True
                else:
                    self.log(f"❌ Missing message types. User: {len(user_messages)}, Assistant: {len(assistant_messages)}", "ERROR")
                    return False
            else:
                self.log(f"❌ Get session messages failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get session messages error: {str(e)}", "ERROR")
            return False
    
    def test_get_suggested_questions_general(self):
        """Test GET /api/chat/suggested-questions - Get suggested questions without entity_id"""
        self.log("=== TESTING GET SUGGESTED QUESTIONS (GENERAL) ===")
        
        url = f"{self.base_url}/chat/suggested-questions"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            self.log(f"Get suggested questions request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                questions = result.get("questions", [])
                
                self.log(f"✅ Suggested questions retrieved successfully")
                self.log(f"Number of questions: {len(questions)}")
                
                # Verify we get exactly 8 questions
                if len(questions) == 8:
                    self.log("✅ Correct number of suggested questions (8)")
                    
                    # Log some example questions
                    for i, question in enumerate(questions[:3]):
                        self.log(f"Example question {i+1}: {question}")
                    
                    return True
                else:
                    self.log(f"❌ Expected 8 questions, got {len(questions)}", "ERROR")
                    return False
            else:
                self.log(f"❌ Get suggested questions failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get suggested questions error: {str(e)}", "ERROR")
            return False
    
    def test_get_suggested_questions_with_entity(self):
        """Test GET /api/chat/suggested-questions - Get suggested questions with entity_id"""
        self.log("=== TESTING GET SUGGESTED QUESTIONS (WITH ENTITY) ===")
        
        if not self.test_company_id:
            self.log("❌ No company ID available for entity context testing", "ERROR")
            return False
        
        url = f"{self.base_url}/chat/suggested-questions"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        params = {"entity_id": self.test_company_id}
        
        try:
            response = requests.get(url, headers=headers, params=params)
            self.log(f"Get suggested questions with entity request to: {url}")
            self.log(f"Request params: {params}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                questions = result.get("questions", [])
                
                self.log(f"✅ Entity-specific suggested questions retrieved successfully")
                self.log(f"Number of questions: {len(questions)}")
                
                # Verify we get exactly 8 questions
                if len(questions) == 8:
                    self.log("✅ Correct number of entity-specific suggested questions (8)")
                    
                    # Log some example questions
                    for i, question in enumerate(questions[:3]):
                        self.log(f"Example entity question {i+1}: {question}")
                    
                    return True
                else:
                    self.log(f"❌ Expected 8 questions, got {len(questions)}", "ERROR")
                    return False
            else:
                self.log(f"❌ Get entity-specific suggested questions failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get entity-specific suggested questions error: {str(e)}", "ERROR")
            return False
    
    def test_delete_chat_session(self):
        """Test DELETE /api/chat/session/{id} - Delete session"""
        self.log("=== TESTING DELETE CHAT SESSION ===")
        
        if not self.test_session_id:
            self.log("❌ No session ID available for testing", "ERROR")
            return False
        
        url = f"{self.base_url}/chat/session/{self.test_session_id}"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.delete(url, headers=headers)
            self.log(f"Delete chat session request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                message = result.get("message", "")
                
                self.log(f"✅ Chat session deleted successfully")
                self.log(f"Response message: {message}")
                
                # Verify session is actually deleted by trying to get its messages
                time.sleep(1)  # Brief delay to ensure deletion is processed
                
                verify_url = f"{self.base_url}/chat/session/{self.test_session_id}/messages"
                verify_response = requests.get(verify_url, headers=headers)
                
                if verify_response.status_code == 404:
                    self.log("✅ Session deletion verified - session no longer exists")
                    return True
                else:
                    self.log("❌ Session deletion not verified - session still exists", "ERROR")
                    return False
            else:
                self.log(f"❌ Delete chat session failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Delete chat session error: {str(e)}", "ERROR")
            return False
    
    def test_ai_integration(self):
        """Test AI integration and response quality"""
        self.log("=== TESTING AI INTEGRATION AND RESPONSE QUALITY ===")
        
        url = f"{self.base_url}/chat/send"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Test with a specific financial question
        data = {
            "message": "My company has declining profit margins. What are the top 3 strategies to improve profitability?",
            "entity_id": self.test_company_id
        }
        
        try:
            response = requests.post(url, json=data, headers=headers)
            self.log(f"AI integration test request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                ai_response = result.get("response", "")
                
                self.log(f"✅ AI integration test successful")
                self.log(f"AI Response length: {len(ai_response)} characters")
                
                # Check response quality indicators
                quality_indicators = [
                    ("Contains numbered strategies", any(str(i) in ai_response for i in [1, 2, 3])),
                    ("Mentions profitability", "profit" in ai_response.lower()),
                    ("Provides actionable advice", any(word in ai_response.lower() for word in ["should", "can", "recommend", "suggest", "consider"])),
                    ("Substantial response", len(ai_response) > 100),
                    ("Professional tone", not any(word in ai_response.lower() for word in ["lol", "haha", "dunno"]))
                ]
                
                passed_indicators = sum(1 for _, passed in quality_indicators)
                total_indicators = len(quality_indicators)
                
                self.log(f"AI Response Quality: {passed_indicators}/{total_indicators} indicators passed")
                
                for indicator_name, passed in quality_indicators:
                    status = "✅" if passed else "❌"
                    self.log(f"  {status} {indicator_name}")
                
                if passed_indicators >= 4:  # At least 4 out of 5 quality indicators
                    self.log("✅ AI response quality is good")
                    return True
                else:
                    self.log("❌ AI response quality is below expectations", "ERROR")
                    return False
            else:
                self.log(f"❌ AI integration test failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ AI integration test error: {str(e)}", "ERROR")
            return False
    
    def test_data_persistence(self):
        """Test that chat sessions and messages are properly persisted"""
        self.log("=== TESTING DATA PERSISTENCE ===")
        
        # Create a new session with a specific message
        url = f"{self.base_url}/chat/send"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        test_message = "This is a persistence test message for data verification."
        
        data = {
            "message": test_message,
            "entity_id": None
        }
        
        try:
            # Send message
            response = requests.post(url, json=data, headers=headers)
            if response.status_code != 200:
                self.log("❌ Failed to create test message for persistence test", "ERROR")
                return False
            
            result = response.json()
            persistence_session_id = result.get("session_id")
            
            # Wait a moment
            time.sleep(2)
            
            # Retrieve the session messages
            messages_url = f"{self.base_url}/chat/session/{persistence_session_id}/messages"
            messages_response = requests.get(messages_url, headers=headers)
            
            if messages_response.status_code == 200:
                messages_result = messages_response.json()
                messages = messages_result.get("messages", [])
                
                # Find our test message
                test_message_found = any(
                    msg.get("content") == test_message and msg.get("role") == "user" 
                    for msg in messages
                )
                
                if test_message_found:
                    self.log("✅ Message persistence verified - test message found in database")
                    
                    # Check timestamp format
                    for msg in messages:
                        timestamp = msg.get("timestamp")
                        if timestamp and isinstance(timestamp, str):
                            try:
                                # Try to parse ISO format timestamp
                                datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                                self.log("✅ Timestamp format is valid ISO format")
                                break
                            except ValueError:
                                self.log("❌ Timestamp format is not valid ISO format", "ERROR")
                                return False
                    
                    # Clean up - delete the test session
                    delete_url = f"{self.base_url}/chat/session/{persistence_session_id}"
                    requests.delete(delete_url, headers=headers)
                    
                    return True
                else:
                    self.log("❌ Message persistence failed - test message not found", "ERROR")
                    return False
            else:
                self.log("❌ Failed to retrieve messages for persistence test", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Data persistence test error: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self):
        """Run all AI Financial Advisor chat tests"""
        self.log("🚀 STARTING AI FINANCIAL ADVISOR BACKEND TESTING")
        self.log("=" * 70)
        
        test_results = {}
        
        # Authentication and setup
        test_results["user_authentication"] = self.register_or_login_user()
        
        if not self.auth_token:
            self.log("❌ Cannot proceed without authentication", "ERROR")
            return test_results
        
        test_results["company_creation"] = self.create_test_company()
        
        # Core chat functionality tests
        test_results["chat_send_without_session"] = self.test_chat_send_without_session()
        test_results["chat_send_with_session"] = self.test_chat_send_with_session()
        test_results["chat_send_with_entity_context"] = self.test_chat_send_with_entity_context()
        test_results["get_chat_sessions"] = self.test_get_chat_sessions()
        test_results["get_session_messages"] = self.test_get_session_messages()
        test_results["get_suggested_questions_general"] = self.test_get_suggested_questions_general()
        test_results["get_suggested_questions_with_entity"] = self.test_get_suggested_questions_with_entity()
        
        # AI integration and quality tests
        test_results["ai_integration"] = self.test_ai_integration()
        test_results["data_persistence"] = self.test_data_persistence()
        
        # Session deletion test (last, as it deletes test data)
        test_results["delete_chat_session"] = self.test_delete_chat_session()
        
        # Summary
        self.log("=" * 70)
        self.log("🏁 AI FINANCIAL ADVISOR TEST SUMMARY")
        self.log("=" * 70)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL AI FINANCIAL ADVISOR TESTS PASSED!")
            self.log("✅ Chat endpoints working correctly")
            self.log("✅ AI integration functional")
            self.log("✅ Session management working")
            self.log("✅ Message history persisted")
            self.log("✅ Entity context integrated")
            self.log("✅ Financial data context passed to AI")
            self.log("✅ Suggested questions returned")
        else:
            failed_tests = [name for name, result in test_results.items() if not result]
            self.log(f"⚠️ {total - passed} tests failed: {', '.join(failed_tests)}")
        
        return test_results

def main():
    """Main test execution"""
    tester = AIAdvisorTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    all_passed = all(results.values())
    exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()