/**
 * usePlanFeatures - Hook for feature gating based on organization plan
 * 
 * Checks if the current org/workspace has access to premium features.
 * Used for Plan-Based Permissions in the Multi-Tenant Reseller model.
 * 
 * Usage:
 *   const { hasFeature, checkFeature, plan, limits } = usePlanFeatures();
 *   
 *   if (hasFeature('ai_editing')) {
 *     // Show AI editing UI
 *   }
 */

import { useState, useEffect, useCallback } from 'react';
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

// Feature definitions with display info
export const FEATURE_DEFINITIONS = {
  ai_editing: {
    name: 'AI Editing',
    description: 'AI-powered data editing and suggestions',
    minPlan: 'professional'
  },
  strategic_capital: {
    name: 'Strategic Capital',
    description: 'Capital planning and scenario modeling',
    minPlan: 'professional'
  },
  data_room: {
    name: 'Lender Data Room',
    description: 'Secure document sharing for lenders',
    minPlan: 'enterprise'
  },
  api_access: {
    name: 'API Access',
    description: 'Programmatic access via REST API',
    minPlan: 'professional'
  },
  white_label: {
    name: 'White Label',
    description: 'Custom branding and domain',
    minPlan: 'enterprise'
  },
  sub_tenancy: {
    name: 'Sub-Tenancy',
    description: 'Multiple client workspaces',
    minPlan: 'enterprise'
  },
  advanced_reports: {
    name: 'Advanced Reports',
    description: 'Custom report builder',
    minPlan: 'starter'
  },
  priority_support: {
    name: 'Priority Support',
    description: '24-hour response time',
    minPlan: 'professional'
  },
  dedicated_support: {
    name: 'Dedicated Support',
    description: 'Named account manager',
    minPlan: 'enterprise'
  }
};

// Plan hierarchy for comparison
const PLAN_HIERARCHY = {
  free: 0,
  starter: 1,
  professional: 2,
  enterprise: 3
};

export const usePlanFeatures = () => {
  const { activeOrg, activeWorkspace, isAuthenticated } = useWorkspace();
  
  const [plan, setPlan] = useState(null);
  const [features, setFeatures] = useState({});
  const [limits, setLimits] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Cache for feature checks
  const [featureCache, setFeatureCache] = useState({});
  
  // Get auth token
  const getToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('token');
  };
  
  // Fetch plan details
  const fetchPlan = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      // Get org's plan
      let planId = 'plan_free';
      
      // Check workspace plan first (for reseller clients)
      if (activeWorkspace?.plan_id) {
        planId = activeWorkspace.plan_id;
      } else if (activeOrg?.plan_id) {
        planId = activeOrg.plan_id;
      }
      
      // Fetch plan details
      const res = await axios.get(`${API_BASE}/org/plans/${planId}`, { headers });
      
      setPlan(res.data);
      setFeatures(res.data.features || {});
      setLimits(res.data.limits || {});
      setFeatureCache({}); // Clear cache when plan changes
      
    } catch (e) {
      console.error('Failed to fetch plan:', e);
      // Default to free plan features
      setPlan({ id: 'plan_free', name: 'Free' });
      setFeatures({});
      setLimits({});
    } finally {
      setLoading(false);
    }
  }, [activeOrg, activeWorkspace, isAuthenticated]);
  
  // Fetch on mount and when org/workspace changes
  useEffect(() => {
    fetchPlan();
  }, [fetchPlan]);
  
  /**
   * Check if current plan has a specific feature
   */
  const hasFeature = useCallback((featureKey) => {
    // Check cache first
    if (featureCache[featureKey] !== undefined) {
      return featureCache[featureKey];
    }
    
    const hasIt = features[featureKey] === true;
    
    // Update cache
    setFeatureCache(prev => ({ ...prev, [featureKey]: hasIt }));
    
    return hasIt;
  }, [features, featureCache]);
  
  /**
   * Check feature with async API call (for server-side verification)
   */
  const checkFeature = useCallback(async (featureKey) => {
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      
      const res = await axios.get(
        `${API_BASE}/org/features/check/${featureKey}`,
        { headers }
      );
      
      return res.data.has_access === true;
    } catch (e) {
      console.error(`Failed to check feature ${featureKey}:`, e);
      return false;
    }
  }, []);
  
  /**
   * Check if a limit is exceeded
   */
  const isLimitExceeded = useCallback((limitKey, currentValue) => {
    const limit = limits[limitKey];
    
    // -1 means unlimited
    if (limit === -1) return false;
    
    // No limit defined, assume exceeded
    if (limit === undefined) return true;
    
    return currentValue >= limit;
  }, [limits]);
  
  /**
   * Get remaining quota for a limit
   */
  const getRemainingQuota = useCallback((limitKey, currentValue) => {
    const limit = limits[limitKey];
    
    // -1 means unlimited
    if (limit === -1) return Infinity;
    
    // No limit defined
    if (limit === undefined) return 0;
    
    return Math.max(0, limit - currentValue);
  }, [limits]);
  
  /**
   * Get the minimum plan required for a feature
   */
  const getRequiredPlan = useCallback((featureKey) => {
    const definition = FEATURE_DEFINITIONS[featureKey];
    return definition?.minPlan || 'enterprise';
  }, []);
  
  /**
   * Check if current plan is at least a certain tier
   */
  const isPlanAtLeast = useCallback((requiredPlan) => {
    const currentTier = PLAN_HIERARCHY[plan?.id?.replace('plan_', '')] || 0;
    const requiredTier = PLAN_HIERARCHY[requiredPlan] || 0;
    return currentTier >= requiredTier;
  }, [plan]);
  
  return {
    // State
    plan,
    features,
    limits,
    loading,
    error,
    
    // Feature checks
    hasFeature,
    checkFeature,
    
    // Limit checks
    isLimitExceeded,
    getRemainingQuota,
    
    // Plan info
    getRequiredPlan,
    isPlanAtLeast,
    
    // Refresh
    refresh: fetchPlan,
    
    // Feature definitions (for UI)
    featureDefinitions: FEATURE_DEFINITIONS
  };
};

export default usePlanFeatures;
