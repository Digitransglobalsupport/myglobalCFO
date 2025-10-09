import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';
import { API } from '@/App';

const Dashboard = ({ user, onLogout }) => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [financeOptions, setFinanceOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: '', country: '', currency: 'GBP' });
  const [entityComparison, setEntityComparison] = useState(null);

  useEffect(() => {
    loadCompanies();
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      loadDashboardData();
      loadTransactions();
    }
  }, [selectedCompany]);

  const loadCompanies = async () => {
    try {
      const response = await axios.get(`${API}/companies`);
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
      setNewCompany({ name: '', country: '', currency: 'GBP' });
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

  const handleAutoReconcile = async () => {
    try {
      await axios.post(`${API}/reconciliation/auto-match?company_id=${selectedCompany}`);
      loadTransactions();
      alert('Auto-reconciliation completed!');
    } catch (error) {
      console.error('Error reconciling:', error);
    }
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
                <Button type="submit" data-testid="submit-company-button">Create Company</Button>
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
              : 'Executive Financial Dashboard'}
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
              {companies.map(company => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          
          <Button onClick={() => setShowAddCompany(!showAddCompany)} variant="outline" data-testid="add-company-btn">
            + Add Entity
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

      {/* KPI Cards */}
      {dashboardData && (
        <div className="kpi-grid" data-testid="kpi-dashboard">
          <Card className="kpi-card revenue-card">
            <div className="kpi-icon">📈</div>
            <div className="kpi-content">
              <span className="kpi-label">
                {selectedCompany === 'consolidated' ? 'Total Group Revenue' : 'Revenue'}
              </span>
              <span className="kpi-value" data-testid="revenue-value">{formatCurrency(dashboardData.revenue)}</span>
              <span className="kpi-trend positive">
                {selectedCompany === 'consolidated' ? 'Across all entities' : '+12.5% vs last month'}
              </span>
            </div>
          </Card>

          <Card className="kpi-card ebitda-card">
            <div className="kpi-icon">💰</div>
            <div className="kpi-content">
              <span className="kpi-label">
                {selectedCompany === 'consolidated' ? 'Group EBITDA' : 'EBITDA'}
              </span>
              <span className="kpi-value" data-testid="ebitda-value">{formatCurrency(dashboardData.ebitda)}</span>
              <span className="kpi-trend positive">
                {selectedCompany === 'consolidated' ? 'Consolidated profit' : '+8.3% vs last month'}
              </span>
            </div>
          </Card>

          <Card className="kpi-card cash-card">
            <div className="kpi-icon">🏦</div>
            <div className="kpi-content">
              <span className="kpi-label">
                {selectedCompany === 'consolidated' ? 'Total Group Cash' : 'Cash Balance'}
              </span>
              <span className="kpi-value" data-testid="cash-value">{formatCurrency(dashboardData.cash_balance)}</span>
              <span className="kpi-trend neutral">
                {selectedCompany === 'consolidated' ? 'All bank accounts' : 'Updated 2 hours ago'}
              </span>
            </div>
          </Card>

          <Card className="kpi-card runway-card">
            <div className="kpi-icon">⏱️</div>
            <div className="kpi-content">
              <span className="kpi-label">
                {selectedCompany === 'consolidated' ? 'Group Runway' : 'Runway'}
              </span>
              <span className="kpi-value" data-testid="runway-value">{dashboardData.runway_days} days</span>
              <span className="kpi-trend neutral">
                {selectedCompany === 'consolidated' ? 'Based on group burn' : 'Based on current burn'}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="transactions" className="dashboard-tabs">
        <TabsList data-testid="dashboard-tabs">
          <TabsTrigger value="transactions" data-testid="transactions-tab">Transactions</TabsTrigger>
          <TabsTrigger value="reconciliation" data-testid="reconciliation-tab">Reconciliation</TabsTrigger>
          <TabsTrigger value="entity-kpis" data-testid="entity-kpis-tab">Entity KPIs</TabsTrigger>
          <TabsTrigger value="reports" data-testid="reports-tab">Reports</TabsTrigger>
          <TabsTrigger value="finance" data-testid="finance-tab">Finance Sourcing</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" data-testid="transactions-content">
          <Card className="content-card">
            <div className="card-header">
              <h2>Recent Transactions</h2>
              <Button onClick={handleSeedData} variant="outline" size="sm" data-testid="seed-data-btn">
                Generate Demo Data
              </Button>
            </div>
            
            <div className="transactions-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Category</th>
                    <th>Amount</th>
                    <th>Source</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map(trans => (
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
      </Tabs>
    </div>
  );
};

export default Dashboard;
