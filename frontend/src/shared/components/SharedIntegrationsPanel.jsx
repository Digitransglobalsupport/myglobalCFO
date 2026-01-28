/**
 * SharedIntegrationsPanel - Portable integration management component
 * 
 * This component can be dropped into any app (realtime-finance, realtime-pmo, etc.)
 * and will automatically:
 * - Show only integrations enabled for the current app
 * - Track source_app_id for debugging
 * - Share integration state across apps via MongoDB
 * 
 * Usage:
 *   import { SharedIntegrationsPanel } from '@/shared/components/SharedIntegrationsPanel';
 *   <SharedIntegrationsPanel authToken={token} />
 * 
 * Props:
 *   - authToken: JWT token for API calls
 *   - showERPAccounts: boolean - whether to show ERP accounts tab
 *   - onIntegrationChange: callback when integrations change
 */

import React, { useState } from 'react';
import { useIntegrations } from '../hooks/useIntegrations';
import { 
  Plug, RefreshCcw, CheckCircle, XCircle, Clock, 
  Plus, Trash2, ExternalLink, Building2, TestTube
} from 'lucide-react';

// Note: These imports assume shadcn/ui is installed
// Adjust paths based on your project structure
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

/**
 * Main shared integrations panel
 */
export const SharedIntegrationsPanel = ({ 
  authToken, 
  showERPAccounts = true,
  onIntegrationChange 
}) => {
  const {
    integrations,
    erpAccounts,
    catalog,
    appConfig,
    loading,
    appId,
    connectIntegration,
    disconnectIntegration,
    syncIntegration,
    getIntegrationStatus,
    getIntegration,
    refresh
  } = useIntegrations(authToken);

  const [activeTab, setActiveTab] = useState('integrations');

  const handleConnect = async (platform, credentials) => {
    const result = await connectIntegration(platform, credentials);
    if (result.success) {
      toast.success(`${platform} connected successfully!`);
      onIntegrationChange?.('connected', platform);
    } else {
      toast.error(result.error);
    }
    return result;
  };

  const handleDisconnect = async (integrationId, platform) => {
    const result = await disconnectIntegration(integrationId);
    if (result.success) {
      toast.success(`${platform} disconnected`);
      onIntegrationChange?.('disconnected', platform);
    } else {
      toast.error(result.error);
    }
    return result;
  };

  const handleSync = async (integrationId, platform) => {
    const result = await syncIntegration(integrationId);
    if (result.success) {
      toast.success(`${platform} synced successfully!`);
    } else {
      toast.error(result.error);
    }
    return result;
  };

  // Group integrations by category
  const groupedCatalog = Object.entries(catalog).reduce((acc, [key, value]) => {
    const category = value.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push({ id: key, ...value });
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="shared-integrations-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Integrations</h1>
          <p className="text-gray-400 mt-1">
            Shared across apps • Source: {appConfig?.app_name || appId}
          </p>
        </div>
        <Button 
          variant="outline" 
          className="border-slate-600 text-white"
          onClick={refresh}
        >
          <RefreshCcw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <SummaryCard
          title="Available"
          value={Object.keys(catalog).length}
          icon={<Plug className="w-5 h-5" />}
          color="blue"
        />
        <SummaryCard
          title="Connected"
          value={integrations.filter(i => i.status === 'connected').length}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <SummaryCard
          title="Pending"
          value={integrations.filter(i => i.status === 'pending').length}
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger 
            value="integrations" 
            className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
          >
            <Plug className="w-4 h-4 mr-2" />
            All Integrations
          </TabsTrigger>
          {showERPAccounts && (
            <TabsTrigger 
              value="erp" 
              className="data-[state=active]:bg-blue-500 data-[state=active]:text-white"
            >
              <Building2 className="w-4 h-4 mr-2" />
              ERP Accounts
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="integrations" className="space-y-6">
          {Object.entries(groupedCatalog).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-lg font-semibold text-white mb-4">{category}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {items.map((platform) => (
                  <IntegrationCard
                    key={platform.id}
                    platform={platform}
                    status={getIntegrationStatus(platform.id)}
                    integrationData={getIntegration(platform.id)}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    onSync={handleSync}
                    sourceAppId={appId}
                  />
                ))}
              </div>
            </div>
          ))}
          
          {Object.keys(groupedCatalog).length === 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-16 text-center">
                <Plug className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  No Integrations Available
                </h3>
                <p className="text-gray-400">
                  This app doesn't have any integrations enabled.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {showERPAccounts && (
          <TabsContent value="erp">
            <ERPAccountsList 
              accounts={erpAccounts} 
              onRefresh={refresh}
              authToken={authToken}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

/**
 * Summary card component
 */
const SummaryCard = ({ title, value, icon, color }) => {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    red: 'bg-red-500/10 text-red-400'
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${colors[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * Individual integration card
 */
const IntegrationCard = ({ 
  platform, 
  status, 
  integrationData,
  onConnect, 
  onDisconnect, 
  onSync,
  sourceAppId
}) => {
  const [showConnect, setShowConnect] = useState(false);
  const [credentials, setCredentials] = useState({
    client_id: '',
    client_secret: '',
    api_key: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const result = await onConnect(platform.id, credentials);
    setLoading(false);
    if (result.success) {
      setShowConnect(false);
      setCredentials({ client_id: '', client_secret: '', api_key: '' });
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return (
          <Badge className="bg-green-500/20 text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" /> Connected
          </Badge>
        );
      case 'error':
        return (
          <Badge className="bg-red-500/20 text-red-400">
            <XCircle className="w-3 h-3 mr-1" /> Error
          </Badge>
        );
      case 'syncing':
        return (
          <Badge className="bg-blue-500/20 text-blue-400">
            <RefreshCcw className="w-3 h-3 mr-1 animate-spin" /> Syncing
          </Badge>
        );
      case 'pending':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-500/20 text-gray-400">
            Not Connected
          </Badge>
        );
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700 hover:border-blue-500/30 transition-all">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-white text-lg">{platform.name}</CardTitle>
            <CardDescription className="text-gray-400 text-sm">
              {platform.description}
            </CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Category</span>
            <Badge variant="outline" className="border-slate-600 text-gray-300">
              {platform.category}
            </Badge>
          </div>

          {status === 'connected' && integrationData?.source_app_name && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Connected via</span>
              <span className="text-blue-400">{integrationData.source_app_name}</span>
            </div>
          )}

          {status === 'connected' && integrationData?.last_sync_at && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Last Sync</span>
              <span className="text-gray-300">
                {new Date(integrationData.last_sync_at).toLocaleDateString()}
              </span>
            </div>
          )}

          <div className="flex items-center space-x-2 pt-2">
            {status === 'connected' ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-slate-600 text-white"
                  onClick={() => onSync(integrationData.id, platform.name)}
                >
                  <RefreshCcw className="w-4 h-4 mr-1" /> Sync
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-red-500/50 text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">
                        Disconnect {platform.name}?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        This will disconnect the integration across ALL apps that share it.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-slate-700 text-white">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDisconnect(integrationData.id, platform.name)}
                        className="bg-red-500 text-white"
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <Dialog open={showConnect} onOpenChange={setShowConnect}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                    data-testid={`connect-${platform.id}-btn`}
                  >
                    <Plug className="w-4 h-4 mr-1" /> Connect
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">
                      Connect {platform.name}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {platform.auth_methods?.includes('OAuth2') && (
                      <>
                        <div>
                          <Label className="text-gray-300">Client ID</Label>
                          <Input
                            value={credentials.client_id}
                            onChange={(e) => setCredentials({
                              ...credentials, 
                              client_id: e.target.value
                            })}
                            className="bg-slate-900 border-slate-600 text-white"
                            placeholder="Enter Client ID"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300">Client Secret</Label>
                          <Input
                            type="password"
                            value={credentials.client_secret}
                            onChange={(e) => setCredentials({
                              ...credentials, 
                              client_secret: e.target.value
                            })}
                            className="bg-slate-900 border-slate-600 text-white"
                            placeholder="Enter Client Secret"
                          />
                        </div>
                      </>
                    )}
                    {platform.auth_methods?.includes('API Key') && (
                      <div>
                        <Label className="text-gray-300">API Key</Label>
                        <Input
                          type="password"
                          value={credentials.api_key}
                          onChange={(e) => setCredentials({
                            ...credentials, 
                            api_key: e.target.value
                          })}
                          className="bg-slate-900 border-slate-600 text-white"
                          placeholder="Enter API Key"
                        />
                      </div>
                    )}
                    <p className="text-gray-500 text-xs">
                      This integration will be visible in all apps: realtime-finance, realtime-pmo
                    </p>
                  </div>
                  <DialogFooter>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowConnect(false)}
                      className="border-slate-600 text-white"
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSubmit}
                      className="bg-blue-500 hover:bg-blue-600 text-white"
                      disabled={loading}
                    >
                      {loading ? 'Connecting...' : 'Connect'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * ERP Accounts list component
 */
const ERPAccountsList = ({ accounts, onRefresh, authToken }) => {
  if (!accounts || accounts.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-16 text-center">
          <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No ERP Accounts</h3>
          <p className="text-gray-400">
            Create an ERP account to connect your entities to accounting systems.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {accounts.map((account) => (
        <Card key={account.id} className="bg-slate-800 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-lg ${
                  account.status === 'connected' ? 'bg-green-500/10' :
                  account.status === 'error' ? 'bg-red-500/10' :
                  'bg-yellow-500/10'
                }`}>
                  <Plug className={`w-6 h-6 ${
                    account.status === 'connected' ? 'text-green-400' :
                    account.status === 'error' ? 'text-red-400' :
                    'text-yellow-400'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-white font-semibold text-lg">{account.name}</h3>
                    <Badge className={
                      account.status === 'connected' ? 'bg-green-500/20 text-green-400' :
                      account.status === 'error' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }>
                      {account.status}
                    </Badge>
                  </div>
                  <p className="text-gray-400 text-sm mt-1">
                    Provider: <span className="text-blue-400">{account.provider}</span>
                    {account.source_app_name && (
                      <> • Added via {account.source_app_name}</>
                    )}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>
                      <Building2 className="w-4 h-4 inline mr-1" />
                      {account.linked_entity_count || 0} entities linked
                    </span>
                    {account.last_sync_at && (
                      <span>
                        <RefreshCcw className="w-4 h-4 inline mr-1" />
                        Last sync: {new Date(account.last_sync_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default SharedIntegrationsPanel;
