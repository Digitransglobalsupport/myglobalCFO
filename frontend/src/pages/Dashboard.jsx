import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';
import { API } from '@/App';
import Integrations from './Integrations';
import EntityDetailsDialog from '@/components/EntityDetailsDialog';
import Settings from './Settings';
import OcrUploadDialog from '@/components/OcrUploadDialog';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const Dashboard = ({ user, onLogout }) => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [financeOptions, setFinanceOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ 
    name: '', 
    country: '', 
    currency: 'GBP',
    company_type: 'standalone',
    parent_company_id: null
  });
  const [entityComparison, setEntityComparison] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [filters, setFilters] = useState({
    description: '',
    type: '',
    category: '',
    source: '',
    status: ''
  });
  const [entityDetailsDialog, setEntityDetailsDialog] = useState(null);
  const [userPreferences, setUserPreferences] = useState(null);
  const [showOcrDialog, setShowOcrDialog] = useState(false);
  const [kpiConfig, setKpiConfig] = useState([
    { id: 'revenue', label: 'Total Group Revenue', enabled: true, order: 0 },
    { id: 'ebitda', label: 'Group EBITDA', enabled: true, order: 1 },
    { id: 'cash', label: 'Total Group Cash', enabled: true, order: 2 },
    { id: 'runway', label: 'Group Runway', enabled: true, order: 3 }
  ]);
  const [kpiLayout, setKpiLayout] = useState([
    { i: 'revenue', x: 0, y: 0, w: 3, h: 1 },
    { i: 'ebitda', x: 3, y: 0, w: 3, h: 1 },
    { i: 'cash', x: 6, y: 0, w: 3, h: 1 },
    { i: 'runway', x: 9, y: 0, w: 3, h: 1 }
  ]);

  useEffect(() => {
    loadCompanies();
    loadUserPreferences();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      loadDashboardData();
      loadTransactions();
    }
  }, [selectedCompany]);

  const loadCompanies = async () => {
    try {
      // First, migrate any legacy companies
      try {
        await axios.post(`${API}/companies/migrate-legacy`);
      } catch (migrationError) {
        console.log('Migration skipped or already done');
      }
      
      // Then load all companies
      const response = await axios.get(`${API}/companies`);
      console.log('Loaded companies:', response.data);
      setCompanies(response.data);
      if (response.data.length > 0) {
        setSelectedCompany(response.data[0].id);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading companies:', error);
      setLoading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      const response = await axios.get(`${API}/dashboard/${selectedCompany}`);
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`, {
        params: { company_id: selectedCompany, limit: 50 }
      });
      setTransactions(response.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    }
  };


  const loadUserPreferences = async () => {
    try {
      const response = await axios.get(`${API}/user/preferences`);
      setUserPreferences(response.data);
      
      // Apply colors
      applyCustomColors(response.data);
      
      // Apply saved KPI config if exists
      if (response.data.kpi_config && response.data.kpi_config.length > 0) {
        setKpiConfig(response.data.kpi_config);
      }
      
      // Apply saved layout if exists
      if (response.data.kpi_layout && response.data.kpi_layout.length > 0) {
        setKpiLayout(response.data.kpi_layout);
      }
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const applyCustomColors = (prefs) => {
    if (!prefs) return;
    
    const root = document.documentElement;
    root.style.setProperty('--navy-primary', prefs.primary_color);
    root.style.setProperty('--navy-secondary', prefs.secondary_color);
    root.style.setProperty('--gold-accent', prefs.accent_color);
    
    // Update body background gradient
    document.body.style.background = `linear-gradient(135deg, ${prefs.background_gradient_start} 0%, ${prefs.secondary_color} 50%, ${prefs.background_gradient_end} 100%)`;
  };

  const handleLayoutChange = async (newLayout) => {
    setKpiLayout(newLayout);
    
    // Save layout to backend
    try {
      await axios.put(`${API}/user/preferences`, {
        kpi_layout: newLayout
      });
    } catch (error) {
      console.error('Error saving layout:', error);
    }
  };

  const handlePreferencesUpdate = (newPrefs) => {
    setUserPreferences(newPrefs);
    applyCustomColors(newPrefs);
  };


  const loadFinanceOptions = async () => {
    try {
      const response = await axios.get(`${API}/finance-sourcing`);
      setFinanceOptions(response.data);
    } catch (error) {
      console.error('Error loading finance options:', error);
    }
  };

  const loadEntityComparison = async () => {
    try {
      const response = await axios.get(`${API}/entities/comparison`);
      setEntityComparison(response.data);
    } catch (error) {
      console.error('Error loading entity comparison:', error);
    }
  };

  const handleAddCompany = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/companies`, newCompany);
      setShowAddCompany(false);
      setNewCompany({ 
        name: '', 
        country: '', 
        currency: 'GBP',
        company_type: 'standalone',
        parent_company_id: null
      });
      loadCompanies();
    } catch (error) {
      console.error('Error adding company:', error);
    }
  };

  const handleSeedData = async () => {
    try {
      await axios.post(`${API}/seed-demo-data?company_id=${selectedCompany}`);
      loadDashboardData();
      loadTransactions();
    } catch (error) {
      console.error('Error seeding data:', error);
    }
  };

  const handleDeleteEntity = async (companyId, companyName) => {
    if (!window.confirm(`Are you sure you want to delete "${companyName}"? This will permanently remove all transactions and data for this entity.`)) {
      return;
    }
    
    try {
      await axios.delete(`${API}/companies/${companyId}`);
      
      // Reload companies
      await loadCompanies();
      
      alert(`Entity "${companyName}" has been successfully deleted.`);
    } catch (error) {
      console.error('Error deleting entity:', error);
      alert('Failed to delete entity. Please try again.');
    }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
  };

  const getFilteredAndSortedTransactions = () => {
    let filtered = [...transactions];

    // Apply filters
    if (filters.description) {
      filtered = filtered.filter(t => 
        t.description.toLowerCase().includes(filters.description.toLowerCase())
      );
    }
    if (filters.type) {
      filtered = filtered.filter(t => t.type === filters.type);
    }
    if (filters.category) {
      filtered = filtered.filter(t => t.category === filters.category);
    }
    if (filters.source) {
      filtered = filtered.filter(t => t.source === filters.source);
    }
    if (filters.status) {
      filtered = filtered.filter(t => t.reconciliation_status === filters.status);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // Handle amount sorting
      if (sortConfig.key === 'amount') {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }

      // Handle date sorting
      if (sortConfig.key === 'date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

      // Handle string sorting
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aVal > bVal) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return filtered;
  };

  const clearFilters = () => {
    setFilters({
      description: '',
      type: '',
      category: '',
      source: '',
      status: ''
    });
  };

  const handleClearData = async () => {
    const company = companies.find(c => c.id === selectedCompany);
    
    if (!company) {
      alert('Please select a company first');
      return;
    }

    const confirmed = window.confirm(
      `⚠️ WARNING: This will permanently delete ALL data for "${company.name}":\n\n` +
      `- All transactions\n` +
      `- All emails\n` +
      `- All financial data\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Type the company name to confirm deletion.`
    );

    if (!confirmed) return;

    const nameConfirm = window.prompt(
      `Type the exact company name "${company.name}" to confirm deletion:`
    );

    if (nameConfirm !== company.name) {
      alert('Company name did not match. Data deletion cancelled.');
      return;
    }

    try {
      const response = await axios.delete(`${API}/companies/${selectedCompany}/clear-data`);
      alert(`✅ Success!\n\nDeleted:\n- ${response.data.deleted.transactions} transactions\n- ${response.data.deleted.emails} emails\n\nAll data cleared for ${company.name}`);
      
      // Reload data
      loadDashboardData();
      loadTransactions();
    } catch (error) {
      console.error('Error clearing data:', error);
      alert('Failed to clear data: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleAutoReconcile = async () => {
    try {
      await axios.post(`${API}/reconciliation/auto-match?company_id=${selectedCompany}`);
      loadTransactions();
      alert('Auto-reconciliation completed!');
    } catch (error) {
      console.error('Error reconciling:', error);
    }
  };

  const handleOcrUploadSuccess = (data) => {
    // Reload transactions to show the new transaction
    loadTransactions();
    loadDashboardData();
    alert(`✅ Transaction created successfully!\n\nTransaction ID: ${data.transaction_id}`);
  };

  const formatCurrency = (amount, currency = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const getStatusColor = (status) => {
    const colors = {
      matched: 'bg-green-500/20 text-green-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      unmatched: 'bg-red-500/20 text-red-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  if (loading) {
    return <div className="dashboard-loading">Loading dashboard...</div>;
  }

  if (companies.length === 0) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>Welcome, {user.name}</h1>
          <Button onClick={onLogout} variant="outline">Logout</Button>
        </div>
        
        <div className="empty-state">
          <h2>No Companies Yet</h2>
          <p>Create your first company to get started</p>
          <Button onClick={() => setShowAddCompany(true)}>Add Company</Button>
          
          {showAddCompany && (
            <Card className="add-company-card">
              <h3 style={{marginBottom: '1rem', color: 'var(--gold-accent)'}}>Add New Entity</h3>
              <form onSubmit={handleAddCompany}>
                <input
                  type="text"
                  placeholder="Company Name"
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
                  required
                  autoFocus
                  data-testid="company-name-input"
                />
                <input
                  type="text"
                  placeholder="Country"
                  value={newCompany.country}
                  onChange={(e) => setNewCompany({...newCompany, country: e.target.value})}
                  required
                  data-testid="company-country-input"
                />
                <select
                  value={newCompany.currency}
                  onChange={(e) => setNewCompany({...newCompany, currency: e.target.value})}
                  data-testid="company-currency-select"
                >
                  <option value="GBP">GBP</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                </select>
                
                <div style={{marginTop: '1rem'}}>
                  <label style={{color: 'var(--gray-300)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem'}}>
                    Entity Type:
                  </label>
                  <select
                    value={newCompany.company_type}
                    onChange={(e) => setNewCompany({...newCompany, company_type: e.target.value, parent_company_id: null})}
                    data-testid="company-type-select"
                  >
                    <option value="standalone">Standalone Company</option>
                    <option value="topco">TopCo (Holding Company)</option>
                    <option value="subsidiary">Subsidiary</option>
                  </select>
                </div>
                
                {newCompany.company_type === 'subsidiary' && (
                  <div style={{marginTop: '1rem'}}>
                    <label style={{color: 'var(--gray-300)', fontSize: '0.9rem', display: 'block', marginBottom: '0.5rem'}}>
                      Parent Company (TopCo):
                    </label>
                    <select
                      value={newCompany.parent_company_id || ''}
                      onChange={(e) => setNewCompany({...newCompany, parent_company_id: e.target.value})}
                      required
                      data-testid="parent-company-select"
                    >
                      <option value="">Select TopCo...</option>
                      {companies.filter(c => c.company_type === 'topco').map(topco => (
                        <option key={topco.id} value={topco.id}>{topco.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                <Button type="submit" data-testid="submit-company-button" style={{marginTop: '1rem'}}>
                  Create Entity
                </Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-left">
          <h1 className="dashboard-title">MyGlobalCFO</h1>
          <p className="dashboard-subtitle">
            {selectedCompany === 'consolidated' 
              ? '🌍 Group Consolidated Dashboard' 
              : (() => {
                  const company = companies.find(c => c.id === selectedCompany);
                  if (company?.company_type === 'topco') {
                    return '🏢 TopCo Consolidated View (All Subsidiaries)';
                  } else if (company?.company_type === 'subsidiary') {
                    const parent = companies.find(p => p.id === company.parent_company_id);
                    return `📊 Subsidiary Dashboard${parent ? ` (under ${parent.name})` : ''}`;
                  }
                  return 'Executive Financial Dashboard';
                })()}
          </p>
        </div>
        
        <div className="header-right">
          <div className="company-selector" data-testid="company-selector">
            <label>Entity:</label>
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              data-testid="company-select"
            >
              {companies.length > 1 && (
                <option value="consolidated" style={{fontWeight: 'bold'}}>
                  🌍 All Entities (Consolidated)
                </option>
              )}
              {/* TopCo entities */}
              {companies.filter(c => c.company_type === 'topco').map(topco => (
                <option key={topco.id} value={topco.id} style={{fontWeight: 'bold'}}>
                  🏢 {topco.name} (TopCo)
                </option>
              ))}
              
              {/* Subsidiary entities */}
              {companies.filter(c => c.company_type === 'subsidiary').map(subsidiary => {
                const parent = companies.find(p => p.id === subsidiary.parent_company_id);
                return (
                  <option key={subsidiary.id} value={subsidiary.id} style={{paddingLeft: '20px'}}>
                    &nbsp;&nbsp;↳ {subsidiary.name} {parent ? `(under ${parent.name})` : ''}
                  </option>
                );
              })}
              
              {/* Standalone and legacy entities (without company_type) */}
              {companies.filter(c => !c.company_type || c.company_type === 'standalone').map(company => (
                <option key={company.id} value={company.id}>
                  {company.name}
                </option>
              ))}
            </select>
          </div>
          
          <Button onClick={() => setShowAddCompany(!showAddCompany)} variant="outline" data-testid="add-company-btn">
            + Add Entity
          </Button>

          <Button 
            onClick={() => setShowOcrDialog(true)} 
            variant="default" 
            className="bg-blue-600 hover:bg-blue-700"
            data-testid="import-receipt-btn"
          >
            📄 Import Receipt
          </Button>
          
          <div className="user-menu">
            <span>{user.name}</span>
            <Button onClick={onLogout} variant="ghost" size="sm" data-testid="logout-btn">Logout</Button>
          </div>
        </div>
      </div>

      {showAddCompany && (
        <Card className="add-company-inline">
          <form onSubmit={handleAddCompany} className="inline-form">
            <input
              type="text"
              placeholder="Company Name"
              value={newCompany.name}
              onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
              required
              autoFocus
            />
            <input
              type="text"
              placeholder="Country"
              value={newCompany.country}
              onChange={(e) => setNewCompany({...newCompany, country: e.target.value})}
              required
            />
            <select
              value={newCompany.currency}
              onChange={(e) => setNewCompany({...newCompany, currency: e.target.value})}
            >
              <option value="GBP">GBP</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
            <Button type="submit">Create</Button>
            <Button type="button" variant="ghost" onClick={() => setShowAddCompany(false)}>Cancel</Button>
          </form>
        </Card>
      )}

      {/* Draggable KPI Cards - Horizontal Row */}
      {dashboardData && (
        <ResponsiveGridLayout
          className="kpi-grid-layout"
          layouts={{ 
            lg: kpiConfig.filter(kpi => kpi.enabled).map((kpi, index) => ({
              i: kpi.id,
              x: index * 3,
              y: 0,
              w: 3,
              h: 1
            }))
          }}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={140}
          onLayoutChange={handleLayoutChange}
          isDraggable={true}
          isResizable={false}
          compactType="horizontal"
          preventCollision={false}
          data-testid="kpi-dashboard"
        >
          {kpiConfig
            .filter(kpi => kpi.enabled)
            .map(kpi => {
              const kpiData = {
                revenue: { icon: '📈', value: formatCurrency(dashboardData.revenue), trend: selectedCompany === 'consolidated' ? 'Across all entities' : '+12.5% vs last month', testId: 'revenue-value', class: 'revenue-card' },
                ebitda: { icon: '💰', value: formatCurrency(dashboardData.ebitda), trend: selectedCompany === 'consolidated' ? 'Consolidated profit' : '+8.3% vs last month', testId: 'ebitda-value', class: 'ebitda-card' },
                cash: { icon: '🏦', value: formatCurrency(dashboardData.cash_balance), trend: selectedCompany === 'consolidated' ? 'All bank accounts' : 'Updated 2 hours ago', testId: 'cash-value', class: 'cash-card' },
                runway: { icon: '⏱️', value: `${dashboardData.runway_days} days`, trend: selectedCompany === 'consolidated' ? 'Based on group burn' : 'Based on current burn', testId: 'runway-value', class: 'runway-card' }
              }[kpi.id];

              if (!kpiData) return null;

              return (
                <div key={kpi.id}>
                  <Card className={`kpi-card ${kpiData.class} draggable-kpi-card`}>
                    <div className="drag-handle-kpi">⋮⋮</div>
                    <div className="kpi-icon">{kpiData.icon}</div>
                    <div className="kpi-content">
                      <span className="kpi-label">{kpi.label}</span>
                      <span className="kpi-value" data-testid={kpiData.testId}>{kpiData.value}</span>
                      <span className="kpi-trend">{kpiData.trend}</span>
                    </div>
                  </Card>
                </div>
              );
            })}
        </ResponsiveGridLayout>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="transactions" className="dashboard-tabs">
        <TabsList data-testid="dashboard-tabs">
          <TabsTrigger value="transactions" data-testid="transactions-tab">Transactions</TabsTrigger>
          <TabsTrigger value="reconciliation" data-testid="reconciliation-tab">Reconciliation</TabsTrigger>
          <TabsTrigger value="entity-kpis" data-testid="entity-kpis-tab">Entity KPIs</TabsTrigger>
          <TabsTrigger value="reports" data-testid="reports-tab">Reports</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="integrations-tab">Integrations</TabsTrigger>
          <TabsTrigger value="finance" data-testid="finance-tab">Finance Sourcing</TabsTrigger>
          <TabsTrigger value="settings" data-testid="settings-tab">⚙️ Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" data-testid="transactions-content">
          <Card className="content-card">
            <div className="card-header">
              <h2>Recent Transactions</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button onClick={clearFilters} variant="outline" size="sm" data-testid="clear-filters-btn">
                  🔄 Clear Filters
                </Button>
                <Button onClick={handleSeedData} variant="outline" size="sm" data-testid="seed-data-btn">
                  Generate Demo Data
                </Button>
                <Button onClick={handleClearData} variant="destructive" size="sm" data-testid="clear-data-btn">
                  🗑️ Clear All Data
                </Button>
              </div>
            </div>
            
            <div className="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th className="sortable-header" onClick={() => handleSort('date')}>
                      Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th className="sortable-header" onClick={() => handleSort('amount')}>
                      Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th>Source</th>
                    <th>Status</th>
                  </tr>
                  <tr className="filter-row">
                    <td></td>
                    <td>
                      <input
                        type="text"
                        placeholder="Filter..."
                        value={filters.description}
                        onChange={(e) => handleFilterChange('description', e.target.value)}
                        className="filter-input"
                        data-testid="filter-description"
                      />
                    </td>
                    <td>
                      <select
                        value={filters.type}
                        onChange={(e) => handleFilterChange('type', e.target.value)}
                        className="filter-select"
                        data-testid="filter-type"
                      >
                        <option value="">All</option>
                        <option value="invoice">Invoice</option>
                        <option value="bill">Bill</option>
                        <option value="bank_transaction">Bank Transaction</option>
                        <option value="journal_entry">Journal Entry</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={filters.category}
                        onChange={(e) => handleFilterChange('category', e.target.value)}
                        className="filter-select"
                        data-testid="filter-category"
                      >
                        <option value="">All</option>
                        <option value="Sales">Sales</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Operations">Operations</option>
                        <option value="Technology">Technology</option>
                        <option value="Administration">Administration</option>
                      </select>
                    </td>
                    <td></td>
                    <td>
                      <select
                        value={filters.source}
                        onChange={(e) => handleFilterChange('source', e.target.value)}
                        className="filter-select"
                        data-testid="filter-source"
                      >
                        <option value="">All</option>
                        <option value="email">Email</option>
                        <option value="xero">Xero</option>
                        <option value="truelayer">TrueLayer</option>
                        <option value="manual">Manual</option>
                      </select>
                    </td>
                    <td>
                      <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="filter-select"
                        data-testid="filter-status"
                      >
                        <option value="">All</option>
                        <option value="matched">Matched</option>
                        <option value="pending">Pending</option>
                        <option value="unmatched">Unmatched</option>
                      </select>
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredAndSortedTransactions().map(trans => (
                    <tr key={trans.id} data-testid="transaction-row">
                      <td>{trans.date}</td>
                      <td>{trans.description}</td>
                      <td><Badge variant="outline">{trans.type}</Badge></td>
                      <td>{trans.category}</td>
                      <td className="amount">{formatCurrency(trans.amount, trans.currency)}</td>
                      <td><Badge variant="secondary">{trans.source}</Badge></td>
                      <td>
                        <Badge className={getStatusColor(trans.reconciliation_status)}>
                          {trans.reconciliation_status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {getFilteredAndSortedTransactions().length === 0 && transactions.length > 0 && (
                <div className="empty-table">
                  <p>No transactions match your filters. Try adjusting the filters or click "Clear Filters".</p>
                </div>
              )}
              
              {transactions.length === 0 && (
                <div className="empty-table">
                  <p>No transactions yet. Click "Generate Demo Data" to populate.</p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliation" data-testid="reconciliation-content">
          <Card className="content-card">
            <div className="card-header">
              <h2>Bank Reconciliation</h2>
              <Button onClick={handleAutoReconcile} data-testid="auto-reconcile-btn">
                🔄 Auto-Reconcile
              </Button>
            </div>
            
            <div className="reconciliation-status">
              <div className="status-card matched">
                <h3>Matched</h3>
                <p className="status-count">{transactions.filter(t => t.reconciliation_status === 'matched').length}</p>
              </div>
              <div className="status-card pending">
                <h3>Pending</h3>
                <p className="status-count">{transactions.filter(t => t.reconciliation_status === 'pending').length}</p>
              </div>
              <div className="status-card unmatched">
                <h3>Unmatched</h3>
                <p className="status-count">{transactions.filter(t => t.reconciliation_status === 'unmatched').length}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="entity-kpis" data-testid="entity-kpis-content">
          <Card className="content-card">
            <div className="card-header">
              <h2>Real-Time Entity Performance KPIs</h2>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <Button onClick={loadEntityComparison} variant="outline" size="sm" data-testid="refresh-kpis-btn">
                  🔄 Refresh KPIs
                </Button>
              </div>
            </div>
            
            {/* Manage Entities Section */}
            <div className="manage-entities-section">
              <h3>Manage Entities</h3>
              <div className="entities-management-grid">
                {companies.map(company => (
                  <div key={company.id} className="entity-management-card">
                    <div className="entity-info">
                      <span className="entity-name-text">{company.name}</span>
                      <span className="entity-details">{company.country} • {company.currency}</span>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteEntity(company.id, company.name)}
                      data-testid={`delete-entity-${company.id}`}
                    >
                      🗑️ Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            
            {entityComparison && (
              <div className="entity-kpis-section">
                {/* Group Totals Summary */}
                {entityComparison.group_totals && companies.length > 1 && (
                  <div className="group-summary">
                    <h3>Group Performance Summary</h3>
                    <div className="group-metrics">
                      <div className="metric-box">
                        <span className="metric-label">Total Revenue</span>
                        <span className="metric-value">{formatCurrency(entityComparison.group_totals.revenue)}</span>
                      </div>
                      <div className="metric-box">
                        <span className="metric-label">Total EBITDA</span>
                        <span className="metric-value">{formatCurrency(entityComparison.group_totals.ebitda)}</span>
                      </div>
                      <div className="metric-box">
                        <span className="metric-label">Group Margin</span>
                        <span className="metric-value">{entityComparison.group_totals.ebitda_margin}%</span>
                      </div>
                      <div className="metric-box">
                        <span className="metric-label">Total Cash</span>
                        <span className="metric-value">{formatCurrency(entityComparison.group_totals.cash)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Individual Entity KPIs */}
                <div className="entities-kpi-grid">
                  {entityComparison.entities.map(entity => (
                    <div key={entity.entity_id} className={`entity-kpi-card status-${entity.status}`} data-testid="entity-kpi-card">
                      <div className="entity-kpi-header">
                        <h3>{entity.entity_name}</h3>
                        <Badge className={`status-badge ${entity.status}`}>
                          {entity.status === 'healthy' ? '✅ Healthy' : 
                           entity.status === 'warning' ? '⚠️ Warning' : 
                           '🔴 Critical'}
                        </Badge>
                      </div>
                      
                      <div className="entity-kpi-metrics">
                        <div className="kpi-row">
                          <span className="kpi-metric-label">Revenue</span>
                          <span className="kpi-metric-value">{formatCurrency(entity.revenue, entity.currency)}</span>
                        </div>
                        
                        <div className="kpi-row">
                          <span className="kpi-metric-label">EBITDA</span>
                          <span className="kpi-metric-value">{formatCurrency(entity.ebitda, entity.currency)}</span>
                        </div>
                        
                        <div className="kpi-row">
                          <span className="kpi-metric-label">EBITDA Margin</span>
                          <span className={`kpi-metric-value ${entity.ebitda_margin > 20 ? 'positive' : entity.ebitda_margin > 10 ? 'warning' : 'negative'}`}>
                            {entity.ebitda_margin}%
                          </span>
                        </div>
                        
                        <div className="kpi-row">
                          <span className="kpi-metric-label">Revenue Growth</span>
                          <span className={`kpi-metric-value ${entity.revenue_growth > 0 ? 'positive' : 'negative'}`}>
                            {entity.revenue_growth > 0 ? '+' : ''}{entity.revenue_growth}%
                          </span>
                        </div>
                        
                        <div className="kpi-row">
                          <span className="kpi-metric-label">Cash Balance</span>
                          <span className="kpi-metric-value">{formatCurrency(entity.cash_balance, entity.currency)}</span>
                        </div>
                        
                        <div className="kpi-row">
                          <span className="kpi-metric-label">Runway</span>
                          <span className={`kpi-metric-value ${entity.runway_days > 180 ? 'positive' : entity.runway_days > 90 ? 'warning' : 'negative'}`}>
                            {entity.runway_days} days
                          </span>
                        </div>
                        
                        <div className="kpi-row">
                          <span className="kpi-metric-label">Monthly Burn Rate</span>
                          <span className="kpi-metric-value">{formatCurrency(entity.burn_rate, entity.currency)}</span>
                        </div>
                        
                        <div className="kpi-row">
                          <span className="kpi-metric-label">Quick Ratio</span>
                          <span className={`kpi-metric-value ${entity.quick_ratio > 2 ? 'positive' : entity.quick_ratio > 1 ? 'warning' : 'negative'}`}>
                            {entity.quick_ratio.toFixed(2)}x
                          </span>
                        </div>
                      </div>
                      
                      <div className="entity-kpi-actions">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setEntityDetailsDialog(entity)}
                          data-testid="view-entity-details"
                        >
                          📊 View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {!entityComparison && (
              <div className="empty-message">
                <p>Click "Refresh KPIs" to load real-time entity performance metrics</p>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="reports" data-testid="reports-content">
          <Card className="content-card">
            <h2>Financial Reports</h2>
            
            {dashboardData && (
              <div className="reports-grid">
                <div className="report-section">
                  <h3>AR Aging Analysis</h3>
                  <div className="aging-breakdown">
                    <div className="aging-item">
                      <span>Current:</span>
                      <strong>{formatCurrency(dashboardData.ar_aging.current)}</strong>
                    </div>
                    <div className="aging-item">
                      <span>30 Days:</span>
                      <strong>{formatCurrency(dashboardData.ar_aging['30_days'])}</strong>
                    </div>
                    <div className="aging-item">
                      <span>60 Days:</span>
                      <strong>{formatCurrency(dashboardData.ar_aging['60_days'])}</strong>
                    </div>
                    <div className="aging-item">
                      <span>90+ Days:</span>
                      <strong>{formatCurrency(dashboardData.ar_aging['90_plus'])}</strong>
                    </div>
                  </div>
                </div>

                <div className="report-section">
                  <h3>Cost Center Breakdown</h3>
                  <div className="cost-center-list">
                    {dashboardData.top_cost_centers.map((cc, idx) => (
                      <div key={idx} className="cost-center-item">
                        <span>{cc.name}</span>
                        <strong>{formatCurrency(cc.amount)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="integrations" data-testid="integrations-content">
          <Integrations companies={companies} selectedCompany={selectedCompany} />
        </TabsContent>

        <TabsContent value="finance" data-testid="finance-content">
          <Card className="content-card">
            <div className="card-header">
              <h2>Finance Sourcing Recommendations</h2>
              <Button onClick={loadFinanceOptions} variant="outline" size="sm" data-testid="load-finance-btn">
                🔍 Search Options
              </Button>
            </div>
            
            <div className="finance-options">
              {financeOptions.map(option => (
                <div key={option.id} className="finance-option-card" data-testid="finance-option">
                  <div className="option-header">
                    <Badge>{option.type}</Badge>
                    <h3>{option.provider}</h3>
                  </div>
                  <div className="option-details">
                    {option.interest_rate && (
                      <div className="detail-item">
                        <span>Interest Rate:</span>
                        <strong>{option.interest_rate}%</strong>
                      </div>
                    )}
                    <div className="detail-item">
                      <span>Amount Range:</span>
                      <strong>{option.amount_range}</strong>
                    </div>
                    <div className="detail-item">
                      <span>Eligibility:</span>
                      <strong>{option.eligibility}</strong>
                    </div>
                  </div>
                  <a href={option.source_url} target="_blank" rel="noopener noreferrer" className="option-link">
                    View Details →
                  </a>
                </div>
              ))}
              
              {financeOptions.length === 0 && (
                <p className="empty-message">Click "Search Options" to find finance opportunities</p>
              )}
            </div>
          </Card>
        </TabsContent>


        <TabsContent value="settings" data-testid="settings-content">
          <Settings onPreferencesUpdate={handlePreferencesUpdate} />
        </TabsContent>

      </Tabs>

      {/* Enhanced Entity Details Dialog with Charts */}
      <EntityDetailsDialog 
        entity={entityDetailsDialog}
        open={!!entityDetailsDialog}
        onClose={() => setEntityDetailsDialog(null)}
      />
    </div>
  );
};

export default Dashboard;
