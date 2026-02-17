"""
RemedyEngine - AI-Powered Financial Remediation Service
========================================================
Generates tri-option remediation suggestions for financial anomalies.
Integrates with Policy Engine for compliance validation.
"""

import json
import os
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from enum import Enum
from pydantic import BaseModel, Field
import uuid

# Load policy rules
RULES_PATH = os.path.join(os.path.dirname(__file__), 'rules.json')
with open(RULES_PATH, 'r') as f:
    POLICY_RULES = json.load(f)


class RemedyType(str, Enum):
    OPTIMIZATION = "optimization"
    INVESTMENT = "investment"
    COMPROMISE = "compromise"


class RemedyStatus(str, Enum):
    PENDING_APPROVAL = "pending_approval"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    AUTO_APPROVED = "auto_approved"


class DataSource(str, Enum):
    ERP = "erp"
    BANK = "bank"
    EMAIL = "email"
    MANUAL = "manual"


class AnomalyType(str, Enum):
    BANK_REC_MISMATCH = "bank_rec_mismatch"
    COA_MAPPING_ERROR = "coa_mapping_error"
    DUPLICATE_TRANSACTION = "duplicate_transaction"
    MISSING_INVOICE = "missing_invoice"
    LIQUIDITY_GAP = "liquidity_gap"
    BUDGET_VARIANCE = "budget_variance"
    INTERCOMPANY_IMBALANCE = "intercompany_imbalance"
    CONTRACT_ANOMALY = "contract_anomaly"
    STAFFING_RATIO_BREACH = "staffing_ratio_breach"
    CURRENCY_MISMATCH = "currency_mismatch"


class RemedyOption(BaseModel):
    """Single remedy option within a tri-option set"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: RemedyType
    title: str
    description: str
    action: str
    impact_summary: str
    confidence_score: float  # 0-100
    estimated_value: float
    currency: str = "GBP"
    requires_approval: bool = True
    auto_approve_eligible: bool = False
    lender_search_link: Optional[str] = None
    affected_accounts: List[str] = []
    policy_compliant: bool = True
    policy_warnings: List[str] = []


class RemedyObject(BaseModel):
    """Complete remedy object with tri-option set"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    anomaly_id: str
    anomaly_type: AnomalyType
    entity_id: str
    entity_name: str
    entity_type: str  # holdco, subsidiary, standalone
    data_source: DataSource
    
    # The problem
    problem_summary: str
    problem_value: float
    problem_currency: str = "GBP"
    affected_period: str
    
    # Tri-option remedies
    optimization_option: Optional[RemedyOption] = None
    investment_option: Optional[RemedyOption] = None
    compromise_option: Optional[RemedyOption] = None
    
    # Metadata
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    generated_by: str = "remedy_engine"
    status: RemedyStatus = RemedyStatus.PENDING_APPROVAL
    selected_option: Optional[str] = None  # ID of selected option
    
    # Audit trail
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    approval_signature: Optional[str] = None  # User name for audit
    rejection_reason: Optional[str] = None


