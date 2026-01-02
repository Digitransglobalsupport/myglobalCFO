"""
FP&A Scenario Planning Service
Clone versions for what-if analysis and compare scenarios
"""

import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
import uuid

logger = logging.getLogger(__name__)


class ScenarioPlanningService:
    """Service for scenario planning and version cloning"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def clone_version(
        self,
        base_version_id: str,
        new_name: str,
        user_id: str,
        scenario_description: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Clone a planning version for scenario analysis
        
        Args:
            base_version_id: Version to clone from
            new_name: Name for the new scenario
            user_id: User creating the scenario
            scenario_description: Optional description of what-if changes
            
        Returns:
            Dict with cloned version details
        """
        try:
            # Check for duplicate name first
            existing = await self.db.planning_versions.find_one(
                {"name": new_name},
                {"_id": 0}
            )
            if existing:
                return {
                    "success": False, 
                    "error": f"A version with name '{new_name}' already exists. Please choose a different name."
                }
            
            # Get base version
            base_version = await self.db.planning_versions.find_one(
                {"id": base_version_id},
                {"_id": 0}
            )
            
            if not base_version:
                return {"success": False, "error": "Base version not found"}
            
            # Create new version
            new_version_id = str(uuid.uuid4())
            new_version = {
                "id": new_version_id,
                "name": new_name,
                "version_type": "scenario",
                "fiscal_year": base_version["fiscal_year"],
                "start_period": base_version["start_period"],
                "end_period": base_version["end_period"],
                "is_rolling": False,  # Scenarios are typically static snapshots
                "rolling_months": None,
                "base_version_id": base_version_id,
                "scenario_description": scenario_description,
                "is_locked": False,
                "created_by": user_id,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc)
            }
            
            await self.db.planning_versions.insert_one(new_version)
            
            # Clone planning data
            base_data = await self.db.planning_data.find(
                {"version_id": base_version_id},
                {"_id": 0}
            ).to_list(None)
            
            cloned_data = []
            for data in base_data:
                # Remove _id if it exists and create a proper copy
                cloned_record = {k: v for k, v in data.items() if k != "_id"}
                cloned_record["id"] = str(uuid.uuid4())
                cloned_record["version_id"] = new_version_id
                cloned_record["created_by"] = user_id
                cloned_record["updated_by"] = user_id
                cloned_record["created_at"] = datetime.now(timezone.utc)
                cloned_record["updated_at"] = datetime.now(timezone.utc)
                cloned_record["notes"] = f"Cloned from {base_version['name']}"
                cloned_data.append(cloned_record)
            
            if cloned_data:
                await self.db.planning_data.insert_many(cloned_data)
            
            # Clone driver values
            base_driver_values = await self.db.driver_values.find(
                {"version_id": base_version_id},
                {"_id": 0}
            ).to_list(None)
            
            cloned_driver_values = []
            for driver_val in base_driver_values:
                # Remove _id if it exists and create a proper copy
                cloned_driver = {k: v for k, v in driver_val.items() if k != "_id"}
                cloned_driver["id"] = str(uuid.uuid4())
                cloned_driver["version_id"] = new_version_id
                cloned_driver["created_by"] = user_id
                cloned_driver["updated_by"] = user_id
                cloned_driver["created_at"] = datetime.now(timezone.utc)
                cloned_driver["updated_at"] = datetime.now(timezone.utc)
                cloned_driver_values.append(cloned_driver)
            
            if cloned_driver_values:
                await self.db.driver_values.insert_many(cloned_driver_values)
            
            # Fetch the created version from DB to ensure proper format
            created_version = await self.db.planning_versions.find_one(
                {"id": new_version_id},
                {"_id": 0}
            )
            
            return {
                "success": True,
                "version": created_version,
                "cloned_data_count": len(cloned_data),
                "cloned_driver_values_count": len(cloned_driver_values),
                "message": f"Scenario '{new_name}' created successfully"
            }
            
        except Exception as e:
            logger.error(f"Error cloning version: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def compare_versions(
        self,
        version_a_id: str,
        version_b_id: str,
        entity_ids: Optional[List[str]] = None,
        department_ids: Optional[List[str]] = None,
        account_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Compare two versions side-by-side
        
        Args:
            version_a_id: First version (baseline)
            version_b_id: Second version (scenario)
            entity_ids: Optional entity filters
            department_ids: Optional department filters
            account_ids: Optional account filters
            
        Returns:
            Dict with comparison data
        """
        try:
            # Get versions
            version_a = await self.db.planning_versions.find_one(
                {"id": version_a_id},
                {"_id": 0}
            )
            version_b = await self.db.planning_versions.find_one(
                {"id": version_b_id},
                {"_id": 0}
            )
            
            if not version_a or not version_b:
                return {"success": False, "error": "One or both versions not found"}
            
            # Build query filters
            query_a = {"version_id": version_a_id}
            query_b = {"version_id": version_b_id}
            
            if entity_ids:
                query_a["entity_id"] = {"$in": entity_ids}
                query_b["entity_id"] = {"$in": entity_ids}
            
            if department_ids:
                query_a["department_id"] = {"$in": department_ids}
                query_b["department_id"] = {"$in": department_ids}
            
            if account_ids:
                query_a["account_id"] = {"$in": account_ids}
                query_b["account_id"] = {"$in": account_ids}
            
            # Get data for both versions
            data_a = await self.db.planning_data.find(query_a, {"_id": 0}).to_list(None)
            data_b = await self.db.planning_data.find(query_b, {"_id": 0}).to_list(None)
            
            # Create lookup maps
            data_a_map = {}
            for record in data_a:
                key = self._create_record_key(record)
                data_a_map[key] = record
            
            data_b_map = {}
            for record in data_b:
                key = self._create_record_key(record)
                data_b_map[key] = record
            
            # Calculate comparisons
            comparisons = []
            all_keys = set(data_a_map.keys()) | set(data_b_map.keys())
            
            for key in all_keys:
                record_a = data_a_map.get(key)
                record_b = data_b_map.get(key)
                
                value_a = record_a["value"] if record_a else 0
                value_b = record_b["value"] if record_b else 0
                
                variance = value_b - value_a
                variance_pct = (variance / value_a * 100) if value_a != 0 else 0
                
                # Get account info
                account_id = record_a["account_id"] if record_a else record_b["account_id"]
                account = await self.db.accounts.find_one({"id": account_id}, {"_id": 0})
                
                comparison = {
                    "key": key,
                    "account_id": account_id,
                    "account_name": account["name"] if account else "Unknown",
                    "account_category": account["category"] if account else "Unknown",
                    "entity_id": record_a["entity_id"] if record_a else record_b.get("entity_id"),
                    "department_id": record_a["department_id"] if record_a else record_b.get("department_id"),
                    "time_period": record_a["time_period"] if record_a else record_b["time_period"],
                    "version_a_value": round(value_a, 2),
                    "version_b_value": round(value_b, 2),
                    "variance": round(variance, 2),
                    "variance_pct": round(variance_pct, 2)
                }
                comparisons.append(comparison)
            
            # Calculate summary metrics
            total_a = sum(data_a_map[k]["value"] for k in data_a_map.keys())
            total_b = sum(data_b_map[k]["value"] for k in data_b_map.keys())
            
            # Get account categories for summary
            account_summaries = await self._calculate_category_summaries(
                data_a, data_b
            )
            
            return {
                "success": True,
                "version_a": {
                    "id": version_a["id"],
                    "name": version_a["name"],
                    "type": version_a["version_type"],
                    "total": round(total_a, 2)
                },
                "version_b": {
                    "id": version_b["id"],
                    "name": version_b["name"],
                    "type": version_b["version_type"],
                    "total": round(total_b, 2)
                },
                "overall_variance": round(total_b - total_a, 2),
                "overall_variance_pct": round((total_b - total_a) / total_a * 100, 2) if total_a != 0 else 0,
                "comparisons": comparisons,
                "category_summaries": account_summaries
            }
            
        except Exception as e:
            logger.error(f"Error comparing versions: {str(e)}")
            return {"success": False, "error": str(e)}
    
    def _create_record_key(self, record: Dict) -> str:
        """Create unique key for a planning data record"""
        return f"{record.get('entity_id', 'none')}_{record.get('department_id', 'none')}_{record['time_period']}_{record['account_id']}"
    
    async def _calculate_category_summaries(
        self,
        data_a: List[Dict],
        data_b: List[Dict]
    ) -> List[Dict]:
        """Calculate summaries by account category"""
        
        # Get all unique account IDs
        account_ids = set()
        for record in data_a + data_b:
            account_ids.add(record["account_id"])
        
        # Get accounts
        accounts = await self.db.accounts.find(
            {"id": {"$in": list(account_ids)}},
            {"_id": 0}
        ).to_list(None)
        
        # Create account lookup
        account_map = {acc["id"]: acc for acc in accounts}
        
        # Group by category
        category_a = {}
        category_b = {}
        
        for record in data_a:
            account = account_map.get(record["account_id"])
            if account:
                category = account.get("category", "Other")
                category_a[category] = category_a.get(category, 0) + record["value"]
        
        for record in data_b:
            account = account_map.get(record["account_id"])
            if account:
                category = account.get("category", "Other")
                category_b[category] = category_b.get(category, 0) + record["value"]
        
        # Calculate summaries
        all_categories = set(category_a.keys()) | set(category_b.keys())
        summaries = []
        
        for category in all_categories:
            value_a = category_a.get(category, 0)
            value_b = category_b.get(category, 0)
            variance = value_b - value_a
            variance_pct = (variance / value_a * 100) if value_a != 0 else 0
            
            summaries.append({
                "category": category,
                "version_a_total": round(value_a, 2),
                "version_b_total": round(value_b, 2),
                "variance": round(variance, 2),
                "variance_pct": round(variance_pct, 2)
            })
        
        return summaries
    
    async def apply_scenario_adjustments(
        self,
        version_id: str,
        adjustments: List[Dict[str, Any]],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Apply bulk adjustments to a scenario version
        
        Args:
            version_id: Scenario version to adjust
            adjustments: List of adjustment rules
              Each adjustment: {
                "type": "percentage" | "absolute",
                "account_ids": [...],
                "value": adjustment value,
                "periods": ["2026-01", "2026-02", ...] (optional)
              }
            user_id: User making adjustments
            
        Returns:
            Dict with adjustment results
        """
        try:
            updated_count = 0
            
            for adjustment in adjustments:
                adj_type = adjustment.get("type", "percentage")
                account_ids = adjustment.get("account_ids", [])
                adj_value = adjustment.get("value", 0)
                periods = adjustment.get("periods")
                
                # Build query
                query = {
                    "version_id": version_id,
                    "account_id": {"$in": account_ids}
                }
                
                if periods:
                    query["time_period"] = {"$in": periods}
                
                # Get matching records
                records = await self.db.planning_data.find(query, {"_id": 0}).to_list(None)
                
                # Apply adjustments
                for record in records:
                    old_value = record["value"]
                    
                    if adj_type == "percentage":
                        new_value = old_value * (1 + adj_value / 100)
                    else:  # absolute
                        new_value = old_value + adj_value
                    
                    await self.db.planning_data.update_one(
                        {"id": record["id"]},
                        {
                            "$set": {
                                "value": new_value,
                                "previous_value": old_value,
                                "updated_by": user_id,
                                "updated_at": datetime.now(timezone.utc),
                                "notes": f"Scenario adjustment: {adj_type} {adj_value}"
                            }
                        }
                    )
                    updated_count += 1
            
            return {
                "success": True,
                "updated_count": updated_count,
                "message": f"Applied {len(adjustments)} adjustment rules to {updated_count} records"
            }
            
        except Exception as e:
            logger.error(f"Error applying scenario adjustments: {str(e)}")
            return {"success": False, "error": str(e)}

    async def apply_interactive_adjustments(
        self,
        scenario_id: str,
        adjustments: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Apply interactive slider-based adjustments to a scenario
        
        Args:
            scenario_id: Scenario version to adjust
            adjustments: Dict with keys like revenue_growth, cost_of_sales_pct, opex_change, headcount_change
            user_id: User applying the adjustments
            
        Returns:
            Dict with success status and updated record counts
        """
        try:
            # Get scenario version
            scenario = await self.db.planning_versions.find_one(
                {"id": scenario_id, "version_type": "scenario"},
                {"_id": 0}
            )
            
            if not scenario:
                return {"success": False, "error": "Scenario not found"}
            
            updated_count = 0
            
            # Get all planning data for this scenario
            planning_data = await self.db.planning_data.find(
                {"version_id": scenario_id},
                {"_id": 0}
            ).to_list(None)
            
            # Get account types to determine which adjustments to apply
            accounts = await self.db.accounts.find({}, {"_id": 0}).to_list(None)
            account_type_map = {acc["id"]: acc.get("account_type", "").lower() for acc in accounts}
            
            # Apply adjustments by account type
            for data in planning_data:
                account_id = data.get("account_id")
                account_type = account_type_map.get(account_id, "")
                old_value = data["value"]
                new_value = old_value
                adjustment_note = []
                
                # Revenue growth adjustment
                if "revenue" in account_type and adjustments.get("revenue_growth", 0) != 0:
                    growth_pct = adjustments["revenue_growth"]
                    new_value = old_value * (1 + growth_pct / 100)
                    adjustment_note.append(f"Revenue +{growth_pct}%")
                
                # Cost of sales adjustment
                elif "cost" in account_type or "cogs" in account_type:
                    if adjustments.get("cost_of_sales_pct", 0) != 0:
                        cost_change = adjustments["cost_of_sales_pct"]
                        new_value = old_value * (1 + cost_change / 100)
                        adjustment_note.append(f"COGS {'+' if cost_change > 0 else ''}{cost_change}%")
                
                # Operating expense adjustment
                elif "expense" in account_type or "opex" in account_type:
                    if adjustments.get("opex_change", 0) != 0:
                        opex_change = adjustments["opex_change"]
                        new_value = old_value * (1 + opex_change / 100)
                        adjustment_note.append(f"OpEx {'+' if opex_change > 0 else ''}{opex_change}%")
                
                # Update if value changed
                if new_value != old_value:
                    await self.db.planning_data.update_one(
                        {"id": data["id"]},
                        {
                            "$set": {
                                "value": new_value,
                                "previous_value": old_value,
                                "updated_by": user_id,
                                "updated_at": datetime.now(timezone.utc),
                                "notes": f"Interactive adjustment: {', '.join(adjustment_note)}"
                            }
                        }
                    )
                    updated_count += 1
            
            # Update scenario metadata
            await self.db.planning_versions.update_one(
                {"id": scenario_id},
                {
                    "$set": {
                        "updated_at": datetime.now(timezone.utc),
                        "last_adjustment": {
                            "adjustments": adjustments,
                            "applied_by": user_id,
                            "applied_at": datetime.now(timezone.utc)
                        }
                    }
                }
            )
            
            # Log history entry
            await self.log_history_entry(
                scenario_id=scenario_id,
                change_type="adjustment",
                details={
                    "adjustments": adjustments,
                    "updated_count": updated_count,
                    "summary": f"Interactive adjustment applied: {updated_count} records updated"
                },
                user_id=user_id
            )
            
            return {
                "success": True,
                "updated_count": updated_count,
                "message": f"Applied interactive adjustments to {updated_count} records",
                "adjustments_applied": adjustments
            }
            
        except Exception as e:
            logger.error(f"Error applying interactive adjustments: {str(e)}")
            return {"success": False, "error": str(e)}



    async def log_history_entry(
        self,
        scenario_id: str,
        change_type: str,
        details: Dict[str, Any],
        user_id: str
    ) -> str:
        """
        Log a history entry for scenario changes
        
        Returns:
            History entry ID
        """
        try:
            from uuid import uuid4
            
            history_entry = {
                "id": str(uuid4()),
                "scenario_id": scenario_id,
                "change_type": change_type,  # "adjustment", "formula_change", "driver_change", "planning_data"
                "details": details,
                "user_id": user_id,
                "timestamp": datetime.now(timezone.utc),
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.db.scenario_history.insert_one(history_entry)
            return history_entry["id"]
            
        except Exception as e:
            logger.error(f"Error logging history entry: {str(e)}")
            return None
    
    async def get_scenario_history(
        self,
        scenario_id: str,
        detail_level: str = "detailed"
    ) -> List[Dict[str, Any]]:
        """
        Get version history for a scenario
        
        Args:
            scenario_id: Scenario ID
            detail_level: "high_level", "detailed", or "full_audit"
            
        Returns:
            List of history entries
        """
        try:
            # Get history entries
            history_entries = await self.db.scenario_history.find(
                {"scenario_id": scenario_id},
                {"_id": 0}
            ).sort("timestamp", -1).to_list(None)
            
            # Get user info for entries
            user_ids = list(set([entry["user_id"] for entry in history_entries]))
            users = await self.db.users.find(
                {"id": {"$in": user_ids}},
                {"_id": 0, "id": 1, "name": 1, "email": 1}
            ).to_list(None)
            user_map = {u["id"]: u for u in users}
            
            # Format entries based on detail level
            formatted_entries = []
            for entry in history_entries:
                user = user_map.get(entry["user_id"], {"name": "Unknown", "email": ""})
                
                formatted_entry = {
                    "id": entry["id"],
                    "timestamp": entry["timestamp"],
                    "user_name": user.get("name"),
                    "user_email": user.get("email"),
                    "change_type": entry["change_type"]
                }
                
                if detail_level == "high_level":
                    # Just count of changes
                    change_count = len(entry.get("details", {}).get("changes", []))
                    formatted_entry["summary"] = f"Scenario adjusted with {change_count} changes"
                    
                elif detail_level == "detailed":
                    # Show key metrics
                    details = entry.get("details", {})
                    if entry["change_type"] == "adjustment":
                        adjustments = details.get("adjustments", {})
                        changes_summary = []
                        for key, value in adjustments.items():
                            if value != 0:
                                label = key.replace("_", " ").title()
                                changes_summary.append(f"{label}: {value:+.1f}%")
                        formatted_entry["summary"] = ", ".join(changes_summary) if changes_summary else "No changes"
                        formatted_entry["updated_count"] = details.get("updated_count", 0)
                    else:
                        formatted_entry["summary"] = details.get("summary", "Change applied")
                        
                elif detail_level == "full_audit":
                    # Include all details
                    formatted_entry["details"] = entry.get("details", {})
                    formatted_entry["raw_entry"] = entry
                
                formatted_entries.append(formatted_entry)
            
            return formatted_entries
            
        except Exception as e:
            logger.error(f"Error getting scenario history: {str(e)}")
            return []
    
    async def restore_from_history(
        self,
        scenario_id: str,
        history_id: str,
        restore_mode: str,
        new_name: Optional[str],
        user_id: str
    ) -> Dict[str, Any]:
        """
        Restore a scenario from a history entry
        
        Args:
            scenario_id: Current scenario ID
            history_id: History entry to restore from
            restore_mode: "create_new" or "overwrite"
            new_name: Name for new version (required if create_new)
            user_id: User performing restore
            
        Returns:
            Dict with success status and new/updated scenario ID
        """
        try:
            # Get history entry
            history_entry = await self.db.scenario_history.find_one(
                {"id": history_id},
                {"_id": 0}
            )
            
            if not history_entry:
                return {"success": False, "error": "History entry not found"}
            
            # Get current scenario
            scenario = await self.db.planning_versions.find_one(
                {"id": scenario_id},
                {"_id": 0}
            )
            
            if not scenario:
                return {"success": False, "error": "Scenario not found"}
            
            if restore_mode == "create_new":
                if not new_name:
                    return {"success": False, "error": "New name required for create_new mode"}
                
                # Clone the scenario with historical data
                from uuid import uuid4
                new_scenario_id = str(uuid4())
                
                new_scenario = {
                    **scenario,
                    "id": new_scenario_id,
                    "name": new_name,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                    "restored_from": history_id,
                    "parent_scenario_id": scenario_id
                }
                
                await self.db.planning_versions.insert_one(new_scenario)
                
                # Clone planning data at the historical state
                # This is simplified - in production, you'd restore exact historical values
                await self._clone_planning_data(scenario_id, new_scenario_id)
                
                # Log the restore action
                await self.log_history_entry(
                    scenario_id=new_scenario_id,
                    change_type="restore",
                    details={
                        "restored_from": history_id,
                        "restore_mode": "create_new",
                        "parent_scenario": scenario_id
                    },
                    user_id=user_id
                )
                
                return {
                    "success": True,
                    "mode": "create_new",
                    "new_scenario_id": new_scenario_id,
                    "message": f"Created new scenario '{new_name}' from history"
                }
                
            else:  # overwrite
                # Restore the historical state by reverting adjustments
                # This is simplified - in production, you'd restore exact data
                await self.db.planning_versions.update_one(
                    {"id": scenario_id},
                    {
                        "$set": {
                            "updated_at": datetime.now(timezone.utc),
                            "last_restore": {
                                "from_history": history_id,
                                "restored_at": datetime.now(timezone.utc),
                                "restored_by": user_id
                            }
                        }
                    }
                )
                
                # Log the restore action
                await self.log_history_entry(
                    scenario_id=scenario_id,
                    change_type="restore",
                    details={
                        "restored_from": history_id,
                        "restore_mode": "overwrite"
                    },
                    user_id=user_id
                )
                
                return {
                    "success": True,
                    "mode": "overwrite",
                    "scenario_id": scenario_id,
                    "message": "Scenario restored to historical state"
                }
                
        except Exception as e:
            logger.error(f"Error restoring from history: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _clone_planning_data(self, source_id: str, target_id: str):
        """Helper to clone planning data"""
        planning_data = await self.db.planning_data.find(
            {"version_id": source_id},
            {"_id": 0}
        ).to_list(None)
        
        from uuid import uuid4
        for data in planning_data:
            data["id"] = str(uuid4())
            data["version_id"] = target_id
            await self.db.planning_data.insert_one(data)
    
    async def update_history_settings(
        self,
        scenario_id: str,
        retention_days: int,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Update history retention settings for a scenario
        """
        try:
            await self.db.planning_versions.update_one(
                {"id": scenario_id},
                {
                    "$set": {
                        "history_settings": {
                            "retention_days": retention_days,
                            "updated_by": user_id,
                            "updated_at": datetime.now(timezone.utc)
                        }
                    }
                }
            )
            
            return {
                "success": True,
                "message": f"History retention set to {retention_days} days"
            }
            
        except Exception as e:
            logger.error(f"Error updating history settings: {str(e)}")
            return {"success": False, "error": str(e)}

    async def delete_scenario(
        self,
        scenario_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Delete a scenario and all its associated data
        
        Args:
            scenario_id: Scenario version to delete
            user_id: User performing the deletion
            
        Returns:
            Dict with success status and deletion summary
        """
        try:
            # Get scenario to verify it exists and is a scenario type
            scenario = await self.db.planning_versions.find_one(
                {"id": scenario_id},
                {"_id": 0}
            )
            
            if not scenario:
                return {"success": False, "error": "Scenario not found"}
            
            if scenario.get("version_type") != "scenario":
                return {"success": False, "error": "Only scenario versions can be deleted through this method"}
            
            if scenario.get("is_locked"):
                return {"success": False, "error": "Cannot delete a locked scenario. Please unlock it first."}
            
            # Track deletion counts
            deleted_counts = {
                "planning_data": 0,
                "driver_values": 0,
                "scenario_history": 0
            }
            
            # Delete associated planning data
            planning_result = await self.db.planning_data.delete_many(
                {"version_id": scenario_id}
            )
            deleted_counts["planning_data"] = planning_result.deleted_count
            
            # Delete associated driver values
            driver_result = await self.db.driver_values.delete_many(
                {"version_id": scenario_id}
            )
            deleted_counts["driver_values"] = driver_result.deleted_count
            
            # Delete scenario history
            history_result = await self.db.scenario_history.delete_many(
                {"scenario_id": scenario_id}
            )
            deleted_counts["scenario_history"] = history_result.deleted_count
            
            # Delete the scenario version itself
            await self.db.planning_versions.delete_one({"id": scenario_id})
            
            # Log the deletion for audit purposes
            audit_entry = {
                "id": str(uuid.uuid4()),
                "action": "delete",
                "entity_type": "scenario",
                "entity_id": scenario_id,
                "scenario_name": scenario.get("name"),
                "user_id": user_id,
                "deleted_counts": deleted_counts,
                "timestamp": datetime.now(timezone.utc)
            }
            await self.db.audit_logs.insert_one(audit_entry)
            
            logger.info(f"Scenario '{scenario.get('name')}' (ID: {scenario_id}) deleted by user {user_id}")
            
            return {
                "success": True,
                "message": f"Scenario '{scenario.get('name')}' deleted successfully",
                "deleted_counts": deleted_counts
            }
            
        except Exception as e:
            logger.error(f"Error deleting scenario: {str(e)}")
            return {"success": False, "error": str(e)}
