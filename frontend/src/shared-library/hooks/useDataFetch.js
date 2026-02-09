/**
 * useDataFetch - Workspace-aware data fetching hook
 * 
 * Automatically scopes API requests to current workspace.
 * Invalidates cache when workspace changes.
 * 
 * Usage:
 *   const { data, loading, error, refetch } = useDataFetch('/transactions');
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { useWorkspace } from '../../shared/hooks/useWorkspace';

// Environment variables
const getBackendUrl = () => {
  if (typeof process !== 'undefined') {
    return process.env?.REACT_APP_BACKEND_URL || process.env?.NEXT_PUBLIC_BACKEND_URL || '';
  }
  return '';
};

const API_BASE = getBackendUrl() ? `${getBackendUrl()}/api` : '/api';

/**
 * Main data fetching hook with workspace awareness
 */
export const useDataFetch = (
  endpoint,
  options = {}
) => {
  const {
    method = 'GET',
    body = null,
    params = {},
    enabled = true,
    refetchOnWorkspaceChange = true,
    cacheKey = null,
    onSuccess = null,
    onError = null
  } = options;
  
  const { activeWorkspaceId, isSyncing, isAuthenticated } = useWorkspace();
  
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Track last workspace to detect changes
  const lastWorkspaceRef = useRef(activeWorkspaceId);
  const abortControllerRef = useRef(null);
  
  // Get auth token
  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  };
  
  // Fetch function
  const fetchData = useCallback(async (force = false) => {
    // Don't fetch if disabled or syncing
    if (!enabled || isSyncing) {
      return;
    }
    
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      setLoading(false);
      setError('Not authenticated');
      return;
    }
    
    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Create new abort controller
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const config = {
        method,
        url: `${API_BASE}${endpoint}`,
        headers,
        params,
        signal: abortControllerRef.current.signal
      };
      
      if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        config.data = body;
      }
      
      const response = await axios(config);
      
      setData(response.data);
      onSuccess?.(response.data);
      
    } catch (e) {
      // Ignore abort errors
      if (e.name === 'AbortError' || e.code === 'ERR_CANCELED') {
        return;
      }
      
      const errorMessage = e.response?.data?.detail || e.message || 'Fetch failed';
      setError(errorMessage);
      onError?.(e);
      
    } finally {
      setLoading(false);
    }
  }, [endpoint, method, body, params, enabled, isSyncing, isAuthenticated, onSuccess, onError]);
  
  // Fetch on mount
  useEffect(() => {
    fetchData();
    
    // Cleanup
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  // Refetch when workspace changes
  useEffect(() => {
    if (!refetchOnWorkspaceChange) return;
    
    // Detect workspace change
    if (activeWorkspaceId !== lastWorkspaceRef.current) {
      console.log('[useDataFetch] Workspace changed, refetching:', endpoint);
      lastWorkspaceRef.current = activeWorkspaceId;
      
      // Clear current data and refetch
      setData(null);
      fetchData(true);
    }
  }, [activeWorkspaceId, refetchOnWorkspaceChange, fetchData, endpoint]);
  
  // Refetch when params change
  useEffect(() => {
    if (enabled && !loading) {
      fetchData();
    }
  }, [JSON.stringify(params)]);
  
  return {
    data,
    loading,
    error,
    refetch: () => fetchData(true),
    isStale: activeWorkspaceId !== lastWorkspaceRef.current
  };
};

/**
 * Hook for mutations (POST, PUT, DELETE) with workspace context
 */
export const useDataMutation = (endpoint, options = {}) => {
  const {
    method = 'POST',
    onSuccess = null,
    onError = null,
    invalidateQueries = []
  } = options;
  
  const { activeWorkspaceId, isAuthenticated } = useWorkspace();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  };
  
  const mutate = useCallback(async (body = null, pathParams = {}) => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const token = getToken();
      const headers = { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      // Replace path params
      let url = `${API_BASE}${endpoint}`;
      Object.entries(pathParams).forEach(([key, value]) => {
        url = url.replace(`:${key}`, value);
      });
      
      const response = await axios({
        method,
        url,
        headers,
        data: body
      });
      
      onSuccess?.(response.data);
      
      return { success: true, data: response.data };
      
    } catch (e) {
      const errorMessage = e.response?.data?.detail || e.message || 'Request failed';
      setError(errorMessage);
      onError?.(e);
      
      return { success: false, error: errorMessage };
      
    } finally {
      setLoading(false);
    }
  }, [endpoint, method, isAuthenticated, onSuccess, onError]);
  
  return {
    mutate,
    loading,
    error,
    reset: () => setError(null)
  };
};

/**
 * Hook for paginated data with workspace awareness
 */
export const usePaginatedFetch = (endpoint, options = {}) => {
  const {
    pageSize = 20,
    initialPage = 1,
    ...fetchOptions
  } = options;
  
  const [page, setPage] = useState(initialPage);
  const [allData, setAllData] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  
  const { activeWorkspaceId } = useWorkspace();
  
  const { data, loading, error, refetch } = useDataFetch(endpoint, {
    ...fetchOptions,
    params: {
      ...fetchOptions.params,
      page,
      limit: pageSize
    },
    onSuccess: (newData) => {
      const items = Array.isArray(newData) ? newData : newData?.items || [];
      
      if (page === 1) {
        setAllData(items);
      } else {
        setAllData(prev => [...prev, ...items]);
      }
      
      setHasMore(items.length === pageSize);
      fetchOptions.onSuccess?.(newData);
    }
  });
  
  // Reset when workspace changes
  useEffect(() => {
    setPage(1);
    setAllData([]);
    setHasMore(true);
  }, [activeWorkspaceId]);
  
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      setPage(prev => prev + 1);
    }
  }, [loading, hasMore]);
  
  const refresh = useCallback(() => {
    setPage(1);
    setAllData([]);
    setHasMore(true);
    refetch();
  }, [refetch]);
  
  return {
    data: allData,
    loading,
    error,
    page,
    hasMore,
    loadMore,
    refresh
  };
};

export default useDataFetch;
