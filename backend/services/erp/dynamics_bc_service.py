"""Microsoft Dynamics 365 Business Central Integration Service

Handles OAuth2 authentication and Microsoft Graph API data extraction.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import logging
from .base_erp_service import BaseERPService

logger = logging.getLogger(__name__)


class DynamicsBCService(BaseERPService):
    """Microsoft Dynamics 365 Business Central integration service"""
    
    PLATFORM_NAME = "dynamics_bc"
    
    def __init__(self, db, config: Dict[str, Any]):
        super().__init__(db, config)
        self.tenant_id = config.get('tenant_id')
        self.client_id = config.get('client_id')
        self.client_secret = config.get('client_secret')
        self.company_id = config.get('company_id')
        self.api_base = f"https://api.businesscentral.dynamics.com/v2.0/{self.tenant_id}/api/v2.0"
        self.token_url = f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/v2.0/token"
        
    async def authenticate(self) -> bool:
        """Authenticate using OAuth2"""
        try:
            response = await self.client.post(
                self.token_url,
                data={
                    'grant_type': 'client_credentials',
                    'client_id': self.client_id,
                    'client_secret': self.client_secret,
                    'scope': 'https://api.businesscentral.dynamics.com/.default'
                }
            )
            response.raise_for_status()
            token_data = response.json()
            
            self.access_token = token_data['access_token']
            self.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=token_data['expires_in'])
            
            logger.info(f"Dynamics 365 Business Central authenticated successfully")
            return True
        except Exception as e:
            logger.error(f"Dynamics BC authentication error: {e}")
            return False
    
    async def refresh_access_token(self) -> bool:
        """Refresh access token"""
        return await self.authenticate()
    
    async def get_financial_data(self, start_date: datetime, end_date: datetime) -> Dict:
        """Extract financial data from Business Central"""
        try:
            # Get company info
            companies_url = f"{self.api_base}/companies"
            companies = await self.make_request('GET', companies_url)
            company_id = companies.get('value', [{}])[0].get('id', self.company_id)
            
            # Get P&L data
            pl_url = f"{self.api_base}/companies({company_id})/incomeStatement"
            pl_data = await self.make_request('GET', pl_url)
            
            revenue = 0
            expenses = 0
            
            if pl_data and 'value' in pl_data:
                for line in pl_data['value']:
                    if 'Revenue' in line.get('lineType', ''):
                        revenue += float(line.get('netChange', 0))
                    elif 'Expense' in line.get('lineType', ''):
                        expenses += float(line.get('netChange', 0))
            
            return {
                'platform': self.PLATFORM_NAME,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'total_revenue': revenue,
                'total_expenses': abs(expenses),
                'net_income': revenue - abs(expenses),
                'extracted_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"Dynamics BC financial data extraction error: {e}")
            return {}
    
    async def get_invoices(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get sales invoices from Business Central"""
        try:
            companies_url = f"{self.api_base}/companies"
            companies = await self.make_request('GET', companies_url)
            company_id = companies.get('value', [{}])[0].get('id', self.company_id)
            
            url = f"{self.api_base}/companies({company_id})/salesInvoices"
            params = {}
            
            if start_date:
                params['$filter'] = f"invoiceDate ge {start_date.date()}"
            
            response = await self.make_request('GET', url, params=params)
            invoices = response.get('value', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'invoice_id': inv.get('id'),
                'invoice_number': inv.get('number'),
                'customer_id': inv.get('customerId'),
                'customer_name': inv.get('customerName'),
                'invoice_date': inv.get('invoiceDate'),
                'due_date': inv.get('dueDate'),
                'total_amount': float(inv.get('totalAmountIncludingTax', 0)),
                'currency': inv.get('currencyCode'),
                'status': inv.get('status'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for inv in invoices]
        except Exception as e:
            logger.error(f"Dynamics BC invoice extraction error: {e}")
            return []
    
    async def get_expenses(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get purchase invoices (expenses) from Business Central"""
        try:
            companies_url = f"{self.api_base}/companies"
            companies = await self.make_request('GET', companies_url)
            company_id = companies.get('value', [{}])[0].get('id', self.company_id)
            
            url = f"{self.api_base}/companies({company_id})/purchaseInvoices"
            params = {}
            
            if start_date:
                params['$filter'] = f"invoiceDate ge {start_date.date()}"
            
            response = await self.make_request('GET', url, params=params)
            expenses = response.get('value', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'expense_id': exp.get('id'),
                'vendor_id': exp.get('vendorId'),
                'vendor_name': exp.get('vendorName'),
                'invoice_date': exp.get('invoiceDate'),
                'amount': float(exp.get('totalAmountIncludingTax', 0)),
                'currency': exp.get('currencyCode'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for exp in expenses]
        except Exception as e:
            logger.error(f"Dynamics BC expense extraction error: {e}")
            return []
