"""
Heal Agent - Autonomous Exception Resolution
Investigates IC variances, finds near-matches, proposes self-healing journals
"""
import os
import re
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from collections import defaultdict

from .base import (
    AgentBase, AgentActionType, AgentActionStatus,
    LogicMemo, AgentLLM
)


class VarianceInvestigation:
    """Result of variance investigation between two entities"""
    def __init__(
        self,
        entity_a_id: str,
        entity_a_name: str,
        entity_a_balance: float,
        entity_b_id: str,
        entity_b_name: str,
        entity_b_balance: float,
        variance_amount: float,
        variance_pct: float,
        currency: str,
        potential_causes: List[Dict[str, Any]],
        near_matches: List[Dict[str, Any]],
        recommended_action: str
    ):
        self.entity_a_id = entity_a_id
        self.entity_a_name = entity_a_name
        self.entity_a_balance = entity_a_balance
        self.entity_b_id = entity_b_id
        self.entity_b_name = entity_b_name
        self.entity_b_balance = entity_b_balance
        self.variance_amount = variance_amount
        self.variance_pct = variance_pct
        self.currency = currency
        self.potential_causes = potential_causes
        self.near_matches = near_matches
        self.recommended_action = recommended_action
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "entity_a_id": self.entity_a_id,
            "entity_a_name": self.entity_a_name,
            "entity_a_balance": self.entity_a_balance,
            "entity_b_id": self.entity_b_id,
            "entity_b_name": self.entity_b_name,
            "entity_b_balance": self.entity_b_balance,
            "variance_amount": self.variance_amount,
            "variance_pct": self.variance_pct,
            "currency": self.currency,
            "potential_causes": self.potential_causes,
            "near_matches": self.near_matches,
            "recommended_action": self.recommended_action
        }


class SelfHealingJournal:
    """Proposed self-healing journal entry"""
    def __init__(
        self,
        id: str = None,
        entity_id: str = None,
        entity_name: str = None,
        journal_type: str = None,  # "fx_rounding", "timing_diff", "plug"
        description: str = None,
        debit_account: str = None,
        credit_account: str = None,
        amount: float = None,
        currency: str = None,
        related_variance_id: str = None,
        confidence_score: float = 0.0,
        explanation: str = None,
        status: str = "proposed"  # proposed, approved, posted, rejected
    ):
        self.id = id or str(uuid.uuid4())
        self.entity_id = entity_id
        self.entity_name = entity_name
        self.journal_type = journal_type
        self.description = description
        self.debit_account = debit_account
        self.credit_account = credit_account
        self.amount = amount
        self.currency = currency
        self.related_variance_id = related_variance_id
        self.confidence_score = confidence_score
        self.explanation = explanation
        self.status = status
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "entity_id": self.entity_id,
            "entity_name": self.entity_name,
            "journal_type": self.journal_type,
            "description": self.description,
            "debit_account": self.debit_account,
            "credit_account": self.credit_account,
            "amount": self.amount,
            "currency": self.currency,
            "related_variance_id": self.related_variance_id,
            "confidence_score": self.confidence_score,
            "explanation": self.explanation,
            "status": self.status
        }


class MissingEntryDraft:
    """Draft of a missing entry identified in one entity"""
    def __init__(
        self,
        source_entity_id: str,
        source_entity_name: str,
        target_entity_id: str,
        target_entity_name: str,
        original_transaction: Dict[str, Any],
        suggested_entry: Dict[str, Any],
        match_evidence: str,
        confidence_score: float
    ):
        self.source_entity_id = source_entity_id
        self.source_entity_name = source_entity_name
        self.target_entity_id = target_entity_id
        self.target_entity_name = target_entity_name
        self.original_transaction = original_transaction
        self.suggested_entry = suggested_entry
        self.match_evidence = match_evidence
        self.confidence_score = confidence_score
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "source_entity_id": self.source_entity_id,
            "source_entity_name": self.source_entity_name,
            "target_entity_id": self.target_entity_id,
            "target_entity_name": self.target_entity_name,
            "original_transaction": self.original_transaction,
            "suggested_entry": self.suggested_entry,
            "match_evidence": self.match_evidence,
            "confidence_score": self.confidence_score
        }


