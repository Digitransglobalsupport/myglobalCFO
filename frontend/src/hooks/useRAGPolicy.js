import { useState, useEffect, useCallback } from 'react';
import { useAuth, useApp } from '../App';

/**
 * Custom hook for RAG (Red/Amber/Green) policy integration
 * Fetches and evaluates metrics against custom thresholds
 */
export const useRAGPolicy = (companyId) => {
  const { authAxios } = useAuth();
  const [ragPolicy, setRagPolicy] = useState(null);
  const [ragEvaluations, setRagEvaluations] = useState({});
  const [loading, setLoading] = useState(false);

  // Fetch RAG policy for a company
  const fetchRAGPolicy = useCallback(async (cId) => {
    if (!cId) return null;
    try {
      const res = await authAxios.get(`/rag-policies/${cId}`);
      return res.data;
    } catch (e) {
      console.error('Error fetching RAG policy:', e);
      return null;
    }
  }, [authAxios]);

  // Evaluate metrics against RAG policy
  const evaluateMetrics = useCallback(async (cId, metrics) => {
    if (!cId || !metrics) return {};
    try {
      const res = await authAxios.post(`/rag-policies/${cId}/evaluate`, metrics);
      return res.data.evaluations || {};
    } catch (e) {
      console.error('Error evaluating metrics:', e);
      return {};
    }
  }, [authAxios]);

  // Load RAG policy when companyId changes
  useEffect(() => {
    if (companyId) {
      setLoading(true);
      fetchRAGPolicy(companyId)
        .then(policy => setRagPolicy(policy))
        .finally(() => setLoading(false));
    }
  }, [companyId, fetchRAGPolicy]);

  // Get RAG status for a specific metric
  const getRAGStatus = useCallback((metricId) => {
    return ragEvaluations[metricId]?.status || 'unknown';
  }, [ragEvaluations]);

  // Get RAG thresholds for a specific metric
  const getRAGThresholds = useCallback((metricId) => {
    return ragEvaluations[metricId]?.thresholds || {};
  }, [ragEvaluations]);

  // Get text color class based on RAG status
  const getRAGTextColor = useCallback((metricId) => {
    const status = getRAGStatus(metricId);
    switch (status) {
      case 'green': return 'text-green-400';
      case 'amber': return 'text-yellow-400';
      case 'red': return 'text-red-400';
      default: return 'text-white';
    }
  }, [getRAGStatus]);

  // Get background color class based on RAG status
  const getRAGBgColor = useCallback((metricId) => {
    const status = getRAGStatus(metricId);
    switch (status) {
      case 'green': return 'bg-green-500/10 border-green-500/30';
      case 'amber': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'red': return 'bg-red-500/10 border-red-500/30';
      default: return '';
    }
  }, [getRAGStatus]);

  // Get badge classes based on RAG status
  const getRAGBadgeColor = useCallback((metricId) => {
    const status = getRAGStatus(metricId);
    switch (status) {
      case 'green': return 'bg-green-500/20 text-green-400';
      case 'amber': return 'bg-yellow-500/20 text-yellow-400';
      case 'red': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  }, [getRAGStatus]);

  // Get border color class based on RAG status
  const getRAGBorderColor = useCallback((metricId) => {
    const status = getRAGStatus(metricId);
    switch (status) {
      case 'green': return 'border-l-4 border-l-green-500';
      case 'amber': return 'border-l-4 border-l-yellow-500';
      case 'red': return 'border-l-4 border-l-red-500';
      default: return '';
    }
  }, [getRAGStatus]);

  // Get status indicator dot
  const getRAGIndicator = useCallback((metricId) => {
    const status = getRAGStatus(metricId);
    if (status === 'unknown') return null;
    const colorClass = status === 'green' ? 'bg-green-500' : 
                      status === 'amber' ? 'bg-yellow-500' : 'bg-red-500';
    return { colorClass, status };
  }, [getRAGStatus]);

  // Evaluate metrics and update state
  const evaluate = useCallback(async (metrics) => {
    if (!companyId) return;
    const evaluations = await evaluateMetrics(companyId, metrics);
    setRagEvaluations(evaluations);
    return evaluations;
  }, [companyId, evaluateMetrics]);

  // Batch evaluate for multiple companies
  const evaluateForCompany = useCallback(async (cId, metrics) => {
    return await evaluateMetrics(cId, metrics);
  }, [evaluateMetrics]);

  return {
    ragPolicy,
    ragEvaluations,
    loading,
    getRAGStatus,
    getRAGThresholds,
    getRAGTextColor,
    getRAGBgColor,
    getRAGBadgeColor,
    getRAGBorderColor,
    getRAGIndicator,
    evaluate,
    evaluateForCompany,
    fetchRAGPolicy,
    isCustomPolicy: ragPolicy && !ragPolicy.is_default
  };
};

/**
 * Hook for batch RAG evaluation across multiple entities
 */
export const useMultiEntityRAG = () => {
  const { authAxios } = useAuth();
  const [entityEvaluations, setEntityEvaluations] = useState({});
  const [loading, setLoading] = useState(false);

  // Evaluate metrics for multiple companies
  const evaluateAllEntities = useCallback(async (entitiesWithMetrics) => {
    if (!entitiesWithMetrics || entitiesWithMetrics.length === 0) return {};
    
    setLoading(true);
    const evaluations = {};
    
    try {
      await Promise.all(
        entitiesWithMetrics.map(async ({ companyId, metrics }) => {
          try {
            const res = await authAxios.post(`/rag-policies/${companyId}/evaluate`, metrics);
            evaluations[companyId] = res.data.evaluations || {};
          } catch (e) {
            console.error(`Error evaluating metrics for company ${companyId}:`, e);
            evaluations[companyId] = {};
          }
        })
      );
      
      setEntityEvaluations(evaluations);
      return evaluations;
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  // Get RAG status for a specific company and metric
  const getEntityRAGStatus = useCallback((companyId, metricId) => {
    return entityEvaluations[companyId]?.[metricId]?.status || 'unknown';
  }, [entityEvaluations]);

  // Get text color for a specific company and metric
  const getEntityRAGTextColor = useCallback((companyId, metricId) => {
    const status = getEntityRAGStatus(companyId, metricId);
    switch (status) {
      case 'green': return 'text-green-400';
      case 'amber': return 'text-yellow-400';
      case 'red': return 'text-red-400';
      default: return 'text-white';
    }
  }, [getEntityRAGStatus]);

  // Get badge color for a specific company and metric
  const getEntityRAGBadgeColor = useCallback((companyId, metricId) => {
    const status = getEntityRAGStatus(companyId, metricId);
    switch (status) {
      case 'green': return 'bg-green-500/20 text-green-400';
      case 'amber': return 'bg-yellow-500/20 text-yellow-400';
      case 'red': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  }, [getEntityRAGStatus]);

  return {
    entityEvaluations,
    loading,
    evaluateAllEntities,
    getEntityRAGStatus,
    getEntityRAGTextColor,
    getEntityRAGBadgeColor
  };
};

export default useRAGPolicy;
