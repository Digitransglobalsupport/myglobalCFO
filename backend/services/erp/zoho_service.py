"""Zoho Books Integration Service

Handles OAuth2 and API key authentication for Zoho Books.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import logging
from .base_erp_service import BaseERPService

logger = logging.getLogger(__name__)


class ZohoService(BaseERPService):
    """Zoho Books integration service"""
    
    PLATFORM_NAME = "zoho_books"
    
    def __init__(self, db, config: Dict[str, Any]):
        super().__init__(db, config)
        self.client_id = config.get('client_id')
        self.client_secret = config.get('client_secret')
        self.refresh_token_value = config.get('refresh_token')
        self.organization_id = config.get('organization_id')
        self.api_base = "https://books.zoho.com/api/v3"
        self.token_url = "https://accounts.zoho.com/oauth/v2/token"
        
    async def authenticate(self) -> bool:
        """Authenticate using OAuth2 refresh token"""
        try:
            # If no refresh token yet, this means we're in the initial setup phase
            # OAuth flow needs to be completed first
            if not self.refresh_token_value:
                logger.info("Zoho Books: Waiting for OAuth flow completion (no refresh token yet)")
                return True  # Return True to allow the connection to be saved, OAuth will complete later
            
            response = await self.client.post(
                self.token_url,
                data={
                    'grant_type': 'refresh_token',
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                    'refresh_token': self.refresh_token_value
                }
            )
            response.raise_for_status()
            token_data = response.json()
            
            self.access_token = token_data.get('access_token')
            if not self.access_token:
                logger.error("Zoho authentication failed: No access_token in response")
                return False
                
            self.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=token_data.get('expires_in', 3600))
            
            logger.info("Zoho Books authenticated successfully")
            return True
        except Exception as e:
            logger.error(f"Zoho authentication error: {e}")
            return False
    
    async def refresh_access_token(self) -> bool:
        """Refresh access token"""
        return await self.authenticate()
    
    async def get_financial_data(self, start_date: datetime, end_date: datetime) -> Dict:
        """Extract P&L data from Zoho Books"""
        try:
            # Get profit & loss report
            pl_url = f"{self.api_base}/reports/profitandloss"
            params = {
                'organization_id': self.organization_id,
                'from_date': start_date.strftime('%Y-%m-%d'),
                'to_date': end_date.strftime('%Y-%m-%d')
            }
            
            pl_data = await self.make_request('GET', pl_url, params=params)
            report = pl_data.get('report', {})
            
            # Extract revenue and expenses
            total_income = 0
            total_expense = 0
            
            for section in report.get('sections', []):
                section_name = section.get('section_name', '').lower()
                if 'income' in section_name or 'revenue' in section_name:
                    total_income += float(section.get('total', 0))
                elif 'expense' in section_name or 'cost' in section_name:
                    total_expense += abs(float(section.get('total', 0)))
            
            return {
                'platform': self.PLATFORM_NAME,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'total_revenue': total_income,
                'total_expenses': total_expense,
                'net_income': total_income - total_expense,
                'extracted_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Zoho financial data extraction error: {e}")
            return {}
    
    async def get_invoices(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get invoices from Zoho Books"""
        try:
            url = f"{self.api_base}/invoices"
            params = {'organization_id': self.organization_id}
            
            if start_date:
                params['date_start'] = start_date.strftime('%Y-%m-%d')
            
            response = await self.make_request('GET', url, params=params)
            invoices = response.get('invoices', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'invoice_id': inv.get('invoice_id'),
                'invoice_number': inv.get('invoice_number'),
                'customer_id': inv.get('customer_id'),
                'customer_name': inv.get('customer_name'),
                'date': inv.get('date'),
                'due_date': inv.get('due_date'),
                'total_amount': float(inv.get('total', 0)),
                'balance': float(inv.get('balance', 0)),
                'status': inv.get('status'),
                'currency': inv.get('currency_code'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for inv in invoices]
        except Exception as e:
            logger.error(f"Zoho invoice extraction error: {e}")
            return []
    
    async def get_expenses(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get expenses from Zoho Books"""
        try:
            url = f"{self.api_base}/expenses"
            params = {'organization_id': self.organization_id}
            
            if start_date:
                params['date_start'] = start_date.strftime('%Y-%m-%d')
            
            response = await self.make_request('GET', url, params=params)
            expenses = response.get('expenses', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'expense_id': exp.get('expense_id'),
                'date': exp.get('date'),
                'vendor_name': exp.get('vendor_name'),
                'amount': float(exp.get('total', 0)),
                'category': exp.get('account_name'),
                'description': exp.get('description'),
                'currency': exp.get('currency_code'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for exp in expenses]
        except Exception as e:
            logger.error(f"Zoho expense extraction error: {e}")
            return []
