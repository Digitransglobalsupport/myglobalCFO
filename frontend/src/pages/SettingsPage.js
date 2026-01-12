import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, useApp } from '../App';
import { useCurrency } from '../context/CurrencyContext';
import { toast } from 'sonner';
import {
  Settings, Palette, BarChart3, Layout, Building2, Users, Bot,
  Plus, Trash2, Save, RefreshCcw, Check, Search, ChevronDown,
  Gauge, Sliders, FileText, AlertTriangle, CheckCircle, Edit2, Info, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CustomRatiosManager } from '../components/CustomRatioBuilder';
import { DashboardLayoutManager } from '../components/DashboardLayoutManager';

const SettingsPage = () => {
  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Settings</h1>
        <p className="text-gray-400 mt-1">Configure your MyGlobalCFO experience</p>
      </div>

      <Tabs defaultValue="layouts" className="space-y-6">
        <TabsList className="bg-navy-800 border-navy-700 flex-wrap">
          <TabsTrigger value="layouts" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Layout className="w-4 h-4 mr-2" /> Dashboard Layouts
          </TabsTrigger>
          <TabsTrigger value="custom-ratios" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Sparkles className="w-4 h-4 mr-2" /> Custom Ratios
          </TabsTrigger>
          <TabsTrigger value="rag-policies" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Gauge className="w-4 h-4 mr-2" /> RAG Policies
          </TabsTrigger>
          <TabsTrigger value="entity-adjustments" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Sliders className="w-4 h-4 mr-2" /> Entity Adjustments
          </TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Palette className="w-4 h-4 mr-2" /> Appearance
          </TabsTrigger>
          <TabsTrigger value="kpis" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <BarChart3 className="w-4 h-4 mr-2" /> KPI Config
          </TabsTrigger>
          <TabsTrigger value="groups" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Users className="w-4 h-4 mr-2" /> Entity Groups
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Bot className="w-4 h-4 mr-2" /> AI Advisor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layouts">
          <DashboardLayoutManager />
        </TabsContent>

        <TabsContent value="custom-ratios">
          <CustomRatiosManager />
        </TabsContent>

        <TabsContent value="rag-policies">
          <RAGPolicySettings />
        </TabsContent>

        <TabsContent value="entity-adjustments">
          <EntityAdjustmentSettings />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>

        <TabsContent value="kpis">
          <KPISettings />
        </TabsContent>

        <TabsContent value="groups">
          <EntityGroupSettings />
        </TabsContent>

        <TabsContent value="ai">
          <AIAdvisorSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Appearance Settings
const AppearanceSettings = () => {
  const { authAxios } = useAuth();
  const { preferences, fetchPreferences } = useApp();
  const [colors, setColors] = useState({
    primary_color: '#1e3a5f',
    secondary_color: '#d4af37',
    background_color: '#0a1929',
    text_color: '#ffffff'
  });

  useEffect(() => {
    if (preferences) {
      setColors({
        primary_color: preferences.primary_color || '#1e3a5f',
        secondary_color: preferences.secondary_color || '#d4af37',
        background_color: preferences.background_color || '#0a1929',
        text_color: preferences.text_color || '#ffffff'
      });
    }
  }, [preferences]);

  const saveColors = async () => {
    try {
      await authAxios.put('/preferences', colors);
      toast.success('Appearance settings saved!');
      fetchPreferences();
    } catch (e) {
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Appearance</h2>
        <p className="text-gray-400">Customize your dashboard colors</p>
      </div>

      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white">Color Customization</CardTitle>
          <CardDescription className="text-gray-400">Changes apply to your account only</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <ColorPicker
              label="Primary Color"
              value={colors.primary_color}
              onChange={(v) => setColors({ ...colors, primary_color: v })}
            />
            <ColorPicker
              label="Secondary Color"
              value={colors.secondary_color}
              onChange={(v) => setColors({ ...colors, secondary_color: v })}
            />
            <ColorPicker
              label="Background Color"
              value={colors.background_color}
              onChange={(v) => setColors({ ...colors, background_color: v })}
            />
            <ColorPicker
              label="Text Color"
              value={colors.text_color}
              onChange={(v) => setColors({ ...colors, text_color: v })}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveColors} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ColorPicker = ({ label, value, onChange }) => (
  <div>
    <Label className="text-gray-300">{label}</Label>
    <div className="flex items-center space-x-3 mt-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-10 rounded cursor-pointer border-0"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-navy-900 border-navy-600 text-white w-32"
      />
    </div>
  </div>
);

// KPI Settings
const KPISettings = () => {
  const { authAxios } = useAuth();
  const { preferences, fetchPreferences } = useApp();
  const [enabledKPIs, setEnabledKPIs] = useState(['revenue', 'ebitda', 'cash_balance', 'runway']);

  const allKPIs = [
    { id: 'revenue', label: 'Total Revenue' },
    { id: 'ebitda', label: 'EBITDA' },
    { id: 'ebitda_margin', label: 'EBITDA Margin' },
    { id: 'cash_balance', label: 'Cash Balance' },
    { id: 'runway', label: 'Runway (Days)' },
    { id: 'burn_rate', label: 'Burn Rate' },
    { id: 'quick_ratio', label: 'Quick Ratio' },
    { id: 'revenue_growth', label: 'Revenue Growth' }
  ];

  useEffect(() => {
    if (preferences?.enabled_kpis) {
      setEnabledKPIs(preferences.enabled_kpis);
    }
  }, [preferences]);

  const toggleKPI = (kpiId) => {
    setEnabledKPIs(prev =>
      prev.includes(kpiId)
        ? prev.filter(k => k !== kpiId)
        : [...prev, kpiId]
    );
  };

  const saveKPIs = async () => {
    try {
      await authAxios.put('/preferences', { enabled_kpis: enabledKPIs });
      toast.success('KPI settings saved!');
      fetchPreferences();
    } catch (e) {
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">KPI Configuration</h2>
        <p className="text-gray-400">Choose which KPIs to display on your dashboard</p>
      </div>

      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {allKPIs.map((kpi) => (
              <div key={kpi.id} className="flex items-center justify-between p-3 bg-navy-900 rounded-lg">
                <span className="text-white">{kpi.label}</span>
                <Switch
                  checked={enabledKPIs.includes(kpi.id)}
                  onCheckedChange={() => toggleKPI(kpi.id)}
                  className="data-[state=checked]:bg-gold-500"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={saveKPIs} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Entity Group Settings
const EntityGroupSettings = () => {
  const { authAxios } = useAuth();
  const { companies } = useApp();
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    entity_ids: []
  });

  const fetchGroups = async () => {
    try {
      const res = await authAxios.get('/entity-groups');
      setGroups(res.data);
    } catch (e) {
      console.error('Error fetching groups:', e);
    }
  };

  const createGroup = async () => {
    try {
      await authAxios.post('/entity-groups', newGroup);
      toast.success('Group created!');
      setShowCreate(false);
      setNewGroup({ name: '', description: '', entity_ids: [] });
      fetchGroups();
    } catch (e) {
      toast.error('Failed to create group');
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      await authAxios.delete(`/entity-groups/${groupId}`);
      toast.success('Group deleted');
      fetchGroups();
    } catch (e) {
      toast.error('Failed to delete group');
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Entity Groups</h2>
          <p className="text-gray-400">Create custom groupings of your entities</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900">
              <Plus className="w-4 h-4 mr-2" /> Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-navy-800 border-navy-700">
            <DialogHeader>
              <DialogTitle className="text-white">Create Entity Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Group Name</Label>
                <Input
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white"
                  placeholder="e.g., EMEA Region"
                />
              </div>
              <div>
                <Label className="text-gray-300">Description</Label>
                <Input
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <Label className="text-gray-300">Select Entities</Label>
                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                  {companies.map((company) => (
                    <label key={company.id} className="flex items-center space-x-2 p-2 bg-navy-900 rounded cursor-pointer hover:bg-navy-700">
                      <input
                        type="checkbox"
                        checked={newGroup.entity_ids.includes(company.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewGroup({ ...newGroup, entity_ids: [...newGroup.entity_ids, company.id] });
                          } else {
                            setNewGroup({ ...newGroup, entity_ids: newGroup.entity_ids.filter(id => id !== company.id) });
                          }
                        }}
                        className="rounded border-navy-600"
                      />
                      <span className="text-white">{company.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-navy-600 text-white">
                Cancel
              </Button>
              <Button onClick={createGroup} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
                Create Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {groups.length === 0 ? (
          <Card className="bg-navy-800 border-navy-700">
            <CardContent className="py-16 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Groups Yet</h3>
              <p className="text-gray-400">Create groups to organize your entities</p>
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.id} className="bg-navy-800 border-navy-700">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{group.name}</h3>
                    <p className="text-sm text-gray-400">
                      {group.description || `${group.entity_ids.length} entities`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => deleteGroup(group.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

// AI Advisor Settings
const AIAdvisorSettings = () => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="py-16 text-center">
          <Bot className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Admin Access Required</h3>
          <p className="text-gray-400">Only administrators can manage AI Advisor settings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">AI Advisor Settings</h2>
        <p className="text-gray-400">Configure AI Advisor access for your organization</p>
      </div>

      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white">Global Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-navy-900 rounded-lg">
            <div>
              <p className="text-white font-medium">Enable AI Advisor</p>
              <p className="text-sm text-gray-400">Allow users to access AI financial advisor</p>
            </div>
            <Switch defaultChecked className="data-[state=checked]:bg-gold-500" />
          </div>
          <div className="flex items-center justify-between p-3 bg-navy-900 rounded-lg">
            <div>
              <p className="text-white font-medium">Voice Input</p>
              <p className="text-sm text-gray-400">Enable speech recognition for queries</p>
            </div>
            <Switch defaultChecked className="data-[state=checked]:bg-gold-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ======================= RAG POLICY SETTINGS =======================
const RAGPolicySettings = () => {
  const { authAxios } = useAuth();
  const { companies, selectedCompany } = useApp();
  const [defaultMetrics, setDefaultMetrics] = useState({});
  const [companyPolicy, setCompanyPolicy] = useState(null);
  const [editedMetrics, setEditedMetrics] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState(selectedCompany?.id || '');

  useEffect(() => {
    fetchDefaults();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchCompanyPolicy(selectedCompanyId);
    }
  }, [selectedCompanyId]);

  const fetchDefaults = async () => {
    try {
      const res = await authAxios.get('/rag-policies/defaults');
      setDefaultMetrics(res.data.defaults);
    } catch (e) {
      console.error('Error fetching defaults:', e);
    }
  };

  const fetchCompanyPolicy = async (companyId) => {
    try {
      setLoading(true);
      const res = await authAxios.get(`/rag-policies/${companyId}`);
      setCompanyPolicy(res.data);
      setEditedMetrics(res.data.metrics || {});
    } catch (e) {
      console.error('Error fetching policy:', e);
    } finally {
      setLoading(false);
    }
  };

  const updateThreshold = (metricId, field, value) => {
    setEditedMetrics(prev => ({
      ...prev,
      [metricId]: {
        ...defaultMetrics[metricId],
        ...(prev[metricId] || {}),
        thresholds: {
          ...(defaultMetrics[metricId]?.thresholds || {}),
          ...(prev[metricId]?.thresholds || {}),
          [field]: value === '' ? null : parseFloat(value)
        }
      }
    }));
  };

  const savePolicy = async () => {
    if (!selectedCompanyId) {
      toast.error('Please select a company');
      return;
    }
    try {
      setSaving(true);
      await authAxios.put(`/rag-policies/${selectedCompanyId}`, {
        metrics: editedMetrics
      });
      toast.success('RAG policy saved successfully!');
      fetchCompanyPolicy(selectedCompanyId);
    } catch (e) {
      toast.error('Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = async () => {
    if (!selectedCompanyId) return;
    try {
      await authAxios.delete(`/rag-policies/${selectedCompanyId}`);
      toast.success('Reset to default thresholds');
      setEditedMetrics({});
      fetchCompanyPolicy(selectedCompanyId);
    } catch (e) {
      // Policy might not exist, that's okay
      setEditedMetrics({});
    }
  };

  const getRAGIndicator = (metricId) => {
    const metric = editedMetrics[metricId] || defaultMetrics[metricId];
    if (!metric) return null;
    const t = metric.thresholds || {};
    return (
      <div className="flex items-center space-x-1">
        <div className="w-3 h-3 rounded-full bg-green-500" title={`Green: ${t.is_higher_better ? `≥ ${t.green_min}` : `≤ ${t.green_max}`}`}></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500" title={`Amber: ${t.is_higher_better ? `≥ ${t.amber_min}` : `≤ ${t.amber_max}`}`}></div>
        <div className="w-3 h-3 rounded-full bg-red-500" title="Red: Below thresholds"></div>
      </div>
    );
  };

  return (
    <div className="space-y-6" data-testid="rag-policy-settings">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">RAG Status Policies</h2>
          <p className="text-gray-400">Define custom Red/Amber/Green thresholds for financial metrics</p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-900/20 border-blue-500/30">
        <CardContent className="py-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-blue-100 font-medium">Customize Alert Thresholds</p>
              <p className="text-blue-200/70 text-sm">
                Set company-specific thresholds that align with your accounting policies. 
                For example, set DSO amber at 75 days instead of the default 45 days.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Selector */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white">Select Company</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedCompanyId} onValueChange={setSelectedCompanyId}>
            <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
              <SelectValue placeholder="Select a company to configure" />
            </SelectTrigger>
            <SelectContent className="bg-navy-800 border-navy-600">
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedCompanyId && !loading && (
        <>
          {/* Policy Status */}
          <div className="flex items-center justify-between">
            <Badge className={companyPolicy?.is_default ? 'bg-gray-500/20 text-gray-400' : 'bg-gold-500/20 text-gold-400'}>
              {companyPolicy?.is_default ? 'Using Default Thresholds' : 'Custom Thresholds Active'}
            </Badge>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={resetToDefaults} className="border-navy-600 text-white">
                <RefreshCcw className="w-4 h-4 mr-2" /> Reset to Defaults
              </Button>
              <Button onClick={savePolicy} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
                <Save className="w-4 h-4 mr-2" /> {saving ? 'Saving...' : 'Save Policy'}
              </Button>
            </div>
          </div>

          {/* Metrics Configuration */}
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader>
              <CardTitle className="text-white">Metric Thresholds</CardTitle>
              <CardDescription className="text-gray-400">
                Configure when each metric shows Green (healthy), Amber (caution), or Red (concern)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(defaultMetrics).map(([metricId, defaultConfig]) => {
                  const currentConfig = editedMetrics[metricId] || defaultConfig;
                  const t = currentConfig.thresholds || {};
                  const isHigherBetter = t.is_higher_better !== false;

                  return (
                    <div key={metricId} className="p-4 bg-navy-900 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-white font-medium">{defaultConfig.metric_name}</span>
                          {getRAGIndicator(metricId)}
                        </div>
                        <Badge className="bg-navy-700 text-gray-400 text-xs">
                          {isHigherBetter ? 'Higher is Better' : 'Lower is Better'}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {isHigherBetter ? (
                          <>
                            <div>
                              <Label className="text-gray-400 text-xs">Green Minimum</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={t.green_min ?? ''}
                                onChange={(e) => updateThreshold(metricId, 'green_min', e.target.value)}
                                className="bg-navy-800 border-navy-600 text-white h-9"
                                placeholder={defaultConfig.thresholds?.green_min}
                              />
                            </div>
                            <div>
                              <Label className="text-gray-400 text-xs">Amber Minimum</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={t.amber_min ?? ''}
                                onChange={(e) => updateThreshold(metricId, 'amber_min', e.target.value)}
                                className="bg-navy-800 border-navy-600 text-white h-9"
                                placeholder={defaultConfig.thresholds?.amber_min}
                              />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <Label className="text-gray-400 text-xs">Green Maximum</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={t.green_max ?? ''}
                                onChange={(e) => updateThreshold(metricId, 'green_max', e.target.value)}
                                className="bg-navy-800 border-navy-600 text-white h-9"
                                placeholder={defaultConfig.thresholds?.green_max}
                              />
                            </div>
                            <div>
                              <Label className="text-gray-400 text-xs">Amber Maximum</Label>
                              <Input
                                type="number"
                                step="0.1"
                                value={t.amber_max ?? ''}
                                onChange={(e) => updateThreshold(metricId, 'amber_max', e.target.value)}
                                className="bg-navy-800 border-navy-600 text-white h-9"
                                placeholder={defaultConfig.thresholds?.amber_max}
                              />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {loading && selectedCompanyId && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      )}
    </div>
  );
};

// ======================= ENTITY ADJUSTMENT SETTINGS =======================
const EntityAdjustmentSettings = () => {
  const { authAxios } = useAuth();
  const { companies, selectedCompany } = useApp();
  const [adjustments, setAdjustments] = useState([]);
  const [adjustmentTypes, setAdjustmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedAdjustment, setSelectedAdjustment] = useState(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState(selectedCompany?.id || '');

  const [newAdjustment, setNewAdjustment] = useState({
    company_id: '',
    adjustment_type: 'custom',
    name: '',
    description: '',
    parameters: {}
  });

  useEffect(() => {
    fetchAdjustmentTypes();
  }, []);

  useEffect(() => {
    if (selectedCompanyId) {
      fetchAdjustments();
    }
  }, [selectedCompanyId]);

  const fetchAdjustmentTypes = async () => {
    try {
      const res = await authAxios.get('/entity-adjustments/types');
      setAdjustmentTypes(res.data.types);
    } catch (e) {
      console.error('Error fetching types:', e);
    }
  };

  const fetchAdjustments = async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/entity-adjustments', {
        params: { company_id: selectedCompanyId }
      });
      setAdjustments(res.data);
    } catch (e) {
      console.error('Error fetching adjustments:', e);
    } finally {
      setLoading(false);
    }
  };

  const createAdjustment = async () => {
    if (!newAdjustment.company_id || !newAdjustment.name) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await authAxios.post('/entity-adjustments', newAdjustment);
      toast.success('Entity adjustment created!');
      setShowCreate(false);
      setNewAdjustment({
        company_id: selectedCompanyId,
        adjustment_type: 'custom',
        name: '',
        description: '',
        parameters: {}
      });
      fetchAdjustments();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create adjustment');
    }
  };

  const updateAdjustment = async () => {
    if (!selectedAdjustment) return;
    try {
      await authAxios.put(`/entity-adjustments/${selectedAdjustment.id}`, {
        name: selectedAdjustment.name,
        description: selectedAdjustment.description,
        parameters: selectedAdjustment.parameters,
        is_active: selectedAdjustment.is_active
      });
      toast.success('Adjustment updated!');
      setShowEdit(false);
      setSelectedAdjustment(null);
      fetchAdjustments();
    } catch (e) {
      toast.error('Failed to update adjustment');
    }
  };

  const deleteAdjustment = async (adjustmentId) => {
    try {
      await authAxios.delete(`/entity-adjustments/${adjustmentId}`);
      toast.success('Adjustment deleted');
      fetchAdjustments();
    } catch (e) {
      toast.error('Failed to delete adjustment');
    }
  };

  const toggleActive = async (adjustment) => {
    try {
      await authAxios.put(`/entity-adjustments/${adjustment.id}`, {
        is_active: !adjustment.is_active
      });
      fetchAdjustments();
    } catch (e) {
      toast.error('Failed to update');
    }
  };

  const getTypeInfo = (typeValue) => {
    return adjustmentTypes.find(t => t.value === typeValue) || {};
  };

  const getTypeBadgeColor = (type) => {
    const colors = {
      currency_translation: 'bg-blue-500/20 text-blue-400',
      revenue_recognition: 'bg-green-500/20 text-green-400',
      depreciation: 'bg-purple-500/20 text-purple-400',
      inventory_valuation: 'bg-orange-500/20 text-orange-400',
      consolidation: 'bg-pink-500/20 text-pink-400',
      intercompany: 'bg-cyan-500/20 text-cyan-400',
      tax_treatment: 'bg-red-500/20 text-red-400',
      custom: 'bg-gray-500/20 text-gray-400'
    };
    return colors[type] || colors.custom;
  };

  return (
    <div className="space-y-6" data-testid="entity-adjustment-settings">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Bespoke Entity Adjustments</h2>
          <p className="text-gray-400">Configure accounting logic and presentation for each entity</p>
        </div>
      </div>

      {/* Info Banner */}
      <Card className="bg-purple-900/20 border-purple-500/30">
        <CardContent className="py-4">
          <div className="flex items-start space-x-3">
            <Sliders className="w-5 h-5 text-purple-400 mt-0.5" />
            <div>
              <p className="text-purple-100 font-medium">Entity-Specific Adjustments</p>
              <p className="text-purple-200/70 text-sm">
                Define adjustments to ensure aggregated data reflects a &quot;true and fair view&quot; 
                despite differing local regulations or accounting methods across entities.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Company Selector */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader className="pb-2">
          <CardTitle className="text-white">Select Company</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center space-x-4">
          <Select 
            value={selectedCompanyId} 
            onValueChange={(v) => {
              setSelectedCompanyId(v);
              setNewAdjustment(prev => ({ ...prev, company_id: v }));
            }}
          >
            <SelectTrigger className="bg-navy-900 border-navy-600 text-white flex-1">
              <SelectValue placeholder="Select a company" />
            </SelectTrigger>
            <SelectContent className="bg-navy-800 border-navy-600">
              {companies.map(c => (
                <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedCompanyId && (
            <Dialog open={showCreate} onOpenChange={setShowCreate}>
              <DialogTrigger asChild>
                <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900" data-testid="add-adjustment-btn">
                  <Plus className="w-4 h-4 mr-2" /> Add Adjustment
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-navy-800 border-navy-700 max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-white">Add Entity Adjustment</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-gray-300">Adjustment Type</Label>
                    <Select
                      value={newAdjustment.adjustment_type}
                      onValueChange={(v) => setNewAdjustment({ ...newAdjustment, adjustment_type: v })}
                    >
                      <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-navy-800 border-navy-600">
                        {adjustmentTypes.map(t => (
                          <SelectItem key={t.value} value={t.value} className="text-white">
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-500 mt-1">
                      {getTypeInfo(newAdjustment.adjustment_type).description}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-300">Adjustment Name</Label>
                    <Input
                      value={newAdjustment.name}
                      onChange={(e) => setNewAdjustment({ ...newAdjustment, name: e.target.value })}
                      className="bg-navy-900 border-navy-600 text-white"
                      placeholder="e.g., UK GAAP Revenue Timing"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Description</Label>
                    <Textarea
                      value={newAdjustment.description}
                      onChange={(e) => setNewAdjustment({ ...newAdjustment, description: e.target.value })}
                      className="bg-navy-900 border-navy-600 text-white"
                      placeholder="Describe what this adjustment does..."
                      rows={3}
                    />
                  </div>
                  {/* Dynamic Parameters based on type */}
                  <div>
                    <Label className="text-gray-300">Parameters (JSON)</Label>
                    <Textarea
                      value={JSON.stringify(newAdjustment.parameters, null, 2)}
                      onChange={(e) => {
                        try {
                          setNewAdjustment({ ...newAdjustment, parameters: JSON.parse(e.target.value) });
                        } catch {}
                      }}
                      className="bg-navy-900 border-navy-600 text-white font-mono text-sm"
                      placeholder={JSON.stringify(getTypeInfo(newAdjustment.adjustment_type).example_parameters || {}, null, 2)}
                      rows={4}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Example: {JSON.stringify(getTypeInfo(newAdjustment.adjustment_type).example_parameters || {})}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCreate(false)} className="border-navy-600 text-white">
                    Cancel
                  </Button>
                  <Button onClick={createAdjustment} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
                    Create
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="bg-navy-800 border-navy-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Adjustment</DialogTitle>
          </DialogHeader>
          {selectedAdjustment && (
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Name</Label>
                <Input
                  value={selectedAdjustment.name}
                  onChange={(e) => setSelectedAdjustment({ ...selectedAdjustment, name: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Description</Label>
                <Textarea
                  value={selectedAdjustment.description || ''}
                  onChange={(e) => setSelectedAdjustment({ ...selectedAdjustment, description: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white"
                  rows={3}
                />
              </div>
              <div>
                <Label className="text-gray-300">Parameters (JSON)</Label>
                <Textarea
                  value={JSON.stringify(selectedAdjustment.parameters || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      setSelectedAdjustment({ ...selectedAdjustment, parameters: JSON.parse(e.target.value) });
                    } catch {}
                  }}
                  className="bg-navy-900 border-navy-600 text-white font-mono text-sm"
                  rows={4}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Active</Label>
                <Switch
                  checked={selectedAdjustment.is_active}
                  onCheckedChange={(v) => setSelectedAdjustment({ ...selectedAdjustment, is_active: v })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)} className="border-navy-600 text-white">
              Cancel
            </Button>
            <Button onClick={updateAdjustment} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adjustments List */}
      {selectedCompanyId && (
        <Card className="bg-navy-800 border-navy-700">
          <CardHeader>
            <CardTitle className="text-white">
              Active Adjustments
              <Badge className="ml-2 bg-navy-700 text-gray-300">{adjustments.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gold-500"></div>
              </div>
            ) : adjustments.length === 0 ? (
              <div className="py-12 text-center">
                <Sliders className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Adjustments</h3>
                <p className="text-gray-400">Add entity-specific adjustments for this company</p>
              </div>
            ) : (
              <div className="space-y-3">
                {adjustments.map((adj) => (
                  <div
                    key={adj.id}
                    className={`p-4 rounded-lg border ${adj.is_active ? 'bg-navy-900 border-navy-700' : 'bg-navy-900/50 border-navy-800'}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-white font-medium">{adj.name}</span>
                          <Badge className={getTypeBadgeColor(adj.adjustment_type)}>
                            {getTypeInfo(adj.adjustment_type).label || adj.adjustment_type}
                          </Badge>
                          {!adj.is_active && (
                            <Badge className="bg-gray-500/20 text-gray-400">Inactive</Badge>
                          )}
                        </div>
                        {adj.description && (
                          <p className="text-sm text-gray-400 mb-2">{adj.description}</p>
                        )}
                        {Object.keys(adj.parameters || {}).length > 0 && (
                          <div className="text-xs text-gray-500 font-mono bg-navy-800 p-2 rounded mt-2">
                            {JSON.stringify(adj.parameters)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                          onClick={() => toggleActive(adj)}
                        >
                          {adj.is_active ? <CheckCircle className="w-4 h-4 text-green-400" /> : <AlertTriangle className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                          onClick={() => {
                            setSelectedAdjustment(adj);
                            setShowEdit(true);
                          }}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => deleteAdjustment(adj.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Adjustment Types Reference */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white">Available Adjustment Types</CardTitle>
          <CardDescription className="text-gray-400">Reference for adjustment types and their parameters</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {adjustmentTypes.map((type) => (
              <div key={type.value} className="p-3 bg-navy-900 rounded-lg">
                <div className="flex items-center space-x-2 mb-1">
                  <Badge className={getTypeBadgeColor(type.value)}>{type.label}</Badge>
                </div>
                <p className="text-sm text-gray-400">{type.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