class PolicyValidator:
    """Validates remedy suggestions against policy rules"""
    
    def __init__(self, rules: Dict = None):
        self.rules = rules or POLICY_RULES
    
    def validate_remedy(self, remedy: RemedyOption, entity_type: str, 
                       current_cash: float = 0) -> tuple[bool, List[str]]:
        """
        Validate a single remedy option against policy rules.
        Returns (is_compliant, list_of_warnings)
        """
        warnings = []
        is_compliant = True
        
        # Get rule sets
        global_rules = self.rules.get('global_constraints', {})
        entity_rules = self.rules.get('entity_type_rules', {}).get(entity_type, {})
        remedy_rules = self.rules.get('remedy_type_rules', {}).get(remedy.type.value, {})
        
        # Check confidence minimum
        min_confidence = remedy_rules.get('confidence_minimum', 80)
        if remedy.confidence_score < min_confidence:
            warnings.append(f"Confidence score {remedy.confidence_score}% below minimum {min_confidence}%")
            is_compliant = False
        
        # Check investment limits
        if remedy.type == RemedyType.INVESTMENT:
            max_pct = remedy_rules.get('max_percentage_of_cash', 20)
            if current_cash > 0:
                max_investment = current_cash * (max_pct / 100)
                if remedy.estimated_value > max_investment:
                    warnings.append(
                        f"Investment £{remedy.estimated_value:,.0f} exceeds {max_pct}% of cash (£{max_investment:,.0f})"
                    )
                    is_compliant = False
            
            # Check entity-specific investment limit
            entity_max = entity_rules.get('max_investment_limit', 100000)
            if remedy.estimated_value > entity_max:
                warnings.append(
                    f"Investment exceeds entity limit of £{entity_max:,.0f} for {entity_type}"
                )
                is_compliant = False
        
        # Check compromise limits
        if remedy.type == RemedyType.COMPROMISE:
            max_reduction = remedy_rules.get('max_budget_reduction_percentage', 25)
            # This would need actual budget data to validate properly
            
        # Check global transaction limits
        max_single = global_rules.get('max_single_transaction_value', 100000)
        if remedy.estimated_value > max_single:
            warnings.append(f"Transaction exceeds single limit of £{max_single:,.0f}")
        
        # Check if dual approval required
        dual_threshold = global_rules.get('require_dual_approval_above', 50000)
        if remedy.estimated_value > dual_threshold:
            warnings.append(f"Value exceeds £{dual_threshold:,.0f} - dual approval required")
        
        # Check cross-border restrictions
        if not global_rules.get('cross_border_data_transfer', True):
            # Would check remedy for cross-border implications
            pass
        
        return is_compliant, warnings
    
    def check_auto_approve_eligibility(self, remedy: RemedyOption, 
                                       entity_type: str) -> bool:
        """Check if remedy can be auto-approved based on rules"""
        remedy_rules = self.rules.get('remedy_type_rules', {}).get(remedy.type.value, {})
        auto_threshold = remedy_rules.get('auto_approve_threshold', 0)
        
        if remedy.estimated_value <= auto_threshold and remedy.confidence_score >= 95:
            return True
        return False


