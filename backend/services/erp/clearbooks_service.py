"""Clear Books Integration Service

Handles OAuth2 authentication for Clear Books UK accounting platform.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import logging
from .base_erp_service import BaseERPService

logger = logging.getLogger(__name__)


class ClearBooksService(BaseERPService):
    """Clear Books integration service"""
    
    PLATFORM_NAME = "clearbooks"
    
    def __init__(self, db, config: Dict[str, Any]):
        super().__init__(db, config)
        self.client_id = config.get('client_id')
        self.client_secret = config.get('client_secret')
        self.refresh_token_value = config.get('refresh_token')
        self.api_base = "https://api.clearbooks.co.uk/v3"
        self.token_url = "https://api.clearbooks.co.uk/oauth/token"
        
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
            
            logger.info("Clear Books authenticated successfully")
            return True
        except Exception as e:
            logger.error(f"Clear Books authentication error: {e}")
            return False
    
    async def refresh_access_token(self) -> bool:
        """Refresh access token"""
        return await self.authenticate()
    
    async def get_financial_data(self, start_date: datetime, end_date: datetime) -> Dict:
        """Extract P&L and balance sheet data from Clear Books"""
        try:
            # Get profit & loss
            pl_url = f"{self.api_base}/reports/profit-loss"
            params = {
                'start_date': start_date.strftime('%Y-%m-%d'),
                'end_date': end_date.strftime('%Y-%m-%d')
            }
            
            pl_data = await self.make_request('GET', pl_url, params=params)
            
            # Get balance sheet
            bs_url = f"{self.api_base}/reports/balance-sheet"
            bs_params = {'date': end_date.strftime('%Y-%m-%d')}
            bs_data = await self.make_request('GET', bs_url, params=bs_params)
            
            return {
                'platform': self.PLATFORM_NAME,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'total_revenue': float(pl_data.get('total_income', 0)),
                'total_expenses': float(pl_data.get('total_expenses', 0)),
                'net_profit': float(pl_data.get('net_profit', 0)),
                'total_assets': float(bs_data.get('total_assets', 0)),
                'total_liabilities': float(bs_data.get('total_liabilities', 0)),
                'extracted_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Clear Books financial data extraction error: {e}")
            return {}
    
    async def get_invoices(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get invoices from Clear Books"""
        try:
            url = f"{self.api_base}/invoices"
            params = {'type': 'sales'}
            
            if start_date:
                params['modified_since'] = start_date.isoformat()
            
            response = await self.make_request('GET', url, params=params)
            invoices = response.get('invoices', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'invoice_id': inv.get('id'),
                'invoice_number': inv.get('invoice_number'),
                'entity_name': inv.get('entity_name'),
                'invoice_date': inv.get('invoice_date'),
                'due_date': inv.get('due_date'),
                'total_amount': float(inv.get('gross_value', 0)),
                'vat_amount': float(inv.get('vat', 0)),
                'status': inv.get('status'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for inv in invoices]
        except Exception as e:
            logger.error(f"Clear Books invoice extraction error: {e}")
            return []
    
    async def get_expenses(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get bills/expenses from Clear Books"""
        try:
            url = f"{self.api_base}/bills"
            params = {}
            
            if start_date:
                params['modified_since'] = start_date.isoformat()
            
            response = await self.make_request('GET', url, params=params)
            expenses = response.get('bills', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'expense_id': exp.get('id'),
                'supplier_name': exp.get('supplier_name'),
                'bill_date': exp.get('bill_date'),
                'amount': float(exp.get('gross_value', 0)),
                'vat_amount': float(exp.get('vat', 0)),
                'description': exp.get('description'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for exp in expenses]
        except Exception as e:
            logger.error(f"Clear Books expense extraction error: {e}")
            return []
