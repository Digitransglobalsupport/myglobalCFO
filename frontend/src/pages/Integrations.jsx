import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import { API } from '@/App';

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
  const [configDialog, setConfigDialog] = useState(null);
  const [configSettings, setConfigSettings] = useState({});
  const [bankingWidget, setBankingWidget] = useState(null);
  const [widgetData, setWidgetData] = useState({ accounts: [], transactions: [] });
  const [loadingWidget, setLoadingWidget] = useState(false);

  useEffect(() => {
    loadAvailableIntegrations();
    if (selectedCompany) {
      loadConnectedIntegrations();
    }
  }, [selectedCompany]);

  const loadAvailableIntegrations = async () => {
    try {
      const response = await axios.get(`${API}/integrations/available`);
      setAvailableIntegrations(response.data.integrations);
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
      
      if (response.data.success) {
        alert(`✅ ${integrationType.toUpperCase()} Connection Test Passed!\n\n` +
              `Status: ${response.data.details.connection_status}\n` +
              `Last Sync: ${response.data.details.last_sync || 'N/A'}\n` +
              `Response Time: ${response.data.details.api_response_time || 'N/A'}\n` +
              `Permissions: ${response.data.details.permissions || 'N/A'}`);
      } else {
        alert(`⚠️ ${integrationType.toUpperCase()} Connection Test Failed\n\n` +
              `Status: ${response.data.details.connection_status}\n` +
              `Next Step: ${response.data.details.next_step || 'Check configuration'}`);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      alert('Failed to test connection: ' + (error.response?.data?.detail || error.message));
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
    } catch (error) {
      console.error('Error loading configuration:', error);
      alert('Failed to load configuration');
    }
  };

  const handleSaveConfig = async () => {
    if (!configDialog) return;

    try {
      await axios.put(`${API}/integrations/${configDialog.connectionId}/config`, configSettings);
      alert('Configuration saved successfully!');
      setConfigDialog(null);
      loadConnectedIntegrations();
    } catch (error) {
      console.error('Error saving configuration:', error);
      alert('Failed to save configuration');
    }
  };

  const handleDisconnect = async (connectionId) => {
    if (!window.confirm('Are you sure you want to disconnect this integration?')) {
      return;
    }

    try {
      await axios.delete(`${API}/integrations/${connectionId}`);
      loadConnectedIntegrations();
      alert('Integration disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      alert('Failed to disconnect integration');
    }
  };

  const getIntegrationIcon = (type) => {
    const icons = {
      gmail: '📬',
      outlook: '📧',
      xero: '📈',
      sage: '📊',
      quickbooks: '💼'
    };
    return icons[type] || '🔌';
  };

  const isConnected = (integrationType) => {
    return connectedIntegrations.some(conn => conn.integration_type === integrationType);
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

      <Tabs defaultValue="available" className="integrations-tabs">
        <TabsList>
          <TabsTrigger value="available">Available Integrations</TabsTrigger>
          <TabsTrigger value="connected">Connected ({connectedIntegrations.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="available">
          <div className="integrations-grid">
            {availableIntegrations.map(integration => (
              <Card key={integration.type} className="integration-card">
                <div className="integration-card-header">
                  <div className="integration-icon-large">
                    {getIntegrationIcon(integration.type)}
                  </div>
                  <h3>{integration.name}</h3>
                  {isConnected(integration.type) && (
                    <Badge className="connected-badge">Connected</Badge>
                  )}
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
                      onClick={() => handleDisconnect(connection.id)}
                    >
                      🗑️ Disconnect
                    </Button>
                  </div>
                </Card>
              ))}
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
    </div>
  );
};

export default Integrations;
