"""
Accounting Software Integrations (Xero, QuickBooks, Sage)
"""
import os
import logging
from typing import Dict, Optional, List
from datetime import datetime
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class XeroIntegration:
    def __init__(self, client_id: str, client_secret: str, tenant_id: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.tenant_id = tenant_id
        self.access_token = None
        self.refresh_token = None
        self.token_expiry = None
        self.base_url = "https://api.xero.com/api.xro/2.0"
    
    def set_tokens(self, access_token: str, refresh_token: str, expiry: Optional[str] = None):
        """Set OAuth tokens"""
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.token_expiry = expiry
    
    def create_invoice(self, invoice_data: Dict) -> Optional[Dict]:
        """Create invoice in Xero"""
        try:
            if not self.access_token:
                logger.error("No access token available")
                return None
            
            xero_invoice = self._transform_to_xero_format(invoice_data)
            
            if not xero_invoice:
                return None
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'xero-tenant-id': self.tenant_id,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
            
            response = requests.post(
                f"{self.base_url}/Invoices",
                headers=headers,
                json={"Invoices": [xero_invoice]},
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                if result.get('Invoices'):
                    created_invoice = result['Invoices'][0]
                    logger.info(f"Created Xero invoice: {created_invoice.get('InvoiceID')}")
                    return created_invoice
            else:
                logger.error(f"Xero API error: {response.status_code} - {response.text}")
                return None
        
        except Exception as e:
            logger.error(f"Error creating Xero invoice: {str(e)}", exc_info=True)
            return None
    
    def _transform_to_xero_format(self, invoice_data: Dict) -> Optional[Dict]:
        """Transform extracted data to Xero format"""
        try:
            invoice_type = "ACCPAY"  # Bill
            
            if invoice_data.get('account_category', '').lower() in ['sales', 'revenue', 'income']:
                invoice_type = "ACCREC"  # Sales invoice
            
            contact = {"Name": invoice_data.get('vendor_name', 'Unknown Vendor')}
            
            if invoice_data.get('vendor_email'):
                contact['EmailAddress'] = invoice_data['vendor_email']
            
            line_items = []
            for item in invoice_data.get('line_items', []):
                line_item = {
                    "Description": item.get('description', 'Item'),
                    "Quantity": item.get('quantity', 1),
                    "UnitAmount": item.get('unit_price', 0),
                    "LineAmount": item.get('amount', 0),
                    "AccountCode": item.get('account_code', '200' if invoice_type == 'ACCREC' else '400')
                }
                line_items.append(line_item)
            
            if not line_items:
                line_items.append({
                    "Description": f"Invoice {invoice_data.get('invoice_number', 'N/A')}",
                    "Quantity": 1,
                    "UnitAmount": invoice_data.get('subtotal', invoice_data.get('total_amount', 0)),
                    "AccountCode": '200' if invoice_type == 'ACCREC' else '400'
                })
            
            xero_invoice = {
                "Type": invoice_type,
                "Contact": contact,
                "LineItems": line_items,
                "InvoiceNumber": invoice_data.get('invoice_number', ''),
                "Reference": invoice_data.get('notes', '')[:255] if invoice_data.get('notes') else None,
                "Status": "DRAFT"
            }
            
            if invoice_data.get('invoice_date'):
                xero_invoice['Date'] = invoice_data['invoice_date']
            
            if invoice_data.get('due_date'):
                xero_invoice['DueDate'] = invoice_data['due_date']
            
            if invoice_data.get('currency'):
                xero_invoice['CurrencyCode'] = invoice_data['currency']
            
            return xero_invoice
        
        except Exception as e:
            logger.error(f"Error transforming to Xero format: {str(e)}")
            return None


class QuickBooksIntegration:
    """QuickBooks Integration - Placeholder for future implementation"""
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        logger.info("QuickBooks integration initialized (not yet implemented)")
    
    def create_invoice(self, invoice_data: Dict) -> Optional[Dict]:
        logger.warning("QuickBooks integration not yet implemented")
        return None


class SageIntegration:
    """Sage Integration - Placeholder for future implementation"""
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        logger.info("Sage integration initialized (not yet implemented)")
    
    def create_invoice(self, invoice_data: Dict) -> Optional[Dict]:
        logger.warning("Sage integration not yet implemented")
        return None
