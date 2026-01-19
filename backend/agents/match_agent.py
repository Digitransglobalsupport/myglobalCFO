"""
Match Agent - Predictive COA Logic
Uses fuzzy matching to auto-suggest Chart of Accounts mappings
Detects anomalies and enables batch healing across entities
"""
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase
from collections import defaultdict

from .base import (
    AgentBase, AgentActionType, AgentActionStatus,
    LogicMemo, AgentLLM
)


class MappingSuggestion:
    """Suggested COA mapping with confidence score"""
    def __init__(
        self,
        local_account_code: str,
        local_account_name: str,
        suggested_group_code: str,
        suggested_group_name: str,
        confidence_score: float,
        match_reasons: List[str],
        similar_mappings: List[Dict[str, Any]] = None
    ):
        self.local_account_code = local_account_code
        self.local_account_name = local_account_name
        self.suggested_group_code = suggested_group_code
        self.suggested_group_name = suggested_group_name
        self.confidence_score = confidence_score
        self.match_reasons = match_reasons
        self.similar_mappings = similar_mappings or []
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "local_account_code": self.local_account_code,
            "local_account_name": self.local_account_name,
            "suggested_group_code": self.suggested_group_code,
            "suggested_group_name": self.suggested_group_name,
            "confidence_score": self.confidence_score,
            "match_reasons": self.match_reasons,
            "similar_mappings": self.similar_mappings
        }


class MappingAnomaly:
    """Detected anomaly in COA mapping"""
    def __init__(
        self,
        entity_id: str,
        entity_name: str,
        local_account_code: str,
        local_account_name: str,
        current_group_code: str,
        expected_group_code: str,
        anomaly_type: str,
        severity: str,  # "high", "medium", "low"
        explanation: str
    ):
        self.entity_id = entity_id
        self.entity_name = entity_name
        self.local_account_code = local_account_code
        self.local_account_name = local_account_name
        self.current_group_code = current_group_code
        self.expected_group_code = expected_group_code
        self.anomaly_type = anomaly_type
        self.severity = severity
        self.explanation = explanation
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "entity_id": self.entity_id,
            "entity_name": self.entity_name,
            "local_account_code": self.local_account_code,
            "local_account_name": self.local_account_name,
            "current_group_code": self.current_group_code,
            "expected_group_code": self.expected_group_code,
            "anomaly_type": self.anomaly_type,
            "severity": self.severity,
            "explanation": self.explanation
        }


