"""
FP&A AI Service
AI-powered predictive modeling for Financial Planning & Analysis
"""

import asyncio
import json
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple
import logging

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

class FPAAIService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        
    async def generate_baseline_forecast(
        self, 
        historical_data: List[Dict], 
        business_context: str,
        forecast_periods: int = 12
    ) -> Dict:
        """
        Generate AI-powered baseline forecast from historical data
        
        Args:
            historical_data: List of historical financial data points
            business_context: Business context and assumptions
            forecast_periods: Number of future periods to forecast
            
        Returns:
            Dictionary containing forecasted values, confidence scores, and explanations
        """
        try:
            # Create new chat session for this forecast
            session_id = f"fpa_forecast_{uuid.uuid4().hex[:8]}"
            
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message="""You are an expert financial analyst and forecasting specialist. 
                You analyze historical financial data and generate accurate baseline forecasts with confidence scores.
                
                Your tasks:
                1. Analyze historical trends, seasonality, and growth patterns
                2. Generate realistic forecasts for future periods
                3. Provide confidence scores (0-100%) for each prediction
                4. Explain your reasoning and key assumptions
                5. Identify potential risks and opportunities
                
                Always respond in valid JSON format with clear explanations."""
            ).with_model("openai", "gpt-5")
            
            # Prepare the prompt with historical data
            historical_summary = self._summarize_historical_data(historical_data)
            
            prompt = f"""
            Analyze this historical financial data and generate a baseline forecast:
            
            HISTORICAL DATA:
            {historical_summary}
            
            BUSINESS CONTEXT:
            {business_context}
            
            FORECAST REQUIREMENTS:
            - Generate forecasts for the next {forecast_periods} periods
            - Include confidence scores (0-100%) for each prediction
            - Explain key trends and assumptions
            - Identify potential risks and opportunities
            
            Respond in this JSON format:
            {{
                "forecast_data": [
                    {{
                        "period": "2025-01",
                        "predicted_value": 125000.00,
                        "confidence_score": 85,
                        "reasoning": "Based on 12% YoY growth trend and seasonal factors"
                    }}
                ],
                "overall_confidence": 82,
                "key_assumptions": ["Continued market growth", "No major economic disruption"],
                "trends_identified": ["Strong Q4 seasonality", "Consistent monthly growth"],
                "risk_factors": ["Economic uncertainty", "Competitive pressure"],
                "opportunities": ["New product launch potential", "Market expansion"]
            }}
            """
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            # Parse AI response
            try:
                forecast_result = json.loads(response)
                
                # Add metadata
                forecast_result["generated_at"] = datetime.now(timezone.utc).isoformat()
                forecast_result["model_used"] = "gpt-5"
                forecast_result["forecast_periods"] = forecast_periods
                
                return forecast_result
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse AI response: {e}")
                return self._create_fallback_forecast(historical_data, forecast_periods)
                
        except Exception as e:
            logger.error(f"Forecast generation failed: {e}")
            return self._create_fallback_forecast(historical_data, forecast_periods)
    
    async def detect_anomalies(
        self, 
        actual_data: List[Dict], 
        forecast_data: List[Dict],
        threshold: float = 0.15
    ) -> Dict:
        """
        Detect anomalies by comparing actual vs forecast data
        
        Args:
            actual_data: Actual financial results
            forecast_data: Previous forecasted values
            threshold: Variance threshold for anomaly detection (default 15%)
            
        Returns:
            Dictionary containing detected anomalies and AI explanations
        """
        try:
            session_id = f"fpa_anomaly_{uuid.uuid4().hex[:8]}"
            
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message="""You are a financial variance analysis expert. 
                You identify anomalies in actual vs forecast performance and provide insightful explanations.
                
                Your tasks:
                1. Compare actual vs forecasted values
                2. Identify significant variances and anomalies
                3. Explain potential causes for each anomaly
                4. Categorize anomalies by severity and type
                5. Provide actionable recommendations
                
                Always respond in valid JSON format."""
            ).with_model("openai", "gpt-5")
            
            # Prepare variance analysis data
            variance_analysis = self._calculate_variances(actual_data, forecast_data, threshold)
            
            prompt = f"""
            Analyze these actual vs forecast variances and explain the anomalies:
            
            VARIANCE ANALYSIS:
            {json.dumps(variance_analysis, indent=2)}
            
            DETECTION THRESHOLD: {threshold * 100}%
            
            Identify and explain significant variances. Respond in this JSON format:
            {{
                "anomalies_detected": [
                    {{
                        "period": "2025-01",
                        "account": "Revenue",
                        "actual": 120000,
                        "forecast": 100000,
                        "variance_percent": 20.0,
                        "severity": "high",
                        "type": "positive",
                        "explanation": "Revenue exceeded forecast due to new product launch success",
                        "potential_causes": ["New product launch", "Market expansion", "Pricing optimization"],
                        "recommendation": "Adjust future forecasts to reflect new baseline performance"
                    }}
                ],
                "summary": {{
                    "total_anomalies": 3,
                    "high_severity": 1,
                    "medium_severity": 2,
                    "positive_variances": 2,
                    "negative_variances": 1
                }},
                "overall_assessment": "Generally positive performance with revenue outperforming expectations",
                "key_insights": ["Strong revenue growth", "Cost control effective"],
                "recommended_actions": ["Update revenue forecasts", "Monitor cost trends"]
            }}
            """
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            try:
                anomaly_result = json.loads(response)
                anomaly_result["analyzed_at"] = datetime.now(timezone.utc).isoformat()
                anomaly_result["threshold_used"] = threshold
                return anomaly_result
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse anomaly response: {e}")
                return self._create_fallback_anomaly_result(variance_analysis)
                
        except Exception as e:
            logger.error(f"Anomaly detection failed: {e}")
            return self._create_fallback_anomaly_result([])
    
    async def generate_variance_explanations(
        self, 
        budget_data: List[Dict], 
        actual_data: List[Dict],
        business_events: Optional[List[str]] = None
    ) -> Dict:
        """
        Generate AI explanations for budget vs actual variances
        
        Args:
            budget_data: Budgeted values
            actual_data: Actual results
            business_events: Optional list of known business events
            
        Returns:
            Dictionary containing variance explanations and insights
        """
        try:
            session_id = f"fpa_variance_{uuid.uuid4().hex[:8]}"
            
            chat = LlmChat(
                api_key=self.api_key,
                session_id=session_id,
                system_message="""You are a senior finance business partner who excels at explaining budget variances.
                You provide clear, actionable insights that help management understand performance drivers.
                
                Your tasks:
                1. Analyze budget vs actual variances
                2. Provide clear explanations for each significant variance
                3. Connect variances to business drivers and market conditions
                4. Identify patterns and trends
                5. Recommend corrective actions where needed
                
                Always respond in valid JSON format with business-friendly language."""
            ).with_model("openai", "gpt-5")
            
            # Calculate variances
            variance_data = self._calculate_budget_variances(budget_data, actual_data)
            
            events_context = ""
            if business_events:
                events_context = f"\nKNOWN BUSINESS EVENTS:\n{chr(10).join(business_events)}"
            
            prompt = f"""
            Analyze these budget vs actual variances and provide clear business explanations:
            
            VARIANCE DATA:
            {json.dumps(variance_data, indent=2)}
            {events_context}
            
            Provide explanations that help management understand what happened. Respond in this JSON format:
            {{
                "variance_explanations": [
                    {{
                        "account": "Revenue",
                        "period": "2025-01", 
                        "budget": 100000,
                        "actual": 120000,
                        "variance": 20000,
                        "variance_percent": 20.0,
                        "explanation": "Revenue exceeded budget by 20% primarily due to successful new product launch and stronger than expected market demand",
                        "business_drivers": ["New product launch success", "Market demand strength", "Effective sales execution"],
                        "management_action": "Consider raising revenue guidance for remainder of year"
                    }}
                ],
                "summary_insights": {{
                    "overall_performance": "Strong performance across most metrics with revenue significantly outperforming",
                    "key_drivers": ["Product innovation success", "Market expansion", "Operational efficiency"],
                    "areas_of_concern": ["Rising raw material costs", "Competitive pressure in core markets"],
                    "positive_trends": ["Revenue growth momentum", "Cost control discipline"]
                }},
                "recommendations": [
                    "Update annual revenue forecast based on Q1 outperformance",
                    "Investigate cost increases and implement mitigation strategies",
                    "Continue investment in high-performing product lines"
                ],
                "outlook": "Positive momentum expected to continue with careful monitoring of cost pressures"
            }}
            """
            
            user_message = UserMessage(text=prompt)
            response = await chat.send_message(user_message)
            
            try:
                variance_result = json.loads(response)
                variance_result["analyzed_at"] = datetime.now(timezone.utc).isoformat()
                return variance_result
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse variance response: {e}")
                return self._create_fallback_variance_result(variance_data)
                
        except Exception as e:
            logger.error(f"Variance explanation failed: {e}")
            return self._create_fallback_variance_result([])
    
    # Helper methods
    def _summarize_historical_data(self, data: List[Dict]) -> str:
        """Summarize historical data for AI analysis"""
        if not data:
            return "No historical data available"
            
        summary = []
        for item in data[-12:]:  # Last 12 periods
            period = item.get('period', 'Unknown')
            value = item.get('value', 0)
            account = item.get('account', 'Unknown')
            summary.append(f"{period}: {account} = ${value:,.2f}")
            
        return "\n".join(summary)
    
    def _calculate_variances(self, actual_data: List[Dict], forecast_data: List[Dict], threshold: float) -> List[Dict]:
        """Calculate variances between actual and forecast"""
        variances = []
        
        # Create lookup for forecast data
        forecast_lookup = {
            (item.get('period'), item.get('account')): item.get('value', 0)
            for item in forecast_data
        }
        
        for actual in actual_data:
            period = actual.get('period')
            account = actual.get('account')
            actual_value = actual.get('value', 0)
            
            forecast_value = forecast_lookup.get((period, account), 0)
            
            if forecast_value != 0:
                variance = actual_value - forecast_value
                variance_percent = abs(variance / forecast_value)
                
                if variance_percent >= threshold:
                    variances.append({
                        'period': period,
                        'account': account,
                        'actual': actual_value,
                        'forecast': forecast_value,
                        'variance': variance,
                        'variance_percent': variance_percent * 100
                    })
        
        return variances
    
    def _calculate_budget_variances(self, budget_data: List[Dict], actual_data: List[Dict]) -> List[Dict]:
        """Calculate budget vs actual variances"""
        variances = []
        
        # Create lookup for budget data
        budget_lookup = {
            (item.get('period'), item.get('account')): item.get('value', 0)
            for item in budget_data
        }
        
        for actual in actual_data:
            period = actual.get('period')
            account = actual.get('account')
            actual_value = actual.get('value', 0)
            
            budget_value = budget_lookup.get((period, account), 0)
            
            if budget_value != 0:
                variance = actual_value - budget_value
                variance_percent = (variance / budget_value) * 100
                
                variances.append({
                    'period': period,
                    'account': account,
                    'budget': budget_value,
                    'actual': actual_value,
                    'variance': variance,
                    'variance_percent': variance_percent
                })
        
        return variances
    
    def _create_fallback_forecast(self, historical_data: List[Dict], periods: int) -> Dict:
        """Create basic fallback forecast if AI fails"""
        return {
            "forecast_data": [],
            "overall_confidence": 0,
            "key_assumptions": ["AI analysis unavailable"],
            "trends_identified": [],
            "risk_factors": ["Unable to generate AI forecast"],
            "opportunities": [],
            "error": "AI forecast generation failed",
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
    
    def _create_fallback_anomaly_result(self, variance_data: List[Dict]) -> Dict:
        """Create basic fallback anomaly result if AI fails"""
        return {
            "anomalies_detected": [],
            "summary": {"total_anomalies": 0, "high_severity": 0, "medium_severity": 0},
            "overall_assessment": "AI analysis unavailable",
            "key_insights": [],
            "recommended_actions": [],
            "error": "AI anomaly detection failed",
            "analyzed_at": datetime.now(timezone.utc).isoformat()
        }
    
    def _create_fallback_variance_result(self, variance_data: List[Dict]) -> Dict:
        """Create basic fallback variance result if AI fails"""
        return {
            "variance_explanations": [],
            "summary_insights": {
                "overall_performance": "AI analysis unavailable",
                "key_drivers": [],
                "areas_of_concern": [],
                "positive_trends": []
            },
            "recommendations": [],
            "outlook": "Unable to generate AI insights",
            "error": "AI variance analysis failed",
            "analyzed_at": datetime.now(timezone.utc).isoformat()
        }