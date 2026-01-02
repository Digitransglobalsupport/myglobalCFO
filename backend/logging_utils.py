"""
Comprehensive Logging Utility for MyGlobalCFO
Provides detailed function execution tracking, performance monitoring, and audit trails
"""

import logging
import time
import functools
import inspect
from datetime import datetime
from typing import Callable, Any
import json
from fastapi import Request
import traceback

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

class LongtailLogger:
    """
    Longtail logging system for comprehensive function tracking
    """
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.execution_history = []
    
    def log_function_call(
        self,
        func_name: str,
        args: tuple = (),
        kwargs: dict = None,
        execution_time: float = None,
        result: Any = None,
        error: Exception = None,
        user_id: str = None,
        request_id: str = None
    ):
        """Log comprehensive function execution details"""
        
        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "function": func_name,
            "request_id": request_id,
            "user_id": user_id,
            "execution_time_ms": round(execution_time * 1000, 2) if execution_time else None,
            "status": "error" if error else "success"
        }
        
        # Log based on status
        if error:
            self.logger.error(
                f"[LONGTAIL] {func_name} FAILED | "
                f"Time: {log_entry['execution_time_ms']}ms | "
                f"Error: {str(error)} | "
                f"User: {user_id} | "
                f"Request: {request_id}"
            )
            self.logger.debug(f"[LONGTAIL] Error traceback: {traceback.format_exc()}")
        else:
            self.logger.info(
                f"[LONGTAIL] {func_name} SUCCESS | "
                f"Time: {log_entry['execution_time_ms']}ms | "
                f"User: {user_id} | "
                f"Request: {request_id}"
            )
        
        # Store in execution history
        self.execution_history.append(log_entry)
        
        # Keep only last 1000 entries
        if len(self.execution_history) > 1000:
            self.execution_history = self.execution_history[-1000:]
        
        return log_entry
    
    def log_api_request(
        self,
        method: str,
        path: str,
        status_code: int,
        execution_time: float,
        user_id: str = None,
        request_id: str = None,
        ip_address: str = None
    ):
        """Log API request details"""
        
        self.logger.info(
            f"[API] {method} {path} | "
            f"Status: {status_code} | "
            f"Time: {round(execution_time * 1000, 2)}ms | "
            f"User: {user_id} | "
            f"IP: {ip_address} | "
            f"Request: {request_id}"
        )
    
    def log_database_operation(
        self,
        operation: str,
        collection: str,
        execution_time: float,
        record_count: int = None,
        user_id: str = None
    ):
        """Log database operations"""
        
        self.logger.info(
            f"[DB] {operation} on {collection} | "
            f"Time: {round(execution_time * 1000, 2)}ms | "
            f"Records: {record_count} | "
            f"User: {user_id}"
        )
    
    def log_integration_call(
        self,
        integration_name: str,
        operation: str,
        execution_time: float,
        success: bool,
        error_message: str = None,
        user_id: str = None
    ):
        """Log external integration calls"""
        
        status = "SUCCESS" if success else "FAILED"
        log_msg = (
            f"[INTEGRATION] {integration_name} - {operation} | "
            f"Status: {status} | "
            f"Time: {round(execution_time * 1000, 2)}ms | "
            f"User: {user_id}"
        )
        
        if error_message:
            log_msg += f" | Error: {error_message}"
        
        if success:
            self.logger.info(log_msg)
        else:
            self.logger.error(log_msg)
    
    def get_execution_stats(self):
        """Get execution statistics"""
        
        if not self.execution_history:
            return {"message": "No execution history available"}
        
        total_calls = len(self.execution_history)
        successful = sum(1 for entry in self.execution_history if entry["status"] == "success")
        failed = total_calls - successful
        
        execution_times = [
            entry["execution_time_ms"] 
            for entry in self.execution_history 
            if entry["execution_time_ms"] is not None
        ]
        
        avg_time = sum(execution_times) / len(execution_times) if execution_times else 0
        
        return {
            "total_calls": total_calls,
            "successful": successful,
            "failed": failed,
            "success_rate": round((successful / total_calls) * 100, 2) if total_calls > 0 else 0,
            "avg_execution_time_ms": round(avg_time, 2)
        }


