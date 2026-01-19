"""
Compliance Agent - Technical Verification (IFRS/GAAP)
Validates IC eliminations, ownership logic, FX translation, and audit evidence
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase

from .base import (
    AgentBase, AgentActionType, AgentActionStatus,
    LogicMemo, AgentLLM
)


class GovernanceViolation:
    """Represents a governance violation detected by the agent"""
    def __init__(
        self,
        violation_type: str,
        severity: str,  # "critical", "high", "medium", "low"
        entity_id: str = None,
        entity_name: str = None,
        counterparty_id: str = None,
        counterparty_name: str = None,
        description: str = None,
        rule_violated: str = None,
        recommended_action: str = None,
        blocked: bool = False
    ):
        self.id = str(uuid.uuid4())
        self.violation_type = violation_type
        self.severity = severity
        self.entity_id = entity_id
        self.entity_name = entity_name
        self.counterparty_id = counterparty_id
        self.counterparty_name = counterparty_name
        self.description = description
        self.rule_violated = rule_violated
        self.recommended_action = recommended_action
        self.blocked = blocked
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "violation_type": self.violation_type,
            "severity": self.severity,
            "entity_id": self.entity_id,
            "entity_name": self.entity_name,
            "counterparty_id": self.counterparty_id,
            "counterparty_name": self.counterparty_name,
            "description": self.description,
            "rule_violated": self.rule_violated,
            "recommended_action": self.recommended_action,
            "blocked": self.blocked
        }


class FXAuditResult:
    """Result of FX translation audit"""
    def __init__(
        self,
        entity_id: str,
        entity_name: str,
        source_currency: str,
        target_currency: str,
        rate_used: float,
        rate_expected: float,
        rate_type_used: str,  # "spot", "average", "historical"
        rate_type_expected: str,
        variance_pct: float,
        cta_impact: float,
        is_compliant: bool,
        issues: List[str]
    ):
        self.entity_id = entity_id
        self.entity_name = entity_name
        self.source_currency = source_currency
        self.target_currency = target_currency
        self.rate_used = rate_used
        self.rate_expected = rate_expected
        self.rate_type_used = rate_type_used
        self.rate_type_expected = rate_type_expected
        self.variance_pct = variance_pct
        self.cta_impact = cta_impact
        self.is_compliant = is_compliant
        self.issues = issues
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "entity_id": self.entity_id,
            "entity_name": self.entity_name,
            "source_currency": self.source_currency,
            "target_currency": self.target_currency,
            "rate_used": self.rate_used,
            "rate_expected": self.rate_expected,
            "rate_type_used": self.rate_type_used,
            "rate_type_expected": self.rate_type_expected,
            "variance_pct": self.variance_pct,
            "cta_impact": self.cta_impact,
            "is_compliant": self.is_compliant,
            "issues": self.issues
        }


class AuditEvidence:
    """Audit evidence generated for agent actions"""
    def __init__(
        self,
        action_id: str,
        action_type: str,
        logic_memo: Dict[str, Any],
        evidence_type: str,  # "match_evidence", "elimination_evidence", "fx_evidence"
        source_documents: List[str],
        verification_steps: List[str],
        compliant: bool,
        auditor_notes: str = None
    ):
        self.id = str(uuid.uuid4())
        self.action_id = action_id
        self.action_type = action_type
        self.logic_memo = logic_memo
        self.evidence_type = evidence_type
        self.source_documents = source_documents
        self.verification_steps = verification_steps
        self.compliant = compliant
        self.auditor_notes = auditor_notes
        self.generated_at = datetime.now(timezone.utc)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "action_id": self.action_id,
            "action_type": self.action_type,
            "logic_memo": self.logic_memo,
            "evidence_type": self.evidence_type,
            "source_documents": self.source_documents,
            "verification_steps": self.verification_steps,
            "compliant": self.compliant,
            "auditor_notes": self.auditor_notes,
            "generated_at": self.generated_at.isoformat()
        }


class ComplianceAgent(AgentBase):
    """
    Compliance Agent - Technical Verification
    
    Capabilities:
    - Ownership Logic Gate: Validate IC eliminations between consolidated entities
    - FX Translation Audit: Verify correct exchange rate logic
    - Audit Evidence Generation: Create Logic Memos for every action
    - Governance Checks: Block forbidden eliminations
    """
    
    # Entity relationship types
    CONSOLIDATED_TYPES = ['subsidiary', 'branch', 'division']
    STANDALONE_TYPES = ['associate', 'joint_venture', 'minority_interest', 'standalone']
    
    # FX rate types by account category
    FX_RATE_RULES = {
        "balance_sheet": "year_end_spot",  # Balance sheet items at year-end spot
        "income_statement": "average",      # P&L items at average rate
        "equity": "historical",             # Equity at historical rate
        "dividend": "transaction_date"      # Dividends at transaction date rate
    }
    
    # CTA threshold
    CTA_THRESHOLD_PCT = 5.0  # Flag if CTA exceeds 5% of equity
    
    def __init__(self, db: AsyncIOMotorDatabase, user_id: str):
        super().__init__(db, user_id, "compliance")
        self.llm = AgentLLM()
    
    async def validate_elimination(
        self,
        entity_a_id: str,
        entity_b_id: str,
        transaction_ids: List[str]
    ) -> Tuple[bool, List[GovernanceViolation]]:
        """
        Validate that IC eliminations only occur between entities
        within the same Control Group as defined in Entity Tree.
        """
        violations = []
        
        # Get entity details
        entity_a = await self.db.entity_tree.find_one(
            {"id": entity_a_id, "user_id": self.user_id},
            {"_id": 0}
        )
        entity_b = await self.db.entity_tree.find_one(
            {"id": entity_b_id, "user_id": self.user_id},
            {"_id": 0}
        )
        
        if not entity_a or not entity_b:
            violations.append(GovernanceViolation(
                violation_type="entity_not_found",
                severity="critical",
                entity_id=entity_a_id if not entity_a else entity_b_id,
                description="Entity not found in Entity Tree",
                rule_violated="All entities must be registered in the Entity Tree",
                recommended_action="Register the entity before processing eliminations",
                blocked=True
            ))
            return False, violations
        
        entity_a_name = entity_a.get('name', entity_a_id)
        entity_b_name = entity_b.get('name', entity_b_id)
        entity_a_type = entity_a.get('entity_type', 'unknown').lower()
        entity_b_type = entity_b.get('entity_type', 'unknown').lower()
        
        # Check if both entities are in the consolidated group
        a_is_consolidated = entity_a_type in self.CONSOLIDATED_TYPES
        b_is_consolidated = entity_b_type in self.CONSOLIDATED_TYPES
        
        if not a_is_consolidated or not b_is_consolidated:
            non_consolidated = entity_a_name if not a_is_consolidated else entity_b_name
            non_consolidated_type = entity_a_type if not a_is_consolidated else entity_b_type
            
            violations.append(GovernanceViolation(
                violation_type="non_consolidated_elimination",
                severity="critical",
                entity_id=entity_a_id,
                entity_name=entity_a_name,
                counterparty_id=entity_b_id,
                counterparty_name=entity_b_name,
                description=f"Attempted elimination with non-consolidated entity '{non_consolidated}' (type: {non_consolidated_type})",
                rule_violated="IC eliminations can only occur between entities within the same Control Group",
                recommended_action=f"Review entity classification or process as equity method adjustment",
                blocked=True
            ))
        
        # Check if entities share the same parent (belong to same consolidation group)
        a_parent = entity_a.get('parent_entity_id')
        b_parent = entity_b.get('parent_entity_id')
        
        # If both have different parents and neither is parent of the other
        if a_parent and b_parent:
            if a_parent != b_parent and a_parent != entity_b_id and b_parent != entity_a_id:
                # Check if they share a common ancestor
                common_ancestor = await self._find_common_ancestor(entity_a_id, entity_b_id)
                if not common_ancestor:
                    violations.append(GovernanceViolation(
                        violation_type="different_control_groups",
                        severity="high",
                        entity_id=entity_a_id,
                        entity_name=entity_a_name,
                        counterparty_id=entity_b_id,
                        counterparty_name=entity_b_name,
                        description=f"Entities '{entity_a_name}' and '{entity_b_name}' belong to different control groups",
                        rule_violated="IC eliminations should occur within the same legal consolidation group",
                        recommended_action="Verify group structure or adjust consolidation scope",
                        blocked=False  # Warning, not blocking
                    ))
        
        # Log the validation
        is_valid = len([v for v in violations if v.blocked]) == 0
        
        logic_memo = self.create_logic_memo(
            action=f"Validated IC elimination between {entity_a_name} and {entity_b_name}",
            evidence=f"Entity A type: {entity_a_type}, Entity B type: {entity_b_type}. Transactions: {len(transaction_ids)}",
            logic=f"Checked ownership hierarchy and control group membership. Result: {'VALID' if is_valid else 'BLOCKED'}",
            confidence_score=1.0 if is_valid else 0.0,
            source_references=[entity_a_id, entity_b_id] + transaction_ids
        )
        
        await self.log_action(
            action_type=AgentActionType.OWNERSHIP_VALIDATION,
            status=AgentActionStatus.AUTOMATED if is_valid else AgentActionStatus.FLAGGED,
            logic_memo=logic_memo,
            entity_id=entity_a_id,
            related_ids=[entity_a_id, entity_b_id] + transaction_ids,
            before_state={"pending_elimination": True},
            after_state={"validated": is_valid, "violations": len(violations)},
            delta_summary=f"Elimination validation: {'PASSED' if is_valid else 'BLOCKED - ' + violations[0].description if violations else 'UNKNOWN'}"
        )
        
        # Store violations if any
        for v in violations:
            v_dict = v.to_dict()
            v_dict['user_id'] = self.user_id
            v_dict['created_at'] = datetime.now(timezone.utc).isoformat()
            await self.db.governance_violations.insert_one(v_dict)
        
        return is_valid, violations
    
    async def _find_common_ancestor(self, entity_a_id: str, entity_b_id: str) -> Optional[str]:
        """Find the common ancestor of two entities in the hierarchy"""
        # Get ancestors of entity A
        ancestors_a = set()
        current = entity_a_id
        
        for _ in range(10):  # Max 10 levels
            entity = await self.db.entity_tree.find_one(
                {"id": current, "user_id": self.user_id},
                {"_id": 0, "parent_entity_id": 1}
            )
            if not entity or not entity.get('parent_entity_id'):
                break
            
            parent = entity['parent_entity_id']
            ancestors_a.add(parent)
            current = parent
        
        # Check if entity B or its ancestors are in A's ancestor chain
        current = entity_b_id
        if current in ancestors_a:
            return current
        
        for _ in range(10):
            entity = await self.db.entity_tree.find_one(
                {"id": current, "user_id": self.user_id},
                {"_id": 0, "parent_entity_id": 1}
            )
            if not entity or not entity.get('parent_entity_id'):
                break
            
            parent = entity['parent_entity_id']
            if parent in ancestors_a:
                return parent
            current = parent
        
        return None
    
    async def audit_fx_translation(
        self,
        entity_id: str,
        source_currency: str,
        target_currency: str,
        rate_used: float,
        account_category: str,  # "balance_sheet", "income_statement", "equity"
        current_rates: Dict[str, float] = None
    ) -> FXAuditResult:
        """
        Verify that elimination journals use correct exchange rate logic.
        - Balance Sheet: Year-End Spot
        - Income Statement: Average rate
        - Equity: Historical rate
        """
        entity = await self.db.entity_tree.find_one(
            {"id": entity_id, "user_id": self.user_id},
            {"_id": 0, "name": 1}
        )
        entity_name = entity.get('name') if entity else entity_id
        
        issues = []
        is_compliant = True
        
        # Determine expected rate type
        expected_rate_type = self.FX_RATE_RULES.get(account_category, "average")
        
        # Get expected rate (would fetch from API in production)
        if current_rates:
            if expected_rate_type == "year_end_spot":
                rate_expected = current_rates.get('spot', rate_used)
            elif expected_rate_type == "average":
                rate_expected = current_rates.get('average', rate_used)
            else:
                rate_expected = current_rates.get('historical', rate_used)
        else:
            rate_expected = rate_used  # Assume correct if no reference
        
        # Calculate variance
        if rate_expected != 0:
            variance_pct = abs(rate_used - rate_expected) / rate_expected * 100
        else:
            variance_pct = 0
        
        # Check for compliance issues
        if variance_pct > 1.0:  # More than 1% variance
            issues.append(f"Rate variance of {variance_pct:.2f}% exceeds 1% threshold")
            is_compliant = False
        
        # Calculate CTA impact (simplified)
        # In production, would calculate based on actual balances
        cta_impact = variance_pct * 10000  # Placeholder calculation
        
        if cta_impact > self.CTA_THRESHOLD_PCT:
            issues.append(f"CTA impact of {cta_impact:.2f}% exceeds {self.CTA_THRESHOLD_PCT}% threshold")
        
        result = FXAuditResult(
            entity_id=entity_id,
            entity_name=entity_name,
            source_currency=source_currency,
            target_currency=target_currency,
            rate_used=rate_used,
            rate_expected=rate_expected,
            rate_type_used="spot",  # Would be determined from actual transaction
            rate_type_expected=expected_rate_type,
            variance_pct=variance_pct,
            cta_impact=cta_impact,
            is_compliant=is_compliant,
            issues=issues
        )
        
        # Log the audit
        logic_memo = self.create_logic_memo(
            action=f"FX translation audit for {entity_name}",
            evidence=f"{source_currency}/{target_currency}: Used {rate_used:.4f}, Expected {rate_expected:.4f} ({expected_rate_type})",
            logic=f"Variance: {variance_pct:.2f}%. Account category: {account_category}. Compliant: {is_compliant}",
            confidence_score=0.95,
            source_references=[entity_id]
        )
        
        await self.log_action(
            action_type=AgentActionType.FX_TRANSLATION_AUDIT,
            status=AgentActionStatus.AUTOMATED if is_compliant else AgentActionStatus.FLAGGED,
            logic_memo=logic_memo,
            entity_id=entity_id,
            before_state={"rate_used": rate_used, "account_category": account_category},
            after_state=result.to_dict(),
            delta_summary=f"FX Audit: {source_currency}/{target_currency} {'COMPLIANT' if is_compliant else 'NON-COMPLIANT'}"
        )
        
        return result
    
    async def generate_audit_evidence(
        self,
        action_id: str
    ) -> Optional[AuditEvidence]:
        """
        Generate audit evidence for an agent action.
        Creates a Logic Memo with full traceability.
        """
        # Get the action
        action = await self.db.agent_actions.find_one(
            {"id": action_id, "user_id": self.user_id},
            {"_id": 0}
        )
        
        if not action:
            return None
        
        logic_memo = action.get('logic_memo', {})
        action_type = action.get('action_type', '')
        
        # Determine evidence type
        evidence_type = "general"
        if "match" in action_type:
            evidence_type = "match_evidence"
        elif "elimination" in action_type:
            evidence_type = "elimination_evidence"
        elif "fx" in action_type.lower():
            evidence_type = "fx_evidence"
        
        # Build verification steps
        verification_steps = [
            f"Action ID: {action_id}",
            f"Action Type: {action_type}",
            f"Agent: {action.get('agent_type', 'unknown')}",
            f"Timestamp: {action.get('created_at', 'unknown')}",
            f"Confidence: {logic_memo.get('confidence_score', 0) * 100:.1f}%"
        ]
        
        if action.get('before_state'):
            verification_steps.append(f"Before State: {action['before_state']}")
        if action.get('after_state'):
            verification_steps.append(f"After State: {action['after_state']}")
        
        # Compliance check
        compliant = action.get('status') not in ['flagged', 'rejected']
        
        evidence = AuditEvidence(
            action_id=action_id,
            action_type=action_type,
            logic_memo=logic_memo,
            evidence_type=evidence_type,
            source_documents=logic_memo.get('source_references', []),
            verification_steps=verification_steps,
            compliant=compliant,
            auditor_notes=action.get('delta_summary')
        )
        
        # Store the evidence
        evidence_dict = evidence.to_dict()
        evidence_dict['user_id'] = self.user_id
        await self.db.audit_evidence.insert_one(evidence_dict)
        
        return evidence
    
    async def run_governance_check(
        self,
        consolidation_group_id: str = None
    ) -> Dict[str, Any]:
        """
        Run a comprehensive governance check on all IC activities.
        Returns summary of compliance status.
        """
        results = {
            "checked_at": datetime.now(timezone.utc).isoformat(),
            "total_eliminations_checked": 0,
            "compliant": 0,
            "non_compliant": 0,
            "blocked": 0,
            "violations": [],
            "fx_issues": [],
            "recommendations": []
        }
        
        # Get all IC transactions
        query = {"user_id": self.user_id, "status": {"$in": ["matched", "eliminated"]}}
        ic_transactions = await self.db.ic_transactions.find(query, {"_id": 0}).to_list(1000)
        
        # Group by entity pairs
        entity_pairs = {}
        for tx in ic_transactions:
            pair_key = f"{tx.get('source_entity_id')}_{tx.get('counterparty_entity_id')}"
            if pair_key not in entity_pairs:
                entity_pairs[pair_key] = []
            entity_pairs[pair_key].append(tx)
        
        results["total_eliminations_checked"] = len(entity_pairs)
        
        # Check each pair
        for pair_key, txs in entity_pairs.items():
            entity_ids = pair_key.split('_')
            if len(entity_ids) != 2:
                continue
            
            tx_ids = [tx.get('id') for tx in txs]
            is_valid, violations = await self.validate_elimination(
                entity_ids[0], entity_ids[1], tx_ids
            )
            
            if is_valid:
                results["compliant"] += 1
            else:
                results["non_compliant"] += 1
                if any(v.blocked for v in violations):
                    results["blocked"] += 1
                results["violations"].extend([v.to_dict() for v in violations])
        
        # Generate recommendations
        if results["non_compliant"] > 0:
            results["recommendations"].append({
                "priority": "high",
                "recommendation": f"Review {results['non_compliant']} non-compliant IC relationships",
                "details": "Some eliminations involve entities outside the consolidated group"
            })
        
        if results["blocked"] > 0:
            results["recommendations"].append({
                "priority": "critical",
                "recommendation": f"{results['blocked']} eliminations are blocked pending review",
                "details": "These cannot be processed until ownership issues are resolved"
            })
        
        # Log the governance check
        logic_memo = self.create_logic_memo(
            action="Comprehensive governance check completed",
            evidence=f"Checked {results['total_eliminations_checked']} IC relationships",
            logic=f"Compliant: {results['compliant']}, Non-compliant: {results['non_compliant']}, Blocked: {results['blocked']}",
            confidence_score=1.0,
            source_references=list(entity_pairs.keys())[:10]
        )
        
        await self.log_action(
            action_type=AgentActionType.GOVERNANCE_CHECK,
            status=AgentActionStatus.AUTOMATED if results['blocked'] == 0 else AgentActionStatus.FLAGGED,
            logic_memo=logic_memo,
            before_state={"total_pairs": len(entity_pairs)},
            after_state=results,
            delta_summary=f"Governance check: {results['compliant']}/{results['total_eliminations_checked']} compliant"
        )
        
        return results
    
    async def get_violations(
        self,
        severity: str = None,
        include_resolved: bool = False
    ) -> List[Dict[str, Any]]:
        """Get governance violations"""
        query = {"user_id": self.user_id}
        
        if severity:
            query["severity"] = severity
        
        if not include_resolved:
            query["resolved"] = {"$ne": True}
        
        violations = await self.db.governance_violations.find(
            query, {"_id": 0}
        ).sort("created_at", -1).to_list(100)
        
        return violations
    
    async def resolve_violation(
        self,
        violation_id: str,
        resolved_by: str,
        resolution_notes: str
    ) -> bool:
        """Mark a violation as resolved"""
        result = await self.db.governance_violations.update_one(
            {"id": violation_id, "user_id": self.user_id},
            {"$set": {
                "resolved": True,
                "resolved_at": datetime.now(timezone.utc).isoformat(),
                "resolved_by": resolved_by,
                "resolution_notes": resolution_notes
            }}
        )
        return result.modified_count > 0
