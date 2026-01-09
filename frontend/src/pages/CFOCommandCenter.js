import React, { useState, useEffect } from 'react';
import { useAuth, useApp, useCurrency } from '../App';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Gauge, TrendingUp, DollarSign, Wallet, Clock, AlertTriangle, Brain,
  RefreshCcw, CheckCircle, Activity, Building2, PieChart, BarChart3,
  ArrowUpRight, ArrowDownRight, Zap, Target, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const CFOCommandCenter = () => {
  const { authAxios } = useAuth();
  const { selectedCompany, companies, mockDataEnabled } = useApp();
  const { formatCurrency, getSymbol } = useCurrency();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);
  const [groupSummary, setGroupSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllData();
  }, [selectedCompany]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Fetch group summary
      const groupRes = await authAxios.get('/dashboard/group/summary');
      setGroupSummary(groupRes.data);

      // Fetch company metrics if selected
      if (selectedCompany) {
        const metricsRes = await authAxios.get(`/dashboard/${selectedCompany.id}`);
        setMetrics(metricsRes.data);
      }
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'GBP') => {
    const symbol = { GBP: '£', USD: '$', EUR: '€' }[currency] || '£';
    return `${symbol}${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  // Mock data for display
  const mockMetrics = {
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
    unmatched_count: 36
  };

  const displayMetrics = mockDataEnabled ? mockMetrics : (metrics || mockMetrics);
  const displayGroup = mockDataEnabled ? 
    { total_revenue: 3750000, total_ebitda: 937500, group_margin: 25, total_cash: 1455000, entity_count: 3 } : 
    (groupSummary || { total_revenue: 0, total_ebitda: 0, group_margin: 0, total_cash: 0, entity_count: companies.length });

  if (!selectedCompany && companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Gauge className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Welcome to CFO Command Center</h2>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">CFO Command Center</h1>
          <p className="text-gray-400 mt-1">Strategic Analytics & Real-time Insights</p>
        </div>
        <Button variant="outline" className="border-navy-600 text-white" onClick={fetchAllData}>
          <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

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
                value={formatCurrency(displayGroup.total_cash)} 
                trend={5.2} 
              />
              <div className="h-8 w-px bg-navy-600" />
              <LiquidityItem 
                label="Runway" 
                value={`${displayMetrics.runway_days} days`} 
                warning={displayMetrics.runway_days < 90} 
              />
              <div className="h-8 w-px bg-navy-600" />
              <LiquidityItem 
                label="Burn Rate" 
                value={`${formatCurrency(displayMetrics.burn_rate)}/mo`} 
              />
              <div className="h-8 w-px bg-navy-600" />
              <LiquidityItem 
                label="Quick Ratio" 
                value={displayMetrics.quick_ratio?.toFixed(2)} 
                good={displayMetrics.quick_ratio >= 1.5} 
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
                value={formatCurrency(displayGroup.total_revenue)} 
                trend={displayMetrics.revenue_growth}
              />
              <MetricBox 
                label="Group EBITDA" 
                value={formatCurrency(displayGroup.total_ebitda)} 
              />
              <MetricBox 
                label="EBITDA Margin" 
                value={`${displayGroup.group_margin}%`} 
                good={displayGroup.group_margin >= 20}
              />
              <MetricBox 
                label="Revenue Growth" 
                value={`${displayMetrics.revenue_growth > 0 ? '+' : ''}${displayMetrics.revenue_growth}%`} 
                trend={displayMetrics.revenue_growth}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-navy-700">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Gross Margin Target</span>
                <span className="text-white">68%</span>
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
                value={formatCurrency(displayGroup.total_cash)} 
              />
              <MetricBox 
                label="AR Outstanding" 
                value={formatCurrency(displayMetrics.ar_current + displayMetrics.ar_30_days + displayMetrics.ar_60_days + displayMetrics.ar_90_plus_days)} 
              />
              <MetricBox 
                label="DSO" 
                value="45 days" 
                warning={true}
              />
              <MetricBox 
                label="DPO" 
                value="38 days" 
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
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gold-400">Key Recommendations:</h4>
                <ul className="text-sm text-gray-400 space-y-1">
                  <li className="flex items-start">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2 mt-0.5 flex-shrink-0" />
                    Focus on AR collection to improve working capital
                  </li>
                  <li className="flex items-start">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 mr-2 mt-0.5 flex-shrink-0" />
                    DSO trending above target - review credit terms
                  </li>
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

      {/* Anomaly Alerts */}
      <Card className="bg-navy-800 border-yellow-500/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center">
            <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
            Anomalies & Alerts
            <Badge className="ml-2 bg-yellow-500/20 text-yellow-400">3 Active</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AnomalyCard 
              metric="Marketing Spend" 
              current="£125K" 
              expected="£95K-£110K" 
              deviation="+14%" 
              severity="warning"
            />
            <AnomalyCard 
              metric="DSO" 
              current="45 days" 
              expected="30-35 days" 
              deviation="+33%" 
              severity="danger"
            />
            <AnomalyCard 
              metric="Gross Margin" 
              current="68%" 
              expected="62-65%" 
              deviation="+5%" 
              severity="positive"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Helper Components
const LiquidityItem = ({ label, value, trend, warning, good }) => (
  <div className="text-center">
    <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
    <p className={`text-lg font-bold ${
      warning ? 'text-yellow-400' : good ? 'text-green-400' : 'text-white'
    }`}>
      {value}
      {trend !== undefined && (
        <span className={`text-xs ml-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {trend >= 0 ? '↑' : '↓'}{Math.abs(trend)}%
        </span>
      )}
    </p>
  </div>
);

const MetricBox = ({ label, value, trend, warning, good }) => (
  <div className="bg-navy-900 rounded-lg p-3">
    <p className="text-xs text-gray-500 mb-1">{label}</p>
    <p className={`text-lg font-bold ${
      warning ? 'text-yellow-400' : good ? 'text-green-400' : 'text-white'
    }`}>
      {value}
    </p>
    {trend !== undefined && (
      <div className={`flex items-center text-xs mt-1 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
        <span>{Math.abs(trend)}%</span>
      </div>
    )}
  </div>
);

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
  return (
    <div className={`rounded-lg p-4 border ${severityStyles[severity]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium">{metric}</span>
        <span className={`text-sm font-bold ${deviationColor[severity]}`}>{deviation}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">Current: <span className="text-white">{current}</span></span>
      </div>
      <div className="text-xs text-gray-500 mt-1">Expected: {expected}</div>
    </div>
  );
};

export default CFOCommandCenter;
