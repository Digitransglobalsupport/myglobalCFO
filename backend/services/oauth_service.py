"""
Generic OAuth 2.0 Service
Handles OAuth flows for multiple platforms
"""

from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import secrets
import logging

logger = logging.getLogger(__name__)


class OAuthConfig:
    """OAuth configuration for different platforms"""
    
    PLATFORMS = {
        'xero': {
            'auth_url': 'https://login.xero.com/identity/connect/authorize',
            'token_url': 'https://identity.xero.com/connect/token',
            'scopes': 'openid profile email accounting.transactions accounting.contacts accounting.settings offline_access',
            'response_type': 'code',
        },
        'quickbooks': {
            'auth_url': 'https://appcenter.intuit.com/connect/oauth2',
            'token_url': 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer',
            'scopes': 'com.intuit.quickbooks.accounting',
            'response_type': 'code',
        },
        'sage': {
            'auth_url': 'https://www.sageone.com/oauth2/auth',
            'token_url': 'https://oauth.accounting.sage.com/token',
            'scopes': 'full_access',
            'response_type': 'code',
        },
        'hubspot': {
            'auth_url': 'https://app.hubspot.com/oauth/authorize',
            'token_url': 'https://api.hubapi.com/oauth/v1/token',
            'scopes': 'crm.objects.contacts.read crm.objects.deals.read',
            'response_type': 'code',
        },
        'salesforce': {
            'auth_url': 'https://login.salesforce.com/services/oauth2/authorize',
            'token_url': 'https://login.salesforce.com/services/oauth2/token',
            'scopes': 'api refresh_token',
            'response_type': 'code',
        }
    }
    
    @classmethod
    def get_config(cls, platform: str) -> Optional[Dict[str, str]]:
        """Get OAuth config for a platform"""
        return cls.PLATFORMS.get(platform.lower())


class OAuthService:
    """OAuth 2.0 service for handling authentication flows"""
    
    def __init__(self, base_url: str):
        """
        Initialize OAuth service
        
        Args:
            base_url: Base URL of the application (for callbacks)
        """
        self.base_url = base_url
        self.states = {}  # In production, use Redis or database
    
    def generate_auth_url(
        self,
        platform: str,
        client_id: str,
        redirect_uri: str,
        state: Optional[str] = None
    ) -> Optional[Dict[str, str]]:
        """
        Generate OAuth authorization URL
        
        Args:
            platform: Platform name (xero, quickbooks, etc.)
            client_id: OAuth client ID
            redirect_uri: Callback URL
            state: Optional state parameter for CSRF protection
            
        Returns:
            Dict with auth_url and state
        """
        config = OAuthConfig.get_config(platform)
        if not config:
            logger.error(f"Unknown platform: {platform}")
            return None
        
        # Generate state if not provided
        if not state:
            state = secrets.token_urlsafe(32)
        
        # Store state for verification (in production, use Redis with expiry)
        self.states[state] = {
            'platform': platform,
            'created_at': datetime.now(timezone.utc),
            'redirect_uri': redirect_uri
        }
        
        # Build authorization URL
        params = {
            'client_id': client_id,
            'redirect_uri': redirect_uri,
            'response_type': config['response_type'],
            'scope': config['scopes'],
            'state': state
        }
        
        # Convert params to query string
        query_string = '&'.join([f"{k}={v}" for k, v in params.items()])
        auth_url = f"{config['auth_url']}?{query_string}"
        
        return {
            'auth_url': auth_url,
            'state': state
        }
    
    def verify_state(self, state: str) -> Optional[Dict[str, Any]]:
        """
        Verify OAuth state parameter
        
        Args:
            state: State parameter from callback
            
        Returns:
            State data if valid, None otherwise
        """
        state_data = self.states.get(state)
        
        if not state_data:
            logger.error(f"Invalid state: {state}")
            return None
        
        # Check if state is expired (15 minutes)
        created_at = state_data['created_at']
        if datetime.now(timezone.utc) - created_at > timedelta(minutes=15):
            logger.error(f"Expired state: {state}")
            del self.states[state]
            return None
        
        # Remove state after use (one-time use)
        del self.states[state]
        
        return state_data
    
    async def exchange_code_for_token(
        self,
        platform: str,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str
    ) -> Optional[Dict[str, Any]]:
        """
        Exchange authorization code for access token
        
        Args:
            platform: Platform name
            code: Authorization code
            client_id: OAuth client ID
            client_secret: OAuth client secret
            redirect_uri: Callback URL
            
        Returns:
            Token response with access_token, refresh_token, expires_in
        """
        config = OAuthConfig.get_config(platform)
        if not config:
            logger.error(f"Unknown platform: {platform}")
            return None
        
        # This is a placeholder - in real implementation, make HTTP request
        # to the platform's token endpoint
        
        # For now, return mock response
        # In production, use httpx or requests to make the actual API call
        logger.info(f"Exchanging code for token on {platform}")
        
        return {
            'access_token': f'mock_access_token_{platform}_{code[:8]}',
            'refresh_token': f'mock_refresh_token_{platform}',
            'expires_in': 3600,
            'token_type': 'Bearer'
        }
    
    async def refresh_access_token(
        self,
        platform: str,
        refresh_token: str,
        client_id: str,
        client_secret: str
    ) -> Optional[Dict[str, Any]]:
        """
        Refresh access token using refresh token
        
        Args:
            platform: Platform name
            refresh_token: Refresh token
            client_id: OAuth client ID
            client_secret: OAuth client secret
            
        Returns:
            New token response
        """
        config = OAuthConfig.get_config(platform)
        if not config:
            logger.error(f"Unknown platform: {platform}")
            return None
        
        # Placeholder - make actual API call in production
        logger.info(f"Refreshing token for {platform}")
        
        return {
            'access_token': f'refreshed_access_token_{platform}',
            'refresh_token': refresh_token,  # Some platforms return new refresh token
            'expires_in': 3600,
            'token_type': 'Bearer'
        }
    
    def get_platform_display_name(self, platform: str) -> str:
        """Get user-friendly display name for platform"""
        display_names = {
            'xero': 'Xero',
            'quickbooks': 'QuickBooks',
            'sage': 'Sage',
            'hubspot': 'HubSpot',
            'salesforce': 'Salesforce'
        }
        return display_names.get(platform.lower(), platform.title())
