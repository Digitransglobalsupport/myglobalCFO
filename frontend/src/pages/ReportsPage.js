import React, { useState, useEffect } from 'react';
import { useAuth, useApp } from '../App';
import { Target, TrendingUp, PieChart, BarChart3, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';

const ReportsPage = () => {
  const { authAxios } = useAuth();
  const { selectedCompany, mockDataEnabled } = useApp();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany) {
      fetchMetrics();
    }
  }, [selectedCompany]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const res = await authAxios.get(`/dashboard/${selectedCompany.id}`);
      setMetrics(res.data);
    } catch (e) {
      console.error('Error fetching metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    const symbol = { GBP: '£', USD: '$', EUR: '€' }[selectedCompany?.currency] || '£';
    return `${symbol}${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;
  };

  const mockMetrics = {
    ar_current: 125000,
    ar_30_days: 85000,
    ar_60_days: 42000,
    ar_90_plus_days: 28000,
    cost_centers: [
      { name: 'Operations', amount: 180000 },
      { name: 'Marketing', amount: 125000 },
      { name: 'Technology', amount: 98000 },
      { name: 'Administration', amount: 67000 },
      { name: 'Sales', amount: 54000 }
    ]
  };

  const displayMetrics = mockDataEnabled && (!metrics || metrics.transaction_count === 0)
    ? mockMetrics
    : metrics;

  const totalAR = (displayMetrics?.ar_current || 0) + 
                  (displayMetrics?.ar_30_days || 0) + 
                  (displayMetrics?.ar_60_days || 0) + 
                  (displayMetrics?.ar_90_plus_days || 0);

  const totalCosts = displayMetrics?.cost_centers?.reduce((sum, cc) => sum + cc.amount, 0) || 0;

  if (!selectedCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <FileText className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">No Entity Selected</h2>
        <p className="text-gray-400">Please select an entity to view reports</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Reports</h1>
        <p className="text-gray-400 mt-1">Financial analysis for {selectedCompany.name}</p>
      </div>

      <Tabs defaultValue="ar-aging" className="space-y-6">
        <TabsList className="bg-navy-800 border-navy-700">
          <TabsTrigger value="ar-aging" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            AR Aging
          </TabsTrigger>
          <TabsTrigger value="cost-centers" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            Cost Centers
          </TabsTrigger>
        </TabsList>

        {/* AR Aging Tab */}
        <TabsContent value="ar-aging">
          <div className="grid gap-6">
            <Card className="bg-navy-800 border-navy-700">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <TrendingUp className="w-5 h-5 mr-2 text-gold-400" /> Accounts Receivable Aging Analysis
                </CardTitle>
                <CardDescription className="text-gray-400">
                  Total Outstanding: {formatCurrency(totalAR)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <ARAgingBar
                  label="Current (0-30 days)"
                  amount={displayMetrics?.ar_current || 0}
                  total={totalAR}
                  currency={selectedCompany.currency}
                  color="green"
                />
                <ARAgingBar
                  label="30 Days (30-60)"
                  amount={displayMetrics?.ar_30_days || 0}
                  total={totalAR}
                  currency={selectedCompany.currency}
                  color="yellow"
                />
                <ARAgingBar
                  label="60 Days (60-90)"
                  amount={displayMetrics?.ar_60_days || 0}
                  total={totalAR}
                  currency={selectedCompany.currency}
                  color="orange"
                />
                <ARAgingBar
                  label="90+ Days (Overdue)"
                  amount={displayMetrics?.ar_90_plus_days || 0}
                  total={totalAR}
                  currency={selectedCompany.currency}
                  color="red"
                />
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryCard
                label="Current"
                value={formatCurrency(displayMetrics?.ar_current || 0)}
                percentage={totalAR > 0 ? ((displayMetrics?.ar_current || 0) / totalAR * 100).toFixed(1) : 0}
                color="green"
              />
              <SummaryCard
                label="30 Days"
                value={formatCurrency(displayMetrics?.ar_30_days || 0)}
                percentage={totalAR > 0 ? ((displayMetrics?.ar_30_days || 0) / totalAR * 100).toFixed(1) : 0}
                color="yellow"
              />
              <SummaryCard
                label="60 Days"
                value={formatCurrency(displayMetrics?.ar_60_days || 0)}
                percentage={totalAR > 0 ? ((displayMetrics?.ar_60_days || 0) / totalAR * 100).toFixed(1) : 0}
                color="orange"
              />
              <SummaryCard
                label="90+ Days"
                value={formatCurrency(displayMetrics?.ar_90_plus_days || 0)}
                percentage={totalAR > 0 ? ((displayMetrics?.ar_90_plus_days || 0) / totalAR * 100).toFixed(1) : 0}
                color="red"
              />
            </div>
          </div>
        </TabsContent>

        {/* Cost Centers Tab */}
        <TabsContent value="cost-centers">
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <PieChart className="w-5 h-5 mr-2 text-gold-400" /> Cost Center Breakdown
              </CardTitle>
              <CardDescription className="text-gray-400">
                Total Costs: {formatCurrency(totalCosts)}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {displayMetrics?.cost_centers?.length > 0 ? (
                displayMetrics.cost_centers.map((cc, index) => (
                  <CostCenterBar
                    key={index}
                    name={cc.name}
                    amount={cc.amount}
                    total={totalCosts}
                    currency={selectedCompany.currency}
                    index={index}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No cost center data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const ARAgingBar = ({ label, amount, total, currency, color }) => {
  const percentage = total > 0 ? (amount / total) * 100 : 0;
  const symbol = { GBP: '£', USD: '$', EUR: '€' }[currency] || '£';
  
  const colors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500'
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-gray-300">{label}</span>
        <span className="text-white font-semibold">
          {symbol}{amount.toLocaleString('en-GB')} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-3 bg-navy-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[color]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const CostCenterBar = ({ name, amount, total, currency, index }) => {
  const percentage = total > 0 ? (amount / total) * 100 : 0;
  const symbol = { GBP: '£', USD: '$', EUR: '€' }[currency] || '£';
  
  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-emerald-500',
    'bg-orange-500',
    'bg-pink-500'
  ];

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-gray-300">{name}</span>
        <span className="text-white font-semibold">
          {symbol}{amount.toLocaleString('en-GB')} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-3 bg-navy-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${colors[index % colors.length]} rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const SummaryCard = ({ label, value, percentage, color }) => {
  const colors = {
    green: 'border-green-500/30 bg-green-500/10',
    yellow: 'border-yellow-500/30 bg-yellow-500/10',
    orange: 'border-orange-500/30 bg-orange-500/10',
    red: 'border-red-500/30 bg-red-500/10'
  };

  return (
    <Card className={`border ${colors[color]} bg-navy-800`}>
      <CardContent className="pt-4">
        <p className="text-sm text-gray-400">{label}</p>
        <p className="text-xl font-bold text-white mt-1">{value}</p>
        <p className="text-sm text-gray-500">{percentage}% of total</p>
      </CardContent>
    </Card>
  );
};

export default ReportsPage;
