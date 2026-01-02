from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from services.cfo_dashboard_service import CFODashboardService
from services.ai_narrative_service import AINavigationService

def get_dashboard_router(db: AsyncIOMotorDatabase) -> APIRouter:
    """Legacy router without ERP integration"""
    return _create_dashboard_router(db, None)

def get_dashboard_router_with_erp(db: AsyncIOMotorDatabase, erp_manager) -> APIRouter:
    """Router with ERP integration"""
    return _create_dashboard_router(db, erp_manager)

def _create_dashboard_router(db: AsyncIOMotorDatabase, erp_manager) -> APIRouter:
    router = APIRouter(prefix="/dashboard", tags=["CFO Dashboard"])
    
    dashboard_service = CFODashboardService(db, erp_manager)
    ai_service = AINavigationService()
    
    @router.get("/overview")
    async def get_dashboard_overview(user_id: str, use_mocked_data: bool = True) -> Dict[str, Any]:
        """Get complete CFO Command Center dashboard data"""
        try:
            # Fetch all quadrant data in parallel (conceptually)
            liquidity_strip = await dashboard_service.get_global_liquidity_strip(user_id, use_mocked_data)
            profitability = await dashboard_service.get_profitability_copa(user_id, use_mocked_data)
            efficiency = await dashboard_service.get_operational_efficiency(user_id, use_mocked_data)
            strategic = await dashboard_service.get_strategic_whatif(user_id, use_mocked_data)
            governance_risk_capital = await dashboard_service.get_governance_risk_capital(user_id, use_mocked_data)
            
            # Detect anomalies
            metrics_to_check = {
                "group_net_cash": liquidity_strip.get("group_net_cash", 0),
                "liquidity_ratio": liquidity_strip.get("liquidity_ratio", 0),
                "close_progress": efficiency.get("close_progress", 0)
            }
            
            anomalies = await dashboard_service.detect_anomalies(user_id, metrics_to_check)
            
            # Compile dashboard data
            dashboard_data = {
                "liquidity_strip": liquidity_strip,
                "profitability": profitability,
                "efficiency": efficiency,
                "strategic": strategic,
                "governance_risk_capital": governance_risk_capital,
                "anomalies": anomalies
            }
            
            # Generate AI narrative
            narrative = await ai_service.generate_narrative(dashboard_data)
            dashboard_data["ai_narrative"] = narrative
            
            return dashboard_data
        
        except ZeroDivisionError as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching dashboard data: division by zero at {traceback.format_exc()}"
            )
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error fetching dashboard data: {str(e)}"
            )
    
    @router.get("/liquidity")
    async def get_liquidity_details(user_id: str) -> Dict[str, Any]:
        """Get detailed liquidity metrics"""
        return await dashboard_service.get_global_liquidity_strip(user_id)
    
    @router.get("/profitability")
    async def get_profitability_details(user_id: str) -> Dict[str, Any]:
        """Get detailed profitability and COPA metrics"""
        return await dashboard_service.get_profitability_copa(user_id)
    
    @router.get("/efficiency")
    async def get_efficiency_details(user_id: str) -> Dict[str, Any]:
        """Get detailed operational efficiency metrics"""
        return await dashboard_service.get_operational_efficiency(user_id)
    
    @router.get("/strategic")
    async def get_strategic_details(user_id: str) -> Dict[str, Any]:
        """Get detailed strategic what-if metrics"""
        return await dashboard_service.get_strategic_whatif(user_id)
    
    @router.get("/sync-status")
    async def get_sync_details(user_id: str) -> Dict[str, Any]:
        """Get detailed sync status (deprecated - moved to integrations page)"""
        return await dashboard_service.get_sync_status(user_id)
    
    @router.get("/governance-risk-capital")
    async def get_governance_details(user_id: str) -> Dict[str, Any]:
        """Get governance, risk, and strategic capital metrics"""
        return await dashboard_service.get_governance_risk_capital(user_id)
    
    return router