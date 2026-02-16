/**
 * useWorkspace - Shared hook for workspace context management
 * 
 * Features:
 * - Cross-tab synchronization via storage events
 * - Automatic state sync when JWT changes in another tab
 * - Workspace switching with token refresh
 * - Prevents data cross-contamination between workspaces
 * 
 * Usage:
 *   import { useWorkspace, WorkspaceProvider } from '@/shared/hooks/useWorkspace';
 *   
 *   // In App.js - wrap your app
 *   <WorkspaceProvider>
 *     <App />
 *   </WorkspaceProvider>
 *   
 *   // In any component
 *   const { 
 *     activeWorkspace, 
 *     workspaces, 
 *     switchWorkspace,
 *     isWorkspaceSyncing 
 *   } = useWorkspace();
 */

import React, { 
  createContext, 
  useContext, 
  useState, 
  useEffect, 
  useCallback, 
  useRef 
} from 'react';
import axios from 'axios';

// ======================= CONSTANTS =======================

const TOKEN_KEY = 'token';
const WORKSPACE_KEY = 'active_workspace_id';
const ORG_KEY = 'active_org_id';
const LAST_SYNC_KEY = 'workspace_last_sync';

// Get environment variables (supports CRA and Next.js)
const getEnvVar = (craKey, nextKey) => {
  if (typeof process !== 'undefined') {
    return process.env?.[craKey] || process.env?.[nextKey] || '';
  }
  return '';
};

const APP_ID = getEnvVar('REACT_APP_APP_ID', 'NEXT_PUBLIC_APP_ID') || 'unknown-app';
const BACKEND_URL = getEnvVar('REACT_APP_BACKEND_URL', 'NEXT_PUBLIC_BACKEND_URL') || '';
const API_BASE = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

// ======================= CONTEXT =======================

const WorkspaceContext = createContext(null);

// ======================= HELPER FUNCTIONS =======================

/**
 * Decode JWT payload without verification (for client-side context extraction)
 */
const decodeJWT = (token) => {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode JWT:', e);
    return null;
  }
};

/**
 * Extract workspace context from JWT
 */
const getWorkspaceFromToken = (token) => {
  const payload = decodeJWT(token);
  if (!payload) return { orgId: null, workspaceId: null };
  
  return {
    orgId: payload.org_id || null,
    workspaceId: payload.workspace_id || null,
    userId: payload.user_id || null,
    email: payload.email || null,
    exp: payload.exp || null
  };
};

/**
 * Check if token is expired
 */
const isTokenExpired = (token) => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  return Date.now() >= payload.exp * 1000;
};

// ======================= PROVIDER COMPONENT =======================

