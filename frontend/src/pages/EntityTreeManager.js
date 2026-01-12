import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useApp } from '../App';
import { toast } from 'sonner';
import {
  Building2, Plus, Trash2, Edit, ChevronDown, ChevronRight, Network,
  Globe, RefreshCcw, AlertTriangle, CheckCircle, XCircle, Search,
  Filter, Download, Upload, Link, Unlink, FolderTree, Activity, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';

const EntityTreeManager = () => {
  const { authAxios } = useAuth();
  const [activeTab, setActiveTab] = useState('tree');
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatistics = useCallback(async () => {
    try {
      const res = await authAxios.get('/entity-tree/statistics');
      setStatistics(res.data);
    } catch (e) {
      console.error('Error fetching statistics:', e);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  return (
    <div className="space-y-6" data-testid="entity-tree-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Entity Tree Management</h1>
          <p className="text-gray-400 mt-1">Manage 130+ entities with nested holdcos and segment tagging</p>
        </div>
        <CreateEntityDialog onCreated={fetchStatistics} />
      </div>

      {/* Statistics Summary */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard 
            title="Total Entities" 
            value={statistics.total_entities} 
            max={statistics.max_supported_entities}
            icon={<Building2 className="w-5 h-5" />}
          />
          <StatCard 
            title="Holdcos" 
            value={statistics.by_type?.holdco || 0} 
            color="purple"
            icon={<Network className="w-5 h-5" />}
          />
          <StatCard 
            title="Subsidiaries" 
            value={statistics.by_type?.subsidiary || 0} 
            color="blue"
            icon={<FolderTree className="w-5 h-5" />}
          />
          <StatCard 
            title="Avg Data Health" 
            value={`${statistics.avg_data_health_pct}%`} 
            color={statistics.avg_data_health_pct >= 80 ? 'green' : statistics.avg_data_health_pct >= 50 ? 'yellow' : 'red'}
            icon={<Activity className="w-5 h-5" />}
          />
          <StatCard 
            title="ERP Connected" 
            value={statistics.connected_erps} 
            color="green"
            icon={<Link className="w-5 h-5" />}
          />
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="tree" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <FolderTree className="w-4 h-4 mr-2" /> Hierarchy View
          </TabsTrigger>
          <TabsTrigger value="list" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Building2 className="w-4 h-4 mr-2" /> List View
          </TabsTrigger>
          <TabsTrigger value="erp" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Link className="w-4 h-4 mr-2" /> ERP Connections
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tree">
          <EntityHierarchyView onUpdate={fetchStatistics} />
        </TabsContent>

        <TabsContent value="list">
          <EntityListView onUpdate={fetchStatistics} />
        </TabsContent>

        <TabsContent value="erp">
          <ERPConnectionsView onUpdate={fetchStatistics} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Statistics Card
const StatCard = ({ title, value, max, color = 'blue', icon }) => {
  const colors = {
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/30'
  };

  return (
    <Card className={`bg-slate-800 border-slate-700 ${colors[color]}`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {max && (
              <p className="text-xs text-gray-500 mt-1">of {max} max</p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${colors[color]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Entity Hierarchy View (Tree)
const EntityHierarchyView = ({ onUpdate }) => {
  const { authAxios } = useAuth();
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedNodes, setExpandedNodes] = useState(new Set());

  const fetchHierarchy = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/entity-tree/hierarchy');
      setHierarchy(res.data);
      // Auto-expand root nodes
      const rootIds = res.data.tree.map(n => n.id);
      setExpandedNodes(new Set(rootIds));
    } catch (e) {
      console.error('Error fetching hierarchy:', e);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchHierarchy();
  }, [fetchHierarchy]);

  const toggleNode = (nodeId) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderTreeNode = (node, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} className="select-none">
        <div 
          className={`flex items-center py-2 px-3 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors ${depth > 0 ? 'ml-' + (depth * 6) : ''}`}
          style={{ marginLeft: depth * 24 }}
          onClick={() => hasChildren && toggleNode(node.id)}
        >
          {/* Expand/Collapse */}
          <div className="w-6 flex-shrink-0">
            {hasChildren ? (
              isExpanded ? 
                <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                <ChevronRight className="w-4 h-4 text-gray-400" />
            ) : <div className="w-4" />}
          </div>

          {/* Entity Type Badge */}
          <Badge className={`mr-3 ${
            node.entity_type === 'holdco' ? 'bg-purple-500/20 text-purple-400' :
            node.entity_type === 'subsidiary' ? 'bg-blue-500/20 text-blue-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {node.entity_type === 'holdco' ? 'HC' : node.entity_type === 'subsidiary' ? 'SUB' : 'SA'}
          </Badge>

          {/* Entity Info */}
          <div className="flex-1">
            <div className="flex items-center">
              <span className="text-white font-medium">{node.name}</span>
              <span className="text-gray-500 text-sm ml-2">({node.entity_code})</span>
            </div>
            <div className="flex items-center space-x-3 text-xs text-gray-400 mt-0.5">
              <span>{node.country}</span>
              <span>•</span>
              <span>{node.local_currency}</span>
              {node.segment && (
                <>
                  <span>•</span>
                  <span>{node.segment}</span>
                </>
              )}
            </div>
          </div>

          {/* Data Health */}
          <div className="flex items-center space-x-3 mr-4">
            <DataHealthBadge health={node.data_health_pct} />
          </div>

          {/* ERP Status */}
          <div className="flex items-center">
            {node.erp_connection_status === 'connected' ? (
              <Badge className="bg-green-500/20 text-green-400">
                <CheckCircle className="w-3 h-3 mr-1" /> {node.erp_provider}
              </Badge>
            ) : node.erp_provider ? (
              <Badge className="bg-yellow-500/20 text-yellow-400">
                <AlertTriangle className="w-3 h-3 mr-1" /> {node.erp_provider}
              </Badge>
            ) : (
              <Badge className="bg-gray-500/20 text-gray-400">
                <Unlink className="w-3 h-3 mr-1" /> No ERP
              </Badge>
            )}
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </CardContent>
      </Card>
    );
  }

  if (!hierarchy || hierarchy.tree.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-16 text-center">
          <FolderTree className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Entities Yet</h3>
          <p className="text-gray-400 mb-4">Create your first entity to build the hierarchy</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Entity Hierarchy</CardTitle>
            <CardDescription className="text-gray-400">
              {hierarchy.summary.total_entities} entities • {hierarchy.summary.holdcos} holdcos • {hierarchy.summary.subsidiaries} subsidiaries
            </CardDescription>
          </div>
          <Button variant="outline" className="border-slate-600 text-white" onClick={fetchHierarchy}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          {hierarchy.tree.map(node => renderTreeNode(node))}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

// Entity List View
const EntityListView = ({ onUpdate }) => {
  const { authAxios } = useAuth();
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const fetchEntities = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/entity-tree/nodes');
      setEntities(res.data);
    } catch (e) {
      console.error('Error fetching entities:', e);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchEntities();
  }, [fetchEntities]);

  const filteredEntities = entities.filter(e => {
    const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          e.entity_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || e.entity_type === filterType;
    return matchesSearch && matchesType;
  });

  const deleteEntity = async (entityId) => {
    if (!window.confirm('Are you sure you want to delete this entity?')) return;
    try {
      await authAxios.delete(`/entity-tree/nodes/${entityId}`);
      toast.success('Entity deleted');
      fetchEntities();
      onUpdate?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete entity');
    }
  };

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">All Entities</CardTitle>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search entities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-600 text-white w-64"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-40 bg-slate-900 border-slate-600 text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-white">All Types</SelectItem>
                <SelectItem value="holdco" className="text-white">Holdcos</SelectItem>
                <SelectItem value="subsidiary" className="text-white">Subsidiaries</SelectItem>
                <SelectItem value="standalone" className="text-white">Standalone</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-gray-400">Entity Code</TableHead>
                <TableHead className="text-gray-400">Name</TableHead>
                <TableHead className="text-gray-400">Type</TableHead>
                <TableHead className="text-gray-400">Country</TableHead>
                <TableHead className="text-gray-400">Currency</TableHead>
                <TableHead className="text-gray-400">Region</TableHead>
                <TableHead className="text-gray-400">Data Health</TableHead>
                <TableHead className="text-gray-400">ERP</TableHead>
                <TableHead className="text-gray-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntities.map((entity) => (
                <TableRow key={entity.id} className="border-slate-700">
                  <TableCell className="text-white font-mono">{entity.entity_code}</TableCell>
                  <TableCell className="text-white font-medium">{entity.name}</TableCell>
                  <TableCell>
                    <Badge className={
                      entity.entity_type === 'holdco' ? 'bg-purple-500/20 text-purple-400' :
                      entity.entity_type === 'subsidiary' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }>
                      {entity.entity_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300">{entity.country}</TableCell>
                  <TableCell className="text-gray-300">{entity.local_currency}</TableCell>
                  <TableCell className="text-gray-300">{entity.region || '-'}</TableCell>
                  <TableCell>
                    <DataHealthBadge health={entity.data_health_pct} />
                  </TableCell>
                  <TableCell>
                    {entity.erp_provider ? (
                      <Badge className={
                        entity.erp_connection_status === 'connected' 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-yellow-500/20 text-yellow-400'
                      }>
                        {entity.erp_provider}
                      </Badge>
                    ) : (
                      <span className="text-gray-500">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-400 hover:text-red-300"
                        onClick={() => deleteEntity(entity.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

// ERP Connections View
const ERPConnectionsView = ({ onUpdate }) => {
  const { authAxios } = useAuth();
  const [providers, setProviders] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [providersRes, connectionsRes] = await Promise.all([
        authAxios.get('/erp/providers'),
        authAxios.get('/erp/connections')
      ]);
      setProviders(providersRes.data.providers);
      setConnections(connectionsRes.data);
    } catch (e) {
      console.error('Error fetching ERP data:', e);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const testConnection = async (connectionId) => {
    try {
      const res = await authAxios.post(`/erp/connections/${connectionId}/test`);
      if (res.data.success) {
        toast.success('Connection successful!');
      } else {
        toast.error(res.data.message);
      }
      fetchData();
      onUpdate?.();
    } catch (e) {
      toast.error('Connection test failed');
    }
  };

  const syncData = async (connectionId) => {
    try {
      await authAxios.post(`/erp/connections/${connectionId}/sync`);
      toast.success('Data synced successfully!');
      fetchData();
      onUpdate?.();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Sync failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Supported Providers */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Supported ERP Providers</CardTitle>
          <CardDescription className="text-gray-400">Connect to your accounting systems</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {providers.map((provider) => (
              <div 
                key={provider.value}
                className="p-4 bg-slate-900 rounded-lg border border-slate-700 hover:border-blue-500/50 transition-colors"
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

      {/* Active Connections */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Active Connections</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No ERP connections yet. Create an entity and set up its ERP connection.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-gray-400">Entity</TableHead>
                  <TableHead className="text-gray-400">Provider</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Last Sync</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {connections.map((conn) => (
                  <TableRow key={conn.id} className="border-slate-700">
                    <TableCell className="text-white">{conn.entity_id}</TableCell>
                    <TableCell className="text-gray-300">{conn.provider}</TableCell>
                    <TableCell>
                      <Badge className={
                        conn.status === 'connected' ? 'bg-green-500/20 text-green-400' :
                        conn.status === 'error' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }>
                        {conn.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {conn.last_sync_at ? new Date(conn.last_sync_at).toLocaleString() : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-slate-600 text-white"
                          onClick={() => testConnection(conn.id)}
                        >
                          Test
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-slate-600 text-white"
                          onClick={() => syncData(conn.id)}
                          disabled={conn.status !== 'connected'}
                        >
                          <RefreshCcw className="w-4 h-4 mr-1" /> Sync
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Data Health Badge Component
const DataHealthBadge = ({ health }) => {
  if (health >= 100) {
    return (
      <Badge className="bg-green-500/20 text-green-400">
        <CheckCircle className="w-3 h-3 mr-1" /> 100%
      </Badge>
    );
  }
  if (health >= 50) {
    return (
      <Badge className="bg-yellow-500/20 text-yellow-400">
        <AlertTriangle className="w-3 h-3 mr-1" /> {health}%
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/20 text-red-400">
      <XCircle className="w-3 h-3 mr-1" /> {health}%
    </Badge>
  );
};

// Create Entity Dialog
const CreateEntityDialog = ({ onCreated }) => {
  const { authAxios } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parentEntities, setParentEntities] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    entity_code: '',
    entity_type: 'subsidiary',
    parent_entity_id: '',
    ownership_pct: 100,
    country: 'United Kingdom',
    country_code: 'GBR',
    local_currency: 'GBP',
    reporting_currency: 'USD',
    segment: '',
    region: 'EMEA',
    erp_provider: ''
  });

  useEffect(() => {
    if (open) {
      fetchParentEntities();
    }
  }, [open]);

  const fetchParentEntities = async () => {
    try {
      const res = await authAxios.get('/entity-tree/nodes?entity_type=holdco');
      setParentEntities(res.data);
    } catch (e) {
      console.error('Error fetching parent entities:', e);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.entity_code) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      setLoading(true);
      const submitData = { ...formData };
      if (!submitData.parent_entity_id) delete submitData.parent_entity_id;
      if (!submitData.erp_provider) delete submitData.erp_provider;
      
      await authAxios.post('/entity-tree/nodes', submitData);
      toast.success('Entity created successfully!');
      setOpen(false);
      onCreated?.();
      setFormData({
        name: '',
        entity_code: '',
        entity_type: 'subsidiary',
        parent_entity_id: '',
        ownership_pct: 100,
        country: 'United Kingdom',
        country_code: 'GBR',
        local_currency: 'GBP',
        reporting_currency: 'USD',
        segment: '',
        region: 'EMEA',
        erp_provider: ''
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create entity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-entity-btn">
          <Plus className="w-4 h-4 mr-2" /> Add Entity
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Create New Entity</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-4">
          {/* Name */}
          <div>
            <Label className="text-gray-300">Entity Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-slate-900 border-slate-600 text-white"
              placeholder="e.g., Digitrans UK Ltd"
            />
          </div>
          
          {/* Entity Code */}
          <div>
            <Label className="text-gray-300">Entity Code *</Label>
            <Input
              value={formData.entity_code}
              onChange={(e) => setFormData({ ...formData, entity_code: e.target.value })}
              className="bg-slate-900 border-slate-600 text-white"
              placeholder="e.g., DG-UK-001"
            />
          </div>

          {/* Entity Type */}
          <div>
            <Label className="text-gray-300">Entity Type</Label>
            <Select
              value={formData.entity_type}
              onValueChange={(v) => setFormData({ ...formData, entity_type: v })}
            >
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="holdco" className="text-white">Holding Company</SelectItem>
                <SelectItem value="subsidiary" className="text-white">Subsidiary</SelectItem>
                <SelectItem value="standalone" className="text-white">Standalone</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Parent Entity */}
          <div>
            <Label className="text-gray-300">Parent Entity</Label>
            <Select
              value={formData.parent_entity_id}
              onValueChange={(v) => setFormData({ ...formData, parent_entity_id: v })}
            >
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                <SelectValue placeholder="Select parent..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="__none__" className="text-white">No Parent (Root)</SelectItem>
                {parentEntities.map(p => (
                  <SelectItem key={p.id} value={p.id} className="text-white">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Country */}
          <div>
            <Label className="text-gray-300">Country</Label>
            <Select
              value={formData.country}
              onValueChange={(v) => setFormData({ ...formData, country: v })}
            >
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="United Kingdom" className="text-white">United Kingdom</SelectItem>
                <SelectItem value="United States" className="text-white">United States</SelectItem>
                <SelectItem value="Germany" className="text-white">Germany</SelectItem>
                <SelectItem value="France" className="text-white">France</SelectItem>
                <SelectItem value="Japan" className="text-white">Japan</SelectItem>
                <SelectItem value="Australia" className="text-white">Australia</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Local Currency */}
          <div>
            <Label className="text-gray-300">Local Currency</Label>
            <Select
              value={formData.local_currency}
              onValueChange={(v) => setFormData({ ...formData, local_currency: v })}
            >
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="GBP" className="text-white">GBP - British Pound</SelectItem>
                <SelectItem value="USD" className="text-white">USD - US Dollar</SelectItem>
                <SelectItem value="EUR" className="text-white">EUR - Euro</SelectItem>
                <SelectItem value="JPY" className="text-white">JPY - Japanese Yen</SelectItem>
                <SelectItem value="AUD" className="text-white">AUD - Australian Dollar</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Region */}
          <div>
            <Label className="text-gray-300">Region</Label>
            <Select
              value={formData.region}
              onValueChange={(v) => setFormData({ ...formData, region: v })}
            >
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="EMEA" className="text-white">EMEA</SelectItem>
                <SelectItem value="Americas" className="text-white">Americas</SelectItem>
                <SelectItem value="APAC" className="text-white">APAC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Segment */}
          <div>
            <Label className="text-gray-300">Business Segment</Label>
            <Input
              value={formData.segment}
              onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
              className="bg-slate-900 border-slate-600 text-white"
              placeholder="e.g., Retail, Technology"
            />
          </div>

          {/* Ownership % */}
          <div>
            <Label className="text-gray-300">Ownership %</Label>
            <Input
              type="number"
              value={formData.ownership_pct}
              onChange={(e) => setFormData({ ...formData, ownership_pct: parseFloat(e.target.value) || 100 })}
              className="bg-slate-900 border-slate-600 text-white"
              min="0"
              max="100"
            />
          </div>

          {/* ERP Provider */}
          <div>
            <Label className="text-gray-300">ERP Provider</Label>
            <Select
              value={formData.erp_provider}
              onValueChange={(v) => setFormData({ ...formData, erp_provider: v })}
            >
              <SelectTrigger className="bg-slate-900 border-slate-600 text-white">
                <SelectValue placeholder="Select ERP..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="__none__" className="text-white">None / Manual</SelectItem>
                <SelectItem value="sage" className="text-white">Sage</SelectItem>
                <SelectItem value="netsuite" className="text-white">NetSuite</SelectItem>
                <SelectItem value="quickbooks" className="text-white">QuickBooks</SelectItem>
                <SelectItem value="xero" className="text-white">Xero</SelectItem>
                <SelectItem value="excel" className="text-white">Excel Import</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-600 text-white">
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            {loading ? 'Creating...' : 'Create Entity'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EntityTreeManager;