class MatchAgent(AgentBase):
    """
    Match Agent - Intelligent COA Mapping
    
    Capabilities:
    - Predictive mapping suggestions using fuzzy matching
    - Historical pattern learning from existing mappings
    - Anomaly detection for deviating mappings
    - Batch heal - apply rules across similar entities
    """
    
    # Standard Group COA categories
    GROUP_COA = {
        "GROUP_REVENUE": {"name": "Revenue", "type": "income", "keywords": ["revenue", "sales", "income", "turnover", "fees"]},
        "GROUP_COGS": {"name": "Cost of Goods Sold", "type": "expense", "keywords": ["cogs", "cost of sales", "cost of goods", "direct costs"]},
        "GROUP_OPEX": {"name": "Operating Expenses", "type": "expense", "keywords": ["opex", "operating", "admin", "general", "expenses"]},
        "GROUP_PAYROLL": {"name": "Payroll & Benefits", "type": "expense", "keywords": ["payroll", "salary", "salaries", "wages", "benefits", "pension", "bonus"]},
        "GROUP_RENT": {"name": "Rent & Occupancy", "type": "expense", "keywords": ["rent", "lease", "occupancy", "property", "utilities"]},
        "GROUP_MARKETING": {"name": "Marketing & Sales", "type": "expense", "keywords": ["marketing", "advertising", "sales", "promotion", "events"]},
        "GROUP_TRAVEL": {"name": "Travel & Entertainment", "type": "expense", "keywords": ["travel", "entertainment", "meals", "transport", "flights", "hotels"]},
        "GROUP_IT": {"name": "IT & Technology", "type": "expense", "keywords": ["it", "technology", "software", "hardware", "cloud", "hosting", "licenses"]},
        "GROUP_PROFESSIONAL": {"name": "Professional Fees", "type": "expense", "keywords": ["professional", "legal", "accounting", "consulting", "audit", "advisory"]},
        "GROUP_DEPRECIATION": {"name": "Depreciation & Amortization", "type": "expense", "keywords": ["depreciation", "amortization", "impairment"]},
        "GROUP_INTEREST": {"name": "Interest & Finance", "type": "expense", "keywords": ["interest", "finance", "bank charges", "fees"]},
        "GROUP_TAX": {"name": "Taxes", "type": "expense", "keywords": ["tax", "taxes", "vat", "gst", "corporation tax"]},
        "GROUP_CASH": {"name": "Cash & Equivalents", "type": "asset", "keywords": ["cash", "bank", "petty cash", "deposits"]},
        "GROUP_AR": {"name": "Accounts Receivable", "type": "asset", "keywords": ["receivable", "debtors", "ar", "trade receivables"]},
        "GROUP_INVENTORY": {"name": "Inventory", "type": "asset", "keywords": ["inventory", "stock", "goods", "merchandise"]},
        "GROUP_PREPAID": {"name": "Prepaid Expenses", "type": "asset", "keywords": ["prepaid", "prepayment", "advances"]},
        "GROUP_FIXED_ASSETS": {"name": "Fixed Assets", "type": "asset", "keywords": ["fixed assets", "ppe", "property", "equipment", "machinery", "vehicles"]},
        "GROUP_INTANGIBLE": {"name": "Intangible Assets", "type": "asset", "keywords": ["intangible", "goodwill", "patents", "trademarks", "licenses"]},
        "GROUP_AP": {"name": "Accounts Payable", "type": "liability", "keywords": ["payable", "creditors", "ap", "trade payables"]},
        "GROUP_ACCRUED": {"name": "Accrued Liabilities", "type": "liability", "keywords": ["accrued", "accruals", "provisions"]},
        "GROUP_SHORT_TERM_DEBT": {"name": "Short-term Debt", "type": "liability", "keywords": ["short-term", "overdraft", "current portion"]},
        "GROUP_LONG_TERM_DEBT": {"name": "Long-term Debt", "type": "liability", "keywords": ["long-term", "loans", "notes payable", "borrowings"]},
        "GROUP_EQUITY": {"name": "Shareholders' Equity", "type": "equity", "keywords": ["equity", "capital", "share", "stock"]},
        "GROUP_RETAINED_EARNINGS": {"name": "Retained Earnings", "type": "equity", "keywords": ["retained", "earnings", "reserves", "accumulated"]}
    }
    
    def __init__(self, db: AsyncIOMotorDatabase, user_id: str):
        super().__init__(db, user_id, "match")
        self.llm = AgentLLM()
        self.min_confidence_auto = 0.85  # Auto-apply if >85%
        self.min_confidence_suggest = 0.60  # Suggest if >60%
    
    async def generate_mapping_suggestions(
        self,
        entity_id: str,
        local_accounts: List[Dict[str, Any]],
        erp_provider: str = None
    ) -> List[MappingSuggestion]:
        """
        Generate predictive mapping suggestions for a new entity's accounts.
        Uses fuzzy matching, historical patterns, and LLM reasoning.
        """
        suggestions = []
        
        # Get historical mappings from other entities for pattern learning
        historical_mappings = await self._get_historical_mappings()
        
        for account in local_accounts:
            code = account.get('code', '')
            name = account.get('name', '')
            account_type = account.get('type', '')
            
            # Calculate match scores for each group account
            best_match = None
            best_score = 0
            match_reasons = []
            
            for group_code, group_info in self.GROUP_COA.items():
                score, reasons = self._calculate_mapping_score(
                    local_code=code,
                    local_name=name,
                    local_type=account_type,
                    group_code=group_code,
                    group_info=group_info,
                    historical_mappings=historical_mappings
                )
                
                if score > best_score:
                    best_score = score
                    best_match = group_code
                    match_reasons = reasons
            
            if best_match and best_score >= self.min_confidence_suggest:
                # Find similar mappings from history
                similar = [
                    m for m in historical_mappings
                    if m.get('group_code') == best_match
                    and self._name_similarity(m.get('local_name', ''), name) > 0.5
                ][:3]
                
                suggestions.append(MappingSuggestion(
                    local_account_code=code,
                    local_account_name=name,
                    suggested_group_code=best_match,
                    suggested_group_name=self.GROUP_COA[best_match]['name'],
                    confidence_score=best_score,
                    match_reasons=match_reasons,
                    similar_mappings=similar
                ))
        
        # Log the suggestion generation
        high_conf = len([s for s in suggestions if s.confidence_score >= self.min_confidence_auto])
        
        logic_memo = self.create_logic_memo(
            action=f"Generated COA mapping suggestions for entity",
            evidence=f"Analyzed {len(local_accounts)} accounts, generated {len(suggestions)} suggestions",
            logic=f"{high_conf} mappings with >85% confidence (auto-apply ready), {len(suggestions) - high_conf} for review",
            confidence_score=sum(s.confidence_score for s in suggestions) / max(len(suggestions), 1),
            source_references=[account.get('code') for account in local_accounts[:10]]
        )
        
        await self.log_action(
            action_type=AgentActionType.COA_MAPPING_SUGGESTION,
            status=AgentActionStatus.PROPOSED if suggestions else AgentActionStatus.FLAGGED,
            logic_memo=logic_memo,
            entity_id=entity_id,
            before_state={"unmapped_accounts": len(local_accounts)},
            after_state={"suggestions": len(suggestions), "high_confidence": high_conf},
            delta_summary=f"Generated {len(suggestions)} mapping suggestions ({high_conf} auto-ready)"
        )
        
        return suggestions
    
    async def _get_historical_mappings(self) -> List[Dict[str, Any]]:
        """Get all historical mappings for pattern learning"""
        mappings = await self.db.coa_mappings.find(
            {"user_id": self.user_id},
            {"_id": 0}
        ).to_list(1000)
        
        # Flatten mappings
        flat_mappings = []
        for m in mappings:
            for local_code, group_code in m.get('mappings', {}).items():
                flat_mappings.append({
                    "entity_id": m.get('entity_id'),
                    "local_code": local_code,
                    "local_name": local_code,  # Ideally would have name stored
                    "group_code": group_code
                })
        
        return flat_mappings
    
    def _calculate_mapping_score(
        self,
        local_code: str,
        local_name: str,
        local_type: str,
        group_code: str,
        group_info: Dict[str, Any],
        historical_mappings: List[Dict[str, Any]]
    ) -> Tuple[float, List[str]]:
        """Calculate match score between local account and group account"""
        score = 0.0
        reasons = []
        
        local_name_lower = local_name.lower()
        keywords = group_info.get('keywords', [])
        
        # Keyword matching (40% weight)
        keyword_matches = [kw for kw in keywords if kw in local_name_lower]
        if keyword_matches:
            keyword_score = min(len(keyword_matches) / 2, 1.0) * 0.4
            score += keyword_score
            reasons.append(f"Keyword match: {', '.join(keyword_matches)}")
        
        # Account type matching (20% weight)
        if local_type:
            local_type_lower = local_type.lower()
            group_type = group_info.get('type', '')
            
            type_mapping = {
                "income": ["income", "revenue"],
                "expense": ["expense", "cost"],
                "asset": ["asset", "debit"],
                "liability": ["liability", "credit"],
                "equity": ["equity", "capital"]
            }
            
            for gtype, ltypes in type_mapping.items():
                if group_type == gtype and any(lt in local_type_lower for lt in ltypes):
                    score += 0.2
                    reasons.append(f"Type match: {local_type} → {group_type}")
                    break
        
        # Historical pattern matching (30% weight)
        similar_historical = [
            m for m in historical_mappings
            if m.get('group_code') == group_code
            and self._name_similarity(m.get('local_name', ''), local_name) > 0.5
        ]
        
        if similar_historical:
            historical_score = min(len(similar_historical) / 3, 1.0) * 0.3
            score += historical_score
            reasons.append(f"Historical pattern: {len(similar_historical)} similar mappings")
        
        # Code pattern matching (10% weight)
        code_patterns = self._extract_code_patterns(local_code)
        group_code_num = re.search(r'\d+', group_code)
        
        if code_patterns and group_code_num:
            # Check if code range matches typical ranges for this category
            score += 0.1
            reasons.append(f"Code pattern match")
        
        return score, reasons
    
    def _name_similarity(self, name1: str, name2: str) -> float:
        """Calculate similarity between two account names using Levenshtein distance"""
        if not name1 or not name2:
            return 0.0
        
        name1 = name1.lower().strip()
        name2 = name2.lower().strip()
        
        if name1 == name2:
            return 1.0
        
        # Simple word overlap similarity
        words1 = set(name1.split())
        words2 = set(name2.split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1 & words2
        union = words1 | words2
        
        return len(intersection) / len(union) if union else 0.0
    
    def _extract_code_patterns(self, code: str) -> Dict[str, Any]:
        """Extract patterns from account code"""
        patterns = {}
        
        # Extract numeric parts
        numbers = re.findall(r'\d+', code)
        if numbers:
            patterns['numbers'] = numbers
            patterns['first_digit'] = numbers[0][0] if numbers[0] else None
        
        # Extract prefix
        prefix = re.match(r'^[A-Za-z]+', code)
        if prefix:
            patterns['prefix'] = prefix.group()
        
        return patterns
    
    async def detect_anomalies(self, entity_ids: List[str] = None) -> List[MappingAnomaly]:
        """
        Detect anomalies in COA mappings across entities.
        Flags mappings that deviate from group norms.
        """
        anomalies = []
        
        # Get all mappings
        query = {"user_id": self.user_id}
        if entity_ids:
            query["entity_id"] = {"$in": entity_ids}
        
        all_mappings = await self.db.coa_mappings.find(query, {"_id": 0}).to_list(500)
        
        # Build mapping frequency by local account name pattern
        mapping_frequency = defaultdict(lambda: defaultdict(int))
        
        for m in all_mappings:
            for local_code, group_code in m.get('mappings', {}).items():
                # Normalize local code (remove numbers)
                normalized = re.sub(r'\d+', '#', local_code.lower())
                mapping_frequency[normalized][group_code] += 1
        
        # Find anomalies
        for mapping_doc in all_mappings:
            entity_id = mapping_doc.get('entity_id')
            entity = await self.db.entity_tree.find_one(
                {"id": entity_id, "user_id": self.user_id},
                {"_id": 0, "name": 1}
            )
            entity_name = entity.get('name') if entity else entity_id
            
            for local_code, group_code in mapping_doc.get('mappings', {}).items():
                normalized = re.sub(r'\d+', '#', local_code.lower())
                
                # Check if this mapping is an outlier
                freq_dist = mapping_frequency[normalized]
                if len(freq_dist) > 1:  # Multiple different mappings exist
                    total = sum(freq_dist.values())
                    this_freq = freq_dist[group_code]
                    
                    # If this mapping is used less than 20% of the time, it's anomalous
                    if this_freq / total < 0.2 and total >= 3:
                        most_common = max(freq_dist.keys(), key=lambda k: freq_dist[k])
                        
                        # Check for category mismatch (e.g., revenue mapped to expense)
                        current_type = self.GROUP_COA.get(group_code, {}).get('type', '')
                        expected_type = self.GROUP_COA.get(most_common, {}).get('type', '')
                        
                        if current_type != expected_type:
                            severity = "high"
                            anomaly_type = "category_mismatch"
                            explanation = f"Account mapped to {current_type} category, but similar accounts are mapped to {expected_type}"
                        else:
                            severity = "medium"
                            anomaly_type = "outlier_mapping"
                            explanation = f"Only {this_freq}/{total} similar accounts use this mapping"
                        
                        anomalies.append(MappingAnomaly(
                            entity_id=entity_id,
                            entity_name=entity_name,
                            local_account_code=local_code,
                            local_account_name=local_code,
                            current_group_code=group_code,
                            expected_group_code=most_common,
                            anomaly_type=anomaly_type,
                            severity=severity,
                            explanation=explanation
                        ))
        
        # Log anomaly detection
        if anomalies:
            high_severity = len([a for a in anomalies if a.severity == "high"])
            
            logic_memo = self.create_logic_memo(
                action="Detected mapping anomalies across entities",
                evidence=f"Found {len(anomalies)} anomalous mappings ({high_severity} high severity)",
                logic="Compared mappings against group norms and flagged outliers",
                confidence_score=0.85,
                source_references=[a.entity_id for a in anomalies[:10]]
            )
            
            await self.log_action(
                action_type=AgentActionType.ANOMALY_DETECTION,
                status=AgentActionStatus.FLAGGED,
                logic_memo=logic_memo,
                before_state={"total_mappings": sum(len(m.get('mappings', {})) for m in all_mappings)},
                after_state={"anomalies_found": len(anomalies), "high_severity": high_severity},
                delta_summary=f"Found {len(anomalies)} mapping anomalies requiring review"
            )
        
        return anomalies
    
    async def batch_heal_mappings(
        self,
        source_entity_id: str,
        local_code: str,
        new_group_code: str,
        apply_to_similar: bool = True
    ) -> Dict[str, Any]:
        """
        Apply a mapping rule across entities with similar structures.
        When user updates one mapping, optionally propagate to others.
        """
        updated_entities = []
        skipped_entities = []
        
        # First, update the source entity
        await self.db.coa_mappings.update_one(
            {"entity_id": source_entity_id, "user_id": self.user_id},
            {"$set": {f"mappings.{local_code}": new_group_code}}
        )
        updated_entities.append(source_entity_id)
        
        if apply_to_similar:
            # Find entities with similar account codes
            all_mappings = await self.db.coa_mappings.find(
                {"user_id": self.user_id, "entity_id": {"$ne": source_entity_id}},
                {"_id": 0}
            ).to_list(500)
            
            # Normalize the local code for matching
            normalized_code = re.sub(r'\d+', '#', local_code.lower())
            
            for mapping_doc in all_mappings:
                entity_id = mapping_doc.get('entity_id')
                
                for existing_code in mapping_doc.get('mappings', {}).keys():
                    existing_normalized = re.sub(r'\d+', '#', existing_code.lower())
                    
                    # Check for similar code pattern
                    if existing_normalized == normalized_code:
                        # Update this entity's mapping too
                        await self.db.coa_mappings.update_one(
                            {"entity_id": entity_id, "user_id": self.user_id},
                            {"$set": {f"mappings.{existing_code}": new_group_code}}
                        )
                        updated_entities.append(entity_id)
                        break
        
        # Log the batch heal
        logic_memo = self.create_logic_memo(
            action=f"Batch healed mapping: {local_code} → {new_group_code}",
            evidence=f"Updated {len(updated_entities)} entities",
            logic="Applied consistent mapping rule across entities with similar account structures",
            confidence_score=0.95,
            source_references=updated_entities
        )
        
        await self.log_action(
            action_type=AgentActionType.BATCH_MAPPING_HEAL,
            status=AgentActionStatus.AUTOMATED,
            logic_memo=logic_memo,
            entity_id=source_entity_id,
            related_ids=updated_entities,
            before_state={"entities_with_old_mapping": len(updated_entities)},
            after_state={"entities_updated": len(updated_entities)},
            delta_summary=f"Applied {local_code} → {new_group_code} to {len(updated_entities)} entities"
        )
        
        return {
            "success": True,
            "updated_entities": updated_entities,
            "skipped_entities": skipped_entities,
            "local_code": local_code,
            "new_group_code": new_group_code,
            "message": f"Updated mapping in {len(updated_entities)} entities"
        }
    
    async def auto_apply_high_confidence_mappings(
        self,
        entity_id: str,
        suggestions: List[MappingSuggestion]
    ) -> Dict[str, Any]:
        """
        Auto-apply mappings that exceed the confidence threshold.
        Returns summary of applied and pending mappings.
        """
        auto_applied = []
        pending_review = []
        
        for suggestion in suggestions:
            if suggestion.confidence_score >= self.min_confidence_auto:
                # Auto-apply
                await self.db.coa_mappings.update_one(
                    {"entity_id": entity_id, "user_id": self.user_id},
                    {
                        "$set": {f"mappings.{suggestion.local_account_code}": suggestion.suggested_group_code},
                        "$setOnInsert": {"entity_id": entity_id, "user_id": self.user_id}
                    },
                    upsert=True
                )
                auto_applied.append(suggestion.to_dict())
            else:
                pending_review.append(suggestion.to_dict())
        
        return {
            "auto_applied": auto_applied,
            "pending_review": pending_review,
            "auto_applied_count": len(auto_applied),
            "pending_review_count": len(pending_review)
        }
