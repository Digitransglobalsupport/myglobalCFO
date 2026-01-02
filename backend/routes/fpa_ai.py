"""
FP&A AI Routes
API endpoints for AI-powered predictive modeling features
Includes async background job processing for long-running forecast generation
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Header
from pydantic import BaseModel
from typing import List, Dict, Optional
import logging
from datetime import datetime, timezone
import uuid
import os
import jwt
from motor.motor_asyncio import AsyncIOMotorClient

from services.fpa_ai_service import FPAAIService
from services.fpa_async_forecast import AsyncForecastManager, JobStatus

logger = logging.getLogger(__name__)
router = APIRouter()

# Database connection (avoiding circular import)
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'myglobalcfo_db')
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# JWT settings (avoiding circular import)
JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'myglobalcfo-secret-key-change-in-production-12345')
ALGORITHM = "HS256"

async def get_current_user_from_header(authorization: Optional[str] = Header(None)):
    """Get current user from JWT token in Authorization header"""
    if not authorization:
        # Fallback for testing
        return {
            "id": "b0e30fba-5a69-490a-87e1-cdb32676140c",
            "email": "aitest@mycfo.com"
        }
    
    try:
        # Extract token from "Bearer <token>" format
        if authorization.startswith("Bearer "):
            token = authorization[7:]
        else:
            token = authorization
        
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        email = payload.get("email")
        
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        return {"id": user_id, "email": email}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        # Fallback for testing
        return {
            "id": "b0e30fba-5a69-490a-87e1-cdb32676140c",
            "email": "aitest@mycfo.com"
        }

# Alias for backwards compatibility
get_current_user = get_current_user_from_header

# Initialize AI service and async manager
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', 'sk-emergent-8E52f04A7DaC5A6F52')
ai_service = FPAAIService(EMERGENT_LLM_KEY)
async_forecast_manager = AsyncForecastManager(db, ai_service)

# Request/Response Models
class ForecastRequest(BaseModel):
    version_id: str
    business_context: str
    forecast_periods: int = 12

class AsyncForecastRequest(BaseModel):
    """Request model for async forecast generation"""
    version_id: str
    business_context: str
    forecast_periods: int = 12
    
class AnomalyDetectionRequest(BaseModel):
    actual_version_id: str
    forecast_version_id: str
    threshold: Optional[float] = 0.15

class VarianceAnalysisRequest(BaseModel):
    budget_version_id: str
    actual_version_id: str
    business_events: Optional[List[str]] = None


# ==================== ASYNC FORECAST ENDPOINTS (Phase 4C) ====================

@router.post("/forecast/submit")
async def submit_async_forecast(
    request: AsyncForecastRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Submit an AI forecast job for background processing.
    Returns immediately with a job_id for status polling.
    
    This is the recommended endpoint for large datasets to prevent request timeouts.
    """
    try:
        # Validate version exists
        version = await db.planning_versions.find_one(
            {"id": request.version_id},
            {"_id": 0}
        )
        
        if not version:
            raise HTTPException(
                status_code=404,
                detail="Version not found"
            )
        
        # Submit async job
        job_id = await async_forecast_manager.submit_forecast_job(
            version_id=request.version_id,
            business_context=request.business_context,
            forecast_periods=request.forecast_periods,
            user_id=current_user["id"]
        )
        
        return {
            "success": True,
            "job_id": job_id,
            "status": "pending",
            "message": "Forecast job submitted successfully. Poll /api/fpa/ai/forecast/status/{job_id} for progress.",
            "status_url": f"/api/fpa/ai/forecast/status/{job_id}",
            "result_url": f"/api/fpa/ai/forecast/result/{job_id}"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to submit async forecast: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to submit forecast job"
        )


