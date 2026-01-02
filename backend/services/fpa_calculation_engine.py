"""
FP&A Calculation Engine
Real-time calculation of formulas and driver-based models
"""

import re
import math
from typing import Dict, List, Any, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class CalculationEngine:
    """Engine for calculating driver-based formulas"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        
    async def calculate_formula(
        self,
        formula_id: str,
        version_id: str,
        time_period: str,
        entity_id: Optional[str] = None,
        department_id: Optional[str] = None
    ) -> Optional[float]:
        """
        Calculate a formula for a specific context
        
        Args:
            formula_id: Formula to calculate
            version_id: Planning version
            time_period: Time period (YYYY-MM)
            entity_id: Optional entity filter
            department_id: Optional department filter
            
        Returns:
            Calculated value or None if cannot calculate
        """
        try:
            # Get formula
            formula = await self.db.formulas.find_one(
                {"id": formula_id, "is_active": True},
                {"_id": 0}
            )
            
            if not formula:
                logger.error(f"Formula {formula_id} not found")
                return None
            
            # Get dependency values
            dependency_values = await self._get_dependency_values(
                formula["dependencies"],
                version_id,
                time_period,
                entity_id,
                department_id
            )
            
            if dependency_values is None:
                logger.warning(f"Could not resolve all dependencies for formula {formula_id}")
                return None
            
            # Evaluate expression
            result = self._evaluate_expression(formula["expression"], dependency_values)
            
            return result
            
        except Exception as e:
            logger.error(f"Error calculating formula {formula_id}: {str(e)}")
            return None
    
    async def recalculate_dependent_accounts(
        self,
        changed_driver_ids: List[str],
        version_id: str,
        time_period: str,
        entity_id: Optional[str] = None,
        department_id: Optional[str] = None,
        user_id: str = None
    ) -> Dict[str, Any]:
        """
        Recalculate all accounts that depend on changed drivers
        
        Args:
            changed_driver_ids: List of driver IDs that changed
            version_id: Planning version
            time_period: Time period
            entity_id: Optional entity filter
            department_id: Optional department filter
            user_id: User making the change
            
        Returns:
            Dict with calculation results
        """
        results = {
            "calculated": 0,
            "failed": 0,
            "updated_accounts": []
        }
        
        try:
            # Get all driver codes for changed drivers
            drivers = await self.db.drivers.find(
                {"id": {"$in": changed_driver_ids}},
                {"_id": 0, "id": 1, "code": 1}
            ).to_list(None)
            
            changed_codes = [d["code"] for d in drivers]
            
            # Find all formulas that depend on these drivers
            formulas = await self.db.formulas.find(
                {
                    "is_active": True,
                    "dependencies": {"$in": changed_codes}
                },
                {"_id": 0}
            ).to_list(None)
            
            # Calculate each formula
            for formula in formulas:
                # Check dimension filters
                if formula.get("entity_id") and formula["entity_id"] != entity_id:
                    continue
                if formula.get("department_id") and formula["department_id"] != department_id:
                    continue
                
                # Calculate
                calculated_value = await self.calculate_formula(
                    formula["id"],
                    version_id,
                    time_period,
                    entity_id,
                    department_id
                )
                
                if calculated_value is not None:
                    # Update planning data
                    await self._update_planning_data(
                        version_id=version_id,
                        account_id=formula["account_id"],
                        time_period=time_period,
                        entity_id=entity_id,
                        department_id=department_id,
                        value=calculated_value,
                        user_id=user_id
                    )
                    
                    results["calculated"] += 1
                    results["updated_accounts"].append({
                        "account_id": formula["account_id"],
                        "value": calculated_value
                    })
                else:
                    results["failed"] += 1
            
            return results
            
        except Exception as e:
            logger.error(f"Error recalculating accounts: {str(e)}")
            return results
    
    async def _get_dependency_values(
        self,
        dependencies: List[str],
        version_id: str,
        time_period: str,
        entity_id: Optional[str],
        department_id: Optional[str]
    ) -> Optional[Dict[str, float]]:
        """Get values for all dependencies (drivers or other accounts)"""
        values = {}
        
        for dep_code in dependencies:
            # Try to get as driver first
            driver = await self.db.drivers.find_one(
                {"code": dep_code, "is_active": True},
                {"_id": 0}
            )
            
            if driver:
                # Get driver value
                query = {
                    "driver_id": driver["id"],
                    "version_id": version_id,
                    "time_period": time_period
                }
                
                if entity_id:
                    query["entity_id"] = entity_id
                if department_id:
                    query["department_id"] = department_id
                
                driver_value = await self.db.driver_values.find_one(query, {"_id": 0})
                
                if driver_value:
                    values[dep_code] = driver_value["value"]
                else:
                    logger.warning(f"Driver value not found for {dep_code}")
                    return None
            else:
                # Try to get as account
                account = await self.db.accounts.find_one(
                    {"code": dep_code, "is_active": True},
                    {"_id": 0}
                )
                
                if account:
                    # Get planning data value
                    query = {
                        "version_id": version_id,
                        "account_id": account["id"],
                        "time_period": time_period
                    }
                    
                    if entity_id:
                        query["entity_id"] = entity_id
                    if department_id:
                        query["department_id"] = department_id
                    
                    planning_data = await self.db.planning_data.find_one(query, {"_id": 0})
                    
                    if planning_data:
                        values[dep_code] = planning_data["value"]
                    else:
                        logger.warning(f"Planning data not found for account {dep_code}")
                        return None
                else:
                    logger.error(f"Dependency {dep_code} not found as driver or account")
                    return None
        
        return values
    
    def _evaluate_expression(self, expression: str, values: Dict[str, float]) -> Optional[float]:
        """
        Safely evaluate a mathematical expression
        
        Args:
            expression: Formula expression (e.g., "HC_SALES * AVG_SALARY * (1 + INFLATION)")
            values: Dict of variable values
            
        Returns:
            Calculated result or None
        """
        try:
            # Replace variable names with values
            eval_expression = expression
            
            for var_name, var_value in values.items():
                # Use word boundaries to avoid partial replacements
                eval_expression = re.sub(
                    r'\b' + re.escape(var_name) + r'\b',
                    str(var_value),
                    eval_expression
                )
            
            # Safe evaluation with limited namespace
            allowed_names = {
                "abs": abs,
                "round": round,
                "min": min,
                "max": max,
                "sum": sum,
                "pow": pow,
                "sqrt": math.sqrt,
            }
            
            # Evaluate
            result = eval(eval_expression, {"__builtins__": {}}, allowed_names)
            
            return float(result)
            
        except Exception as e:
            logger.error(f"Error evaluating expression '{expression}': {str(e)}")
            return None
    
    async def _update_planning_data(
        self,
        version_id: str,
        account_id: str,
        time_period: str,
        entity_id: str,
        department_id: str,
        value: float,
        user_id: str
    ):
        """Update or insert planning data"""
        query = {
            "version_id": version_id,
            "account_id": account_id,
            "time_period": time_period,
            "entity_id": entity_id,
            "department_id": department_id
        }
        
        existing = await self.db.planning_data.find_one(query, {"_id": 0})
        
        if existing:
            # Update
            await self.db.planning_data.update_one(
                {"id": existing["id"]},
                {
                    "$set": {
                        "value": value,
                        "previous_value": existing.get("value"),
                        "updated_by": user_id,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
        else:
            # Insert
            import uuid
            new_data = {
                "id": str(uuid.uuid4()),
                "version_id": version_id,
                "account_id": account_id,
                "time_period": time_period,
                "entity_id": entity_id,
                "department_id": department_id,
                "value": value,
                "created_by": user_id,
                "updated_by": user_id,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "notes": "Auto-calculated from formula"
            }
            await self.db.planning_data.insert_one(new_data)
    
    async def validate_formula(self, expression: str, dependencies: List[str]) -> Dict[str, Any]:
        """
        Validate a formula expression
        
        Returns:
            Dict with validation results
        """
        result = {
            "valid": False,
            "errors": [],
            "warnings": []
        }
        
        try:
            # Check for dangerous operations
            dangerous_keywords = ["import", "exec", "eval", "__", "open", "file"]
            for keyword in dangerous_keywords:
                if keyword in expression.lower():
                    result["errors"].append(f"Forbidden keyword: {keyword}")
                    return result
            
            # Check all dependencies are referenced in expression
            for dep in dependencies:
                if dep not in expression:
                    result["warnings"].append(f"Dependency '{dep}' not used in expression")
            
            # Try to evaluate with dummy values
            dummy_values = {dep: 1.0 for dep in dependencies}
            test_result = self._evaluate_expression(expression, dummy_values)
            
            if test_result is None:
                result["errors"].append("Expression evaluation failed")
            else:
                result["valid"] = True
            
            return result
            
        except Exception as e:
            result["errors"].append(str(e))
            return result
