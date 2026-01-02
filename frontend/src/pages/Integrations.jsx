import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/sonner';
import { Trash2 } from 'lucide-react';
import axios from 'axios';
import { API } from '@/App';
import ERPIntegrations from './ERPIntegrations';

const Integrations = ({ companies, selectedCompany }) => {
  const [availableIntegrations, setAvailableIntegrations] = useState([]);
  const [connectedIntegrations, setConnectedIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [setupInstructions, setSetupInstructions] = useState(null);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [selectedIntegration, setSelectedIntegration] = useState(null);
  const [credentials, setCredentials] = useState({
    client_id: '',
    client_secret: '',
    tenant_id: ''
  });
  const [testingConnection, setTestingConnection] = useState(null);
  const [testResults, setTestResults] = useState(null);
  const [configDialog, setConfigDialog] = useState(null);
  const [configSettings, setConfigSettings] = useState({});
  const [bankingWidget, setBankingWidget] = useState(null);
  const [widgetData, setWidgetData] = useState({ accounts: [], transactions: [] });
  const [loadingWidget, setLoadingWidget] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(null);

  useEffect(() => {
    loadAvailableIntegrations();
    if (selectedCompany) {
      loadConnectedIntegrations();
    }
  }, [selectedCompany]);

  const loadAvailableIntegrations = async () => {
    try {
      const response = await axios.get(`${API}/integrations/available`);
      // Filter out Xero, QuickBooks, and Sage as they're now in ERP tab
      const filteredIntegrations = response.data.integrations.filter(
        integration => !['xero', 'quickbooks', 'sage'].includes(integration.type)
      );
      setAvailableIntegrations(filteredIntegrations);
      setLoading(false);
    } catch (error) {
      console.error('Error loading integrations:', error);
      setLoading(false);
    }
  };

  const loadConnectedIntegrations = async () => {
    if (!selectedCompany) return;
    
    try {
      const response = await axios.get(`${API}/integrations/${selectedCompany}/list`);
      setConnectedIntegrations(response.data.integrations);
    } catch (error) {
      console.error('Error loading connected integrations:', error);
    }
  };

  const handleConnect = async (integrationType) => {
    try {
      const response = await axios.post(`${API}/integrations/${integrationType}/connect`, null, {
        params: { company_id: selectedCompany }
      });
      
      setSetupInstructions(response.data);
      setSelectedIntegration(integrationType);
      setShowSetupDialog(true);
    } catch (error) {
      console.error('Error initiating connection:', error);
      alert('Failed to initiate connection. Please try again.');
    }
  };

  const handleSaveCredentials = async () => {
    if (!credentials.client_id || !credentials.client_secret) {
      alert('Please enter both Client ID and Client Secret');
      return;
    }

    if (selectedIntegration === 'outlook' && !credentials.tenant_id) {
      alert('Please enter Tenant ID for Outlook integration');
      return;
    }
    
    if (selectedIntegration === 'gmail') {
      // Gmail doesn't need tenant_id, it uses project_id from Google Cloud
      // For simplicity, we'll use the same credential structure
    }

    try {
      const response = await axios.post(
        `${API}/integrations/${setupInstructions.connection_id}/save-credentials`,
        credentials
      );

      if (response.data.authorization_url) {
        // Open OAuth URL in new window
        const authWindow = window.open(
          response.data.authorization_url,
          'OAuth Authorization',
          'width=600,height=700'
        );

        // Poll for window close
        const checkWindow = setInterval(() => {
          if (authWindow.closed) {
            clearInterval(checkWindow);
            // Reload integrations to see if connected
            loadConnectedIntegrations();
            setShowSetupDialog(false);
            alert('Please check if the integration was connected successfully');
          }
        }, 1000);
      } else {
        alert(response.data.message || 'Credentials saved. Manual OAuth flow required.');
        setShowSetupDialog(false);
      }

      // Reset credentials
      setCredentials({ client_id: '', client_secret: '', tenant_id: '' });
    } catch (error) {
      console.error('Error saving credentials:', error);
      alert('Failed to save credentials: ' + (error.response?.data?.detail || error.message));
    }
  };

  const handleTestConnection = async (connectionId, integrationType) => {
    setTestingConnection(connectionId);
    
    try {
      const response = await axios.post(`${API}/integrations/${connectionId}/test`);
      
      // Show test results in a dialog
      setTestResults({
        integrationType,
        success: response.data.success,
        message: response.data.message,
        details: response.data.details
      });
      
      // Also show a quick toast notification
      if (response.data.success) {
        toast.success(`${integrationType.toUpperCase()} connection test passed!`, {
          description: 'Your integration is working correctly.'
        });
      } else {
        toast.warning(`${integrationType.toUpperCase()} connection test failed`, {
          description: response.data.details?.next_step || 'Please check configuration'
        });
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      toast.error('Failed to test connection', {
        description: error.response?.data?.detail || error.message
      });
      
      // Show error in results dialog
      setTestResults({
        integrationType,
        success: false,
        message: 'Connection test failed',
        details: {
          error: error.response?.data?.detail || error.message,
          connection_status: 'error'
        }
      });
    } finally {
      setTestingConnection(null);
    }
  };

  const handleConfigure = async (connectionId, integrationType) => {
    try {
      const response = await axios.get(`${API}/integrations/${connectionId}/config`);
      setConfigDialog({
        connectionId,
        integrationType,
        availableSettings: response.data.available_settings[integrationType] || {},
        currentSettings: response.data.settings || {}
      });
      setConfigSettings(response.data.settings || {});
      
      toast.info(`Opening ${integrationType.toUpperCase()} configuration`, {
        description: 'Adjust settings for your integration'
      });
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast.error('Failed to load configuration', {
        description: error.response?.data?.detail || error.message
      });
    }
  };

  const handleSaveConfig = async () => {
    if (!configDialog) return;

    try {
      await axios.put(`${API}/integrations/${configDialog.connectionId}/config`, configSettings);
      
      toast.success('Configuration saved successfully!', {
        description: `${configDialog.integrationType.toUpperCase()} settings have been updated`
      });
      
      setConfigDialog(null);
      loadConnectedIntegrations();
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration', {
        description: error.response?.data?.detail || error.message
      });
    }
  };

  const handleDisconnect = async (connectionId) => {
    try {
      await axios.delete(`${API}/integrations/${connectionId}`);
      loadConnectedIntegrations();
      setDeleteDialog(null);
      
      toast.success('Integration disconnected', {
        description: 'The integration has been removed from your account'
      });
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      toast.error('Failed to disconnect integration', {
        description: error.response?.data?.detail || error.message
      });
    }
  };

  const getIntegrationIcon = (type) => {
    const icons = {
      gmail: '📬',
      outlook: '📧',
      xero: '📈',
      sage: '📊',
      quickbooks: '💼',
      truelayer: '🏦',
      plaid: '🔐'
    };
    return icons[type] || '🔌';
  };

  const loadBankingWidget = async (connectionId, integrationType) => {
    setLoadingWidget(true);
    setBankingWidget({ connectionId, integrationType });
    
    try {
      // Load accounts
      const accountsResponse = await axios.get(
        `${API}/integrations/${integrationType}/${connectionId}/accounts`
      );
      
      let accounts = [];
      let transactions = [];
      
      if (integrationType === 'truelayer') {
        accounts = accountsResponse.data.accounts || [];
        
        // Load transactions for first account if available
        if (accounts.length > 0) {
          const txnResponse = await axios.get(
            `${API}/integrations/truelayer/${connectionId}/transactions`,
            { params: { account_id: accounts[0].account_id } }
          );
          transactions = txnResponse.data.results || [];
        }
      } else if (integrationType === 'plaid') {
        accounts = accountsResponse.data.accounts || [];
        
        // Load transactions
        const txnResponse = await axios.post(
          `${API}/integrations/plaid/${connectionId}/sync-transactions`
        );
        transactions = txnResponse.data.added || [];
      }
      
      setWidgetData({ accounts, transactions });
    } catch (error) {
      console.error('Error loading banking widget:', error);
      alert('Failed to load banking data: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoadingWidget(false);
    }
  };

  const isConnected = (integrationType) => {
    return connectedIntegrations.some(conn => conn.integration_type === integrationType);
  };

  const isUsedByFPA = (integrationType) => {
    // Check if this integration is used by FP&A module
    const fpaServices = ['xero', 'quickbooks', 'sage', 'hubspot', 'salesforce'];
    return fpaServices.includes(integrationType);
  };

  if (loading) {
    return <div className="integrations-loading">Loading integrations...</div>;
  }

  return (
    <div className="integrations-container">
      <div className="integrations-header">
        <div>
          <h1 className="page-title">Integrations</h1>
          <p className="page-subtitle">Connect external services to automate your financial operations</p>
        </div>
      </div>

      <Tabs defaultValue="erp" className="integrations-tabs">
        <TabsList>
          <TabsTrigger value="erp">ERP & Accounting</TabsTrigger>
          <TabsTrigger value="available">Other Integrations</TabsTrigger>
          <TabsTrigger value="connected">Connected ({connectedIntegrations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="erp">
          <ERPIntegrations />
        </TabsContent>

        <TabsContent value="available">
          <div className="integrations-grid">
            {availableIntegrations.map(integration => (
              <Card key={integration.type} className="integration-card">
                <div className="integration-card-header">
                  <div className="integration-icon-large">
                    {getIntegrationIcon(integration.type)}
                  </div>
                  <h3>{integration.name}</h3>
                  <div className="flex gap-2 flex-wrap">
                    {isConnected(integration.type) && (
                      <Badge className="connected-badge">Connected</Badge>
                    )}
                    {isUsedByFPA(integration.type) && (
                      <Badge variant="outline" className="text-xs border-purple-300 text-purple-700 bg-purple-50">
                        FP&A
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="integration-description">{integration.description}</p>

                <div className="integration-features">
                  <h4>Features:</h4>
                  <ul>
                    {integration.features.map((feature, idx) => (
                      <li key={idx}>✓ {feature}</li>
                    ))}
                  </ul>
                </div>

                <div className="integration-actions">
                  {isConnected(integration.type) ? (
                    <Button variant="outline" disabled>
                      Already Connected
                    </Button>
                  ) : (
                    <Button onClick={() => handleConnect(integration.type)}>
                      Connect {integration.name}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="connected">
          {connectedIntegrations.length === 0 ? (
            <Card className="empty-state-card">
              <div className="empty-state">
                <h3>No Integrations Connected</h3>
                <p>Connect your first integration to start automating your financial workflows</p>
                <Button onClick={() => document.querySelector('[value="available"]').click()}>
                  Browse Available Integrations
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Sync Status & Data Integrity Section */}
              <Card className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">☁️</span>
                  Sync Status & Data Integrity
                </h2>
                
                {/* Data Freshness & Connection Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <p className="text-xs text-slate-600 mb-1">Data Freshness</p>
                    <p className="text-2xl font-bold text-green-600">Real-time</p>
                    <p className="text-xs text-slate-600 mt-1">All systems synced</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <p className="text-xs text-slate-600 mb-1">Active Connections</p>
                    <p className="text-2xl font-bold text-slate-900">
                      {connectedIntegrations.filter(c => c.status === 'active' || c.status === 'connected').length}/{connectedIntegrations.length}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">Integrations</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-blue-200">
                    <p className="text-xs text-slate-600 mb-1">System Health</p>
                    <p className={`text-2xl font-bold ${
                      connectedIntegrations.filter(c => c.status === 'active' || c.status === 'connected').length === connectedIntegrations.length 
                        ? 'text-green-600' 
                        : 'text-yellow-600'
                    }`}>
                      {connectedIntegrations.filter(c => c.status === 'active' || c.status === 'connected').length === connectedIntegrations.length 
                        ? 'Healthy' 
                        : 'Partial'}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {connectedIntegrations.filter(c => c.status === 'active' || c.status === 'connected').length === connectedIntegrations.length 
                        ? 'All operational' 
                        : 'Some connections need attention'}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Connected Integrations Grid */}
              <div className="connected-integrations-list">
                {connectedIntegrations.map(connection => (
                  <Card key={connection.id} className="connected-integration-card">
                    <div className="connected-integration-header">
                      <div className="integration-info">
                        <span className="integration-icon">
                          {getIntegrationIcon(connection.integration_type)}
                        </span>
                        <div>
                          <h3>{connection.integration_type.charAt(0).toUpperCase() + connection.integration_type.slice(1)}</h3>
                          <p className="connection-date">
                            Connected on {new Date(connection.created_at).toLocaleDateString()}
                          </p>
                          {connection.updated_at && (
                            <p className="text-xs text-slate-500 mt-1">
                              Last sync: {new Date(connection.updated_at).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge className={`status-badge ${connection.status}`}>
                        {connection.status}
                      </Badge>
                    </div>

                    <div className="connected-integration-actions">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleConfigure(connection.id, connection.integration_type)}
                      >
                        ⚙️ Configure
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleTestConnection(connection.id, connection.integration_type)}
                        disabled={testingConnection === connection.id}
                      >
                        {testingConnection === connection.id ? '🔄 Testing...' : '🔌 Test Connection'}
                      </Button>
                      {(connection.integration_type === 'truelayer' || connection.integration_type === 'plaid') && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => loadBankingWidget(connection.id, connection.integration_type)}
                        >
                          📊 View Data
                        </Button>
                      )}
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => setDeleteDialog({
                          connectionId: connection.id,
                          integrationType: connection.integration_type
                        })}
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Configuration Dialog */}
      <Dialog open={!!configDialog} onOpenChange={() => setConfigDialog(null)}>
        <DialogContent className="setup-dialog">
          <DialogHeader>
            <DialogTitle>
              Configure {configDialog?.integrationType?.toUpperCase()}
            </DialogTitle>
            <DialogDescription>
              Adjust settings for your {configDialog?.integrationType} integration
            </DialogDescription>
          </DialogHeader>

          {configDialog && (
            <div className="config-content">
              <div className="config-form">
                {Object.entries(configDialog.availableSettings).map(([key, setting]) => (
                  <div key={key} className="config-field">
                    <label>{setting.description || key}</label>
                    
                    {setting.type === 'boolean' && (
                      <div className="checkbox-field">
                        <input
                          type="checkbox"
                          checked={configSettings[key] ?? setting.default}
                          onChange={(e) => setConfigSettings({
                            ...configSettings,
                            [key]: e.target.checked
                          })}
                        />
                        <span>{configSettings[key] ?? setting.default ? 'Enabled' : 'Disabled'}</span>
                      </div>
                    )}
                    
                    {setting.type === 'text' && (
                      <Input
                        type="text"
                        value={configSettings[key] || setting.default || ''}
                        onChange={(e) => setConfigSettings({
                          ...configSettings,
                          [key]: e.target.value
                        })}
                        placeholder={setting.default}
                      />
                    )}
                    
                    {setting.type === 'select' && (
                      <select
                        value={configSettings[key] || setting.default}
                        onChange={(e) => setConfigSettings({
                          ...configSettings,
                          [key]: e.target.value
                        })}
                        className="config-select"
                      >
                        {setting.options.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}
                    
                    {setting.type === 'array' && (
                      <div className="array-field">
                        <span>{(configSettings[key] || setting.default).join(', ')}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="dialog-actions">
                <Button variant="outline" onClick={() => setConfigDialog(null)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveConfig}>
                  Save Configuration
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Setup Instructions Dialog */}
      <Dialog open={showSetupDialog} onOpenChange={setShowSetupDialog}>
        <DialogContent className="setup-dialog">
          <DialogHeader>
            <DialogTitle>
              Connect {selectedIntegration?.charAt(0).toUpperCase() + selectedIntegration?.slice(1)}
            </DialogTitle>
            <DialogDescription>
              Follow these steps to connect your {selectedIntegration} account
            </DialogDescription>
          </DialogHeader>

          {setupInstructions && (
            <div className="setup-content">
              <div className="setup-steps">
                <h3>Setup Instructions:</h3>
                {Object.entries(setupInstructions.instructions[selectedIntegration] || {}).map(([key, value]) => {
                  if (key.startsWith('step')) {
                    return (
                      <div key={key} className="setup-step">
                        <span className="step-number">{key.replace('step', '')}</span>
                        <span className="step-text">{value}</span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>

              <div className="credentials-form">
                <h3>Enter Your Credentials:</h3>
                
                <div className="form-group">
                  <label>Client ID</label>
                  <Input
                    type="text"
                    placeholder="Enter Client ID"
                    value={credentials.client_id}
                    onChange={(e) => setCredentials({...credentials, client_id: e.target.value})}
                  />
                </div>

                <div className="form-group">
                  <label>Client Secret</label>
                  <Input
                    type="password"
                    placeholder="Enter Client Secret"
                    value={credentials.client_secret}
                    onChange={(e) => setCredentials({...credentials, client_secret: e.target.value})}
                  />
                </div>

                {selectedIntegration === 'outlook' && (
                  <div className="form-group">
                    <label>Tenant ID (for Outlook/Microsoft)</label>
                    <Input
                      type="text"
                      placeholder="Enter Tenant ID"
                      value={credentials.tenant_id}
                      onChange={(e) => setCredentials({...credentials, tenant_id: e.target.value})}
                    />
                  </div>
                )}
                
                {selectedIntegration === 'gmail' && (
                  <div className="gmail-note">
                    <p><strong>Note:</strong> Gmail uses Google Cloud OAuth. No Tenant ID needed.</p>
                  </div>
                )}

                <div className="redirect-uri-info">
                  <strong>Redirect URI:</strong>
                  <code>{setupInstructions.instructions[selectedIntegration]?.redirect_uri}</code>
                </div>
              </div>

              <div className="dialog-actions">
                <Button variant="outline" onClick={() => setShowSetupDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveCredentials}>
                  Save & Connect
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Banking Widget Dialog for TrueLayer and Plaid */}
      <Dialog open={!!bankingWidget} onOpenChange={() => setBankingWidget(null)}>
        <DialogContent className="banking-widget-dialog">
          <DialogHeader>
            <DialogTitle>
              {bankingWidget?.integrationType?.toUpperCase()} Banking Data
            </DialogTitle>
            <DialogDescription>
              View connected accounts, balances, and recent transactions
            </DialogDescription>
          </DialogHeader>

          {loadingWidget ? (
            <div className="widget-loading">
              <p>Loading banking data...</p>
            </div>
          ) : (
            <div className="banking-widget-content">
              {/* Accounts Section */}
              <div className="widget-section">
                <h3>Connected Accounts ({widgetData.accounts.length})</h3>
                <div className="accounts-list">
                  {widgetData.accounts.map((account, idx) => (
                    <div key={idx} className="account-item">
                      <div className="account-header">
                        <span className="account-name">
                          {account.display_name || account.name || 'Account'}
                        </span>
                        <span className="account-type">
                          {account.account_type || account.type}
                        </span>
                      </div>
                      <div className="account-details">
                        <div className="account-number">
                          {account.account_number?.number || account.mask || '****'}
                        </div>
                        <div className="account-balance">
                          <span className="balance-label">Balance:</span>
                          <span className="balance-amount">
                            {account.balance?.currency || account.balance?.currency || 'USD'} {' '}
                            {account.balance?.current || account.balance?.current || '0.00'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transactions Section */}
              <div className="widget-section">
                <h3>Recent Transactions ({widgetData.transactions.length})</h3>
                <div className="transactions-list">
                  {widgetData.transactions.slice(0, 10).map((txn, idx) => (
                    <div key={idx} className="transaction-item">
                      <div className="transaction-info">
                        <span className="transaction-name">
                          {txn.description || txn.name || 'Transaction'}
                        </span>
                        <span className="transaction-date">
                          {new Date(txn.timestamp || txn.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="transaction-amount">
                        <span className={`amount ${(txn.amount || 0) < 0 ? 'positive' : 'negative'}`}>
                          {txn.currency || 'USD'} {Math.abs(txn.amount || 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dialog-actions">
                <Button variant="outline" onClick={() => setBankingWidget(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Test Results Dialog */}
      <Dialog open={!!testResults} onOpenChange={() => setTestResults(null)}>
        <DialogContent className="test-results-dialog">
          <DialogHeader>
            <DialogTitle>
              {testResults?.success ? '✅ Connection Test Passed' : '⚠️ Connection Test Failed'}
            </DialogTitle>
            <DialogDescription>
              Test results for {testResults?.integrationType?.toUpperCase()} integration
            </DialogDescription>
          </DialogHeader>

          {testResults && (
            <div className="test-results-content">
              <div className={`test-status ${testResults.success ? 'success' : 'failure'}`}>
                <h3>{testResults.message}</h3>
              </div>

              <div className="test-details">
                <h4>Connection Details:</h4>
                <div className="details-grid">
                  {Object.entries(testResults.details || {}).map(([key, value]) => (
                    <div key={key} className="detail-item">
                      <span className="detail-label">
                        {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                      </span>
                      <span className="detail-value">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {testResults.details?.next_step && (
                <div className="next-step">
                  <h4>Next Step:</h4>
                  <p>{testResults.details.next_step}</p>
                </div>
              )}

              <div className="dialog-actions">
                <Button onClick={() => setTestResults(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteDialog} onOpenChange={() => setDeleteDialog(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Integration</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the <strong>{deleteDialog?.integrationType}</strong> integration? 
              This action cannot be undone and will remove all associated data and configurations.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-2 sm:gap-2">
            <AlertDialogCancel className="mt-0 border-slate-300 text-slate-900 hover:bg-slate-100 bg-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDisconnect(deleteDialog?.connectionId)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete Integration
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Integrations;