class RemedyEngine:
    """
    Main engine for generating and managing remediation suggestions.
    """
    
    def __init__(self, db=None):
        self.db = db
        self.policy_validator = PolicyValidator()
    
    async def generate_remedies(self, anomaly: Dict, entity: Dict, 
                                financial_context: Dict = None) -> RemedyObject:
        """
        Generate tri-option remedies for a detected anomaly.
        
        Args:
            anomaly: The detected issue (type, value, description)
            entity: The affected entity (id, name, type)
            financial_context: Current financial state (cash, budgets, etc.)
        """
        financial_context = financial_context or {}
        current_cash = financial_context.get('cash_balance', 0)
        
        # Create base remedy object
        remedy_obj = RemedyObject(
            anomaly_id=anomaly.get('id', str(uuid.uuid4())),
            anomaly_type=AnomalyType(anomaly.get('type', 'bank_rec_mismatch')),
            entity_id=entity.get('id', ''),
            entity_name=entity.get('name', 'Unknown'),
            entity_type=entity.get('type', 'standalone'),
            data_source=DataSource(anomaly.get('source', 'erp')),
            problem_summary=anomaly.get('description', ''),
            problem_value=anomaly.get('value', 0),
            problem_currency=anomaly.get('currency', 'GBP'),
            affected_period=anomaly.get('period', datetime.now().strftime('%Y-%m'))
        )
        
        # Generate optimization option
        remedy_obj.optimization_option = self._generate_optimization(
            anomaly, entity, financial_context
        )
        
        # Generate investment option (if applicable)
        if self._needs_investment_option(anomaly, financial_context):
            remedy_obj.investment_option = self._generate_investment(
                anomaly, entity, financial_context
            )
        
        # Generate compromise option
        remedy_obj.compromise_option = self._generate_compromise(
            anomaly, entity, financial_context
        )
        
        # Validate all options against policy
        for option in [remedy_obj.optimization_option, 
                       remedy_obj.investment_option, 
                       remedy_obj.compromise_option]:
            if option:
                is_compliant, warnings = self.policy_validator.validate_remedy(
                    option, entity.get('type', 'standalone'), current_cash
                )
                option.policy_compliant = is_compliant
                option.policy_warnings = warnings
                option.auto_approve_eligible = self.policy_validator.check_auto_approve_eligibility(
                    option, entity.get('type', 'standalone')
                )
        
        return remedy_obj
    
    def _generate_optimization(self, anomaly: Dict, entity: Dict, 
                               context: Dict) -> RemedyOption:
        """Generate the optimization remedy option"""
        anomaly_type = anomaly.get('type', 'bank_rec_mismatch')
        value = anomaly.get('value', 0)
        
        # Template-based generation based on anomaly type
        templates = {
            'bank_rec_mismatch': {
                'title': 'Re-match Transaction',
                'description': f'Automatically match this £{value:,.2f} transaction to the correct bank entry',
                'action': 'remap_transaction',
                'confidence': 92
            },
            'coa_mapping_error': {
                'title': 'Correct Account Mapping',
                'description': f'Re-map this transaction to the correct chart of accounts category',
                'action': 'correct_category',
                'confidence': 88
            },
            'duplicate_transaction': {
                'title': 'Remove Duplicate Entry',
                'description': f'Archive duplicate transaction of £{value:,.2f} and consolidate records',
                'action': 'fix_duplicate',
                'confidence': 95
            },
            'liquidity_gap': {
                'title': 'Optimize Cash Flow',
                'description': f'Accelerate receivables collection to close £{value:,.2f} gap',
                'action': 'remap_transaction',
                'confidence': 78
            },
            'intercompany_imbalance': {
                'title': 'Balance Intercompany',
                'description': f'Create offsetting entry to balance £{value:,.2f} intercompany position',
                'action': 'correct_category',
                'confidence': 90
            }
        }
        
        template = templates.get(anomaly_type, templates['bank_rec_mismatch'])
        
        return RemedyOption(
            type=RemedyType.OPTIMIZATION,
            title=template['title'],
            description=template['description'],
            action=template['action'],
            impact_summary=f"Resolves {anomaly_type.replace('_', ' ')} with no external cost",
            confidence_score=template['confidence'],
            estimated_value=0,  # Optimization typically has no direct cost
            currency=anomaly.get('currency', 'GBP'),
            requires_approval=value > 1000,
            affected_accounts=anomaly.get('affected_accounts', [])
        )
    
    def _generate_investment(self, anomaly: Dict, entity: Dict, 
                            context: Dict) -> RemedyOption:
        """Generate the investment remedy option"""
        value = anomaly.get('value', 0)
        cash_balance = context.get('cash_balance', 0)
        
        # Determine appropriate investment type
        if value < 25000:
            investment_type = 'Invoice Finance'
            description = f'Draw £{value:,.0f} from invoice finance facility'
            action = 'invoice_finance'
        elif value < 100000:
            investment_type = 'Credit Line'
            description = f'Utilize £{value:,.0f} from revolving credit facility'
            action = 'credit_line'
        else:
            investment_type = 'Term Loan'
            description = f'Arrange £{value:,.0f} term loan facility'
            action = 'term_loan'
        
        return RemedyOption(
            type=RemedyType.INVESTMENT,
            title=f'{investment_type} Draw-down',
            description=description,
            action=action,
            impact_summary=f"Injects £{value:,.0f} external capital to resolve gap",
            confidence_score=85,
            estimated_value=value,
            currency=anomaly.get('currency', 'GBP'),
            requires_approval=True,
            lender_search_link='/dashboard/strategic-capital',
            affected_accounts=['Cash', 'Debt']
        )
    
    def _generate_compromise(self, anomaly: Dict, entity: Dict, 
                            context: Dict) -> RemedyOption:
        """Generate the compromise remedy option"""
        value = anomaly.get('value', 0)
        anomaly_type = anomaly.get('type', 'bank_rec_mismatch')
        
        # Calculate compromise suggestion
        if anomaly_type in ['liquidity_gap', 'budget_variance']:
            # Suggest spend reduction
            reduction_pct = min(15, (value / context.get('monthly_spend', value * 10)) * 100)
            return RemedyOption(
                type=RemedyType.COMPROMISE,
                title='Reduce Discretionary Spend',
                description=f'Reduce non-essential spend by {reduction_pct:.0f}% this month to maintain liquidity',
                action='reduce_spend',
                impact_summary=f"Frees up £{value:,.0f} through temporary cost reduction",
                confidence_score=82,
                estimated_value=value,
                currency=anomaly.get('currency', 'GBP'),
                requires_approval=True,
                affected_accounts=['Marketing', 'T&E', 'Consulting']
            )
        else:
            # Suggest deferral
            return RemedyOption(
                type=RemedyType.COMPROMISE,
                title='Defer Resolution',
                description=f'Flag for manual review next period; no immediate action',
                action='defer_payment',
                impact_summary=f"Defers £{value:,.0f} decision to next review cycle",
                confidence_score=75,
                estimated_value=0,
                currency=anomaly.get('currency', 'GBP'),
                requires_approval=False,
                affected_accounts=[]
            )
    
    def _needs_investment_option(self, anomaly: Dict, context: Dict) -> bool:
        """Determine if investment option is relevant for this anomaly"""
        cash_intensive_types = [
            'liquidity_gap', 'budget_variance', 'missing_invoice'
        ]
        return (
            anomaly.get('type') in cash_intensive_types or 
            anomaly.get('value', 0) > context.get('cash_balance', float('inf')) * 0.1
        )
    
    async def approve_remedy(self, remedy_id: str, selected_option_id: str,
                            approver_name: str, approver_id: str) -> Dict:
        """
        Approve a remedy option. Does NOT write back to ERP.
        Updates Remediation_Draft_Ledger only.
        """
        if not self.db:
            raise ValueError("Database connection required")
        
        result = await self.db.remediation_draft_ledger.update_one(
            {"id": remedy_id},
            {
                "$set": {
                    "status": RemedyStatus.APPROVED.value,
                    "selected_option": selected_option_id,
                    "approved_by": approver_id,
                    "approved_at": datetime.now(timezone.utc).isoformat(),
                    "approval_signature": approver_name  # Audit trail
                }
            }
        )
        
        return {
            "success": result.modified_count > 0,
            "remedy_id": remedy_id,
            "action": "approved",
            "note": "Draft ledger updated. No ERP write-back performed."
        }
    
    async def reject_remedy(self, remedy_id: str, rejector_id: str,
                           reason: str) -> Dict:
        """Reject a remedy with reason (for AI learning)"""
        if not self.db:
            raise ValueError("Database connection required")
        
        result = await self.db.remediation_draft_ledger.update_one(
            {"id": remedy_id},
            {
                "$set": {
                    "status": RemedyStatus.REJECTED.value,
                    "approved_by": rejector_id,
                    "approved_at": datetime.now(timezone.utc).isoformat(),
                    "rejection_reason": reason
                }
            }
        )
        
        # Log rejection for AI learning
        await self.db.remedy_rejections.insert_one({
            "remedy_id": remedy_id,
            "rejector_id": rejector_id,
            "reason": reason,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
        
        return {
            "success": result.modified_count > 0,
            "remedy_id": remedy_id,
            "action": "rejected",
            "feedback_logged": True
        }
