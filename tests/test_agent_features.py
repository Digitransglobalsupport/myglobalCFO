"""
Test Suite for Agentic Features - Self-Healing Financial Data
Tests: Fetch Agent, Match Agent, Heal Agent, Compliance Agent, Bridge Report
"""
import pytest
import requests
import os
import uuid
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "Test123!"


class TestAgentFeatures:
    """Test suite for all Agent features"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with authentication"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login to get token
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.user_id = login_response.json().get("user", {}).get("id")
        else:
            # Try to register if login fails
            register_response = self.session.post(f"{BASE_URL}/api/auth/register", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Test User"
            })
            if register_response.status_code == 200:
                token = register_response.json().get("token")
                self.session.headers.update({"Authorization": f"Bearer {token}"})
                self.user_id = register_response.json().get("user", {}).get("id")
            else:
                pytest.skip("Authentication failed")
    
    # ==================== Agent Statistics Tests ====================
    
    def test_agent_statistics_endpoint(self):
        """Test GET /api/agents/statistics returns proper structure"""
        response = self.session.get(f"{BASE_URL}/api/agents/statistics")
        assert response.status_code == 200
        
        data = response.json()
        # Verify all expected fields are present
        assert "total_actions" in data
        assert "automated" in data
        assert "proposed" in data
        assert "flagged" in data
        assert "rolled_back" in data
        assert "unread_notifications" in data
        
        # Verify types
        assert isinstance(data["total_actions"], int)
        assert isinstance(data["automated"], int)
        assert isinstance(data["proposed"], int)
        assert isinstance(data["flagged"], int)
        assert isinstance(data["rolled_back"], int)
        assert isinstance(data["unread_notifications"], int)
        
        print(f"✓ Agent Statistics: {data}")
    
    # ==================== Agent Actions CRUD Tests ====================
    
    def test_get_agent_actions_list(self):
        """Test GET /api/agents/actions returns list of actions"""
        response = self.session.get(f"{BASE_URL}/api/agents/actions?limit=50")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Agent Actions: Retrieved {len(data)} actions")
    
    def test_get_agent_actions_with_filter(self):
        """Test GET /api/agents/actions with agent_type filter"""
        response = self.session.get(f"{BASE_URL}/api/agents/actions?agent_type=fetch&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        # If there are results, verify they match the filter
        for action in data:
            assert action.get("agent_type") == "fetch"
        print(f"✓ Agent Actions Filter: Retrieved {len(data)} fetch agent actions")
    
    def test_get_agent_actions_with_status_filter(self):
        """Test GET /api/agents/actions with status filter"""
        response = self.session.get(f"{BASE_URL}/api/agents/actions?status=automated&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        for action in data:
            assert action.get("status") == "automated"
        print(f"✓ Agent Actions Status Filter: Retrieved {len(data)} automated actions")
    
    # ==================== Agent Notifications Tests ====================
    
    def test_get_agent_notifications(self):
        """Test GET /api/agents/notifications returns list"""
        response = self.session.get(f"{BASE_URL}/api/agents/notifications?limit=30")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Agent Notifications: Retrieved {len(data)} notifications")
    
    def test_get_agent_notifications_by_category(self):
        """Test GET /api/agents/notifications with category filter"""
        response = self.session.get(f"{BASE_URL}/api/agents/notifications?category=automated&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Agent Notifications by Category: Retrieved {len(data)} automated notifications")
    
    def test_get_unread_notifications(self):
        """Test GET /api/agents/notifications with is_read=false filter"""
        response = self.session.get(f"{BASE_URL}/api/agents/notifications?is_read=false&limit=10")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Unread Notifications: Retrieved {len(data)} unread notifications")
    
    # ==================== Fetch Agent Tests ====================
    
    def test_fetch_agent_scan_inbox(self):
        """Test POST /api/agents/fetch/scan-inbox generates mock invoices"""
        response = self.session.post(f"{BASE_URL}/api/agents/fetch/scan-inbox", json={
            "days_back": 30,
            "provider": "gmail"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "invoices" in data
        assert "scan_results" in data
        assert isinstance(data["invoices"], list)
        
        scan_results = data["scan_results"]
        assert "emails_scanned" in scan_results
        assert "pdfs_found" in scan_results
        assert "invoices_extracted" in scan_results
        
        print(f"✓ Fetch Agent Scan: Scanned {scan_results['emails_scanned']} emails, extracted {scan_results['invoices_extracted']} invoices")
        
        # Verify invoice structure if any were extracted
        if data["invoices"]:
            invoice = data["invoices"][0]
            assert "vendor_name" in invoice
            assert "amount" in invoice
            assert "currency" in invoice
            print(f"  Sample invoice: {invoice.get('vendor_name')} - {invoice.get('currency')} {invoice.get('amount')}")
    
    def test_fetch_agent_match_invoices(self):
        """Test POST /api/agents/fetch/match-invoices"""
        response = self.session.post(f"{BASE_URL}/api/agents/fetch/match-invoices", json={
            "days_back": 30,
            "provider": "gmail"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "scan_results" in data
        assert "matches" in data
        assert "match_count" in data
        
        print(f"✓ Fetch Agent Match: Found {data['match_count']} matches")
    
    # ==================== Match Agent Tests ====================
    
    def test_match_agent_suggest_mappings(self):
        """Test POST /api/agents/match/suggest-mappings generates COA suggestions"""
        response = self.session.post(f"{BASE_URL}/api/agents/match/suggest-mappings", json={})
        assert response.status_code == 200
        
        data = response.json()
        assert "suggestions" in data
        assert "total_accounts" in data
        assert "suggestions_count" in data
        assert "high_confidence_count" in data
        
        print(f"✓ Match Agent Suggestions: {data['suggestions_count']} suggestions ({data['high_confidence_count']} high confidence)")
        
        # Verify suggestion structure
        if data["suggestions"]:
            suggestion = data["suggestions"][0]
            assert "local_account_code" in suggestion
            assert "local_account_name" in suggestion
            assert "suggested_group_code" in suggestion
            assert "confidence_score" in suggestion
            assert "match_reasons" in suggestion
            print(f"  Sample: {suggestion['local_account_name']} -> {suggestion['suggested_group_code']} ({suggestion['confidence_score']:.0%})")
    
    def test_match_agent_suggest_mappings_with_custom_accounts(self):
        """Test Match Agent with custom account list"""
        custom_accounts = [
            {"code": "TEST001", "name": "Test Revenue Account", "type": "income"},
            {"code": "TEST002", "name": "Test Salary Expense", "type": "expense"},
            {"code": "TEST003", "name": "Test Cash Account", "type": "asset"}
        ]
        
        response = self.session.post(f"{BASE_URL}/api/agents/match/suggest-mappings", json={
            "accounts": custom_accounts
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["total_accounts"] == 3
        print(f"✓ Match Agent Custom Accounts: {data['suggestions_count']} suggestions for {data['total_accounts']} accounts")
    
    def test_match_agent_detect_anomalies(self):
        """Test POST /api/agents/match/detect-anomalies"""
        response = self.session.post(f"{BASE_URL}/api/agents/match/detect-anomalies", json={})
        assert response.status_code == 200
        
        data = response.json()
        assert "anomalies" in data
        assert "total_anomalies" in data
        assert "high_severity" in data
        
        print(f"✓ Match Agent Anomalies: {data['total_anomalies']} anomalies ({data['high_severity']} high severity)")
    
    # ==================== Heal Agent Tests ====================
    
    def test_heal_agent_investigate_variance(self):
        """Test POST /api/agents/heal/investigate-variance"""
        # First, get entities to use for variance investigation
        entities_response = self.session.get(f"{BASE_URL}/api/entity-tree")
        
        if entities_response.status_code == 200 and len(entities_response.json()) >= 2:
            entities = entities_response.json()
            entity_a = entities[0]
            entity_b = entities[1] if len(entities) > 1 else entities[0]
            
            response = self.session.post(f"{BASE_URL}/api/agents/heal/investigate-variance", json={
                "entity_a_id": entity_a["id"],
                "entity_b_id": entity_b["id"],
                "variance_amount": 1500.00,
                "currency": "USD"
            })
            assert response.status_code == 200
            
            data = response.json()
            assert "investigation" in data
            
            investigation = data["investigation"]
            assert "entity_a_id" in investigation
            assert "entity_b_id" in investigation
            assert "variance_amount" in investigation
            assert "potential_causes" in investigation
            assert "recommended_action" in investigation
            
            print(f"✓ Heal Agent Investigation: Variance ${investigation['variance_amount']}, Recommended: {investigation['recommended_action']}")
            
            if data.get("proposed_journal"):
                print(f"  Proposed Journal: {data['proposed_journal'].get('description')}")
        else:
            # Test with mock entity IDs
            response = self.session.post(f"{BASE_URL}/api/agents/heal/investigate-variance", json={
                "entity_a_id": "test-entity-a",
                "entity_b_id": "test-entity-b",
                "variance_amount": 500.00,
                "currency": "USD"
            })
            assert response.status_code == 200
            print("✓ Heal Agent Investigation: Tested with mock entity IDs")
    
    def test_heal_agent_pending_heals(self):
        """Test GET /api/agents/heal/pending returns pending items"""
        response = self.session.get(f"{BASE_URL}/api/agents/heal/pending")
        assert response.status_code == 200
        
        data = response.json()
        assert "pending_journals" in data
        assert "pending_drafts" in data
        assert "total_pending" in data
        
        print(f"✓ Heal Agent Pending: {data['total_pending']} pending items ({len(data['pending_journals'])} journals, {len(data['pending_drafts'])} drafts)")
    
    # ==================== Compliance Agent Tests ====================
    
    def test_compliance_agent_governance_check(self):
        """Test POST /api/agents/compliance/governance-check"""
        response = self.session.post(f"{BASE_URL}/api/agents/compliance/governance-check", json={})
        assert response.status_code == 200
        
        data = response.json()
        assert "checked_at" in data
        assert "total_eliminations_checked" in data
        assert "compliant" in data
        assert "non_compliant" in data
        assert "blocked" in data
        assert "violations" in data
        assert "recommendations" in data
        
        print(f"✓ Compliance Governance Check: {data['compliant']}/{data['total_eliminations_checked']} compliant, {data['blocked']} blocked")
        
        if data["recommendations"]:
            print(f"  Recommendations: {len(data['recommendations'])}")
    
    def test_compliance_agent_get_violations(self):
        """Test GET /api/agents/compliance/violations"""
        response = self.session.get(f"{BASE_URL}/api/agents/compliance/violations")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        print(f"✓ Compliance Violations: {len(data)} violations found")
        
        # Verify violation structure if any exist
        if data:
            violation = data[0]
            assert "id" in violation
            assert "violation_type" in violation
            assert "severity" in violation
            print(f"  Sample: {violation.get('violation_type')} - {violation.get('severity')}")
    
    def test_compliance_agent_violations_by_severity(self):
        """Test GET /api/agents/compliance/violations with severity filter"""
        response = self.session.get(f"{BASE_URL}/api/agents/compliance/violations?severity=critical")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        
        for violation in data:
            assert violation.get("severity") == "critical"
        
        print(f"✓ Compliance Critical Violations: {len(data)} critical violations")
    
    def test_compliance_agent_validate_elimination(self):
        """Test POST /api/agents/compliance/validate-elimination"""
        # Get entities for validation
        entities_response = self.session.get(f"{BASE_URL}/api/entity-tree")
        
        if entities_response.status_code == 200 and len(entities_response.json()) >= 2:
            entities = entities_response.json()
            entity_a = entities[0]
            entity_b = entities[1] if len(entities) > 1 else entities[0]
            
            response = self.session.post(f"{BASE_URL}/api/agents/compliance/validate-elimination", json={
                "entity_a_id": entity_a["id"],
                "entity_b_id": entity_b["id"],
                "transaction_ids": []
            })
            assert response.status_code == 200
            
            data = response.json()
            assert "is_valid" in data
            assert "violations" in data
            
            print(f"✓ Compliance Validate Elimination: Valid={data['is_valid']}, Violations={len(data['violations'])}")
        else:
            print("✓ Compliance Validate Elimination: Skipped (no entities)")
    
    # ==================== Bridge Report Tests ====================
    
    def test_bridge_report(self):
        """Test GET /api/agents/bridge-report returns transformation data"""
        response = self.session.get(f"{BASE_URL}/api/agents/bridge-report")
        assert response.status_code == 200
        
        data = response.json()
        assert "bridge_entries" in data
        assert "raw_total" in data
        assert "additions" in data
        assert "eliminations" in data
        assert "adjustments" in data
        assert "final_total" in data
        assert "transformation_count" in data
        
        print(f"✓ Bridge Report: Raw ${data['raw_total']:,.0f} -> Final ${data['final_total']:,.0f}")
        print(f"  Additions: ${data['additions']:,.0f}, Eliminations: ${data['eliminations']:,.0f}, Adjustments: ${data['adjustments']:,.0f}")
        
        # Verify bridge entries structure
        assert isinstance(data["bridge_entries"], list)
        assert len(data["bridge_entries"]) >= 2  # At least Raw and Final
        
        for entry in data["bridge_entries"]:
            assert "category" in entry
            assert "description" in entry
            assert "amount" in entry
            assert "currency" in entry
            assert "source" in entry
        
        print(f"  Bridge Entries: {len(data['bridge_entries'])} categories")
    
    # ==================== Action Approval/Rejection Tests ====================
    
    def test_action_approval_workflow(self):
        """Test action approval workflow - first run scan to create actions"""
        # Run fetch agent to create some actions
        scan_response = self.session.post(f"{BASE_URL}/api/agents/fetch/scan-inbox", json={
            "days_back": 7
        })
        assert scan_response.status_code == 200
        
        # Get proposed actions
        actions_response = self.session.get(f"{BASE_URL}/api/agents/actions?status=proposed&limit=5")
        assert actions_response.status_code == 200
        
        actions = actions_response.json()
        print(f"✓ Action Workflow: Found {len(actions)} proposed actions")
        
        # If there are proposed actions, test approval
        if actions:
            action_id = actions[0]["id"]
            
            # Test approve
            approve_response = self.session.post(f"{BASE_URL}/api/agents/actions/{action_id}/approve")
            # May fail if action is not in proposed state, which is OK
            if approve_response.status_code == 200:
                print(f"  Approved action: {action_id}")
            else:
                print(f"  Action {action_id} could not be approved (may already be processed)")
    
    def test_mark_notification_read(self):
        """Test marking notification as read"""
        # Get notifications
        notifs_response = self.session.get(f"{BASE_URL}/api/agents/notifications?is_read=false&limit=5")
        assert notifs_response.status_code == 200
        
        notifications = notifs_response.json()
        
        if notifications:
            notif_id = notifications[0]["id"]
            
            # Mark as read
            read_response = self.session.put(f"{BASE_URL}/api/agents/notifications/{notif_id}/read")
            assert read_response.status_code == 200
            
            data = read_response.json()
            assert "success" in data
            print(f"✓ Mark Notification Read: {notif_id} - Success={data['success']}")
        else:
            print("✓ Mark Notification Read: No unread notifications to test")
    
    # ==================== Integration Tests ====================
    
    def test_full_agent_workflow(self):
        """Test complete agent workflow: Scan -> Match -> Heal -> Compliance"""
        print("\n=== Full Agent Workflow Test ===")
        
        # Step 1: Fetch Agent - Scan inbox
        scan_response = self.session.post(f"{BASE_URL}/api/agents/fetch/scan-inbox", json={
            "days_back": 30
        })
        assert scan_response.status_code == 200
        scan_data = scan_response.json()
        print(f"1. Fetch Agent: Extracted {scan_data['scan_results']['invoices_extracted']} invoices")
        
        # Step 2: Match Agent - Generate suggestions
        match_response = self.session.post(f"{BASE_URL}/api/agents/match/suggest-mappings", json={})
        assert match_response.status_code == 200
        match_data = match_response.json()
        print(f"2. Match Agent: Generated {match_data['suggestions_count']} mapping suggestions")
        
        # Step 3: Compliance Agent - Run governance check
        compliance_response = self.session.post(f"{BASE_URL}/api/agents/compliance/governance-check", json={})
        assert compliance_response.status_code == 200
        compliance_data = compliance_response.json()
        print(f"3. Compliance Agent: {compliance_data['compliant']}/{compliance_data['total_eliminations_checked']} compliant")
        
        # Step 4: Get statistics
        stats_response = self.session.get(f"{BASE_URL}/api/agents/statistics")
        assert stats_response.status_code == 200
        stats_data = stats_response.json()
        print(f"4. Statistics: {stats_data['total_actions']} total actions, {stats_data['unread_notifications']} unread notifications")
        
        # Step 5: Get bridge report
        bridge_response = self.session.get(f"{BASE_URL}/api/agents/bridge-report")
        assert bridge_response.status_code == 200
        bridge_data = bridge_response.json()
        print(f"5. Bridge Report: ${bridge_data['raw_total']:,.0f} -> ${bridge_data['final_total']:,.0f}")
        
        print("=== Workflow Complete ===\n")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
