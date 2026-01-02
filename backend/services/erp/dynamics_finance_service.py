"""Microsoft Dynamics 365 Finance Integration Service

Handles OAuth2 authentication and OData API data extraction.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import logging
from .base_erp_service import BaseERPService

logger = logging.getLogger(__name__)


class DynamicsFinanceService(BaseERPService):
    """Microsoft Dynamics 365 Finance integration service"""
    
    PLATFORM_NAME = "dynamics_finance"
    
    def __init__(self, db, config: Dict[str, Any]):
        super().__init__(db, config)
        self.tenant_id = config.get('tenant_id')
        self.client_id = config.get('client_id')
        self.client_secret = config.get('client_secret')
        self.resource_url = config.get('resource_url')
        self.api_base = f"{self.resource_url}/data"
        self.token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        
    async def authenticate(self) -> bool:
        """Authenticate using OAuth2 client credentials flow"""
        try:
            response = await self.client.post(
                self.token_url,
                data={
                    'grant_type': 'client_credentials',
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                    'scope': f"{self.resource_url}/.default"
                }
            )
            response.raise_for_status()
            token_data = response.json()
            
            self.access_token = token_data['access_token']
            self.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=token_data['expires_in'])
            
            logger.info(f"Dynamics 365 Finance authenticated successfully")
            return True
        except Exception as e:
            logger.error(f"Dynamics 365 Finance authentication error: {e}")
            return False
    
    async def refresh_access_token(self) -> bool:
        """Refresh access token"""
        return await self.authenticate()
    
    async def get_financial_data(self, start_date: datetime, end_date: datetime) -> Dict:
        """Extract financial data using OData API"""
        try:
            # Get GL entries
            gl_url = f"{self.api_base}/GeneralLedgerEntries"
            gl_filter = f"PostingDate ge {start_date.date()} and PostingDate le {end_date.date()}"
            
            gl_data = await self.make_request(
                'GET',
                gl_url,
                params={'$filter': gl_filter, '$select': 'AccountingDate,DebitAmount,CreditAmount'}
            )
            
            total_debits = sum(float(entry.get('DebitAmount', 0)) for entry in gl_data.get('value', []))
            total_credits = sum(float(entry.get('CreditAmount', 0)) for entry in gl_data.get('value', []))
            
            return {
                'platform': self.PLATFORM_NAME,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'total_debits': total_debits,
                'total_credits': total_credits,
                'net_change': total_debits - total_credits,
                'extracted_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Dynamics Finance data extraction error: {e}")
            return {}
    
    async def get_invoices(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get sales invoices from Dynamics 365 Finance"""
        try:
            url = f"{self.api_base}/SalesInvoiceHeaders"
            params = {'$expand': 'Lines'}
            
            if start_date:
                params['$filter'] = f"InvoiceDate ge {start_date.date()}"
            
            response = await self.make_request('GET', url, params=params)
            invoices = response.get('value', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'invoice_id': inv.get('InvoiceId'),
                'invoice_number': inv.get('InvoiceNumber'),
                'customer_account': inv.get('CustomerAccount'),
                'invoice_date': inv.get('InvoiceDate'),
                'due_date': inv.get('DueDate'),
                'total_amount': float(inv.get('InvoiceAmount', 0)),
                'currency': inv.get('CurrencyCode'),
                'status': inv.get('InvoiceStatus'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for inv in invoices]
        except Exception as e:
            logger.error(f"Dynamics Finance invoice extraction error: {e}")
            return []
    
    async def get_expenses(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get vendor invoices (expenses) from Dynamics 365 Finance"""
        try:
            url = f"{self.api_base}/VendorInvoiceHeaders"
            params = {}
            
            if start_date:
                params['$filter'] = f"InvoiceDate ge {start_date.date()}"
            
            response = await self.make_request('GET', url, params=params)
            expenses = response.get('value', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'expense_id': exp.get('InvoiceId'),
                'vendor_account': exp.get('VendorAccount'),
                'invoice_date': exp.get('InvoiceDate'),
                'amount': float(exp.get('InvoiceAmount', 0)),
                'currency': exp.get('CurrencyCode'),
                'description': exp.get('InvoiceDescription'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for exp in expenses]
        except Exception as e:
            logger.error(f"Dynamics Finance expense extraction error: {e}")
            return []
