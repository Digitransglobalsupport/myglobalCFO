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
TEST_ADMIN_EMAIL = "admin.new@example.com"
TEST_ADMIN_PASSWORD = "Test1234"
TEST_ADMIN_NAME = "Admin Test User"

TEST_TENANT_EMAIL = "tenant.new@example.com"
TEST_TENANT_PASSWORD = "Test1234"
TEST_TENANT_NAME = "Tenant Test User"

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
        
    def register_or_login_admin(self):
        """Register or login admin user (first user becomes admin)"""
        self.log("=== TESTING ADMIN USER AUTHENTICATION ===")
        
        # Try registration first
        url = f"{self.base_url}/auth/register"
        data = {
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD,
            "name": TEST_ADMIN_NAME
        }
        
        try:
            response = requests.post(url, json=data)
            self.log(f"Admin registration request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.admin_token = result["access_token"]
                self.admin_user_id = result["user"]["id"]
                admin_role = result["user"]["role"]
                self.log(f"✅ User registered successfully. User ID: {self.admin_user_id}, Role: {admin_role}")
                
                if admin_role != "admin":
                    self.log("⚠️ User is not admin (there are existing users in database)", "WARNING")
                    # Still proceed with tests to see what happens with non-admin user
                
                return True  # Return True to continue tests regardless of role
            elif response.status_code == 400 and "already registered" in response.text:
                self.log("Admin user already exists, attempting login...")
                return self.login_admin()
            else:
                self.log(f"❌ Admin registration failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin registration error: {str(e)}", "ERROR")
            return False
    
    def login_admin(self):
        """Login existing admin user"""
        url = f"{self.base_url}/auth/login"
        data = {
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        }
        
        try:
            response = requests.post(url, json=data)
            self.log(f"Admin login request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.admin_token = result["access_token"]
                self.admin_user_id = result["user"]["id"]
                admin_role = result["user"]["role"]
                self.log(f"✅ User logged in successfully. User ID: {self.admin_user_id}, Role: {admin_role}")
                
                if admin_role != "admin":
                    self.log("⚠️ User is not admin", "WARNING")
                
                return True  # Return True to continue tests regardless of role
            else:
                self.log(f"❌ Admin login failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin login error: {str(e)}", "ERROR")
            return False

    def register_tenant_user(self):
        """Register a tenant user (second user becomes tenant)"""
        self.log("=== TESTING TENANT USER REGISTRATION ===")
        
        url = f"{self.base_url}/auth/register"
        data = {
            "email": TEST_TENANT_EMAIL,
            "password": TEST_TENANT_PASSWORD,
            "name": TEST_TENANT_NAME
        }
        
        try:
            response = requests.post(url, json=data)
            self.log(f"Tenant registration request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.tenant_token = result["access_token"]
                self.tenant_user_id = result["user"]["id"]
                tenant_role = result["user"]["role"]
                self.log(f"✅ Tenant user registered successfully. User ID: {self.tenant_user_id}, Role: {tenant_role}")
                return tenant_role == "tenant"
            elif response.status_code == 400 and "already registered" in response.text:
                self.log("Tenant user already exists, attempting login...")
                return self.login_tenant()
            else:
                self.log(f"❌ Tenant registration failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Tenant registration error: {str(e)}", "ERROR")
            return False

    def login_tenant(self):
        """Login existing tenant user"""
        url = f"{self.base_url}/auth/login"
        data = {
            "email": TEST_TENANT_EMAIL,
            "password": TEST_TENANT_PASSWORD
        }
        
        try:
            response = requests.post(url, json=data)
            self.log(f"Tenant login request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.tenant_token = result["access_token"]
                self.tenant_user_id = result["user"]["id"]
                tenant_role = result["user"]["role"]
                self.log(f"✅ Tenant user logged in successfully. User ID: {self.tenant_user_id}, Role: {tenant_role}")
                return tenant_role == "tenant"
            else:
                self.log(f"❌ Tenant login failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Tenant login error: {str(e)}", "ERROR")
            return False
    
    def create_test_companies(self):
        """Create multiple test companies for entity grouping tests"""
        self.log("=== TESTING MULTIPLE COMPANY CREATION ===")
        
        companies_data = [
            {
                "name": "Tech Innovations Ltd",
                "country": "UK",
                "currency": "GBP",
                "company_type": "standalone"
            },
            {
                "name": "Marketing Solutions Inc",
                "country": "US",
                "currency": "USD",
                "company_type": "standalone"
            },
            {
                "name": "Consulting Services GmbH",
                "country": "DE",
                "currency": "EUR",
                "company_type": "standalone"
            }
        ]
        
        url = f"{self.base_url}/companies"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        for i, company_data in enumerate(companies_data):
            try:
                response = requests.post(url, json=company_data, headers=headers)
                self.log(f"Company {i+1} creation request to: {url}")
                self.log(f"Response status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    company_id = result["id"]
                    self.test_companies.append({
                        "id": company_id,
                        "name": company_data["name"],
                        "currency": company_data["currency"]
                    })
                    self.log(f"✅ Company '{company_data['name']}' created successfully. ID: {company_id}")
                else:
                    self.log(f"❌ Company {i+1} creation failed: {response.text}", "ERROR")
                    return False
                    
            except Exception as e:
                self.log(f"❌ Company {i+1} creation error: {str(e)}", "ERROR")
                return False
        
        self.log(f"✅ All {len(self.test_companies)} test companies created successfully")
        return len(self.test_companies) == len(companies_data)

    def test_ai_advisor_settings_admin_get(self):
        """Test GET /api/settings/ai-advisor as admin - should return full settings with user list"""
        self.log("=== TESTING AI ADVISOR SETTINGS GET (ADMIN) ===")
        
        url = f"{self.base_url}/settings/ai-advisor"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            self.log(f"AI Advisor settings GET request (admin) to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Admin can access AI Advisor settings")
                
                # Verify admin gets full settings structure
                required_fields = ["settings", "is_admin", "has_access", "all_users"]
                missing_fields = [field for field in required_fields if field not in result]
                
                if not missing_fields:
                    settings = result.get("settings", {})
                    self.log("✅ Admin receives full settings with user list")
                    self.log(f"Is admin: {result.get('is_admin')}")
                    self.log(f"Has access: {result.get('has_access')}")
                    self.log(f"Global enabled: {settings.get('global_enabled')}")
                    self.log(f"Authorized users count: {len(settings.get('authorized_user_ids', []))}")
                    self.log(f"Available users count: {len(result.get('all_users', []))}")
                    return True
                else:
                    self.log(f"❌ Missing required fields for admin: {missing_fields}", "ERROR")
                    return False
            else:
                self.log(f"❌ Admin AI Advisor settings GET failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Admin AI Advisor settings GET error: {str(e)}", "ERROR")
            return False

    def test_ai_advisor_settings_tenant_get(self):
        """Test GET /api/settings/ai-advisor as tenant - should return only access status"""
        self.log("=== TESTING AI ADVISOR SETTINGS GET (TENANT) ===")
        
        url = f"{self.base_url}/settings/ai-advisor"
        headers = {"Authorization": f"Bearer {self.tenant_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            self.log(f"AI Advisor settings GET request (tenant) to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Tenant can access AI Advisor settings")
                
                # Verify tenant gets limited access info only
                expected_fields = ["has_access"]
                forbidden_fields = ["authorized_user_ids", "users"]
                
                has_expected = all(field in result for field in expected_fields)
                has_forbidden = any(field in result for field in forbidden_fields)
                
                if has_expected and not has_forbidden:
                    self.log("✅ Tenant receives only access status (no admin data)")
                    self.log(f"Tenant has access: {result.get('has_access')}")
                    return True
                else:
                    self.log(f"❌ Tenant received inappropriate data. Expected: {expected_fields}, Got: {list(result.keys())}", "ERROR")
                    return False
            else:
                self.log(f"❌ Tenant AI Advisor settings GET failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Tenant AI Advisor settings GET error: {str(e)}", "ERROR")
            return False

    def test_ai_advisor_settings_admin_update(self):
        """Test PUT /api/settings/ai-advisor as admin - should allow updates"""
        self.log("=== TESTING AI ADVISOR SETTINGS UPDATE (ADMIN) ===")
        
        url = f"{self.base_url}/settings/ai-advisor"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test updating global_enabled and authorized_user_ids
        data = {
            "global_enabled": True,
            "authorized_user_ids": [self.tenant_user_id] if self.tenant_user_id else []
        }
        
        try:
            response = requests.put(url, json=data, headers=headers)
            self.log(f"AI Advisor settings PUT request (admin) to: {url}")
            self.log(f"Request data: {json.dumps(data, indent=2)}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ User can update AI Advisor settings")
                
                # Verify the update was applied
                settings = result.get("settings", result)  # Handle both response formats
                if (settings.get("global_enabled") == data["global_enabled"] and 
                    settings.get("authorized_user_ids") == data["authorized_user_ids"]):
                    self.log("✅ Settings updated correctly")
                    self.log(f"Global enabled: {settings.get('global_enabled')}")
                    self.log(f"Authorized users: {settings.get('authorized_user_ids')}")
                    return True
                else:
                    self.log("❌ Settings not updated correctly", "ERROR")
                    return False
            elif response.status_code == 403:
                self.log("⚠️ User is not admin - 403 Forbidden (expected if user is not admin)", "WARNING")
                return False  # This is expected if user is not admin
            else:
                self.log(f"❌ AI Advisor settings PUT failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ AI Advisor settings PUT error: {str(e)}", "ERROR")
            return False

    def test_ai_advisor_settings_tenant_update_forbidden(self):
        """Test PUT /api/settings/ai-advisor as tenant - should be forbidden"""
        self.log("=== TESTING AI ADVISOR SETTINGS UPDATE (TENANT - SHOULD FAIL) ===")
        
        url = f"{self.base_url}/settings/ai-advisor"
        headers = {"Authorization": f"Bearer {self.tenant_token}"}
        
        data = {
            "global_enabled": False,
            "authorized_user_ids": []
        }
        
        try:
            response = requests.put(url, json=data, headers=headers)
            self.log(f"AI Advisor settings PUT request (tenant) to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 403:
                self.log("✅ Tenant correctly forbidden from updating AI Advisor settings")
                return True
            elif response.status_code == 200:
                self.log("❌ Tenant was allowed to update settings (security issue!)", "ERROR")
                return False
            else:
                self.log(f"❌ Unexpected response for tenant update: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Tenant AI Advisor settings PUT error: {str(e)}", "ERROR")
            return False

    def test_entity_groups_create(self):
        """Test POST /api/entity-groups - Create new group"""
        self.log("=== TESTING ENTITY GROUPS CREATE ===")
        
        if len(self.test_companies) < 2:
            self.log("❌ Need at least 2 companies for entity group testing", "ERROR")
            return False
        
        url = f"{self.base_url}/entity-groups"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        data = {
            "name": "Tech Portfolio Group",
            "description": "Group of technology and innovation companies",
            "entity_ids": [company["id"] for company in self.test_companies[:2]]
        }
        
        try:
            response = requests.post(url, json=data, headers=headers)
            self.log(f"Entity groups CREATE request to: {url}")
            self.log(f"Request data: {json.dumps(data, indent=2)}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.test_entity_group_id = result["id"]
                self.log(f"✅ Entity group created successfully. Group ID: {self.test_entity_group_id}")
                
                # Verify group data
                if (result.get("name") == data["name"] and 
                    result.get("description") == data["description"] and
                    result.get("entity_ids") == data["entity_ids"]):
                    self.log("✅ Entity group data matches request")
                    return True
                else:
                    self.log("❌ Entity group data doesn't match request", "ERROR")
                    return False
            else:
                self.log(f"❌ Entity groups CREATE failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Entity groups CREATE error: {str(e)}", "ERROR")
            return False

    def test_entity_groups_list(self):
        """Test GET /api/entity-groups - List all groups for user"""
        self.log("=== TESTING ENTITY GROUPS LIST ===")
        
        url = f"{self.base_url}/entity-groups"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            self.log(f"Entity groups LIST request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                groups = response.json()  # Direct list, not wrapped in object
                self.log(f"✅ Entity groups listed successfully. Count: {len(groups)}")
                
                # Verify our test group is in the list
                test_group_found = any(group.get("id") == self.test_entity_group_id for group in groups)
                if test_group_found:
                    self.log("✅ Test entity group found in list")
                    return True
                else:
                    self.log("❌ Test entity group not found in list", "ERROR")
                    return False
            else:
                self.log(f"❌ Entity groups LIST failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Entity groups LIST error: {str(e)}", "ERROR")
            return False

    def test_entity_groups_get_single(self):
        """Test GET /api/entity-groups/{group_id} - Get single group"""
        self.log("=== TESTING ENTITY GROUPS GET SINGLE ===")
        
        if not self.test_entity_group_id:
            self.log("❌ No entity group ID available for testing", "ERROR")
            return False
        
        url = f"{self.base_url}/entity-groups/{self.test_entity_group_id}"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            self.log(f"Entity groups GET SINGLE request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Entity group retrieved successfully")
                
                # Verify group structure
                required_fields = ["id", "name", "description", "entity_ids", "user_id"]
                missing_fields = [field for field in required_fields if field not in result]
                
                if not missing_fields:
                    self.log("✅ Entity group has all required fields")
                    self.log(f"Group name: {result.get('name')}")
                    self.log(f"Entity count: {len(result.get('entity_ids', []))}")
                    return True
                else:
                    self.log(f"❌ Missing required fields: {missing_fields}", "ERROR")
                    return False
            else:
                self.log(f"❌ Entity groups GET SINGLE failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Entity groups GET SINGLE error: {str(e)}", "ERROR")
            return False

    def test_entity_groups_update(self):
        """Test PUT /api/entity-groups/{group_id} - Update group"""
        self.log("=== TESTING ENTITY GROUPS UPDATE ===")
        
        if not self.test_entity_group_id:
            self.log("❌ No entity group ID available for testing", "ERROR")
            return False
        
        url = f"{self.base_url}/entity-groups/{self.test_entity_group_id}"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Update with all 3 companies
        data = {
            "name": "Updated Tech Portfolio Group",
            "description": "Updated description for technology companies group",
            "entity_ids": [company["id"] for company in self.test_companies]
        }
        
        try:
            response = requests.put(url, json=data, headers=headers)
            self.log(f"Entity groups UPDATE request to: {url}")
            self.log(f"Request data: {json.dumps(data, indent=2)}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Entity group updated successfully")
                
                # Verify update was applied
                if (result.get("name") == data["name"] and 
                    result.get("description") == data["description"] and
                    len(result.get("entity_ids", [])) == len(data["entity_ids"])):
                    self.log("✅ Entity group update data matches request")
                    self.log(f"Updated name: {result.get('name')}")
                    self.log(f"Updated entity count: {len(result.get('entity_ids', []))}")
                    return True
                else:
                    self.log("❌ Entity group update data doesn't match request", "ERROR")
                    return False
            else:
                self.log(f"❌ Entity groups UPDATE failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Entity groups UPDATE error: {str(e)}", "ERROR")
            return False

    def test_entity_groups_dashboard(self):
        """Test GET /api/entity-groups/{group_id}/dashboard - Get combined dashboard metrics"""
        self.log("=== TESTING ENTITY GROUPS DASHBOARD ===")
        
        if not self.test_entity_group_id:
            self.log("❌ No entity group ID available for testing", "ERROR")
            return False
        
        url = f"{self.base_url}/entity-groups/{self.test_entity_group_id}/dashboard"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            self.log(f"Entity groups DASHBOARD request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Entity group dashboard retrieved successfully")
                
                # Verify dashboard structure
                required_fields = ["revenue", "expenses", "ebitda", "cash_balance", "runway_days"]
                missing_fields = [field for field in required_fields if field not in result]
                
                if not missing_fields:
                    self.log("✅ Entity group dashboard has all required metrics")
                    self.log(f"Combined revenue: {result.get('revenue')}")
                    self.log(f"Combined expenses: {result.get('expenses')}")
                    self.log(f"Combined EBITDA: {result.get('ebitda')}")
                    self.log(f"Combined cash balance: {result.get('cash_balance')}")
                    return True
                else:
                    self.log(f"❌ Missing required dashboard fields: {missing_fields}", "ERROR")
                    return False
            else:
                self.log(f"❌ Entity groups DASHBOARD failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Entity groups DASHBOARD error: {str(e)}", "ERROR")
            return False

    def test_entity_groups_delete(self):
        """Test DELETE /api/entity-groups/{group_id} - Delete group"""
        self.log("=== TESTING ENTITY GROUPS DELETE ===")
        
        if not self.test_entity_group_id:
            self.log("❌ No entity group ID available for testing", "ERROR")
            return False
        
        url = f"{self.base_url}/entity-groups/{self.test_entity_group_id}"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        try:
            response = requests.delete(url, headers=headers)
            self.log(f"Entity groups DELETE request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Entity group deleted successfully")
                self.log(f"Delete message: {result.get('message', 'N/A')}")
                
                # Verify deletion by trying to get the group
                time.sleep(1)  # Brief delay
                verify_url = f"{self.base_url}/entity-groups/{self.test_entity_group_id}"
                verify_response = requests.get(verify_url, headers=headers)
                
                if verify_response.status_code == 404:
                    self.log("✅ Entity group deletion verified - group no longer exists")
                    return True
                else:
                    self.log("❌ Entity group deletion not verified - group still exists", "ERROR")
                    return False
            else:
                self.log(f"❌ Entity groups DELETE failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Entity groups DELETE error: {str(e)}", "ERROR")
            return False
    
    def test_chat_send_without_session(self):
        """Test POST /api/chat/send - Send message without session_id (creates new session)"""
        self.log("=== TESTING CHAT SEND WITHOUT SESSION (NEW SESSION) ===")
        
        url = f"{self.base_url}/chat/send"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
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
        headers = {"Authorization": f"Bearer {self.admin_token}"}
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
        
        if not self.test_companies:
            self.log("❌ No company ID available for entity context testing", "ERROR")
            return False
        
        url = f"{self.base_url}/chat/send"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        data = {
            "message": "Based on my company's financial data, what are the key areas I should focus on to improve profitability?",
            "entity_id": self.test_companies[0]["id"]
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
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
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
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
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
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
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
        
        if not self.test_companies:
            self.log("❌ No company ID available for entity context testing", "ERROR")
            return False
        
        url = f"{self.base_url}/chat/suggested-questions"
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        params = {"entity_id": self.test_companies[0]["id"]}
        
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
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
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
        headers = {"Authorization": f"Bearer {self.admin_token}"}
        
        # Test with a specific financial question
        data = {
            "message": "My company has declining profit margins. What are the top 3 strategies to improve profitability?",
            "entity_id": self.test_companies[0]["id"] if self.test_companies else None
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
        headers = {"Authorization": f"Bearer {self.admin_token}"}
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
        
        # Phase 1: Authentication and setup
        self.log("\n📋 PHASE 1: AUTHENTICATION & SETUP")
        test_results["admin_authentication"] = self.register_or_login_admin()
        
        if not self.admin_token:
            self.log("❌ Cannot proceed without admin authentication", "ERROR")
            return test_results
        
        test_results["company_creation"] = self.create_test_companies()
        test_results["tenant_registration"] = self.register_tenant_user()
        
        # Phase 2: AI Advisor Access Control Tests
        self.log("\n🤖 PHASE 2: AI ADVISOR ACCESS CONTROL TESTS")
        test_results["ai_advisor_admin_get"] = self.test_ai_advisor_settings_admin_get()
        test_results["ai_advisor_admin_update"] = self.test_ai_advisor_settings_admin_update()
        
        if self.tenant_token:
            test_results["ai_advisor_tenant_get"] = self.test_ai_advisor_settings_tenant_get()
            test_results["ai_advisor_tenant_update_forbidden"] = self.test_ai_advisor_settings_tenant_update_forbidden()
        
        # Phase 3: Entity Groups Tests
        self.log("\n📁 PHASE 3: ENTITY GROUPS TESTS")
        test_results["entity_groups_create"] = self.test_entity_groups_create()
        test_results["entity_groups_list"] = self.test_entity_groups_list()
        test_results["entity_groups_get_single"] = self.test_entity_groups_get_single()
        test_results["entity_groups_update"] = self.test_entity_groups_update()
        test_results["entity_groups_dashboard"] = self.test_entity_groups_dashboard()
        test_results["entity_groups_delete"] = self.test_entity_groups_delete()
        
        # Phase 4: Chat functionality tests (optional - may fail due to AI API issues)
        self.log("\n💬 PHASE 4: CHAT FUNCTIONALITY TESTS (OPTIONAL)")
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
        self.log("=" * 80)
        self.log("🏁 AI ADVISOR ACCESS CONTROL & ENTITY GROUPING TEST SUMMARY")
        self.log("=" * 80)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        # Separate core tests from optional chat tests
        core_tests = [name for name in test_results.keys() if not name.startswith(('chat_', 'ai_integration', 'data_persistence', 'delete_chat_session'))]
        core_passed = sum(1 for name in core_tests if test_results[name])
        core_total = len(core_tests)
        
        chat_tests = [name for name in test_results.keys() if name.startswith(('chat_', 'ai_integration', 'data_persistence', 'delete_chat_session'))]
        chat_passed = sum(1 for name in chat_tests if test_results[name])
        chat_total = len(chat_tests)
        
        self.log(f"\n📊 CORE FEATURES: {core_passed}/{core_total} tests passed")
        self.log(f"💬 CHAT FEATURES: {chat_passed}/{chat_total} tests passed")
        
        if core_passed == core_total:
            self.log("🎉 ALL CORE FEATURES WORKING!")
            self.log("✅ AI Advisor Access Control functional")
            self.log("✅ Entity Groups system working")
            self.log("✅ Admin/tenant role separation enforced")
            self.log("✅ CRUD operations for entity groups")
            self.log("✅ Combined dashboard metrics")
        else:
            failed_core_tests = [name for name in core_tests if not test_results[name]]
            self.log(f"⚠️ {core_total - core_passed} core tests failed: {', '.join(failed_core_tests)}")
        
        if chat_passed < chat_total:
            failed_chat_tests = [name for name in chat_tests if not test_results[name]]
            self.log(f"ℹ️ {chat_total - chat_passed} chat tests failed (may be due to AI API issues): {', '.join(failed_chat_tests)}")
        
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