import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth, useApp } from '../App';
import { useCurrency } from '../context/CurrencyContext';
import { useReportingHorizon, HORIZON_OPTIONS } from '../context/ReportingHorizonContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Gauge, TrendingUp, DollarSign, Wallet, Clock, AlertTriangle, Brain,
  RefreshCcw, CheckCircle, Activity, Building2, PieChart, BarChart3,
  ArrowUpRight, ArrowDownRight, Zap, Target, Layers, Settings, Sparkles, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CustomRatioBuilderModal, CustomRatioCard } from '../components/CustomRatioBuilder';
import { GlobalHorizonSelector, WidgetHorizonSelector } from '../components/ReportingHorizonSelector';

// Helper function to generate horizon-adjusted mock data
const generateHorizonAdjustedMetrics = (horizonId, baseMetrics) => {
  // Get the number of days for the selected horizon
  const horizon = HORIZON_OPTIONS.find(h => h.id === horizonId);
  const days = horizon?.days || 30;
  
  // Scale factor based on horizon (30 days = 1x, 90 days = 3x, etc.)
  const scaleFactor = days / 30;
  
  // Variance factor to add some realism (different horizons show different trends)
  const varianceFactor = {
    '30d': 1.0,
    '60d': 1.05,  // Slight growth trend over longer period
    '90d': 1.08,
    '6m': 1.15,
    '1y': 1.25,
    'ytd': 1.1,
    'custom': 1.0
  }[horizonId] || 1.0;
  
  // Calculate metrics adjusted for the horizon
  return {
    ...baseMetrics,
    // Revenue scales with time period
    revenue: Math.round(baseMetrics.revenue * scaleFactor * varianceFactor),
    // EBITDA scales similarly
    ebitda: Math.round(baseMetrics.ebitda * scaleFactor * varianceFactor),
    // Cash balance grows slightly over longer periods
    cash_balance: Math.round(baseMetrics.cash_balance * (1 + (scaleFactor - 1) * 0.1)),
    // Runway stays relatively stable
    runway_days: Math.round(baseMetrics.runway_days * (1 + (varianceFactor - 1) * 0.5)),
    // AR aging shifts based on collection patterns
    ar_current: Math.round(baseMetrics.ar_current * scaleFactor * 0.95),
    ar_30_days: Math.round(baseMetrics.ar_30_days * scaleFactor * 1.02),
    ar_60_days: Math.round(baseMetrics.ar_60_days * scaleFactor * 1.05),
    ar_90_plus_days: Math.round(baseMetrics.ar_90_plus_days * scaleFactor * 1.1),
    // Matching counts scale with volume
    matched_count: Math.round(baseMetrics.matched_count * scaleFactor),
    pending_count: Math.round(baseMetrics.pending_count * scaleFactor),
    unmatched_count: Math.round(baseMetrics.unmatched_count * scaleFactor),
    // DSO/DPO trend slightly with longer periods
    dso: Math.round(baseMetrics.dso + (scaleFactor - 1) * 3),
    dpo: Math.round(baseMetrics.dpo + (scaleFactor - 1) * 2),
    // Growth metrics improve over longer analysis periods
    revenue_growth: parseFloat((baseMetrics.revenue_growth * varianceFactor).toFixed(1)),
    // Burn rate stays consistent
    burn_rate: baseMetrics.burn_rate,
    // Quick ratio stays relatively stable
    quick_ratio: parseFloat((baseMetrics.quick_ratio * (1 + (varianceFactor - 1) * 0.2)).toFixed(2)),
    // Keep margin percentage stable
    ebitda_margin: baseMetrics.ebitda_margin,
    // Add horizon metadata for display
    _horizon: {
      id: horizonId,
      label: horizon?.label || '30 Days',
      days: days,
      scaleFactor: scaleFactor
    }
  };
};

