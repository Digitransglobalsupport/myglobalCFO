from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
import random
import statistics
from motor.motor_asyncio import AsyncIOMotorDatabase

class CFODashboardService:
    """Service for CFO Command Center Dashboard data aggregation and calculations"""
    
    def __init__(self, db: AsyncIOMotorDatabase, erp_manager=None):
        self.db = db
        self.erp_manager = erp_manager
    
    async def get_erp_financial_summary(self, days_back: int = 30) -> Dict[str, Any]:
        """Get aggregated financial data from all connected ERP systems"""
        if not self.erp_manager:
            return None
        
        try:
            financial_data = await self.erp_manager.get_aggregated_financial_data(days_back)
            return financial_data
        except Exception as e:
            print(f"Error fetching ERP financial data: {e}")
            return None
    
    async def get_global_liquidity_strip(self, user_id: str, use_mocked_data: bool = True, company_id: str = None) -> Dict[str, Any]:
        """
        Get consolidated liquidity metrics across all entities or for a specific company
        Args:
            user_id: User identifier
            use_mocked_data: Whether to use mocked data
            company_id: Optional company ID to filter by specific entity (None = all entities)
        """
        # If mocked data is requested, return it immediately
        if use_mocked_data:
            return {
                "group_net_cash": 2450000,
                "liquidity_ratio": 1.85,
                "intercompany_in_flight": 125000,
                "forecasted_60_day_minimum": 1850000,
                "currency": "USD",
                "data_source": "mocked"
            }
        
        # Get all entities for this user
        entities = await self.db.entities.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        
        if not entities:
            # Return empty data when mock is off and no real data exists
            return {
                "group_net_cash": 0,
                "liquidity_ratio": 0,
                "intercompany_in_flight": 0,
                "forecasted_60_day_minimum": 0,
                "currency": "USD",
                "data_source": "no_data"
            }
        
        # Calculate aggregated metrics
        total_cash = sum([e.get("cash_balance", 0) for e in entities])
        total_inflows = sum([e.get("predicted_inflows", 0) for e in entities])
        total_payables = sum([e.get("immediate_payables", 1) for e in entities])  # Avoid division by zero
        
        liquidity_ratio = (total_cash + total_inflows) / total_payables if total_payables > 0 else 1.0
        
        # Get intercompany transactions
        intercompany_txns = await self.db.intercompany_transactions.find(
            {"user_id": user_id, "status": "unreconciled"},
            {"_id": 0}
        ).to_list(1000)
        
        in_flight_total = sum([txn.get("amount", 0) for txn in intercompany_txns])
        
        return {
            "group_net_cash": total_cash,
            "liquidity_ratio": round(liquidity_ratio, 2),
            "intercompany_in_flight": in_flight_total,
            "forecasted_60_day_minimum": total_cash * 0.75,  # Simplified forecast
            "currency": "USD",
            "data_source": "real_data"
        }
    
    async def get_profitability_copa(self, user_id: str, use_mocked_data: bool = True, company_id: str = None) -> Dict[str, Any]:
        """
        Get profitability COPA metrics
        Args:
            company_id: Optional company ID to filter by specific entity (None = all entities)
        """
        
        # If mocked data is requested, skip ERP and use internal mock
        if use_mocked_data:
            erp_data = None
        else:
            # Try to get real ERP financial data first
            erp_data = await self.get_erp_financial_summary(30)
        
        if erp_data and erp_data.get('total_revenue', 0) > 0:
            # Use real ERP data
            revenue = erp_data.get('total_revenue', 0)
            expenses = erp_data.get('total_expenses', 0)
            net_income = erp_data.get('net_income', 0)
            
            # Create waterfall data from real figures
            gross_profit = revenue * 0.65  # Estimate 65% gross margin
            overhead = expenses * 0.3  # Estimate 30% is overhead
            
            return {
                "data_source": "live_erp",
                "platforms": erp_data.get('platforms', []),
                "top_5_skus": [],  # SKU data still from internal system
                "bottom_5_skus": [],
                "waterfall_data": {
                    "gross_revenue": revenue,
                    "gross_profit": gross_profit,
                    "overhead": overhead,
                    "net_profit": net_income
                }
            }
        
        # Fallback to internal SKU data (only if mock data is enabled)
        if use_mocked_data:
            skus = await self.db.skus.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        else:
            skus = []
        
        if not skus and use_mocked_data:
            # Only generate mock data if mock mode is enabled (DON'T save to DB)
            skus = [
                {"id": f"sku_{i}", "name": f"Product {chr(65+i)}", "gross_margin": random.uniform(0.1, 0.5),
                 "allocated_overhead": random.uniform(1000, 5000), "revenue": random.uniform(10000, 50000)}
                for i in range(10)
            ]
            # Note: NOT inserting into DB to keep mock data temporary
        
        if not skus:
            # No data available when mock is off
            return {
                "data_source": "no_data",
                "platforms": [],
                "top_5_skus": [],
                "bottom_5_skus": [],
                "waterfall_data": {
                    "gross_revenue": 0,
                    "gross_profit": 0,
                    "overhead": 0,
                    "net_profit": 0
                }
            }
        
        # Clean any ObjectId fields that might have slipped through
        clean_skus = []
        for sku in skus:
            clean_sku = {k: v for k, v in sku.items() if k != "_id"}
            clean_skus.append(clean_sku)
        
        # Calculate fully-loaded margin for each SKU
        for sku in clean_skus:
            revenue = sku.get("revenue", 0)
            gross_margin = sku.get("gross_margin", 0)
            overhead = sku.get("allocated_overhead", 0)
            
            gross_profit = revenue * gross_margin
            net_profit = gross_profit - overhead
            sku["fully_loaded_margin"] = (net_profit / revenue * 100) if revenue > 0 else 0
        
        # Sort by margin
        skus_sorted = sorted(clean_skus, key=lambda x: x.get("fully_loaded_margin", 0), reverse=True)
        
        return {
            "data_source": "internal_mock",
            "platforms": [],
            "top_5_skus": skus_sorted[:5],
            "bottom_5_skus": skus_sorted[-5:],
            "waterfall_data": {
                "gross_revenue": sum([s.get("revenue", 0) for s in clean_skus]),
                "gross_profit": sum([s.get("revenue", 0) * s.get("gross_margin", 0) for s in clean_skus]),
                "overhead": sum([s.get("allocated_overhead", 0) for s in clean_skus]),
                "net_profit": sum([s.get("revenue", 0) * s.get("gross_margin", 0) - s.get("allocated_overhead", 0) for s in clean_skus])
            }
        }
    
    async def get_operational_efficiency(self, user_id: str, use_mocked_data: bool = True, company_id: str = None) -> Dict[str, Any]:
        """
        Get operational efficiency metrics
        Args:
            company_id: Optional company ID to filter by specific entity (None = all entities)
        """
        
        # Try to get DSO from real ERP invoices (skip if mocked data requested)
        dso_from_erp = None if use_mocked_data else await self._calculate_dso_from_erp()
        
        # Only query entities from database if mock is ON
        if use_mocked_data:
            entities = await self.db.entities.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        else:
            entities = []
        
        if not entities and use_mocked_data:
            # Create mock entities only if mock mode is enabled (DON'T save to DB)
            entities = [
                {
                    "id": f"entity_{i}",
                    "name": name,
                    "user_id": user_id,
                    "close_status": random.choice(["certified", "pending", "in_progress"]),
                    "dso": random.uniform(30, 90),
                    "sod_violations": random.randint(0, 3),
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                for i, name in enumerate(["US East", "US West", "EMEA", "APAC", "LATAM"])
            ]
            # Note: NOT inserting into DB to keep mock data temporary
        
        if not entities:
            # No data available when mock is off
            return {
                "close_progress": 0,
                "certified_entities": 0,
                "total_entities": 0,
                "dso_by_entity": [],
                "sod_status": "green",
                "sod_violations_count": 0,
                "data_source": "no_data"
            }
        
        # Clean any ObjectId fields
        clean_entities = []
        for entity in entities:
            clean_entity = {k: v for k, v in entity.items() if k != "_id"}
            clean_entities.append(clean_entity)
        
        certified_count = len([e for e in clean_entities if e.get("close_status") == "certified"])
        total_count = len(clean_entities) if clean_entities else 1
        close_progress = (certified_count / total_count) * 100
        
        # DSO by entity
        dso_data = [{"entity": e.get("name"), "dso": e.get("dso", 45)} for e in clean_entities]
        
        # SoD violations
        total_violations = sum([e.get("sod_violations", 0) for e in clean_entities])
        sod_status = "green" if total_violations == 0 else "yellow" if total_violations < 3 else "red"
        
        return {
            "close_progress": round(close_progress, 1),
            "certified_entities": certified_count,
            "total_entities": total_count,
            "dso_by_entity": dso_data,
            "sod_status": sod_status,
            "sod_violations_count": total_violations
        }
    
    async def get_strategic_whatif(self, user_id: str, use_mocked_data: bool = True, company_id: str = None) -> Dict[str, Any]:
        """
        Get strategic what-if scenario data
        Args:
            company_id: Optional company ID to filter by specific entity (None = all entities)
        """
        # Get asset scenarios (skip DB if mocked data requested)
        if use_mocked_data:
            asset_scenarios = []
            # Generate mock forecast data
            base_cash = 2450000
            forecast_data = []
            
            for week in range(13):
                week_date = datetime.now(timezone.utc) + timedelta(weeks=week)
                # Simulate cash flow with some variance
                base = base_cash + (week * 50000)  # Growing trend
                optimistic = base * 1.15
                pessimistic = base * 0.85
                expected = base
                
                forecast_data.append({
                    "week": week + 1,
                    "date": week_date.isoformat(),
                    "optimistic": optimistic,
                    "expected": expected,
                    "pessimistic": pessimistic
                })
            
            return {
                "asset_investment_npv": 125000,
                "asset_investment_irr": 12.5,
                "proposed_assets_count": 3,
                "cash_forecast_13w": forecast_data,
                "data_source": "mocked"
            }
        else:
            asset_scenarios = await self.db.asset_scenarios.find(
                {"user_id": user_id, "status": "proposed"},
                {"_id": 0}
            ).to_list(100)
        
        # Calculate aggregate NPV/IRR from real data
        total_npv = sum([s.get("npv", 0) for s in asset_scenarios])
        avg_irr = statistics.mean([s.get("irr", 0) for s in asset_scenarios]) if asset_scenarios else 0
        
        # Only generate forecast if we have real cash data
        companies = await self.db.companies.find({"user_id": user_id}, {"_id": 0}).to_list(100)
        if not companies:
            # No data available
            return {
                "asset_investment_npv": 0,
                "asset_investment_irr": 0,
                "proposed_assets_count": 0,
                "cash_forecast_13w": [],
                "data_source": "no_data"
            }
        
        # Get base cash from real data
        base_cash = sum([c.get("cash_balance", 0) for c in companies])
        forecast_data = []
        
        for week in range(13):
            week_date = datetime.now(timezone.utc) + timedelta(weeks=week)
            # Use real cash data with realistic projections
            base = base_cash + (week * 10000)  # Conservative growth
            optimistic = base * 1.1
            pessimistic = base * 0.9
            expected = base
            
            forecast_data.append({
                "week": week + 1,
                "date": week_date.isoformat(),
                "optimistic": optimistic,
                "expected": expected,
                "pessimistic": pessimistic
            })
        
        return {
            "asset_investment_npv": total_npv,
            "asset_investment_irr": round(avg_irr, 2),
            "proposed_assets_count": len(asset_scenarios),
            "cash_forecast_13w": forecast_data,
            "data_source": "real_data"
        }
    
    async def _calculate_dso_from_erp(self) -> Optional[float]:
        """Calculate Days Sales Outstanding from ERP invoice data"""
        if not self.erp_manager:
            return None
        
        try:
            # Get recent invoices from all connected ERPs
            invoices = await self.erp_manager.get_recent_invoices(limit=100)
            
            if not invoices:
                return None
            
            # Calculate AR (unpaid invoices)
            total_ar = sum(
                inv.get('total_amount', 0) - inv.get('balance', inv.get('total_amount', 0))
                for inv in invoices
            )
            
            # Get total revenue from last 30 days
            financial_data = await self.erp_manager.get_aggregated_financial_data(30)
            total_revenue = financial_data.get('total_revenue', 0)
            
            if total_revenue == 0:
                return None
            
            # DSO = (AR / Revenue) * Days
            dso = (total_ar / total_revenue) * 30
            return round(dso, 1)
            
        except Exception as e:
            print(f"Error calculating DSO from ERP: {e}")
            return None
    
    async def get_governance_risk_capital(self, user_id: str, use_mocked_data: bool = True, company_id: str = None) -> Dict[str, Any]:
        """
        Get governance, risk, and strategic capital metrics
        Includes: Loan covenants, anomaly detection, AR exposure, capital sourcing
        Args:
            company_id: Optional company ID to filter by specific entity (None = all entities)
        """
        
        if use_mocked_data:
            return await self._get_mocked_governance_data(user_id)
        
        # Real implementation would fetch from actual data
        # For now, return enhanced mocked data
        return await self._get_mocked_governance_data(user_id)
    
    async def _get_mocked_governance_data(self, user_id: str) -> Dict[str, Any]:
        """Generate realistic governance, risk, and capital data"""
        import random
        from datetime import datetime, timedelta
        
        # Calculate covenant ratios
        total_debt = 2_500_000
        cash_balance = 850_000
        ebitda = 1_200_000
        interest_expense = 125_000
        ebit = ebitda  # Simplified for demo
        net_operating_income = 950_000
        total_debt_service = 450_000
        
        # Covenant calculations
        net_debt_to_ebitda = (total_debt - cash_balance) / ebitda
        interest_coverage = ebit / interest_expense
        dscr = net_operating_income / total_debt_service
        
        # Loan covenants grouped by bank - each bank has all 3 ratios
        loan_covenants = [
            {
                "bank_id": "BANK-001",
                "lender": "Silicon Valley Bank",
                "loan_amount": 1_500_000,
                "last_checked": datetime.now().isoformat(),
                "ratios": [
                    {
                        "ratio_type": "Net Debt / EBITDA",
                        "formula": "(Total Debt - Cash) / EBITDA",
                        "current_value": net_debt_to_ebitda,
                        "threshold": 2.5,
                        "threshold_type": "max",
                        "status": "healthy" if net_debt_to_ebitda < 2.25 else "warning" if net_debt_to_ebitda < 2.5 else "breach",
                        "distance_to_breach": ((2.5 - net_debt_to_ebitda) / 2.5) * 100
                    },
                    {
                        "ratio_type": "Interest Coverage Ratio",
                        "formula": "EBIT / Interest Expense",
                        "current_value": interest_coverage,
                        "threshold": 3.0,
                        "threshold_type": "min",
                        "status": "healthy" if interest_coverage > 3.3 else "warning" if interest_coverage > 3.0 else "breach",
                        "distance_to_breach": ((interest_coverage - 3.0) / 3.0) * 100
                    },
                    {
                        "ratio_type": "Debt Service Coverage (DSCR)",
                        "formula": "Net Operating Income / Total Debt Service",
                        "current_value": dscr,
                        "threshold": 1.25,
                        "threshold_type": "min",
                        "status": "healthy" if dscr > 1.375 else "warning" if dscr > 1.25 else "breach",
                        "distance_to_breach": ((dscr - 1.25) / 1.25) * 100
                    }
                ]
            },
            {
                "bank_id": "BANK-002",
                "lender": "JPMorgan Chase",
                "loan_amount": 1_000_000,
                "last_checked": datetime.now().isoformat(),
                "ratios": [
                    {
                        "ratio_type": "Net Debt / EBITDA",
                        "formula": "(Total Debt - Cash) / EBITDA",
                        "current_value": net_debt_to_ebitda * 1.05,  # Slightly different
                        "threshold": 3.0,
                        "threshold_type": "max",
                        "status": "healthy" if net_debt_to_ebitda * 1.05 < 2.7 else "warning" if net_debt_to_ebitda * 1.05 < 3.0 else "breach",
                        "distance_to_breach": ((3.0 - net_debt_to_ebitda * 1.05) / 3.0) * 100
                    },
                    {
                        "ratio_type": "Interest Coverage Ratio",
                        "formula": "EBIT / Interest Expense",
                        "current_value": interest_coverage * 0.95,
                        "threshold": 2.5,
                        "threshold_type": "min",
                        "status": "healthy" if interest_coverage * 0.95 > 2.75 else "warning" if interest_coverage * 0.95 > 2.5 else "breach",
                        "distance_to_breach": ((interest_coverage * 0.95 - 2.5) / 2.5) * 100
                    },
                    {
                        "ratio_type": "Debt Service Coverage (DSCR)",
                        "formula": "Net Operating Income / Total Debt Service",
                        "current_value": dscr * 0.98,
                        "threshold": 1.2,
                        "threshold_type": "min",
                        "status": "healthy" if dscr * 0.98 > 1.32 else "warning" if dscr * 0.98 > 1.2 else "breach",
                        "distance_to_breach": ((dscr * 0.98 - 1.2) / 1.2) * 100
                    }
                ]
            },
            {
                "bank_id": "BANK-003",
                "lender": "Wells Fargo",
                "loan_amount": 750_000,
                "last_checked": datetime.now().isoformat(),
                "ratios": [
                    {
                        "ratio_type": "Net Debt / EBITDA",
                        "formula": "(Total Debt - Cash) / EBITDA",
                        "current_value": net_debt_to_ebitda * 0.92,
                        "threshold": 2.75,
                        "threshold_type": "max",
                        "status": "healthy" if net_debt_to_ebitda * 0.92 < 2.475 else "warning" if net_debt_to_ebitda * 0.92 < 2.75 else "breach",
                        "distance_to_breach": ((2.75 - net_debt_to_ebitda * 0.92) / 2.75) * 100
                    },
                    {
                        "ratio_type": "Interest Coverage Ratio",
                        "formula": "EBIT / Interest Expense",
                        "current_value": interest_coverage * 1.1,
                        "threshold": 3.5,
                        "threshold_type": "min",
                        "status": "healthy" if interest_coverage * 1.1 > 3.85 else "warning" if interest_coverage * 1.1 > 3.5 else "breach",
                        "distance_to_breach": ((interest_coverage * 1.1 - 3.5) / 3.5) * 100
                    },
                    {
                        "ratio_type": "Debt Service Coverage (DSCR)",
                        "formula": "Net Operating Income / Total Debt Service",
                        "current_value": dscr * 1.05,
                        "threshold": 1.3,
                        "threshold_type": "min",
                        "status": "healthy" if dscr * 1.05 > 1.43 else "warning" if dscr * 1.05 > 1.3 else "breach",
                        "distance_to_breach": ((dscr * 1.05 - 1.3) / 1.3) * 100
                    }
                ]
            }
        ]
        
        # AI Risk & Anomaly Feed
        anomalies = [
            {
                "id": "ANOM-001",
                "timestamp": (datetime.now() - timedelta(hours=2)).isoformat(),
                "type": "unusual_spending",
                "severity": "high",
                "entity": "UK Subsidiary",
                "description": "Marketing expense 245% above 30-day average",
                "amount": 45_000,
                "expected_range": [10_000, 18_000],
                "deviation_percent": 245.5,
                "status": "pending",
                "confidence": 0.92,
                "suggested_action": "investigate"
            },
            {
                "id": "ANOM-002",
                "timestamp": (datetime.now() - timedelta(hours=5)).isoformat(),
                "type": "duplicate_transaction",
                "severity": "medium",
                "entity": "US HQ",
                "description": "Potential duplicate vendor payment detected",
                "amount": 12_500,
                "expected_range": [0, 0],
                "deviation_percent": 100.0,
                "status": "pending",
                "confidence": 0.85,
                "suggested_action": "investigate"
            },
            {
                "id": "ANOM-003",
                "timestamp": (datetime.now() - timedelta(hours=12)).isoformat(),
                "type": "unusual_timing",
                "severity": "low",
                "entity": "APAC Division",
                "description": "Large vendor payment outside normal processing window",
                "amount": 28_000,
                "expected_range": [20_000, 35_000],
                "deviation_percent": 15.2,
                "status": "pending",
                "confidence": 0.73,
                "suggested_action": "review"
            }
        ]
        
        # AR Exposure Analysis
        ar_aging = {
            "current": 450_000,
            "days_30": 180_000,
            "days_60": 95_000,
            "days_90_plus": 125_000,
            "total_ar": 850_000,
            "at_risk_capital": 125_000,  # 90+ days
            "monthly_burn_rate": 285_000,
            "risk_ratio": 125_000 / 285_000,  # At-risk AR / Monthly burn
            "top_overdue_customers": [
                {"name": "Enterprise Corp", "amount": 45_000, "days_overdue": 105},
                {"name": "Global Industries", "amount": 38_000, "days_overdue": 92},
                {"name": "Tech Solutions Ltd", "amount": 22_000, "days_overdue": 98}
            ]
        }
        
        # Cash Runway Analysis
        current_cash = 850_000
        monthly_burn = 285_000
        runway_days = (current_cash / monthly_burn) * 30
        
        # Strategic Capital Sourcing (AI-matched funding options)
        capital_options = []
        
        # If runway < 90 days, show urgent funding options
        if runway_days < 90:
            capital_options.append({
                "id": "FUND-001",
                "provider": "Stripe Capital",
                "product_type": "Revenue-Based Financing",
                "amount_min": 50_000,
                "amount_max": 500_000,
                "interest_rate": 1.12,  # Factor rate
                "term_months": 12,
                "eligibility": "Qualified - Based on revenue patterns",
                "approval_time": "24-48 hours",
                "match_score": 0.94,
                "key_terms": "No personal guarantee, automatic repayment from revenue"
            })
        
        capital_options.extend([
            {
                "id": "FUND-002",
                "provider": "Goldman Sachs",
                "product_type": "Credit Line",
                "amount_min": 250_000,
                "amount_max": 2_000_000,
                "interest_rate": 0.072,  # 7.2% APR
                "term_months": 36,
                "eligibility": "Qualified - EBITDA-based",
                "approval_time": "7-10 days",
                "match_score": 0.88,
                "key_terms": "Revolving credit, EBITDA covenant required"
            },
            {
                "id": "FUND-003",
                "provider": "Innovate UK Grant",
                "product_type": "Innovation Grant",
                "amount_min": 100_000,
                "amount_max": 1_000_000,
                "interest_rate": 0.0,  # Grant - no interest
                "term_months": 24,
                "eligibility": "Under Review - Tech company criteria",
                "approval_time": "45-60 days",
                "match_score": 0.76,
                "key_terms": "Non-dilutive, milestone-based disbursement"
            },
            {
                "id": "FUND-004",
                "provider": "Silicon Valley Bank",
                "product_type": "Growth Term Loan",
                "amount_min": 500_000,
                "amount_max": 5_000_000,
                "interest_rate": 0.085,  # 8.5% APR
                "term_months": 48,
                "eligibility": "Qualified - Venture-backed companies",
                "approval_time": "14-21 days",
                "match_score": 0.82,
                "key_terms": "3-year interest-only, then amortizing"
            }
        ])
        
        # Health Scoring
        covenant_health = sum(1 for c in loan_covenants if c["status"] == "healthy") / len(loan_covenants)
        anomaly_score = 1.0 - (len([a for a in anomalies if a["severity"] == "high"]) * 0.3 + 
                              len([a for a in anomalies if a["severity"] == "medium"]) * 0.15)
        
        quick_ratio = (current_cash + ar_aging["current"] + ar_aging["days_30"]) / monthly_burn
        
        # Overall health status
        health_score = (covenant_health * 0.4 + anomaly_score * 0.3 + min(quick_ratio / 3, 1.0) * 0.3)
        
        if health_score > 0.8:
            health_status = "healthy"
            health_color = "green"
        elif health_score > 0.6:
            health_status = "warning"
            health_color = "yellow"
        else:
            health_status = "critical"
            health_color = "red"
        
        return {
            "loan_covenants": loan_covenants,
            "anomalies": anomalies,
            "ar_exposure": ar_aging,
            "cash_runway": {
                "current_cash": current_cash,
                "monthly_burn": monthly_burn,
                "runway_days": runway_days,
                "status": "urgent" if runway_days < 90 else "healthy" if runway_days > 180 else "moderate"
            },
            "capital_sourcing": {
                "recommendations": capital_options,
                "total_available": sum(opt["amount_max"] for opt in capital_options),
                "best_match": capital_options[0] if capital_options else None
            },
            "health_score": {
                "overall_score": health_score,
                "status": health_status,
                "color": health_color,
                "breakdown": {
                    "covenant_compliance": covenant_health,
                    "fraud_risk": anomaly_score,
                    "liquidity_strength": min(quick_ratio / 3, 1.0)
                }
            },
            "summary_metrics": {
                "total_debt": total_debt,
                "net_debt": total_debt - cash_balance,
                "ebitda": ebitda,
                "interest_expense": interest_expense,
                "debt_to_ebitda": net_debt_to_ebitda,
                "interest_coverage": interest_coverage,
                "dscr": dscr
            }
        }
    
    async def get_sync_status(self, user_id: str, use_mocked_data: bool = True) -> Dict[str, Any]:
        """Get integration sync status and data health - integrates real ERP status"""
        
        # Get real ERP sync statuses if available (skip if mocked data requested)
        if self.erp_manager and not use_mocked_data:
            try:
                erp_statuses = await self.erp_manager.get_all_platform_statuses()
                if erp_statuses:
                    # Transform ERP statuses to match expected format
                    integrations = []
                    for status in erp_statuses:
                        integrations.append({
                            "id": status.get('platform'),
                            "name": status.get('platform', '').replace('_', ' ').title(),
                            "status": "connected" if status.get('status') == 'success' else 
                                     "error" if status.get('status') == 'failed' else "pending",
                            "last_sync": status.get('last_sync'),
                            "records_synced": status.get('records_count', 0),
                            "data_source": "erp_live"
                        })
                    
                    if integrations:
                        return await self._format_sync_status(integrations)
            except Exception as e:
                print(f"Error getting ERP sync status: {e}")
        
        # Fallback to database integrations (skip DB if mocked data requested)
        if use_mocked_data:
            integrations = await self.db.integrations.find(
                {"user_id": user_id},
                {"_id": 0}
            ).to_list(100)
        else:
            integrations = []
        
        if not integrations and use_mocked_data:
            # Mock integration status only if mock mode is enabled (DON'T save to DB)
            integrations = [
                {
                    "id": "int_1",
                    "name": "Xero",
                    "status": "connected",
                    "last_sync": (datetime.now(timezone.utc) - timedelta(minutes=4)).isoformat(),
                    "user_id": user_id
                },
                {
                    "id": "int_2",
                    "name": "NetSuite",
                    "status": "pending",
                    "last_sync": None,
                    "user_id": user_id
                },
                {
                    "id": "int_3",
                    "name": "SAP",
                    "status": "error",
                    "last_sync": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat(),
                    "user_id": user_id
                },
                {
                    "id": "int_4",
                    "name": "Salesforce",
                    "status": "pending",
                    "last_sync": None,
                    "user_id": user_id
                }
            ]
            # Note: NOT inserting into DB to keep mock data temporary
        
        if not integrations:
            # No data when mock is off
            return {
                "integrations": [],
                "data_latency_minutes": 0,
                "connected_count": 0,
                "total_count": 0,
                "data_source": "no_data"
            }
        
        return await self._format_sync_status(integrations)
    
    async def _format_sync_status(self, integrations: List[Dict]) -> Dict[str, Any]:
        """Format sync status data"""
        # Clean any ObjectId fields
        clean_integrations = []
        for integration in integrations:
            clean_integration = {k: v for k, v in integration.items() if k != "_id"}
            clean_integrations.append(clean_integration)
        
        # Calculate data latency
        connected_integrations = [i for i in clean_integrations if i.get("status") == "connected"]
        
        if connected_integrations:
            syncs_with_time = [i.get("last_sync") for i in connected_integrations if i.get("last_sync")]
            if syncs_with_time:
                # Parse ISO format strings
                sync_times = []
                for sync_time in syncs_with_time:
                    if isinstance(sync_time, str):
                        sync_dt = datetime.fromisoformat(sync_time.replace('Z', '+00:00'))
                    else:
                        sync_dt = sync_time
                    if sync_dt.tzinfo is None:
                        sync_dt = sync_dt.replace(tzinfo=timezone.utc)
                    sync_times.append(sync_dt)
                
                latest_sync = max(sync_times)
                latency_minutes = (datetime.now(timezone.utc) - latest_sync).total_seconds() / 60
            else:
                latency_minutes = 0
        else:
            latency_minutes = 0
        
        return {
            "integrations": clean_integrations,
            "data_latency_minutes": round(latency_minutes, 1),
            "connected_count": len([i for i in clean_integrations if i.get("status") == "connected"]),
            "total_count": len(clean_integrations)
        }
    
    async def detect_anomalies(self, user_id: str, metrics: Dict[str, float]) -> List[Dict[str, Any]]:
        """Detect anomalies in metrics using 2 standard deviation threshold"""
        anomalies = []
        
        # Get historical metrics for comparison
        historical = await self.db.dashboard_metrics_history.find(
            {"user_id": user_id},
            {"_id": 0}
        ).sort("timestamp", -1).limit(90).to_list(90)  # Last 90 days
        
        if len(historical) < 7:  # Need at least a week of data
            return anomalies
        
        # Check each metric
        for metric_name, current_value in metrics.items():
            historical_values = [h.get(metric_name) for h in historical if h.get(metric_name) is not None]
            
            if len(historical_values) < 7:
                continue
            
            mean = statistics.mean(historical_values)
            stdev = statistics.stdev(historical_values)
            
            # Check if current value deviates by more than 2 standard deviations
            if abs(current_value - mean) > (2 * stdev):
                anomalies.append({
                    "metric": metric_name,
                    "current_value": current_value,
                    "expected_range": [mean - 2*stdev, mean + 2*stdev],
                    "deviation_percent": ((current_value - mean) / mean * 100) if mean != 0 else 0
                })
        
        return anomalies