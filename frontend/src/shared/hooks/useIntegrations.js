/**
 * useIntegrations - Shared hook for managing integrations across apps
 * 
 * This hook connects to the shared MongoDB backend and provides:
 * - User's integrations (filtered by app's enabled integrations)
 * - ERP accounts
 * - Integration catalog
 * - CRUD operations with source_app_id tracking
 * 
 * Usage:
 *   import { useIntegrations } from '@/shared/hooks/useIntegrations';
 *   const { integrations, erpAccounts, connectIntegration, loading } = useIntegrations();
 * 
 * Environment Variables Required:
 *   - REACT_APP_APP_ID (CRA) or NEXT_PUBLIC_APP_ID (Next.js)
 *   - REACT_APP_BACKEND_URL (CRA) or NEXT_PUBLIC_BACKEND_URL (Next.js)
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Get app ID from environment (supports both CRA and Next.js)
const getAppId = () => {
  // React (CRA)
  if (typeof process !== 'undefined' && process.env?.REACT_APP_APP_ID) {
    return process.env.REACT_APP_APP_ID;
  }
  // Next.js
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_APP_ID) {
    return process.env.NEXT_PUBLIC_APP_ID;
  }
  // Fallback
  return 'unknown-app';
};

// Get backend URL from environment
const getBackendUrl = () => {
  // React (CRA)
  if (typeof process !== 'undefined' && process.env?.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  // Next.js
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL;
  }
  return '';
};

const APP_ID = getAppId();
const BACKEND_URL = getBackendUrl();
const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

/**
 * Main hook for shared integrations
 */
