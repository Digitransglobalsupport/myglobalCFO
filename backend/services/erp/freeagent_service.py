"""FreeAgent Integration Service

Handles OAuth2 authentication for FreeAgent UK accounting platform.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import logging
from .base_erp_service import BaseERPService

logger = logging.getLogger(__name__)


class FreeAgentService(BaseERPService):
    """FreeAgent integration service"""
    
    PLATFORM_NAME = "freeagent"
    
    def __init__(self, db, config: Dict[str, Any]):
        super().__init__(db, config)
        self.client_id = config.get('client_id')
        self.client_secret = config.get('client_secret')
        self.refresh_token_value = config.get('refresh_token')
        self.api_base = "https://api.freeagent.com/v2"
        self.token_url = "https://api.freeagent.com/v2/token_endpoint"
        
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
            
            logger.info("FreeAgent authenticated successfully")
            return True
        except Exception as e:
            logger.error(f"FreeAgent authentication error: {e}")
            return False
    
    async def refresh_access_token(self) -> bool:
        """Refresh access token"""
        return await self.authenticate()
    
    async def get_financial_data(self, start_date: datetime, end_date: datetime) -> Dict:
        """Extract P&L data from FreeAgent"""
        try:
            # Get P&L report
            pl_url = f"{self.api_base}/reports/profit_and_loss"
            params = {
                'from_date': start_date.strftime('%Y-%m-%d'),
                'to_date': end_date.strftime('%Y-%m-%d')
            }
            
            pl_data = await self.make_request('GET', pl_url, params=params)
            report = pl_data.get('profit_and_loss_report', {})
            
            return {
                'platform': self.PLATFORM_NAME,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'total_revenue': float(report.get('gross_profit', 0)),
                'total_expenses': float(report.get('total_expenses', 0)),
                'net_profit': float(report.get('net_profit', 0)),
                'extracted_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"FreeAgent financial data extraction error: {e}")
            return {}
    
    async def get_invoices(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get invoices from FreeAgent"""
        try:
            url = f"{self.api_base}/invoices"
            params = {'view': 'all'}
            
            if start_date:
                params['from_date'] = start_date.strftime('%Y-%m-%d')
            
            response = await self.make_request('GET', url, params=params)
            invoices = response.get('invoices', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'invoice_id': inv.get('url', '').split('/')[-1],
                'invoice_number': inv.get('reference'),
                'contact_name': inv.get('contact'),
                'dated_on': inv.get('dated_on'),
                'due_on': inv.get('due_on'),
                'total_amount': float(inv.get('net_value', 0)),
                'status': inv.get('status'),
                'currency': inv.get('currency'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for inv in invoices]
        except Exception as e:
            logger.error(f"FreeAgent invoice extraction error: {e}")
            return []
    
    async def get_expenses(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get expenses from FreeAgent"""
        try:
            url = f"{self.api_base}/expenses"
            params = {}
            
            if start_date:
                params['from_date'] = start_date.strftime('%Y-%m-%d')
            
            response = await self.make_request('GET', url, params=params)
            expenses = response.get('expenses', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'expense_id': exp.get('url', '').split('/')[-1],
                'dated_on': exp.get('dated_on'),
                'description': exp.get('description'),
                'gross_value': float(exp.get('gross_value', 0)),
                'category': exp.get('category'),
                'currency': exp.get('currency'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for exp in expenses]
        except Exception as e:
            logger.error(f"FreeAgent expense extraction error: {e}")
            return []
