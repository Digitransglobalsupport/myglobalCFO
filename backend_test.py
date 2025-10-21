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

class OCRTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth_token = None
        self.user_id = None
        self.test_company_id = None
        self.test_draft_id = None
        
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
        """Create a test company for OCR testing"""
        self.log("=== TESTING COMPANY CREATION ===")
        
        url = f"{self.base_url}/companies"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        data = {
            "name": "OCR Test Company Ltd",
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
    
    def create_test_receipt_image(self):
        """Create a test receipt image with realistic invoice data"""
        self.log("Creating test receipt image...")
        
        # Create a simple receipt image
        width, height = 400, 600
        image = Image.new('RGB', (width, height), 'white')
        draw = ImageDraw.Draw(image)
        
        # Try to use a default font, fallback to basic if not available
        try:
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
            font_small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
        except:
            font = ImageFont.load_default()
            font_small = ImageFont.load_default()
        
        # Receipt content
        y_pos = 20
        line_height = 25
        
        receipt_lines = [
            "ACME OFFICE SUPPLIES",
            "123 Business Street",
            "London, UK SW1A 1AA",
            "Tel: +44 20 1234 5678",
            "",
            "INVOICE #INV-2025-001",
            "Date: 2025-01-14",
            "Customer: OCR Test Company Ltd",
            "",
            "ITEMS:",
            "Office Chairs x2        £150.00",
            "Desk Supplies          £25.50",
            "Printer Paper (5 pks)  £12.50",
            "Pens & Pencils         £8.75",
            "",
            "Subtotal:              £196.75",
            "VAT (20%):             £39.35",
            "TOTAL:                 £236.10",
            "",
            "Payment Method: Credit Card",
            "Thank you for your business!"
        ]
        
        for line in receipt_lines:
            draw.text((20, y_pos), line, fill='black', font=font_small)
            y_pos += line_height
        
        # Save to temporary file
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        image.save(temp_file.name, 'PNG')
        temp_file.close()
        
        self.log(f"Test receipt image created: {temp_file.name}")
        return temp_file.name
    
    def test_ocr_upload(self):
        """Test OCR file upload endpoint"""
        self.log("=== TESTING OCR UPLOAD ENDPOINT ===")
        
        # Create test receipt image
        image_path = self.create_test_receipt_image()
        
        url = f"{self.base_url}/ocr/upload"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            with open(image_path, 'rb') as f:
                files = {'file': ('test_receipt.png', f, 'image/png')}
                
                self.log(f"OCR upload request to: {url}")
                response = requests.post(url, files=files, headers=headers)
                self.log(f"Response status: {response.status_code}")
                
                if response.status_code == 200:
                    result = response.json()
                    self.test_draft_id = result.get("id")
                    self.log(f"✅ OCR upload successful. Draft ID: {self.test_draft_id}")
                    self.log(f"Extracted data: {json.dumps(result.get('extracted_data', {}), indent=2)}")
                    
                    # Verify required fields
                    if result.get("file_name") and result.get("extracted_data") and result.get("status"):
                        self.log("✅ Response contains all required fields")
                        return True
                    else:
                        self.log("❌ Response missing required fields", "ERROR")
                        return False
                else:
                    self.log(f"❌ OCR upload failed: {response.text}", "ERROR")
                    return False
                    
        except Exception as e:
            self.log(f"❌ OCR upload error: {str(e)}", "ERROR")
            return False
        finally:
            # Clean up temp file
            try:
                os.unlink(image_path)
            except:
                pass
    
    def test_get_ocr_drafts(self):
        """Test getting all OCR drafts"""
        self.log("=== TESTING GET OCR DRAFTS ===")
        
        url = f"{self.base_url}/ocr/drafts"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            # Test without filters
            response = requests.get(url, headers=headers)
            self.log(f"Get drafts request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log(f"✅ Retrieved {len(result)} drafts")
                
                # Test with status filter
                response_filtered = requests.get(f"{url}?status=draft", headers=headers)
                if response_filtered.status_code == 200:
                    filtered_result = response_filtered.json()
                    self.log(f"✅ Filtered drafts (status=draft): {len(filtered_result)} items")
                
                return True
            else:
                self.log(f"❌ Get drafts failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get drafts error: {str(e)}", "ERROR")
            return False
    
    def test_get_single_draft(self):
        """Test getting a single OCR draft"""
        self.log("=== TESTING GET SINGLE DRAFT ===")
        
        if not self.test_draft_id:
            self.log("❌ No draft ID available for testing", "ERROR")
            return False
        
        url = f"{self.base_url}/ocr/drafts/{self.test_draft_id}"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        try:
            response = requests.get(url, headers=headers)
            self.log(f"Get single draft request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Single draft retrieved successfully")
                
                # Verify all fields are present
                required_fields = ["id", "file_name", "extracted_data", "status", "created_at"]
                missing_fields = [field for field in required_fields if field not in result]
                
                if not missing_fields:
                    self.log("✅ All required fields present in response")
                    return True
                else:
                    self.log(f"❌ Missing fields: {missing_fields}", "ERROR")
                    return False
            else:
                self.log(f"❌ Get single draft failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Get single draft error: {str(e)}", "ERROR")
            return False
    
    def test_update_draft(self):
        """Test updating an OCR draft"""
        self.log("=== TESTING UPDATE DRAFT ===")
        
        if not self.test_draft_id:
            self.log("❌ No draft ID available for testing", "ERROR")
            return False
        
        url = f"{self.base_url}/ocr/drafts/{self.test_draft_id}"
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        update_data = {
            "company_id": self.test_company_id,
            "extracted_data": {
                "vendor": "Updated ACME Office Supplies",
                "amount": 250.00,
                "currency": "GBP",
                "date": "2025-01-14",
                "description": "Updated office supplies invoice",
                "suggested_cost_center": "Operations",
                "invoice_number": "INV-2025-001-UPDATED"
            }
        }
        
        try:
            response = requests.put(url, json=update_data, headers=headers)
            self.log(f"Update draft request to: {url}")
            self.log(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                result = response.json()
                self.log("✅ Draft updated successfully")
                
                # Verify the update was applied
                if result.get("extracted_data", {}).get("vendor") == "Updated ACME Office Supplies":
                    self.log("✅ Update data correctly applied")
                    return True
                else:
                    self.log("❌ Update data not correctly applied", "ERROR")
                    return False
            else:
                self.log(f"❌ Update draft failed: {response.text}", "ERROR")
                return False
                
        except Exception as e:
            self.log(f"❌ Update draft error: {str(e)}", "ERROR")
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