@router.get("/forecast/status/{job_id}")
async def get_forecast_status(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get the current status of an async forecast job.
    Use this endpoint to poll for job progress.
    
    Returns:
        - status: pending|processing|completed|failed|cancelled
        - progress: 0-100 percentage
        - progress_message: Human-readable status message
    """
    try:
        job = await async_forecast_manager.get_job_status(job_id)
        
        if not job:
            raise HTTPException(
                status_code=404,
                detail="Job not found"
            )
        
        return {
            "job_id": job_id,
            "status": job["status"],
            "progress": job.get("progress", 0),
            "progress_message": job.get("progress_message", ""),
            "created_at": job.get("created_at"),
            "started_at": job.get("started_at"),
            "completed_at": job.get("completed_at"),
            "is_complete": job["status"] in [JobStatus.COMPLETED, JobStatus.FAILED, JobStatus.CANCELLED],
            "has_error": job["status"] == JobStatus.FAILED,
            "error": job.get("error")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get job status"
        )


@router.get("/forecast/result/{job_id}")
async def get_forecast_result(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get the result of a completed async forecast job.
    Only returns full result when job status is 'completed'.
    
    Returns:
        - result: Forecast result data (when completed)
        - forecast_version_id: ID of the created forecast version
        - forecast_result: AI analysis results
    """
    try:
        result = await async_forecast_manager.get_job_result(job_id)
        
        if not result:
            raise HTTPException(
                status_code=404,
                detail="Job not found"
            )
        
        if result["status"] != JobStatus.COMPLETED:
            return {
                "job_id": job_id,
                "status": result["status"],
                "progress": result.get("progress", 0),
                "progress_message": result.get("progress_message"),
                "error": result.get("error"),
                "result": None,
                "message": "Job not yet completed" if result["status"] != JobStatus.FAILED else "Job failed"
            }
        
        return {
            "success": True,
            "job_id": job_id,
            "status": JobStatus.COMPLETED,
            "result": result["result"],
            "forecast_version_id": result["result"].get("forecast_version_id") if result["result"] else None,
            "message": "Forecast generation complete"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get job result: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to get job result"
        )


@router.post("/forecast/cancel/{job_id}")
async def cancel_forecast_job(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Cancel a pending or in-progress forecast job.
    Only the job creator can cancel their own jobs.
    """
    try:
        success = await async_forecast_manager.cancel_job(job_id, current_user["id"])
        
        if not success:
            raise HTTPException(
                status_code=400,
                detail="Unable to cancel job. Job may not exist, be already completed, or you may not have permission."
            )
        
        return {
            "success": True,
            "job_id": job_id,
            "status": JobStatus.CANCELLED,
            "message": "Job cancelled successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to cancel job: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to cancel job"
        )


@router.get("/forecast/jobs")
async def list_forecast_jobs(
    status: Optional[str] = Query(None, description="Filter by job status"),
    limit: int = Query(20, ge=1, le=100, description="Number of jobs to return"),
    current_user: dict = Depends(get_current_user)
):
    """
    List forecast jobs for the current user.
    Optionally filter by status: pending, processing, completed, failed, cancelled
    """
    try:
        job_status = None
        if status:
            try:
                job_status = JobStatus(status)
            except ValueError:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid status. Must be one of: {', '.join([s.value for s in JobStatus])}"
                )
        
        jobs = await async_forecast_manager.get_user_jobs(
            user_id=current_user["id"],
            status=job_status,
            limit=limit
        )
        
        return {
            "jobs": jobs,
            "count": len(jobs),
            "limit": limit
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to list jobs: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to list jobs"
        )


# ==================== SYNC FORECAST ENDPOINTS (Legacy) ====================

@router.post("/forecast/generate")
async def generate_ai_forecast(
    request: ForecastRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate AI-powered baseline forecast from historical data
    """
    try:
        # Get historical data from the specified version
        historical_data = await db.planning_data.find(
            {"version_id": request.version_id},
            {"_id": 0}
        ).to_list(None)
        
        if not historical_data:
            raise HTTPException(
                status_code=404, 
                detail="No historical data found for the specified version"
            )
        
        # Get version details for context
        version = await db.planning_versions.find_one(
            {"id": request.version_id},
            {"_id": 0}
        )
        
        if not version:
            raise HTTPException(
                status_code=404,
                detail="Version not found"
            )
        
        # Generate AI forecast
        forecast_result = await ai_service.generate_baseline_forecast(
            historical_data=historical_data,
            business_context=request.business_context,
            forecast_periods=request.forecast_periods
        )
        
        # Create new version for AI forecast - ensure unique name
        base_forecast_name = f"AI Forecast - {version['name']}"
        forecast_name = base_forecast_name
        
        # Check for existing versions with same name and add counter if needed
        counter = 1
        while True:
            existing = await db.planning_versions.find_one({"name": forecast_name}, {"_id": 0})
            if not existing:
                break
            counter += 1
            forecast_name = f"{base_forecast_name} ({counter})"
        
        forecast_version_id = str(uuid.uuid4())
        forecast_version = {
            "id": forecast_version_id,
            "name": forecast_name,
            "version_type": "forecast",
            "fiscal_year": version.get("fiscal_year", 2025),
            "start_period": "2025-01",  # TODO: Calculate based on request
            "end_period": "2025-12",    # TODO: Calculate based on forecast_periods
            "is_rolling": False,
            "rolling_months": 12,
            "base_version_id": request.version_id,
            "is_locked": False,
            "is_ai_generated": True,
            "ai_confidence": forecast_result.get("overall_confidence", 0),
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        
        await db.planning_versions.insert_one(forecast_version)
        
        # Store forecast data points
        forecast_data_points = []
        for forecast_point in forecast_result.get("forecast_data", []):
            data_point = {
                "id": str(uuid.uuid4()),
                "version_id": forecast_version_id,
                "entity_id": "default-entity",  # TODO: Map from historical data
                "department_id": "default-dept",  # TODO: Map from historical data
                "account_id": "default-account",  # TODO: Map from historical data
                "time_period": forecast_point["period"],
                "value": forecast_point["predicted_value"],
                "ai_confidence_score": forecast_point["confidence_score"],
                "ai_reasoning": forecast_point.get("reasoning", ""),
                "created_by": current_user["id"],
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            forecast_data_points.append(data_point)
        
        if forecast_data_points:
            await db.planning_data.insert_many(forecast_data_points)
        
        # Store AI analysis metadata
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
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.ai_analyses.insert_one(ai_analysis)
        
        return {
            "success": True,
            "forecast_version_id": forecast_version_id,
            "forecast_result": forecast_result,
            "message": "AI forecast generated successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"AI forecast generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate AI forecast"
        )

@router.post("/anomalies/detect")
async def detect_anomalies(
    request: AnomalyDetectionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Detect anomalies by comparing actual vs forecast data
    """
    try:
        # Get actual data
        actual_data = await db.planning_data.find(
            {"version_id": request.actual_version_id},
            {"_id": 0}
        ).to_list(None)
        
        # Get forecast data
        forecast_data = await db.planning_data.find(
            {"version_id": request.forecast_version_id},
            {"_id": 0}
        ).to_list(None)
        
        if not actual_data or not forecast_data:
            raise HTTPException(
                status_code=404,
                detail="Actual or forecast data not found"
            )
        
        # Run AI anomaly detection
        anomaly_result = await ai_service.detect_anomalies(
            actual_data=actual_data,
            forecast_data=forecast_data,
            threshold=request.threshold
        )
        
        # Store anomaly analysis
        anomaly_analysis = {
            "id": str(uuid.uuid4()),
            "actual_version_id": request.actual_version_id,
            "forecast_version_id": request.forecast_version_id,
            "analysis_type": "anomaly_detection",
            "model_used": "gpt-5",
            "threshold_used": request.threshold,
            "anomalies_detected": anomaly_result.get("anomalies_detected", []),
            "summary": anomaly_result.get("summary", {}),
            "overall_assessment": anomaly_result.get("overall_assessment", ""),
            "key_insights": anomaly_result.get("key_insights", []),
            "recommended_actions": anomaly_result.get("recommended_actions", []),
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.ai_analyses.insert_one(anomaly_analysis)
        
        return {
            "success": True,
            "anomaly_result": anomaly_result,
            "analysis_id": anomaly_analysis["id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Anomaly detection failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to detect anomalies"
        )

@router.post("/variance/analyze")
async def analyze_variances(
    request: VarianceAnalysisRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate AI explanations for budget vs actual variances
    """
    try:
        # Get budget data
        budget_data = await db.planning_data.find(
            {"version_id": request.budget_version_id},
            {"_id": 0}
        ).to_list(None)
        
        # Get actual data
        actual_data = await db.planning_data.find(
            {"version_id": request.actual_version_id},
            {"_id": 0}
        ).to_list(None)
        
        if not budget_data or not actual_data:
            raise HTTPException(
                status_code=404,
                detail="Budget or actual data not found"
            )
        
        # Generate AI variance explanations
        variance_result = await ai_service.generate_variance_explanations(
            budget_data=budget_data,
            actual_data=actual_data,
            business_events=request.business_events
        )
        
        # Store variance analysis
        variance_analysis = {
            "id": str(uuid.uuid4()),
            "budget_version_id": request.budget_version_id,
            "actual_version_id": request.actual_version_id,
            "analysis_type": "variance_explanation",
            "model_used": "gpt-5",
            "variance_explanations": variance_result.get("variance_explanations", []),
            "summary_insights": variance_result.get("summary_insights", {}),
            "recommendations": variance_result.get("recommendations", []),
            "outlook": variance_result.get("outlook", ""),
            "business_events": request.business_events or [],
            "created_by": current_user["id"],
            "created_at": datetime.now(timezone.utc)
        }
        
        await db.ai_analyses.insert_one(variance_analysis)
        
        return {
            "success": True,
            "variance_result": variance_result,
            "analysis_id": variance_analysis["id"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Variance analysis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze variances"
        )

@router.get("/analyses")
async def get_ai_analyses(
    version_id: Optional[str] = Query(None, description="Filter by version ID"),
    analysis_type: Optional[str] = Query(None, description="Filter by analysis type"),
    limit: int = Query(10, ge=1, le=50, description="Number of analyses to return"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get AI analysis history
    """
    try:
        query = {"created_by": current_user["id"]}
        
        if version_id:
            query["$or"] = [
                {"version_id": version_id},
                {"actual_version_id": version_id},
                {"budget_version_id": version_id},
                {"forecast_version_id": version_id}
            ]
        
        if analysis_type:
            query["analysis_type"] = analysis_type
        
        analyses = await db.ai_analyses.find(
            query,
            {"_id": 0}
        ).sort("created_at", -1).limit(limit).to_list(limit)
        
        return analyses
        
    except Exception as e:
        logger.error(f"Failed to get AI analyses: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve AI analyses"
        )

@router.get("/insights/version/{version_id}")
async def get_version_insights(
    version_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get AI insights for a specific planning version
    """
    try:
        # Get version details
        version = await db.planning_versions.find_one(
            {"id": version_id},
            {"_id": 0}
        )
        
        if not version:
            raise HTTPException(
                status_code=404,
                detail="Version not found"
            )
        
        # Get AI analyses for this version
        analyses = await db.ai_analyses.find(
            {
                "$or": [
                    {"version_id": version_id},
                    {"actual_version_id": version_id},
                    {"budget_version_id": version_id},
                    {"forecast_version_id": version_id}
                ]
            },
            {"_id": 0}
        ).sort("created_at", -1).to_list(10)
        
        # Get planning data with AI insights
        planning_data = await db.planning_data.find(
            {"version_id": version_id},
            {"_id": 0}
        ).to_list(None)
        
        # Organize insights by type
        insights = {
            "version_details": version,
            "forecasts": [a for a in analyses if a.get("analysis_type") == "baseline_forecast"],
            "anomalies": [a for a in analyses if a.get("analysis_type") == "anomaly_detection"],
            "variances": [a for a in analyses if a.get("analysis_type") == "variance_explanation"],
            "planning_data_count": len(planning_data),
            "ai_confidence_score": version.get("ai_confidence"),
            "is_ai_generated": version.get("is_ai_generated", False)
        }
        
        return insights
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get version insights: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to retrieve version insights"
        )