"""ERP Data Synchronization Scheduler

Manages scheduled data synchronization tasks using APScheduler.
"""

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from datetime import datetime, timezone
import logging
from typing import Optional

logger = logging.getLogger(__name__)


class ERPSyncScheduler:
    """Manages scheduled synchronization tasks for ERP integrations"""
    
    def __init__(self, erp_manager):
        self.erp_manager = erp_manager
        self.scheduler: Optional[AsyncIOScheduler] = None
        self.is_running = False
        
    def start(self):
        """Start the scheduler"""
        if self.scheduler is not None:
            logger.warning("Scheduler is already running")
            return
        
        self.scheduler = AsyncIOScheduler()
        
        # Schedule synchronization every 15 minutes
        self.scheduler.add_job(
            self._sync_all_platforms,
            trigger=IntervalTrigger(minutes=15),
            id='erp_sync_all',
            name='Sync all ERP platforms',
            replace_existing=True
        )
        
        self.scheduler.start()
        self.is_running = True
        logger.info("ERP sync scheduler started - syncing every 15 minutes")
    
    async def _sync_all_platforms(self):
        """Internal method to sync all platforms"""
        try:
            logger.info(f"Starting scheduled sync at {datetime.now(timezone.utc)}")
            results = await self.erp_manager.sync_all_active_platforms()
            
            success_count = sum(1 for r in results.values() if r.get('success'))
            total_count = len(results)
            
            logger.info(f"Scheduled sync completed: {success_count}/{total_count} platforms successful")
            
        except Exception as e:
            logger.error(f"Error in scheduled sync: {e}")
    
    async def trigger_immediate_sync(self):
        """Trigger an immediate synchronization outside the schedule"""
        logger.info("Triggering immediate sync...")
        await self._sync_all_platforms()
    
    def stop(self):
        """Stop the scheduler"""
        if self.scheduler:
            self.scheduler.shutdown()
            self.scheduler = None
            self.is_running = False
            logger.info("ERP sync scheduler stopped")
    
    def get_status(self) -> dict:
        """Get scheduler status"""
        if not self.scheduler:
            return {'running': False}
        
        jobs = self.scheduler.get_jobs()
        return {
            'running': self.is_running,
            'jobs_count': len(jobs),
            'jobs': [
                {
                    'id': job.id,
                    'name': job.name,
                    'next_run': job.next_run_time.isoformat() if job.next_run_time else None
                }
                for job in jobs
            ]
        }