export const useIntegrations = (authToken = null) => {
  const [integrations, setIntegrations] = useState([]);
  const [erpAccounts, setErpAccounts] = useState([]);
  const [appConfig, setAppConfig] = useState(null);
  const [catalog, setCatalog] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create axios instance with auth
  const api = axios.create({
    baseURL: API_BASE,
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
  });

  /**
   * Fetch app configuration (enabled integrations/features)
   */
  const fetchAppConfig = useCallback(async () => {
    try {
      const res = await api.get(`/shared/apps/${APP_ID}`);
      setAppConfig(res.data);
      return res.data;
    } catch (e) {
      console.error('Failed to fetch app config:', e);
      // App not registered - return default config
      return {
        app_id: APP_ID,
        enabled_integrations: [],
        enabled_features: []
      };
    }
  }, []);

  /**
   * Fetch integration catalog for this app
   */
  const fetchCatalog = useCallback(async () => {
    try {
      const res = await api.get(`/shared/integrations/catalog/${APP_ID}`);
      setCatalog(res.data.catalog || {});
      return res.data;
    } catch (e) {
      console.error('Failed to fetch catalog:', e);
      return {};
    }
  }, []);

  /**
   * Fetch user's shared integrations
   */
  const fetchIntegrations = useCallback(async () => {
    try {
      const res = await api.get('/shared/integrations/user', {
        params: { app_id: APP_ID }
      });
      setIntegrations(res.data || []);
      return res.data;
    } catch (e) {
      console.error('Failed to fetch integrations:', e);
      setIntegrations([]);
      return [];
    }
  }, []);

  /**
   * Fetch ERP accounts
   */
  const fetchERPAccounts = useCallback(async () => {
    try {
      const res = await api.get('/erp/accounts');
      setErpAccounts(res.data || []);
      return res.data;
    } catch (e) {
      console.error('Failed to fetch ERP accounts:', e);
      setErpAccounts([]);
      return [];
    }
  }, []);

  /**
   * Connect a new integration
   */
  const connectIntegration = async (platform, credentials = {}) => {
    try {
      const res = await api.post('/shared/integrations', {
        platform,
        source_app_id: APP_ID,
        ...credentials
      });
      await fetchIntegrations();
      return { success: true, data: res.data };
    } catch (e) {
      return { 
        success: false, 
        error: e.response?.data?.detail || 'Failed to connect integration' 
      };
    }
  };

  /**
   * Update an integration
   */
  const updateIntegration = async (integrationId, updates) => {
    try {
      const res = await api.put(`/shared/integrations/${integrationId}`, updates);
      await fetchIntegrations();
      return { success: true, data: res.data };
    } catch (e) {
      return { 
        success: false, 
        error: e.response?.data?.detail || 'Failed to update integration' 
      };
    }
  };

  /**
   * Disconnect an integration
   */
  const disconnectIntegration = async (integrationId) => {
    try {
      await api.delete(`/shared/integrations/${integrationId}`);
      await fetchIntegrations();
      return { success: true };
    } catch (e) {
      return { 
        success: false, 
        error: e.response?.data?.detail || 'Failed to disconnect integration' 
      };
    }
  };

  /**
   * Sync an integration
   */
  const syncIntegration = async (integrationId) => {
    try {
      const res = await api.post(`/shared/integrations/${integrationId}/sync`, null, {
        params: { app_id: APP_ID }
      });
      await fetchIntegrations();
      return { success: true, data: res.data };
    } catch (e) {
      return { 
        success: false, 
        error: e.response?.data?.detail || 'Failed to sync integration' 
      };
    }
  };

  /**
   * Check if an integration is connected
   */
  const isConnected = (platform) => {
    return integrations.some(
      i => i.platform === platform && i.status === 'connected'
    );
  };

  /**
   * Get integration status for a platform
   */
  const getIntegrationStatus = (platform) => {
    const integration = integrations.find(i => i.platform === platform);
    return integration?.status || 'not_connected';
  };

  /**
   * Get integration data for a platform
   */
  const getIntegration = (platform) => {
    return integrations.find(i => i.platform === platform);
  };

  /**
   * Check if this app has access to an integration
   */
  const hasAccess = (platform) => {
    return appConfig?.enabled_integrations?.includes(platform) ?? false;
  };

  /**
   * Refresh all data
   */
  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchAppConfig(),
        fetchCatalog(),
        fetchIntegrations(),
        fetchERPAccounts()
      ]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    refresh();
  }, [authToken]);

  return {
    // State
    integrations,
    erpAccounts,
    appConfig,
    catalog,
    loading,
    error,
    appId: APP_ID,

    // Actions
    connectIntegration,
    updateIntegration,
    disconnectIntegration,
    syncIntegration,
    refresh,

    // Helpers
    isConnected,
    getIntegrationStatus,
    getIntegration,
    hasAccess,

    // Raw fetchers (for custom use)
    fetchIntegrations,
    fetchERPAccounts,
    fetchAppConfig,
    fetchCatalog
  };
};

/**
 * Hook for app registry management (admin use)
 */
export const useAppRegistry = (authToken = null) => {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  const api = axios.create({
    baseURL: API_BASE,
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
  });

  const fetchApps = async () => {
    try {
      setLoading(true);
      const res = await api.get('/shared/apps');
      setApps(res.data || []);
    } catch (e) {
      console.error('Failed to fetch apps:', e);
    } finally {
      setLoading(false);
    }
  };

  const registerApp = async (appData) => {
    try {
      const res = await api.post('/shared/apps', appData);
      await fetchApps();
      return { success: true, data: res.data };
    } catch (e) {
      return { 
        success: false, 
        error: e.response?.data?.detail || 'Failed to register app' 
      };
    }
  };

  const updateApp = async (appId, updates) => {
    try {
      const res = await api.put(`/shared/apps/${appId}`, updates);
      await fetchApps();
      return { success: true, data: res.data };
    } catch (e) {
      return { 
        success: false, 
        error: e.response?.data?.detail || 'Failed to update app' 
      };
    }
  };

  const seedApps = async () => {
    try {
      const res = await api.post('/shared/apps/seed');
      await fetchApps();
      return { success: true, data: res.data };
    } catch (e) {
      return { 
        success: false, 
        error: e.response?.data?.detail || 'Failed to seed apps' 
      };
    }
  };

  useEffect(() => {
    fetchApps();
  }, [authToken]);

  return {
    apps,
    loading,
    registerApp,
    updateApp,
    seedApps,
    refresh: fetchApps
  };
};

export default useIntegrations;
