import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { API } from '@/App';
import { ArrowLeft, Check, X, RefreshCw, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const FPAIntegrations = ({ user }) => {
  const navigate = useNavigate();
  const [integrationStatus, setIntegrationStatus] = useState({});
  const [syncHistory, setSyncHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState({});

  const platforms = [
    {
      id: 'xero',
      name: 'Xero',
      description: 'Sync actuals from Xero accounting',
      logo: '🏦',
      type: 'accounting',
      color: 'bg-blue-50 border-blue-200'
    },
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Sync actuals from QuickBooks',
      logo: '💼',
      type: 'accounting',
      color: 'bg-green-50 border-green-200'
    },
    {
      id: 'sage',
      name: 'Sage',
      description: 'Sync actuals from Sage accounting',
      logo: '📊',
      type: 'accounting',
      color: 'bg-emerald-50 border-emerald-200'
    },
    {
      id: 'hubspot',
      name: 'HubSpot',
      description: 'Sync sales pipeline from HubSpot CRM',
      logo: '🎯',
      type: 'crm',
      color: 'bg-orange-50 border-orange-200'
    },
    {
      id: 'salesforce',
      name: 'Salesforce',
      description: 'Sync sales pipeline from Salesforce CRM',
      logo: '☁️',
      type: 'crm',
      color: 'bg-sky-50 border-sky-200'
    }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusRes, historyRes] = await Promise.all([
        axios.get(`${API}/fpa/integrations/status`),
        axios.get(`${API}/fpa/integrations/sync-history`)
      ]);

      setIntegrationStatus(statusRes.data);
      setSyncHistory(historyRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading integrations:', error);
      toast.error('Failed to load integrations');
      setLoading(false);
    }
  };

  const handleConnect = (platformId) => {
    // Redirect to Dashboard Integrations for connection management
    toast.info(`Redirecting to Integrations page...`, {
      description: 'All OAuth connections are managed in Dashboard → Integrations'
    });
    navigate('/dashboard/integrations');
  };

  const handleDisconnect = (platformId) => {
    // Redirect to Dashboard Integrations for connection management
    toast.info(`Manage connections in Dashboard → Integrations`, {
      description: 'Please disconnect from the main Integrations page'
    });
    navigate('/dashboard/integrations');
  };

  const handleSync = async (platformId) => {
    try {
      setSyncing({ ...syncing, [platformId]: true });
      
      await axios.post(`${API}/fpa/integrations/${platformId}/sync`);
      
      toast.success(`Sync initiated for ${platformId}`);
      
      // Reload sync history after a delay
      setTimeout(() => {
        loadData();
        setSyncing({ ...syncing, [platformId]: false });
      }, 2000);
    } catch (error) {
      console.error('Error syncing:', error);
      toast.error(`Failed to sync ${platformId}`);
      setSyncing({ ...syncing, [platformId]: false });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/fpa-dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Integrations</h1>
                <p className="text-sm text-slate-600">Connect accounting and CRM platforms for real-time data sync</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Accounting Platforms */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Accounting Platforms</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {platforms.filter(p => p.type === 'accounting').map((platform) => {
              const status = integrationStatus[platform.id] || {};
              const isConnected = status.connected;

              return (
                <Card key={platform.id} className={`p-6 ${platform.color} border-2`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{platform.logo}</div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{platform.name}</h3>
                        {isConnected ? (
                          <Badge className="bg-green-500 text-white text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Not Connected</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 mb-4">{platform.description}</p>

                  {isConnected ? (
                    <>
                      {status.tenant_name && (
                        <p className="text-xs text-slate-600 mb-2">
                          Organization: <span className="font-medium">{status.tenant_name}</span>
                        </p>
                      )}
                      {status.source && (
                        <p className="text-xs text-slate-500 mb-2">
                          Connected via: <span className="font-medium capitalize">{status.source === 'dashboard' ? 'Dashboard Integrations' : 'FP&A'}</span>
                        </p>
                      )}
                      {status.last_sync_at && (
                        <p className="text-xs text-slate-600 mb-4">
                          Last sync: {new Date(status.last_sync_at).toLocaleString()}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSync(platform.id)}
                          disabled={syncing[platform.id]}
                          className="flex-1"
                        >
                          {syncing[platform.id] ? (
                            <>
                              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-2" />
                              Sync Data
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDisconnect(platform.id)}
                          className="text-slate-600 hover:text-slate-700"
                        >
                          Manage
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(platform.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Connect {platform.name}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* CRM Platforms */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">CRM Platforms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {platforms.filter(p => p.type === 'crm').map((platform) => {
              const status = integrationStatus[platform.id] || {};
              const isConnected = status.connected;

              return (
                <Card key={platform.id} className={`p-6 ${platform.color} border-2`}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{platform.logo}</div>
                      <div>
                        <h3 className="font-semibold text-slate-900">{platform.name}</h3>
                        {isConnected ? (
                          <Badge className="bg-green-500 text-white text-xs">
                            <Check className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">Not Connected</Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700 mb-4">{platform.description}</p>

                  {isConnected ? (
                    <>
                      {status.source && (
                        <p className="text-xs text-slate-500 mb-2">
                          Connected via: <span className="font-medium capitalize">{status.source === 'dashboard' ? 'Dashboard Integrations' : 'FP&A'}</span>
                        </p>
                      )}
                      {status.last_sync_at && (
                        <p className="text-xs text-slate-600 mb-4">
                          Last sync: {new Date(status.last_sync_at).toLocaleString()}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSync(platform.id)}
                          disabled={syncing[platform.id]}
                          className="flex-1"
                        >
                          {syncing[platform.id] ? (
                            <>
                              <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                              Syncing...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-3 w-3 mr-2" />
                              Sync Pipeline
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDisconnect(platform.id)}
                          className="text-slate-600 hover:text-slate-700"
                        >
                          Manage
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(platform.id)}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Connect {platform.name}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Sync History */}
        {syncHistory.length > 0 && (
          <div className="mt-8">
            <Card className="p-6 bg-white">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Sync Activity</h2>
              <div className="space-y-3">
                {syncHistory.map((sync) => (
                  <div key={sync.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        sync.status === 'completed' ? 'bg-green-500' :
                        sync.status === 'failed' ? 'bg-red-500' :
                        'bg-yellow-500'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          {sync.integration_type} - {sync.sync_type}
                        </p>
                        <p className="text-xs text-slate-600">
                          {sync.records_synced} records synced
                          {sync.created_at && ` • ${new Date(sync.created_at).toLocaleString()}`}
                        </p>
                      </div>
                    </div>
                    <Badge variant={sync.status === 'completed' ? 'default' : 'secondary'}>
                      {sync.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Help Section */}
        <Card className="p-6 bg-blue-50 border-blue-200 mt-8">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-2">💡 How FP&A Integrations Work</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p><strong>Unified Connection System:</strong> All OAuth connections are managed in <span className="font-semibold">Dashboard → Integrations</span>. This page displays those connections and lets you sync FP&A-specific data.</p>
                <p><strong>Accounting Platforms:</strong> Sync actual financial data to compare against budgets and forecasts</p>
                <p><strong>CRM Platforms:</strong> Import sales pipeline data to power revenue forecasting</p>
                <p><strong>Data Sync:</strong> Click "Sync Data" or "Sync Pipeline" to pull the latest data for FP&A analysis</p>
                <p className="text-xs mt-3 text-blue-700">
                  💡 <strong>Tip:</strong> To connect or disconnect services, go to <span className="underline cursor-pointer" onClick={() => navigate('/dashboard/integrations')}>Dashboard → Integrations</span>
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default FPAIntegrations;
