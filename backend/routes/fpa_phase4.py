"""
FP&A Phase 4 Routes: Rolling Forecasts & Scenario Planning
"""

from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from pydantic import BaseModel
import logging

from services.fpa_rolling_forecast import RollingForecastService
from services.fpa_scenario_planning import ScenarioPlanningService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fpa/phase4", tags=["FP&A Phase 4"])


# ==================== REQUEST MODELS ====================

class CloneVersionRequest(BaseModel):
    base_version_id: str
    new_name: str
    scenario_description: Optional[str] = None


class CompareVersionsRequest(BaseModel):
    version_a_id: str
    version_b_id: str
    entity_ids: Optional[List[str]] = None
    department_ids: Optional[List[str]] = None
    account_ids: Optional[List[str]] = None


class ScenarioAdjustment(BaseModel):
    type: str  # "percentage" or "absolute"
    account_ids: List[str]
    value: float
    periods: Optional[List[str]] = None


class ApplyAdjustmentsRequest(BaseModel):
    version_id: str
    adjustments: List[ScenarioAdjustment]


class InteractiveAdjustmentsRequest(BaseModel):
    scenario_id: str
    adjustments: dict  # revenue_growth, cost_of_sales_pct, opex_change, headcount_change, custom_drivers


class RestoreVersionRequest(BaseModel):
    history_id: str
    restore_mode: str  # "create_new" or "overwrite"
    new_name: Optional[str] = None  # Required if restore_mode is "create_new"


class HistorySettingsRequest(BaseModel):
    scenario_id: str
    retention_days: int  # Max 1095 (3 years)


class UpdateScenarioRequest(BaseModel):
    name: str
    scenario_description: Optional[str] = None


# ==================== ROUTER FACTORY ====================

