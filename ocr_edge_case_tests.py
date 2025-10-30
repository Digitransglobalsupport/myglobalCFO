#!/usr/bin/env python3
"""
Additional OCR Edge Case Testing
Tests error conditions and edge cases
"""

import requests
import json
import tempfile
from PIL import Image
import io

BASE_URL = "https://mycfo-ai.preview.emergentagent.com/api"
TEST_USER_EMAIL = "ocr.tester@example.com"
TEST_USER_PASSWORD = "SecurePass123!"

class OCREdgeCaseTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.auth_token = None
        
    def log(self, message, level="INFO"):
        print(f"[{level}] {message}")
        
    def login_user(self):
        """Login existing user"""
        url = f"{self.base_url}/auth/login"
        data = {
            "email": TEST_USER_EMAIL,
            "password": TEST_USER_PASSWORD
        }
        
        response = requests.post(url, json=data)
        if response.status_code == 200:
            result = response.json()
            self.auth_token = result["access_token"]
            return True
        return False
    
    def test_unauthorized_access(self):
        """Test OCR endpoints without authentication"""
        self.log("=== TESTING UNAUTHORIZED ACCESS ===")
        
        endpoints = [
            "/ocr/drafts",
            "/ocr/drafts/fake-id",
            "/ocr/upload"
        ]
        
        all_unauthorized = True
        
        for endpoint in endpoints:
            url = f"{self.base_url}{endpoint}"
            
            if endpoint == "/ocr/upload":
                # Create dummy file for upload test
                image = Image.new('RGB', (100, 100), 'white')
                temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
                image.save(temp_file.name, 'PNG')
                temp_file.close()
                
                with open(temp_file.name, 'rb') as f:
                    files = {'file': ('test.png', f, 'image/png')}
                    response = requests.post(url, files=files)
            else:
                response = requests.get(url)
            
            if response.status_code == 401:
                self.log(f"✅ {endpoint}: Correctly returns 401 Unauthorized")
            else:
                self.log(f"❌ {endpoint}: Expected 401, got {response.status_code}", "ERROR")
                all_unauthorized = False
        
        return all_unauthorized
    
    def test_invalid_draft_ids(self):
        """Test endpoints with invalid draft IDs"""
        self.log("=== TESTING INVALID DRAFT IDS ===")
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        invalid_ids = ["fake-id", "00000000-0000-0000-0000-000000000000", ""]
        
        all_handled = True
        
        for draft_id in invalid_ids:
            # Test GET single draft
            url = f"{self.base_url}/ocr/drafts/{draft_id}"
            response = requests.get(url, headers=headers)
            
            if response.status_code == 404:
                self.log(f"✅ GET {draft_id}: Correctly returns 404")
            else:
                self.log(f"❌ GET {draft_id}: Expected 404, got {response.status_code}", "ERROR")
                all_handled = False
            
            # Test PUT update draft
            update_data = {"extracted_data": {"vendor": "Test"}}
            response = requests.put(url, json=update_data, headers=headers)
            
            if response.status_code == 404:
                self.log(f"✅ PUT {draft_id}: Correctly returns 404")
            else:
                self.log(f"❌ PUT {draft_id}: Expected 404, got {response.status_code}", "ERROR")
                all_handled = False
            
            # Test DELETE draft
            response = requests.delete(url, headers=headers)
            
            if response.status_code == 404:
                self.log(f"✅ DELETE {draft_id}: Correctly returns 404")
            else:
                self.log(f"❌ DELETE {draft_id}: Expected 404, got {response.status_code}", "ERROR")
                all_handled = False
        
        return all_handled
    
    def test_invalid_file_uploads(self):
        """Test OCR upload with invalid files"""
        self.log("=== TESTING INVALID FILE UPLOADS ===")
        
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        url = f"{self.base_url}/ocr/upload"
        
        all_handled = True
        
        # Test with no file
        response = requests.post(url, headers=headers)
        if response.status_code in [400, 422]:
            self.log("✅ No file: Correctly handled")
        else:
            self.log(f"❌ No file: Expected 400/422, got {response.status_code}", "ERROR")
            all_handled = False
        
        # Test with empty file
        empty_file = io.BytesIO(b"")
        files = {'file': ('empty.txt', empty_file, 'text/plain')}
        response = requests.post(url, files=files, headers=headers)
        
        if response.status_code in [400, 422, 500]:
            self.log("✅ Empty file: Correctly handled")
        else:
            self.log(f"❌ Empty file: Expected error, got {response.status_code}", "ERROR")
            all_handled = False
        
        return all_handled
    
    def test_approve_nonexistent_company(self):
        """Test approving draft with nonexistent company"""
        self.log("=== TESTING APPROVE WITH INVALID COMPANY ===")
        
        # First create a draft
        headers = {"Authorization": f"Bearer {self.auth_token}"}
        
        # Create test image
        image = Image.new('RGB', (200, 200), 'white')
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.png')
        image.save(temp_file.name, 'PNG')
        temp_file.close()
        
        # Upload file
        with open(temp_file.name, 'rb') as f:
            files = {'file': ('test.png', f, 'image/png')}
            response = requests.post(f"{self.base_url}/ocr/upload", files=files, headers=headers)
        
        if response.status_code != 200:
            self.log("❌ Failed to create test draft", "ERROR")
            return False
        
        draft_id = response.json()["id"]
        
        # Try to approve with fake company ID
        approve_data = {
            "company_id": "fake-company-id",
            "cost_center": "Test",
            "category": "Test"
        }
        
        response = requests.post(
            f"{self.base_url}/ocr/drafts/{draft_id}/approve",
            json=approve_data,
            headers=headers
        )
        
        if response.status_code == 404:
            self.log("✅ Invalid company ID: Correctly returns 404")
            return True
        else:
            self.log(f"❌ Invalid company ID: Expected 404, got {response.status_code}", "ERROR")
            return False
    
    def run_edge_case_tests(self):
        """Run all edge case tests"""
        self.log("🧪 STARTING OCR EDGE CASE TESTING")
        self.log("=" * 50)
        
        if not self.login_user():
            self.log("❌ Failed to login", "ERROR")
            return {}
        
        test_results = {}
        test_results["unauthorized_access"] = self.test_unauthorized_access()
        test_results["invalid_draft_ids"] = self.test_invalid_draft_ids()
        test_results["invalid_file_uploads"] = self.test_invalid_file_uploads()
        test_results["approve_invalid_company"] = self.test_approve_nonexistent_company()
        
        # Summary
        self.log("=" * 50)
        self.log("🏁 EDGE CASE TEST SUMMARY")
        self.log("=" * 50)
        
        passed = sum(1 for result in test_results.values() if result)
        total = len(test_results)
        
        for test_name, result in test_results.items():
            status = "✅ PASS" if result else "❌ FAIL"
            self.log(f"{test_name}: {status}")
        
        self.log(f"\nEdge Cases: {passed}/{total} tests passed")
        
        return test_results

def main():
    tester = OCREdgeCaseTester()
    results = tester.run_edge_case_tests()
    
    all_passed = all(results.values())
    exit(0 if all_passed else 1)

if __name__ == "__main__":
    main()