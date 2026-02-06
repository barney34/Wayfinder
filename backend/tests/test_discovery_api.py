"""
DiscoveryTrackAI Backend API Tests
Tests for: Questions, Customers CRUD, Discovery Data Save/Retrieve
Iteration 5 - Post migration testing
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestHealthEndpoint:
    """Health check tests"""
    
    def test_health_check(self):
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "timestamp" in data
        print("✓ Health check passed")


class TestQuestionsEndpoint:
    """Tests for GET /api/questions"""
    
    def test_get_questions_returns_91_items(self):
        """Verify 91 questions are returned"""
        response = requests.get(f"{BASE_URL}/api/questions")
        assert response.status_code == 200
        questions = response.json()
        assert isinstance(questions, list)
        assert len(questions) == 91, f"Expected 91 questions, got {len(questions)}"
        print(f"✓ Questions endpoint returns {len(questions)} questions")
    
    def test_questions_have_required_fields(self):
        """Verify all questions have required fields: id, section, question"""
        response = requests.get(f"{BASE_URL}/api/questions")
        assert response.status_code == 200
        questions = response.json()
        
        for q in questions:
            assert "id" in q, f"Question missing 'id': {q}"
            assert "section" in q, f"Question {q.get('id')} missing 'section'"
            assert "question" in q, f"Question {q.get('id')} missing 'question'"
        print("✓ All questions have required fields")
    
    def test_questions_sections_exist(self):
        """Verify all 12 expected sections exist"""
        expected_sections = {
            "Users - Devices - Sites",
            "Sizing Data",
            "IPAM",
            "UDDI",
            "Internal DNS",
            "External DNS",
            "DHCP",
            "Services",
            "Microsoft Management",
            "Asset/ Network Insight",
            "Security",
            "Professional Services"
        }
        
        response = requests.get(f"{BASE_URL}/api/questions")
        assert response.status_code == 200
        questions = response.json()
        
        actual_sections = set(q["section"] for q in questions)
        
        # Check all expected sections exist
        for section in expected_sections:
            assert section in actual_sections, f"Missing section: {section}"
        
        print(f"✓ All 12 sections present: {actual_sections}")
    
    def test_conditional_questions_exist(self):
        """Verify conditional questions have conditionalOn field"""
        response = requests.get(f"{BASE_URL}/api/questions")
        assert response.status_code == 200
        questions = response.json()
        
        conditional_ids = [
            "ud-2a",  # conditionalOn ud-2=Yes (BYOD devices per user)
            "dhcp-network-equipment-types",  # conditionalOn dhcp-scopes-network-equipment=Yes
            "idns-0a",  # conditionalOn idns-0=Microsoft
            "beta-asset-config",  # conditionalOn beta-enable=Yes
        ]
        
        for qid in conditional_ids:
            q = next((q for q in questions if q["id"] == qid), None)
            assert q is not None, f"Question {qid} not found"
            assert "conditionalOn" in q, f"Question {qid} should have conditionalOn"
            assert "questionId" in q["conditionalOn"], f"Question {qid} conditionalOn missing questionId"
            assert "value" in q["conditionalOn"], f"Question {qid} conditionalOn missing value"
        
        print("✓ Conditional questions have proper conditionalOn fields")


class TestCustomersEndpoint:
    """Tests for customers CRUD operations"""
    
    def test_get_customers_list(self):
        """Verify GET /api/customers returns customer list"""
        response = requests.get(f"{BASE_URL}/api/customers")
        assert response.status_code == 200
        customers = response.json()
        assert isinstance(customers, list)
        assert len(customers) > 0, "Expected at least one customer in list"
        
        # Verify customer structure
        customer = customers[0]
        assert "id" in customer
        assert "name" in customer
        print(f"✓ Customers endpoint returns {len(customers)} customers")
    
    def test_get_single_customer(self):
        """Verify GET /api/customers/{id} returns single customer"""
        # First get list to get a valid ID
        response = requests.get(f"{BASE_URL}/api/customers")
        customers = response.json()
        customer_id = customers[0]["id"]
        
        # Get single customer
        response = requests.get(f"{BASE_URL}/api/customers/{customer_id}")
        assert response.status_code == 200
        customer = response.json()
        assert customer["id"] == customer_id
        print(f"✓ Single customer fetch works for id: {customer_id[:8]}...")
    
    def test_create_customer(self):
        """Test POST /api/customers creates a new customer"""
        test_name = f"TEST_Customer_{uuid.uuid4().hex[:8]}"
        payload = {
            "name": test_name,
            "nickname": "TestNick",
            "opportunity": "Test Opportunity",
            "se_name": "Test SE",
            "psar": "not-submitted",
            "arb": "not-submitted",
            "design": "not-started"
        }
        
        response = requests.post(f"{BASE_URL}/api/customers", json=payload)
        assert response.status_code == 201
        customer = response.json()
        assert customer["name"] == test_name
        assert "id" in customer
        
        # Verify it was persisted
        get_response = requests.get(f"{BASE_URL}/api/customers/{customer['id']}")
        assert get_response.status_code == 200
        fetched = get_response.json()
        assert fetched["name"] == test_name
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/customers/{customer['id']}")
        print(f"✓ Customer creation and persistence verified")
    
    def test_update_customer(self):
        """Test PATCH /api/customers/{id} updates customer"""
        # Create test customer
        test_name = f"TEST_Customer_{uuid.uuid4().hex[:8]}"
        create_resp = requests.post(f"{BASE_URL}/api/customers", json={
            "name": test_name,
            "psar": "not-submitted"
        })
        customer_id = create_resp.json()["id"]
        
        # Update customer
        update_resp = requests.patch(f"{BASE_URL}/api/customers/{customer_id}", json={
            "psar": "submitted",
            "design": "started"
        })
        assert update_resp.status_code == 200
        updated = update_resp.json()
        assert updated["psar"] == "submitted"
        assert updated["design"] == "started"
        
        # Verify persistence
        get_resp = requests.get(f"{BASE_URL}/api/customers/{customer_id}")
        assert get_resp.json()["psar"] == "submitted"
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/customers/{customer_id}")
        print(f"✓ Customer update and persistence verified")
    
    def test_delete_customer(self):
        """Test DELETE /api/customers/{id} removes customer"""
        # Create test customer
        test_name = f"TEST_Customer_{uuid.uuid4().hex[:8]}"
        create_resp = requests.post(f"{BASE_URL}/api/customers", json={
            "name": test_name
        })
        customer_id = create_resp.json()["id"]
        
        # Delete customer
        delete_resp = requests.delete(f"{BASE_URL}/api/customers/{customer_id}")
        assert delete_resp.status_code == 204
        
        # Verify deletion
        get_resp = requests.get(f"{BASE_URL}/api/customers/{customer_id}")
        assert get_resp.status_code == 404
        print(f"✓ Customer deletion verified")
    
    def test_get_nonexistent_customer_returns_404(self):
        """Test GET /api/customers/{id} returns 404 for non-existent ID"""
        fake_id = str(uuid.uuid4())
        response = requests.get(f"{BASE_URL}/api/customers/{fake_id}")
        assert response.status_code == 404
        print("✓ Non-existent customer returns 404")


class TestDiscoveryDataEndpoint:
    """Tests for discovery data save/retrieve"""
    
    @pytest.fixture(autouse=True)
    def setup_test_customer(self):
        """Create a test customer for discovery tests"""
        test_name = f"TEST_Discovery_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/customers", json={
            "name": test_name
        })
        self.customer_id = response.json()["id"]
        yield
        # Cleanup
        requests.delete(f"{BASE_URL}/api/customers/{self.customer_id}")
    
    def test_get_empty_discovery_data(self):
        """Test GET /api/customers/{id}/discovery returns empty data for new customer"""
        response = requests.get(f"{BASE_URL}/api/customers/{self.customer_id}/discovery")
        assert response.status_code == 200
        data = response.json()
        assert data["customerId"] == self.customer_id
        assert data["answers"] == {}
        assert data["notes"] == {}
        print("✓ Empty discovery data retrieved for new customer")
    
    def test_save_and_retrieve_discovery_data(self):
        """Test PUT and GET /api/customers/{id}/discovery save and retrieve data"""
        # Save discovery data
        discovery_payload = {
            "answers": {
                "ud-1": "5000",
                "ipam-0": "Microsoft, Spreadsheets",
                "beta-enable": "Yes",
                "dhcp-scopes-network-equipment": "Yes"
            },
            "notes": {
                "ud-1": "Estimated based on HR data"
            },
            "meetingNotes": "Initial discovery call with customer",
            "contextFields": {},
            "enabledSections": {}
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/customers/{self.customer_id}/discovery",
            json=discovery_payload
        )
        assert put_response.status_code == 200
        saved_data = put_response.json()
        assert saved_data["customerId"] == self.customer_id
        assert "lastSaved" in saved_data
        
        # Retrieve and verify
        get_response = requests.get(f"{BASE_URL}/api/customers/{self.customer_id}/discovery")
        assert get_response.status_code == 200
        retrieved = get_response.json()
        
        # Verify answers persisted
        assert retrieved["answers"]["ud-1"] == "5000"
        assert retrieved["answers"]["ipam-0"] == "Microsoft, Spreadsheets"
        assert retrieved["answers"]["beta-enable"] == "Yes"
        
        # Verify notes persisted
        assert retrieved["notes"]["ud-1"] == "Estimated based on HR data"
        
        # Verify meeting notes persisted
        assert retrieved["meetingNotes"] == "Initial discovery call with customer"
        
        print("✓ Discovery data save and retrieve verified")
    
    def test_update_discovery_data_overwrites(self):
        """Test that PUT discovery data fully overwrites previous data"""
        # Save initial data
        requests.put(
            f"{BASE_URL}/api/customers/{self.customer_id}/discovery",
            json={"answers": {"ud-1": "1000"}, "notes": {}, "meetingNotes": "", "contextFields": {}, "enabledSections": {}}
        )
        
        # Update with new data
        new_data = {
            "answers": {"ud-1": "2000", "ud-5": "10"},
            "notes": {},
            "meetingNotes": "Updated notes",
            "contextFields": {},
            "enabledSections": {}
        }
        requests.put(
            f"{BASE_URL}/api/customers/{self.customer_id}/discovery",
            json=new_data
        )
        
        # Verify update
        get_response = requests.get(f"{BASE_URL}/api/customers/{self.customer_id}/discovery")
        retrieved = get_response.json()
        
        assert retrieved["answers"]["ud-1"] == "2000"
        assert retrieved["answers"]["ud-5"] == "10"
        assert retrieved["meetingNotes"] == "Updated notes"
        print("✓ Discovery data update (overwrite) verified")
    
    def test_discovery_for_nonexistent_customer_returns_404(self):
        """Test discovery endpoints return 404 for non-existent customer"""
        fake_id = str(uuid.uuid4())
        
        # GET should return 404
        get_response = requests.get(f"{BASE_URL}/api/customers/{fake_id}/discovery")
        assert get_response.status_code == 404
        
        # PUT should also return 404
        put_response = requests.put(
            f"{BASE_URL}/api/customers/{fake_id}/discovery",
            json={"answers": {}, "notes": {}, "meetingNotes": "", "contextFields": {}, "enabledSections": {}}
        )
        assert put_response.status_code == 404
        
        print("✓ Discovery endpoints return 404 for non-existent customer")


class TestTokenCalculatorQuestions:
    """Tests for Token Calculator conditional questions"""
    
    def test_token_calculator_questions_exist(self):
        """Verify all Token Calculator sub-questions exist and are conditional on beta-enable"""
        response = requests.get(f"{BASE_URL}/api/questions")
        questions = response.json()
        
        token_calc_ids = [
            "beta-enable",
            "beta-asset-config",
            "beta-td-nios-section",
            "beta-reporting",
            "beta-dossier",
            "beta-lookalike",
            "beta-domain-takedown",
            "beta-soc-insights",
            "beta-security-tokens-total"
        ]
        
        for qid in token_calc_ids:
            q = next((q for q in questions if q["id"] == qid), None)
            assert q is not None, f"Token Calculator question {qid} not found"
            
            # beta-enable should NOT be conditional
            if qid == "beta-enable":
                assert q.get("fieldType") == "enableSwitch"
            else:
                # All others should be conditional on beta-enable=Yes
                assert "conditionalOn" in q, f"{qid} should be conditional"
                assert q["conditionalOn"]["questionId"] == "beta-enable"
                assert q["conditionalOn"]["value"] == "Yes"
        
        print("✓ All Token Calculator questions exist with correct conditional dependencies")


class TestNewDiscoveryFields:
    """Tests for new discovery data fields: udsMembers, leaseTimeUnits, dataCenters, sites"""
    
    @pytest.fixture(autouse=True)
    def setup_test_customer(self):
        """Create a test customer for new field tests"""
        test_name = f"TEST_NewFields_{uuid.uuid4().hex[:8]}"
        response = requests.post(f"{BASE_URL}/api/customers", json={
            "name": test_name
        })
        self.customer_id = response.json()["id"]
        yield
        # Cleanup
        requests.delete(f"{BASE_URL}/api/customers/{self.customer_id}")
    
    def test_save_and_retrieve_data_centers(self):
        """Test saving and retrieving dataCenters field"""
        discovery_payload = {
            "answers": {},
            "notes": {},
            "meetingNotes": "",
            "contextFields": {},
            "enabledSections": {},
            "udsMembers": [],
            "leaseTimeUnits": {},
            "dataCenters": [
                {"id": "dc-1", "name": "Primary DC"},
                {"id": "dc-2", "name": "Secondary DC"}
            ],
            "sites": []
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/customers/{self.customer_id}/discovery",
            json=discovery_payload
        )
        assert put_response.status_code == 200
        
        # Retrieve and verify
        get_response = requests.get(f"{BASE_URL}/api/customers/{self.customer_id}/discovery")
        assert get_response.status_code == 200
        retrieved = get_response.json()
        
        assert "dataCenters" in retrieved
        assert len(retrieved["dataCenters"]) == 2
        assert retrieved["dataCenters"][0]["name"] == "Primary DC"
        assert retrieved["dataCenters"][1]["name"] == "Secondary DC"
        print("✓ dataCenters field save and retrieve verified")
    
    def test_save_and_retrieve_sites(self):
        """Test saving and retrieving sites field"""
        discovery_payload = {
            "answers": {},
            "notes": {},
            "meetingNotes": "",
            "contextFields": {},
            "enabledSections": {},
            "udsMembers": [],
            "leaseTimeUnits": {},
            "dataCenters": [{"id": "dc-1", "name": "Main DC"}],
            "sites": [
                {"id": "site-1", "name": "HQ Site", "dataCenterId": "dc-1"},
                {"id": "site-2", "name": "Remote Site", "dataCenterId": None}
            ]
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/customers/{self.customer_id}/discovery",
            json=discovery_payload
        )
        assert put_response.status_code == 200
        
        # Retrieve and verify
        get_response = requests.get(f"{BASE_URL}/api/customers/{self.customer_id}/discovery")
        assert get_response.status_code == 200
        retrieved = get_response.json()
        
        assert "sites" in retrieved
        assert len(retrieved["sites"]) == 2
        assert retrieved["sites"][0]["name"] == "HQ Site"
        assert retrieved["sites"][0]["dataCenterId"] == "dc-1"
        assert retrieved["sites"][1]["name"] == "Remote Site"
        assert retrieved["sites"][1]["dataCenterId"] is None
        print("✓ sites field save and retrieve verified")
    
    def test_save_and_retrieve_uds_members(self):
        """Test saving and retrieving udsMembers field"""
        discovery_payload = {
            "answers": {},
            "notes": {},
            "meetingNotes": "",
            "contextFields": {},
            "enabledSections": {},
            "udsMembers": [
                {"id": "uds-1", "type": "DNS", "count": 10},
                {"id": "uds-2", "type": "DHCP", "count": 5}
            ],
            "leaseTimeUnits": {},
            "dataCenters": [],
            "sites": []
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/customers/{self.customer_id}/discovery",
            json=discovery_payload
        )
        assert put_response.status_code == 200
        
        # Retrieve and verify
        get_response = requests.get(f"{BASE_URL}/api/customers/{self.customer_id}/discovery")
        assert get_response.status_code == 200
        retrieved = get_response.json()
        
        assert "udsMembers" in retrieved
        assert len(retrieved["udsMembers"]) == 2
        assert retrieved["udsMembers"][0]["type"] == "DNS"
        print("✓ udsMembers field save and retrieve verified")
    
    def test_save_and_retrieve_lease_time_units(self):
        """Test saving and retrieving leaseTimeUnits field"""
        discovery_payload = {
            "answers": {},
            "notes": {},
            "meetingNotes": "",
            "contextFields": {},
            "enabledSections": {},
            "udsMembers": [],
            "leaseTimeUnits": {
                "dhcp-3": "days",
                "dhcp-4": "hours",
                "dhcp-6": "minutes"
            },
            "dataCenters": [],
            "sites": []
        }
        
        put_response = requests.put(
            f"{BASE_URL}/api/customers/{self.customer_id}/discovery",
            json=discovery_payload
        )
        assert put_response.status_code == 200
        
        # Retrieve and verify
        get_response = requests.get(f"{BASE_URL}/api/customers/{self.customer_id}/discovery")
        assert get_response.status_code == 200
        retrieved = get_response.json()
        
        assert "leaseTimeUnits" in retrieved
        assert retrieved["leaseTimeUnits"]["dhcp-3"] == "days"
        assert retrieved["leaseTimeUnits"]["dhcp-4"] == "hours"
        assert retrieved["leaseTimeUnits"]["dhcp-6"] == "minutes"
        print("✓ leaseTimeUnits field save and retrieve verified")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
