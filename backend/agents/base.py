"""
Base Agent Module - Core Infrastructure for Agentic Features
Provides: Audit Trail, Logic Memos, Action Logging, LLM Integration
"""
import os
import uuid
from datetime import datetime, timezone, timedelta
from enum import Enum
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from motor.motor_asyncio import AsyncIOMotorDatabase
from dotenv import load_dotenv

load_dotenv()

# ======================= ENUMS =======================

class AgentActionType(str, Enum):
    # Fetch Agent Actions
    EMAIL_SCAN = "email_scan"
    INVOICE_EXTRACTION = "invoice_extraction"
    DOCUMENT_MATCH = "document_match"
    BANK_RECONCILIATION = "bank_reconciliation"
    
    # Match Agent Actions
    COA_MAPPING_SUGGESTION = "coa_mapping_suggestion"
    ANOMALY_DETECTION = "anomaly_detection"
    BATCH_MAPPING_HEAL = "batch_mapping_heal"
    
    # Heal Agent Actions
    VARIANCE_INVESTIGATION = "variance_investigation"
    NEAR_MATCH_DETECTION = "near_match_detection"
    SELF_HEALING_JOURNAL = "self_healing_journal"
    MISSING_ENTRY_DRAFT = "missing_entry_draft"
    
    # Compliance Agent Actions
    OWNERSHIP_VALIDATION = "ownership_validation"
    FX_TRANSLATION_AUDIT = "fx_translation_audit"
    GOVERNANCE_CHECK = "governance_check"
    ELIMINATION_VALIDATION = "elimination_validation"


class AgentActionStatus(str, Enum):
    AUTOMATED = "automated"  # Fully automated action completed
    PROPOSED = "proposed"    # Agent proposes, awaiting human approval
    FLAGGED = "flagged"      # Agent flags for human review
    APPROVED = "approved"    # Human approved proposed action
    REJECTED = "rejected"    # Human rejected proposed action
    ROLLED_BACK = "rolled_back"  # Action was undone


class AgentConfidenceLevel(str, Enum):
    HIGH = "high"       # >90% confidence
    MEDIUM = "medium"   # 70-90% confidence
    LOW = "low"         # <70% confidence


# ======================= MODELS =======================

class LogicMemo(BaseModel):
    """Human-readable justification for agent actions"""
    action: str
    evidence: str
    logic: str
    confidence_score: float  # 0.0 to 1.0
    confidence_level: AgentConfidenceLevel
    source_references: List[str] = []  # Links to source documents/transactions


class AgentActionLog(BaseModel):
    """Immutable audit log for agent actions"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    agent_type: str  # fetch, match, heal, compliance
    action_type: AgentActionType
    status: AgentActionStatus
    
    # Context
    entity_id: Optional[str] = None
    entity_name: Optional[str] = None
    related_ids: List[str] = []  # Transaction IDs, mapping IDs, etc.
    
    # Logic Memo - The reasoning behind the action
    logic_memo: Optional[Dict[str, Any]] = None
    
    # Before/After state for Bridge Report
    before_state: Optional[Dict[str, Any]] = None
    after_state: Optional[Dict[str, Any]] = None
    delta_summary: Optional[str] = None  # Human-readable summary of changes
    
    # Timing
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    review_deadline: Optional[datetime] = None  # 24-hour review period
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    
    # Rollback
    is_rollback_available: bool = True
    rolled_back_at: Optional[datetime] = None
    rolled_back_by: Optional[str] = None
    rollback_reason: Optional[str] = None


class AgentNotification(BaseModel):
    """Notification for the Self-Healing Inbox"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    action_log_id: str
    category: AgentActionStatus  # automated, proposed, flagged
    title: str
    message: str
    agent_type: str
    is_read: bool = False
    is_actioned: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BridgeReportEntry(BaseModel):
    """Entry for the Before vs After Bridge Report"""
    category: str  # Raw ERP, Agent Additions, Agent Eliminations, Agent Adjustments, Final
    description: str
    amount: float
    currency: str
    source: str  # Which agent/action created this


# ======================= BASE AGENT CLASS =======================

