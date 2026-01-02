"""Workday Finance Integration Service

Handles OAuth2 authentication and REST API data extraction from Workday.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import logging
from .base_erp_service import BaseERPService

logger = logging.getLogger(__name__)


class WorkdayService(BaseERPService):
    """Workday Finance integration service"""
    
    PLATFORM_NAME = "workday"
    
    def __init__(self, db, config: Dict[str, Any]):
        super().__init__(db, config)
        self.client_id = config.get('client_id')
        self.client_secret = config.get('client_secret')
        self.refresh_token_value = config.get('refresh_token')
        self.tenant_name = config.get('tenant_name')
        self.api_base = f"https://{config.get('host')}/ccx/api/v1/{self.tenant_name}"
        self.token_url = f"https://{config.get('host')}/ccx/oauth2/{self.tenant_name}/token"
        
    async def authenticate(self) -> bool:
        """Authenticate using OAuth2 with refresh token"""
        try:
            response = await self.client.post(
                self.token_url,
                auth=(self.client_id, self.client_secret),
                data={
                    'grant_type': 'refresh_token',
                    'refresh_token': self.refresh_token_value
                }
            )
            response.raise_for_status()
            token_data = response.json()
            
            self.access_token = token_data['access_token']
            self.refresh_token = token_data.get('refresh_token', self.refresh_token_value)
            self.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=token_data.get('expires_in', 3600))
            
            logger.info("Workday authenticated successfully")
            return True
        except Exception as e:
            logger.error(f"Workday authentication error: {e}")
            return False
    
    async def refresh_access_token(self) -> bool:
        """Refresh access token"""
        return await self.authenticate()
    
    async def get_financial_data(self, start_date: datetime, end_date: datetime) -> Dict:
        """Extract financial data from Workday"""
        try:
            # Get journal entries
            journal_url = f"{self.api_base}/financialManagement/v1/journalEntries"
            params = {
                'effectiveFrom': start_date.isoformat(),
                'effectiveTo': end_date.isoformat()
            }
            
            journal_data = await self.make_request('GET', journal_url, params=params)
            entries = journal_data.get('data', [])
            
            total_debits = sum(float(entry.get('debitAmount', 0)) for entry in entries)
            total_credits = sum(float(entry.get('creditAmount', 0)) for entry in entries)
            
            # Get payroll data
            payroll_url = f"{self.api_base}/financialManagement/v1/payrollResults"
            payroll_data = await self.make_request('GET', payroll_url, params=params)
            payroll_expenses = sum(float(item.get('totalPay', 0)) for item in payroll_data.get('data', []))
            
            return {
                'platform': self.PLATFORM_NAME,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'total_debits': total_debits,
                'total_credits': total_credits,
                'payroll_expenses': payroll_expenses,
                'net_change': total_debits - total_credits,
                'extracted_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Workday financial data extraction error: {e}")
            return {}
    
    async def get_invoices(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get customer invoices from Workday"""
        try:
            url = f"{self.api_base}/financialManagement/v1/customerInvoices"
            params = {}
            
            if start_date:
                params['invoiceDateFrom'] = start_date.isoformat()
            
            response = await self.make_request('GET', url, params=params)
            invoices = response.get('data', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'invoice_id': inv.get('id'),
                'invoice_number': inv.get('invoiceNumber'),
                'customer_id': inv.get('customerId'),
                'customer_name': inv.get('customerName'),
                'invoice_date': inv.get('invoiceDate'),
                'due_date': inv.get('dueDate'),
                'total_amount': float(inv.get('totalAmount', 0)),
                'currency': inv.get('currency'),
                'status': inv.get('status'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for inv in invoices]
        except Exception as e:
            logger.error(f"Workday invoice extraction error: {e}")
            return []
    
    async def get_expenses(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get expense reports from Workday"""
        try:
            url = f"{self.api_base}/financialManagement/v1/expenseReports"
            params = {}
            
            if start_date:
                params['submittedDateFrom'] = start_date.isoformat()
            
            response = await self.make_request('GET', url, params=params)
            expenses = response.get('data', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'expense_id': exp.get('id'),
                'employee_id': exp.get('employeeId'),
                'employee_name': exp.get('employeeName'),
                'submitted_date': exp.get('submittedDate'),
                'amount': float(exp.get('totalAmount', 0)),
                'currency': exp.get('currency'),
                'description': exp.get('description'),
                'status': exp.get('status'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for exp in expenses]
        except Exception as e:
            logger.error(f"Workday expense extraction error: {e}")
            return []
