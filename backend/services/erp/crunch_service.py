"""Crunch Accounting Integration Service

Handles OAuth2 authentication for Crunch UK accounting platform.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import logging
from .base_erp_service import BaseERPService

logger = logging.getLogger(__name__)


class CrunchService(BaseERPService):
    """Crunch Accounting integration service"""
    
    PLATFORM_NAME = "crunch"
    
    def __init__(self, db, config: Dict[str, Any]):
        super().__init__(db, config)
        self.client_id = config.get('client_id')
        self.client_secret = config.get('client_secret')
        self.refresh_token_value = config.get('refresh_token')
        self.api_base = "https://api.crunch.co.uk/v1"
        self.token_url = "https://oauth.crunch.co.uk/token"
        
    async def authenticate(self) -> bool:
        """Authenticate using OAuth2"""
        try:
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
            
            self.access_token = token_data['access_token']
            self.refresh_token = token_data.get('refresh_token', self.refresh_token_value)
            self.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=token_data.get('expires_in', 3600))
            
            logger.info("Crunch authenticated successfully")
            return True
        except Exception as e:
            logger.error(f"Crunch authentication error: {e}")
            return False
    
    async def refresh_access_token(self) -> bool:
        """Refresh access token"""
        return await self.authenticate()
    
    async def get_financial_data(self, start_date: datetime, end_date: datetime) -> Dict:
        """Extract financial data from Crunch"""
        try:
            # Get account summary
            summary_url = f"{self.api_base}/accounting/summary"
            params = {
                'from': start_date.strftime('%Y-%m-%d'),
                'to': end_date.strftime('%Y-%m-%d')
            }
            
            summary_data = await self.make_request('GET', summary_url, params=params)
            
            return {
                'platform': self.PLATFORM_NAME,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'total_revenue': float(summary_data.get('income', 0)),
                'total_expenses': float(summary_data.get('expenses', 0)),
                'net_profit': float(summary_data.get('profit', 0)),
                'vat_owed': float(summary_data.get('vat_owed', 0)),
                'extracted_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Crunch financial data extraction error: {e}")
            return {}
    
    async def get_invoices(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get invoices from Crunch"""
        try:
            url = f"{self.api_base}/invoices"
            params = {}
            
            if start_date:
                params['from_date'] = start_date.strftime('%Y-%m-%d')
            
            response = await self.make_request('GET', url, params=params)
            invoices = response.get('invoices', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'invoice_id': inv.get('id'),
                'invoice_number': inv.get('number'),
                'customer_name': inv.get('customer_name'),
                'issue_date': inv.get('issue_date'),
                'due_date': inv.get('due_date'),
                'total_amount': float(inv.get('total', 0)),
                'vat_amount': float(inv.get('vat', 0)),
                'status': inv.get('status'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for inv in invoices]
        except Exception as e:
            logger.error(f"Crunch invoice extraction error: {e}")
            return []
    
    async def get_expenses(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get expenses from Crunch"""
        try:
            url = f"{self.api_base}/expenses"
            params = {}
            
            if start_date:
                params['from_date'] = start_date.strftime('%Y-%m-%d')
            
            response = await self.make_request('GET', url, params=params)
            expenses = response.get('expenses', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'expense_id': exp.get('id'),
                'date': exp.get('date'),
                'supplier': exp.get('supplier'),
                'amount': float(exp.get('net_amount', 0)),
                'vat_amount': float(exp.get('vat_amount', 0)),
                'category': exp.get('category'),
                'description': exp.get('description'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for exp in expenses]
        except Exception as e:
            logger.error(f"Crunch expense extraction error: {e}")
            return []
