"""
Fetch Agent - Autonomous Data Extraction
Scans email inboxes (Gmail/Outlook) for PDF attachments
Matches invoices to unreconciled bank transactions
"""
import os
import re
import uuid
import base64
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase

from .base import (
    AgentBase, AgentActionType, AgentActionStatus,
    LogicMemo, AgentLLM
)


class ExtractedInvoice:
    """Extracted invoice data from PDF"""
    def __init__(
        self,
        vendor_name: str = None,
        invoice_number: str = None,
        invoice_date: datetime = None,
        amount: float = None,
        currency: str = None,
        description: str = None,
        file_name: str = None,
        file_path: str = None,
        email_subject: str = None,
        email_from: str = None,
        email_date: datetime = None,
        confidence: float = 0.0
    ):
        self.vendor_name = vendor_name
        self.invoice_number = invoice_number
        self.invoice_date = invoice_date
        self.amount = amount
        self.currency = currency
        self.description = description
        self.file_name = file_name
        self.file_path = file_path
        self.email_subject = email_subject
        self.email_from = email_from
        self.email_date = email_date
        self.confidence = confidence
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "vendor_name": self.vendor_name,
            "invoice_number": self.invoice_number,
            "invoice_date": self.invoice_date.isoformat() if self.invoice_date else None,
            "amount": self.amount,
            "currency": self.currency,
            "description": self.description,
            "file_name": self.file_name,
            "file_path": self.file_path,
            "email_subject": self.email_subject,
            "email_from": self.email_from,
            "email_date": self.email_date.isoformat() if self.email_date else None,
            "confidence": self.confidence
        }


class BankLineMatch:
    """Match result between invoice and bank transaction"""
    def __init__(
        self,
        invoice: ExtractedInvoice,
        transaction_id: str,
        transaction_amount: float,
        transaction_date: datetime,
        transaction_description: str,
        match_score: float,
        match_reasons: List[str]
    ):
        self.invoice = invoice
        self.transaction_id = transaction_id
        self.transaction_amount = transaction_amount
        self.transaction_date = transaction_date
        self.transaction_description = transaction_description
        self.match_score = match_score
        self.match_reasons = match_reasons
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "invoice": self.invoice.to_dict(),
            "transaction_id": self.transaction_id,
            "transaction_amount": self.transaction_amount,
            "transaction_date": self.transaction_date.isoformat() if self.transaction_date else None,
            "transaction_description": self.transaction_description,
            "match_score": self.match_score,
            "match_reasons": self.match_reasons
        }


