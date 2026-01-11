import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';

// Context for Reporting Horizons
const ReportingHorizonContext = createContext(null);

// Pre-defined horizon options
export const HORIZON_OPTIONS = [
  { id: '30d', label: '30 Days', days: 30, shortLabel: '30D' },
  { id: '60d', label: '60 Days', days: 60, shortLabel: '60D' },
  { id: '90d', label: '90 Days', days: 90, shortLabel: '90D' },
  { id: '6m', label: '6 Months', days: 180, shortLabel: '6M' },
  { id: '1y', label: '1 Year', days: 365, shortLabel: '1Y' },
  { id: 'ytd', label: 'Year to Date', days: null, shortLabel: 'YTD' },
  { id: 'custom', label: 'Custom Range', days: null, shortLabel: 'Custom' },
];

// Calculate date range from horizon (forward-looking: present to future)
export const getDateRangeFromHorizon = (horizonId, customStartDate = null, customEndDate = null) => {
  const now = new Date();
  const startDate = new Date(now); // Start from today
  let endDate = new Date(now);
  
  if (horizonId === 'custom' && customStartDate && customEndDate) {
    return {
      startDate: new Date(customStartDate),
      endDate: new Date(customEndDate),
      label: 'Custom Range'
    };
  }
  
  if (horizonId === 'ytd') {
    // YTD: January 1st to today (backward-looking exception)
    const ytdStart = new Date(now.getFullYear(), 0, 1);
    return { startDate: ytdStart, endDate: new Date(now), label: 'Year to Date' };
  }
  
  const horizon = HORIZON_OPTIONS.find(h => h.id === horizonId);
  if (horizon && horizon.days) {
    endDate.setDate(now.getDate() + horizon.days); // Forward-looking
    return { startDate, endDate, label: horizon.label };
  }
  
  // Default to 30 days forward
  endDate.setDate(now.getDate() + 30);
  return { startDate, endDate, label: '30 Days' };
};

// Calculate prior period range for comparison
export const getPriorPeriodRange = (startDate, endDate) => {
  const periodLength = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  const priorEnd = new Date(startDate);
  priorEnd.setDate(priorEnd.getDate() - 1);
  const priorStart = new Date(priorEnd);
  priorStart.setDate(priorStart.getDate() - periodLength + 1);
  
  return { 
    startDate: priorStart, 
    endDate: priorEnd,
    label: `Prior ${periodLength} Days`
  };
};

// Format date for display
export const formatDateRange = (startDate, endDate) => {
  const options = { month: 'short', day: 'numeric', year: 'numeric' };
  return `${startDate.toLocaleDateString('en-US', options)} - ${endDate.toLocaleDateString('en-US', options)}`;
};

