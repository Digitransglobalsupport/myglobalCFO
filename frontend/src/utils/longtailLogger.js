/**
 * Frontend Longtail Logging Utility for MyGlobalCFO
 * Provides comprehensive client-side logging, performance tracking, and user action audit
 */

class LongtailLogger {
  constructor() {
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 logs
    this.enabled = true;
    this.sessionId = this.generateSessionId();
    
    // Initialize
    this.init();
  }

  init() {
    // Log session start
    this.logInfo('SESSION_START', 'Longtail logging initialized', {
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    });

    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.logError('UNHANDLED_ERROR', event.message, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.logError('UNHANDLED_REJECTION', event.reason, {
        promise: event.promise
      });
    });

    // Performance monitoring
    if (window.performance && window.performance.timing) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = window.performance.timing;
          const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
          
          this.logPerformance('PAGE_LOAD', pageLoadTime, {
            domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
            domComplete: perfData.domComplete - perfData.navigationStart
          });
        }, 0);
      });
    }
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createLogEntry(level, category, message, data = {}, executionTime = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      level,
      category,
      message,
      data,
      executionTime,
      url: window.location.href,
      pathname: window.location.pathname
    };

    this.logs.push(entry);

    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output
    const consoleMethod = level === 'ERROR' ? 'error' : level === 'WARN' ? 'warn' : 'log';
    const prefix = `[LONGTAIL ${level}] ${category}:`;
    
    if (executionTime !== null) {
      console[consoleMethod](`${prefix} ${message} | Time: ${executionTime}ms`, data);
    } else {
      console[consoleMethod](`${prefix} ${message}`, data);
    }

    return entry;
  }

  logInfo(category, message, data = {}) {
    return this.createLogEntry('INFO', category, message, data);
  }

  logWarn(category, message, data = {}) {
    return this.createLogEntry('WARN', category, message, data);
  }

  logError(category, message, data = {}) {
    return this.createLogEntry('ERROR', category, message, data);
  }

  logPerformance(category, executionTime, data = {}) {
    return this.createLogEntry('PERFORMANCE', category, `Execution time: ${executionTime}ms`, data, executionTime);
  }

  // Track API calls
  logApiCall(method, url, statusCode, executionTime, requestData = null, responseData = null, error = null) {
    const level = error ? 'ERROR' : statusCode >= 400 ? 'WARN' : 'INFO';
    const message = error 
      ? `API call failed: ${method} ${url}`
      : `API call: ${method} ${url} - ${statusCode}`;

    return this.createLogEntry(level, 'API_CALL', message, {
      method,
      url,
      statusCode,
      requestData,
      responseData,
      error: error?.message || null
    }, executionTime);
  }

  // Track user actions
  logUserAction(action, details = {}) {
    return this.createLogEntry('INFO', 'USER_ACTION', action, details);
  }

  // Track component lifecycle
  logComponentMount(componentName, props = {}) {
    return this.createLogEntry('INFO', 'COMPONENT_MOUNT', `${componentName} mounted`, { props });
  }

  logComponentUnmount(componentName) {
    return this.createLogEntry('INFO', 'COMPONENT_UNMOUNT', `${componentName} unmounted`);
  }

  // Track navigation
  logNavigation(from, to) {
    return this.createLogEntry('INFO', 'NAVIGATION', `Navigated from ${from} to ${to}`, { from, to });
  }

  // Track form submissions
  logFormSubmit(formName, data = {}) {
    return this.createLogEntry('INFO', 'FORM_SUBMIT', `Form submitted: ${formName}`, { formName, ...data });
  }

  // Get statistics
  getStats() {
    const total = this.logs.length;
    const errors = this.logs.filter(log => log.level === 'ERROR').length;
    const warnings = this.logs.filter(log => log.level === 'WARN').length;
    const apiCalls = this.logs.filter(log => log.category === 'API_CALL').length;
    const userActions = this.logs.filter(log => log.category === 'USER_ACTION').length;

    const performanceLogs = this.logs.filter(log => log.executionTime !== null);
    const avgExecutionTime = performanceLogs.length > 0
      ? performanceLogs.reduce((sum, log) => sum + log.executionTime, 0) / performanceLogs.length
      : 0;

    return {
      total,
      errors,
      warnings,
      apiCalls,
      userActions,
      avgExecutionTime: Math.round(avgExecutionTime),
      sessionId: this.sessionId,
      sessionDuration: Date.now() - parseInt(this.sessionId.split('_')[1])
    };
  }

  // Get recent logs
  getRecentLogs(count = 100, level = null, category = null) {
    let filtered = this.logs;

    if (level) {
      filtered = filtered.filter(log => log.level === level);
    }

    if (category) {
      filtered = filtered.filter(log => log.category === category);
    }

    return filtered.slice(-count);
  }

  // Export logs
  exportLogs() {
    const blob = new Blob([JSON.stringify(this.logs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `longtail-logs-${this.sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.logInfo('EXPORT', 'Logs exported successfully');
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
    this.logInfo('CLEAR', 'Logs cleared');
  }

  // Enable/disable logging
  setEnabled(enabled) {
    this.enabled = enabled;
    this.logInfo('CONFIG', `Logging ${enabled ? 'enabled' : 'disabled'}`);
  }
}

// Create global instance
const longtailLogger = new LongtailLogger();

// Enhanced Axios interceptor for automatic API logging
export const setupAxiosLogging = (axiosInstance) => {
  // Request interceptor
  axiosInstance.interceptors.request.use(
    (config) => {
      config.metadata = { startTime: new Date().getTime() };
      longtailLogger.logInfo('API_REQUEST', `Starting ${config.method.toUpperCase()} request to ${config.url}`);
      return config;
    },
    (error) => {
      longtailLogger.logError('API_REQUEST_ERROR', 'Request setup failed', { error: error.message });
      return Promise.reject(error);
    }
  );

  // Response interceptor
  axiosInstance.interceptors.response.use(
    (response) => {
      const executionTime = new Date().getTime() - response.config.metadata.startTime;
      
      longtailLogger.logApiCall(
        response.config.method.toUpperCase(),
        response.config.url,
        response.status,
        executionTime,
        response.config.data,
        response.data
      );

      return response;
    },
    (error) => {
      const executionTime = error.config?.metadata?.startTime 
        ? new Date().getTime() - error.config.metadata.startTime 
        : 0;

      longtailLogger.logApiCall(
        error.config?.method?.toUpperCase() || 'UNKNOWN',
        error.config?.url || 'UNKNOWN',
        error.response?.status || 0,
        executionTime,
        error.config?.data,
        error.response?.data,
        error
      );

      return Promise.reject(error);
    }
  );
};

// React Hook for component tracking
export const useLongtailLogger = (componentName) => {
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    if (!mounted) {
      longtailLogger.logComponentMount(componentName);
      setMounted(true);
    }

    return () => {
      longtailLogger.logComponentUnmount(componentName);
    };
  }, [componentName, mounted]);

  return {
    logAction: (action, details) => longtailLogger.logUserAction(action, details),
    logError: (message, data) => longtailLogger.logError(componentName, message, data),
    logInfo: (message, data) => longtailLogger.logInfo(componentName, message, data),
    logPerformance: (operation, time, data) => longtailLogger.logPerformance(`${componentName}_${operation}`, time, data)
  };
};

// Performance tracking utility
export const trackPerformance = (operationName) => {
  const startTime = performance.now();
  
  return {
    end: (data = {}) => {
      const executionTime = performance.now() - startTime;
      longtailLogger.logPerformance(operationName, executionTime, data);
      return executionTime;
    }
  };
};

export default longtailLogger;
