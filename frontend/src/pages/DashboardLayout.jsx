import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import EntityDetailsDialog from '@/components/EntityDetailsDialog';
import OcrUploadDialog from '@/components/OcrUploadDialog';
import { Responsive, WidthProvider } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

// Searchable Dropdown Component for Entity Form
const SearchableDropdown = ({ options, value, onChange, placeholder, displayKey, valueKey, style, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt => {
    const displayValue = displayKey ? opt[displayKey] : opt;
    return displayValue.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const selectedOption = options.find(opt => {
    const optValue = valueKey ? opt[valueKey] : opt;
    return optValue === value;
  });

  const displayValue = selectedOption 
    ? (displayKey ? selectedOption[displayKey] : selectedOption)
    : '';

  return (
    <div ref={dropdownRef} style={{ position: 'relative', ...style }} className={className}>
      <input
        type="text"
        placeholder={placeholder}
        value={isOpen ? searchTerm : displayValue}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => {
          setIsOpen(true);
          setSearchTerm('');
        }}
        style={{ 
          width: '100%',
          padding: '0.5rem', 
          borderRadius: '4px', 
          border: '1px solid var(--gray-600)', 
          backgroundColor: 'var(--navy-secondary)', 
          color: 'white',
          cursor: 'pointer'
        }}
      />
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          maxHeight: '200px',
          overflowY: 'auto',
          backgroundColor: 'var(--navy-primary)',
          border: '1px solid var(--gray-600)',
          borderRadius: '4px',
          zIndex: 1000,
          marginTop: '2px'
        }}>
          {filteredOptions.length > 0 ? (
            filteredOptions.slice(0, 50).map((opt, idx) => {
              const optDisplay = displayKey ? opt[displayKey] : opt;
              const optValue = valueKey ? opt[valueKey] : opt;
              return (
                <div
                  key={idx}
                  onClick={() => {
                    onChange(optValue);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  style={{
                    padding: '0.5rem 0.75rem',
                    cursor: 'pointer',
                    color: 'white',
                    backgroundColor: value === optValue ? 'rgba(212, 175, 55, 0.3)' : 'transparent',
                    borderBottom: '1px solid var(--gray-700)'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = value === optValue ? 'rgba(212, 175, 55, 0.3)' : 'transparent'}
                >
                  {optDisplay}
                </div>
              );
            })
          ) : (
            <div style={{ padding: '0.5rem', color: 'var(--gray-400)', textAlign: 'center' }}>
              No matches found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DashboardLayout = ({ user, onLogout }) => {
  const navigate = useNavigate();
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
    global_region: '',
    company_type: 'standalone',
    parent_company_id: null
  });
  const [entityComparison, setEntityComparison] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [filters, setFilters] = useState({
    date: '',
    description: '',
    type: '',
    category: '',
    source: '',
    status: ''
  });
  const [entityDetailsDialog, setEntityDetailsDialog] = useState(null);
  const [userPreferences, setUserPreferences] = useState(null);
  const [showOcrDialog, setShowOcrDialog] = useState(false);
  const [entityGroups, setEntityGroups] = useState([]);
  const [selectedType, setSelectedType] = useState('entity');
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
  const [useMockedData, setUseMockedData] = useState(() => {
    const saved = localStorage.getItem('useMockedData');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  // Reference data for searchable dropdowns
  const [countriesData, setCountriesData] = useState([]);
  const [currenciesData, setCurrenciesData] = useState([]);
  const [regionsData, setRegionsData] = useState([]);
  const [consolidatedCurrency, setConsolidatedCurrency] = useState('USD');

  useEffect(() => {
    loadCompanies();
    loadUserPreferences();
    loadEntityGroups();
    loadReferenceData();
    loadConsolidatedCurrency();
  }, []);
  
  const loadConsolidatedCurrency = async () => {
    try {
      const response = await axios.get(`${API}/user/consolidated-currency`);
      setConsolidatedCurrency(response.data.consolidated_currency);
    } catch (error) {
      console.error('Error loading consolidated currency:', error);
    }
  };
  
  const loadReferenceData = async () => {
    try {
      const [countriesRes, currenciesRes, regionsRes] = await Promise.all([
        axios.get(`${API}/reference/countries`),
        axios.get(`${API}/reference/currencies`),
        axios.get(`${API}/reference/regions`)
      ]);
      setCountriesData(countriesRes.data);
      setCurrenciesData(currenciesRes.data);
      setRegionsData(regionsRes.data);
    } catch (error) {
      console.error('Error loading reference data:', error);
    }
  };
  
  // Auto-set region when country changes
  const handleCountryChange = (country) => {
    const countryData = countriesData.find(c => c.country === country);
    const region = countryData ? countryData.region : '';
    setNewCompany({
      ...newCompany, 
      country: country,
      global_region: region
    });
  };

  useEffect(() => {
    if (selectedCompany) {
      loadDashboardData();
      loadTransactions();
    }
  }, [selectedCompany, useMockedData]);

  const loadCompanies = async () => {
    try {
      try {
        await axios.post(`${API}/companies/migrate-legacy`);
      } catch (migrationError) {
        console.log('Migration skipped or already done');
      }
      
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
      let endpoint;
      if (selectedType === 'group') {
        endpoint = `${API}/entity-groups/${selectedCompany}/dashboard`;
      } else {
        endpoint = `${API}/dashboard/${selectedCompany}`;
      }
      
      const response = await axios.get(endpoint, {
        params: { use_mocked_data: useMockedData }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    }
  };

  const loadEntityGroups = async () => {
    try {
      const response = await axios.get(`${API}/entity-groups`);
      setEntityGroups(response.data);
    } catch (error) {
      console.error('Error loading entity groups:', error);
    }
  };

  const loadTransactions = async () => {
    try {
      // If mock is off and no company selected, don't load anything
      if (!useMockedData && !selectedCompany) {
        setTransactions([]);
        return;
      }
      
      const response = await axios.get(`${API}/transactions`, {
        params: { 
          company_id: selectedCompany, 
          limit: 50,
          use_mocked_data: useMockedData 
        }
      });
      setTransactions(response.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      setTransactions([]);
    }
  };

  const loadUserPreferences = async () => {
    try {
      const response = await axios.get(`${API}/user/preferences`);
      setUserPreferences(response.data);
      applyCustomColors(response.data);
      
      if (response.data.kpi_config && response.data.kpi_config.length > 0) {
        setKpiConfig(response.data.kpi_config);
      }
      
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
    
    document.body.style.background = `linear-gradient(135deg, ${prefs.background_gradient_start} 0%, ${prefs.secondary_color} 50%, ${prefs.background_gradient_end} 100%)`;
  };

  const handleLayoutChange = async (newLayout) => {
    setKpiLayout(newLayout);
    
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
        global_region: '',
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

    if (filters.date) {
      filtered = filtered.filter(t => {
        const transactionDate = t.date.split('T')[0];
        return transactionDate === filters.date;
      });
    }
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

    filtered.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === 'amount') {
        aVal = parseFloat(aVal);
        bVal = parseFloat(bVal);
      }

      if (sortConfig.key === 'date') {
        aVal = new Date(aVal);
        bVal = new Date(bVal);
      }

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
      date: '',
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
    loadTransactions();
    loadDashboardData();
    alert(`✅ Transaction created successfully!\n\nTransaction ID: ${data.transaction_id}`);
  };

  const toggleMockedData = () => {
    const newValue = !useMockedData;
    setUseMockedData(newValue);
    localStorage.setItem('useMockedData', JSON.stringify(newValue));
  };

  // Get the selected company's currency
  const getSelectedCompanyCurrency = () => {
    if (selectedType === 'group' || selectedCompany === 'consolidated') {
      // For consolidated view, use user's consolidated currency preference
      return consolidatedCurrency || 'USD';
    }
    const company = companies.find(c => c.id === selectedCompany);
    return company?.currency || 'GBP';
  };
  
  const selectedCurrency = getSelectedCompanyCurrency();

  const formatCurrency = (amount, currency = selectedCurrency) => {
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
        
        {/* Navigation Menu - Always visible */}
        <nav className="dashboard-nav" data-testid="dashboard-nav">
          <NavLink to="/dashboard/command-center" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-command-center">
            🎯 Command Centre
          </NavLink>
          <NavLink to="/dashboard/transactions" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-transactions">
            Transactions
          </NavLink>
          <NavLink to="/dashboard/reconciliation" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-reconciliation">
            Reconciliation
          </NavLink>
          <NavLink to="/dashboard/entity-kpis" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-entity-kpis">
            Entity KPIs
          </NavLink>
          <NavLink to="/dashboard/reports" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-reports">
            Reports
          </NavLink>
          <NavLink to="/dashboard/integrations" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-integrations">
            Integrations
          </NavLink>
          <NavLink to="/dashboard/finance-sourcing" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-finance">
            Finance Sourcing
          </NavLink>
          <NavLink to="/dashboard/ai-advisor" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-ai-advisor">
            🤖 AI Advisor
          </NavLink>
          <NavLink to="/dashboard/fpa/overview" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-fpa">
            📊 FP&A
          </NavLink>
          <NavLink to="/dashboard/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-settings">
            ⚙️ Settings
          </NavLink>
        </nav>

        {/* Child Routes */}
        <div className="dashboard-content">
          <Outlet context={{
            user,
            transactions,
            sortConfig,
            filters,
            selectedCompany,
            companies,
            dashboardData,
            financeOptions,
            entityComparison,
            entityGroups,
            userPreferences,
            newCompany,
            showAddCompany,
            handleSort,
            handleFilterChange,
            getFilteredAndSortedTransactions,
            clearFilters,
            handleSeedData,
            handleClearData,
            handleAutoReconcile,
            loadFinanceOptions,
            loadEntityComparison,
            setEntityDetailsDialog,
            handlePreferencesUpdate,
            handleDeleteEntity,
            setShowAddCompany,
            setNewCompany,
            handleAddCompany,
            formatCurrency,
            selectedCurrency,
            getStatusColor
          }} />
        </div>
        
        <div className="empty-state" style={{ marginTop: '2rem' }}>
          <h2>No Companies Yet</h2>
          <p>Create your first company to get started with company-specific features</p>
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
                <SearchableDropdown
                  options={countriesData}
                  value={newCompany.country}
                  onChange={handleCountryChange}
                  placeholder="Search Country..."
                  displayKey="country"
                  valueKey="country"
                  style={{ marginBottom: '0.5rem' }}
                />
                <SearchableDropdown
                  options={regionsData}
                  value={newCompany.global_region || ''}
                  onChange={(val) => setNewCompany({...newCompany, global_region: val})}
                  placeholder="Global Region"
                  style={{ marginBottom: '0.5rem' }}
                />
                <SearchableDropdown
                  options={currenciesData.map(c => ({ display: `${c.code} - ${c.name}`, value: c.code }))}
                  value={newCompany.currency}
                  onChange={(val) => setNewCompany({...newCompany, currency: val})}
                  placeholder="Search Currency..."
                  displayKey="display"
                  valueKey="value"
                  style={{ marginBottom: '0.5rem' }}
                />
                
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
          <h1 className="dashboard-title">Real-Time CFO</h1>
          <p className="dashboard-subtitle">
            {selectedCompany === 'consolidated' 
              ? '🌍 Group Consolidated Dashboard' 
              : selectedType === 'group'
              ? (() => {
                  const group = entityGroups.find(g => g.id === selectedCompany);
                  return group ? `📁 Group: ${group.name} (${group.entity_ids?.length || 0} entities)` : 'Group Dashboard';
                })()
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
          <Button
            onClick={toggleMockedData}
            variant={useMockedData ? "default" : "outline"}
            size="sm"
            className={`mr-3 ${useMockedData ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-600 text-purple-600 hover:bg-purple-50'}`}
            data-testid="mock-data-toggle"
            title={useMockedData ? "Using mocked data (click to use real data)" : "Using real data (click to use mocked data)"}
          >
            {useMockedData ? '🎭 Mock ON' : '📊 Mock OFF'}
          </Button>
          
          <div className="company-selector" data-testid="company-selector">
            <label>Entity:</label>
            <select
              value={selectedCompany}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedCompany(value);
                
                if (value === 'consolidated') {
                  setSelectedType('consolidated');
                } else if (entityGroups.some(g => g.id === value)) {
                  setSelectedType('group');
                } else {
                  setSelectedType('entity');
                }
              }}
              data-testid="company-select"
            >
              {companies.length > 1 && (
                <option value="consolidated" style={{fontWeight: 'bold'}}>
                  🌍 All Entities (Consolidated)
                </option>
              )}
              
              {entityGroups.length > 0 && (
                <>
                  <optgroup label="📁 ENTITY GROUPS">
                    {entityGroups.map(group => (
                      <option key={group.id} value={group.id} style={{fontWeight: 'bold', color: '#2563eb'}}>
                        📁 {group.name} ({group.entity_ids?.length || 0} entities)
                      </option>
                    ))}
                  </optgroup>
                </>
              )}
              
              {companies.filter(c => c.company_type === 'topco').length > 0 && (
                <optgroup label="🏢 HOLDING COMPANIES">
                  {companies.filter(c => c.company_type === 'topco').map(topco => (
                    <option key={topco.id} value={topco.id} style={{fontWeight: 'bold'}}>
                      🏢 {topco.name} (TopCo)
                    </option>
                  ))}
                </optgroup>
              )}
              
              {companies.filter(c => c.company_type === 'subsidiary').length > 0 && (
                <optgroup label="🔗 SUBSIDIARIES">
                  {companies.filter(c => c.company_type === 'subsidiary').map(subsidiary => {
                    const parent = companies.find(p => p.id === subsidiary.parent_company_id);
                    return (
                      <option key={subsidiary.id} value={subsidiary.id}>
                        ↳ {subsidiary.name} {parent ? `(under ${parent.name})` : ''}
                      </option>
                    );
                  })}
                </optgroup>
              )}
              
              {companies.filter(c => !c.company_type || c.company_type === 'standalone').length > 0 && (
                <optgroup label="🏬 INDIVIDUAL ENTITIES">
                  {companies.filter(c => !c.company_type || c.company_type === 'standalone').map(company => (
                    <option key={company.id} value={company.id}>
                      {company.name}
                    </option>
                  ))}
                </optgroup>
              )}
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
          <form onSubmit={handleAddCompany} className="inline-form" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-start' }}>
            <input
              type="text"
              placeholder="Company Name"
              value={newCompany.name}
              onChange={(e) => setNewCompany({...newCompany, name: e.target.value})}
              required
              autoFocus
              style={{ minWidth: '150px', flex: '1' }}
            />
            <SearchableDropdown
              options={countriesData}
              value={newCompany.country}
              onChange={handleCountryChange}
              placeholder="Search Country..."
              displayKey="country"
              valueKey="country"
              style={{ minWidth: '150px', flex: '1' }}
            />
            <SearchableDropdown
              options={regionsData}
              value={newCompany.global_region || ''}
              onChange={(val) => setNewCompany({...newCompany, global_region: val})}
              placeholder="Global Region"
              style={{ minWidth: '120px', flex: '1' }}
            />
            <SearchableDropdown
              options={currenciesData.map(c => ({ display: `${c.code} - ${c.name}`, value: c.code }))}
              value={newCompany.currency}
              onChange={(val) => setNewCompany({...newCompany, currency: val})}
              placeholder="Currency..."
              displayKey="display"
              valueKey="value"
              style={{ minWidth: '150px', flex: '1' }}
            />
            <Button type="submit">Create</Button>
            <Button type="button" variant="ghost" onClick={() => setShowAddCompany(false)}>Cancel</Button>
          </form>
        </Card>
      )}

      {/* Draggable KPI Cards */}
      {dashboardData && (dashboardData.revenue > 0 || useMockedData) ? (
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
      ) : (
        <Card className="empty-state-card" style={{padding: '2rem', textAlign: 'center', marginBottom: '2rem'}}>
          <p style={{color: 'var(--gray-400)', fontSize: '1.1rem'}}>
            📊 No data available. Toggle Mock ON or add some transactions to see your dashboard.
          </p>
        </Card>
      )}

      {/* Navigation Menu */}
      <nav className="dashboard-nav" data-testid="dashboard-nav">
        <NavLink to="/dashboard/command-center" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-command-center">
          🎯 Command Centre
        </NavLink>
        <NavLink to="/dashboard/transactions" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-transactions">
          Transactions
        </NavLink>
        <NavLink to="/dashboard/reconciliation" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-reconciliation">
          Reconciliation
        </NavLink>
        <NavLink to="/dashboard/entity-kpis" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-entity-kpis">
          Entity KPIs
        </NavLink>
        <NavLink to="/dashboard/reports" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-reports">
          Reports
        </NavLink>
        <NavLink to="/dashboard/integrations" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-integrations">
          Integrations
        </NavLink>
        <NavLink to="/dashboard/finance-sourcing" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-finance">
          Finance Sourcing
        </NavLink>
        <NavLink to="/dashboard/ai-advisor" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-ai-advisor">
          🤖 AI Advisor
        </NavLink>
        <NavLink to="/dashboard/fpa/overview" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-fpa">
          📊 FP&A
        </NavLink>
        <NavLink to="/dashboard/settings" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} data-testid="nav-settings">
          ⚙️ Settings
        </NavLink>
      </nav>

      {/* Child Routes */}
      <div className="dashboard-content">
        <Outlet context={{
          user,
          transactions,
          sortConfig,
          filters,
          selectedCompany,
          companies,
          dashboardData,
          financeOptions,
          entityComparison,
          entityGroups,
          userPreferences,
          newCompany,
          showAddCompany,
          useMockedData,
          selectedCurrency,
          handleSort,
          handleFilterChange,
          getFilteredAndSortedTransactions,
          clearFilters,
          handleSeedData,
          handleClearData,
          handleAutoReconcile,
          loadFinanceOptions,
          loadEntityComparison,
          setEntityDetailsDialog,
          handlePreferencesUpdate,
          handleDeleteEntity,
          setShowAddCompany,
          setNewCompany,
          handleAddCompany,
          formatCurrency,
          getStatusColor
        }} />
      </div>

      {/* Enhanced Entity Details Dialog */}
      <EntityDetailsDialog 
        entity={entityDetailsDialog}
        open={!!entityDetailsDialog}
        onClose={() => setEntityDetailsDialog(null)}
      />

      {/* OCR Upload Dialog */}
      <OcrUploadDialog
        open={showOcrDialog}
        onClose={() => setShowOcrDialog(false)}
        onUploadSuccess={handleOcrUploadSuccess}
        companies={companies}
      />
    </div>
  );
};

export default DashboardLayout;