def get_phase4_router(db: AsyncIOMotorDatabase, get_current_user):
    """Create Phase 4 router with dependencies"""
    
    rolling_service = RollingForecastService(db)
    scenario_service = ScenarioPlanningService(db)
    
    # ==================== ROLLING FORECAST ROUTES ====================
    
    @router.post("/rolling-forecast/{version_id}/roll-forward")
    async def roll_forecast_forward(
        version_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Manually trigger rolling forecast forward by one month
        """
        try:
            result = await rolling_service.roll_forecast_forward(
                version_id=version_id,
                user_id=current_user["id"]
            )
            
            if not result.get("success"):
                raise HTTPException(
                    status_code=400,
                    detail=result.get("error", "Failed to roll forecast")
                )
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error rolling forecast: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/rolling-forecast/auto-roll-all")
    async def auto_roll_all_forecasts(
        current_user: dict = Depends(get_current_user)
    ):
        """
        Automatically roll all active rolling forecasts
        (This endpoint can be called by a scheduled job)
        """
        try:
            result = await rolling_service.auto_roll_all_forecasts(
                user_id=current_user["id"]
            )
            return result
            
        except Exception as e:
            logger.error(f"Error auto-rolling forecasts: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== SCENARIO PLANNING ROUTES ====================
    
    @router.post("/scenario/clone")
    async def clone_version_for_scenario(
        request: CloneVersionRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Clone a version to create a new scenario for what-if analysis
        """
        try:
            result = await scenario_service.clone_version(
                base_version_id=request.base_version_id,
                new_name=request.new_name,
                user_id=current_user["id"],
                scenario_description=request.scenario_description
            )
            
            if not result.get("success"):
                raise HTTPException(
                    status_code=400,
                    detail=result.get("error", "Failed to clone version")
                )
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error cloning version: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/scenario/compare")
    async def compare_versions(
        request: CompareVersionsRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Compare two versions side-by-side for scenario analysis
        """
        try:
            result = await scenario_service.compare_versions(
                version_a_id=request.version_a_id,
                version_b_id=request.version_b_id,
                entity_ids=request.entity_ids,
                department_ids=request.department_ids,
                account_ids=request.account_ids
            )
            
            if not result.get("success"):
                raise HTTPException(
                    status_code=400,
                    detail=result.get("error", "Failed to compare versions")
                )
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error comparing versions: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/scenario/apply-adjustments")
    async def apply_scenario_adjustments(
        request: ApplyAdjustmentsRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Apply bulk adjustments to a scenario version
        """
        try:
            # Convert Pydantic models to dicts
            adjustments = [adj.model_dump() for adj in request.adjustments]
            
            result = await scenario_service.apply_scenario_adjustments(
                version_id=request.version_id,
                adjustments=adjustments,
                user_id=current_user["id"]
            )
            
            if not result.get("success"):
                raise HTTPException(
                    status_code=400,
                    detail=result.get("error", "Failed to apply adjustments")
                )
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error applying adjustments: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/scenario/adjust")
    async def apply_interactive_adjustments(
        request: InteractiveAdjustmentsRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Apply interactive slider-based adjustments to a scenario
        """
        try:
            result = await scenario_service.apply_interactive_adjustments(
                scenario_id=request.scenario_id,
                adjustments=request.adjustments,
                user_id=current_user["id"]
            )
            
            if not result.get("success"):
                raise HTTPException(
                    status_code=400,
                    detail=result.get("error", "Failed to apply interactive adjustments")
                )
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error applying interactive adjustments: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/scenario/{scenario_id}/history")
    async def get_scenario_history(
        scenario_id: str,
        detail_level: str = "detailed",  # "high_level", "detailed", "full_audit"
        current_user: dict = Depends(get_current_user)
    ):
        """
        Get version history for a scenario
        """
        try:
            history = await scenario_service.get_scenario_history(
                scenario_id=scenario_id,
                detail_level=detail_level
            )
            return history
            
        except Exception as e:
            logger.error(f"Error getting scenario history: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/scenario/{scenario_id}/restore")
    async def restore_scenario_version(
        scenario_id: str,
        request: RestoreVersionRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Restore a scenario to a previous version
        """
        try:
            result = await scenario_service.restore_from_history(
                scenario_id=scenario_id,
                history_id=request.history_id,
                restore_mode=request.restore_mode,
                new_name=request.new_name,
                user_id=current_user["id"]
            )
            
            if not result.get("success"):
                raise HTTPException(
                    status_code=400,
                    detail=result.get("error", "Failed to restore version")
                )
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error restoring scenario version: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.put("/history/settings")
    async def update_history_settings(
        request: HistorySettingsRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Update history retention settings
        """
        try:
            # Validate max 3 years
            if request.retention_days > 1095:
                raise HTTPException(
                    status_code=400,
                    detail="Maximum retention period is 3 years (1095 days)"
                )
            
            result = await scenario_service.update_history_settings(
                scenario_id=request.scenario_id,
                retention_days=request.retention_days,
                user_id=current_user["id"]
            )
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating history settings: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/scenario/{version_id}/base-version")
    async def get_base_version(
        version_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Get the base version for a scenario
        """
        try:
            version = await db.planning_versions.find_one(
                {"id": version_id},
                {"_id": 0}
            )
            
            if not version:
                raise HTTPException(status_code=404, detail="Version not found")
            
            base_version_id = version.get("base_version_id")
            if not base_version_id:
                return {"has_base": False, "message": "This is not a scenario version"}
            
            base_version = await db.planning_versions.find_one(
                {"id": base_version_id},
                {"_id": 0}
            )
            
            if not base_version:
                return {"has_base": False, "message": "Base version not found"}
            
            return {
                "has_base": True,
                "base_version": base_version
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting base version: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.delete("/scenario/{scenario_id}")
    async def delete_scenario(
        scenario_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Delete a scenario and all its associated data
        """
        try:
            result = await scenario_service.delete_scenario(
                scenario_id=scenario_id,
                user_id=current_user["id"]
            )
            
            if not result.get("success"):
                raise HTTPException(
                    status_code=400,
                    detail=result.get("error", "Failed to delete scenario")
                )
            
            return result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting scenario: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.put("/scenario/{scenario_id}")
    async def update_scenario(
        scenario_id: str,
        request: UpdateScenarioRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """
        Update a scenario's name and description
        """
        try:
            # Get scenario to verify it exists and is a scenario type
            scenario = await db.planning_versions.find_one(
                {"id": scenario_id},
                {"_id": 0}
            )
            
            if not scenario:
                raise HTTPException(status_code=404, detail="Scenario not found")
            
            if scenario.get("version_type") != "scenario":
                raise HTTPException(
                    status_code=400,
                    detail="Only scenario versions can be edited through this method"
                )
            
            if scenario.get("is_locked"):
                raise HTTPException(
                    status_code=400,
                    detail="Cannot edit a locked scenario. Please unlock it first."
                )
            
            # Update the scenario
            from datetime import datetime, timezone
            await db.planning_versions.update_one(
                {"id": scenario_id},
                {
                    "$set": {
                        "name": request.name,
                        "scenario_description": request.scenario_description,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            # Get updated scenario
            updated_scenario = await db.planning_versions.find_one(
                {"id": scenario_id},
                {"_id": 0}
            )
            
            return {
                "success": True,
                "message": "Scenario updated successfully",
                "scenario": updated_scenario
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating scenario: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return router