def longtail_tracker(logger: LongtailLogger = None):
    """
    Decorator for comprehensive function tracking
    Tracks execution time, parameters, results, and errors
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            func_name = func.__name__
            # Use global logger if none provided
            _logger = logger if logger is not None else global_logger
            
            # Extract user_id and request_id from kwargs if available
            user_id = kwargs.get('user_id') or kwargs.get('current_user', {}).get('id')
            request_id = kwargs.get('request_id')
            
            try:
                # Log function start
                _logger.logger.debug(
                    f"[LONGTAIL START] {func_name} | Args: {len(args)} | Kwargs: {list(kwargs.keys())}"
                )
                
                # Execute function
                result = await func(*args, **kwargs)
                
                # Calculate execution time
                execution_time = time.time() - start_time
                
                # Log success
                _logger.log_function_call(
                    func_name=func_name,
                    args=args,
                    kwargs=kwargs,
                    execution_time=execution_time,
                    result=result,
                    user_id=user_id,
                    request_id=request_id
                )
                
                return result
                
            except Exception as e:
                # Calculate execution time
                execution_time = time.time() - start_time
                
                # Log error
                _logger.log_function_call(
                    func_name=func_name,
                    args=args,
                    kwargs=kwargs,
                    execution_time=execution_time,
                    error=e,
                    user_id=user_id,
                    request_id=request_id
                )
                
                # Re-raise the exception
                raise
        
        @functools.wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            func_name = func.__name__
            _logger = logger or LongtailLogger(func.__module__)
            
            # Extract user_id and request_id from kwargs if available
            user_id = kwargs.get('user_id') or kwargs.get('current_user', {}).get('id')
            request_id = kwargs.get('request_id')
            
            try:
                # Log function start
                _logger.logger.debug(
                    f"[LONGTAIL START] {func_name} | Args: {len(args)} | Kwargs: {list(kwargs.keys())}"
                )
                
                # Execute function
                result = func(*args, **kwargs)
                
                # Calculate execution time
                execution_time = time.time() - start_time
                
                # Log success
                _logger.log_function_call(
                    func_name=func_name,
                    args=args,
                    kwargs=kwargs,
                    execution_time=execution_time,
                    result=result,
                    user_id=user_id,
                    request_id=request_id
                )
                
                return result
                
            except Exception as e:
                # Calculate execution time
                execution_time = time.time() - start_time
                
                # Log error
                _logger.log_function_call(
                    func_name=func_name,
                    args=args,
                    kwargs=kwargs,
                    execution_time=execution_time,
                    error=e,
                    user_id=user_id,
                    request_id=request_id
                )
                
                # Re-raise the exception
                raise
        
        # Return appropriate wrapper based on function type
        if inspect.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# Create global logger instance
global_logger = LongtailLogger("myglobalcfo")


def log_api_call(method: str, path: str, status_code: int, execution_time: float, 
                 user_id: str = None, request_id: str = None, ip_address: str = None):
    """Helper function for logging API calls"""
    global_logger.log_api_request(
        method=method,
        path=path,
        status_code=status_code,
        execution_time=execution_time,
        user_id=user_id,
        request_id=request_id,
        ip_address=ip_address
    )


def log_db_operation(operation: str, collection: str, execution_time: float, 
                     record_count: int = None, user_id: str = None):
    """Helper function for logging database operations"""
    global_logger.log_database_operation(
        operation=operation,
        collection=collection,
        execution_time=execution_time,
        record_count=record_count,
        user_id=user_id
    )


def log_integration(integration_name: str, operation: str, execution_time: float,
                    success: bool, error_message: str = None, user_id: str = None):
    """Helper function for logging integration calls"""
    global_logger.log_integration_call(
        integration_name=integration_name,
        operation=operation,
        execution_time=execution_time,
        success=success,
        error_message=error_message,
        user_id=user_id
    )


def get_execution_stats():
    """Get global execution statistics"""
    return global_logger.get_execution_stats()
