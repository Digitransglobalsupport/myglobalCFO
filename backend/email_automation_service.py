"""
Email Automation Service
Monitors emails every 5 minutes, extracts attachments, and auto-populates accounting software
"""
import os
import logging
import tempfile
from datetime import datetime, timezone
from typing import Dict, List, Optional
from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from dotenv import load_dotenv

from gmail_integration import GmailIntegration
from ai_data_extractor import AIDataExtractor
from accounting_integrations import XeroIntegration, QuickBooksIntegration, SageIntegration

load_dotenv()

logger = logging.getLogger(__name__)

class EmailAutomationService:
    def __init__(self, db_client: AsyncIOMotorClient, db_name: str):
        self.db = db_client[db_name]
        self.gmail = None
        self.ai_extractor = None
        self.xero = None
        self.quickbooks = None
        self.sage = None
        
        # Configuration
        self.keywords = ['invoice', 'bill', 'statement', 'payment', 'receipt']
        self.poll_interval = 300  # 5 minutes in seconds
        self.is_running = False
        
        # Statistics
        self.stats = {
            'emails_processed': 0,
            'attachments_extracted': 0,
            'invoices_created': 0,
            'errors': 0,
            'last_run': None
        }
    
    async def initialize(self):
        """Initialize all integrations"""
        try:
            # Initialize AI data extractor
            self.ai_extractor = AIDataExtractor()
            logger.info("AI data extractor initialized")
            
            # Gmail will be initialized per user connection
            logger.info("Email automation service initialized")
            
        except Exception as e:
            logger.error(f"Error initializing email automation service: {str(e)}")
            raise
    
    async def start_monitoring(self, user_id: str):
        """Start monitoring emails for a specific user"""
        try:
            self.is_running = True
            logger.info(f"Starting email monitoring for user: {user_id}")
            
            while self.is_running:
                try:
                    await self.process_user_emails(user_id)
                    self.stats['last_run'] = datetime.now(timezone.utc).isoformat()
                    
                    # Wait for next poll interval
                    await asyncio.sleep(self.poll_interval)
                
                except Exception as e:
                    logger.error(f"Error in monitoring loop: {str(e)}", exc_info=True)
                    self.stats['errors'] += 1
                    await asyncio.sleep(60)  # Wait 1 minute on error
        
        except Exception as e:
            logger.error(f"Error starting monitoring: {str(e)}")
            self.is_running = False
    
    def stop_monitoring(self):
        """Stop email monitoring"""
        self.is_running = False
        logger.info("Email monitoring stopped")
    
    async def process_user_emails(self, user_id: str):
        """Process emails for a specific user"""
        try:
            logger.info(f"Processing emails for user: {user_id}")
            
            # Get user's email integration settings
            user_settings = await self.db.email_integrations.find_one({
                'user_id': user_id,
                'provider': 'gmail',
                'status': 'active'
            })
            
            if not user_settings:
                logger.warning(f"No active Gmail integration for user: {user_id}")
                return
            
            # Initialize Gmail service
            gmail = GmailIntegration(
                client_id=os.getenv('GMAIL_CLIENT_ID'),
                client_secret=os.getenv('GMAIL_CLIENT_SECRET'),
                redirect_uri=os.getenv('GMAIL_REDIRECT_URI')
            )
            
            service = gmail.get_service(
                user_settings['access_token'],
                user_settings['refresh_token']
            )
            
            # Monitor inbox and extract attachments
            messages, attachments = gmail.monitor_inbox(service, self.keywords)
            
            logger.info(f"Found {len(messages)} messages and {len(attachments)} attachments")
            
            if not attachments:
                return
            
            # Process each attachment
            for attachment_data in attachments:
                await self.process_attachment(user_id, attachment_data)
            
            # Update statistics
            self.stats['emails_processed'] += len(messages)
            self.stats['attachments_extracted'] += len(attachments)
            
        except Exception as e:
            logger.error(f"Error processing user emails: {str(e)}", exc_info=True)
            self.stats['errors'] += 1
    
    async def process_attachment(self, user_id: str, attachment_data: Dict):
        """Process a single attachment"""
        try:
            filename = attachment_data.get('filename')
            file_data = attachment_data.get('data')
            message_id = attachment_data.get('message_id')
            
            if not file_data:
                logger.warning(f"No file data for {filename}")
                return
            
            # Check if already processed
            existing = await self.db.processed_attachments.find_one({
                'message_id': message_id,
                'filename': filename
            })
            
            if existing:
                logger.info(f"Attachment already processed: {filename}")
                return
            
            # Save attachment temporarily
            with tempfile.NamedTemporaryFile(delete=False, suffix=f"_{filename}") as temp_file:
                temp_file.write(file_data)
                temp_file_path = temp_file.name
            
            try:
                # Extract data using AI
                logger.info(f"Extracting data from {filename}")
                invoice_data = await self.ai_extractor.extract_invoice_data(
                    temp_file_path,
                    filename
                )
                
                if not invoice_data:
                    logger.warning(f"Failed to extract data from {filename}")
                    return
                
                # Validate and enhance data
                invoice_data = await self.ai_extractor.validate_and_enhance_data(invoice_data)
                
                # Store extracted data
                extracted_record = {
                    'user_id': user_id,
                    'message_id': message_id,
                    'filename': filename,
                    'subject': attachment_data.get('subject'),
                    'from': attachment_data.get('from'),
                    'date': attachment_data.get('date'),
                    'invoice_data': invoice_data,
                    'extracted_at': datetime.now(timezone.utc),
                    'status': 'extracted',
                    'accounting_status': {}
                }
                
                await self.db.extracted_invoices.insert_one(extracted_record)
                
                # Auto-populate accounting software
                await self.populate_accounting_software(user_id, invoice_data, extracted_record['_id'])
                
                # Mark as processed
                await self.db.processed_attachments.insert_one({
                    'user_id': user_id,
                    'message_id': message_id,
                    'filename': filename,
                    'processed_at': datetime.now(timezone.utc)
                })
                
                logger.info(f"Successfully processed {filename}")
                
            finally:
                # Clean up temp file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
        
        except Exception as e:
            logger.error(f"Error processing attachment {filename}: {str(e)}", exc_info=True)
            self.stats['errors'] += 1
    
    async def populate_accounting_software(self, user_id: str, invoice_data: Dict, extracted_id):
        """Auto-populate invoice into connected accounting software"""
        try:
            # Get user's accounting integrations
            accounting_integrations = await self.db.accounting_integrations.find({
                'user_id': user_id,
                'status': 'active'
            }).to_list(length=10)
            
            if not accounting_integrations:
                logger.info(f"No active accounting integrations for user: {user_id}")
                return
            
            results = {}
            
            for integration in accounting_integrations:
                provider = integration.get('provider')
                
                try:
                    if provider == 'xero':
                        result = await self.create_xero_invoice(integration, invoice_data)
                        results['xero'] = result
                    
                    elif provider == 'quickbooks':
                        result = await self.create_quickbooks_invoice(integration, invoice_data)
                        results['quickbooks'] = result
                    
                    elif provider == 'sage':
                        result = await self.create_sage_invoice(integration, invoice_data)
                        results['sage'] = result
                    
                    if result:
                        self.stats['invoices_created'] += 1
                
                except Exception as e:
                    logger.error(f"Error creating invoice in {provider}: {str(e)}")
                    results[provider] = {'error': str(e)}
            
            # Update extracted invoice record with accounting status
            await self.db.extracted_invoices.update_one(
                {'_id': extracted_id},
                {'$set': {
                    'accounting_status': results,
                    'populated_at': datetime.now(timezone.utc)
                }}
            )
        
        except Exception as e:
            logger.error(f"Error populating accounting software: {str(e)}", exc_info=True)
    
    async def create_xero_invoice(self, integration: Dict, invoice_data: Dict) -> Optional[Dict]:
        """Create invoice in Xero"""
        try:
            xero = XeroIntegration(
                client_id=integration['client_id'],
                client_secret=integration['client_secret'],
                tenant_id=integration['tenant_id']
            )
            
            xero.set_tokens(
                integration['access_token'],
                integration['refresh_token']
            )
            
            result = xero.create_invoice(invoice_data)
            
            if result:
                logger.info(f"Created Xero invoice: {result.get('InvoiceID')}")
                return {
                    'success': True,
                    'invoice_id': result.get('InvoiceID'),
                    'invoice_number': result.get('InvoiceNumber'),
                    'status': result.get('Status')
                }
            
            return {'success': False, 'error': 'Failed to create invoice'}
        
        except Exception as e:
            logger.error(f"Error creating Xero invoice: {str(e)}")
            return {'success': False, 'error': str(e)}
    
    async def create_quickbooks_invoice(self, integration: Dict, invoice_data: Dict) -> Optional[Dict]:
        """Create invoice in QuickBooks (placeholder)"""
        logger.warning("QuickBooks integration not yet implemented")
        return {'success': False, 'error': 'Not yet implemented'}
    
    async def create_sage_invoice(self, integration: Dict, invoice_data: Dict) -> Optional[Dict]:
        """Create invoice in Sage (placeholder)"""
        logger.warning("Sage integration not yet implemented")
        return {'success': False, 'error': 'Not yet implemented'}
    
    def get_stats(self) -> Dict:
        """Get service statistics"""
        return {
            **self.stats,
            'is_running': self.is_running,
            'poll_interval_seconds': self.poll_interval
        }
