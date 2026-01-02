"""
Asset Lifecycle Engine Service
Handles depreciation, NPV/IRR calculations, and asset lifecycle modeling
"""

import logging
import numpy as np
import numpy_financial as npf
from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
from typing import Dict, Any, List, Optional, Tuple
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class AssetLifecycleEngine:
    """Service for asset lifecycle calculations and modeling"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    def calculate_depreciation(
        self,
        cost: float,
        residual_value: float,
        useful_life_months: int,
        depreciation_method: str = "straight_line",
        start_date: str = None
    ) -> Dict[str, Any]:
        """
        Calculate monthly depreciation schedule
        
        Args:
            cost: Asset acquisition cost
            residual_value: Salvage value at end of useful life
            useful_life_months: Asset useful life in months
            depreciation_method: "straight_line" or "double_declining_balance"
            start_date: Asset in-service date (YYYY-MM-DD format)
            
        Returns:
            Dict with depreciation schedule and totals
        """
        try:
            depreciable_amount = cost - residual_value
            
            if depreciation_method == "straight_line":
                return self._calculate_straight_line(
                    depreciable_amount, 
                    useful_life_months,
                    residual_value,
                    start_date
                )
            elif depreciation_method == "double_declining_balance":
                return self._calculate_double_declining(
                    cost,
                    residual_value,
                    useful_life_months,
                    start_date
                )
            else:
                raise ValueError(f"Unsupported depreciation method: {depreciation_method}")
                
        except Exception as e:
            logger.error(f"Error calculating depreciation: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _calculate_straight_line(
        self,
        depreciable_amount: float,
        useful_life_months: int,
        residual_value: float,
        start_date: str
    ) -> Dict[str, Any]:
        """Calculate straight-line depreciation"""
        monthly_depreciation = depreciable_amount / useful_life_months
        
        schedule = []
        cumulative_depreciation = 0
        
        if start_date:
            current_date = datetime.strptime(start_date, "%Y-%m-%d")
        else:
            current_date = datetime.now(timezone.utc)
        
        for month in range(useful_life_months):
            cumulative_depreciation += monthly_depreciation
            book_value = depreciable_amount + residual_value - cumulative_depreciation
            
            schedule.append({
                "month": month + 1,
                "period": current_date.strftime("%Y-%m"),
                "depreciation_expense": round(monthly_depreciation, 2),
                "cumulative_depreciation": round(cumulative_depreciation, 2),
                "book_value": round(book_value, 2)
            })
            
            current_date += relativedelta(months=1)
        
        return {
            "success": True,
            "method": "straight_line",
            "monthly_depreciation": round(monthly_depreciation, 2),
            "total_depreciation": round(depreciable_amount, 2),
            "schedule": schedule
        }
    
    def _calculate_double_declining(
        self,
        cost: float,
        residual_value: float,
        useful_life_months: int,
        start_date: str
    ) -> Dict[str, Any]:
        """Calculate double-declining balance depreciation"""
        depreciation_rate = (2 / useful_life_months)
        
        schedule = []
        book_value = cost
        cumulative_depreciation = 0
        
        if start_date:
            current_date = datetime.strptime(start_date, "%Y-%m-%d")
        else:
            current_date = datetime.now(timezone.utc)
        
        for month in range(useful_life_months):
            # Calculate depreciation, but don't go below residual value
            depreciation_expense = book_value * depreciation_rate
            
            # Ensure book value doesn't drop below residual value
            if book_value - depreciation_expense < residual_value:
                depreciation_expense = book_value - residual_value
            
            book_value -= depreciation_expense
            cumulative_depreciation += depreciation_expense
            
            schedule.append({
                "month": month + 1,
                "period": current_date.strftime("%Y-%m"),
                "depreciation_expense": round(depreciation_expense, 2),
                "cumulative_depreciation": round(cumulative_depreciation, 2),
                "book_value": round(book_value, 2)
            })
            
            current_date += relativedelta(months=1)
            
            # Stop if we've reached residual value
            if book_value <= residual_value:
                break
        
        return {
            "success": True,
            "method": "double_declining_balance",
            "total_depreciation": round(cumulative_depreciation, 2),
            "schedule": schedule
        }
    
    def generate_amortization_schedule(
        self,
        loan_amount: float,
        down_payment: float,
        interest_rate: float,
        term_months: int,
        start_date: str = None
    ) -> Dict[str, Any]:
        """
        Generate loan amortization schedule
        
        Args:
            loan_amount: Total asset cost
            down_payment: Upfront payment
            interest_rate: Annual interest rate (as percentage)
            term_months: Loan term in months
            start_date: Loan start date
            
        Returns:
            Dict with amortization schedule
        """
        try:
            principal = loan_amount - down_payment
            monthly_rate = (interest_rate / 100) / 12
            
            if monthly_rate == 0:
                # No interest loan
                monthly_payment = principal / term_months
                schedule = []
                
                if start_date:
                    current_date = datetime.strptime(start_date, "%Y-%m-%d")
                else:
                    current_date = datetime.now(timezone.utc)
                
                remaining_balance = principal
                for month in range(term_months):
                    remaining_balance -= monthly_payment
                    schedule.append({
                        "month": month + 1,
                        "period": current_date.strftime("%Y-%m"),
                        "payment": round(monthly_payment, 2),
                        "principal": round(monthly_payment, 2),
                        "interest": 0.0,
                        "remaining_balance": round(max(0, remaining_balance), 2)
                    })
                    current_date += relativedelta(months=1)
            else:
                # Calculate monthly payment using formula
                monthly_payment = principal * (monthly_rate * (1 + monthly_rate) ** term_months) / \
                                ((1 + monthly_rate) ** term_months - 1)
                
                schedule = []
                remaining_balance = principal
                
                if start_date:
                    current_date = datetime.strptime(start_date, "%Y-%m-%d")
                else:
                    current_date = datetime.now(timezone.utc)
                
                for month in range(term_months):
                    interest_payment = remaining_balance * monthly_rate
                    principal_payment = monthly_payment - interest_payment
                    remaining_balance -= principal_payment
                    
                    schedule.append({
                        "month": month + 1,
                        "period": current_date.strftime("%Y-%m"),
                        "payment": round(monthly_payment, 2),
                        "principal": round(principal_payment, 2),
                        "interest": round(interest_payment, 2),
                        "remaining_balance": round(max(0, remaining_balance), 2)
                    })
                    
                    current_date += relativedelta(months=1)
            
            total_interest = sum(payment["interest"] for payment in schedule)
            
            return {
                "success": True,
                "loan_amount": round(loan_amount, 2),
                "down_payment": round(down_payment, 2),
                "principal": round(principal, 2),
                "monthly_payment": round(monthly_payment, 2),
                "total_interest": round(total_interest, 2),
                "total_cost": round(principal + total_interest, 2),
                "schedule": schedule
            }
            
        except Exception as e:
            logger.error(f"Error generating amortization schedule: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def calculate_npv(
        self,
        cash_flows: List[float],
        discount_rate: float,
        period: str = "monthly"
    ) -> float:
        """
        Calculate Net Present Value
        
        Args:
            cash_flows: List of periodic cash flows (negative for outflows)
            discount_rate: Annual discount rate (as percentage)
            period: "monthly" or "annual" - frequency of cash flows
            
        Returns:
            NPV value
        """
        try:
            annual_rate = discount_rate / 100
            
            # Convert annual rate to period rate if needed
            if period == "monthly":
                # Convert annual rate to monthly rate
                period_rate = (1 + annual_rate) ** (1/12) - 1
            else:
                period_rate = annual_rate
            
            # Use numpy_financial.npv
            import numpy_financial as npf
            return npf.npv(period_rate, cash_flows)
        except Exception as e:
            logger.error(f"Error calculating NPV: {str(e)}")
            return 0.0
    
    def calculate_irr(
        self,
        cash_flows: List[float]
    ) -> Optional[float]:
        """
        Calculate Internal Rate of Return using numpy-financial
        
        Args:
            cash_flows: List of periodic cash flows (must include initial investment as negative)
            
        Returns:
            IRR as percentage, or None if cannot be calculated
        """
        try:
            irr = npf.irr(cash_flows)
            if np.isnan(irr) or np.isinf(irr):
                return None
            return irr * 100  # Convert to percentage
        except Exception as e:
            logger.error(f"Error calculating IRR: {str(e)}")
            return None
    
    def calculate_payback_period(
        self,
        initial_investment: float,
        cash_flows: List[float]
    ) -> Dict[str, Any]:
        """
        Calculate payback period
        
        Args:
            initial_investment: Initial cost (positive value)
            cash_flows: List of periodic net cash inflows
            
        Returns:
            Dict with payback period and cumulative cash flows
        """
        try:
            cumulative_cash_flow = -initial_investment
            payback_month = None
            cumulative_flows = []
            
            for month, cash_flow in enumerate(cash_flows, start=1):
                cumulative_cash_flow += cash_flow
                cumulative_flows.append({
                    "month": month,
                    "cash_flow": round(cash_flow, 2),
                    "cumulative": round(cumulative_cash_flow, 2)
                })
                
                if payback_month is None and cumulative_cash_flow >= 0:
                    payback_month = month
            
            return {
                "success": True,
                "payback_month": payback_month,
                "payback_years": round(payback_month / 12, 2) if payback_month else None,
                "cumulative_flows": cumulative_flows,
                "final_cumulative": round(cumulative_cash_flow, 2)
            }
            
        except Exception as e:
            logger.error(f"Error calculating payback period: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def calculate_optimal_replacement_point(
        self,
        asset_id: str,
        maintenance_costs: List[Dict[str, float]],
        resale_values: List[Dict[str, float]],
        replacement_cost: float
    ) -> Dict[str, Any]:
        """
        Calculate optimal asset replacement timing
        
        Args:
            asset_id: Asset identifier
            maintenance_costs: List of {year, cost} dictionaries
            resale_values: List of {year, value} dictionaries
            replacement_cost: Cost of new asset
            
        Returns:
            Dict with optimal replacement year and analysis
        """
        try:
            analysis = []
            
            for year in range(1, len(maintenance_costs) + 1):
                # Calculate cumulative maintenance
                cumulative_maintenance = sum(
                    m["cost"] for m in maintenance_costs[:year]
                )
                
                # Get resale value for this year
                resale_value = next(
                    (r["value"] for r in resale_values if r["year"] == year),
                    0
                )
                
                # Calculate annualized cost of ownership
                total_cost = cumulative_maintenance
                annualized_cost = total_cost / year
                
                # Calculate economic advantage of replacement
                replacement_advantage = resale_value - (replacement_cost - (replacement_cost / 5 * year))
                
                analysis.append({
                    "year": year,
                    "cumulative_maintenance": round(cumulative_maintenance, 2),
                    "resale_value": round(resale_value, 2),
                    "annualized_cost": round(annualized_cost, 2),
                    "replacement_advantage": round(replacement_advantage, 2)
                })
            
            # Find optimal point (minimum annualized cost or maximum advantage)
            optimal_year = min(analysis, key=lambda x: x["annualized_cost"])
            
            return {
                "success": True,
                "optimal_replacement_year": optimal_year["year"],
                "optimal_analysis": optimal_year,
                "full_analysis": analysis,
                "recommendation": f"Replace after year {optimal_year['year']} when annualized cost is minimized"
            }
            
        except Exception as e:
            logger.error(f"Error calculating optimal replacement point: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def generate_disposal_impact(
        self,
        asset_cost: float,
        cumulative_depreciation: float,
        sale_price: float,
        sale_date: str
    ) -> Dict[str, Any]:
        """
        Calculate gain/loss on asset disposal
        
        Args:
            asset_cost: Original asset cost
            cumulative_depreciation: Total depreciation taken
            sale_price: Actual sale price
            sale_date: Date of sale
            
        Returns:
            Dict with disposal calculations
        """
        try:
            book_value = asset_cost - cumulative_depreciation
            gain_loss = sale_price - book_value
            
            return {
                "success": True,
                "book_value": round(book_value, 2),
                "sale_price": round(sale_price, 2),
                "gain_loss": round(gain_loss, 2),
                "gain_loss_type": "gain" if gain_loss > 0 else "loss" if gain_loss < 0 else "break_even",
                "cash_inflow": round(sale_price, 2),
                "sale_date": sale_date,
                "tax_impact_note": "Gain/loss should be included in taxable income calculation"
            }
            
        except Exception as e:
            logger.error(f"Error generating disposal impact: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def calculate_asset_roi_metrics(
        self,
        asset_id: str,
        initial_investment: float,
        monthly_revenues: List[float],
        monthly_costs: List[float],
        discount_rate: float,
        financing_costs: List[float] = None
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive ROI metrics for an asset
        
        Args:
            asset_id: Asset identifier
            initial_investment: Total upfront cost
            monthly_revenues: List of monthly revenue/savings
            monthly_costs: List of monthly operating costs
            discount_rate: Discount rate for NPV
            financing_costs: Optional list of monthly loan payments
            
        Returns:
            Dict with NPV, IRR, Payback, and other metrics
        """
        try:
            # Calculate net cash flows
            net_cash_flows = []
            
            # Initial investment is negative cash flow
            all_cash_flows = [-initial_investment]
            
            for month in range(len(monthly_revenues)):
                revenue = monthly_revenues[month] if month < len(monthly_revenues) else 0
                cost = monthly_costs[month] if month < len(monthly_costs) else 0
                financing = financing_costs[month] if financing_costs and month < len(financing_costs) else 0
                
                net_monthly = revenue - cost - financing
                net_cash_flows.append(net_monthly)
                all_cash_flows.append(net_monthly)
            
            # Calculate NPV (monthly cash flows with annual discount rate)
            npv = self.calculate_npv(all_cash_flows, discount_rate, period="monthly")
            
            # Calculate IRR
            irr = self.calculate_irr(all_cash_flows)
            
            # Calculate Payback Period
            payback = self.calculate_payback_period(initial_investment, net_cash_flows)
            
            # Calculate total returns
            total_revenue = sum(monthly_revenues)
            total_costs = sum(monthly_costs)
            total_financing = sum(financing_costs) if financing_costs else 0
            net_profit = total_revenue - total_costs - total_financing - initial_investment
            
            roi_percentage = (net_profit / initial_investment) * 100 if initial_investment > 0 else 0
            
            return {
                "success": True,
                "asset_id": asset_id,
                "npv": round(npv, 2),
                "irr": round(irr, 2) if irr else None,
                "payback_period_months": payback.get("payback_month"),
                "payback_period_years": payback.get("payback_years"),
                "total_revenue": round(total_revenue, 2),
                "total_costs": round(total_costs, 2),
                "total_financing_costs": round(total_financing, 2),
                "net_profit": round(net_profit, 2),
                "roi_percentage": round(roi_percentage, 2),
                "discount_rate_used": discount_rate,
                "analysis_periods": len(monthly_revenues)
            }
            
        except Exception as e:
            logger.error(f"Error calculating asset ROI metrics: {str(e)}")
            return {"success": False, "error": str(e)}
