#!/usr/bin/env python3
"""
Backend API Testing for DiscoveryTrackAI
Tests all CRUD operations and AI endpoints
"""

import requests
import json
import sys
from datetime import datetime
import uuid

class DiscoveryTrackAPITester:
    def __init__(self, base_url="https://ai-discovery-tool.preview.emergentagent.com"):
        self.base_url = base_url
        self.tests_run = 0
        self.tests_passed = 0
        self.created_customer_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        if headers is None:
            headers = {'Content-Type': 'application/json'}

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                if response.content:
                    try:
                        response_data = response.json()
                        print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                        return True, response_data
                    except:
                        return True, {}
                return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                if response.content:
                    print(f"   Response: {response.text[:500]}")
                return False, {}

        except requests.exceptions.Timeout:
            print(f"❌ Failed - Request timeout")
            return False, {}
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test health check endpoint"""
        return self.run_test("Health Check", "GET", "/api/health", 200)

    def test_get_customers_empty(self):
        """Test getting customers when none exist"""
        return self.run_test("Get Customers (Empty)", "GET", "/api/customers", 200)

    def test_create_customer(self):
        """Test creating a new customer"""
        test_data = {
            "name": f"Test Customer {datetime.now().strftime('%H%M%S')}",
            "nickname": "TestCorp",
            "opportunity": "PSAR Review",
            "seName": "John Doe"
        }
        success, response = self.run_test("Create Customer", "POST", "/api/customers", 201, test_data)
        if success and response.get('id'):
            self.created_customer_id = response['id']
            print(f"   Created customer ID: {self.created_customer_id}")
        return success, response

    def test_get_customers_with_data(self):
        """Test getting customers when data exists"""
        return self.run_test("Get Customers (With Data)", "GET", "/api/customers", 200)

    def test_get_customer_by_id(self):
        """Test getting a specific customer by ID"""
        if not self.created_customer_id:
            print("❌ Skipped - No customer ID available")
            return False, {}
        return self.run_test("Get Customer by ID", "GET", f"/api/customers/{self.created_customer_id}", 200)

    def test_update_customer(self):
        """Test updating a customer"""
        if not self.created_customer_id:
            print("❌ Skipped - No customer ID available")
            return False, {}
        
        update_data = {
            "psar": "submitted",
            "arb": "submitted",
            "design": "started"
        }
        return self.run_test("Update Customer", "PATCH", f"/api/customers/{self.created_customer_id}", 200, update_data)

    def test_get_questions(self):
        """Test getting discovery questions"""
        return self.run_test("Get Discovery Questions", "GET", "/api/questions", 200)

    def test_analyze_notes(self):
        """Test AI notes analysis"""
        test_notes = {
            "notes": "The customer has 500 users across 3 data centers. They are currently using Microsoft DNS and DHCP. They have about 1000 IP addresses in use and are considering IPv6 migration."
        }
        return self.run_test("Analyze Meeting Notes", "POST", "/api/analyze-notes", 200, test_notes)

    def test_generate_context(self):
        """Test AI context generation"""
        test_data = {
            "contextType": "environment",
            "answers": {
                "ud-1": "500",
                "ud-5": "3",
                "idns-0": "Microsoft"
            },
            "notes": {
                "ud-1": "Approximately 500 knowledge workers across the organization"
            }
        }
        return self.run_test("Generate Context Summary", "POST", "/api/generate-context", 200, test_data)

    def test_get_discovery_data_empty(self):
        """Test getting discovery data when none exists"""
        if not self.created_customer_id:
            print("❌ Skipped - No customer ID available")
            return False, {}
        return self.run_test("Get Discovery Data (Empty)", "GET", f"/api/customers/{self.created_customer_id}/discovery", 200)

    def test_save_discovery_data(self):
        """Test saving discovery data"""
        if not self.created_customer_id:
            print("❌ Skipped - No customer ID available")
            return False, {}
        
        discovery_data = {
            "answers": {
                "ud-1": "500",
                "ud-5": "3",
                "ud-7": "25",
                "ipam-0": "Microsoft, Spreadsheets",
                "ipam-2-toggle": "Yes",
                "ipam-2": "We need to secure IPv6 and manage application controls"
            },
            "notes": {
                "ud-1": "Approximately 500 knowledge workers",
                "ipam-2": "Customer is concerned about IPv6 security"
            },
            "meetingNotes": "Customer has 500 users across 3 data centers. Currently using Microsoft for IPAM. Planning IPv6 migration.",
            "contextFields": {},
            "enabledSections": {}
        }
        return self.run_test("Save Discovery Data", "PUT", f"/api/customers/{self.created_customer_id}/discovery", 200, discovery_data)

    def test_get_discovery_data_with_data(self):
        """Test getting discovery data after saving"""
        if not self.created_customer_id:
            print("❌ Skipped - No customer ID available")
            return False, {}
        return self.run_test("Get Discovery Data (With Data)", "GET", f"/api/customers/{self.created_customer_id}/discovery", 200)

    def test_update_discovery_data(self):
        """Test updating existing discovery data"""
        if not self.created_customer_id:
            print("❌ Skipped - No customer ID available")
            return False, {}
        
        updated_data = {
            "answers": {
                "ud-1": "750",  # Updated value
                "ud-5": "5",    # Updated value
                "ud-7": "30",   # Updated value
                "ipam-0": "Microsoft, Bluecat",  # Updated value
                "ipam-2-toggle": "Yes",
                "ipam-2": "We need comprehensive IPv6 security strategy",
                "dhcp-0": "Microsoft"  # New answer
            },
            "notes": {
                "ud-1": "Updated to 750 knowledge workers after recent acquisition",
                "ipam-2": "Customer wants enterprise-grade IPv6 security",
                "dhcp-0": "Using Microsoft DHCP servers"
            },
            "meetingNotes": "Updated: Customer now has 750 users after acquisition. 5 data centers. Using Microsoft for IPAM and DHCP. IPv6 migration is priority.",
            "contextFields": {},
            "enabledSections": {}
        }
        return self.run_test("Update Discovery Data", "PUT", f"/api/customers/{self.created_customer_id}/discovery", 200, updated_data)

    def test_get_discovery_nonexistent_customer(self):
        """Test getting discovery data for nonexistent customer"""
        fake_id = str(uuid.uuid4())
        return self.run_test("Get Discovery Data (Nonexistent Customer)", "GET", f"/api/customers/{fake_id}/discovery", 404)

    def test_delete_customer(self):
        """Test deleting a customer"""
        if not self.created_customer_id:
            print("❌ Skipped - No customer ID available")
            return False, {}
        return self.run_test("Delete Customer", "DELETE", f"/api/customers/{self.created_customer_id}", 204)

    def test_get_nonexistent_customer(self):
        """Test getting a customer that doesn't exist"""
        fake_id = str(uuid.uuid4())
        return self.run_test("Get Nonexistent Customer", "GET", f"/api/customers/{fake_id}", 404)

def main():
    print("🚀 Starting DiscoveryTrackAI Backend API Tests")
    print("=" * 60)
    
    tester = DiscoveryTrackAPITester()
    
    # Test sequence
    tests = [
        tester.test_health_check,
        tester.test_get_customers_empty,
        tester.test_create_customer,
        tester.test_get_customers_with_data,
        tester.test_get_customer_by_id,
        tester.test_update_customer,
        tester.test_get_questions,
        tester.test_get_discovery_data_empty,
        tester.test_save_discovery_data,
        tester.test_get_discovery_data_with_data,
        tester.test_update_discovery_data,
        tester.test_get_discovery_nonexistent_customer,
        tester.test_analyze_notes,
        tester.test_generate_context,
        tester.test_delete_customer,
        tester.test_get_nonexistent_customer,
    ]
    
    # Run all tests
    for test in tests:
        try:
            test()
        except Exception as e:
            print(f"❌ Test failed with exception: {str(e)}")
    
    # Print results
    print("\n" + "=" * 60)
    print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} tests passed")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())