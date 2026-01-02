"""FreshBooks Integration Service

Handles OAuth2 authentication for FreshBooks accounting platform.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import logging
from .base_erp_service import BaseERPService

logger = logging.getLogger(__name__)


class FreshBooksService(BaseERPService):
    """FreshBooks integration service"""
    
    PLATFORM_NAME = "freshbooks"
    
    def __init__(self, db, config: Dict[str, Any]):
        super().__init__(db, config)
        self.client_id = config.get('client_id')
        self.client_secret = config.get('client_secret')
        self.refresh_token_value = config.get('refresh_token')
        self.account_id = config.get('account_id')
        self.api_base = "https://api.freshbooks.com"
        self.token_url = "https://api.freshbooks.com/auth/oauth/token"
        
    async def authenticate(self) -> bool:
        """Authenticate using OAuth2"""
        try:
            response = await self.client.post(
                self.token_url,
                json={
                    'grant_type': 'refresh_token',
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                    'refresh_token': self.refresh_token_value
                }
            )
            response.raise_for_status()
            token_data = response.json()
            
            self.access_token = token_data['access_token']
            self.refresh_token = token_data.get('refresh_token', self.refresh_token_value)
            self.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=token_data.get('expires_in', 3600))
            
            logger.info("FreshBooks authenticated successfully")
            return True
        except Exception as e:
            logger.error(f"FreshBooks authentication error: {e}")
            return False
    
    async def refresh_access_token(self) -> bool:
        """Refresh access token"""
        return await self.authenticate()
    
    async def get_financial_data(self, start_date: datetime, end_date: datetime) -> Dict:
        """Extract financial data from FreshBooks"""
        try:
            # Get income summary
            income_url = f"{self.api_base}/accounting/account/{self.account_id}/reports/accounting/profitloss"
            params = {
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d')
            }
            
            income_data = await self.make_request('GET', income_url, params=params)
            report = income_data.get('response', {}).get('result', {})
            
            total_income = float(report.get('total_income', {}).get('amount', 0))
            total_expenses = float(report.get('total_expenses', {}).get('amount', 0))
            
            return {
                'platform': self.PLATFORM_NAME,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'total_revenue': total_income,
                'total_expenses': abs(total_expenses),
                'net_income': total_income - abs(total_expenses),
                'extracted_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"FreshBooks financial data extraction error: {e}")
            return {}
    
    async def get_invoices(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get invoices from FreshBooks"""
        try:
            url = f"{self.api_base}/accounting/account/{self.account_id}/invoices/invoices"
            params = {}
            
            if start_date:
                params['date_min'] = start_date.strftime('%Y-%m-%d')
            
            response = await self.make_request('GET', url, params=params)
            invoices = response.get('response', {}).get('result', {}).get('invoices', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'invoice_id': inv.get('id'),
                'invoice_number': inv.get('invoice_number'),
                'customer_id': inv.get('customerid'),
                'create_date': inv.get('create_date'),
                'due_date': inv.get('due_date'),
                'total_amount': float(inv.get('amount', {}).get('amount', 0)),
                'outstanding': float(inv.get('outstanding', {}).get('amount', 0)),
                'status': inv.get('v3_status'),
                'currency': inv.get('currency_code'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for inv in invoices]
        except Exception as e:
            logger.error(f"FreshBooks invoice extraction error: {e}")
            return []
    
    async def get_expenses(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get expenses from FreshBooks"""
        try:
            url = f"{self.api_base}/accounting/account/{self.account_id}/expenses/expenses"
            params = {}
            
            if start_date:
                params['date_min'] = start_date.strftime('%Y-%m-%d')
            
            response = await self.make_request('GET', url, params=params)
            expenses = response.get('response', {}).get('result', {}).get('expenses', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'expense_id': exp.get('id'),
                'date': exp.get('date'),
                'vendor': exp.get('vendor'),
                'amount': float(exp.get('amount', {}).get('amount', 0)),
                'category': exp.get('categoryid'),
                'notes': exp.get('notes'),
                'currency': exp.get('currency_code'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for exp in expenses]
        except Exception as e:
            logger.error(f"FreshBooks expense extraction error: {e}")
            return []
