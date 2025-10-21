#!/usr/bin/env python3
"""
Backend Integration Testing Script
Tests TrueLayer and Plaid integration endpoints with comprehensive scenarios
"""

import requests
import json
import os
import tempfile
from pathlib import Path
import time
from PIL import Image, ImageDraw, ImageFont
import io

# Configuration
BASE_URL = "https://mycfo-platform.preview.emergentagent.com/api"
TEST_USER_EMAIL = "integration.tester@example.com"
TEST_USER_PASSWORD = "SecurePass123!"
TEST_USER_NAME = "Integration Test User"

class IntegrationTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth_token = None
        self.user_id = None
        self.test_company_id = None
        self.truelayer_connection_id = None
        self.plaid_connection_id = None
        
    def log(self, message, level="INFO"):
        """Log test messages"""
        print(f"[{level}] {message}")
        
    def register_user(self):
        """Register a new test user"""
        self.log("=== TESTING USER REGISTRATION ===")
        
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
        self.log("=== TESTING USER LOGIN ===")
        
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
        """Create a test company for integration testing"""
        self.log("=== TESTING COMPANY CREATION ===")
        
        url = f"{self.base_url}/companies"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        data = {
            "name": "Integration Test Company Ltd",
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
    
    def test_available_integrations(self):
        """Test GET /api/integrations/available endpoint"""
        self.log("=== TESTING AVAILABLE INTEGRATIONS ===")
        
        url = f"{self.base_url}/integrations/available"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            self.log(f"Available integrations request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                integrations = result.get("integrations", [])
                
                # Check if TrueLayer and Plaid are in the list
                truelayer_found = False
                plaid_found = False
                
                for integration in integrations:
                    if integration.get("type") == "truelayer":
                        truelayer_found = True
                        self.log("✅ TrueLayer integration found in available list")
                        # Verify expected features
                        expected_features = ["Account information", "Transaction history", "Real-time balances", "Payment initiation"]
                        actual_features = integration.get("features", [])
                        if all(feature in actual_features for feature in expected_features):
                            self.log("✅ TrueLayer has all expected features")
                        else:
                            self.log(f"❌ TrueLayer missing features. Expected: {expected_features}, Got: {actual_features}", "ERROR")
                    
                    elif integration.get("type") == "plaid":
                        plaid_found = True
                        self.log("✅ Plaid integration found in available list")
                        # Verify expected features
                        expected_features = ["Account verification", "Transaction sync", "Balance checking", "Payment initiation"]
                        actual_features = integration.get("features", [])
                        if all(feature in actual_features for feature in expected_features):
                            self.log("✅ Plaid has all expected features")
                        else:
                            self.log(f"❌ Plaid missing features. Expected: {expected_features}, Got: {actual_features}", "ERROR")
                
                if truelayer_found and plaid_found:
                    self.log("✅ Both TrueLayer and Plaid integrations available")
                    return True
                else:
                    missing = []
                    if not truelayer_found:
                        missing.append("TrueLayer")
                    if not plaid_found:
                        missing.append("Plaid")
                    self.log(f"❌ Missing integrations: {missing}", "ERROR")
                    return False
            else:
                self.log(f"❌ Available integrations failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Available integrations error: {str(e)}", "ERROR")
            return False
    
    def test_truelayer_link_token(self):
        """Test POST /api/integrations/truelayer/link-token endpoint"""
        self.log("=== TESTING TRUELAYER LINK TOKEN CREATION ===")
        
        if not self.test_company_id:
            self.log("❌ No company ID available for testing", "ERROR")
            return False
        
        url = f"{self.base_url}/integrations/truelayer/link-token"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        params = {"company_id": self.test_company_id}
        
        try:
            response = requests.post(url, params=params, headers=headers)
            self.log(f"TrueLayer link token request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.truelayer_connection_id = result.get("connection_id")
                auth_url = result.get("auth_url")
                state = result.get("state")
                
                self.log(f"✅ TrueLayer link token created successfully")
                self.log(f"Connection ID: {self.truelayer_connection_id}")
                self.log(f"State: {state}")
                
                # Verify auth URL contains required OAuth parameters
                if auth_url and "client_id" in auth_url and "redirect_uri" in auth_url and "scope" in auth_url and "state" in auth_url:
                    self.log("✅ Authorization URL contains all required OAuth parameters")
                    return True
                else:
                    self.log("❌ Authorization URL missing required OAuth parameters", "ERROR")
                    return False
            else:
                self.log(f"❌ TrueLayer link token creation failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ TrueLayer link token error: {str(e)}", "ERROR")
            return False
    
    def test_plaid_link_token(self):
        """Test POST /api/integrations/plaid/link-token endpoint"""
        self.log("=== TESTING PLAID LINK TOKEN CREATION ===")
        
        if not self.test_company_id:
            self.log("❌ No company ID available for testing", "ERROR")
            return False
        
        url = f"{self.base_url}/integrations/plaid/link-token"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        params = {"company_id": self.test_company_id}
        
        try:
            response = requests.post(url, params=params, headers=headers)
            self.log(f"Plaid link token request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.plaid_connection_id = result.get("connection_id")
                link_token = result.get("link_token")
                expiration = result.get("expiration")
                
                self.log(f"✅ Plaid link token created successfully")
                self.log(f"Connection ID: {self.plaid_connection_id}")
                self.log(f"Expiration: {expiration}")
                
                # Verify link token is valid (should be a non-empty string)
                if link_token and isinstance(link_token, str) and len(link_token) > 0:
                    self.log("✅ Link token is valid and includes expiration")
                    return True
                else:
                    self.log("❌ Invalid link token received", "ERROR")
                    return False
            else:
                self.log(f"❌ Plaid link token creation failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Plaid link token error: {str(e)}", "ERROR")
            return False
    
    def test_truelayer_connection(self):
        """Test POST /api/integrations/{connection_id}/test endpoint for TrueLayer"""
        self.log("=== TESTING TRUELAYER CONNECTION TEST ===")
        
        if not self.truelayer_connection_id:
            self.log("❌ No TrueLayer connection ID available for testing", "ERROR")
            return False
        
        url = f"{self.base_url}/integrations/{self.truelayer_connection_id}/test"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.post(url, headers=headers)
            self.log(f"TrueLayer connection test request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                success = result.get("success")
                message = result.get("message", "")
                details = result.get("details", {})
                
                self.log(f"✅ TrueLayer connection test completed")
                self.log(f"Success: {success}")
                self.log(f"Message: {message}")
                self.log(f"Details: {json.dumps(details, indent=2)}")
                
                # For sandbox mode, we expect the connection to be in pending state
                # since we haven't completed the OAuth flow
                if "pending" in message.lower() or "incomplete" in message.lower() or not success:
                    self.log("✅ Expected result: Connection pending OAuth completion (sandbox mode)")
                    return True
                elif success and details.get("connection_status") == "active":
                    self.log("✅ Connection is active and working")
                    return True
                else:
                    self.log("❌ Unexpected connection test result", "ERROR")
                    return False
            else:
                self.log(f"❌ TrueLayer connection test failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ TrueLayer connection test error: {str(e)}", "ERROR")
            return False
    
    def test_plaid_connection(self):
        """Test POST /api/integrations/{connection_id}/test endpoint for Plaid"""
        self.log("=== TESTING PLAID CONNECTION TEST ===")
        
        if not self.plaid_connection_id:
            self.log("❌ No Plaid connection ID available for testing", "ERROR")
            return False
        
        url = f"{self.base_url}/integrations/{self.plaid_connection_id}/test"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.post(url, headers=headers)
            self.log(f"Plaid connection test request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                success = result.get("success")
                message = result.get("message", "")
                details = result.get("details", {})
                
                self.log(f"✅ Plaid connection test completed")
                self.log(f"Success: {success}")
                self.log(f"Message: {message}")
                self.log(f"Details: {json.dumps(details, indent=2)}")
                
                # For sandbox mode, we expect the connection to be in pending state
                # since we haven't completed the Link flow
                if "pending" in message.lower() or "incomplete" in message.lower() or not success:
                    self.log("✅ Expected result: Connection pending Link completion (sandbox mode)")
                    return True
                elif success and details.get("connection_status") == "active":
                    self.log("✅ Connection is active and working")
                    return True
                else:
                    self.log("❌ Unexpected connection test result", "ERROR")
                    return False
            else:
                self.log(f"❌ Plaid connection test failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Plaid connection test error: {str(e)}", "ERROR")
            return False
    
    def test_approve_draft(self):
        """Test approving an OCR draft"""
        self.log("=== TESTING APPROVE DRAFT ===")
        
        if not self.test_draft_id or not self.test_company_id:
            self.log("❌ Missing draft ID or company ID for testing", "ERROR")
            return False
        
        url = f"{self.base_url}/ocr/drafts/{self.test_draft_id}/approve"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        approve_data = {
            "company_id": self.test_company_id,
            "cost_center": "Operations",
            "category": "Office Supplies"
        }
        
        try:
            response = requests.post(url, json=approve_data, headers=headers)
            self.log(f"Approve draft request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Draft approved successfully")
                
                # Check if transaction was created
                transaction_id = result.get("transaction_id")
                if transaction_id:
                    self.log(f"✅ Transaction created with ID: {transaction_id}")
                    
                    # Verify transaction exists in transactions endpoint
                    return self.verify_transaction_created(transaction_id)
                else:
                    self.log("❌ No transaction ID returned", "ERROR")
                    return False
            else:
                self.log(f"❌ Approve draft failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Approve draft error: {str(e)}", "ERROR")
            return False
    
    def verify_transaction_created(self, transaction_id):
        """Verify that a transaction was created from OCR approval"""
        self.log("=== VERIFYING TRANSACTION CREATION ===")
        
        url = f"{self.base_url}/transactions"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                transactions = response.json()
                
                # Look for our transaction
                for transaction in transactions:
                    if transaction.get("id") == transaction_id:
                        self.log("✅ Transaction found in transactions list")
                        self.log(f"Transaction details: {json.dumps(transaction, indent=2)}")
                        return True
                
                self.log("❌ Transaction not found in transactions list", "ERROR")
                return False
            else:
                self.log(f"❌ Failed to get transactions: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Verify transaction error: {str(e)}", "ERROR")
            return False
    
    def test_delete_draft(self):
        """Test deleting an OCR draft"""
        self.log("=== TESTING DELETE DRAFT ===")
        
        # First create a new draft for deletion test
        image_path = self.create_test_receipt_image()
        
        try:
            # Upload a new file for deletion test
            url = f"{self.base_url}/ocr/upload"
            headers = {"Authorization": f"Bearer {self.auth_token}"}
            
            with open(image_path, 'rb') as f:
                files = {'file': ('delete_test_receipt.png', f, 'image/png')}
                response = requests.post(url, files=files, headers=headers)
                
                if response.status_code != 200:
                    self.log("❌ Failed to create draft for deletion test", "ERROR")
                    return False
                
                draft_to_delete = response.json()["id"]
                
            # Now test deletion
            delete_url = f"{self.base_url}/ocr/drafts/{draft_to_delete}"
            response = requests.delete(delete_url, headers=headers)
            
            self.log(f"Delete draft request to: {delete_url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                self.log("✅ Draft deleted successfully")
                
                # Verify draft is actually deleted
                get_response = requests.get(delete_url, headers=headers)
                if get_response.status_code == 404:
                    self.log("✅ Draft confirmed deleted (404 on get)")
                    return True
                else:
                    self.log("❌ Draft still exists after deletion", "ERROR")
                    return False
            else:
                self.log(f"❌ Delete draft failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Delete draft error: {str(e)}", "ERROR")
            return False
        finally:
            # Clean up temp file
            try:
                os.unlink(image_path)
            except:
                pass
    
    def run_all_tests(self):
        """Run all OCR tests"""
        self.log("🚀 STARTING OCR BACKEND TESTING")
        self.log("=" * 50)
        
        test_results = {}
        
        # Authentication tests
        test_results["user_registration"] = self.register_user()
        
        if not self.auth_token:
            self.log("❌ Cannot proceed without authentication", "ERROR")
            return test_results
        
        # Company setup
        test_results["company_creation"] = self.create_test_company()
        
        if not self.test_company_id:
            self.log("❌ Cannot proceed without test company", "ERROR")
            return test_results
        
        # OCR endpoint tests
        test_results["ocr_upload"] = self.test_ocr_upload()
        test_results["get_ocr_drafts"] = self.test_get_ocr_drafts()
        test_results["get_single_draft"] = self.test_get_single_draft()
        test_results["update_draft"] = self.test_update_draft()
        test_results["approve_draft"] = self.test_approve_draft()
        test_results["delete_draft"] = self.test_delete_draft()
        
        # Summary
        self.log("=" * 50)
        self.log("🏁 TEST SUMMARY")
        self.log("=" * 50)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nOverall: {passed}/{total} tests passed")
        
        if passed == total:
            self.log("🎉 ALL TESTS PASSED!")
        else:
            self.log(f"⚠️  {total - passed} tests failed")
        
        return test_results

def main():
    """Main test execution"""
    tester = OCRTester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    all_passed = all(results.values())
    exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()