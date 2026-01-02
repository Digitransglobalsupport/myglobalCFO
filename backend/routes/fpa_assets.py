"""
FP&A Asset Scenarios Routes
Capital asset acquisition, lifecycle management, and exit strategy modeling
"""

from fastapi import APIRouter, HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
import logging
from datetime import datetime, timezone
import uuid

from services.asset_lifecycle_engine import AssetLifecycleEngine

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/fpa/assets", tags=["FP&A Assets"])


# ==================== REQUEST MODELS ====================

class FinancingDetails(BaseModel):
    method: str  # "cash", "loan", "lease"
    down_payment: Optional[float] = 0
    interest_rate: Optional[float] = 0
    term_months: Optional[int] = 0
    monthly_lease_payment: Optional[float] = 0


class MaintenanceCost(BaseModel):
    year: int
    cost: float


class RevenueProjection(BaseModel):
    month: int
    revenue: float
    description: Optional[str] = None


class LinkedDriver(BaseModel):
    driver_id: str
    multiplier: float = 1.0  # How much this driver affects asset revenue/savings


class AssetScenarioCreate(BaseModel):
    asset_name: str
    asset_class: str  # "IT Hardware", "Heavy Machinery", "Real Estate", etc.
    estimated_cost: float
    purchase_date: str  # YYYY-MM-DD
    in_service_date: str  # YYYY-MM-DD
    useful_life_months: int
    residual_value: float
    
    financing_details: FinancingDetails
    depreciation_method: str = "straight_line"  # or "double_declining_balance"
    
    # Optional fields
    linked_driver_ids: Optional[List[LinkedDriver]] = []
    manual_revenue_projections: Optional[List[RevenueProjection]] = []
    maintenance_curve: Optional[List[MaintenanceCost]] = []
    utilization_percentage: float = 100.0
    
    # Investment analysis
    discount_rate_override: Optional[float] = None  # Override global WACC
    
    # Multi-currency support
    functional_currency: str = "USD"
    
    # Metadata
    scenario_description: Optional[str] = None
    user_id: str


class AssetScenarioUpdate(BaseModel):
    asset_name: Optional[str] = None
    estimated_cost: Optional[float] = None
    useful_life_months: Optional[int] = None
    residual_value: Optional[float] = None
    financing_details: Optional[FinancingDetails] = None
    depreciation_method: Optional[str] = None
    linked_driver_ids: Optional[List[LinkedDriver]] = None
    manual_revenue_projections: Optional[List[RevenueProjection]] = None
    maintenance_curve: Optional[List[MaintenanceCost]] = None
    utilization_percentage: Optional[float] = None
    discount_rate_override: Optional[float] = None
    scenario_description: Optional[str] = None


class DisposalRequest(BaseModel):
    sale_date: str  # YYYY-MM-DD
    sale_price: float


class CompareAssetsRequest(BaseModel):
    asset_ids: List[str]  # 2-3 asset scenarios to compare


# ==================== ROUTER FACTORY ====================

