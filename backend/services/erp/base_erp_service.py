"""Base ERP Service Class

Provides common functionality for all ERP integration services.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import httpx
import asyncio
import logging
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class BaseERPService(ABC):
    """Abstract base class for ERP integration services"""
    
    def __init__(self, db: AsyncIOMotorDatabase, config: Dict[str, Any]):
        self.db = db
        self.config = config
        self.client = httpx.AsyncClient(timeout=30.0)
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.token_expiry: Optional[datetime] = None
        
    @abstractmethod
    async def authenticate(self) -> bool:
        """Authenticate with the ERP system"""
        pass
    
    @abstractmethod
    async def refresh_access_token(self) -> bool:
        """Refresh the access token"""
        pass
    
    @abstractmethod
    async def get_financial_data(self, start_date: datetime, end_date: datetime) -> Dict:
        """Extract financial data for date range"""
        pass
    
    @abstractmethod
    async def get_invoices(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get invoices from the ERP system"""
        pass
    
    @abstractmethod
    async def get_expenses(self, start_date: Optional[datetime] = None) -> List[Dict]:
        """Get expenses from the ERP system"""
        pass
    
    async def ensure_valid_token(self) -> bool:
        """Ensure we have a valid access token"""
        if not self.access_token or not self.token_expiry:
            return await self.authenticate()
        
        # Refresh if expiring within 5 minutes
        if datetime.now(timezone.utc) >= self.token_expiry - timedelta(minutes=5):
            return await self.refresh_access_token()
        
        return True
    
    async def make_request(
        self,
        method: str,
        url: str,
        **kwargs
    ) -> Optional[Dict]:
        """Make an authenticated HTTP request with retry logic"""
        max_retries = 3
        retry_delay = 1
        
        for attempt in range(max_retries):
            try:
                if not await self.ensure_valid_token():
                    logger.error("Failed to obtain valid token")
                    return None
                
                headers = kwargs.get('headers', {})
                headers['Authorization'] = f'Bearer {self.access_token}'
                kwargs['headers'] = headers
                
                response = await self.client.request(method, url, **kwargs)
                
                if response.status_code == 401:
                    # Token invalid, try to refresh
                    if await self.refresh_access_token():
                        continue
                    return None
                
                if response.status_code == 429:
                    # Rate limited
                    retry_after = int(response.headers.get('Retry-After', retry_delay * 2))
                    logger.warning(f"Rate limited. Waiting {retry_after} seconds...")
                    await asyncio.sleep(retry_after)
                    continue
                
                response.raise_for_status()
                return response.json()
                
            except httpx.HTTPError as e:
                logger.error(f"HTTP error on attempt {attempt + 1}: {e}")
                if attempt < max_retries - 1:
                    await asyncio.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    return None
        
        return None
    
    async def store_sync_status(
        self,
        platform: str,
        data_type: str,
        status: str,
        records_count: int = 0,
        error_message: Optional[str] = None
    ):
        """Store synchronization status in database"""
        await self.db.sync_status.update_one(
            {
                'platform': platform,
                'data_type': data_type
            },
            {
                '$set': {
                    'status': status,
                    'records_count': records_count,
                    'last_sync': datetime.now(timezone.utc),
                    'error_message': error_message,
                    'updated_at': datetime.now(timezone.utc)
                }
            },
            upsert=True
        )
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
