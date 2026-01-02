"""SAP S/4HANA Integration Service

Handles OAuth2 authentication and OData API data extraction from SAP S/4HANA.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import logging
from .base_erp_service import BaseERPService

logger = logging.getLogger(__name__)


class SAPService(BaseERPService):
    """SAP S/4HANA integration service"""
    
    PLATFORM_NAME = "sap_s4hana"
    
    def __init__(self, db, config: Dict[str, Any]):
        super().__init__(db, config)
        self.client_id = config.get('client_id')
        self.client_secret = config.get('client_secret')
        self.api_base = config.get('api_base_url')
        self.token_url = config.get('token_url')
        
    async def authenticate(self) -> bool:
        """Authenticate using OAuth2"""
        try:
            response = await self.client.post(
                self.token_url,
                data={
                    'grant_type': 'client_credentials',
                    'client_id': self.client_id,
                    'client_secret': self.client_secret
                }
            )
            response.raise_for_status()
            token_data = response.json()
            
            self.access_token = token_data['access_token']
            self.token_expiry = datetime.now(timezone.utc) + timedelta(seconds=token_data.get('expires_in', 3600))
            
            logger.info("SAP S/4HANA authenticated successfully")
            return True
        except Exception as e:
            logger.error(f"SAP authentication error: {e}")
            return False
    
    async def refresh_access_token(self) -> bool:
        """Refresh access token"""
        return await self.authenticate()
    
    async def get_financial_data(self, start_date: datetime, end_date: datetime) -> Dict:
        """Extract GL entries and financial data"""
        try:
            # Get GL account line items
            gl_url = f"{self.api_base}/API_GLACCOUNTLINEITEM_SRV/GLAccountLineItem"
            params = {
                '$filter': f"PostingDate ge datetime'{start_date.isoformat()}' and PostingDate le datetime'{end_date.isoformat()}'",
                '$select': 'CompanyCode,FiscalYear,AccountingDocument,AmountInCompanyCodeCurrency,DebitCreditCode'
            }
            
            gl_data = await self.make_request('GET', gl_url, params=params)
            items = gl_data.get('d', {}).get('results', [])
            
            debits = sum(float(item['AmountInCompanyCodeCurrency']) for item in items if item.get('DebitCreditCode') == 'S')
            credits = sum(float(item['AmountInCompanyCodeCurrency']) for item in items if item.get('DebitCreditCode') == 'H')
            
            return {
                'platform': self.PLATFORM_NAME,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'total_debits': debits,
                'total_credits': credits,
                'net_change': debits - credits,
                'record_count': len(items),
                'extracted_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"SAP financial data extraction error: {e}")
            return {}
    
    async def get_invoices(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get customer invoices from SAP"""
        try:
            url = f"{self.api_base}/API_SALES_INVOICE_SRV/A_SalesInvoice"
            params = {}
            
            if start_date:
                params['$filter'] = f"BillingDocumentDate ge datetime'{start_date.isoformat()}'"
            
            response = await self.make_request('GET', url, params=params)
            invoices = response.get('d', {}).get('results', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'invoice_id': inv.get('BillingDocument'),
                'invoice_number': inv.get('BillingDocument'),
                'customer_id': inv.get('SoldToParty'),
                'billing_date': inv.get('BillingDocumentDate'),
                'total_amount': float(inv.get('TotalNetAmount', 0)),
                'currency': inv.get('TransactionCurrency'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for inv in invoices]
        except Exception as e:
            logger.error(f"SAP invoice extraction error: {e}")
            return []
    
    async def get_expenses(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get vendor invoices (expenses) from SAP"""
        try:
            url = f"{self.api_base}/API_PURCHASEINVOICE_PROCESS_SRV/A_PurchaseInvoice"
            params = {}
            
            if start_date:
                params['$filter'] = f"DocumentDate ge datetime'{start_date.isoformat()}'"
            
            response = await self.make_request('GET', url, params=params)
            expenses = response.get('d', {}).get('results', [])
            
            return [{
                'platform': self.PLATFORM_NAME,
                'expense_id': exp.get('PurchaseInvoice'),
                'vendor_id': exp.get('SupplierInvoiceIDByInvcgParty'),
                'document_date': exp.get('DocumentDate'),
                'amount': float(exp.get('InvoiceGrossAmount', 0)),
                'currency': exp.get('DocumentCurrency'),
                'description': exp.get('DocumentHeaderText'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for exp in expenses]
        except Exception as e:
            logger.error(f"SAP expense extraction error: {e}")
            return []
