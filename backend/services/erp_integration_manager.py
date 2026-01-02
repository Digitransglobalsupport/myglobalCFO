"""Unified ERP Integration Manager

Orchestrates all ERP service integrations, manages synchronization schedules,
and provides unified interface for data extraction.
"""

from typing import Dict, List, Optional, Any
from datetime import datetime, timezone, timedelta
import logging
import asyncio
from motor.motor_asyncio import AsyncIOMotorDatabase

from .erp.netsuite_service import NetSuiteService
from .erp.dynamics_finance_service import DynamicsFinanceService
from .erp.dynamics_bc_service import DynamicsBCService
from .erp.sap_service import SAPService
from .erp.workday_service import WorkdayService
from .erp.zoho_service import ZohoService
from .erp.freeagent_service import FreeAgentService
from .erp.freshbooks_service import FreshBooksService
from .erp.clearbooks_service import ClearBooksService
from .erp.crunch_service import CrunchService
from .erp.kashflow_service import KashFlowService

logger = logging.getLogger(__name__)

# Service class mapping
SERVICE_CLASSES = {
    'netsuite': NetSuiteService,
    'dynamics_finance': DynamicsFinanceService,
    'dynamics_bc': DynamicsBCService,
    'sap_s4hana': SAPService,
    'workday': WorkdayService,
    'zoho_books': ZohoService,
    'freeagent': FreeAgentService,
    'freshbooks': FreshBooksService,
    'clearbooks': ClearBooksService,
    'crunch': CrunchService,
    'kashflow': KashFlowService,
}


class ERPIntegrationManager:
    """Manages all ERP integrations and data synchronization"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.active_services: Dict[str, Any] = {}
        
    async def initialize_service(self, platform: str, config: Dict[str, Any]) -> bool:
        """Initialize an ERP service with given configuration"""
        try:
            if platform not in SERVICE_CLASSES:
                logger.error(f"Unknown platform: {platform}")
                return False
            
            service_class = SERVICE_CLASSES[platform]
            service = service_class(self.db, config)
            
            # Authenticate
            if await service.authenticate():
                self.active_services[platform] = service
                logger.info(f"Successfully initialized {platform} service")
                return True
            else:
                logger.error(f"Authentication failed for {platform}")
                return False
                
        except Exception as e:
            logger.error(f"Error initializing {platform} service: {e}")
            return False
    
    async def sync_platform_data(self, platform: str, days_back: int = 30) -> Dict:
        """Synchronize data from a specific platform"""
        if platform not in self.active_services:
            return {'success': False, 'error': 'Service not initialized'}
        
        service = self.active_services[platform]
        start_date = datetime.now(timezone.utc) - timedelta(days=days_back)
        end_date = datetime.now(timezone.utc)
        
        results = {
            'platform': platform,
            'sync_started': datetime.now(timezone.utc).isoformat(),
            'success': True,
            'data': {}
        }
        
        try:
            # Extract financial data
            logger.info(f"Extracting financial data from {platform}...")
            financial_data = await service.get_financial_data(start_date, end_date)
            if financial_data:
                await self.db.financial_data.update_one(
                    {'platform': platform, 'period_end': end_date.isoformat()},
                    {'$set': financial_data},
                    upsert=True
                )
                results['data']['financial'] = financial_data
            
            # Extract invoices
            logger.info(f"Extracting invoices from {platform}...")
            invoices = await service.get_invoices(start_date)
            if invoices:
                for invoice in invoices:
                    await self.db.invoices.update_one(
                        {'platform': platform, 'invoice_id': invoice['invoice_id']},
                        {'$set': invoice},
                        upsert=True
                    )
                results['data']['invoices_count'] = len(invoices)
            
            # Extract expenses
            logger.info(f"Extracting expenses from {platform}...")
            expenses = await service.get_expenses(start_date)
            if expenses:
                for expense in expenses:
                    await self.db.expenses.update_one(
                        {'platform': platform, 'expense_id': expense['expense_id']},
                        {'$set': expense},
                        upsert=True
                    )
                results['data']['expenses_count'] = len(expenses)
            
            # Update sync status
            await service.store_sync_status(
                platform=platform,
                data_type='full',
                status='success',
                records_count=len(invoices) + len(expenses)
            )
            
            results['sync_completed'] = datetime.now(timezone.utc).isoformat()
            logger.info(f"Successfully synced {platform} data")
            
        except Exception as e:
            logger.error(f"Error syncing {platform} data: {e}")
            results['success'] = False
            results['error'] = str(e)
            
            await service.store_sync_status(
                platform=platform,
                data_type='full',
                status='failed',
                error_message=str(e)
            )
        
        return results
    
    async def sync_all_active_platforms(self) -> Dict[str, Any]:
        """Synchronize data from all active platforms"""
        results = {}
        
        for platform in self.active_services.keys():
            logger.info(f"Starting sync for {platform}...")
            results[platform] = await self.sync_platform_data(platform)
        
        return results
    
    async def get_connected_platforms(self) -> List[str]:
        """Get list of connected platforms"""
        return list(self.active_services.keys())
    
    async def get_platform_status(self, platform: str) -> Optional[Dict]:
        """Get sync status for a specific platform"""
        status = await self.db.sync_status.find_one({'platform': platform})
        if status:
            status['_id'] = str(status['_id'])
        return status
    
    async def get_all_platform_statuses(self) -> List[Dict]:
        """Get sync status for all platforms"""
        cursor = self.db.sync_status.find({})
        statuses = await cursor.to_list(length=100)
        for status in statuses:
            status['_id'] = str(status['_id'])
        return statuses
    
    async def get_aggregated_financial_data(self, days_back: int = 30) -> Dict:
        """Get aggregated financial data from all platforms"""
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days_back)
        
        # Get all financial data within date range
        cursor = self.db.financial_data.find({
            'period_end': {'$gte': start_date.isoformat()}
        })
        
        data = await cursor.to_list(length=1000)
        
        # Aggregate across platforms
        total_revenue = sum(d.get('total_revenue', 0) for d in data)
        total_expenses = sum(d.get('total_expenses', 0) for d in data)
        
        return {
            'period_start': start_date.isoformat(),
            'period_end': end_date.isoformat(),
            'total_revenue': total_revenue,
            'total_expenses': total_expenses,
            'net_income': total_revenue - total_expenses,
            'platforms_count': len(data),
            'platforms': [d.get('platform') for d in data]
        }
    
    async def get_recent_invoices(self, limit: int = 50) -> List[Dict]:
        """Get recent invoices from all platforms"""
        cursor = self.db.invoices.find({}).sort('synced_at', -1).limit(limit)
        invoices = await cursor.to_list(length=limit)
        for inv in invoices:
            inv['_id'] = str(inv['_id'])
        return invoices
    
    async def get_recent_expenses(self, limit: int = 50) -> List[Dict]:
        """Get recent expenses from all platforms"""
        cursor = self.db.expenses.find({}).sort('synced_at', -1).limit(limit)
        expenses = await cursor.to_list(length=limit)
        for exp in expenses:
            exp['_id'] = str(exp['_id'])
        return expenses
    
    async def disconnect_platform(self, platform: str) -> bool:
        """Disconnect a platform"""
        if platform in self.active_services:
            service = self.active_services[platform]
            await service.close()
            del self.active_services[platform]
            logger.info(f"Disconnected {platform}")
            return True
        return False
    
    async def close_all(self):
        """Close all active services"""
        for platform, service in self.active_services.items():
            await service.close()
            logger.info(f"Closed {platform} service")
        self.active_services.clear()