export const WorkspaceProvider = ({ children, onWorkspaceChange, onAuthRequired }) => {
  // State
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [activeOrg, setActiveOrg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  
  // Refs for tracking
  const lastTokenRef = useRef(null);
  const lastWorkspaceIdRef = useRef(null);
  const syncInProgressRef = useRef(false);
  
  // Get current token
  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(TOKEN_KEY);
  }, []);
  
  // Create axios instance with current token
  const getApi = useCallback(() => {
    const token = getToken();
    return axios.create({
      baseURL: API_BASE,
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }, [getToken]);

  // ======================= FETCH WORKSPACES =======================
  
  const fetchWorkspaces = useCallback(async () => {
    const token = getToken();
    if (!token || isTokenExpired(token)) {
      setWorkspaces([]);
      setActiveWorkspace(null);
      setLoading(false);
      return;
    }
    
    try {
      const api = getApi();
      const res = await api.get('/org/workspaces');
      
      setWorkspaces(res.data.workspaces || []);
      
      // Set active workspace from response or token
      const activeId = res.data.active_workspace_id;
      if (activeId) {
        const active = res.data.workspaces?.find(w => w.id === activeId);
        setActiveWorkspace(active || null);
        localStorage.setItem(WORKSPACE_KEY, activeId);
      }
      
      // Also fetch org info
      const orgRes = await api.get('/org/organizations');
      if (orgRes.data.active_org_id) {
        const activeOrg = orgRes.data.organizations?.find(
          o => o.id === orgRes.data.active_org_id
        );
        setActiveOrg(activeOrg || null);
        localStorage.setItem(ORG_KEY, orgRes.data.active_org_id);
      }
      
    } catch (e) {
      console.error('Failed to fetch workspaces:', e);
      if (e.response?.status === 401) {
        onAuthRequired?.();
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, getApi, onAuthRequired]);

  // ======================= SWITCH WORKSPACE =======================
  
  const switchWorkspace = useCallback(async (workspaceId) => {
    if (syncInProgressRef.current) {
      console.warn('Workspace switch already in progress');
      return { success: false, error: 'Switch in progress' };
    }
    
    syncInProgressRef.current = true;
    setIsSyncing(true);
    
    try {
      const api = getApi();
      const res = await api.post(`/org/workspaces/${workspaceId}/switch`);
      
      // Update local state
      const newWorkspace = workspaces.find(w => w.id === workspaceId);
      setActiveWorkspace(newWorkspace || null);
      localStorage.setItem(WORKSPACE_KEY, workspaceId);
      
      if (res.data.org_id) {
        localStorage.setItem(ORG_KEY, res.data.org_id);
      }
      
      // Mark sync timestamp for cross-tab detection
      localStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      
      // If server says we need a new token, refresh it
      if (res.data.requires_new_token) {
        await refreshToken();
      }
      
      // Notify parent
      onWorkspaceChange?.(workspaceId, newWorkspace);
      
      return { success: true, workspace: newWorkspace };
      
    } catch (e) {
      console.error('Failed to switch workspace:', e);
      setError(e.response?.data?.detail || 'Failed to switch workspace');
      return { success: false, error: e.message };
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, [getApi, workspaces, onWorkspaceChange]);

  // ======================= REFRESH TOKEN =======================
  
  const refreshToken = useCallback(async () => {
    try {
      const api = getApi();
      const res = await api.post('/auth/refresh-token');
      
      if (res.data.token) {
        localStorage.setItem(TOKEN_KEY, res.data.token);
        lastTokenRef.current = res.data.token;
        
        // Update workspace context from new token
        const context = getWorkspaceFromToken(res.data.token);
        lastWorkspaceIdRef.current = context.workspaceId;
        
        return { success: true };
      }
    } catch (e) {
      console.error('Failed to refresh token:', e);
      return { success: false, error: e.message };
    }
  }, [getApi]);

  // ======================= CROSS-TAB SYNC =======================
  
  /**
   * Handle storage events from other tabs
   * This is the KEY feature for preventing data cross-contamination
   */
  const handleStorageChange = useCallback((event) => {
    // Only handle our keys
    if (![TOKEN_KEY, WORKSPACE_KEY, LAST_SYNC_KEY].includes(event.key)) {
      return;
    }
    
    console.log(`[${APP_ID}] Storage change detected:`, event.key);
    
    // Token changed in another tab
    if (event.key === TOKEN_KEY) {
      const newToken = event.newValue;
      const oldToken = lastTokenRef.current;
      
      // Token removed (logout)
      if (!newToken && oldToken) {
        console.log(`[${APP_ID}] Token removed - redirecting to login`);
        onAuthRequired?.();
        return;
      }
      
      // Token changed
      if (newToken && newToken !== oldToken) {
        const oldContext = getWorkspaceFromToken(oldToken);
        const newContext = getWorkspaceFromToken(newToken);
        
        // Workspace changed!
        if (newContext.workspaceId !== oldContext.workspaceId) {
          console.log(`[${APP_ID}] Workspace changed in another tab:`, {
            old: oldContext.workspaceId,
            new: newContext.workspaceId
          });
          
          // Update refs
          lastTokenRef.current = newToken;
          lastWorkspaceIdRef.current = newContext.workspaceId;
          
          // Sync state from new token
          syncFromToken(newToken);
        } else {
          // Just token refresh, update ref
          lastTokenRef.current = newToken;
        }
      }
    }
    
    // Workspace key changed directly
    if (event.key === WORKSPACE_KEY) {
      const newWorkspaceId = event.newValue;
      const currentWorkspaceId = lastWorkspaceIdRef.current;
      
      if (newWorkspaceId && newWorkspaceId !== currentWorkspaceId) {
        console.log(`[${APP_ID}] Workspace key changed:`, {
          old: currentWorkspaceId,
          new: newWorkspaceId
        });
        
        // Sync to new workspace
        syncToWorkspace(newWorkspaceId);
      }
    }
    
    // Sync timestamp changed (another tab completed a switch)
    if (event.key === LAST_SYNC_KEY) {
      console.log(`[${APP_ID}] Sync completed in another tab - refreshing state`);
      fetchWorkspaces();
    }
  }, [fetchWorkspaces, onAuthRequired]);
  
  /**
   * Sync state from a token (used when token changes in another tab)
   */
  const syncFromToken = useCallback(async (token) => {
    if (syncInProgressRef.current) return;
    
    setIsSyncing(true);
    syncInProgressRef.current = true;
    
    try {
      const context = getWorkspaceFromToken(token);
      
      // Update active workspace
      if (context.workspaceId) {
        const workspace = workspaces.find(w => w.id === context.workspaceId);
        setActiveWorkspace(workspace || null);
        localStorage.setItem(WORKSPACE_KEY, context.workspaceId);
      }
      
      // Refetch to ensure data is fresh
      await fetchWorkspaces();
      
      // Notify parent of workspace change
      onWorkspaceChange?.(context.workspaceId, activeWorkspace);
      
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, [workspaces, fetchWorkspaces, onWorkspaceChange, activeWorkspace]);
  
  /**
   * Sync to a specific workspace (reload data for that workspace)
   */
  const syncToWorkspace = useCallback(async (workspaceId) => {
    if (syncInProgressRef.current) return;
    
    setIsSyncing(true);
    syncInProgressRef.current = true;
    
    try {
      // Find workspace in list
      let workspace = workspaces.find(w => w.id === workspaceId);
      
      // If not found, refetch list
      if (!workspace) {
        await fetchWorkspaces();
        workspace = workspaces.find(w => w.id === workspaceId);
      }
      
      if (workspace) {
        setActiveWorkspace(workspace);
        lastWorkspaceIdRef.current = workspaceId;
        onWorkspaceChange?.(workspaceId, workspace);
      }
      
    } finally {
      syncInProgressRef.current = false;
      setIsSyncing(false);
    }
  }, [workspaces, fetchWorkspaces, onWorkspaceChange]);

  // ======================= EFFECTS =======================
  
  // Initialize and set up storage listener
  useEffect(() => {
    // Initialize refs with current values
    const token = getToken();
    lastTokenRef.current = token;
    
    if (token) {
      const context = getWorkspaceFromToken(token);
      lastWorkspaceIdRef.current = context.workspaceId;
    }
    
    // Initial fetch
    fetchWorkspaces();
    
    // Set up storage event listener for cross-tab sync
    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Periodic token validation (detect expiration)
  useEffect(() => {
    const checkToken = () => {
      const token = getToken();
      if (token && isTokenExpired(token)) {
        console.log(`[${APP_ID}] Token expired - requesting auth`);
        onAuthRequired?.();
      }
    };
    
    // Check every minute
    const interval = setInterval(checkToken, 60000);
    
    return () => clearInterval(interval);
  }, [getToken, onAuthRequired]);

  // ======================= CONTEXT VALUE =======================
  
  const value = {
    // State
    workspaces,
    activeWorkspace,
    activeOrg,
    loading,
    isSyncing,
    error,
    appId: APP_ID,
    
    // Derived
    isAuthenticated: !!getToken() && !isTokenExpired(getToken()),
    activeWorkspaceId: activeWorkspace?.id || null,
    activeOrgId: activeOrg?.id || null,
    
    // Actions
    switchWorkspace,
    refreshToken,
    refresh: fetchWorkspaces,
    
    // Helpers
    getWorkspaceById: (id) => workspaces.find(w => w.id === id),
    hasWorkspaceAccess: (id) => workspaces.some(w => w.id === id),
  };
  
  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

// ======================= HOOK =======================

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  
  return context;
};

// ======================= HOC FOR CLASS COMPONENTS =======================

export const withWorkspace = (Component) => {
  return function WorkspaceWrapper(props) {
    const workspace = useWorkspace();
    return <Component {...props} workspace={workspace} />;
  };
};

// ======================= WORKSPACE GUARD COMPONENT =======================

/**
 * WorkspaceGuard - Ensures user has access to current workspace
 * Shows loading during sync, redirects on workspace mismatch
 */
export const WorkspaceGuard = ({ 
  children, 
  fallback = null,
  requiredWorkspaceId = null 
}) => {
  const { 
    activeWorkspace, 
    loading, 
    isSyncing, 
    hasWorkspaceAccess,
    isAuthenticated 
  } = useWorkspace();
  
  // Loading state
  if (loading || isSyncing) {
    return fallback || (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
        <span className="ml-3 text-gray-400">Syncing workspace...</span>
      </div>
    );
  }
  
  // Not authenticated
  if (!isAuthenticated) {
    return fallback || (
      <div className="text-center py-8 text-gray-400">
        Please log in to continue
      </div>
    );
  }
  
  // Required workspace check
  if (requiredWorkspaceId && activeWorkspace?.id !== requiredWorkspaceId) {
    if (!hasWorkspaceAccess(requiredWorkspaceId)) {
      return (
        <div className="text-center py-8 text-red-400">
          You don't have access to this workspace
        </div>
      );
    }
  }
  
  return children;
};

// ======================= EXPORTS =======================

export default useWorkspace;
