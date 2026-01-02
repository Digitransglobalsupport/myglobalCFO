from typing import Dict, Any, List
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from dotenv import load_dotenv

load_dotenv()

class AINavigationService:
    """Service for generating AI-powered narratives for CFO dashboard"""
    
    def __init__(self):
        self.api_key = os.environ.get("EMERGENT_LLM_KEY")
    
    async def generate_narrative(self, dashboard_data: Dict[str, Any]) -> str:
        """Generate a 3-sentence executive narrative based on dashboard data"""
        
        # Extract key metrics
        liquidity = dashboard_data.get("liquidity_strip", {})
        profitability = dashboard_data.get("profitability", {})
        efficiency = dashboard_data.get("efficiency", {})
        strategic = dashboard_data.get("strategic", {})
        anomalies = dashboard_data.get("anomalies", [])
        
        # Calculate safe DSO average
        dso_entities = efficiency.get('dso_by_entity', [])
        avg_dso = (sum([d['dso'] for d in dso_entities]) / len(dso_entities)) if dso_entities else 0
        
        # Build context for AI
        context = f"""
You are a CFO's AI assistant. Generate a concise 3-sentence executive summary based on the following financial data:

Liquidity:
- Group Net Cash: ${liquidity.get('group_net_cash', 0):,.0f}
- Liquidity Ratio: {liquidity.get('liquidity_ratio', 0)}
- Intercompany In-Flight: ${liquidity.get('intercompany_in_flight', 0):,.0f}

Profitability:
- Top Product: {profitability.get('waterfall_data', {}).get('gross_revenue', 0):,.0f} revenue
- Net Profit: ${profitability.get('waterfall_data', {}).get('net_profit', 0):,.0f}

Operational Efficiency:
- Close Progress: {efficiency.get('close_progress', 0)}%
- Average DSO: {avg_dso:,.0f} days

Strategic:
- Proposed Asset NPV: ${strategic.get('asset_investment_npv', 0):,.0f}

Anomalies Detected: {len(anomalies)}

Generate a 3-sentence narrative that:
1. Highlights the most important financial trend or concern
2. Explains one operational insight
3. Provides one strategic recommendation

Be specific, use numbers, and write in a professional CFO tone. Do not use bullet points.
"""
        
        try:
            # Initialize Claude Sonnet 4 chat
            chat = LlmChat(
                api_key=self.api_key,
                session_id="cfo_narrative",
                system_message="You are a financial expert providing executive summaries for CFOs."
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            
            # Create user message
            user_message = UserMessage(text=context)
            
            # Get response
            response = await chat.send_message(user_message)
            
            return response.strip()
        
        except Exception as e:
            # Fallback narrative if AI fails
            return (
                f"Group cash stands at ${liquidity.get('group_net_cash', 0):,.0f} with a liquidity ratio of "
                f"{liquidity.get('liquidity_ratio', 0)}, indicating {'healthy' if liquidity.get('liquidity_ratio', 0) > 1.5 else 'tight'} cash position. "
                f"Close progress is at {efficiency.get('close_progress', 0)}% with {efficiency.get('sod_violations_count', 0)} control violations requiring attention. "
                f"Consider {'approving' if strategic.get('asset_investment_npv', 0) > 0 else 'deferring'} the proposed asset investments "
                f"given current liquidity position."
            )