class HealAgent(AgentBase):
    """
    Heal Agent - Autonomous Exception Resolution
    
    Capabilities:
    - Investigate IC variances by comparing ledgers
    - Find near-matches (inverted numbers, date-shifted entries)
    - Propose self-healing journals for small variances
    - Draft missing entries for one-click posting
    """
    
    # Thresholds
    VARIANCE_THRESHOLD_PCT = 0.01  # 1% - triggers investigation
    AUTO_HEAL_THRESHOLD = 100  # Auto-propose plug for variances under $100
    FX_ROUNDING_THRESHOLD = 50  # Likely FX rounding if under $50
    
    # Common variance causes
    VARIANCE_CAUSES = {
        "timing_difference": "Transaction recorded in different periods",
        "fx_rounding": "Foreign exchange rounding difference",
        "inverted_entry": "Amount digits may be inverted (e.g., 123 vs 132)",
        "missing_entry": "Transaction exists in one ledger but not the other",
        "coding_difference": "Same transaction coded to different accounts",
        "partial_payment": "Partial payment or settlement",
        "bank_fee": "Bank charges or fees not recorded",
        "description_mismatch": "Similar amounts with different descriptions"
    }
    
    def __init__(self, db: AsyncIOMotorDatabase, user_id: str):
        super().__init__(db, user_id, "heal")
        self.llm = AgentLLM()
    
    async def investigate_ic_variance(
        self,
        entity_a_id: str,
        entity_b_id: str,
        variance_amount: float,
        currency: str = "USD"
    ) -> VarianceInvestigation:
        """
        Deep investigation of IC variance between two entities.
        Compares line-item metadata to find the root cause.
        """
        # Get entity names
        entity_a = await self.db.entity_tree.find_one(
            {"id": entity_a_id, "user_id": self.user_id},
            {"_id": 0, "name": 1}
        )
        entity_b = await self.db.entity_tree.find_one(
            {"id": entity_b_id, "user_id": self.user_id},
            {"_id": 0, "name": 1}
        )
        
        entity_a_name = entity_a.get('name') if entity_a else entity_a_id
        entity_b_name = entity_b.get('name') if entity_b else entity_b_id
        
        # Get IC transactions between these entities
        ic_txs_a = await self.db.ic_transactions.find({
            "user_id": self.user_id,
            "source_entity_id": entity_a_id,
            "counterparty_entity_id": entity_b_id
        }, {"_id": 0}).to_list(200)
        
        ic_txs_b = await self.db.ic_transactions.find({
            "user_id": self.user_id,
            "source_entity_id": entity_b_id,
            "counterparty_entity_id": entity_a_id
        }, {"_id": 0}).to_list(200)
        
        # Calculate balances
        balance_a = sum(tx.get('amount', 0) for tx in ic_txs_a)
        balance_b = sum(tx.get('amount', 0) for tx in ic_txs_b)
        
        calculated_variance = abs(balance_a - balance_b)
        variance_pct = calculated_variance / max(balance_a, balance_b, 1) * 100
        
        # Look for near-matches and potential causes
        potential_causes = []
        near_matches = []
        
        # Check for inverted numbers
        near_matches.extend(await self._find_inverted_amounts(ic_txs_a, ic_txs_b))
        
        # Check for date-shifted entries
        near_matches.extend(await self._find_date_shifted_entries(ic_txs_a, ic_txs_b))
        
        # Check for unmatched transactions
        unmatched_a = [tx for tx in ic_txs_a if tx.get('status') == 'pending']
        unmatched_b = [tx for tx in ic_txs_b if tx.get('status') == 'pending']
        
        # Analyze potential causes
        if abs(variance_amount) <= self.FX_ROUNDING_THRESHOLD:
            potential_causes.append({
                "cause": "fx_rounding",
                "description": self.VARIANCE_CAUSES["fx_rounding"],
                "confidence": 0.85,
                "details": f"Small variance of {currency} {variance_amount:.2f} consistent with FX rounding"
            })
        
        if near_matches:
            potential_causes.append({
                "cause": "inverted_entry",
                "description": self.VARIANCE_CAUSES["inverted_entry"],
                "confidence": 0.75,
                "details": f"Found {len(near_matches)} potential inverted or near-match entries"
            })
        
        if unmatched_a or unmatched_b:
            potential_causes.append({
                "cause": "missing_entry",
                "description": self.VARIANCE_CAUSES["missing_entry"],
                "confidence": 0.90,
                "details": f"Entity A has {len(unmatched_a)} unmatched, Entity B has {len(unmatched_b)} unmatched"
            })
        
        if not potential_causes:
            potential_causes.append({
                "cause": "timing_difference",
                "description": self.VARIANCE_CAUSES["timing_difference"],
                "confidence": 0.60,
                "details": "Variance may be due to timing differences in recording"
            })
        
        # Determine recommended action
        if abs(variance_amount) <= self.AUTO_HEAL_THRESHOLD:
            recommended_action = "auto_heal_plug"
        elif near_matches:
            recommended_action = "review_near_matches"
        elif unmatched_a or unmatched_b:
            recommended_action = "review_missing_entries"
        else:
            recommended_action = "manual_investigation"
        
        investigation = VarianceInvestigation(
            entity_a_id=entity_a_id,
            entity_a_name=entity_a_name,
            entity_a_balance=balance_a,
            entity_b_id=entity_b_id,
            entity_b_name=entity_b_name,
            entity_b_balance=balance_b,
            variance_amount=variance_amount,
            variance_pct=variance_pct,
            currency=currency,
            potential_causes=potential_causes,
            near_matches=near_matches,
            recommended_action=recommended_action
        )
        
        # Log the investigation
        logic_memo = self.create_logic_memo(
            action=f"Investigated IC variance between {entity_a_name} and {entity_b_name}",
            evidence=f"Variance: {currency} {variance_amount:.2f} ({variance_pct:.2f}%). Found {len(potential_causes)} potential causes, {len(near_matches)} near-matches",
            logic=f"Recommended action: {recommended_action}. Primary cause: {potential_causes[0]['cause'] if potential_causes else 'unknown'}",
            confidence_score=max([c.get('confidence', 0) for c in potential_causes]) if potential_causes else 0.5,
            source_references=[entity_a_id, entity_b_id]
        )
        
        await self.log_action(
            action_type=AgentActionType.VARIANCE_INVESTIGATION,
            status=AgentActionStatus.AUTOMATED if abs(variance_amount) <= self.AUTO_HEAL_THRESHOLD else AgentActionStatus.FLAGGED,
            logic_memo=logic_memo,
            entity_id=entity_a_id,
            related_ids=[entity_a_id, entity_b_id],
            before_state={"variance": variance_amount, "status": "unresolved"},
            after_state={"investigation_complete": True, "recommended_action": recommended_action},
            delta_summary=f"Investigated variance: {currency} {variance_amount:.2f} between {entity_a_name} and {entity_b_name}"
        )
        
        return investigation
    
    async def _find_inverted_amounts(
        self,
        txs_a: List[Dict[str, Any]],
        txs_b: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Find transactions with potentially inverted amounts (e.g., 123 vs 132)"""
        near_matches = []
        
        for tx_a in txs_a:
            amount_a = tx_a.get('amount', 0)
            amount_a_str = str(int(abs(amount_a)))
            
            for tx_b in txs_b:
                amount_b = tx_b.get('amount', 0)
                amount_b_str = str(int(abs(amount_b)))
                
                # Check if amounts are anagrams (inverted digits)
                if len(amount_a_str) == len(amount_b_str) and len(amount_a_str) >= 3:
                    if sorted(amount_a_str) == sorted(amount_b_str) and amount_a_str != amount_b_str:
                        near_matches.append({
                            "type": "inverted_digits",
                            "tx_a_id": tx_a.get('id'),
                            "tx_a_amount": amount_a,
                            "tx_b_id": tx_b.get('id'),
                            "tx_b_amount": amount_b,
                            "evidence": f"Amounts {amount_a_str} and {amount_b_str} are digit inversions"
                        })
        
        return near_matches
    
    async def _find_date_shifted_entries(
        self,
        txs_a: List[Dict[str, Any]],
        txs_b: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """Find transactions with same amount but different dates"""
        near_matches = []
        
        for tx_a in txs_a:
            if tx_a.get('status') != 'pending':
                continue
            
            amount_a = tx_a.get('amount', 0)
            date_a = tx_a.get('transaction_date')
            if isinstance(date_a, str):
                date_a = datetime.fromisoformat(date_a.replace('Z', '+00:00'))
            
            for tx_b in txs_b:
                if tx_b.get('status') != 'pending':
                    continue
                
                amount_b = tx_b.get('amount', 0)
                
                # Check for same amount (within 1%)
                if abs(amount_a - amount_b) / max(abs(amount_a), 1) <= 0.01:
                    date_b = tx_b.get('transaction_date')
                    if isinstance(date_b, str):
                        date_b = datetime.fromisoformat(date_b.replace('Z', '+00:00'))
                    
                    if date_a and date_b:
                        date_diff = abs((date_a - date_b).days)
                        
                        if 1 <= date_diff <= 30:  # Between 1-30 days apart
                            near_matches.append({
                                "type": "date_shifted",
                                "tx_a_id": tx_a.get('id'),
                                "tx_a_amount": amount_a,
                                "tx_a_date": date_a.isoformat() if date_a else None,
                                "tx_b_id": tx_b.get('id'),
                                "tx_b_amount": amount_b,
                                "tx_b_date": date_b.isoformat() if date_b else None,
                                "date_diff_days": date_diff,
                                "evidence": f"Same amount ({amount_a}), {date_diff} days apart"
                            })
        
        return near_matches
    
    async def propose_self_healing_journal(
        self,
        investigation: VarianceInvestigation
    ) -> Optional[SelfHealingJournal]:
        """
        Propose a self-healing journal entry for small, recurring variances.
        Posts to designated IC Suspense account.
        """
        # Only auto-propose for small variances
        if abs(investigation.variance_amount) > self.AUTO_HEAL_THRESHOLD:
            return None
        
        # Determine journal type based on variance analysis
        primary_cause = investigation.potential_causes[0] if investigation.potential_causes else None
        
        if primary_cause:
            cause = primary_cause.get('cause')
            
            if cause == 'fx_rounding':
                journal_type = 'fx_rounding'
                debit_account = 'GROUP_FX_GAIN_LOSS'
                credit_account = 'IC_SUSPENSE'
                description = f"FX rounding adjustment: {investigation.entity_a_name} ↔ {investigation.entity_b_name}"
            else:
                journal_type = 'plug'
                debit_account = 'IC_SUSPENSE'
                credit_account = 'IC_CLEARING'
                description = f"IC variance plug: {investigation.entity_a_name} ↔ {investigation.entity_b_name}"
        else:
            journal_type = 'plug'
            debit_account = 'IC_SUSPENSE'
            credit_account = 'IC_CLEARING'
            description = f"IC variance adjustment"
        
        journal = SelfHealingJournal(
            entity_id=investigation.entity_a_id,
            entity_name=investigation.entity_a_name,
            journal_type=journal_type,
            description=description,
            debit_account=debit_account,
            credit_account=credit_account,
            amount=abs(investigation.variance_amount),
            currency=investigation.currency,
            related_variance_id=f"{investigation.entity_a_id}_{investigation.entity_b_id}",
            confidence_score=primary_cause.get('confidence', 0.7) if primary_cause else 0.6,
            explanation=f"Auto-proposed to resolve {investigation.currency} {investigation.variance_amount:.2f} variance. Cause: {primary_cause.get('description') if primary_cause else 'Unknown'}",
            status="proposed"
        )
        
        # Store the proposed journal
        journal_dict = journal.to_dict()
        journal_dict['user_id'] = self.user_id
        journal_dict['created_at'] = datetime.now(timezone.utc).isoformat()
        await self.db.self_healing_journals.insert_one(journal_dict)
        
        # Log the proposal
        logic_memo = self.create_logic_memo(
            action=f"Proposed self-healing journal for IC variance",
            evidence=f"Variance: {investigation.currency} {investigation.variance_amount:.2f}. Cause: {primary_cause.get('cause') if primary_cause else 'unknown'}",
            logic=f"Journal type: {journal_type}. DR {debit_account} / CR {credit_account}",
            confidence_score=journal.confidence_score,
            source_references=[investigation.entity_a_id, investigation.entity_b_id, journal.id]
        )
        
        await self.log_action(
            action_type=AgentActionType.SELF_HEALING_JOURNAL,
            status=AgentActionStatus.PROPOSED,
            logic_memo=logic_memo,
            entity_id=investigation.entity_a_id,
            related_ids=[investigation.entity_a_id, investigation.entity_b_id],
            before_state={"variance": investigation.variance_amount},
            after_state={"proposed_journal": journal.to_dict()},
            delta_summary=f"Proposed {journal_type} journal for {investigation.currency} {investigation.variance_amount:.2f}"
        )
        
        return journal
    
    async def draft_missing_entry(
        self,
        source_entity_id: str,
        target_entity_id: str,
        missing_transaction: Dict[str, Any]
    ) -> MissingEntryDraft:
        """
        Draft a missing entry for an entity based on the counterparty's records.
        Enables one-click posting to resolve IC mismatches.
        """
        # Get entity names
        source_entity = await self.db.entity_tree.find_one(
            {"id": source_entity_id, "user_id": self.user_id},
            {"_id": 0, "name": 1}
        )
        target_entity = await self.db.entity_tree.find_one(
            {"id": target_entity_id, "user_id": self.user_id},
            {"_id": 0, "name": 1}
        )
        
        source_name = source_entity.get('name') if source_entity else source_entity_id
        target_name = target_entity.get('name') if target_entity else target_entity_id
        
        # Create the counterparty entry
        original_type = missing_transaction.get('transaction_type', 'other')
        
        # Determine counterparty transaction type
        type_mapping = {
            'sale': 'purchase',
            'purchase': 'sale',
            'loan': 'loan',
            'dividend': 'dividend',
            'management_fee': 'management_fee',
            'royalty': 'royalty'
        }
        
        counterparty_type = type_mapping.get(original_type, 'other')
        
        suggested_entry = {
            "source_entity_id": target_entity_id,
            "counterparty_entity_id": source_entity_id,
            "transaction_type": counterparty_type,
            "description": f"IC Entry - Counterparty to {source_name}: {missing_transaction.get('description', '')}",
            "amount": missing_transaction.get('amount', 0),
            "currency": missing_transaction.get('currency', 'USD'),
            "transaction_date": missing_transaction.get('transaction_date'),
            "reference": missing_transaction.get('reference', ''),
            "status": "pending",
            "drafted_by_agent": True,
            "original_transaction_id": missing_transaction.get('id')
        }
        
        draft = MissingEntryDraft(
            source_entity_id=source_entity_id,
            source_entity_name=source_name,
            target_entity_id=target_entity_id,
            target_entity_name=target_name,
            original_transaction=missing_transaction,
            suggested_entry=suggested_entry,
            match_evidence=f"Original transaction in {source_name}: {missing_transaction.get('description')}, Amount: {missing_transaction.get('amount')}",
            confidence_score=0.85
        )
        
        # Store the draft
        draft_dict = draft.to_dict()
        draft_dict['id'] = str(uuid.uuid4())
        draft_dict['user_id'] = self.user_id
        draft_dict['created_at'] = datetime.now(timezone.utc).isoformat()
        draft_dict['status'] = 'pending'
        await self.db.missing_entry_drafts.insert_one(draft_dict)
        
        # Log the draft
        logic_memo = self.create_logic_memo(
            action=f"Drafted missing IC entry for {target_name}",
            evidence=f"Found in {source_name}: {missing_transaction.get('description')}, {missing_transaction.get('currency')} {missing_transaction.get('amount')}",
            logic=f"Created counterparty entry ({counterparty_type}) for one-click posting",
            confidence_score=draft.confidence_score,
            source_references=[source_entity_id, target_entity_id, missing_transaction.get('id')]
        )
        
        await self.log_action(
            action_type=AgentActionType.MISSING_ENTRY_DRAFT,
            status=AgentActionStatus.PROPOSED,
            logic_memo=logic_memo,
            entity_id=target_entity_id,
            related_ids=[source_entity_id, target_entity_id],
            before_state={"missing_entry": True},
            after_state={"draft_created": True, "draft_id": draft_dict['id']},
            delta_summary=f"Drafted missing entry for {target_name}: {missing_transaction.get('amount')}"
        )
        
        return draft
    
    async def post_missing_entry(
        self,
        draft_id: str,
        approved_by: str
    ) -> Dict[str, Any]:
        """
        Post a drafted missing entry after human approval.
        One-click posting to the target entity's ledger.
        """
        # Get the draft
        draft = await self.db.missing_entry_drafts.find_one(
            {"id": draft_id, "user_id": self.user_id},
            {"_id": 0}
        )
        
        if not draft:
            return {"success": False, "error": "Draft not found"}
        
        if draft.get('status') == 'posted':
            return {"success": False, "error": "Draft already posted"}
        
        # Create the IC transaction
        entry = draft.get('suggested_entry', {})
        entry['id'] = str(uuid.uuid4())
        entry['user_id'] = self.user_id
        entry['source_entity_name'] = draft.get('target_entity_name')
        entry['counterparty_entity_name'] = draft.get('source_entity_name')
        entry['created_at'] = datetime.now(timezone.utc).isoformat()
        entry['posted_from_draft'] = True
        entry['approved_by'] = approved_by
        
        await self.db.ic_transactions.insert_one(entry)
        
        # Update draft status
        await self.db.missing_entry_drafts.update_one(
            {"id": draft_id},
            {"$set": {
                "status": "posted",
                "posted_at": datetime.now(timezone.utc).isoformat(),
                "posted_by": approved_by,
                "posted_transaction_id": entry['id']
            }}
        )
        
        return {
            "success": True,
            "transaction_id": entry['id'],
            "message": f"Posted IC entry to {draft.get('target_entity_name')}"
        }
    
    async def approve_self_healing_journal(
        self,
        journal_id: str,
        approved_by: str
    ) -> Dict[str, Any]:
        """
        Approve and post a self-healing journal entry.
        """
        journal = await self.db.self_healing_journals.find_one(
            {"id": journal_id, "user_id": self.user_id},
            {"_id": 0}
        )
        
        if not journal:
            return {"success": False, "error": "Journal not found"}
        
        if journal.get('status') == 'posted':
            return {"success": False, "error": "Journal already posted"}
        
        # Update journal status
        await self.db.self_healing_journals.update_one(
            {"id": journal_id},
            {"$set": {
                "status": "posted",
                "posted_at": datetime.now(timezone.utc).isoformat(),
                "approved_by": approved_by
            }}
        )
        
        # Create the actual journal entry record
        journal_entry = {
            "id": str(uuid.uuid4()),
            "user_id": self.user_id,
            "entity_id": journal.get('entity_id'),
            "type": "self_healing",
            "description": journal.get('description'),
            "debit_account": journal.get('debit_account'),
            "credit_account": journal.get('credit_account'),
            "amount": journal.get('amount'),
            "currency": journal.get('currency'),
            "source_journal_id": journal_id,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": approved_by
        }
        
        await self.db.journal_entries.insert_one(journal_entry)
        
        return {
            "success": True,
            "journal_entry_id": journal_entry['id'],
            "message": f"Posted self-healing journal: {journal.get('description')}"
        }
    
    async def get_pending_heals(self) -> Dict[str, Any]:
        """Get all pending self-healing items for review"""
        pending_journals = await self.db.self_healing_journals.find(
            {"user_id": self.user_id, "status": "proposed"},
            {"_id": 0}
        ).to_list(100)
        
        pending_drafts = await self.db.missing_entry_drafts.find(
            {"user_id": self.user_id, "status": "pending"},
            {"_id": 0}
        ).to_list(100)
        
        return {
            "pending_journals": pending_journals,
            "pending_drafts": pending_drafts,
            "total_pending": len(pending_journals) + len(pending_drafts)
        }
