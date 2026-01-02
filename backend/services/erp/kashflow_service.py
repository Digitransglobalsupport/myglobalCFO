"""KashFlow Integration Service

Handles API key authentication for KashFlow UK accounting platform.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import logging
import base64
from .base_erp_service import BaseERPService

logger = logging.getLogger(__name__)


class KashFlowService(BaseERPService):
    """KashFlow integration service (REST API)"""
    
    PLATFORM_NAME = "kashflow"
    
    def __init__(self, db, config: Dict[str, Any]):
        super().__init__(db, config)
        self.username = config.get('username')
        self.password = config.get('password')
        self.api_base = "https://api.kashflow.com/v2"
        
    async def authenticate(self) -> bool:
        """Authenticate using basic auth (session token)"""
        try:
            # Create session token
            auth_string = f"{self.username}:{self.password}"
            self.access_token = base64.b64encode(auth_string.encode()).decode()
            
            # Verify credentials by making a test request
            test_url = f"{self.api_base}/companies"
            headers = {'Authorization': f'Basic {self.access_token}'}
            
            response = await self.client.get(test_url, headers=headers)
            response.raise_for_status()
            
            logger.info("KashFlow authenticated successfully")
            return True
        except Exception as e:
            logger.error(f"KashFlow authentication error: {e}")
            return False
    
    async def refresh_access_token(self) -> bool:
        """Session token doesn't expire"""
        return True
    
    async def make_request(self, method: str, url: str, **kwargs) -> Optional[Dict]:
        """Override to use Basic auth instead of Bearer"""
        try:
            headers = kwargs.get('headers', {})
            headers['Authorization'] = f'Basic {self.access_token}'
            kwargs['headers'] = headers
            
            response = await self.client.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"KashFlow API request error: {e}")
            return None
    
    async def get_financial_data(self, start_date: datetime, end_date: datetime) -> Dict:
        """Extract financial data from KashFlow"""
        try:
            # Get account summary
            summary_url = f"{self.api_base}/reports/account-summary"
            params = {
                'startDate': start_date.strftime('%Y-%m-%d'),
                'endDate': end_date.strftime('%Y-%m-%d')
            }
            
            summary_data = await self.make_request('GET', summary_url, params=params)
            
            return {
                'platform': self.PLATFORM_NAME,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'total_revenue': float(summary_data.get('totalIncome', 0)),
                'total_expenses': float(summary_data.get('totalExpenses', 0)),
                'net_profit': float(summary_data.get('netProfit', 0)),
                'extracted_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"KashFlow financial data extraction error: {e}")
            return {}
    
    async def get_invoices(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get invoices from KashFlow"""
        try:
            url = f"{self.api_base}/invoices"
            params = {}
            
            if start_date:
                params['fromDate'] = start_date.strftime('%Y-%m-%d')
            
            response = await self.make_request('GET', url, params=params)
            invoices = response.get('invoices', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'invoice_id': inv.get('InvoiceID'),
                'invoice_number': inv.get('InvoiceNumber'),
                'customer_name': inv.get('CustomerName'),
                'invoice_date': inv.get('InvoiceDate'),
                'due_date': inv.get('DueDate'),
                'total_amount': float(inv.get('NetAmount', 0)),
                'vat_amount': float(inv.get('VATAmount', 0)),
                'status': 'paid' if inv.get('AmountPaid', 0) >= inv.get('NetAmount', 0) else 'unpaid',
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for inv in invoices]
        except Exception as e:
            logger.error(f"KashFlow invoice extraction error: {e}")
            return []
    
    async def get_expenses(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get supplier bills (expenses) from KashFlow"""
        try:
            url = f"{self.api_base}/suppliers/bills"
            params = {}
            
            if start_date:
                params['fromDate'] = start_date.strftime('%Y-%m-%d')
            
            response = await self.make_request('GET', url, params=params)
            expenses = response.get('bills', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'expense_id': exp.get('SupplierBillID'),
                'supplier_name': exp.get('SupplierName'),
                'bill_date': exp.get('BillDate'),
                'amount': float(exp.get('NetAmount', 0)),
                'vat_amount': float(exp.get('VATAmount', 0)),
                'description': exp.get('Description'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for exp in expenses]
        except Exception as e:
            logger.error(f"KashFlow expense extraction error: {e}")
            return []
