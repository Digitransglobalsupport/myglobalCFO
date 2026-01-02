"""
FP&A Async Forecast Service
Background task processing for AI forecast generation
"""

import asyncio
import uuid
import json
import logging
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from enum import Enum
import os

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from services.fpa_ai_service import FPAAIService

logger = logging.getLogger(__name__)


class JobStatus(str, Enum):
    """Status of async forecast job"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AsyncForecastManager:
    """
    Manages async forecast job execution and status tracking.
    Uses MongoDB for job persistence and asyncio for background processing.
    """
    
    def __init__(self, db: AsyncIOMotorDatabase, ai_service: FPAAIService):
        self.db = db
        self.ai_service = ai_service
        self._active_tasks: Dict[str, asyncio.Task] = {}
        
    async def submit_forecast_job(
        self,
        version_id: str,
        business_context: str,
        forecast_periods: int,
        user_id: str
    ) -> str:
        """
        Submit a new forecast job for background processing.
        Returns job_id immediately for status polling.
        """
        job_id = str(uuid.uuid4())
        
        # Create job record
        job = {
            "id": job_id,
            "job_type": "baseline_forecast",
            "status": JobStatus.PENDING,
            "progress": 0,
            "progress_message": "Job queued",
            "input": {
                "version_id": version_id,
                "business_context": business_context,
                "forecast_periods": forecast_periods
            },
            "result": None,
            "error": None,
            "created_by": user_id,
            "created_at": datetime.now(timezone.utc),
            "started_at": None,
            "completed_at": None
        }
        
        await self.db.fpa_forecast_jobs.insert_one(job)
        logger.info(f"Created forecast job {job_id} for version {version_id}")
        
        # Start background task
        task = asyncio.create_task(
            self._execute_forecast_job(job_id, version_id, business_context, forecast_periods, user_id)
        )
        self._active_tasks[job_id] = task
        
        return job_id
    
    async def _execute_forecast_job(
        self,
        job_id: str,
        version_id: str,
        business_context: str,
        forecast_periods: int,
        user_id: str
    ):
        """Execute forecast generation in background"""
        try:
            # Update status to processing
            await self._update_job_status(
                job_id, 
                JobStatus.PROCESSING, 
                progress=10,
                progress_message="Loading historical data..."
            )
            await self.db.fpa_forecast_jobs.update_one(
                {"id": job_id},
                {"$set": {"started_at": datetime.now(timezone.utc)}}
            )
            
            # Step 1: Get historical data
            historical_data = await self.db.planning_data.find(
                {"version_id": version_id},
                {"_id": 0}
            ).to_list(None)
            
            if not historical_data:
                await self._fail_job(job_id, "No historical data found for the specified version")
                return
            
            await self._update_job_status(
                job_id,
                JobStatus.PROCESSING,
                progress=20,
                progress_message=f"Found {len(historical_data)} data points. Fetching version details..."
            )
            
            # Step 2: Get version details
            version = await self.db.planning_versions.find_one(
                {"id": version_id},
                {"_id": 0}
            )
            
            if not version:
                await self._fail_job(job_id, "Version not found")
                return
            
            await self._update_job_status(
                job_id,
                JobStatus.PROCESSING,
                progress=30,
                progress_message="Analyzing historical trends with AI..."
            )
            
            # Step 3: Generate AI forecast (this is the long-running operation)
            forecast_result = await self.ai_service.generate_baseline_forecast(
                historical_data=historical_data,
                business_context=business_context,
                forecast_periods=forecast_periods
            )
            
            await self._update_job_status(
                job_id,
                JobStatus.PROCESSING,
                progress=70,
                progress_message="AI analysis complete. Creating forecast version..."
            )
            
            # Step 4: Create new forecast version
            forecast_version_id = str(uuid.uuid4())
            forecast_version = {
                "id": forecast_version_id,
                "name": f"AI Forecast - {version['name']}",
                "version_type": "forecast",
                "fiscal_year": version.get("fiscal_year", 2025),
                "start_period": "2025-01",
                "end_period": "2025-12",
                "is_rolling": False,
                "rolling_months": 12,
                "base_version_id": version_id,
                "is_locked": False,
                "is_ai_generated": True,
                "ai_confidence": forecast_result.get("overall_confidence", 0),
                "async_job_id": job_id,
                "created_by": user_id,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            await self.db.planning_versions.insert_one(forecast_version)
            
            await self._update_job_status(
                job_id,
                JobStatus.PROCESSING,
                progress=85,
                progress_message="Saving forecast data points..."
            )
            
            # Step 5: Store forecast data points
            forecast_data_points = []
            for forecast_point in forecast_result.get("forecast_data", []):
                data_point = {
                    "id": str(uuid.uuid4()),
                    "version_id": forecast_version_id,
                    "entity_id": "default-entity",
                    "department_id": "default-dept",
                    "account_id": "default-account",
                    "time_period": forecast_point.get("period", "2025-01"),
                    "value": forecast_point.get("predicted_value", 0),
                    "ai_confidence_score": forecast_point.get("confidence_score", 0),
                    "ai_reasoning": forecast_point.get("reasoning", ""),
                    "created_by": user_id,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc)
                }
                forecast_data_points.append(data_point)
            
            if forecast_data_points:
                await self.db.planning_data.insert_many(forecast_data_points)
            
            await self._update_job_status(
                job_id,
                JobStatus.PROCESSING,
                progress=95,
                progress_message="Storing AI analysis metadata..."
            )
            
            # Step 6: Store AI analysis metadata
            ai_analysis = {
                "id": str(uuid.uuid4()),
                "version_id": forecast_version_id,
                "analysis_type": "baseline_forecast",
                "model_used": "gpt-5",
                "confidence_score": forecast_result.get("overall_confidence", 0),
                "key_assumptions": forecast_result.get("key_assumptions", []),
                "trends_identified": forecast_result.get("trends_identified", []),
                "risk_factors": forecast_result.get("risk_factors", []),
                "opportunities": forecast_result.get("opportunities", []),
                "async_job_id": job_id,
                "created_by": user_id,
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.db.ai_analyses.insert_one(ai_analysis)
            
            # Step 7: Complete the job
            result = {
                "forecast_version_id": forecast_version_id,
                "forecast_result": forecast_result,
                "data_points_created": len(forecast_data_points),
                "analysis_id": ai_analysis["id"]
            }
            
            await self._complete_job(job_id, result)
            logger.info(f"Forecast job {job_id} completed successfully")
            
        except Exception as e:
            logger.error(f"Forecast job {job_id} failed: {e}")
            await self._fail_job(job_id, str(e))
        finally:
            # Clean up active task reference
            self._active_tasks.pop(job_id, None)
    
    async def _update_job_status(
        self,
        job_id: str,
        status: JobStatus,
        progress: int = None,
        progress_message: str = None
    ):
        """Update job status in database"""
        update = {"status": status}
        if progress is not None:
            update["progress"] = progress
        if progress_message is not None:
            update["progress_message"] = progress_message
        
        await self.db.fpa_forecast_jobs.update_one(
            {"id": job_id},
            {"$set": update}
        )
    
    async def _complete_job(self, job_id: str, result: Dict):
        """Mark job as completed with result"""
        await self.db.fpa_forecast_jobs.update_one(
            {"id": job_id},
            {
                "$set": {
                    "status": JobStatus.COMPLETED,
                    "progress": 100,
                    "progress_message": "Forecast generation complete!",
                    "result": result,
                    "completed_at": datetime.now(timezone.utc)
                }
            }
        )
    
    async def _fail_job(self, job_id: str, error: str):
        """Mark job as failed with error message"""
        await self.db.fpa_forecast_jobs.update_one(
            {"id": job_id},
            {
                "$set": {
                    "status": JobStatus.FAILED,
                    "progress_message": f"Job failed: {error}",
                    "error": error,
                    "completed_at": datetime.now(timezone.utc)
                }
            }
        )
    
    async def get_job_status(self, job_id: str) -> Optional[Dict]:
        """Get current job status"""
        job = await self.db.fpa_forecast_jobs.find_one(
            {"id": job_id},
            {"_id": 0}
        )
        if job:
            # Convert datetime objects to ISO strings for JSON serialization
            for key in ["created_at", "started_at", "completed_at"]:
                if job.get(key) and isinstance(job[key], datetime):
                    job[key] = job[key].isoformat()
        return job
    
    async def get_job_result(self, job_id: str) -> Optional[Dict]:
        """Get job result if completed"""
        job = await self.get_job_status(job_id)
        if not job:
            return None
        
        if job["status"] != JobStatus.COMPLETED:
            return {
                "job_id": job_id,
                "status": job["status"],
                "progress": job.get("progress", 0),
                "progress_message": job.get("progress_message"),
                "error": job.get("error"),
                "result": None
            }
        
        return {
            "job_id": job_id,
            "status": job["status"],
            "progress": 100,
            "progress_message": "Complete",
            "result": job.get("result")
        }
    
    async def cancel_job(self, job_id: str, user_id: str) -> bool:
        """Cancel a pending or processing job"""
        job = await self.get_job_status(job_id)
        if not job:
            return False
        
        # Only allow cancellation by the job creator
        if job.get("created_by") != user_id:
            return False
        
        # Only cancel pending or processing jobs
        if job["status"] not in [JobStatus.PENDING, JobStatus.PROCESSING]:
            return False
        
        # Cancel the asyncio task if running
        if job_id in self._active_tasks:
            self._active_tasks[job_id].cancel()
            self._active_tasks.pop(job_id, None)
        
        # Update job status
        await self.db.fpa_forecast_jobs.update_one(
            {"id": job_id},
            {
                "$set": {
                    "status": JobStatus.CANCELLED,
                    "progress_message": "Job cancelled by user",
                    "completed_at": datetime.now(timezone.utc)
                }
            }
        )
        
        return True
    
    async def get_user_jobs(
        self,
        user_id: str,
        status: Optional[JobStatus] = None,
        limit: int = 20
    ) -> List[Dict]:
        """Get jobs for a specific user"""
        query = {"created_by": user_id}
        if status:
            query["status"] = status
        
        jobs = await self.db.fpa_forecast_jobs.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        # Convert datetime objects
        for job in jobs:
            for key in ["created_at", "started_at", "completed_at"]:
                if job.get(key) and isinstance(job[key], datetime):
                    job[key] = job[key].isoformat()
        
        return jobs
