"""
Gmail Integration Module for Email Monitoring and Attachment Extraction
"""
import os
import base64
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional, Tuple
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from email.mime.text import MIMEText

logger = logging.getLogger(__name__)

class GmailIntegration:
    def __init__(self, client_id: str, client_secret: str, redirect_uri: str):
        self.client_id = client_id
        self.client_secret = client_secret
        self.redirect_uri = redirect_uri
        self.scopes = ['https://www.googleapis.com/auth/gmail.readonly']
        
    def create_auth_url(self, state: str) -> str:
        """Create OAuth authorization URL"""
        flow = Flow.from_client_config(
            {
                "web": {
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                    "token_uri": "https://oauth2.googleapis.com/token",
                    "redirect_uris": [self.redirect_uri]
                }
            },
            scopes=self.scopes,
            redirect_uri=self.redirect_uri
        )
        
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true',
            state=state,
            prompt='consent'
        )
        
        return auth_url
    
    def exchange_code_for_tokens(self, code: str) -> Dict:
        """Exchange authorization code for access tokens"""
        try:
            flow = Flow.from_client_config(
                {
                    "web": {
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                        "token_uri": "https://oauth2.googleapis.com/token",
                        "redirect_uris": [self.redirect_uri]
                    }
                },
                scopes=self.scopes,
                redirect_uri=self.redirect_uri
            )
            
            flow.fetch_token(code=code)
            credentials = flow.credentials
            
            return {
                'access_token': credentials.token,
                'refresh_token': credentials.refresh_token,
                'token_expiry': credentials.expiry.isoformat() if credentials.expiry else None
            }
        except Exception as e:
            logger.error(f"Error exchanging code for tokens: {str(e)}")
            raise
    
    def get_service(self, access_token: str, refresh_token: str):
        """Create Gmail API service with credentials"""
        credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri="https://oauth2.googleapis.com/token",
            client_id=self.client_id,
            client_secret=self.client_secret,
            scopes=self.scopes
        )
        
        return build('gmail', 'v1', credentials=credentials)
    
    def search_messages(self, service, query: str, max_results: int = 10) -> List[str]:
        """Search for messages matching query"""
        try:
            message_ids = []
            page_token = None
            
            while True:
                results = service.users().messages().list(
                    userId='me',
                    q=query,
                    maxResults=max_results,
                    pageToken=page_token
                ).execute()
                
                if 'messages' in results:
                    message_ids.extend([msg['id'] for msg in results['messages']])
                
                page_token = results.get('nextPageToken')
                if not page_token or len(message_ids) >= max_results:
                    break
            
            return message_ids[:max_results]
        
        except HttpError as error:
            logger.error(f"Error searching messages: {error}")
            return []
    
    def get_message_details(self, service, message_id: str) -> Optional[Dict]:
        """Get full message details"""
        try:
            message = service.users().messages().get(
                userId='me',
                id=message_id,
                format='full'
            ).execute()
            
            return message
        except HttpError as error:
            logger.error(f"Error getting message {message_id}: {error}")
            return None
    
    def extract_message_metadata(self, message: Dict) -> Dict:
        """Extract metadata from message"""
        headers = message.get('payload', {}).get('headers', [])
        
        metadata = {
            'message_id': message.get('id'),
            'thread_id': message.get('threadId'),
            'subject': '',
            'from': '',
            'to': '',
            'date': '',
            'snippet': message.get('snippet', '')
        }
        
        for header in headers:
            name = header.get('name', '').lower()
            value = header.get('value', '')
            
            if name == 'subject':
                metadata['subject'] = value
            elif name == 'from':
                metadata['from'] = value
            elif name == 'to':
                metadata['to'] = value
            elif name == 'date':
                metadata['date'] = value
        
        return metadata
    
    def extract_attachments(self, service, message: Dict) -> List[Dict]:
        """Extract attachments from message"""
        attachments = []
        
        def process_part(part):
            if part.get('filename'):
                filename = part['filename']
                
                # Only process PDF, Excel, CSV files
                if filename.lower().endswith(('.pdf', '.xlsx', '.xls', '.csv')):
                    attachment_id = part['body'].get('attachmentId')
                    
                    if attachment_id:
                        attachments.append({
                            'filename': filename,
                            'attachment_id': attachment_id,
                            'mime_type': part.get('mimeType', ''),
                            'size': part['body'].get('size', 0)
                        })
            
            # Recursively process parts
            if 'parts' in part:
                for subpart in part['parts']:
                    process_part(subpart)
        
        payload = message.get('payload', {})
        process_part(payload)
        
        return attachments
    
    def download_attachment(self, service, message_id: str, attachment_id: str) -> Optional[bytes]:
        """Download attachment data"""
        try:
            attachment = service.users().messages().attachments().get(
                userId='me',
                messageId=message_id,
                id=attachment_id
            ).execute()
            
            # Decode base64url encoded data
            file_data = attachment['data']
            file_data = file_data.replace('-', '+').replace('_', '/')
            
            # Add padding if needed
            missing_padding = len(file_data) % 4
            if missing_padding:
                file_data += '=' * (4 - missing_padding)
            
            decoded_data = base64.urlsafe_b64decode(file_data)
            return decoded_data
        
        except HttpError as error:
            logger.error(f"Error downloading attachment: {error}")
            return None
    
    def monitor_inbox(self, service, keywords: List[str]) -> Tuple[List[Dict], List[Dict]]:
        """Monitor inbox for new emails with attachments matching keywords"""
        try:
            # Build search query
            keyword_query = ' OR '.join([f'subject:"{kw}"' for kw in keywords])
            query = f'in:inbox has:attachment ({keyword_query}) is:unread'
            
            logger.info(f"Searching with query: {query}")
            
            # Search for messages
            message_ids = self.search_messages(service, query, max_results=20)
            
            messages_data = []
            attachments_data = []
            
            for msg_id in message_ids:
                message = self.get_message_details(service, msg_id)
                
                if not message:
                    continue
                
                # Extract metadata
                metadata = self.extract_message_metadata(message)
                messages_data.append(metadata)
                
                # Extract attachments
                attachments = self.extract_attachments(service, message)
                
                for attachment in attachments:
                    # Download attachment
                    file_data = self.download_attachment(
                        service,
                        msg_id,
                        attachment['attachment_id']
                    )
                    
                    if file_data:
                        attachments_data.append({
                            'message_id': msg_id,
                            'filename': attachment['filename'],
                            'mime_type': attachment['mime_type'],
                            'size': attachment['size'],
                            'data': file_data,
                            'subject': metadata['subject'],
                            'from': metadata['from'],
                            'date': metadata['date']
                        })
            
            return messages_data, attachments_data
        
        except Exception as e:
            logger.error(f"Error monitoring inbox: {str(e)}")
            return [], []
