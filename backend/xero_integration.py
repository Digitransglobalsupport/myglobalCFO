"""
Xero Integration Module
Handles OAuth2 flow and API calls to Xero Accounting
"""

import httpx
import base64
from typing import Optional, Dict
from datetime import datetime, timezone

class XeroIntegration:
    """Xero OAuth2 and API integration"""
    
    def __init__(self, client_id: str, client_secret: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.auth_url = "https://login.xero.com/identity/connect/authorize"
        self.token_url = "https://identity.xero.com/connect/token"
        self.api_base = "https://api.xero.com/api.xro/2.0"
        self.connections_url = "https://api.xero.com/connections"
        
    def get_authorization_url(self, redirect_uri: str, state: str) -> str:
        """Generate OAuth2 authorization URL"""
        scopes = [
            "offline_access",
            "accounting.transactions",
            "accounting.contacts",
            "accounting.settings",
            "accounting.journals.read"
        ]
        
        params = {
            "response_type": "code",
            "client_id": self.client_id,
            "redirect_uri": redirect_uri,
            "scope": " ".join(scopes),
            "state": state
        }
        
        query_string = "&".join([f"{k}={v}" for k, v in params.items()])
        return f"{self.auth_url}?{query_string}"
    
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict:
        """Exchange authorization code for access token"""
        
        # Create Basic Auth header
        credentials = f"{self.client_id}:{self.client_secret}"
        b64_credentials = base64.b64encode(credentials.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {b64_credentials}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "redirect_uri": redirect_uri
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(self.token_url, headers=headers, data=data)
            response.raise_for_status()
            return response.json()
    
    async def refresh_access_token(self, refresh_token: str) -> Dict:
        """Refresh the access token using refresh token"""
        
        credentials = f"{self.client_id}:{self.client_secret}"
        b64_credentials = base64.b64encode(credentials.encode()).decode()
        
        headers = {
            "Authorization": f"Basic {b64_credentials}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        
        data = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(self.token_url, headers=headers, data=data)
            response.raise_for_status()
            return response.json()
    
    async def get_tenant_id(self, access_token: str) -> str:
        """Get Xero tenant ID (organization ID)"""
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(self.connections_url, headers=headers)
            response.raise_for_status()
            connections = response.json()
            
            if connections and len(connections) > 0:
                return connections[0]["tenantId"]
            else:
                raise Exception("No Xero organizations found")
    
    async def get_invoices(self, access_token: str, tenant_id: str) -> Dict:
        """Get invoices from Xero"""
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Xero-tenant-id": tenant_id,
            "Accept": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.api_base}/Invoices", headers=headers)
            response.raise_for_status()
            return response.json()
    
    async def get_contacts(self, access_token: str, tenant_id: str) -> Dict:
        """Get contacts from Xero"""
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Xero-tenant-id": tenant_id,
            "Accept": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.api_base}/Contacts", headers=headers)
            response.raise_for_status()
            return response.json()
    
    async def create_invoice(self, access_token: str, tenant_id: str, invoice_data: Dict) -> Dict:
        """Create an invoice in Xero"""
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Xero-tenant-id": tenant_id,
            "Accept": "application/json",
            "Content-Type": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_base}/Invoices",
                headers=headers,
                json=invoice_data
            )
            response.raise_for_status()
            return response.json()
    
    async def test_connection(self, access_token: str, tenant_id: str) -> Dict:
        """Test Xero API connection"""
        
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Xero-tenant-id": tenant_id,
            "Accept": "application/json"
        }
        
        async with httpx.AsyncClient() as client:
            # Try to get organisation info
            response = await client.get(f"{self.api_base}/Organisation", headers=headers)
            response.raise_for_status()
            
            org_data = response.json()
            
            return {
                "success": True,
                "organisation": org_data.get("Organisations", [{}])[0],
                "connection_time": datetime.now(timezone.utc).isoformat()
            }
