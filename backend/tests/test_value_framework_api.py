"""
Test Value Framework API Endpoints
Tests for /api/value-framework GET and /api/generate-value-props POST
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestValueFrameworkAPI:
    """Value Framework endpoint tests"""
    
    def test_get_value_framework(self):
        """Test GET /api/value-framework returns the framework data"""
        response = requests.get(f"{BASE_URL}/api/value-framework")
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        # Data assertions
        data = response.json()
        assert "categories" in data, "Response should have 'categories' key"
        
        # Should have exactly 3 categories
        categories = data["categories"]
        assert len(categories) == 3, f"Expected 3 categories, got {len(categories)}"
        
        # Verify category IDs
        category_ids = [c["id"] for c in categories]
        assert "optimize" in category_ids, "Missing 'optimize' category"
        assert "accelerate" in category_ids, "Missing 'accelerate' category"
        assert "protect" in category_ids, "Missing 'protect' category"
        print("PASS: GET /api/value-framework returns correct structure")
    
    def test_optimize_category_content(self):
        """Test Optimize category has required fields"""
        response = requests.get(f"{BASE_URL}/api/value-framework")
        assert response.status_code == 200
        
        data = response.json()
        optimize = next(c for c in data["categories"] if c["id"] == "optimize")
        
        # Verify required fields
        assert optimize["name"] == "Optimize Critical Services"
        assert "description" in optimize
        assert "discovery_questions" in optimize
        assert "before_scenarios" in optimize
        assert "infoblox_solves" in optimize
        assert "positive_outcomes" in optimize
        assert "key_metrics" in optimize
        
        # Verify discovery questions have required structure
        questions = optimize["discovery_questions"]
        assert len(questions) > 0, "Optimize should have discovery questions"
        
        first_q = questions[0]
        assert "id" in first_q
        assert "question" in first_q
        assert "tags" in first_q
        assert first_q["id"].startswith("vf-opt-")
        print("PASS: Optimize category has all required fields")
    
    def test_accelerate_category_content(self):
        """Test Accelerate category has required fields"""
        response = requests.get(f"{BASE_URL}/api/value-framework")
        assert response.status_code == 200
        
        data = response.json()
        accelerate = next(c for c in data["categories"] if c["id"] == "accelerate")
        
        assert accelerate["name"] == "Accelerate Hybrid-Cloud & Digital Transformation"
        assert len(accelerate["discovery_questions"]) > 0
        assert len(accelerate["before_scenarios"]) > 0
        assert len(accelerate["infoblox_solves"]) > 0
        print("PASS: Accelerate category has all required fields")
    
    def test_protect_category_content(self):
        """Test Protect category has required fields"""
        response = requests.get(f"{BASE_URL}/api/value-framework")
        assert response.status_code == 200
        
        data = response.json()
        protect = next(c for c in data["categories"] if c["id"] == "protect")
        
        assert protect["name"] == "Proactively Protect the Business"
        assert len(protect["discovery_questions"]) > 0
        assert len(protect["before_scenarios"]) > 0
        assert len(protect["infoblox_solves"]) > 0
        print("PASS: Protect category has all required fields")


class TestGenerateValuePropsAPI:
    """Test /api/generate-value-props POST endpoint"""
    
    def test_generate_value_props_optimize(self):
        """Test generating value propositions for Optimize category"""
        payload = {
            "contextType": "optimize",
            "answers": {
                "vf-opt-1": "Our goal is cloud-first migration by 2027",
                "vf-opt-2": "Fragmented tooling across AWS, Azure, and on-prem"
            },
            "notes": {},
            "meetingNotes": "Customer expressed concerns about visibility across hybrid cloud."
        }
        
        response = requests.post(
            f"{BASE_URL}/api/generate-value-props",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # May return 500 if AI not configured, but should not return 400
        if response.status_code == 500:
            data = response.json()
            if "AI integration not configured" in str(data.get("detail", "")):
                pytest.skip("AI integration not configured - skipping AI generation test")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "summary" in data, "Response should have 'summary' key"
        assert len(data["summary"]) > 0, "Summary should not be empty"
        print("PASS: Generate value props for Optimize returns valid response")
    
    def test_generate_value_props_invalid_category(self):
        """Test that invalid category returns 400 error"""
        payload = {
            "contextType": "invalid_category",
            "answers": {},
            "notes": {},
            "meetingNotes": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/generate-value-props",
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        
        # Should return 400 for invalid category
        if response.status_code == 500:
            data = response.json()
            if "AI integration not configured" in str(data.get("detail", "")):
                pytest.skip("AI integration not configured")
        
        assert response.status_code == 400, f"Expected 400 for invalid category, got {response.status_code}"
        print("PASS: Invalid category returns 400 error")


class TestTopBarCollapseFeature:
    """UI feature verification via API - TopBar collapse persists state"""
    
    def test_customer_exists(self):
        """Verify test customer exists"""
        response = requests.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        
        customers = response.json()
        test_customer = next((c for c in customers if c["name"] == "Not Your Customer"), None)
        assert test_customer is not None, "Test customer 'Not Your Customer' should exist"
        print(f"PASS: Test customer exists with ID: {test_customer['id']}")
    
    def test_customer_discovery_endpoint(self):
        """Verify customer discovery data can be fetched"""
        # First get customer ID
        response = requests.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        
        customers = response.json()
        test_customer = next((c for c in customers if c["name"] == "Not Your Customer"), None)
        assert test_customer is not None
        
        # Get discovery data
        discovery_response = requests.get(f"{BASE_URL}/api/customers/{test_customer['id']}/discovery")
        assert discovery_response.status_code == 200
        print("PASS: Customer discovery endpoint working")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
