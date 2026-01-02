"""
FastAPI Middleware for Automatic Request/Response Logging
Tracks all API calls with detailed longtail logging
"""

import time
import uuid
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from logging_utils import global_logger
import json


class LongtailLoggingMiddleware(BaseHTTPMiddleware):
    """
    Middleware that automatically logs all API requests and responses
    with comprehensive details including timing, status codes, and user context
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.logger = global_logger
    
    async def dispatch(self, request: Request, call_next):
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Start timing
        start_time = time.time()
        
        # Extract request details
        method = request.method
        path = request.url.path
        ip_address = request.client.host if request.client else "unknown"
        
        # Try to extract user_id from authorization header
        user_id = None
        auth_header = request.headers.get("authorization")
        if auth_header:
            try:
                # This is a simplified extraction, actual implementation
                # would need to decode JWT token
                user_id = "authenticated"
            except:
                user_id = None
        
        # Log request start
        self.logger.logger.info(
            f"[REQUEST START] {request_id} | "
            f"{method} {path} | "
            f"IP: {ip_address} | "
            f"User: {user_id}"
        )
        
        # Process request
        try:
            response = await call_next(request)
            status_code = response.status_code
            
            # Calculate execution time
            execution_time = time.time() - start_time
            
            # Log request completion
            self.logger.log_api_request(
                method=method,
                path=path,
                status_code=status_code,
                execution_time=execution_time,
                user_id=user_id,
                request_id=request_id,
                ip_address=ip_address
            )
            
            # Add custom headers
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Execution-Time"] = f"{round(execution_time * 1000, 2)}ms"
            
            return response
            
        except Exception as e:
            # Calculate execution time
            execution_time = time.time() - start_time
            
            # Log error
            self.logger.logger.error(
                f"[REQUEST ERROR] {request_id} | "
                f"{method} {path} | "
                f"Time: {round(execution_time * 1000, 2)}ms | "
                f"Error: {str(e)} | "
                f"IP: {ip_address}"
            )
            
            # Re-raise the exception
            raise


class DatabaseOperationLogger:
    """
    Context manager for logging database operations
    """
    
    def __init__(self, operation: str, collection: str, user_id: str = None):
        self.operation = operation
        self.collection = collection
        self.user_id = user_id
        self.start_time = None
        self.record_count = None
    
    def __enter__(self):
        self.start_time = time.time()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        execution_time = time.time() - self.start_time
        
        if exc_type is None:
            # Success
            global_logger.log_database_operation(
                operation=self.operation,
                collection=self.collection,
                execution_time=execution_time,
                record_count=self.record_count,
                user_id=self.user_id
            )
        else:
            # Error occurred
            global_logger.logger.error(
                f"[DB ERROR] {self.operation} on {self.collection} | "
                f"Time: {round(execution_time * 1000, 2)}ms | "
                f"Error: {str(exc_val)} | "
                f"User: {self.user_id}"
            )
        
        return False  # Don't suppress exceptions
    
    def set_record_count(self, count: int):
        """Set the number of records affected"""
        self.record_count = count


class IntegrationCallLogger:
    """
    Context manager for logging external integration calls
    """
    
    def __init__(self, integration_name: str, operation: str, user_id: str = None):
        self.integration_name = integration_name
        self.operation = operation
        self.user_id = user_id
        self.start_time = None
        self.success = False
        self.error_message = None
    
    def __enter__(self):
        self.start_time = time.time()
        global_logger.logger.info(
            f"[INTEGRATION START] {self.integration_name} - {self.operation}"
        )
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        execution_time = time.time() - self.start_time
        
        if exc_type is None:
            self.success = True
        else:
            self.success = False
            self.error_message = str(exc_val)
        
        # Log the integration call
        global_logger.log_integration_call(
            integration_name=self.integration_name,
            operation=self.operation,
            execution_time=execution_time,
            success=self.success,
            error_message=self.error_message,
            user_id=self.user_id
        )
        
        return False  # Don't suppress exceptions
    
    def mark_success(self):
        """Explicitly mark the operation as successful"""
        self.success = True


# Helper functions for easy use in code

def log_db_query(collection: str, user_id: str = None):
    """Create a DB logger for query operations"""
    return DatabaseOperationLogger("QUERY", collection, user_id)


def log_db_insert(collection: str, user_id: str = None):
    """Create a DB logger for insert operations"""
    return DatabaseOperationLogger("INSERT", collection, user_id)


def log_db_update(collection: str, user_id: str = None):
    """Create a DB logger for update operations"""
    return DatabaseOperationLogger("UPDATE", collection, user_id)


def log_db_delete(collection: str, user_id: str = None):
    """Create a DB logger for delete operations"""
    return DatabaseOperationLogger("DELETE", collection, user_id)


def log_integration_call(integration_name: str, operation: str, user_id: str = None):
    """Create an integration call logger"""
    return IntegrationCallLogger(integration_name, operation, user_id)