class FetchAgent(AgentBase):
    """
    Fetch Agent - Scans emails for invoices and matches to bank transactions
    
    Capabilities:
    - Scan Gmail/Outlook inboxes for PDF attachments
    - Extract financial data from PDFs (vendor, amount, date, invoice #)
    - Auto-match to unreconciled bank transactions
    - Propose matches for human approval
    """
    
    def __init__(self, db: AsyncIOMotorDatabase, user_id: str):
        super().__init__(db, user_id, "fetch")
        self.llm = AgentLLM()
        self.amount_tolerance_pct = 0.02  # 2% tolerance for amount matching
        self.date_tolerance_days = 7  # 7 days tolerance for date matching
    
    async def scan_inbox(
        self,
        email_provider: str,  # "gmail" or "outlook"
        access_token: str,
        folder: str = "inbox",
        days_back: int = 30,
        entity_id: str = None
    ) -> Dict[str, Any]:
        """
        Scan email inbox for financial PDFs
        Returns list of extracted invoices
        """
        # For now, use mock data (real implementation would use Gmail/Outlook APIs)
        # This demonstrates the flow - actual OAuth integration would follow
        
        extracted_invoices = []
        scan_results = {
            "emails_scanned": 0,
            "pdfs_found": 0,
            "invoices_extracted": 0,
            "errors": []
        }
        
        # Mock email scan - in production, this would call Gmail/Outlook APIs
        mock_emails = await self._get_mock_emails(days_back)
        scan_results["emails_scanned"] = len(mock_emails)
        
        for email in mock_emails:
            if email.get("has_pdf_attachment"):
                scan_results["pdfs_found"] += 1
                
                # Extract invoice data from PDF
                invoice = await self._extract_invoice_from_pdf(
                    email["attachment_path"],
                    email["subject"],
                    email["from"],
                    email["date"]
                )
                
                if invoice and invoice.confidence > 0.5:
                    extracted_invoices.append(invoice)
                    scan_results["invoices_extracted"] += 1
        
        # Log the scan action
        logic_memo = self.create_logic_memo(
            action=f"Scanned {email_provider} inbox for financial documents",
            evidence=f"Found {scan_results['pdfs_found']} PDFs in {scan_results['emails_scanned']} emails",
            logic=f"Extracted {scan_results['invoices_extracted']} invoices with >50% confidence",
            confidence_score=0.95 if scan_results["invoices_extracted"] > 0 else 0.7,
            source_references=[f"email_{i}" for i in range(scan_results["emails_scanned"])]
        )
        
        await self.log_action(
            action_type=AgentActionType.EMAIL_SCAN,
            status=AgentActionStatus.AUTOMATED,
            logic_memo=logic_memo,
            entity_id=entity_id,
            before_state={"unprocessed_emails": scan_results["emails_scanned"]},
            after_state={"extracted_invoices": scan_results["invoices_extracted"]},
            delta_summary=f"Extracted {scan_results['invoices_extracted']} invoices from inbox"
        )
        
        return {
            "invoices": [inv.to_dict() for inv in extracted_invoices],
            "scan_results": scan_results
        }
    
    async def _get_mock_emails(self, days_back: int) -> List[Dict[str, Any]]:
        """Generate mock emails for testing - replace with real API calls"""
        import random
        
        mock_emails = []
        vendors = ["Acme Corp", "TechSupplies Ltd", "Office Pro", "CloudServices Inc", "Marketing Agency"]
        
        for i in range(random.randint(5, 15)):
            days_ago = random.randint(1, days_back)
            email_date = datetime.now(timezone.utc) - timedelta(days=days_ago)
            vendor = random.choice(vendors)
            amount = round(random.uniform(500, 50000), 2)
            
            mock_emails.append({
                "id": f"email_{uuid.uuid4().hex[:8]}",
                "subject": f"Invoice #{random.randint(1000, 9999)} from {vendor}",
                "from": f"accounts@{vendor.lower().replace(' ', '')}.com",
                "date": email_date,
                "has_pdf_attachment": random.random() > 0.3,  # 70% have PDF
                "attachment_path": f"/tmp/mock_invoice_{i}.pdf",
                "attachment_name": f"Invoice_{vendor.replace(' ', '_')}_{random.randint(1000, 9999)}.pdf",
                "mock_amount": amount,
                "mock_vendor": vendor,
                "mock_invoice_num": f"INV-{random.randint(10000, 99999)}"
            })
        
        return mock_emails
    
    async def _extract_invoice_from_pdf(
        self,
        file_path: str,
        email_subject: str,
        email_from: str,
        email_date: datetime
    ) -> Optional[ExtractedInvoice]:
        """
        Extract invoice data from PDF using LLM
        In production, would actually read the PDF file
        """
        # For mock data, extract from email metadata
        # In production, this would use Gemini to analyze the actual PDF
        
        import random
        
        # Parse vendor from email
        vendor_match = re.search(r"from\s+(.+?)(?:\s+|$)", email_subject, re.IGNORECASE)
        vendor_name = vendor_match.group(1) if vendor_match else email_from.split("@")[0]
        
        # Parse invoice number
        inv_match = re.search(r"#?\s*(\d+)", email_subject)
        invoice_number = f"INV-{inv_match.group(1)}" if inv_match else f"INV-{random.randint(10000, 99999)}"
        
        # Mock amount (in production, extracted from PDF)
        amount = round(random.uniform(500, 25000), 2)
        currency = random.choice(["USD", "GBP", "EUR"])
        
        return ExtractedInvoice(
            vendor_name=vendor_name,
            invoice_number=invoice_number,
            invoice_date=email_date - timedelta(days=random.randint(0, 5)),
            amount=amount,
            currency=currency,
            description=f"Invoice from {vendor_name}",
            file_name=os.path.basename(file_path),
            file_path=file_path,
            email_subject=email_subject,
            email_from=email_from,
            email_date=email_date,
            confidence=random.uniform(0.7, 0.98)
        )
    
    async def match_to_bank_transactions(
        self,
        invoices: List[ExtractedInvoice],
        entity_id: str
    ) -> List[BankLineMatch]:
        """
        Match extracted invoices to unreconciled bank transactions
        """
        matches = []
        
        # Get unreconciled transactions for this entity
        unreconciled = await self.db.transactions.find({
            "company_id": entity_id,
            "status": {"$in": ["Pending", "Unmatched"]},
            "type": {"$in": ["Bank Transaction", "Bill"]}
        }, {"_id": 0}).to_list(500)
        
        for invoice in invoices:
            best_match = None
            best_score = 0
            
            for tx in unreconciled:
                score, reasons = self._calculate_match_score(invoice, tx)
                
                if score > best_score and score >= 0.6:  # Minimum 60% match
                    best_score = score
                    
                    tx_date = tx.get('date')
                    if isinstance(tx_date, str):
                        tx_date = datetime.fromisoformat(tx_date)
                    
                    best_match = BankLineMatch(
                        invoice=invoice,
                        transaction_id=tx['id'],
                        transaction_amount=tx['amount'],
                        transaction_date=tx_date,
                        transaction_description=tx.get('description', ''),
                        match_score=score,
                        match_reasons=reasons
                    )
            
            if best_match:
                matches.append(best_match)
                
                # Log the match
                logic_memo = self.create_logic_memo(
                    action=f"Matched invoice {invoice.invoice_number} to bank transaction",
                    evidence=f"Invoice: {invoice.vendor_name}, ${invoice.amount}. Transaction: {best_match.transaction_description}, ${best_match.transaction_amount}",
                    logic=f"Match score: {best_score:.1%}. Reasons: {', '.join(best_match.match_reasons)}",
                    confidence_score=best_score,
                    source_references=[invoice.invoice_number, best_match.transaction_id]
                )
                
                # Determine if auto-approve or propose
                status = AgentActionStatus.AUTOMATED if best_score >= 0.9 else AgentActionStatus.PROPOSED
                
                await self.log_action(
                    action_type=AgentActionType.DOCUMENT_MATCH,
                    status=status,
                    logic_memo=logic_memo,
                    entity_id=entity_id,
                    related_ids=[invoice.invoice_number, best_match.transaction_id],
                    before_state={"invoice": invoice.to_dict(), "transaction_status": "Unmatched"},
                    after_state={"match_score": best_score, "status": "Matched" if status == AgentActionStatus.AUTOMATED else "Proposed"},
                    delta_summary=f"{'Auto-matched' if status == AgentActionStatus.AUTOMATED else 'Proposed match'}: {invoice.vendor_name} invoice to bank line"
                )
        
        return matches
    
    def _calculate_match_score(
        self,
        invoice: ExtractedInvoice,
        transaction: Dict[str, Any]
    ) -> Tuple[float, List[str]]:
        """
        Calculate match score between invoice and transaction
        Returns (score, list of match reasons)
        """
        score = 0.0
        reasons = []
        
        # Amount matching (40% weight)
        tx_amount = abs(transaction.get('amount', 0))
        inv_amount = invoice.amount or 0
        
        if tx_amount > 0 and inv_amount > 0:
            amount_diff = abs(tx_amount - inv_amount) / max(tx_amount, inv_amount)
            if amount_diff <= self.amount_tolerance_pct:
                amount_score = (1 - amount_diff / self.amount_tolerance_pct) * 0.4
                score += amount_score
                reasons.append(f"Amount match: ${inv_amount:.2f} vs ${tx_amount:.2f} ({amount_diff:.1%} diff)")
        
        # Date matching (30% weight)
        tx_date = transaction.get('date')
        if isinstance(tx_date, str):
            tx_date = datetime.fromisoformat(tx_date)
        
        if tx_date and invoice.invoice_date:
            if tx_date.tzinfo is None:
                tx_date = tx_date.replace(tzinfo=timezone.utc)
            inv_date = invoice.invoice_date
            if inv_date.tzinfo is None:
                inv_date = inv_date.replace(tzinfo=timezone.utc)
            
            date_diff = abs((tx_date - inv_date).days)
            if date_diff <= self.date_tolerance_days:
                date_score = (1 - date_diff / self.date_tolerance_days) * 0.3
                score += date_score
                reasons.append(f"Date match: {date_diff} days apart")
        
        # Vendor/Description matching (30% weight)
        tx_desc = (transaction.get('description', '') + ' ' + transaction.get('counterparty', '')).lower()
        vendor = (invoice.vendor_name or '').lower()
        
        if vendor and tx_desc:
            # Simple substring matching
            if vendor in tx_desc or any(word in tx_desc for word in vendor.split()):
                score += 0.3
                reasons.append(f"Vendor match: '{invoice.vendor_name}'")
            else:
                # Partial word matching
                vendor_words = set(vendor.split())
                desc_words = set(tx_desc.split())
                common = vendor_words & desc_words
                if common:
                    partial_score = len(common) / len(vendor_words) * 0.2
                    score += partial_score
                    reasons.append(f"Partial vendor match: {common}")
        
        return score, reasons
    
    async def reconcile_with_approval(
        self,
        match: BankLineMatch,
        approved_by: str,
        entity_id: str
    ) -> Dict[str, Any]:
        """
        Complete reconciliation after human approval
        Updates transaction status and attaches invoice
        """
        # Update transaction
        await self.db.transactions.update_one(
            {"id": match.transaction_id},
            {"$set": {
                "status": "Matched",
                "matched_invoice": match.invoice.to_dict(),
                "matched_at": datetime.now(timezone.utc).isoformat(),
                "matched_by_agent": True
            }}
        )
        
        # Store the invoice record
        invoice_record = {
            "id": str(uuid.uuid4()),
            "user_id": self.user_id,
            "entity_id": entity_id,
            "transaction_id": match.transaction_id,
            **match.invoice.to_dict(),
            "matched_at": datetime.now(timezone.utc).isoformat(),
            "approved_by": approved_by
        }
        await self.db.extracted_invoices.insert_one(invoice_record)
        
        # Log the reconciliation
        logic_memo = self.create_logic_memo(
            action=f"Bank transaction reconciled with invoice {match.invoice.invoice_number}",
            evidence=f"Match approved by user. Score: {match.match_score:.1%}",
            logic=f"Reasons: {', '.join(match.match_reasons)}",
            confidence_score=1.0,  # Human approved
            source_references=[match.invoice.invoice_number, match.transaction_id]
        )
        
        await self.log_action(
            action_type=AgentActionType.BANK_RECONCILIATION,
            status=AgentActionStatus.APPROVED,
            logic_memo=logic_memo,
            entity_id=entity_id,
            related_ids=[match.invoice.invoice_number, match.transaction_id],
            before_state={"transaction_status": "Unmatched"},
            after_state={"transaction_status": "Matched", "invoice_attached": True},
            delta_summary=f"Reconciled: {match.invoice.vendor_name} ${match.invoice.amount}"
        )
        
        return {
            "success": True,
            "transaction_id": match.transaction_id,
            "invoice_id": invoice_record["id"],
            "message": f"Successfully reconciled transaction with invoice {match.invoice.invoice_number}"
        }
    
    async def get_unreconciled_summary(self, entity_id: str) -> Dict[str, Any]:
        """Get summary of unreconciled bank transactions"""
        unreconciled = await self.db.transactions.find({
            "company_id": entity_id,
            "status": {"$in": ["Pending", "Unmatched"]},
            "type": {"$in": ["Bank Transaction", "Bill"]}
        }, {"_id": 0}).to_list(500)
        
        total_amount = sum(abs(tx.get('amount', 0)) for tx in unreconciled)
        
        return {
            "entity_id": entity_id,
            "unreconciled_count": len(unreconciled),
            "total_amount": round(total_amount, 2),
            "by_type": {
                "bank_transactions": len([tx for tx in unreconciled if tx.get('type') == 'Bank Transaction']),
                "bills": len([tx for tx in unreconciled if tx.get('type') == 'Bill'])
            },
            "oldest_unreconciled": min((tx.get('date') for tx in unreconciled), default=None) if unreconciled else None
        }
