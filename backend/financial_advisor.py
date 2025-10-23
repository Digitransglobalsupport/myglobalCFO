"""
Financial Advisor AI Chat Module
Provides AI-powered financial insights and advice using OpenAI GPT-4o
"""

import os
import asyncio
from datetime import datetime, timezone
from typing import List, Dict, Optional
from emergentintegrations.llm.chat import LlmChat, UserMessage
from dotenv import load_dotenv

load_dotenv()

EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")

class FinancialAdvisor:
    """AI-powered financial advisor using OpenAI GPT-4o"""
    
    def __init__(self):
        self.api_key = EMERGENT_LLM_KEY
        
    def create_system_message(self, entity_data: Optional[Dict] = None, historical_data: Optional[Dict] = None) -> str:
        """Create a context-aware system message for the AI"""
        
        base_message = """You are an expert financial advisor and CFO consultant specializing in business finance, 
operational optimization, and profit margin protection. You provide clear, actionable advice to help businesses 
improve their financial performance.

Your expertise includes:
- Financial analysis and interpretation
- Cost reduction strategies
- Revenue optimization
- Cash flow management
- Profit margin protection
- Operational efficiency improvements
- Industry benchmarking
- Financial forecasting

Always provide:
1. Clear, concise explanations
2. Specific, actionable recommendations
3. Risk assessments where relevant
4. Industry best practices
5. Step-by-step implementation guidance"""

        # Add entity-specific context if available
        if entity_data:
            context = f"""

CURRENT ENTITY CONTEXT:
- Entity Name: {entity_data.get('entity_name', 'N/A')}
- Industry: {entity_data.get('industry', 'N/A')}
- Currency: {entity_data.get('currency', 'EUR')}
"""
            base_message += context
            
        # Add historical data context if available
        if historical_data:
            summary = historical_data.get('summary', {})
            context = f"""

CURRENT FINANCIAL SNAPSHOT:
- Revenue: {summary.get('revenue', 'N/A')}
- EBITDA: {summary.get('ebitda', 'N/A')} (Margin: {summary.get('ebitda_margin', 'N/A')}%)
- Cash Balance: {summary.get('cash_balance', 'N/A')}
- Runway: {summary.get('runway_days', 'N/A')} days
- Revenue Growth: {summary.get('revenue_growth', 'N/A')}%
"""
            base_message += context
            
        base_message += """

Use this context to provide personalized, relevant advice. Always base your recommendations on the specific 
financial situation of this entity."""

        return base_message
    
    async def send_message(self, 
                          session_id: str, 
                          user_message: str,
                          entity_data: Optional[Dict] = None,
                          historical_data: Optional[Dict] = None) -> str:
        """
        Send a message to the AI advisor and get a response
        
        Args:
            session_id: Unique session identifier for conversation persistence
            user_message: The user's question or message
            entity_data: Current entity information
            historical_data: Historical financial data for context
            
        Returns:
            AI response as a string
        """
        
        # Create system message with context
        system_message = self.create_system_message(entity_data, historical_data)
        
        # Initialize chat
        chat = LlmChat(
            api_key=self.api_key,
            session_id=session_id,
            system_message=system_message
        ).with_model("openai", "gpt-4o")
        
        # Create user message
        message = UserMessage(text=user_message)
        
        # Get response
        response = await chat.send_message(message)
        
        return response
    
    @staticmethod
    def get_suggested_questions(entity_data: Optional[Dict] = None) -> List[str]:
        """Generate context-aware suggested questions"""
        
        base_questions = [
            "How can I improve my profit margins?",
            "What are the key metrics I should focus on?",
            "How can I optimize my operational costs?",
            "What strategies can help improve cash flow?",
            "How do I compare to industry benchmarks?",
            "What are the warning signs I should watch for?",
            "How can I increase revenue without increasing costs?",
            "What cost-cutting measures won't hurt my business?"
        ]
        
        # Add entity-specific questions if we have data
        if entity_data:
            industry = entity_data.get('industry', '')
            if industry:
                base_questions.insert(0, f"What are best practices for {industry} businesses?")
                base_questions.insert(1, f"How can I stay competitive in the {industry} industry?")
        
        return base_questions[:8]  # Return top 8 questions
