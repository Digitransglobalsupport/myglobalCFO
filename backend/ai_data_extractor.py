"""
AI-Powered Data Extraction from Invoice/Bill Attachments
Uses Emergent LLM key with Gemini for file analysis
"""
import os
import logging
import json
import tempfile
from typing import Dict, Optional, List
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class AIDataExtractor:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('EMERGENT_LLM_KEY')
        
        if not self.api_key:
            raise ValueError("EMERGENT_LLM_KEY not found in environment variables")
        
        # Initialize LLM chat with Gemini (supports file attachments)
        self.chat = LlmChat(
            api_key=self.api_key,
            session_id=f"invoice_extraction_{datetime.now().strftime('%Y%m%d')}",
            system_message=(
                "You are an expert accounting assistant that extracts structured data from invoices, "
                "bills, and financial documents. You extract information accurately and return it in "
                "valid JSON format. Always extract: invoice_number, invoice_date, due_date, vendor_name, "
                "total_amount, currency, line_items (with description, quantity, unit_price, amount), "
                "tax_amount, and account_category."
            )
        ).with_model("gemini", "gemini-2.0-flash")
    
    async def extract_invoice_data(self, file_path: str, filename: str) -> Optional[Dict]:
        """
        Extract structured invoice data from file using AI
        
        Args:
            file_path: Path to the file (PDF, Excel, CSV)
            filename: Original filename
            
        Returns:
            Dictionary with extracted invoice data or None if extraction fails
        """
        try:
            # Determine MIME type based on file extension
            mime_type = self._get_mime_type(filename)
            
            if not mime_type:
                logger.error(f"Unsupported file type: {filename}")
                return None
            
            # Create file content object
            file_content = FileContentWithMimeType(
                file_path=file_path,
                mime_type=mime_type
            )
            
            # Create extraction prompt
            extraction_prompt = """
Please analyze this document and extract the following invoice/bill information in JSON format:

{
  "invoice_number": "string (invoice or bill number)",
  "invoice_date": "string (format: YYYY-MM-DD)",
  "due_date": "string (format: YYYY-MM-DD, null if not available)",
  "vendor_name": "string (supplier/vendor name)",
  "vendor_email": "string (vendor email if available)",
  "vendor_address": "string (vendor address if available)",
  "total_amount": "number (total amount)",
  "currency": "string (currency code, e.g., USD, GBP)",
  "tax_amount": "number (tax/VAT amount, 0 if not available)",
  "subtotal": "number (amount before tax)",
  "line_items": [
    {
      "description": "string",
      "quantity": "number",
      "unit_price": "number",
      "amount": "number",
      "account_code": "string (if available)"
    }
  ],
  "payment_terms": "string (payment terms if available)",
  "account_category": "string (suggested category: Sales, Expenses, Cost of Sales, etc.)",
  "notes": "string (any additional notes)"
}

Important:
- Extract ALL line items from the document
- Calculate subtotal if not explicitly shown
- Use null for missing optional fields
- Ensure all numbers are numeric (not strings)
- Return ONLY valid JSON, no additional text

Document Analysis:
"""
            
            # Send message to AI with file attachment
            user_message = UserMessage(
                text=extraction_prompt,
                file_contents=[file_content]
            )
            
            response = await self.chat.send_message(user_message)
            
            # Parse JSON response
            invoice_data = self._parse_ai_response(response)
            
            if invoice_data:
                logger.info(f"Successfully extracted data from {filename}")
                logger.debug(f"Extracted data: {json.dumps(invoice_data, indent=2)}")
                return invoice_data
            else:
                logger.error(f"Failed to parse AI response for {filename}")
                return None
        
        except Exception as e:
            logger.error(f"Error extracting data from {filename}: {str(e)}", exc_info=True)
            return None
    
    async def extract_batch(self, files: List[Dict]) -> List[Dict]:
        """
        Extract data from multiple files
        
        Args:
            files: List of dicts with 'path' and 'filename' keys
            
        Returns:
            List of extracted invoice data
        """
        results = []
        
        for file_info in files:
            file_path = file_info.get('path')
            filename = file_info.get('filename')
            
            if not file_path or not filename:
                logger.warning(f"Invalid file info: {file_info}")
                continue
            
            extracted_data = await self.extract_invoice_data(file_path, filename)
            
            if extracted_data:
                extracted_data['source_filename'] = filename
                extracted_data['source_file_path'] = file_path
                results.append(extracted_data)
        
        return results
    
    def _get_mime_type(self, filename: str) -> Optional[str]:
        """Get MIME type based on file extension"""
        ext = filename.lower().split('.')[-1]
        
        mime_types = {
            'pdf': 'application/pdf',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'xls': 'application/vnd.ms-excel',
            'csv': 'text/csv',
            'txt': 'text/plain'
        }
        
        return mime_types.get(ext)
    
    def _parse_ai_response(self, response: str) -> Optional[Dict]:
        """Parse AI response and extract JSON"""
        try:
            # Try to find JSON in response
            response = response.strip()
            
            # Remove markdown code blocks if present
            if response.startswith('```json'):
                response = response[7:]
            if response.startswith('```'):
                response = response[3:]
            if response.endswith('```'):
                response = response[:-3]
            
            response = response.strip()
            
            # Parse JSON
            data = json.loads(response)
            
            # Validate required fields
            required_fields = ['invoice_number', 'vendor_name', 'total_amount']
            
            for field in required_fields:
                if field not in data or not data[field]:
                    logger.warning(f"Missing required field: {field}")
                    return None
            
            return data
        
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            logger.error(f"Response was: {response[:500]}")
            return None
        except Exception as e:
            logger.error(f"Error parsing AI response: {str(e)}")
            return None
    
    async def validate_and_enhance_data(self, invoice_data: Dict) -> Dict:
        """
        Validate extracted data and enhance with additional checks
        """
        try:
            # Ensure dates are in correct format
            if invoice_data.get('invoice_date'):
                invoice_data['invoice_date'] = self._normalize_date(
                    invoice_data['invoice_date']
                )
            
            if invoice_data.get('due_date'):
                invoice_data['due_date'] = self._normalize_date(
                    invoice_data['due_date']
                )
            
            # Ensure amounts are floats
            if 'total_amount' in invoice_data:
                invoice_data['total_amount'] = float(invoice_data['total_amount'])
            
            if 'tax_amount' in invoice_data:
                invoice_data['tax_amount'] = float(invoice_data.get('tax_amount', 0))
            
            if 'subtotal' in invoice_data:
                invoice_data['subtotal'] = float(invoice_data.get('subtotal', 0))
            
            # Validate line items
            if 'line_items' in invoice_data:
                for item in invoice_data['line_items']:
                    item['quantity'] = float(item.get('quantity', 1))
                    item['unit_price'] = float(item.get('unit_price', 0))
                    item['amount'] = float(item.get('amount', 0))
            
            # Add metadata
            invoice_data['extracted_at'] = datetime.now(timezone.utc).isoformat()
            invoice_data['extraction_method'] = 'ai_gemini'
            
            return invoice_data
        
        except Exception as e:
            logger.error(f"Error validating data: {str(e)}")
            return invoice_data
    
    def _normalize_date(self, date_str: str) -> str:
        """Normalize date to YYYY-MM-DD format"""
        try:
            # Try common date formats
            formats = [
                '%Y-%m-%d',
                '%d/%m/%Y',
                '%m/%d/%Y',
                '%d-%m-%Y',
                '%Y/%m/%d',
                '%B %d, %Y',
                '%b %d, %Y',
                '%d %B %Y',
                '%d %b %Y'
            ]
            
            for fmt in formats:
                try:
                    dt = datetime.strptime(date_str, fmt)
                    return dt.strftime('%Y-%m-%d')
                except ValueError:
                    continue
            
            # If no format matches, return original
            return date_str
        
        except Exception:
            return date_str
