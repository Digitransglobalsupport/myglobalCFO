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
    async def get_dashboard_overview(user_id: str, company_id: str = None, use_mocked_data: bool = True) -> Dict[str, Any]:
        """Get complete CFO Command Center dashboard data"""
        try:
            # Get company name and currency for context
            company_name = "All Entities (Consolidated)"
            currency = "USD"  # Default for consolidated view
            
            if company_id:
                company = await db.companies.find_one({"id": company_id})
                if company:
                    company_name = company.get("name", "Unknown Company")
                    currency = company.get("currency", "USD")
            
            # Fetch all quadrant data in parallel (conceptually)
            liquidity_strip = await dashboard_service.get_global_liquidity_strip(user_id, use_mocked_data, company_id)
            profitability = await dashboard_service.get_profitability_copa(user_id, use_mocked_data, company_id)
            efficiency = await dashboard_service.get_operational_efficiency(user_id, use_mocked_data, company_id)
            strategic = await dashboard_service.get_strategic_whatif(user_id, use_mocked_data, company_id)
            governance_risk_capital = await dashboard_service.get_governance_risk_capital(user_id, use_mocked_data, company_id)
            
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
                "anomalies": anomalies,
                "company_name": company_name,
                "currency": currency
            }
            
            # Generate AI narrative with company context and currency
            narrative = await ai_service.generate_narrative(dashboard_data, company_name, currency)
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
    async def get_governance_details(user_id: str, use_mocked_data: bool = True) -> Dict[str, Any]:
        """Get governance, risk, and strategic capital metrics"""
        return await dashboard_service.get_governance_risk_capital(user_id, use_mocked_data)
    
    @router.post("/anomalies/{anomaly_id}/dismiss")
    async def dismiss_anomaly(anomaly_id: str, user_id: str, reason: str = None) -> Dict[str, Any]:
        """Dismiss an anomaly alert"""
        # In real implementation, this would update the database
        return {
            "status": "success",
            "anomaly_id": anomaly_id,
            "action": "dismissed",
            "reason": reason,
            "dismissed_by": user_id
        }
    
    @router.post("/anomalies/{anomaly_id}/investigate")
    async def investigate_anomaly(anomaly_id: str, user_id: str) -> Dict[str, Any]:
        """Mark anomaly for investigation and get deep-link details"""
        # In real implementation, this would:
        # 1. Update anomaly status to "investigating"
        # 2. Return transaction details for investigation
        return {
            "status": "success",
            "anomaly_id": anomaly_id,
            "action": "investigating",
            "deep_link": f"/dashboard/transactions?anomaly={anomaly_id}",
            "transaction_ids": ["TXN-001", "TXN-002"],  # Example
            "assigned_to": user_id
        }
    
    return router