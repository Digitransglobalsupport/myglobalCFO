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
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

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


  // Export Functions
  const exportToCSV = () => {
    if (!historicalData || !historicalData.data_points) {
      alert('No data available to export');
      return;
    }
    
    try {
      const headers = ['Date', 'Revenue', 'Expenses', 'EBITDA', 'Cash Balance', 'Profit Margin (%)'];
      const rows = historicalData.data_points.map(point => [
        point.date,
        point.revenue.toFixed(2),
        point.expenses.toFixed(2),
        point.ebitda.toFixed(2),
        point.cash_balance.toFixed(2),
        point.profit_margin.toFixed(2)
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const fileName = `${entity.entity_name.replace(/\s+/g, '_')}_${timePeriod}_financial_data.csv`;
      saveAs(blob, fileName);
      
      alert(`✅ CSV exported successfully: ${fileName}`);
    } catch (error) {
      console.error('CSV Export Error:', error);
      alert('Failed to export CSV. Please try again.');
    }
  };

  const exportToExcel = () => {
    if (!historicalData || !historicalData.data_points) {
      alert('No data available to export');
      return;
    }
    
    try {
      // Create worksheet data
      const wsData = [
        // Header row
        ['Date', 'Revenue', 'Expenses', 'EBITDA', 'Cash Balance', 'Profit Margin (%)'],
        // Data rows
        ...historicalData.data_points.map(point => [
          point.date,
          point.revenue,
          point.expenses,
          point.ebitda,
          point.cash_balance,
          point.profit_margin
        ])
      ];
      
      // Create workbook
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      
      // Set column widths
      ws['!cols'] = [
        { wch: 15 }, // Date
        { wch: 15 }, // Revenue
        { wch: 15 }, // Expenses
        { wch: 15 }, // EBITDA
        { wch: 15 }, // Cash
        { wch: 15 }  // Margin
      ];
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, 'Financial Data');
      
      // Generate file
      const fileName = `${entity.entity_name.replace(/\s+/g, '_')}_${timePeriod}_financial_data.xlsx`;
      XLSX.writeFile(wb, fileName);
      
      alert(`✅ Excel file exported successfully: ${fileName}`);
    } catch (error) {
      console.error('Excel Export Error:', error);
      alert('Failed to export Excel file. Please try again.');
    }
  };

  const exportToPDF = async () => {
    if (!historicalData) {
      alert('No data available to export');
      return;
    }
    
    try {
      alert('Generating PDF... Please wait.');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Title
      doc.setFontSize(20);
      doc.setTextColor(30, 58, 95); // Navy color
      doc.text(`${entity.entity_name} - Financial Report`, pageWidth / 2, 20, { align: 'center' });
      
      // Period
      doc.setFontSize(12);
      doc.setTextColor(100, 100, 100);
      const periodLabel = timePeriods.find(p => p.value === timePeriod)?.label || timePeriod;
      doc.text(`Period: ${periodLabel}`, pageWidth / 2, 28, { align: 'center' });
      
      // Summary Section
      doc.setFontSize(14);
      doc.setTextColor(212, 175, 55); // Gold accent
      doc.text('Summary Metrics', 14, 40);
      
      autoTable(doc, {
        startY: 45,
        head: [['Metric', 'Value']],
        body: [
          ['Total Revenue', formatCurrency(historicalData.summary.revenue, entity.currency)],
          ['Total Expenses', formatCurrency(historicalData.summary.expenses, entity.currency)],
          ['EBITDA', formatCurrency(historicalData.summary.ebitda, entity.currency)],
          ['EBITDA Margin', `${historicalData.summary.ebitda_margin.toFixed(2)}%`],
          ['Cash Balance', formatCurrency(historicalData.summary.cash_balance, entity.currency)],
          ['Runway', `${historicalData.summary.runway_days} days`],
          ['Monthly Burn Rate', formatCurrency(historicalData.summary.burn_rate, entity.currency)],
          ['Revenue Growth', `${historicalData.summary.revenue_growth > 0 ? '+' : ''}${historicalData.summary.revenue_growth.toFixed(2)}%`],
          ['Quick Ratio', `${historicalData.summary.quick_ratio.toFixed(2)}x`]
        ],
        theme: 'grid',
        headStyles: { fillColor: [30, 58, 95], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });
      
      // Time Series Data
      const finalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.setTextColor(212, 175, 55);
      doc.text('Time Series Data', 14, finalY);
      
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Date', 'Revenue', 'Expenses', 'EBITDA', 'Cash', 'Margin %']],
        body: historicalData.data_points.map(point => [
          point.date,
          formatCurrency(point.revenue, entity.currency),
          formatCurrency(point.expenses, entity.currency),
          formatCurrency(point.ebitda, entity.currency),
          formatCurrency(point.cash_balance, entity.currency),
          point.profit_margin.toFixed(2) + '%'
        ]),
        theme: 'striped',
        headStyles: { fillColor: [30, 58, 95], textColor: 255 },
        styles: { fontSize: 8 }
      });
    
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Generated by MyGlobalCFO - Page ${i} of ${pageCount}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: 'center' }
        );
      }
      
      const fileName = `${entity.entity_name.replace(/\s+/g, '_')}_${timePeriod}_report.pdf`;
      doc.save(fileName);
    
      alert(`✅ PDF exported successfully: ${fileName}`);
    } catch (error) {
      console.error('PDF Export Error:', error);
      console.error('Error details:', error.message, error.stack);
      alert(`Failed to export PDF: ${error.message}. Please check the console for details.`);
    }
  };

  const exportChartAsImage = async () => {
    const chartElement = document.querySelector('.tab-content-scroll');
    if (!chartElement) {
      alert('No chart visible to export');
      return;
    }
    
    try {
      alert('Generating chart image... Please wait.');
      
      const canvas = await html2canvas(chartElement, {
        backgroundColor: '#2d4a6f',
        scale: 2,
        logging: false,
        useCORS: true
      });
      
      canvas.toBlob((blob) => {
        if (blob) {
          const fileName = `${entity.entity_name.replace(/\s+/g, '_')}_${timePeriod}_chart.png`;
          saveAs(blob, fileName);
          alert(`✅ Chart image exported successfully: ${fileName}`);
        } else {
          alert('Failed to generate image');
        }
      });
    } catch (error) {
      console.error('Error exporting chart:', error);
      alert('Failed to export chart image. Please try again.');
    }
  };

  const printReport = () => {
    window.print();
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
          <div className="dialog-header-content">
            <div>
              <DialogTitle className="dialog-title-enhanced">
                {entity.entity_name} - Detailed Analysis
              </DialogTitle>
              <DialogDescription>
                Comprehensive financial breakdown and performance metrics
              </DialogDescription>
            </div>
            
            {/* Export Toolbar */}
            <div className="export-toolbar">
              <Button 
                onClick={exportToCSV} 
                variant="outline" 
                size="sm"
                title="Export data to CSV file"
              >
                📊 CSV
              </Button>
              <Button 
                onClick={exportToExcel} 
                variant="outline" 
                size="sm"
                title="Export to Excel spreadsheet"
              >
                📗 Excel
              </Button>
              <Button 
                onClick={exportToPDF} 
                variant="outline" 
                size="sm"
                title="Export report to PDF"
              >
                📄 PDF
              </Button>
              <Button 
                onClick={exportChartAsImage} 
                variant="outline" 
                size="sm"
                title="Export chart as PNG image"
              >
                🖼️ Image
              </Button>
              <Button 
                onClick={printReport} 
                variant="outline" 
                size="sm"
                title="Print report"
              >
                🖨️ Print
              </Button>
            </div>
          </div>
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
