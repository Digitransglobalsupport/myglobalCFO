import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';
import { toast } from 'sonner';
import {
  Shield, AlertTriangle, CheckCircle, XCircle, Activity, RefreshCcw,
  Settings, Bell, Filter, Search, TrendingUp, Building2, FileWarning
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
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

const DataGovernancePage = () => {
  const { authAxios } = useAuth();
  const [healthOverview, setHealthOverview] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [healthRes, alertsRes] = await Promise.all([
        authAxios.get('/data-governance/health'),
        authAxios.get('/data-governance/alerts')
      ]);
      setHealthOverview(healthRes.data);
      setAlerts(alertsRes.data.alerts);
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
    <div className="space-y-6" data-testid="data-governance-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Data Governance</h1>
          <p className="text-gray-400 mt-1">Monitor data quality and mapping completeness across all entities</p>
        </div>
        <div className="flex items-center space-x-3">
          <RequiredCategoriesDialog onUpdate={fetchData} />
          <Button variant="outline" className="border-slate-600 text-white" onClick={fetchData}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {/* Health Overview Cards */}
      {healthOverview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Overall Health */}
          <Card className={`border-2 ${
            healthOverview.overall_health_pct >= 80 ? 'bg-green-500/10 border-green-500/30' :
            healthOverview.overall_health_pct >= 50 ? 'bg-yellow-500/10 border-yellow-500/30' :
            'bg-red-500/10 border-red-500/30'
          }`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Overall Data Health</p>
                  <p className={`text-4xl font-bold mt-1 ${
                    healthOverview.overall_health_pct >= 80 ? 'text-green-400' :
                    healthOverview.overall_health_pct >= 50 ? 'text-yellow-400' :
                    'text-red-400'
                  }`}>
                    {healthOverview.overall_health_pct}%
                  </p>
                  <Badge className={`mt-2 ${
                    healthOverview.status === 'complete' ? 'bg-green-500/20 text-green-400' :
                    healthOverview.status === 'partial' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-red-500/20 text-red-400'
                  }`}>
                    {healthOverview.status}
                  </Badge>
                </div>
                <div className={`p-4 rounded-full ${
                  healthOverview.overall_health_pct >= 80 ? 'bg-green-500/20' :
                  healthOverview.overall_health_pct >= 50 ? 'bg-yellow-500/20' :
                  'bg-red-500/20'
                }`}>
                  <Activity className={`w-8 h-8 ${
                    healthOverview.overall_health_pct >= 80 ? 'text-green-400' :
                    healthOverview.overall_health_pct >= 50 ? 'text-yellow-400' :
                    'text-red-400'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entity Counts */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <p className="text-gray-400 text-sm mb-4">Entity Status</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                    <span className="text-gray-300">Complete</span>
                  </div>
                  <span className="text-white font-semibold">{healthOverview.entities_complete}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="w-4 h-4 text-yellow-400 mr-2" />
                    <span className="text-gray-300">Partial</span>
                  </div>
                  <span className="text-white font-semibold">{healthOverview.entities_partial}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <XCircle className="w-4 h-4 text-red-400 mr-2" />
                    <span className="text-gray-300">Incomplete</span>
                  </div>
                  <span className="text-white font-semibold">{healthOverview.entities_incomplete}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consolidation Status */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <p className="text-gray-400 text-sm mb-2">Consolidation Status</p>
              <div className="flex items-center space-x-3 mt-4">
                {healthOverview.can_consolidate ? (
                  <>
                    <CheckCircle className="w-8 h-8 text-green-400" />
                    <div>
                      <p className="text-white font-semibold">Ready</p>
                      <p className="text-gray-400 text-sm">Consolidation allowed</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-8 h-8 text-red-400" />
                    <div>
                      <p className="text-white font-semibold">Blocked</p>
                      <p className="text-gray-400 text-sm">Strict mode enabled</p>
                    </div>
                  </>
                )}
              </div>
              {healthOverview.strict_mode && (
                <Badge className="mt-3 bg-red-500/20 text-red-400">
                  Strict Mode ON
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Alerts Summary */}
          <Card className="bg-slate-800 border-slate-700">
            <CardContent className="pt-6">
              <p className="text-gray-400 text-sm mb-4">Active Alerts</p>
              <div className="flex items-center justify-between">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{healthOverview.alerts?.filter(a => a.severity === 'high').length || 0}</p>
                  <p className="text-gray-400 text-xs">High</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-400">{healthOverview.alerts?.filter(a => a.severity === 'medium').length || 0}</p>
                  <p className="text-gray-400 text-xs">Medium</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-400">{healthOverview.alerts?.filter(a => a.severity === 'low').length || 0}</p>
                  <p className="text-gray-400 text-xs">Low</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for Alerts and Settings */}
      <Tabs defaultValue="alerts" className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="alerts" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Bell className="w-4 h-4 mr-2" /> Alerts
          </TabsTrigger>
          <TabsTrigger value="entities" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <Building2 className="w-4 h-4 mr-2" /> Entity Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="alerts">
          <AlertsPanel alerts={alerts} onRefresh={fetchData} />
        </TabsContent>

        <TabsContent value="entities">
          <EntityHealthPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Alerts Panel
const AlertsPanel = ({ alerts, onRefresh }) => {
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAlerts = alerts.filter(alert => {
    const matchesSeverity = filterSeverity === 'all' || alert.severity === filterSeverity;
    const matchesSearch = alert.entity_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          alert.message?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white">Data Quality Alerts</CardTitle>
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search alerts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-900 border-slate-600 text-white w-64"
              />
            </div>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-40 bg-slate-900 border-slate-600 text-white">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="all" className="text-white">All Severities</SelectItem>
                <SelectItem value="high" className="text-white">High</SelectItem>
                <SelectItem value="medium" className="text-white">Medium</SelectItem>
                <SelectItem value="low" className="text-white">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Alerts</h3>
            <p className="text-gray-400">All entities are properly configured</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredAlerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

// Alert Card Component
const AlertCard = ({ alert }) => {
  return (
    <div className={`p-4 rounded-lg border ${
      alert.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
      alert.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
      'bg-blue-500/10 border-blue-500/30'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${
            alert.severity === 'high' ? 'bg-red-500/20' :
            alert.severity === 'medium' ? 'bg-yellow-500/20' :
            'bg-blue-500/20'
          }`}>
            {alert.alert_type === 'missing_mapping' ? (
              <FileWarning className={`w-5 h-5 ${
                alert.severity === 'high' ? 'text-red-400' :
                alert.severity === 'medium' ? 'text-yellow-400' :
                'text-blue-400'
              }`} />
            ) : (
              <AlertTriangle className={`w-5 h-5 ${
                alert.severity === 'high' ? 'text-red-400' :
                alert.severity === 'medium' ? 'text-yellow-400' :
                'text-blue-400'
              }`} />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h4 className="text-white font-medium">{alert.entity_name}</h4>
              <span className="text-gray-500 text-sm">({alert.entity_code})</span>
              {alert.is_blocking && (
                <Badge className="bg-red-500/20 text-red-400">Blocking</Badge>
              )}
            </div>
            <p className="text-gray-400 text-sm mt-1">{alert.message}</p>
            {alert.missing_categories && alert.missing_categories.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {alert.missing_categories.slice(0, 5).map((cat) => (
                  <Badge key={cat} className="bg-slate-700 text-gray-300 text-xs">
                    {cat}
                  </Badge>
                ))}
                {alert.missing_categories.length > 5 && (
                  <Badge className="bg-slate-700 text-gray-400 text-xs">
                    +{alert.missing_categories.length - 5} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
        <Badge className={
          alert.severity === 'high' ? 'bg-red-500/20 text-red-400' :
          alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
          'bg-blue-500/20 text-blue-400'
        }>
          {alert.severity}
        </Badge>
      </div>
    </div>
  );
};

// Entity Health Panel
const EntityHealthPanel = () => {
  const { authAxios } = useAuth();
  const [entities, setEntities] = useState([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Entity Data Health</CardTitle>
        <CardDescription className="text-gray-400">Individual entity mapping completeness</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-gray-400">Entity</TableHead>
                <TableHead className="text-gray-400">Type</TableHead>
                <TableHead className="text-gray-400">ERP</TableHead>
                <TableHead className="text-gray-400">Data Health</TableHead>
                <TableHead className="text-gray-400">Missing Categories</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entities.map((entity) => (
                <TableRow key={entity.id} className="border-slate-700">
                  <TableCell>
                    <div>
                      <p className="text-white font-medium">{entity.name}</p>
                      <p className="text-gray-500 text-sm">{entity.entity_code}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      entity.entity_type === 'holdco' ? 'bg-purple-500/20 text-purple-400' :
                      entity.entity_type === 'subsidiary' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-gray-500/20 text-gray-400'
                    }>
                      {entity.entity_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {entity.erp_provider || 'Manual'}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Progress value={entity.data_health_pct} className="w-20 h-2" />
                      <span className={`text-sm ${
                        entity.data_health_pct >= 100 ? 'text-green-400' :
                        entity.data_health_pct >= 50 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {entity.data_health_pct}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {entity.missing_mappings && entity.missing_mappings.length > 0 ? (
                      <span className="text-yellow-400">{entity.missing_mappings.length} missing</span>
                    ) : (
                      <span className="text-green-400">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {entity.data_health_pct >= 100 ? (
                      <Badge className="bg-green-500/20 text-green-400">
                        <CheckCircle className="w-3 h-3 mr-1" /> Complete
                      </Badge>
                    ) : entity.data_health_pct >= 50 ? (
                      <Badge className="bg-yellow-500/20 text-yellow-400">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Partial
                      </Badge>
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400">
                        <XCircle className="w-3 h-3 mr-1" /> Incomplete
                      </Badge>
                    )}
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

// Required Categories Dialog
const RequiredCategoriesDialog = ({ onUpdate }) => {
  const { authAxios } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [strictMode, setStrictMode] = useState(false);

  useEffect(() => {
    if (open) {
      fetchConfig();
    }
  }, [open]);

  const fetchConfig = async () => {
    try {
      const res = await authAxios.get('/data-governance/required-categories');
      setConfig(res.data);
      setSelectedCategories(res.data.categories || []);
      setStrictMode(res.data.is_strict_mode || false);
    } catch (e) {
      console.error('Error fetching config:', e);
    }
  };

  const saveConfig = async () => {
    try {
      setLoading(true);
      await authAxios.post('/data-governance/required-categories', {
        categories: selectedCategories,
        is_strict_mode: strictMode
      });
      toast.success('Configuration saved!');
      setOpen(false);
      onUpdate?.();
    } catch (e) {
      toast.error('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (category) => {
    setSelectedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-slate-600 text-white">
          <Settings className="w-4 h-4 mr-2" /> Configure Requirements
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white">Required Categories Configuration</DialogTitle>
        </DialogHeader>
        {config && (
          <div className="space-y-6 py-4">
            {/* Strict Mode Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-900 rounded-lg">
              <div>
                <h4 className="text-white font-medium">Strict Mode</h4>
                <p className="text-gray-400 text-sm">
                  Block consolidation if any entity is missing required categories
                </p>
              </div>
              <Switch
                checked={strictMode}
                onCheckedChange={setStrictMode}
              />
            </div>

            {/* Category Selection */}
            <div>
              <h4 className="text-white font-medium mb-3">Required Categories</h4>
              <p className="text-gray-400 text-sm mb-4">
                Select categories that must be mapped for a valid consolidation report
              </p>
              <ScrollArea className="h-[300px]">
                <div className="space-y-2">
                  {config.available_categories.map((cat) => (
                    <div
                      key={cat}
                      className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all ${
                        selectedCategories.includes(cat)
                          ? 'bg-blue-500/10 border border-blue-500/50'
                          : 'bg-slate-900 border border-slate-700 hover:border-slate-600'
                      }`}
                      onClick={() => toggleCategory(cat)}
                    >
                      <Checkbox
                        checked={selectedCategories.includes(cat)}
                        onCheckedChange={() => toggleCategory(cat)}
                      />
                      <span className="text-white">{cat}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} className="border-slate-600 text-white">
            Cancel
          </Button>
          <Button onClick={saveConfig} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            {loading ? 'Saving...' : 'Save Configuration'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DataGovernancePage;
