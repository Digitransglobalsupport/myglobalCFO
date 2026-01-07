from typing import Dict, Any, List
from emergentintegrations.llm.chat import LlmChat, UserMessage
import os
from dotenv import load_dotenv

load_dotenv()

class AINavigationService:
    """Service for generating AI-powered narratives for CFO dashboard"""
    
    def __init__(self):
        self.api_key = os.environ.get("EMERGENT_LLM_KEY")
    
    async def generate_narrative(self, dashboard_data: Dict[str, Any], company_name: str = "All Entities (Consolidated)", currency: str = "GBP") -> str:
        """Generate a 3-sentence executive narrative based on dashboard data"""
        
        # Currency symbol mapping
        currency_symbols = {
            'GBP': '£', 'USD': '$', 'EUR': '€', 'JPY': '¥', 'CNY': '¥',
            'INR': '₹', 'AUD': 'A$', 'CAD': 'C$', 'CHF': 'CHF', 'SGD': 'S$'
        }
        curr_symbol = currency_symbols.get(currency, currency + ' ')
        
        # Extract key metrics
        liquidity = dashboard_data.get("liquidity_strip", {})
        profitability = dashboard_data.get("profitability", {})
        efficiency = dashboard_data.get("efficiency", {})
        strategic = dashboard_data.get("strategic", {})
        anomalies = dashboard_data.get("anomalies", [])
        
        # Calculate safe DSO average
        dso_entities = efficiency.get('dso_by_entity', [])
        avg_dso = (sum([d['dso'] for d in dso_entities]) / len(dso_entities)) if dso_entities else 0
        
        # Determine if this is a specific entity or consolidated view
        is_consolidated = "All Entities" in company_name or "Consolidated" in company_name
        entity_context = "across all entities" if is_consolidated else f"for {company_name}"
        
        # Build context for AI
        context = f"""
You are a CFO's AI assistant. Generate a concise 3-sentence executive summary for {company_name} based on the following financial data:

Entity Context: {"This is a CONSOLIDATED view combining all entities" if is_consolidated else f"This is a SINGLE ENTITY view for {company_name}"}
Currency: {currency} (use {curr_symbol} symbol for all monetary values)

Liquidity {entity_context}:
- Net Cash: {curr_symbol}{liquidity.get('group_net_cash', 0):,.0f}
- Liquidity Ratio: {liquidity.get('liquidity_ratio', 0)}
- Intercompany In-Flight: {curr_symbol}{liquidity.get('intercompany_in_flight', 0):,.0f}

Profitability {entity_context}:
- Top Product: {profitability.get('waterfall_data', {}).get('gross_revenue', 0):,.0f} revenue
- Net Profit: {curr_symbol}{profitability.get('waterfall_data', {}).get('net_profit', 0):,.0f}

Operational Efficiency {entity_context}:
- Close Progress: {efficiency.get('close_progress', 0)}%
- Average DSO: {avg_dso:,.0f} days

Strategic {entity_context}:
- Proposed Asset NPV: {curr_symbol}{strategic.get('asset_investment_npv', 0):,.0f}

Anomalies Detected: {len(anomalies)}

Generate a 3-sentence narrative that:
1. Highlights the most important financial trend or concern {entity_context}
2. Explains one operational insight specific to {"the consolidated group" if is_consolidated else company_name}
3. Provides one strategic recommendation appropriate for {"multi-entity management" if is_consolidated else "this entity"}

IMPORTANT: Use {curr_symbol} for all monetary amounts in your response.

IMPORTANT: 
- If this is a consolidated view, mention "across the group" or "combined entities" to make it clear
- If this is a single entity, specifically reference {company_name} and provide entity-specific insights
- Be specific, use numbers, and write in a professional CFO tone
- Do not use bullet points
"""
        
        try:
            # Initialize Claude Sonnet 4 chat
            chat = LlmChat(
                api_key=self.api_key,
                session_id="cfo_narrative",
                system_message="You are a financial expert providing executive summaries for CFOs. Pay attention to whether the data is for a single entity or consolidated view."
            ).with_model("anthropic", "claude-sonnet-4-5-20250929")
            
            # Create user message
            user_message = UserMessage(text=context)
            
            # Get response
            response = await chat.send_message(user_message)
            
            return response.strip()
        
        except Exception as e:
            # Fallback narrative if AI fails - now entity-aware with currency symbol
            entity_prefix = f"{company_name} shows" if not is_consolidated else "The consolidated group shows"
            return (
                f"{entity_prefix} cash at {curr_symbol}{liquidity.get('group_net_cash', 0):,.0f} with a liquidity ratio of "
                f"{liquidity.get('liquidity_ratio', 0)}, indicating {'healthy' if liquidity.get('liquidity_ratio', 0) > 1.5 else 'tight'} cash position. "
                f"Close progress is at {efficiency.get('close_progress', 0)}% with {efficiency.get('sod_violations_count', 0)} control violations requiring attention {entity_context}. "
                f"Consider {'approving' if strategic.get('asset_investment_npv', 0) > 0 else 'deferring'} the proposed asset investments "
                f"given current liquidity position {entity_context}."
            )