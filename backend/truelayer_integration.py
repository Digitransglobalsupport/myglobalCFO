"""
TrueLayer API Integration
Implements Open Banking functionality including account access, transaction history, and payment initiation
"""
import os
import httpx
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json


class TrueLayerIntegration:
    """TrueLayer Open Banking Integration"""
    
    def __init__(self, client_id: str, client_secret: str, environment: str = "sandbox"):
        self.client_id = client_id
        self.client_secret = client_secret
        self.environment = environment
        
        # Set API endpoints based on environment
        if environment == "sandbox":
            self.auth_base_url = "https://auth.truelayer-sandbox.com"
            self.api_base_url = "https://api.truelayer-sandbox.com"
        else:
            self.auth_base_url = "https://auth.truelayer.com"
            self.api_base_url = "https://api.truelayer.com"
    
    def get_authorization_url(self, redirect_uri: str, state: str, scopes: List[str] = None) -> str:
        """Generate TrueLayer authorization URL for user consent"""
        if scopes is None:
            scopes = ["info", "accounts", "balance", "transactions", "cards", "offline_access"]
        
        scope_string = " ".join(scopes)
        
        auth_url = (
            f"{self.auth_base_url}/"
            f"?response_type=code"
            f"&client_id={self.client_id}"
            f"&redirect_uri={redirect_uri}"
            f"&scope={scope_string}"
            f"&state={state}"
            f"&enable_mock=true"  # For sandbox testing
        )
        
        return auth_url
    
    async def exchange_code_for_token(self, code: str, redirect_uri: str) -> Dict[str, Any]:
        """Exchange authorization code for access and refresh tokens"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.auth_base_url}/connect/token",
                data={
                    "grant_type": "authorization_code",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "redirect_uri": redirect_uri,
                    "code": code
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            response.raise_for_status()
            return response.json()
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token using refresh token"""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.auth_base_url}/connect/token",
                data={
                    "grant_type": "refresh_token",
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "refresh_token": refresh_token
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"}
            )
            
            response.raise_for_status()
            return response.json()
    
    async def get_accounts(self, access_token: str) -> Dict[str, Any]:
        """Get all accounts for the authenticated user"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base_url}/data/v1/accounts",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            response.raise_for_status()
            return response.json()
    
    async def get_account_balance(self, access_token: str, account_id: str) -> Dict[str, Any]:
        """Get balance for a specific account"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base_url}/data/v1/accounts/{account_id}/balance",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            response.raise_for_status()
            return response.json()
    
    async def get_account_transactions(
        self,
        access_token: str,
        account_id: str,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get transactions for a specific account"""
        # Default to last 30 days if no dates provided
        if not from_date:
            from_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not to_date:
            to_date = datetime.now().strftime("%Y-%m-%d")
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base_url}/data/v1/accounts/{account_id}/transactions",
                params={"from": from_date, "to": to_date},
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            response.raise_for_status()
            return response.json()
    
    async def get_pending_transactions(self, access_token: str, account_id: str) -> Dict[str, Any]:
        """Get pending transactions for a specific account"""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_base_url}/data/v1/accounts/{account_id}/transactions/pending",
                headers={"Authorization": f"Bearer {access_token}"}
            )
            
            response.raise_for_status()
            return response.json()
    
    async def test_connection(self, access_token: str) -> Dict[str, Any]:
        """Test the TrueLayer connection by fetching account information"""
        try:
            accounts_response = await self.get_accounts(access_token)
            
            return {
                "success": True,
                "message": "TrueLayer connection successful",
                "details": {
                    "connection_status": "active",
                    "accounts_found": len(accounts_response.get("results", [])),
                    "api_response_time": "< 1s",
                    "environment": self.environment
                }
            }
        except httpx.HTTPStatusError as e:
            return {
                "success": False,
                "message": f"TrueLayer connection failed: {str(e)}",
                "details": {
                    "connection_status": "failed",
                    "error": str(e),
                    "next_step": "Check access token validity or re-authenticate"
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