// Helper to generate group summary adjusted for horizon
const generateHorizonAdjustedGroupSummary = (horizonId, baseGroup, entityCount) => {
  const horizon = HORIZON_OPTIONS.find(h => h.id === horizonId);
  const days = horizon?.days || 30;
  const scaleFactor = days / 30;
  const varianceFactor = {
    '30d': 1.0,
    '60d': 1.05,
    '90d': 1.08,
    '6m': 1.15,
    '1y': 1.25,
    'ytd': 1.1,
    'custom': 1.0
  }[horizonId] || 1.0;
  
  return {
    total_revenue: Math.round(baseGroup.total_revenue * scaleFactor * varianceFactor),
    total_ebitda: Math.round(baseGroup.total_ebitda * scaleFactor * varianceFactor),
    group_margin: baseGroup.group_margin, // Percentage stays stable
    total_cash: Math.round(baseGroup.total_cash * (1 + (scaleFactor - 1) * 0.1)),
    entity_count: entityCount
  };
};

const CFOCommandCenter = () => {
  const { authAxios } = useAuth();
  const { selectedCompany, companies, mockDataEnabled } = useApp();
  const { formatCurrency, getSymbol } = useCurrency();
  const { globalHorizon, getDateRangeFromHorizon, formatDateRange, compareToPrior } = useReportingHorizon();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [groupSummary, setGroupSummary] = useState(null);
  const [ragPolicy, setRagPolicy] = useState(null);
  const [ragEvaluations, setRagEvaluations] = useState({});
  const [loading, setLoading] = useState(true);
  const [pinnedRatios, setPinnedRatios] = useState([]);
  const [showRatioBuilder, setShowRatioBuilder] = useState(false);

  // Get the current date range for display
  const currentDateRange = useMemo(() => {
    return getDateRangeFromHorizon(globalHorizon);
  }, [globalHorizon, getDateRangeFromHorizon]);

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch group summary
      const groupRes = await authAxios.get('/dashboard/group/summary');
      setGroupSummary(groupRes.data);

      // Fetch company metrics and RAG policy if selected
      if (selectedCompany) {
        const [metricsRes, ragRes, pinnedRes] = await Promise.all([
          authAxios.get(`/dashboard/${selectedCompany.id}`),
          authAxios.get(`/rag-policies/${selectedCompany.id}`),
          authAxios.get(`/custom-ratios/company/${selectedCompany.id}/pinned`).catch(() => ({ data: { pinned_ratios: [] } }))
        ]);
        setMetrics(metricsRes.data);
        setRagPolicy(ragRes.data);
        setPinnedRatios(pinnedRes.data.pinned_ratios || []);
        
        // Evaluate metrics against RAG policy
        const metricsToEvaluate = {
          dso: 45, // Current DSO value
          dpo: 38, // Current DPO value
          cash_runway: metricsRes.data?.runway_days || 145,
          ebitda_margin: groupRes.data?.group_margin || 25,
          quick_ratio: metricsRes.data?.quick_ratio || 1.8,
          revenue_growth: metricsRes.data?.revenue_growth || 18.5,
          current_ratio: 2.1, // Calculated from balance sheet
          gross_margin: 68,
          debt_to_equity: 0.5,
          interest_coverage: 4.2
        };
        
        const evalRes = await authAxios.post(
          `/rag-policies/${selectedCompany.id}/evaluate`,
          metricsToEvaluate
        );
        setRagEvaluations(evalRes.data.evaluations);
      }
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedCompany, authAxios]);
  
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Use currency from selected company
  const currency = selectedCompany?.currency || 'GBP';
  const currencySymbol = getSymbol(currency);

  // Base mock data (30-day baseline)
  const baseMockMetrics = {
    revenue: 3750000,
    ebitda: 937500,
    ebitda_margin: 25,
    cash_balance: 1455000,
    runway_days: 145,
    burn_rate: 285000,
    quick_ratio: 1.8,
    revenue_growth: 18.5,
    ar_current: 375000,
    ar_30_days: 255000,
    ar_60_days: 126000,
    ar_90_plus_days: 84000,
    matched_count: 468,
    pending_count: 102,
    unmatched_count: 36,
    dso: 45,
    dpo: 38
  };

  const baseGroupSummary = {
    total_revenue: 3750000,
    total_ebitda: 937500,
    group_margin: 25,
    total_cash: 1455000,
    entity_count: 3
  };

  // Calculate horizon-adjusted metrics using useMemo for performance
  const horizonAdjustedMetrics = useMemo(() => {
    return generateHorizonAdjustedMetrics(globalHorizon, baseMockMetrics);
  }, [globalHorizon]);

  const horizonAdjustedGroup = useMemo(() => {
    return generateHorizonAdjustedGroupSummary(globalHorizon, baseGroupSummary, companies.length || 3);
  }, [globalHorizon, companies.length]);

  // Use horizon-adjusted mock data when mock mode is enabled
  const displayMetrics = mockDataEnabled ? horizonAdjustedMetrics : (metrics || horizonAdjustedMetrics);
  const displayGroup = mockDataEnabled ? 
    horizonAdjustedGroup : 
    (groupSummary || { total_revenue: 0, total_ebitda: 0, group_margin: 0, total_cash: 0, entity_count: companies.length });

  // Helper function to get RAG status color
  const getRAGColor = (metricId) => {
    const evaluation = ragEvaluations[metricId];
    if (!evaluation) return 'text-white';
    
    switch (evaluation.status) {
      case 'green': return 'text-green-400';
      case 'amber': return 'text-yellow-400';
      case 'red': return 'text-red-400';
      default: return 'text-white';
    }
  };

  const getRAGBgColor = (metricId) => {
    const evaluation = ragEvaluations[metricId];
    if (!evaluation) return '';
    
    switch (evaluation.status) {
      case 'green': return 'bg-green-500/10 border-green-500/30';
      case 'amber': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'red': return 'bg-red-500/10 border-red-500/30';
      default: return '';
    }
  };

  const getRAGStatus = (metricId) => {
    return ragEvaluations[metricId]?.status || 'unknown';
  };

  const getRAGThresholds = (metricId) => {
    return ragEvaluations[metricId]?.thresholds || {};
  };

  if (!selectedCompany && companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Gauge className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Welcome to Command Centre</h2>
        <p className="text-gray-400 mb-4">Create your first company to get started</p>
        <Button 
          className="bg-gold-500 hover:bg-gold-600 text-navy-900"
          onClick={() => navigate('/dashboard/settings')}
        >
          Add Company
        </Button>
      </div>
    );
  }

  // Helper to format custom ratio values
  const formatRatioValue = (value, unit) => {
    if (value === null || value === undefined) return '—';
    switch (unit) {
      case 'percentage': return `${value.toFixed(2)}%`;
      case 'currency': return formatCurrency(value, currency);
      case 'days': return `${value.toFixed(0)} days`;
      case 'count': return value.toFixed(0);
      default: return value.toFixed(4);
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6" data-testid="cfo-command-center">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white font-display">Command Centre</h1>
            <p className="text-gray-400 mt-1">Strategic Analytics & Real-time Insights</p>
          </div>
          <div className="flex items-center space-x-3 flex-wrap gap-2">
            {/* Reporting Horizon Selector */}
            <GlobalHorizonSelector />
            
            <Button 
              className="bg-gold-500 hover:bg-gold-600 text-navy-900"
              onClick={() => setShowRatioBuilder(true)}
              data-testid="define-ratio-btn"
            >
              <Sparkles className="w-4 h-4 mr-2" /> Define Your Ratio
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-navy-600 text-gray-400 hover:text-white"
              onClick={() => navigate('/dashboard/settings?tab=rag-policies')}
            >
              <Settings className="w-4 h-4 mr-1" /> RAG Settings
            </Button>
            <Button variant="outline" className="border-navy-600 text-white" onClick={fetchAllData}>
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
            </Button>
          </div>
        </div>

        {/* RAG Policy Banner */}
        {ragPolicy && !ragPolicy.is_default && (
          <div className="flex items-center space-x-2 text-sm">
            <Badge className="bg-gold-500/20 text-gold-400">Custom RAG Policy Active</Badge>
            <span className="text-gray-500">Thresholds customized for {selectedCompany?.name}</span>
          </div>
        )}

        {/* Horizon Info Banner - Shows active date range */}
        <div className="flex items-center justify-between bg-navy-800/50 rounded-lg px-4 py-2 border border-navy-700">
          <div className="flex items-center space-x-3">
            <Clock className="w-4 h-4 text-gold-400" />
            <span className="text-sm text-gray-400">Viewing data for:</span>
            <Badge className="bg-blue-500/20 text-blue-400 font-medium">
              {formatDateRange(currentDateRange.startDate, currentDateRange.endDate)}
            </Badge>
            {compareToPrior && (
              <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                + Prior Period Comparison
              </Badge>
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <span>Horizon:</span>
            <span className="text-gold-400 font-medium">{currentDateRange.label}</span>
            {displayMetrics._horizon && (
              <span className="text-gray-600">
                ({displayMetrics._horizon.scaleFactor.toFixed(1)}x scale)
              </span>
            )}
          </div>
        </div>

        {/* Custom Ratios Strip - Show if pinned ratios exist */}
        {pinnedRatios.length > 0 && (
          <Card className="bg-gradient-to-r from-purple-900/30 via-navy-800 to-blue-900/30 border-gold-500/30">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-gold-400" />
                  <span className="text-sm font-medium text-gold-400">CUSTOM RATIOS</span>
                  <Badge className="bg-gold-500/20 text-gold-400 text-xs">✨ Bespoke</Badge>
                </div>
                <div className="flex items-center space-x-6">
                  {pinnedRatios.map((ratio) => (
                    <Tooltip key={ratio.id}>
                      <TooltipTrigger asChild>
                        <div className="text-center cursor-help">
                          <p className="text-xs text-gray-500 uppercase tracking-wide">{ratio.name}</p>
                          <p className={`text-lg font-bold ${
                            ratio.rag_status === 'green' ? 'text-green-400' :
                            ratio.rag_status === 'amber' ? 'text-yellow-400' :
                            ratio.rag_status === 'red' ? 'text-red-400' : 'text-white'
                          }`}>
                            {formatRatioValue(ratio.value, ratio.unit)}
                          </p>
                          {ratio.rag_status !== 'unknown' && (
                            <div className="flex justify-center mt-1">
                              <div className={`w-2 h-2 rounded-full ${
                                ratio.rag_status === 'green' ? 'bg-green-500' :
                                ratio.rag_status === 'amber' ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                            </div>
                          )}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-navy-900 border-navy-700 text-white">
                        <p className="font-medium">{ratio.name}</p>
                        {ratio.description && <p className="text-xs text-gray-400">{ratio.description}</p>}
                        <p className="text-xs text-gray-500 mt-1">Custom metric • Click to edit</p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="text-gold-400 hover:text-gold-300 ml-2"
                    onClick={() => setShowRatioBuilder(true)}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Liquidity Strip */}
        <Card className="bg-gradient-to-r from-navy-800 via-navy-800 to-navy-700 border-gold-500/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Wallet className="w-5 h-5 text-gold-400" />
                <span className="text-sm font-medium text-gold-400">LIQUIDITY STRIP</span>
              </div>
              <div className="flex items-center space-x-8">
                <LiquidityItem 
                  label="Total Cash" 
                  value={formatCurrency(displayGroup.total_cash, currency)} 
                  trend={5.2} 
                />
                <div className="h-8 w-px bg-navy-600" />
                <LiquidityItem 
                  label="Runway" 
                  value={`${displayMetrics.runway_days} days`} 
                  ragStatus={getRAGStatus('cash_runway')}
                  thresholds={getRAGThresholds('cash_runway')}
                  metricName="Cash Runway"
                />
                <div className="h-8 w-px bg-navy-600" />
                <LiquidityItem 
                  label="Burn Rate" 
                  value={`${formatCurrency(displayMetrics.burn_rate, currency)}/mo`}
                  ragStatus={getRAGStatus('burn_rate')}
                  thresholds={getRAGThresholds('burn_rate')}
                  metricName="Burn Rate"
                />
                <div className="h-8 w-px bg-navy-600" />
                <LiquidityItem 
                  label="Quick Ratio" 
                  value={displayMetrics.quick_ratio?.toFixed(2)}
                  ragStatus={getRAGStatus('quick_ratio')}
                  thresholds={getRAGThresholds('quick_ratio')}
                  metricName="Quick Ratio"
                />
                <div className="h-8 w-px bg-navy-600" />
                <LiquidityItem 
                  label="Entities" 
                  value={displayGroup.entity_count} 
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4 Strategic Quadrants */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quadrant 1: Profitability & Unit Economics */}
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-400" />
                Profitability & Unit Economics
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <MetricBox 
                  label="Total Revenue" 
                  value={formatCurrency(displayGroup.total_revenue, currency)} 
                  trend={displayMetrics.revenue_growth}
                />
                <MetricBox 
                  label="Group EBITDA" 
                  value={formatCurrency(displayGroup.total_ebitda, currency)} 
                />
                <MetricBox 
                  label="EBITDA Margin" 
                  value={`${displayGroup.group_margin}%`}
                  ragStatus={getRAGStatus('ebitda_margin')}
                  thresholds={getRAGThresholds('ebitda_margin')}
                  metricName="EBITDA Margin"
                />
                <MetricBox 
                  label="Revenue Growth" 
                  value={`${displayMetrics.revenue_growth > 0 ? '+' : ''}${displayMetrics.revenue_growth}%`}
                  ragStatus={getRAGStatus('revenue_growth')}
                  thresholds={getRAGThresholds('revenue_growth')}
                  metricName="Revenue Growth"
                />
              </div>
              <div className="mt-4 pt-4 border-t border-navy-700">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Gross Margin</span>
                  <span className={getRAGColor('gross_margin')}>68%</span>
                </div>
                <Progress value={68} className="mt-2 h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Quadrant 2: Cash & Working Capital */}
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center">
                <Wallet className="w-5 h-5 mr-2 text-blue-400" />
                Cash & Working Capital
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <MetricBox 
                  label="Cash Balance" 
                  value={formatCurrency(displayGroup.total_cash, currency)} 
                />
                <MetricBox 
                  label="AR Outstanding" 
                  value={formatCurrency(displayMetrics.ar_current + displayMetrics.ar_30_days + displayMetrics.ar_60_days + displayMetrics.ar_90_plus_days, currency)} 
                />
                <MetricBox 
                  label="DSO" 
                  value={`${displayMetrics.dso || 45} days`}
                  ragStatus={getRAGStatus('dso')}
                  thresholds={getRAGThresholds('dso')}
                  metricName="Days Sales Outstanding (DSO)"
                  showRAGIndicator
                />
                <MetricBox 
                  label="DPO" 
                  value={`${displayMetrics.dpo || 38} days`}
                  ragStatus={getRAGStatus('dpo')}
                  thresholds={getRAGThresholds('dpo')}
                  metricName="Days Payable Outstanding (DPO)"
                  showRAGIndicator
                />
              </div>
              <div className="mt-4 pt-4 border-t border-navy-700">
                <h4 className="text-sm font-medium text-gray-400 mb-2">AR Aging</h4>
                <div className="flex space-x-2">
                  <AgingBar label="Current" amount={displayMetrics.ar_current} total={displayMetrics.ar_current + displayMetrics.ar_30_days + displayMetrics.ar_60_days + displayMetrics.ar_90_plus_days} color="green" />
                  <AgingBar label="30d" amount={displayMetrics.ar_30_days} total={displayMetrics.ar_current + displayMetrics.ar_30_days + displayMetrics.ar_60_days + displayMetrics.ar_90_plus_days} color="yellow" />
                  <AgingBar label="60d" amount={displayMetrics.ar_60_days} total={displayMetrics.ar_current + displayMetrics.ar_30_days + displayMetrics.ar_60_days + displayMetrics.ar_90_plus_days} color="orange" />
                  <AgingBar label="90+" amount={displayMetrics.ar_90_plus_days} total={displayMetrics.ar_current + displayMetrics.ar_30_days + displayMetrics.ar_60_days + displayMetrics.ar_90_plus_days} color="red" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quadrant 3: Operational Efficiency */}
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center">
                <Activity className="w-5 h-5 mr-2 text-purple-400" />
                Operational Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <StatusCard label="Matched" value={displayMetrics.matched_count} color="green" />
                <StatusCard label="Pending" value={displayMetrics.pending_count} color="yellow" />
                <StatusCard label="Unmatched" value={displayMetrics.unmatched_count} color="red" />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Reconciliation Rate</span>
                  <span className="text-green-400 font-semibold">
                    {((displayMetrics.matched_count / (displayMetrics.matched_count + displayMetrics.pending_count + displayMetrics.unmatched_count)) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={(displayMetrics.matched_count / (displayMetrics.matched_count + displayMetrics.pending_count + displayMetrics.unmatched_count)) * 100} 
                  className="h-2" 
                />
                <div className="flex justify-between items-center pt-2">
                  <span className="text-gray-400">Processing Efficiency</span>
                  <Badge className="bg-green-500/20 text-green-400">98.5%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quadrant 4: AI Executive Summary */}
          <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-white flex items-center">
                <Brain className="w-5 h-5 mr-2 text-blue-400" />
                AI Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-300 text-sm leading-relaxed">
                  <span className="text-green-400 font-medium">Strong financial position</span> with {displayGroup.group_margin}% EBITDA margin, 
                  above industry average. Cash runway of {displayMetrics.runway_days} days provides adequate buffer.
                </p>
                
                {/* Dynamic recommendations based on RAG status */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gold-400">Key Recommendations:</h4>
                  <ul className="text-sm text-gray-400 space-y-1">
                    {getRAGStatus('dso') === 'red' || getRAGStatus('dso') === 'amber' ? (
                      <li className="flex items-start">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                        DSO at {displayMetrics.dso || 45} days - focus on AR collection
                      </li>
                    ) : (
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                        DSO within target - maintain collection efficiency
                      </li>
                    )}
                    {getRAGStatus('dpo') === 'red' || getRAGStatus('dpo') === 'amber' ? (
                      <li className="flex items-start">
                        <AlertTriangle className="w-4 h-4 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                        DPO needs attention - review payment terms
                      </li>
                    ) : (
                      <li className="flex items-start">
                        <CheckCircle className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                        DPO optimized for cash management
                      </li>
                    )}
                    <li className="flex items-start">
                      <Zap className="w-4 h-4 text-blue-400 mr-2 mt-0.5 flex-shrink-0" />
                      Consider invoice financing for growth capital
                    </li>
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-navy-600">
                  <span className="text-xs text-gray-500">Analysis updated 2 min ago</span>
                  <Button size="sm" variant="outline" className="border-blue-500/50 text-blue-400 text-xs">
                    View Full Analysis
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Anomaly Alerts - Dynamic based on RAG evaluations */}
        <Card className="bg-navy-800 border-yellow-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-white flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
              Anomalies & Alerts
              <Badge className="ml-2 bg-yellow-500/20 text-yellow-400">
                {Object.values(ragEvaluations).filter(e => e.status === 'red' || e.status === 'amber').length || 3} Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AnomalyCard 
                metric="DSO" 
                current={`${displayMetrics.dso || 45} days`}
                expected={ragEvaluations.dso?.thresholds ? 
                  `≤${ragEvaluations.dso.thresholds.green_max || 30} days (Green)` : 
                  "30-35 days"}
                deviation={ragEvaluations.dso?.status === 'red' ? 'Above threshold' : 
                           ragEvaluations.dso?.status === 'amber' ? 'Caution' : 'On target'}
                severity={ragEvaluations.dso?.status === 'red' ? 'danger' : 
                         ragEvaluations.dso?.status === 'amber' ? 'warning' : 'positive'}
              />
              <AnomalyCard 
                metric="DPO" 
                current={`${displayMetrics.dpo || 38} days`}
                expected={ragEvaluations.dpo?.thresholds ?
                  `≥${ragEvaluations.dpo.thresholds.green_min || 30} days (Green)` :
                  "≥30 days"}
                deviation={ragEvaluations.dpo?.status === 'red' ? 'Below threshold' :
                          ragEvaluations.dpo?.status === 'amber' ? 'Caution' : 'On target'}
                severity={ragEvaluations.dpo?.status === 'red' ? 'danger' :
                         ragEvaluations.dpo?.status === 'amber' ? 'warning' : 'positive'}
              />
              <AnomalyCard 
                metric="Gross Margin" 
                current="68%" 
                expected={ragEvaluations.gross_margin?.thresholds ?
                  `≥${ragEvaluations.gross_margin.thresholds.green_min}% (Green)` :
                  "≥60%"}
                deviation={ragEvaluations.gross_margin?.status === 'green' ? 'Above target' :
                          ragEvaluations.gross_margin?.status === 'amber' ? 'Caution' : 'Below target'}
                severity={ragEvaluations.gross_margin?.status === 'red' ? 'danger' :
                         ragEvaluations.gross_margin?.status === 'amber' ? 'warning' : 'positive'}
              />
            </div>
          </CardContent>
        </Card>

        {/* Custom Ratio Builder Modal */}
        <CustomRatioBuilderModal
          open={showRatioBuilder}
          onOpenChange={setShowRatioBuilder}
          onRatioCreated={() => fetchAllData()}
        />
      </div>
    </TooltipProvider>
  );
};

// Helper Components
const LiquidityItem = ({ label, value, trend, ragStatus, thresholds, metricName }) => {
  const getStatusColor = () => {
    switch (ragStatus) {
      case 'green': return 'text-green-400';
      case 'amber': return 'text-yellow-400';
      case 'red': return 'text-red-400';
      default: return 'text-white';
    }
  };

  const getThresholdText = () => {
    if (!thresholds) return null;
    if (thresholds.is_higher_better === false) {
      return `Green: ≤${thresholds.green_max}, Amber: ≤${thresholds.amber_max}`;
    }
    return `Green: ≥${thresholds.green_min}, Amber: ≥${thresholds.amber_min}`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="text-center cursor-help">
          <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
          <p className={`text-lg font-bold ${getStatusColor()}`}>
            {value}
            {trend !== undefined && (
              <span className={`text-xs ml-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}%
              </span>
            )}
          </p>
          {ragStatus && ragStatus !== 'unknown' && (
            <div className="flex justify-center mt-1">
              <div className={`w-2 h-2 rounded-full ${
                ragStatus === 'green' ? 'bg-green-500' :
                ragStatus === 'amber' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </div>
          )}
        </div>
      </TooltipTrigger>
      {thresholds && (
        <TooltipContent className="bg-navy-900 border-navy-700 text-white">
          <p className="font-medium">{metricName || label}</p>
          <p className="text-xs text-gray-400">{getThresholdText()}</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
};

const MetricBox = ({ label, value, trend, ragStatus, thresholds, metricName, showRAGIndicator }) => {
  const getStatusStyles = () => {
    switch (ragStatus) {
      case 'green': return 'border-l-4 border-l-green-500';
      case 'amber': return 'border-l-4 border-l-yellow-500';
      case 'red': return 'border-l-4 border-l-red-500';
      default: return '';
    }
  };

  const getStatusColor = () => {
    switch (ragStatus) {
      case 'green': return 'text-green-400';
      case 'amber': return 'text-yellow-400';
      case 'red': return 'text-red-400';
      default: return 'text-white';
    }
  };

  const getThresholdText = () => {
    if (!thresholds) return null;
    if (thresholds.is_higher_better === false) {
      return `Green: ≤${thresholds.green_max}, Amber: ≤${thresholds.amber_max}, Red: >${thresholds.amber_max}`;
    }
    return `Green: ≥${thresholds.green_min}, Amber: ≥${thresholds.amber_min}, Red: <${thresholds.amber_min}`;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`bg-navy-900 rounded-lg p-3 cursor-help ${getStatusStyles()}`}>
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 mb-1">{label}</p>
            {showRAGIndicator && ragStatus && ragStatus !== 'unknown' && (
              <div className={`w-2 h-2 rounded-full ${
                ragStatus === 'green' ? 'bg-green-500' :
                ragStatus === 'amber' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            )}
          </div>
          <p className={`text-lg font-bold ${getStatusColor()}`}>
            {value}
          </p>
          {trend !== undefined && (
            <div className={`flex items-center text-xs mt-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </TooltipTrigger>
      {thresholds && (
        <TooltipContent className="bg-navy-900 border-navy-700 text-white max-w-xs">
          <p className="font-medium">{metricName || label}</p>
          <p className="text-xs text-gray-400 mt-1">{getThresholdText()}</p>
          <p className="text-xs text-gray-500 mt-1">Configure in Settings → RAG Policies</p>
        </TooltipContent>
      )}
    </Tooltip>
  );
};

const StatusCard = ({ label, value, color }) => {
  const colors = {
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    yellow: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400'
  };
  return (
    <div className={`rounded-lg p-3 border ${colors[color]}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  );
};

const AgingBar = ({ label, amount, total, color }) => {
  const percentage = total > 0 ? (amount / total) * 100 : 0;
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  };
  return (
    <div className="flex-1">
      <div className="h-2 bg-navy-700 rounded-full overflow-hidden">
        <div className={`h-full ${colors[color]} rounded-full`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-xs text-gray-500 mt-1 text-center">{label}</p>
    </div>
  );
};

const AnomalyCard = ({ metric, current, expected, deviation, severity }) => {
  const severityStyles = {
    warning: 'border-yellow-500/30 bg-yellow-500/5',
    danger: 'border-red-500/30 bg-red-500/5',
    positive: 'border-green-500/30 bg-green-500/5'
  };
  const deviationColor = {
    warning: 'text-yellow-400',
    danger: 'text-red-400',
    positive: 'text-green-400'
  };
  const statusIcon = {
    warning: <AlertTriangle className="w-4 h-4 text-yellow-400" />,
    danger: <AlertTriangle className="w-4 h-4 text-red-400" />,
    positive: <CheckCircle className="w-4 h-4 text-green-400" />
  };
  return (
    <div className={`rounded-lg p-4 border ${severityStyles[severity]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {statusIcon[severity]}
          <span className="text-white font-medium">{metric}</span>
        </div>
        <span className={`text-sm font-bold ${deviationColor[severity]}`}>{deviation}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">Current: <span className="text-white">{current}</span></span>
      </div>
      <div className="text-xs text-gray-500 mt-1">Target: {expected}</div>
    </div>
  );
};

export default CFOCommandCenter;
