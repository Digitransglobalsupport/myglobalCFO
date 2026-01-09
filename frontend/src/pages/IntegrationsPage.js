import React, { useState, useEffect } from 'react';
import { useAuth, useApp } from '../App';
import { toast } from 'sonner';
import { Plug, RefreshCcw, CheckCircle, XCircle, Clock, Settings, Trash2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const IntegrationsPage = () => {
  const { authAxios } = useAuth();
  const [integrations, setIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erpFilter, setErpFilter] = useState('all');

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/integrations');
      setIntegrations(res.data);
    } catch (e) {
      console.error('Error fetching integrations:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (platform, credentials) => {
    try {
      await authAxios.post('/integrations', { platform, ...credentials });
      toast.success(`${platform} connected successfully!`);
      fetchIntegrations();
    } catch (e) {
      toast.error(`Failed to connect ${platform}`);
    }
  };

  const handleSync = async (integrationId, platform) => {
    try {
      await authAxios.post(`/integrations/${integrationId}/sync`);
      toast.success(`${platform} synced successfully!`);
      fetchIntegrations();
    } catch (e) {
      toast.error(`Failed to sync ${platform}`);
    }
  };

  const handleDelete = async (integrationId, platform) => {
    try {
      await authAxios.delete(`/integrations/${integrationId}`);
      toast.success(`${platform} disconnected`);
      fetchIntegrations();
    } catch (e) {
      toast.error(`Failed to disconnect ${platform}`);
    }
  };

  const getIntegrationStatus = (platform) => {
    const integration = integrations.find(i => i.platform === platform);
    return integration?.status || 'not_connected';
  };

  const getIntegrationData = (platform) => {
    return integrations.find(i => i.platform === platform);
  };

  const erpPlatforms = [
    // Enterprise
    { name: 'NetSuite', category: 'Enterprise', description: 'Oracle NetSuite ERP', auth: ['OAuth2', 'TBA'] },
    { name: 'Microsoft Dynamics 365 Finance', category: 'Enterprise', description: 'Enterprise-grade ERP', auth: ['OAuth2'] },
    { name: 'Microsoft Dynamics 365 BC', category: 'Enterprise', description: 'Business Central ERP', auth: ['OAuth2'] },
    { name: 'SAP S/4HANA', category: 'Enterprise', description: 'SAP Enterprise ERP', auth: ['OAuth2', 'API Key'] },
    { name: 'Workday Finance', category: 'Enterprise', description: 'Cloud-based HCM & Finance', auth: ['OAuth2'] },
    // SMB
    { name: 'Xero', category: 'SMB', description: 'Cloud accounting for SMBs', auth: ['OAuth2'] },
    { name: 'QuickBooks', category: 'SMB', description: 'Small business accounting', auth: ['OAuth2'] },
    { name: 'Sage', category: 'SMB', description: 'Accounting & payroll', auth: ['OAuth2'] },
    { name: 'Zoho Books', category: 'SMB', description: 'Online accounting', auth: ['OAuth2', 'API Key'] },
    { name: 'FreeAgent', category: 'SMB', description: 'UK accounting software', auth: ['OAuth2'] },
    { name: 'FreshBooks', category: 'SMB', description: 'Invoice & expense tracking', auth: ['OAuth2'] },
    { name: 'Clear Books', category: 'SMB', description: 'UK cloud accounting', auth: ['OAuth2', 'API Key'] },
    { name: 'Crunch', category: 'SMB', description: 'UK accountancy service', auth: ['OAuth2'] },
    { name: 'KashFlow', category: 'SMB', description: 'Simple accounting', auth: ['API Key'] }
  ];

  const otherIntegrations = [
    { name: 'Gmail', category: 'Email', description: 'Email monitoring & attachment processing', auth: ['OAuth2'] },
    { name: 'Outlook', category: 'Email', description: 'Microsoft email integration', auth: ['OAuth2'] },
    { name: 'TrueLayer', category: 'Banking', description: 'Real-time bank feeds', auth: ['OAuth2'] }
  ];

  const filteredERPs = erpFilter === 'all' 
    ? erpPlatforms 
    : erpPlatforms.filter(p => p.category === erpFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Integrations</h1>
        <p className="text-gray-400 mt-1">Connect your financial platforms and data sources</p>
      </div>

      <Tabs defaultValue="erp" className="space-y-6">
        <TabsList className="bg-navy-800 border-navy-700">
          <TabsTrigger value="erp" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            ERP Integrations ({erpPlatforms.length})
          </TabsTrigger>
          <TabsTrigger value="other" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            Other Integrations
          </TabsTrigger>
        </TabsList>

        {/* ERP Integrations Tab */}
        <TabsContent value="erp">
          {/* Filter */}
          <div className="flex items-center space-x-2 mb-6">
            <Button
              variant={erpFilter === 'all' ? 'default' : 'outline'}
              className={erpFilter === 'all' ? 'bg-gold-500 text-navy-900' : 'border-navy-600 text-white'}
              onClick={() => setErpFilter('all')}
            >
              All ({erpPlatforms.length})
            </Button>
            <Button
              variant={erpFilter === 'Enterprise' ? 'default' : 'outline'}
              className={erpFilter === 'Enterprise' ? 'bg-gold-500 text-navy-900' : 'border-navy-600 text-white'}
              onClick={() => setErpFilter('Enterprise')}
            >
              Enterprise (5)
            </Button>
            <Button
              variant={erpFilter === 'SMB' ? 'default' : 'outline'}
              className={erpFilter === 'SMB' ? 'bg-gold-500 text-navy-900' : 'border-navy-600 text-white'}
              onClick={() => setErpFilter('SMB')}
            >
              SMB (9)
            </Button>
          </div>

          {/* Platform Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredERPs.map((platform) => (
              <IntegrationCard
                key={platform.name}
                platform={platform}
                status={getIntegrationStatus(platform.name)}
                integrationData={getIntegrationData(platform.name)}
                onConnect={handleConnect}
                onSync={handleSync}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </TabsContent>

        {/* Other Integrations Tab */}
        <TabsContent value="other">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {otherIntegrations.map((platform) => (
              <IntegrationCard
                key={platform.name}
                platform={platform}
                status={getIntegrationStatus(platform.name)}
                integrationData={getIntegrationData(platform.name)}
                onConnect={handleConnect}
                onSync={handleSync}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

const IntegrationCard = ({ platform, status, integrationData, onConnect, onSync, onDelete }) => {
  const [showConnect, setShowConnect] = useState(false);
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleSubmit = () => {
    const credentials = {};
    if (clientId) credentials.client_id = clientId;
    if (clientSecret) credentials.client_secret = clientSecret;
    if (apiKey) credentials.api_key = apiKey;
    onConnect(platform.name, credentials);
    setShowConnect(false);
    setClientId('');
    setClientSecret('');
    setApiKey('');
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle className="w-3 h-3 mr-1" /> Connected
        </Badge>;
      case 'error':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
          <XCircle className="w-3 h-3 mr-1" /> Error
        </Badge>;
      case 'syncing':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
          <RefreshCcw className="w-3 h-3 mr-1 animate-spin" /> Syncing
        </Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400">Not Connected</Badge>;
    }
  };

  const formatLastSync = (timestamp) => {
    if (!timestamp) return 'Never';
    return new Date(timestamp).toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="bg-navy-800 border-navy-700 hover:border-gold-500/30 transition-all">
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
            <Badge variant="outline" className="border-navy-600 text-gray-300">
              {platform.category}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Auth Methods</span>
            <span className="text-gray-300">{platform.auth.join(', ')}</span>
          </div>
          {status === 'connected' && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Last Sync</span>
              <span className="text-gray-300">{formatLastSync(integrationData?.last_sync)}</span>
            </div>
          )}

          <div className="flex items-center space-x-2 pt-2">
            {status === 'connected' ? (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 border-navy-600 text-white"
                  onClick={() => onSync(integrationData.id, platform.name)}
                >
                  <RefreshCcw className="w-4 h-4 mr-1" /> Sync
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="outline" className="border-red-500/50 text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-navy-800 border-navy-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Disconnect {platform.name}?</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        This will remove the integration. You'll need to reconnect to sync data again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-navy-700 text-white">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(integrationData.id, platform.name)}
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
                  <Button size="sm" className="w-full bg-gold-500 hover:bg-gold-600 text-navy-900">
                    <Plug className="w-4 h-4 mr-1" /> Connect
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-navy-800 border-navy-700">
                  <DialogHeader>
                    <DialogTitle className="text-white">Connect {platform.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {platform.auth.includes('OAuth2') && (
                      <>
                        <div>
                          <Label className="text-gray-300">Client ID</Label>
                          <Input
                            value={clientId}
                            onChange={(e) => setClientId(e.target.value)}
                            className="bg-navy-900 border-navy-600 text-white"
                            placeholder="Enter your Client ID"
                          />
                        </div>
                        <div>
                          <Label className="text-gray-300">Client Secret</Label>
                          <Input
                            type="password"
                            value={clientSecret}
                            onChange={(e) => setClientSecret(e.target.value)}
                            className="bg-navy-900 border-navy-600 text-white"
                            placeholder="Enter your Client Secret"
                          />
                        </div>
                      </>
                    )}
                    {platform.auth.includes('API Key') && (
                      <div>
                        <Label className="text-gray-300">API Key</Label>
                        <Input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="bg-navy-900 border-navy-600 text-white"
                          placeholder="Enter your API Key"
                        />
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowConnect(false)} className="border-navy-600 text-white">
                      Cancel
                    </Button>
                    <Button onClick={handleSubmit} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
                      Connect
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

export default IntegrationsPage;