// Provider Component
export const ReportingHorizonProvider = ({ children }) => {
  const { authAxios, token } = useAuth();
  
  // Global horizon state
  const [globalHorizon, setGlobalHorizon] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const [compareToprior, setCompareToPrior] = useState(false);
  
  // Widget-level overrides (key = widget ID)
  const [widgetOverrides, setWidgetOverrides] = useState({});
  
  // Loading state for preference sync
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    if (token) {
      loadPreferences();
    }
  }, [token]);

  // Save preferences whenever they change
  useEffect(() => {
    if (preferencesLoaded && token) {
      savePreferences();
    }
  }, [globalHorizon, customStartDate, customEndDate, compareToprior, widgetOverrides, preferencesLoaded]);

  const loadPreferences = async () => {
    try {
      // Try to load from localStorage first for quick startup
      const cached = localStorage.getItem('reporting_horizon_preferences');
      if (cached) {
        const prefs = JSON.parse(cached);
        setGlobalHorizon(prefs.globalHorizon || '30d');
        setCustomStartDate(prefs.customStartDate || null);
        setCustomEndDate(prefs.customEndDate || null);
        setCompareToPrior(prefs.compareToPrior || false);
        setWidgetOverrides(prefs.widgetOverrides || {});
      }
      
      // Then fetch from server
      const res = await authAxios.get('/user/preferences/reporting-horizon');
      if (res.data && res.data.preferences) {
        const prefs = res.data.preferences;
        setGlobalHorizon(prefs.globalHorizon || '30d');
        setCustomStartDate(prefs.customStartDate || null);
        setCustomEndDate(prefs.customEndDate || null);
        setCompareToPrior(prefs.compareToPrior || false);
        setWidgetOverrides(prefs.widgetOverrides || {});
        
        // Update localStorage
        localStorage.setItem('reporting_horizon_preferences', JSON.stringify(prefs));
      }
    } catch (e) {
      console.log('No saved horizon preferences found, using defaults');
    } finally {
      setPreferencesLoaded(true);
    }
  };

  const savePreferences = async () => {
    const prefs = {
      globalHorizon,
      customStartDate,
      customEndDate,
      compareToPrior: compareToprior,
      widgetOverrides
    };
    
    // Save to localStorage immediately
    localStorage.setItem('reporting_horizon_preferences', JSON.stringify(prefs));
    
    // Save to server (debounced)
    try {
      await authAxios.put('/user/preferences/reporting-horizon', { preferences: prefs });
    } catch (e) {
      console.log('Failed to save horizon preferences to server');
    }
  };

  // Get the effective horizon for a widget
  const getWidgetHorizon = useCallback((widgetId) => {
    if (widgetOverrides[widgetId]) {
      return widgetOverrides[widgetId];
    }
    return globalHorizon;
  }, [globalHorizon, widgetOverrides]);

  // Get the date range for a widget
  const getWidgetDateRange = useCallback((widgetId) => {
    const horizon = getWidgetHorizon(widgetId);
    const override = widgetOverrides[widgetId];
    
    if (override && override.horizonId === 'custom') {
      return getDateRangeFromHorizon('custom', override.customStartDate, override.customEndDate);
    }
    
    if (globalHorizon === 'custom') {
      return getDateRangeFromHorizon('custom', customStartDate, customEndDate);
    }
    
    return getDateRangeFromHorizon(horizon);
  }, [globalHorizon, customStartDate, customEndDate, widgetOverrides, getWidgetHorizon]);

  // Set widget-specific override
  const setWidgetHorizon = useCallback((widgetId, horizonId, customStart = null, customEnd = null) => {
    setWidgetOverrides(prev => ({
      ...prev,
      [widgetId]: {
        horizonId,
        customStartDate: customStart,
        customEndDate: customEnd
      }
    }));
  }, []);

  // Clear widget override (use global)
  const clearWidgetOverride = useCallback((widgetId) => {
    setWidgetOverrides(prev => {
      const newOverrides = { ...prev };
      delete newOverrides[widgetId];
      return newOverrides;
    });
  }, []);

  // Set global horizon
  const setHorizon = useCallback((horizonId, customStart = null, customEnd = null) => {
    setGlobalHorizon(horizonId);
    if (horizonId === 'custom') {
      setCustomStartDate(customStart);
      setCustomEndDate(customEnd);
    }
  }, []);

  // Toggle compare to prior period
  const toggleCompareToPrior = useCallback(() => {
    setCompareToPrior(prev => !prev);
  }, []);

  const value = {
    // Global state
    globalHorizon,
    customStartDate,
    customEndDate,
    compareToPrior: compareToprior,
    
    // Actions
    setHorizon,
    setCompareToPrior,
    toggleCompareToPrior,
    
    // Widget-level
    widgetOverrides,
    getWidgetHorizon,
    getWidgetDateRange,
    setWidgetHorizon,
    clearWidgetOverride,
    
    // Helpers
    getDateRangeFromHorizon,
    getPriorPeriodRange,
    formatDateRange,
    HORIZON_OPTIONS
  };

  return (
    <ReportingHorizonContext.Provider value={value}>
      {children}
    </ReportingHorizonContext.Provider>
  );
};

// Hook to use the context
export const useReportingHorizon = () => {
  const context = useContext(ReportingHorizonContext);
  if (!context) {
    throw new Error('useReportingHorizon must be used within a ReportingHorizonProvider');
  }
  return context;
};

export default ReportingHorizonContext;