def get_assets_router(db: AsyncIOMotorDatabase, get_current_user):
    """Create Assets router with dependencies"""
    
    asset_engine = AssetLifecycleEngine(db)
    
    # ==================== ASSET SCENARIO CRUD ====================
    
    @router.post("/scenarios")
    async def create_asset_scenario(
        scenario_data: AssetScenarioCreate,
        current_user: dict = Depends(get_current_user)
    ):
        """Create new asset scenario"""
        try:
            scenario_id = str(uuid.uuid4())
            
            # Calculate depreciation schedule
            depreciation_result = asset_engine.calculate_depreciation(
                cost=scenario_data.estimated_cost,
                residual_value=scenario_data.residual_value,
                useful_life_months=scenario_data.useful_life_months,
                depreciation_method=scenario_data.depreciation_method,
                start_date=scenario_data.in_service_date
            )
            
            if not depreciation_result.get("success"):
                raise HTTPException(status_code=400, detail=depreciation_result.get("error"))
            
            # Calculate financing schedule if applicable
            financing_schedule = None
            if scenario_data.financing_details.method == "loan":
                financing_result = asset_engine.generate_amortization_schedule(
                    loan_amount=scenario_data.estimated_cost,
                    down_payment=scenario_data.financing_details.down_payment,
                    interest_rate=scenario_data.financing_details.interest_rate,
                    term_months=scenario_data.financing_details.term_months,
                    start_date=scenario_data.purchase_date
                )
                
                if financing_result.get("success"):
                    financing_schedule = financing_result
            
            # Create scenario document
            scenario_dict = scenario_data.model_dump()
            scenario_dict["id"] = scenario_id
            scenario_dict["status"] = "active"
            scenario_dict["created_by"] = current_user["id"]
            scenario_dict["created_at"] = datetime.now(timezone.utc)
            scenario_dict["updated_at"] = datetime.now(timezone.utc)
            scenario_dict["depreciation_schedule"] = depreciation_result.get("schedule", [])
            scenario_dict["financing_schedule"] = financing_schedule
            scenario_dict["disposal_date"] = None
            scenario_dict["disposal_price"] = None
            
            await db.asset_scenarios.insert_one(scenario_dict)
            
            # Get the company's global WACC for NPV calculations
            discount_rate = scenario_data.discount_rate_override
            if not discount_rate:
                # Try to get from global settings (we'll implement this later)
                # For now, use a default
                discount_rate = 10.0  # Default 10% WACC
            
            return {
                "success": True,
                "asset_id": scenario_id,
                "message": "Asset scenario created successfully",
                "depreciation_summary": {
                    "method": depreciation_result.get("method"),
                    "monthly_depreciation": depreciation_result.get("monthly_depreciation"),
                    "total_depreciation": depreciation_result.get("total_depreciation")
                },
                "financing_summary": financing_schedule if financing_schedule else None
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error creating asset scenario: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/scenarios")
    async def list_asset_scenarios(
        status: Optional[str] = None,
        asset_class: Optional[str] = None,
        current_user: dict = Depends(get_current_user)
    ):
        """List all asset scenarios with optional filters"""
        try:
            query = {"user_id": current_user["id"]}
            
            if status:
                query["status"] = status
            if asset_class:
                query["asset_class"] = asset_class
            
            scenarios = await db.asset_scenarios.find(query, {"_id": 0}).to_list(None)
            
            return {
                "success": True,
                "count": len(scenarios),
                "scenarios": scenarios
            }
            
        except Exception as e:
            logger.error(f"Error listing asset scenarios: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/scenarios/{asset_id}")
    async def get_asset_scenario(
        asset_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Get detailed asset scenario"""
        try:
            scenario = await db.asset_scenarios.find_one(
                {"id": asset_id},
                {"_id": 0}
            )
            
            if not scenario:
                raise HTTPException(status_code=404, detail="Asset scenario not found")
            
            return {
                "success": True,
                "scenario": scenario
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting asset scenario: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.put("/scenarios/{asset_id}")
    async def update_asset_scenario(
        asset_id: str,
        update_data: AssetScenarioUpdate,
        current_user: dict = Depends(get_current_user)
    ):
        """Update asset scenario"""
        try:
            scenario = await db.asset_scenarios.find_one({"id": asset_id}, {"_id": 0})
            
            if not scenario:
                raise HTTPException(status_code=404, detail="Asset scenario not found")
            
            # Build update dict (only include provided fields)
            update_dict = {}
            for field, value in update_data.model_dump(exclude_unset=True).items():
                if value is not None:
                    update_dict[field] = value
            
            update_dict["updated_at"] = datetime.now(timezone.utc)
            
            # Recalculate depreciation if relevant fields changed
            if any(key in update_dict for key in ["estimated_cost", "residual_value", "useful_life_months", "depreciation_method"]):
                cost = update_dict.get("estimated_cost", scenario["estimated_cost"])
                residual = update_dict.get("residual_value", scenario["residual_value"])
                life = update_dict.get("useful_life_months", scenario["useful_life_months"])
                method = update_dict.get("depreciation_method", scenario["depreciation_method"])
                
                depreciation_result = asset_engine.calculate_depreciation(
                    cost=cost,
                    residual_value=residual,
                    useful_life_months=life,
                    depreciation_method=method,
                    start_date=scenario["in_service_date"]
                )
                
                if depreciation_result.get("success"):
                    update_dict["depreciation_schedule"] = depreciation_result.get("schedule", [])
            
            await db.asset_scenarios.update_one(
                {"id": asset_id},
                {"$set": update_dict}
            )
            
            updated_scenario = await db.asset_scenarios.find_one(
                {"id": asset_id},
                {"_id": 0}
            )
            
            return {
                "success": True,
                "message": "Asset scenario updated successfully",
                "scenario": updated_scenario
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error updating asset scenario: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.delete("/scenarios/{asset_id}")
    async def delete_asset_scenario(
        asset_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Delete asset scenario"""
        try:
            result = await db.asset_scenarios.delete_one({"id": asset_id})
            
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Asset scenario not found")
            
            return {
                "success": True,
                "message": "Asset scenario deleted successfully"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error deleting asset scenario: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    # ==================== CALCULATION ENDPOINTS ====================
    
    @router.post("/scenarios/{asset_id}/calculate-roi")
    async def calculate_asset_roi(
        asset_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Calculate NPV, IRR, and Payback Period for an asset"""
        try:
            scenario = await db.asset_scenarios.find_one({"id": asset_id}, {"_id": 0})
            
            if not scenario:
                raise HTTPException(status_code=404, detail="Asset scenario not found")
            
            # Get discount rate
            discount_rate = scenario.get("discount_rate_override", 10.0)
            
            # Build cash flows from manual projections or linked drivers
            monthly_revenues = []
            if scenario.get("manual_revenue_projections"):
                for proj in sorted(scenario["manual_revenue_projections"], key=lambda x: x["month"]):
                    monthly_revenues.append(proj["revenue"])
            
            # For simplicity, assume maintenance costs are monthly operating costs
            monthly_costs = []
            if scenario.get("maintenance_curve"):
                for year_cost in scenario["maintenance_curve"]:
                    monthly_cost = year_cost["cost"] / 12
                    for _ in range(12):
                        monthly_costs.append(monthly_cost)
            
            # Get financing costs from schedule
            financing_costs = []
            if scenario.get("financing_schedule") and scenario["financing_schedule"].get("schedule"):
                for payment in scenario["financing_schedule"]["schedule"]:
                    financing_costs.append(payment["payment"])
            
            # Calculate ROI metrics
            roi_metrics = await asset_engine.calculate_asset_roi_metrics(
                asset_id=asset_id,
                initial_investment=scenario["estimated_cost"],
                monthly_revenues=monthly_revenues,
                monthly_costs=monthly_costs,
                discount_rate=discount_rate,
                financing_costs=financing_costs if financing_costs else None
            )
            
            return roi_metrics
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error calculating asset ROI: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/scenarios/compare")
    async def compare_asset_scenarios(
        request: CompareAssetsRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Compare 2-3 asset scenarios side-by-side"""
        try:
            if len(request.asset_ids) < 2 or len(request.asset_ids) > 3:
                raise HTTPException(status_code=400, detail="Please select 2-3 assets to compare")
            
            comparisons = []
            
            for asset_id in request.asset_ids:
                scenario = await db.asset_scenarios.find_one({"id": asset_id}, {"_id": 0})
                
                if not scenario:
                    continue
                
                # Calculate ROI metrics for each
                discount_rate = scenario.get("discount_rate_override", 10.0)
                
                monthly_revenues = []
                if scenario.get("manual_revenue_projections"):
                    for proj in sorted(scenario["manual_revenue_projections"], key=lambda x: x["month"]):
                        monthly_revenues.append(proj["revenue"])
                
                monthly_costs = []
                if scenario.get("maintenance_curve"):
                    for year_cost in scenario["maintenance_curve"]:
                        monthly_cost = year_cost["cost"] / 12
                        for _ in range(12):
                            monthly_costs.append(monthly_cost)
                
                financing_costs = []
                if scenario.get("financing_schedule") and scenario["financing_schedule"].get("schedule"):
                    for payment in scenario["financing_schedule"]["schedule"]:
                        financing_costs.append(payment["payment"])
                
                roi_metrics = await asset_engine.calculate_asset_roi_metrics(
                    asset_id=asset_id,
                    initial_investment=scenario["estimated_cost"],
                    monthly_revenues=monthly_revenues,
                    monthly_costs=monthly_costs,
                    discount_rate=discount_rate,
                    financing_costs=financing_costs if financing_costs else None
                )
                
                comparisons.append({
                    "asset_id": asset_id,
                    "asset_name": scenario["asset_name"],
                    "asset_class": scenario["asset_class"],
                    "initial_cost": scenario["estimated_cost"],
                    "financing_method": scenario["financing_details"]["method"],
                    "metrics": roi_metrics
                })
            
            # Determine best option
            best_by_npv = max(comparisons, key=lambda x: x["metrics"].get("npv", float('-inf')))
            best_by_irr = max(comparisons, key=lambda x: x["metrics"].get("irr", float('-inf')) if x["metrics"].get("irr") else float('-inf'))
            
            return {
                "success": True,
                "comparison_count": len(comparisons),
                "comparisons": comparisons,
                "recommendations": {
                    "best_by_npv": best_by_npv["asset_name"],
                    "best_by_irr": best_by_irr["asset_name"],
                    "best_npv_value": best_by_npv["metrics"].get("npv"),
                    "best_irr_value": best_by_irr["metrics"].get("irr")
                }
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error comparing asset scenarios: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.post("/scenarios/{asset_id}/dispose")
    async def dispose_asset(
        asset_id: str,
        disposal_request: DisposalRequest,
        current_user: dict = Depends(get_current_user)
    ):
        """Trigger asset disposal and calculate gain/loss"""
        try:
            scenario = await db.asset_scenarios.find_one({"id": asset_id}, {"_id": 0})
            
            if not scenario:
                raise HTTPException(status_code=404, detail="Asset scenario not found")
            
            if scenario.get("status") == "disposed":
                raise HTTPException(status_code=400, detail="Asset already disposed")
            
            # Calculate cumulative depreciation at disposal date
            depreciation_schedule = scenario.get("depreciation_schedule", [])
            cumulative_depreciation = 0
            
            for entry in depreciation_schedule:
                if entry["period"] <= disposal_request.sale_date[:7]:  # Compare YYYY-MM
                    cumulative_depreciation = entry["cumulative_depreciation"]
                else:
                    break
            
            # Calculate disposal impact
            disposal_impact = asset_engine.generate_disposal_impact(
                asset_cost=scenario["estimated_cost"],
                cumulative_depreciation=cumulative_depreciation,
                sale_price=disposal_request.sale_price,
                sale_date=disposal_request.sale_date
            )
            
            # Update scenario status
            await db.asset_scenarios.update_one(
                {"id": asset_id},
                {
                    "$set": {
                        "status": "disposed",
                        "disposal_date": disposal_request.sale_date,
                        "disposal_price": disposal_request.sale_price,
                        "disposal_impact": disposal_impact,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            return {
                "success": True,
                "message": "Asset disposed successfully",
                "disposal_impact": disposal_impact
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error disposing asset: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    @router.get("/scenarios/{asset_id}/optimal-replacement")
    async def calculate_optimal_replacement(
        asset_id: str,
        current_user: dict = Depends(get_current_user)
    ):
        """Calculate optimal replacement timing for an asset"""
        try:
            scenario = await db.asset_scenarios.find_one({"id": asset_id}, {"_id": 0})
            
            if not scenario:
                raise HTTPException(status_code=404, detail="Asset scenario not found")
            
            maintenance_costs = scenario.get("maintenance_curve", [])
            if not maintenance_costs:
                return {
                    "success": False,
                    "message": "No maintenance curve defined for this asset"
                }
            
            # Generate hypothetical resale values (declining over time)
            resale_values = []
            initial_value = scenario["estimated_cost"]
            residual = scenario["residual_value"]
            years = len(maintenance_costs)
            
            for year in range(1, years + 1):
                # Linear depreciation for resale value estimation
                resale_value = initial_value - ((initial_value - residual) / years * year)
                resale_values.append({"year": year, "value": resale_value})
            
            replacement_cost = scenario["estimated_cost"] * 1.05  # Assume 5% inflation
            
            optimal_result = asset_engine.calculate_optimal_replacement_point(
                asset_id=asset_id,
                maintenance_costs=maintenance_costs,
                resale_values=resale_values,
                replacement_cost=replacement_cost
            )
            
            return optimal_result
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error calculating optimal replacement: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))
    
    return router
