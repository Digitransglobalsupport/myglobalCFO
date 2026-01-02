"""
FP&A Rolling Forecast Service
Automatically rolls forecasts forward, dropping old months and adding new ones
"""

from datetime import datetime, timezone
from dateutil.relativedelta import relativedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)


class RollingForecastService:
    """Service for managing rolling forecasts"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def roll_forecast_forward(self, version_id: str, user_id: str) -> Dict[str, Any]:
        """
        Roll a forecast forward by one month
        - Drop the oldest month
        - Add a new month at the end
        - Copy data patterns from historical data
        
        Args:
            version_id: Version to roll forward
            user_id: User performing the roll
            
        Returns:
            Dict with roll results
        """
        result = {
            "success": False,
            "dropped_period": None,
            "added_period": None,
            "records_dropped": 0,
            "records_added": 0,
            "error": None
        }
        
        try:
            # Get version
            version = await self.db.planning_versions.find_one(
                {"id": version_id},
                {"_id": 0}
            )
            
            if not version:
                result["error"] = "Version not found"
                return result
            
            if not version.get("is_rolling"):
                result["error"] = "Version is not configured as rolling forecast"
                return result
            
            # Parse current periods
            start_date = datetime.strptime(version["start_period"], "%Y-%m")
            end_date = datetime.strptime(version["end_period"], "%Y-%m")
            
            # Calculate new periods
            new_start_date = start_date + relativedelta(months=1)
            new_end_date = end_date + relativedelta(months=1)
            
            old_period = version["start_period"]
            new_period = new_end_date.strftime("%Y-%m")
            
            # Delete data for the old period
            delete_result = await self.db.planning_data.delete_many({
                "version_id": version_id,
                "time_period": old_period
            })
            
            result["dropped_period"] = old_period
            result["records_dropped"] = delete_result.deleted_count
            
            # Delete driver values for the old period
            await self.db.driver_values.delete_many({
                "version_id": version_id,
                "time_period": old_period
            })
            
            # Update version dates
            await self.db.planning_versions.update_one(
                {"id": version_id},
                {
                    "$set": {
                        "start_period": new_start_date.strftime("%Y-%m"),
                        "end_period": new_period,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            # Create placeholder data for new period (copy structure from previous month)
            previous_period = (new_end_date - relativedelta(months=1)).strftime("%Y-%m")
            
            previous_data = await self.db.planning_data.find(
                {
                    "version_id": version_id,
                    "time_period": previous_period
                },
                {"_id": 0}
            ).to_list(None)
            
            new_records = []
            import uuid
            
            for record in previous_data:
                new_record = {
                    "id": str(uuid.uuid4()),
                    "version_id": version_id,
                    "entity_id": record["entity_id"],
                    "department_id": record["department_id"],
                    "time_period": new_period,
                    "account_id": record["account_id"],
                    "product_id": record.get("product_id"),
                    "customer_segment_id": record.get("customer_segment_id"),
                    "geography_id": record.get("geography_id"),
                    "value": 0.0,  # Placeholder, needs to be filled
                    "created_by": user_id,
                    "updated_by": user_id,
                    "created_at": datetime.now(timezone.utc),
                    "updated_at": datetime.now(timezone.utc),
                    "notes": f"Auto-created by rolling forecast"
                }
                new_records.append(new_record)
            
            if new_records:
                await self.db.planning_data.insert_many(new_records)
                result["records_added"] = len(new_records)
            
            result["added_period"] = new_period
            result["success"] = True
            
            # Log the roll
            await self._log_roll(version_id, old_period, new_period, user_id)
            
            return result
            
        except Exception as e:
            logger.error(f"Error rolling forecast: {str(e)}")
            result["error"] = str(e)
            return result
    
    async def auto_roll_all_forecasts(self, user_id: str) -> Dict[str, Any]:
        """
        Automatically roll all rolling forecasts that need to be rolled
        Should be called at the start of each new month
        
        Args:
            user_id: User ID initiating the auto-roll (or "system" for scheduled jobs)
            
        Returns:
            Summary of rolls performed
        """
        result = {
            "forecasts_rolled": 0,
            "forecasts_skipped": 0,
            "errors": []
        }
        
        try:
            # Get current period
            from datetime import datetime
            current_period = datetime.now(timezone.utc).strftime("%Y-%m")
            
            # Find all rolling forecasts
            versions = await self.db.planning_versions.find(
                {
                    "is_rolling": True,
                    "is_locked": False
                },
                {"_id": 0}
            ).to_list(None)
            
            for version in versions:
                # Check if start period is before current period
                if version["start_period"] < current_period:
                    # Roll forward
                    roll_result = await self.roll_forecast_forward(
                        version["id"],
                        user_id
                    )
                    
                    if roll_result["success"]:
                        result["forecasts_rolled"] += 1
                    else:
                        result["forecasts_skipped"] += 1
                        result["errors"].append({
                            "version_id": version["id"],
                            "error": roll_result.get("error")
                        })
                else:
                    result["forecasts_skipped"] += 1
            
            return result
            
        except Exception as e:
            logger.error(f"Error auto-rolling forecasts: {str(e)}")
            result["errors"].append(str(e))
            return result
    
    async def _log_roll(self, version_id: str, dropped_period: str, added_period: str, user_id: str):
        """Log the rolling action to audit trail"""
        import uuid
        
        log_entry = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "user_email": "system" if user_id == "system" else "user",
            "action": "roll_forecast",
            "entity_type": "planning_version",
            "entity_id": version_id,
            "previous_value": {"dropped_period": dropped_period},
            "new_value": {"added_period": added_period},
            "version_id": version_id,
            "timestamp": datetime.now(timezone.utc)
        }
        
        await self.db.audit_logs.insert_one(log_entry)