class AgentBase:
    """Base class for all agents with common functionality"""
    
    def __init__(self, db: AsyncIOMotorDatabase, user_id: str, agent_type: str):
        self.db = db
        self.user_id = user_id
        self.agent_type = agent_type
        self.llm_key = os.environ.get('EMERGENT_LLM_KEY')
    
    async def log_action(
        self,
        action_type: AgentActionType,
        status: AgentActionStatus,
        logic_memo: LogicMemo,
        entity_id: Optional[str] = None,
        entity_name: Optional[str] = None,
        related_ids: List[str] = None,
        before_state: Dict[str, Any] = None,
        after_state: Dict[str, Any] = None,
        delta_summary: str = None
    ) -> AgentActionLog:
        """
        Log an agent action with full audit trail.
        Creates immutable record in agent_actions collection.
        """
        # Calculate review deadline (24 hours from now)
        review_deadline = datetime.now(timezone.utc) + timedelta(hours=24)
        
        action_log = AgentActionLog(
            user_id=self.user_id,
            agent_type=self.agent_type,
            action_type=action_type,
            status=status,
            entity_id=entity_id,
            entity_name=entity_name,
            related_ids=related_ids or [],
            logic_memo=logic_memo.model_dump() if logic_memo else None,
            before_state=before_state,
            after_state=after_state,
            delta_summary=delta_summary,
            review_deadline=review_deadline if status == AgentActionStatus.AUTOMATED else None
        )
        
        # Store in database (immutable - no updates allowed)
        action_dict = action_log.model_dump()
        action_dict['created_at'] = action_dict['created_at'].isoformat()
        if action_dict.get('review_deadline'):
            action_dict['review_deadline'] = action_dict['review_deadline'].isoformat()
        
        await self.db.agent_actions.insert_one(action_dict)
        
        # Create notification
        await self._create_notification(action_log, logic_memo)
        
        return action_log
    
    async def _create_notification(self, action_log: AgentActionLog, logic_memo: LogicMemo):
        """Create notification for the Self-Healing Inbox"""
        # Determine title and message based on action type
        titles = {
            AgentActionType.EMAIL_SCAN: "Email Scan Completed",
            AgentActionType.INVOICE_EXTRACTION: "Invoice Extracted",
            AgentActionType.DOCUMENT_MATCH: "Document Matched",
            AgentActionType.BANK_RECONCILIATION: "Bank Line Reconciled",
            AgentActionType.COA_MAPPING_SUGGESTION: "COA Mapping Suggested",
            AgentActionType.ANOMALY_DETECTION: "Anomaly Detected",
            AgentActionType.BATCH_MAPPING_HEAL: "Batch Mapping Applied",
            AgentActionType.VARIANCE_INVESTIGATION: "Variance Investigated",
            AgentActionType.NEAR_MATCH_DETECTION: "Near-Match Found",
            AgentActionType.SELF_HEALING_JOURNAL: "Self-Healing Journal Proposed",
            AgentActionType.MISSING_ENTRY_DRAFT: "Missing Entry Drafted",
            AgentActionType.OWNERSHIP_VALIDATION: "Ownership Validated",
            AgentActionType.FX_TRANSLATION_AUDIT: "FX Translation Audited",
            AgentActionType.GOVERNANCE_CHECK: "Governance Check Complete",
            AgentActionType.ELIMINATION_VALIDATION: "Elimination Validated"
        }
        
        notification = AgentNotification(
            user_id=self.user_id,
            action_log_id=action_log.id,
            category=action_log.status,
            title=titles.get(action_log.action_type, "Agent Action"),
            message=logic_memo.action if logic_memo else action_log.delta_summary or "Action completed",
            agent_type=self.agent_type
        )
        
        notif_dict = notification.model_dump()
        notif_dict['created_at'] = notif_dict['created_at'].isoformat()
        
        await self.db.agent_notifications.insert_one(notif_dict)
    
    def create_logic_memo(
        self,
        action: str,
        evidence: str,
        logic: str,
        confidence_score: float,
        source_references: List[str] = None
    ) -> LogicMemo:
        """Create a Logic Memo for audit trail"""
        if confidence_score >= 0.9:
            level = AgentConfidenceLevel.HIGH
        elif confidence_score >= 0.7:
            level = AgentConfidenceLevel.MEDIUM
        else:
            level = AgentConfidenceLevel.LOW
        
        return LogicMemo(
            action=action,
            evidence=evidence,
            logic=logic,
            confidence_score=confidence_score,
            confidence_level=level,
            source_references=source_references or []
        )
    
    async def rollback_action(self, action_id: str, user_id: str, reason: str) -> bool:
        """
        Rollback an automated action within the 24-hour review period.
        This trains the AI not to repeat the specific logic.
        """
        action = await self.db.agent_actions.find_one({
            "id": action_id,
            "user_id": self.user_id
        })
        
        if not action:
            return False
        
        if not action.get('is_rollback_available', False):
            return False
        
        # Check if within review period
        review_deadline = action.get('review_deadline')
        if review_deadline:
            if isinstance(review_deadline, str):
                review_deadline = datetime.fromisoformat(review_deadline)
            if datetime.now(timezone.utc) > review_deadline:
                return False
        
        # Create rollback record (new entry, not modifying original)
        rollback_log = {
            "id": str(uuid.uuid4()),
            "original_action_id": action_id,
            "user_id": self.user_id,
            "rolled_back_by": user_id,
            "rolled_back_at": datetime.now(timezone.utc).isoformat(),
            "reason": reason,
            "original_logic_memo": action.get('logic_memo'),
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        await self.db.agent_rollbacks.insert_one(rollback_log)
        
        # Mark original as rolled back (exception to immutability - status update only)
        await self.db.agent_actions.update_one(
            {"id": action_id},
            {"$set": {
                "status": AgentActionStatus.ROLLED_BACK.value,
                "rolled_back_at": datetime.now(timezone.utc).isoformat(),
                "rolled_back_by": user_id,
                "rollback_reason": reason,
                "is_rollback_available": False
            }}
        )
        
        return True
    
    async def get_pending_reviews(self) -> List[Dict[str, Any]]:
        """Get actions pending human review"""
        actions = await self.db.agent_actions.find({
            "user_id": self.user_id,
            "status": {"$in": [
                AgentActionStatus.PROPOSED.value,
                AgentActionStatus.FLAGGED.value
            ]}
        }, {"_id": 0}).sort("created_at", -1).to_list(100)
        
        return actions
    
    async def approve_action(self, action_id: str, user_id: str) -> bool:
        """Approve a proposed action"""
        result = await self.db.agent_actions.update_one(
            {
                "id": action_id,
                "user_id": self.user_id,
                "status": AgentActionStatus.PROPOSED.value
            },
            {"$set": {
                "status": AgentActionStatus.APPROVED.value,
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_by": user_id
            }}
        )
        return result.modified_count > 0
    
    async def reject_action(self, action_id: str, user_id: str, reason: str = None) -> bool:
        """Reject a proposed action"""
        result = await self.db.agent_actions.update_one(
            {
                "id": action_id,
                "user_id": self.user_id,
                "status": AgentActionStatus.PROPOSED.value
            },
            {"$set": {
                "status": AgentActionStatus.REJECTED.value,
                "reviewed_at": datetime.now(timezone.utc).isoformat(),
                "reviewed_by": user_id,
                "rollback_reason": reason
            }}
        )
        return result.modified_count > 0


# ======================= LLM HELPER =======================

class AgentLLM:
    """LLM helper for agent reasoning and analysis"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.environ.get('EMERGENT_LLM_KEY')
    
    async def analyze_text(self, prompt: str, context: str = None) -> str:
        """Use Claude Sonnet 4.5 for text analysis and reasoning"""
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        system_message = """You are a financial analysis AI assistant for an enterprise CFO platform.
Your role is to:
1. Analyze financial documents and transactions
2. Identify patterns and anomalies
3. Suggest mappings and reconciliations
4. Explain your reasoning clearly for audit purposes

Always provide structured, clear responses that can be used for audit trails."""
        
        if context:
            system_message += f"\n\nContext:\n{context}"
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"agent-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("anthropic", "claude-sonnet-4-20250514")
        
        response = await chat.send_message(UserMessage(text=prompt))
        return response
    
    async def analyze_file(self, file_path: str, prompt: str, mime_type: str = "application/pdf") -> str:
        """Use Gemini for file analysis (PDFs, CSVs, etc.)"""
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
        system_message = """You are a financial document analysis AI.
Extract and analyze financial data from documents.
Return structured data that can be used for automated processing.
Include: dates, amounts, vendors, invoice numbers, and any other relevant financial data."""
        
        chat = LlmChat(
            api_key=self.api_key,
            session_id=f"file-analysis-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("gemini", "gemini-2.5-flash")
        
        file_content = FileContentWithMimeType(
            file_path=file_path,
            mime_type=mime_type
        )
        
        response = await chat.send_message(UserMessage(
            text=prompt,
            file_contents=[file_content]
        ))
        return response
    
    async def generate_logic_memo(
        self,
        action: str,
        evidence_data: Dict[str, Any],
        decision_context: str
    ) -> Dict[str, Any]:
        """Generate a structured Logic Memo for audit trail"""
        prompt = f"""Generate a Logic Memo for the following agent action:

Action: {action}

Evidence Data:
{evidence_data}

Decision Context:
{decision_context}

Return a JSON object with:
- action: Brief description of what was done
- evidence: Specific data points that led to this decision
- logic: Step-by-step reasoning process
- confidence_score: Float between 0.0 and 1.0
- source_references: List of source document/transaction IDs

Return ONLY valid JSON, no markdown."""
        
        response = await self.analyze_text(prompt)
        
        # Parse JSON response
        import json
        try:
            # Clean up response if it contains markdown
            clean_response = response.strip()
            if clean_response.startswith("```"):
                clean_response = clean_response.split("```")[1]
                if clean_response.startswith("json"):
                    clean_response = clean_response[4:]
            return json.loads(clean_response)
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return {
                "action": action,
                "evidence": str(evidence_data),
                "logic": decision_context,
                "confidence_score": 0.7,
                "source_references": []
            }
