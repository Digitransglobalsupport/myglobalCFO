import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';
import { toast } from 'sonner';
import { 
  Plug, RefreshCcw, CheckCircle, XCircle, Clock, Settings, Trash2, 
  Plus, Link, Unlink, Building2, TestTube, Play, Edit, AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const IntegrationsPage = () => {
  const { authAxios } = useAuth();
  const [erpAccounts, setErpAccounts] = useState([]);
  const [providers, setProviders] = useState([]);
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('accounts');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [accountsRes, providersRes, entitiesRes] = await Promise.all([
        authAxios.get('/erp/accounts'),
        authAxios.get('/erp/providers'),
        authAxios.get('/entity-tree/nodes')
      ]);
      setErpAccounts(accountsRes.data);
      setProviders(providersRes.data.providers);
      setEntities(entitiesRes.data);
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="space-y-6" data-testid="integrations-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">ERP Integrations</h1>
          <p className="text-gray-400 mt-1">Manage ERP accounts and connect entities to your accounting systems</p>
        </div>
        <CreateERPAccountDialog providers={providers} onCreated={fetchData} />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard 
          title="ERP Accounts" 
          value={erpAccounts.length} 
          icon={<Plug className="w-5 h-5" />}
          color="blue"
        />
        <SummaryCard 
          title="Connected" 
          value={erpAccounts.filter(a => a.status === 'connected').length} 
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
        />
        <SummaryCard 
          title="Pending" 
          value={erpAccounts.filter(a => a.status === 'pending').length} 
          icon={<Clock className="w-5 h-5" />}
          color="yellow"
        />
        <SummaryCard 
          title="Entities Linked" 
          value={entities.filter(e => e.erp_account_id).length} 
          icon={<Link className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="accounts" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Plug className="w-4 h-4 mr-2" /> ERP Accounts
          </TabsTrigger>
          <TabsTrigger value="providers" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Settings className="w-4 h-4 mr-2" /> Supported Providers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <ERPAccountsList 
            accounts={erpAccounts} 
            entities={entities}
            onRefresh={fetchData} 
          />
        </TabsContent>

        <TabsContent value="providers">
          <ProvidersGrid providers={providers} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Summary Card
const SummaryCard = ({ title, value, icon, color }) => {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
  };

  return (
    <Card className={`bg-slate-800 border-slate-700`}>
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

// ERP Accounts List
const ERPAccountsList = ({ accounts, entities, onRefresh }) => {
  const { authAxios } = useAuth();
  const [testingId, setTestingId] = useState(null);
  const [syncingId, setSyncingId] = useState(null);

  const testAccount = async (accountId) => {
    try {
      setTestingId(accountId);
      const res = await authAxios.post(`/erp/accounts/${accountId}/test`);
      if (res.data.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(res.data.message);
      }
      onRefresh();
    } catch (e) {
      toast.error('Connection test failed');
    } finally {
      setTestingId(null);
    }
  };

  const syncAccount = async (accountId) => {
    try {
      setSyncingId(accountId);
      const res = await authAxios.post(`/erp/accounts/${accountId}/sync`);
      toast.success(res.data.message);
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncingId(null);
    }
  };

  const deleteAccount = async (accountId, accountName) => {
    try {
      await authAxios.delete(`/erp/accounts/${accountId}`);
      toast.success(`${accountName} deleted`);
      onRefresh();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete account');
    }
  };

  if (accounts.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-16 text-center">
          <Plug className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No ERP Accounts</h3>
          <p className="text-gray-400 mb-4">Create an ERP account to connect your entities to accounting systems</p>
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
                {/* Provider Icon */}
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
                
                {/* Account Info */}
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-white font-semibold text-lg">{account.name}</h3>
                    <Badge className={
                      account.status === 'connected' ? 'bg-green-500/20 text-green-400' :
                      account.status === 'error' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }>
                      {account.status === 'connected' ? <CheckCircle className="w-3 h-3 mr-1" /> :
                       account.status === 'error' ? <XCircle className="w-3 h-3 mr-1" /> :
                       <Clock className="w-3 h-3 mr-1" />}
                      {account.status}
                    </Badge>
                  </div>
                  
                  <p className="text-gray-400 text-sm mt-1">
                    Provider: <span className="text-blue-400">{account.provider}</span>
                    {account.description && ` • ${account.description}`}
                  </p>
                  
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>
                      <Building2 className="w-4 h-4 inline mr-1" />
                      {account.linked_entity_count} entities linked
                    </span>
                    {account.last_sync_at && (
                      <span>
                        <RefreshCcw className="w-4 h-4 inline mr-1" />
                        Last sync: {new Date(account.last_sync_at).toLocaleDateString()}
                      </span>
                    )}
                    {account.last_test_result && (
                      <span className={account.status === 'connected' ? 'text-green-500' : 'text-red-500'}>
                        {account.last_test_result}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-white"
                  onClick={() => testAccount(account.id)}
                  disabled={testingId === account.id}
                >
                  <TestTube className="w-4 h-4 mr-1" />
                  {testingId === account.id ? 'Testing...' : 'Test'}
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  className="border-slate-600 text-white"
                  onClick={() => syncAccount(account.id)}
                  disabled={account.status !== 'connected' || syncingId === account.id}
                >
                  <Play className="w-4 h-4 mr-1" />
                  {syncingId === account.id ? 'Syncing...' : 'Sync All'}
                </Button>

                <LinkEntitiesDialog 
                  account={account} 
                  entities={entities} 
                  onUpdate={onRefresh} 
                />
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300"
                      disabled={account.linked_entity_count > 0}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-800 border-slate-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-white">Delete {account.name}?</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        This will permanently delete this ERP account.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-slate-700 text-white">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteAccount(account.id, account.name)}
                        className="bg-red-500 text-white"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>

            {/* Linked Entities */}
            {account.linked_entity_count > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-700">
                <p className="text-gray-400 text-sm mb-2">Linked Entities:</p>
                <div className="flex flex-wrap gap-2">
                  {entities
                    .filter(e => e.erp_account_id === account.id)
                    .map(entity => (
                      <Badge key={entity.id} className="bg-slate-700 text-gray-300">
                        {entity.name}
                      </Badge>
                    ))
                  }
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Providers Grid
const ProvidersGrid = ({ providers }) => {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Supported ERP Providers</CardTitle>
        <CardDescription className="text-gray-400">
          Create an ERP Account to connect to any of these providers
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {providers.map((provider) => (
            <div
              key={provider.value}
              className="p-4 bg-slate-900 rounded-lg border border-slate-700"
            >
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold">{provider.name}</h4>
                {provider.has_api ? (
                  <Badge className="bg-green-500/20 text-green-400">API</Badge>
                ) : (
                  <Badge className="bg-gray-500/20 text-gray-400">Manual</Badge>
                )}
              </div>
              <p className="text-gray-400 text-sm">{provider.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// Create ERP Account Dialog
const CreateERPAccountDialog = ({ providers, onCreated }) => {
  const { authAxios } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider: '',
    description: '',
    api_url: '',
    client_id: '',
    client_secret: '',
    api_key: '',
    auto_sync: false,
    sync_frequency: 'daily'
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.provider) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      await authAxios.post('/erp/accounts', formData);
      toast.success('ERP Account created!');
      setOpen(false);
      onCreated?.();
      setFormData({
        name: '',
        provider: '',
        description: '',
        api_url: '',
        client_id: '',
        client_secret: '',
        api_key: '',
        auto_sync: false,
        sync_frequency: 'daily'
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-erp-account-btn">
          <Plus className="w-4 h-4 mr-2" /> Add ERP Account
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Create ERP Account</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="text-gray-300">Account Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-slate-900 border-slate-600 text-white"
              placeholder="e.g., UK Finance - Sage"
            />
            <p className="text-gray-500 text-xs mt-1">A friendly name to identify this account</p>
          </div>

          <div>
            <Label className="text-gray-300">ERP Provider *</Label>
            <Select
              value={formData.provider}
              onValueChange={(v) => setFormData({ ...formData, provider: v })}
            >
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                <SelectValue placeholder="Select provider..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                {providers.filter(p => p.has_api).map(p => (
                  <SelectItem key={p.value} value={p.value} className="text-white">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-300">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="bg-slate-900 border-slate-600 text-white"
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          <div className="border-t border-slate-700 pt-4">
            <p className="text-gray-400 text-sm mb-3">Connection Credentials (optional - for real ERP integration)</p>
            
            <div className="space-y-3">
              <div>
                <Label className="text-gray-300">API URL</Label>
                <Input
                  value={formData.api_url}
                  onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="https://api.example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-gray-300">Client ID</Label>
                  <Input
                    value={formData.client_id}
                    onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                    className="bg-slate-900 border-slate-600 text-white"
                    placeholder="Client ID"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Client Secret</Label>
                  <Input
                    type="password"
                    value={formData.client_secret}
                    onChange={(e) => setFormData({ ...formData, client_secret: e.target.value })}
                    className="bg-slate-900 border-slate-600 text-white"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <Label className="text-gray-300">API Key</Label>
                <Input
                  type="password"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  className="bg-slate-900 border-slate-600 text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-600 text-white">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            {loading ? 'Creating...' : 'Create Account'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Link Entities Dialog
const LinkEntitiesDialog = ({ account, entities, onUpdate }) => {
  const { authAxios } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const linkedEntityIds = entities
    .filter(e => e.erp_account_id === account.id)
    .map(e => e.id);

  const unlinkedEntities = entities.filter(e => !e.erp_account_id || e.erp_account_id === account.id);

  const linkEntity = async (entityId) => {
    try {
      setLoading(true);
      await authAxios.post(`/erp/accounts/${account.id}/link-entity/${entityId}`);
      toast.success('Entity linked!');
      onUpdate?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to link entity');
    } finally {
      setLoading(false);
    }
  };

  const unlinkEntity = async (entityId) => {
    try {
      setLoading(true);
      await authAxios.post(`/erp/accounts/${account.id}/unlink-entity/${entityId}`);
      toast.success('Entity unlinked!');
      onUpdate?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to unlink entity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-slate-600 text-white">
          <Link className="w-4 h-4 mr-1" /> Link Entities
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-white">Link Entities to {account.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-gray-400 text-sm mb-4">
            Select entities to link to this ERP account. Linked entities will sync data from this account.
          </p>
          
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {unlinkedEntities.map((entity) => {
                const isLinked = linkedEntityIds.includes(entity.id);
                return (
                  <div
                    key={entity.id}
                    className={`flex items-center justify-between p-3 rounded-lg border ${
                      isLinked 
                        ? 'bg-blue-500/10 border-blue-500/50' 
                        : 'bg-slate-900 border-slate-700'
                    }`}
                  >
                    <div>
                      <p className="text-white font-medium">{entity.name}</p>
                      <p className="text-gray-400 text-sm">{entity.entity_code}</p>
                    </div>
                    {isLinked ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-500/50 text-red-400 hover:bg-red-500/10"
                        onClick={() => unlinkEntity(entity.id)}
                        disabled={loading}
                      >
                        <Unlink className="w-4 h-4 mr-1" /> Unlink
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                        onClick={() => linkEntity(entity.id)}
                        disabled={loading || entity.erp_account_id}
                      >
                        <Link className="w-4 h-4 mr-1" /> Link
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-600 text-white">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default IntegrationsPage;
