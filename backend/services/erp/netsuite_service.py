"""NetSuite ERP Integration Service

Handles OAuth2/TBA authentication and data extraction from NetSuite.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
import logging
import base64
import hashlib
import hmac
import secrets
from urllib.parse import quote
from .base_erp_service import BaseERPService

logger = logging.getLogger(__name__)


class NetSuiteService(BaseERPService):
    """NetSuite integration service"""
    
    PLATFORM_NAME = "netsuite"
    
    def __init__(self, db, config: Dict[str, Any]):
        super().__init__(db, config)
        self.account_id = config.get('account_id')
        self.consumer_key = config.get('consumer_key')
        self.consumer_secret = config.get('consumer_secret')
        self.token_id = config.get('token_id')
        self.token_secret = config.get('token_secret')
        self.rest_api_url = config.get('rest_api_url', f'https://{self.account_id}.suitetalk.api.netsuite.com/services/rest')
        
    async def authenticate(self) -> bool:
        """Authenticate using Token-Based Authentication (TBA)"""
        try:
            # TBA doesn't require initial authentication - credentials used per request
            logger.info(f"NetSuite TBA configured for account: {self.account_id}")
            return True
        except Exception as e:
            logger.error(f"NetSuite authentication error: {e}")
            return False
    
    async def refresh_access_token(self) -> bool:
        """TBA tokens don't expire - return True"""
        return True
    
    def _generate_oauth_signature(self, method: str, url: str, params: Dict) -> str:
        """Generate OAuth 1.0 signature for NetSuite TBA"""
        # Sort parameters
        sorted_params = sorted(params.items())
        param_string = '&'.join([f"{quote(str(k))}={quote(str(v))}" for k, v in sorted_params])
        
        # Create signature base string
        base_string = f"{method.upper()}&{quote(url)}&{quote(param_string)}"
        
        # Create signing key
        signing_key = f"{quote(self.consumer_secret)}&{quote(self.token_secret)}"
        
        # Generate signature
        signature = hmac.new(
            signing_key.encode(),
            base_string.encode(),
            hashlib.sha256
        ).digest()
        
        return base64.b64encode(signature).decode()
    
    async def get_financial_data(self, start_date: datetime, end_date: datetime) -> Dict:
        """Extract P&L and financial data using SuiteQL"""
        try:
            # Query for revenue
            revenue_query = f"""
                SELECT SUM(amount) as total_revenue
                FROM transaction
                WHERE trandate BETWEEN '{start_date.date()}' AND '{end_date.date()}'
                AND type IN ('CustInvc', 'CashSale')
            """
            
            revenue_data = await self._execute_suiteql(revenue_query)
            
            # Query for expenses
            expense_query = f"""
                SELECT SUM(amount) as total_expenses
                FROM transaction
                WHERE trandate BETWEEN '{start_date.date()}' AND '{end_date.date()}'
                AND type IN ('VendBill', 'ExpRept')
            """
            
            expense_data = await self._execute_suiteql(expense_query)
            
            return {
                'platform': self.PLATFORM_NAME,
                'period_start': start_date.isoformat(),
                'period_end': end_date.isoformat(),
                'total_revenue': revenue_data[0].get('total_revenue', 0) if revenue_data else 0,
                'total_expenses': expense_data[0].get('total_expenses', 0) if expense_data else 0,
                'extracted_at': datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            logger.error(f"NetSuite financial data extraction error: {e}")
            return {}
    
    async def get_invoices(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get invoices from NetSuite"""
        try:
            query = "SELECT id, tranid, entity, trandate, duedate, total, status FROM transaction WHERE type = 'CustInvc'"
            if start_date:
                query += f" AND trandate >= '{start_date.date()}'"
            
            invoices = await self._execute_suiteql(query)
            
            return [{
                'platform': self.PLATFORM_NAME,
                'invoice_id': inv.get('id'),
                'invoice_number': inv.get('tranid'),
                'customer_id': inv.get('entity'),
                'date': inv.get('trandate'),
                'due_date': inv.get('duedate'),
                'total_amount': float(inv.get('total', 0)),
                'status': inv.get('status'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for inv in invoices]
        except Exception as e:
            logger.error(f"NetSuite invoice extraction error: {e}")
            return []
    
    async def get_expenses(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get expenses from NetSuite"""
        try:
            query = "SELECT id, tranid, entity, trandate, amount, memo FROM transaction WHERE type IN ('VendBill', 'ExpRept')"
            if start_date:
                query += f" AND trandate >= '{start_date.date()}'"
            
            expenses = await self._execute_suiteql(query)
            
            return [{
                'platform': self.PLATFORM_NAME,
                'expense_id': exp.get('id'),
                'transaction_number': exp.get('tranid'),
                'vendor_id': exp.get('entity'),
                'date': exp.get('trandate'),
                'amount': float(exp.get('amount', 0)),
                'description': exp.get('memo'),
                'synced_at': datetime.now(timezone.utc).isoformat()
            } for exp in expenses]
        except Exception as e:
            logger.error(f"NetSuite expense extraction error: {e}")
            return []
    
    async def _execute_suiteql(self, query: str) -> List[Dict]:
        """Execute SuiteQL query"""
        url = f"{self.rest_api_url}/query/v1/suiteql"
        
        # Generate OAuth parameters
        oauth_params = {
            'oauth_consumer_key': self.consumer_key,
            'oauth_token': self.token_id,
            'oauth_signature_method': 'HMAC-SHA256',
            'oauth_timestamp': str(int(datetime.now(timezone.utc).timestamp())),
            'oauth_nonce': secrets.token_hex(16),
            'oauth_version': '1.0'
        }
        
        # Generate signature
        oauth_params['oauth_signature'] = self._generate_oauth_signature('POST', url, oauth_params)
        
        # Build Authorization header
        auth_header = 'OAuth ' + ', '.join([f'{k}="{v}"' for k, v in oauth_params.items()])
        
        response = await self.client.post(
            url,
            headers={
                'Authorization': auth_header,
                'Content-Type': 'application/json',
                'Prefer': 'transient'
            },
            json={'q': query}
        )
        
        response.raise_for_status()
        result = response.json()
        
        return result.get('items', [])
