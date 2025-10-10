import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { API } from '@/App';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';

const EntityDetailsDialog = ({ entity, open, onClose }) => {
  const [timePeriod, setTimePeriod] = useState('30d');
  const [historicalData, setHistoricalData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && entity) {
      loadHistoricalData();
    }
  }, [open, entity, timePeriod]);

  const loadHistoricalData = async () => {
    if (!entity) return;
    
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/entities/${entity.entity_id}/historical?time_period=${timePeriod}`
      );
      setHistoricalData(response.data);
    } catch (error) {
      console.error('Error loading historical data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount, currency = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatShortCurrency = (value) => {
    if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `£${(value / 1000).toFixed(0)}K`;
    return `£${value.toFixed(0)}`;
  };

  const COLORS = {
    revenue: '#10b981',
    expenses: '#ef4444',
    ebitda: '#d4af37',
    cashBalance: '#3b82f6',
    profitMargin: '#8b5cf6'
  };

  const pieData = entity ? [
    { name: 'Profit', value: entity.ebitda_margin, color: COLORS.ebitda },
    { name: 'Expenses', value: entity.expense_ratio, color: COLORS.expenses }
  ] : [];

  const timePeriods = [
    { label: '1 Day', value: '1d' },
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
    { label: '6 Months', value: '6m' },
    { label: 'YTD', value: 'ytd' }
  ];

  if (!entity) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="entity-details-dialog-enhanced">
        <DialogHeader>
          <DialogTitle className="dialog-title-enhanced">
            {entity.entity_name} - Detailed Analysis
          </DialogTitle>
          <DialogDescription>
            Comprehensive financial breakdown and performance metrics
          </DialogDescription>
        </DialogHeader>

        {/* Time Period Selector */}
        <div className="time-period-selector">
          {timePeriods.map(period => (
            <Button
              key={period.value}
              variant={timePeriod === period.value ? "default" : "outline"}
              size="sm"
              onClick={() => setTimePeriod(period.value)}
              className={timePeriod === period.value ? 'active-period' : ''}
            >
              {period.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading data...</p>
          </div>
        ) : historicalData ? (
          <Tabs defaultValue="overview" className="details-tabs">
            <TabsList className="details-tabs-list">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="data">Data Table</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="tab-content-scroll">
              {/* Key Metrics Cards */}
              <div className="metrics-summary-grid">
                <div className="metric-card">
                  <div className="metric-label">Revenue</div>
                  <div className="metric-value">
                    {formatCurrency(historicalData.summary.revenue, entity.currency)}
                  </div>
                  <div className="metric-change positive">
                    +{historicalData.summary.revenue_growth.toFixed(1)}%
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">EBITDA</div>
                  <div className="metric-value">
                    {formatCurrency(historicalData.summary.ebitda, entity.currency)}
                  </div>
                  <div className="metric-change">{historicalData.summary.ebitda_margin.toFixed(1)}% margin</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Cash</div>
                  <div className="metric-value">
                    {formatCurrency(historicalData.summary.cash_balance, entity.currency)}
                  </div>
                  <div className="metric-change">{historicalData.summary.runway_days} days runway</div>
                </div>
              </div>

              {/* Revenue vs Expenses Line Chart */}
              <div className="chart-section">
                <h3>Revenue & Expenses Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalData.data_points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={formatShortCurrency}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#2d4a6f',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => formatCurrency(value, entity.currency)}
                    />
                    <Legend wrapperStyle={{ color: '#fff' }} />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke={COLORS.revenue} 
                      strokeWidth={3}
                      dot={{ fill: COLORS.revenue, r: 4 }}
                      name="Revenue"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="expenses" 
                      stroke={COLORS.expenses} 
                      strokeWidth={3}
                      dot={{ fill: COLORS.expenses, r: 4 }}
                      name="Expenses"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Profit Margin Pie Chart */}
              <div className="chart-section">
                <h3>Profit vs Expense Ratio</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      label={(entry) => `${entry.name}: ${entry.value.toFixed(1)}%`}
                      labelLine={{ stroke: '#9ca3af' }}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#2d4a6f',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => `${value.toFixed(2)}%`}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="tab-content-scroll">
              {/* EBITDA Trend Area Chart */}
              <div className="chart-section">
                <h3>EBITDA Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={historicalData.data_points}>
                    <defs>
                      <linearGradient id="colorEbitda" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.ebitda} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.ebitda} stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={formatShortCurrency}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#2d4a6f',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => formatCurrency(value, entity.currency)}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="ebitda" 
                      stroke={COLORS.ebitda} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorEbitda)"
                      name="EBITDA"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Cash Balance Line Chart */}
              <div className="chart-section">
                <h3>Cash Balance Trend</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={historicalData.data_points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={formatShortCurrency}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#2d4a6f',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => formatCurrency(value, entity.currency)}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="cash_balance" 
                      stroke={COLORS.cashBalance} 
                      strokeWidth={3}
                      dot={{ fill: COLORS.cashBalance, r: 4 }}
                      name="Cash Balance"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Profit Margin Trend */}
              <div className="chart-section">
                <h3>Profit Margin Trend (%)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={historicalData.data_points}>
                    <defs>
                      <linearGradient id="colorMargin" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.profitMargin} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLORS.profitMargin} stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={(value) => `${value.toFixed(0)}%`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#2d4a6f',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value) => `${value.toFixed(2)}%`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="profit_margin" 
                      stroke={COLORS.profitMargin} 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorMargin)"
                      name="Profit Margin"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            {/* Breakdown Tab */}
            <TabsContent value="breakdown" className="tab-content-scroll">
              {/* Composed Chart - All Metrics */}
              <div className="chart-section">
                <h3>Complete Financial Breakdown</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <ComposedChart data={historicalData.data_points}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                    />
                    <YAxis 
                      stroke="#9ca3af"
                      tick={{ fill: '#9ca3af', fontSize: 12 }}
                      tickFormatter={formatShortCurrency}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#2d4a6f',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value, name) => {
                        if (name === 'Profit Margin') return `${value.toFixed(2)}%`;
                        return formatCurrency(value, entity.currency);
                      }}
                    />
                    <Legend wrapperStyle={{ color: '#fff' }} />
                    <Bar dataKey="revenue" fill={COLORS.revenue} name="Revenue" />
                    <Bar dataKey="expenses" fill={COLORS.expenses} name="Expenses" />
                    <Line 
                      type="monotone" 
                      dataKey="ebitda" 
                      stroke={COLORS.ebitda} 
                      strokeWidth={3}
                      name="EBITDA"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Performance Indicators */}
              <div className="performance-grid">
                <div className="performance-card">
                  <div className="perf-icon">📈</div>
                  <div className="perf-label">Revenue Growth</div>
                  <div className={`perf-value ${historicalData.summary.revenue_growth > 0 ? 'positive' : 'negative'}`}>
                    {historicalData.summary.revenue_growth > 0 ? '+' : ''}{historicalData.summary.revenue_growth.toFixed(2)}%
                  </div>
                </div>
                <div className="performance-card">
                  <div className="perf-icon">💰</div>
                  <div className="perf-label">EBITDA Margin</div>
                  <div className={`perf-value ${historicalData.summary.ebitda_margin > 15 ? 'positive' : 'warning'}`}>
                    {historicalData.summary.ebitda_margin.toFixed(2)}%
                  </div>
                </div>
                <div className="performance-card">
                  <div className="perf-icon">🔥</div>
                  <div className="perf-label">Monthly Burn</div>
                  <div className="perf-value">
                    {formatCurrency(historicalData.summary.burn_rate, entity.currency)}
                  </div>
                </div>
                <div className="performance-card">
                  <div className="perf-icon">💧</div>
                  <div className="perf-label">Quick Ratio</div>
                  <div className={`perf-value ${historicalData.summary.quick_ratio > 1 ? 'positive' : 'negative'}`}>
                    {historicalData.summary.quick_ratio.toFixed(2)}x
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Data Table Tab */}
            <TabsContent value="data" className="tab-content-scroll">
              <div className="data-table-section">
                <h3>Time Series Data</h3>
                <div className="table-wrapper">
                  <table className="details-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Revenue</th>
                        <th>Expenses</th>
                        <th>EBITDA</th>
                        <th>Cash</th>
                        <th>Margin %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historicalData.data_points.map((point, index) => (
                        <tr key={index}>
                          <td>{point.date}</td>
                          <td>{formatCurrency(point.revenue, entity.currency)}</td>
                          <td>{formatCurrency(point.expenses, entity.currency)}</td>
                          <td>{formatCurrency(point.ebitda, entity.currency)}</td>
                          <td>{formatCurrency(point.cash_balance, entity.currency)}</td>
                          <td>{point.profit_margin.toFixed(2)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Table */}
              <div className="data-table-section" style={{ marginTop: '2rem' }}>
                <h3>Summary Metrics</h3>
                <table className="details-table">
                  <tbody>
                    <tr>
                      <td>Entity Name</td>
                      <td><strong>{historicalData.summary.entity_name}</strong></td>
                    </tr>
                    <tr>
                      <td>Time Period</td>
                      <td><strong>{timePeriods.find(p => p.value === timePeriod)?.label}</strong></td>
                    </tr>
                    <tr>
                      <td>Currency</td>
                      <td><strong>{historicalData.summary.currency}</strong></td>
                    </tr>
                    <tr>
                      <td>Total Revenue</td>
                      <td><strong>{formatCurrency(historicalData.summary.revenue, entity.currency)}</strong></td>
                    </tr>
                    <tr>
                      <td>Total Expenses</td>
                      <td><strong>{formatCurrency(historicalData.summary.expenses, entity.currency)}</strong></td>
                    </tr>
                    <tr>
                      <td>EBITDA</td>
                      <td><strong>{formatCurrency(historicalData.summary.ebitda, entity.currency)}</strong></td>
                    </tr>
                    <tr>
                      <td>EBITDA Margin</td>
                      <td><strong>{historicalData.summary.ebitda_margin.toFixed(2)}%</strong></td>
                    </tr>
                    <tr>
                      <td>Cash Balance</td>
                      <td><strong>{formatCurrency(historicalData.summary.cash_balance, entity.currency)}</strong></td>
                    </tr>
                    <tr>
                      <td>Runway</td>
                      <td><strong>{historicalData.summary.runway_days} days</strong></td>
                    </tr>
                    <tr>
                      <td>Revenue Growth</td>
                      <td>
                        <strong className={historicalData.summary.revenue_growth > 0 ? 'positive' : 'negative'}>
                          {historicalData.summary.revenue_growth > 0 ? '+' : ''}{historicalData.summary.revenue_growth.toFixed(2)}%
                        </strong>
                      </td>
                    </tr>
                    <tr>
                      <td>Health Status</td>
                      <td>
                        <Badge className={`status-badge ${historicalData.summary.status}`}>
                          {historicalData.summary.status === 'healthy' ? '✅ Healthy' : 
                           historicalData.summary.status === 'warning' ? '⚠️ Warning' : 
                           '🔴 Critical'}
                        </Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="empty-message">
            <p>No historical data available</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default EntityDetailsDialog;
