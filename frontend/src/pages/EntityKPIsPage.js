import React, { useState, useEffect } from 'react';
import { useAuth, useApp } from '../App';
import { BarChart3, TrendingUp, Wallet, Clock, Activity, RefreshCcw, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const EntityKPIsPage = () => {
  const { authAxios } = useAuth();
  const { companies, mockDataEnabled } = useApp();
  const [groupSummary, setGroupSummary] = useState(null);
  const [entityMetrics, setEntityMetrics] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllMetrics();
  }, [companies]);

  const fetchAllMetrics = async () => {
    try {
      setLoading(true);
      
      // Fetch group summary
      const groupRes = await authAxios.get('/dashboard/group/summary');
      setGroupSummary(groupRes.data);

      // Fetch individual entity metrics
      const metricsMap = {};
      for (const company of companies) {
        try {
          const res = await authAxios.get(`/dashboard/${company.id}`);
          metricsMap[company.id] = res.data;
        } catch (e) {
          console.error(`Error fetching metrics for ${company.name}:`, e);
        }
      }
      setEntityMetrics(metricsMap);
    } catch (e) {
      console.error('Error fetching metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'GBP') => {
    const symbol = { GBP: '£', USD: '$', EUR: '€' }[currency] || '£';
    return `${symbol}${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getStatusBadge = (metrics) => {
    if (!metrics) return <Badge className="bg-gray-500/20 text-gray-400">No Data</Badge>;
    if (metrics.runway_days < 60) return <Badge className="bg-red-500/20 text-red-400">Critical</Badge>;
    if (metrics.runway_days < 120) return <Badge className="bg-yellow-500/20 text-yellow-400">Warning</Badge>;
    return <Badge className="bg-green-500/20 text-green-400">Healthy</Badge>;
  };

  const displaySummary = mockDataEnabled && (!groupSummary || groupSummary.total_revenue === 0)
    ? { total_revenue: 3750000, total_ebitda: 937500, group_margin: 25, total_cash: 1455000, entity_count: 3 }
    : groupSummary;

  const getMockMetricsForEntity = (index) => ({
    revenue: 1250000 + index * 250000,
    ebitda: 312500 + index * 62500,
    ebitda_margin: 22 + index * 3,
    cash_balance: 485000 + index * 100000,
    runway_days: 145 + index * 30,
    burn_rate: 95000 + index * 10000,
    quick_ratio: 1.8 + index * 0.2,
    revenue_growth: 15 + index * 5
  });

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Building2 className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">No Entities Found</h2>
        <p className="text-gray-400">Create your first company to see KPIs</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Entity KPIs</h1>
          <p className="text-gray-400 mt-1">Performance metrics across all entities</p>
        </div>
        <Button variant="outline" className="border-navy-600 text-white" onClick={fetchAllMetrics}>
          <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Group Summary */}
      <Card className="bg-gradient-to-r from-gold-500/20 to-gold-600/10 border-gold-500/30">
        <CardHeader>
          <CardTitle className="text-gold-400 flex items-center">
            <BarChart3 className="w-5 h-5 mr-2" /> Group Performance Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <p className="text-sm text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(displaySummary?.total_revenue || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Total EBITDA</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(displaySummary?.total_ebitda || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Group Margin</p>
              <p className="text-2xl font-bold text-white">{displaySummary?.group_margin || 0}%</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Total Cash</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(displaySummary?.total_cash || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Entities</p>
              <p className="text-2xl font-bold text-white">{displaySummary?.entity_count || companies.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entity Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {companies.map((company, index) => {
          const metrics = mockDataEnabled && (!entityMetrics[company.id] || entityMetrics[company.id]?.transaction_count === 0)
            ? getMockMetricsForEntity(index)
            : entityMetrics[company.id];

          return (
            <Card key={company.id} className="bg-navy-800 border-navy-700 hover:border-gold-500/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">{company.name}</CardTitle>
                  {getStatusBadge(metrics)}
                </div>
                <p className="text-sm text-gray-400">{company.country} • {company.currency}</p>
              </CardHeader>
              <CardContent>
                {metrics ? (
                  <div className="grid grid-cols-2 gap-4">
                    <MetricItem label="Revenue" value={formatCurrency(metrics.revenue, company.currency)} />
                    <MetricItem label="EBITDA" value={formatCurrency(metrics.ebitda, company.currency)} />
                    <MetricItem label="Margin" value={`${metrics.ebitda_margin}%`} />
                    <MetricItem label="Growth" value={`${metrics.revenue_growth > 0 ? '+' : ''}${metrics.revenue_growth}%`} positive={metrics.revenue_growth > 0} />
                    <MetricItem label="Cash" value={formatCurrency(metrics.cash_balance, company.currency)} />
                    <MetricItem label="Runway" value={`${metrics.runway_days} days`} warning={metrics.runway_days < 120} />
                    <MetricItem label="Burn Rate" value={`${formatCurrency(metrics.burn_rate, company.currency)}/mo`} />
                    <MetricItem label="Quick Ratio" value={metrics.quick_ratio?.toFixed(2)} />
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

const MetricItem = ({ label, value, positive, warning }) => (
  <div>
    <p className="text-xs text-gray-500">{label}</p>
    <p className={`text-sm font-semibold ${
      warning ? 'text-yellow-400' : positive !== undefined ? (positive ? 'text-green-400' : 'text-red-400') : 'text-white'
    }`}>
      {value}
    </p>
  </div>
);

export default EntityKPIsPage;
