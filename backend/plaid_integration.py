"""
Plaid API Integration
Implements bank account access, transaction history, and payment initiation via Plaid
"""
import os
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import plaid
from plaid.api import plaid_api
from plaid.model.link_token_create_request import LinkTokenCreateRequest
from plaid.model.link_token_create_request_user import LinkTokenCreateRequestUser
from plaid.model.products import Products
from plaid.model.country_code import CountryCode
from plaid.model.item_public_token_exchange_request import ItemPublicTokenExchangeRequest
from plaid.model.accounts_get_request import AccountsGetRequest
from plaid.model.transactions_sync_request import TransactionsSyncRequest
from plaid.model.payment_initiation_recipient_create_request import PaymentInitiationRecipientCreateRequest
from plaid.model.payment_initiation_recipient_create_request_iban import PaymentInitiationRecipientCreateRequestIban
from plaid.model.payment_initiation_payment_create_request import PaymentInitiationPaymentCreateRequest
from plaid.model.payment_amount import PaymentAmount
from plaid.model.payment_amount_currency import PaymentAmountCurrency


class PlaidIntegration:
    """Plaid Financial Data Integration"""
    
    def __init__(self, client_id: str, secret: str, environment: str = "sandbox"):
        self.client_id = client_id
        self.secret = secret
        self.environment = environment
        
        # Set Plaid environment
        if environment == "sandbox":
            self.plaid_env = plaid.Environment.Sandbox
        elif environment == "development":
            self.plaid_env = plaid.Environment.Development
        else:
            self.plaid_env = plaid.Environment.Production
        
        # Configure Plaid client
        configuration = plaid.Configuration(
            host=self.plaid_env,
            api_key={
                'clientId': self.client_id,
                'secret': self.secret,
            }
        )
        
        api_client = plaid.ApiClient(configuration)
        self.client = plaid_api.PlaidApi(api_client)
    
    async def create_link_token(
        self,
        user_id: str,
        client_name: str,
        products: List[str] = None,
        country_codes: List[str] = None,
        webhook_url: Optional[str] = None,
        redirect_uri: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a link token for Plaid Link initialization"""
        if products is None:
            products = ["auth", "transactions"]
        if country_codes is None:
            country_codes = ["US", "GB"]
        
        # Convert string products to Products enum
        product_list = [Products(prod) for prod in products]
        
        # Convert string country codes to CountryCode enum
        country_list = [CountryCode(code) for code in country_codes]
        
        request_data = LinkTokenCreateRequest(
            user=LinkTokenCreateRequestUser(client_user_id=user_id),
            client_name=client_name,
            products=product_list,
            country_codes=country_list,
            language="en"
        )
        
        if webhook_url:
            request_data.webhook = webhook_url
        if redirect_uri:
            request_data.redirect_uri = redirect_uri
        
        try:
            response = self.client.link_token_create(request_data)
            return {
                "link_token": response['link_token'],
                "expiration": response['expiration'],
                "request_id": response['request_id']
            }
        except plaid.ApiException as e:
            return {
                "error": str(e),
                "details": e.body if hasattr(e, 'body') else None
            }
    
    async def exchange_public_token(self, public_token: str) -> Dict[str, Any]:
        """Exchange public token for access token"""
        try:
            request = ItemPublicTokenExchangeRequest(public_token=public_token)
            response = self.client.item_public_token_exchange(request)
            
            return {
                "access_token": response['access_token'],
                "item_id": response['item_id'],
                "request_id": response['request_id']
            }
        except plaid.ApiException as e:
            return {
                "error": str(e),
                "details": e.body if hasattr(e, 'body') else None
            }
    
    async def get_accounts(self, access_token: str) -> Dict[str, Any]:
        """Get all accounts for the authenticated user"""
        try:
            request = AccountsGetRequest(access_token=access_token)
            response = self.client.accounts_get(request)
            
            accounts = []
            for account in response['accounts']:
                accounts.append({
                    "account_id": account['account_id'],
                    "name": account['name'],
                    "type": account['type'],
                    "subtype": account['subtype'],
                    "mask": account.get('mask'),
                    "balance": {
                        "available": account['balances'].get('available'),
                        "current": account['balances'].get('current'),
                        "limit": account['balances'].get('limit'),
                        "currency": account['balances'].get('iso_currency_code')
                    }
                })
            
            return {
                "accounts": accounts,
                "item_id": response['item']['item_id'],
                "request_id": response['request_id']
            }
        except plaid.ApiException as e:
            return {
                "error": str(e),
                "details": e.body if hasattr(e, 'body') else None
            }
    
    async def sync_transactions(
        self,
        access_token: str,
        cursor: Optional[str] = None
    ) -> Dict[str, Any]:
        """Sync transactions using cursor-based pagination"""
        try:
            request = TransactionsSyncRequest(
                access_token=access_token
            )
            
            if cursor:
                request.cursor = cursor
            
            response = self.client.transactions_sync(request)
            
            transactions = []
            for txn in response['added']:
                transactions.append({
                    "transaction_id": txn['transaction_id'],
                    "account_id": txn['account_id'],
                    "amount": txn['amount'],
                    "date": txn['date'],
                    "name": txn['name'],
                    "merchant_name": txn.get('merchant_name'),
                    "category": txn.get('category', []),
                    "pending": txn.get('pending', False),
                    "currency": txn.get('iso_currency_code')
                })
            
            return {
                "added": transactions,
                "modified": response.get('modified', []),
                "removed": response.get('removed', []),
                "next_cursor": response['next_cursor'],
                "has_more": response['has_more'],
                "request_id": response['request_id']
            }
        except plaid.ApiException as e:
            return {
                "error": str(e),
                "details": e.body if hasattr(e, 'body') else None
            }
    
    async def create_payment_recipient(
        self,
        name: str,
        iban: str,
        address: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Create a payment recipient (for payment initiation)"""
        try:
            iban_details = PaymentInitiationRecipientCreateRequestIban(iban=iban)
            
            request = PaymentInitiationRecipientCreateRequest(
                name=name,
                iban=iban_details
            )
            
            if address:
                request.address = address
            
            response = self.client.payment_initiation_recipient_create(request)
            
            return {
                "recipient_id": response['recipient_id'],
                "request_id": response['request_id']
            }
        except plaid.ApiException as e:
            return {
                "error": str(e),
                "details": e.body if hasattr(e, 'body') else None
            }
    
    async def create_payment(
        self,
        recipient_id: str,
        amount: float,
        currency: str = "GBP",
        reference: str = "Payment"
    ) -> Dict[str, Any]:
        """Create a payment"""
        try:
            payment_amount = PaymentAmount(
                currency=PaymentAmountCurrency(currency),
                value=amount
            )
            
            request = PaymentInitiationPaymentCreateRequest(
                recipient_id=recipient_id,
                reference=reference,
                amount=payment_amount
            )
            
            response = self.client.payment_initiation_payment_create(request)
            
            return {
                "payment_id": response['payment_id'],
                "status": response['status'],
                "request_id": response['request_id']
            }
        except plaid.ApiException as e:
            return {
                "error": str(e),
                "details": e.body if hasattr(e, 'body') else None
            }
    
    async def test_connection(self, access_token: str) -> Dict[str, Any]:
        """Test the Plaid connection by fetching account information"""
        try:
            accounts_response = await self.get_accounts(access_token)
            
            if "error" in accounts_response:
                return {
                    "success": False,
                    "message": f"Plaid connection failed: {accounts_response['error']}",
                    "details": {
                        "connection_status": "failed",
                        "error": accounts_response['error'],
                        "next_step": "Check access token validity or re-authenticate"
                    }
                }
            
            return {
                "success": True,
                "message": "Plaid connection successful",
                "details": {
                    "connection_status": "active",
                    "accounts_found": len(accounts_response.get("accounts", [])),
                    "api_response_time": "< 1s",
                    "environment": self.environment
                }
            }
        except Exception as e:
            return {
                "success": False,
                "message": f"Unexpected error: {str(e)}",
                "details": {
                    "connection_status": "error",
                    "error": str(e)
                }
            }
