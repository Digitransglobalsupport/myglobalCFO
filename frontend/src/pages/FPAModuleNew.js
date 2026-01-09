import React, { useState, useEffect } from 'react';
import { useAuth, useApp } from '../App';
import { toast } from 'sonner';
import {
  Calculator, FileSpreadsheet, Cog, LineChart, TrendingUp, Plus, Lock, Unlock,
  Trash2, Eye, Brain, AlertTriangle, Building2, RefreshCcw, CheckCircle, Clock,
  Target, Layers, BarChart3, DollarSign, Calendar, GitCompare, Play, Settings,
  ChevronRight, Factory, Truck, Building, Laptop, Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const FPAModule = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white font-display">FP&A</h1>
        <p className="text-gray-400 mt-1">Financial Planning & Analysis</p>
      </div>

      <Tabs defaultValue="planning" className="space-y-6">
        <TabsList className="bg-navy-800 border-navy-700 flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="planning" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Planning
          </TabsTrigger>
          <TabsTrigger value="drivers" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Cog className="w-4 h-4 mr-2" /> Drivers
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <LineChart className="w-4 h-4 mr-2" /> Scenarios
          </TabsTrigger>
          <TabsTrigger value="rolling" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <TrendingUp className="w-4 h-4 mr-2" /> Rolling Forecast
          </TabsTrigger>
        </TabsList>

        <TabsContent value="planning"><PlanningTab /></TabsContent>
        <TabsContent value="drivers"><DriversTab /></TabsContent>
        <TabsContent value="scenarios"><ScenariosTab /></TabsContent>
        <TabsContent value="rolling"><RollingForecastTab /></TabsContent>
      </Tabs>
    </div>
  );
};

// ==================== PLANNING TAB ====================
const PlanningTab = () => {
  const { authAxios } = useAuth();
  const { selectedCompany } = useApp();
  const [versions, setVersions] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newVersion, setNewVersion] = useState({
    name: '', version_type: 'Budget', fiscal_year: new Date().getFullYear(),
    start_period: 'Jan', end_period: 'Dec', is_rolling: false, rolling_months: 12
  });

  useEffect(() => { fetchVersions(); }, []);

  const fetchVersions = async () => {
    try {
      const res = await authAxios.get('/fpa/versions');
      setVersions(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const createVersion = async () => {
    if (!selectedCompany) { toast.error('Select a company first'); return; }
    if (!newVersion.name) { toast.error('Version name required'); return; }
    try {
      await authAxios.post('/fpa/versions', { ...newVersion, company_id: selectedCompany.id });
      toast.success('Version created!');
      setShowCreate(false);
      fetchVersions();
      setNewVersion({ name: '', version_type: 'Budget', fiscal_year: new Date().getFullYear(), start_period: 'Jan', end_period: 'Dec', is_rolling: false, rolling_months: 12 });
    } catch (e) { toast.error('Failed to create version'); }
  };

  const toggleLock = async (id) => {
    try {
      await authAxios.put(`/fpa/versions/${id}/lock`);
      toast.success('Status updated');
      fetchVersions();
    } catch (e) { toast.error('Failed'); }
  };

  const deleteVersion = async (id) => {
    try {
      await authAxios.delete(`/fpa/versions/${id}`);
      toast.success('Deleted');
      fetchVersions();
    } catch (e) { toast.error('Failed'); }
  };

  const getTypeBadge = (type) => {
    const colors = { Budget: 'bg-blue-500/20 text-blue-400', Forecast: 'bg-purple-500/20 text-purple-400', Actuals: 'bg-green-500/20 text-green-400', Scenario: 'bg-orange-500/20 text-orange-400' };
    return <Badge className={colors[type]}>{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Planning Versions</h2>
          <p className="text-gray-400">Manage budget, forecast and actuals versions</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900">
              <Plus className="w-4 h-4 mr-2" /> Create Version
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-navy-800 border-navy-700 max-w-md">
            <DialogHeader>
              <DialogTitle className="text-white">Create Planning Version</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Version Name *</Label>
                <Input value={newVersion.name} onChange={(e) => setNewVersion({...newVersion, name: e.target.value})} className="bg-navy-900 border-navy-600 text-white" placeholder="e.g., 2024 Annual Budget" />
              </div>
              <div>
                <Label className="text-gray-300">Type</Label>
                <Select value={newVersion.version_type} onValueChange={(v) => setNewVersion({...newVersion, version_type: v})}>
                  <SelectTrigger className="bg-navy-900 border-navy-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-600">
                    <SelectItem value="Budget" className="text-white">Budget</SelectItem>
                    <SelectItem value="Forecast" className="text-white">Forecast</SelectItem>
                    <SelectItem value="Actuals" className="text-white">Actuals</SelectItem>
                    <SelectItem value="Scenario" className="text-white">Scenario</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label className="text-gray-300">Year</Label><Input type="number" value={newVersion.fiscal_year} onChange={(e) => setNewVersion({...newVersion, fiscal_year: parseInt(e.target.value)})} className="bg-navy-900 border-navy-600 text-white" /></div>
                <div><Label className="text-gray-300">Start</Label><Input value={newVersion.start_period} onChange={(e) => setNewVersion({...newVersion, start_period: e.target.value})} className="bg-navy-900 border-navy-600 text-white" /></div>
                <div><Label className="text-gray-300">End</Label><Input value={newVersion.end_period} onChange={(e) => setNewVersion({...newVersion, end_period: e.target.value})} className="bg-navy-900 border-navy-600 text-white" /></div>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Rolling Forecast</Label>
                <Switch checked={newVersion.is_rolling} onCheckedChange={(v) => setNewVersion({...newVersion, is_rolling: v})} />
              </div>
              {newVersion.is_rolling && (
                <div><Label className="text-gray-300">Rolling Months</Label><Input type="number" min={12} max={24} value={newVersion.rolling_months} onChange={(e) => setNewVersion({...newVersion, rolling_months: parseInt(e.target.value)})} className="bg-navy-900 border-navy-600 text-white" /></div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-navy-600 text-white">Cancel</Button>
              <Button onClick={createVersion} className="bg-gold-500 hover:bg-gold-600 text-navy-900">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold-500"></div></div>
          ) : versions.length === 0 ? (
            <div className="py-16 text-center">
              <FileSpreadsheet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Planning Versions</h3>
              <p className="text-gray-400 mb-4">Create your first budget or forecast</p>
              <Button className="bg-gold-500 text-navy-900" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4 mr-2" /> Create Version</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-navy-700">
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Period</TableHead>
                  <TableHead className="text-gray-400">Rolling</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((v) => (
                  <TableRow key={v.id} className="border-navy-700 hover:bg-navy-700/50">
                    <TableCell className="text-white font-medium">{v.name}</TableCell>
                    <TableCell>{getTypeBadge(v.version_type)}</TableCell>
                    <TableCell className="text-gray-300">{v.start_period} - {v.end_period} {v.fiscal_year}</TableCell>
                    <TableCell>{v.is_rolling ? <Badge className="bg-gold-500/20 text-gold-400">{v.rolling_months}mo</Badge> : <span className="text-gray-500">-</span>}</TableCell>
                    <TableCell>{v.is_locked ? <Badge className="bg-red-500/20 text-red-400"><Lock className="w-3 h-3 mr-1" />Locked</Badge> : <Badge className="bg-green-500/20 text-green-400"><Unlock className="w-3 h-3 mr-1" />Open</Badge>}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="text-gray-400" onClick={() => toggleLock(v.id)}>{v.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}</Button>
                      <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteVersion(v.id)}><Trash2 className="w-4 h-4" /></Button>
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

// ==================== DRIVERS TAB ====================
const DriversTab = () => {
  const { authAxios } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newDriver, setNewDriver] = useState({ name: '', formula: '', driver_type: 'Revenue', linked_accounts: [] });

  useEffect(() => { fetchDrivers(); }, []);

  const fetchDrivers = async () => {
    try {
      const res = await authAxios.get('/fpa/drivers');
      setDrivers(res.data);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const createDriver = async () => {
    if (!newDriver.name || !newDriver.formula) { toast.error('Name and formula required'); return; }
    try {
      await authAxios.post('/fpa/drivers', newDriver);
      toast.success('Driver created!');
      setShowCreate(false);
      fetchDrivers();
      setNewDriver({ name: '', formula: '', driver_type: 'Revenue', linked_accounts: [] });
    } catch (e) { toast.error('Failed'); }
  };

  const deleteDriver = async (id) => {
    try {
      await authAxios.delete(`/fpa/drivers/${id}`);
      toast.success('Deleted');
      fetchDrivers();
    } catch (e) { toast.error('Failed'); }
  };

  const presetDrivers = [
    { name: 'Revenue per Employee', formula: '[Total Revenue] / [Headcount]', type: 'Revenue' },
    { name: 'Headcount Growth', formula: '[Headcount] * (1 + [Growth Rate])', type: 'Operational' },
    { name: 'Marketing ROI', formula: '[Marketing Revenue] / [Marketing Spend]', type: 'Revenue' },
    { name: 'Cost per Unit', formula: '[Total Cost] / [Units Produced]', type: 'Cost' },
    { name: 'Gross Margin', formula: '([Revenue] - [COGS]) / [Revenue]', type: 'Revenue' },
    { name: 'Operating Leverage', formula: '[EBITDA Growth %] / [Revenue Growth %]', type: 'Operational' },
  ];

  const getTypeColor = (type) => ({ Revenue: 'text-green-400 bg-green-500/10', Cost: 'text-red-400 bg-red-500/10', Operational: 'text-blue-400 bg-blue-500/10' }[type] || 'text-gray-400');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Driver-Based Planning</h2>
          <p className="text-gray-400">Define operational drivers and formulas for dynamic modeling</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900"><Plus className="w-4 h-4 mr-2" /> Create Driver</Button>
          </DialogTrigger>
          <DialogContent className="bg-navy-800 border-navy-700 max-w-lg">
            <DialogHeader><DialogTitle className="text-white">Create Driver</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-gray-300">Driver Name *</Label><Input value={newDriver.name} onChange={(e) => setNewDriver({...newDriver, name: e.target.value})} className="bg-navy-900 border-navy-600 text-white" placeholder="e.g., Revenue per Employee" /></div>
              <div>
                <Label className="text-gray-300">Driver Type</Label>
                <Select value={newDriver.driver_type} onValueChange={(v) => setNewDriver({...newDriver, driver_type: v})}>
                  <SelectTrigger className="bg-navy-900 border-navy-600 text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-600">
                    <SelectItem value="Revenue" className="text-white">Revenue Driver</SelectItem>
                    <SelectItem value="Cost" className="text-white">Cost Driver</SelectItem>
                    <SelectItem value="Operational" className="text-white">Operational Driver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Formula *</Label>
                <Input value={newDriver.formula} onChange={(e) => setNewDriver({...newDriver, formula: e.target.value})} className="bg-navy-900 border-navy-600 text-white font-mono" placeholder="e.g., [Revenue] / [Headcount]" />
                <p className="text-xs text-gray-500 mt-1">Use [Variable Name] syntax for references</p>
              </div>
              <div>
                <Label className="text-gray-300">Quick Templates</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {presetDrivers.slice(0, 4).map((p, i) => (
                    <Badge key={i} className="cursor-pointer bg-navy-700 hover:bg-navy-600 text-gray-300" onClick={() => setNewDriver({...newDriver, name: p.name, formula: p.formula, driver_type: p.type})}>{p.name}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-navy-600 text-white">Cancel</Button>
              <Button onClick={createDriver} className="bg-gold-500 hover:bg-gold-600 text-navy-900">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Existing Drivers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-gold-500"></div></div>
        ) : drivers.length === 0 ? (
          <Card className="col-span-full bg-navy-800 border-navy-700">
            <CardContent className="py-16 text-center">
              <Cog className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Drivers Defined</h3>
              <p className="text-gray-400 mb-4">Create drivers to enable driver-based planning</p>
            </CardContent>
          </Card>
        ) : (
          drivers.map((d) => (
            <Card key={d.id} className="bg-navy-800 border-navy-700">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-white text-lg">{d.name}</CardTitle>
                  <Badge className={getTypeColor(d.driver_type)}>{d.driver_type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-navy-900 rounded p-3 mb-3"><code className="text-sm text-gold-400">{d.formula}</code></div>
                <Button size="sm" variant="ghost" className="text-red-400" onClick={() => deleteDriver(d.id)}><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Preset Templates */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white">Driver Templates</CardTitle>
          <CardDescription className="text-gray-400">Common driver patterns you can use</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {presetDrivers.map((p, i) => (
              <div key={i} className="bg-navy-900 rounded-lg p-3 cursor-pointer hover:bg-navy-700 transition-colors" onClick={() => { setNewDriver({ name: p.name, formula: p.formula, driver_type: p.type, linked_accounts: [] }); setShowCreate(true); }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-medium text-sm">{p.name}</span>
                  <Badge className={getTypeColor(p.type) + ' text-xs'}>{p.type}</Badge>
                </div>
                <code className="text-xs text-gray-400">{p.formula}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ==================== SCENARIOS TAB ====================
const ScenariosTab = () => {
  const [activeTab, setActiveTab] = useState('standard');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Scenario Planning</h2>
        <p className="text-gray-400">Create, compare and analyze business scenarios</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-navy-900">
          <TabsTrigger value="standard" className="data-[state=active]:bg-gold-500/20 data-[state=active]:text-gold-400">Standard Scenarios</TabsTrigger>
          <TabsTrigger value="asset" className="data-[state=active]:bg-gold-500/20 data-[state=active]:text-gold-400">Asset Investment Scenarios</TabsTrigger>
          <TabsTrigger value="compare" className="data-[state=active]:bg-gold-500/20 data-[state=active]:text-gold-400">Compare Scenarios</TabsTrigger>
        </TabsList>

        <TabsContent value="standard" className="mt-6"><StandardScenarios /></TabsContent>
        <TabsContent value="asset" className="mt-6"><AssetScenarios /></TabsContent>
        <TabsContent value="compare" className="mt-6"><CompareScenarios /></TabsContent>
      </Tabs>
    </div>
  );
};

// Standard Scenarios Component
const StandardScenarios = () => {
  const [scenarios, setScenarios] = useState([
    { id: 1, name: 'Best Case', description: 'Optimistic growth - 30% revenue increase', probability: 25, revenue: 4875000, ebitda: 1462500, color: 'green' },
    { id: 2, name: 'Base Case', description: 'Most likely outcome - 15% revenue increase', probability: 50, revenue: 4312500, ebitda: 1078125, color: 'blue' },
    { id: 3, name: 'Worst Case', description: 'Conservative - 5% revenue decrease', probability: 25, revenue: 3562500, ebitda: 712500, color: 'red' },
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [newScenario, setNewScenario] = useState({ name: '', description: '', probability: 25, revenueChange: 0 });

  const formatCurrency = (v) => `£${(v/1000000).toFixed(2)}M`;

  const createScenario = () => {
    const baseRevenue = 3750000;
    const newRev = baseRevenue * (1 + newScenario.revenueChange / 100);
    const newEbitda = newRev * 0.25;
    setScenarios([...scenarios, {
      id: Date.now(), name: newScenario.name, description: newScenario.description,
      probability: newScenario.probability, revenue: newRev, ebitda: newEbitda, color: 'purple'
    }]);
    setShowCreate(false);
    toast.success('Scenario created!');
    setNewScenario({ name: '', description: '', probability: 25, revenueChange: 0 });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900"><Plus className="w-4 h-4 mr-2" /> Create Scenario</Button>
          </DialogTrigger>
          <DialogContent className="bg-navy-800 border-navy-700">
            <DialogHeader><DialogTitle className="text-white">Create Standard Scenario</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label className="text-gray-300">Scenario Name</Label><Input value={newScenario.name} onChange={(e) => setNewScenario({...newScenario, name: e.target.value})} className="bg-navy-900 border-navy-600 text-white" placeholder="e.g., Expansion Scenario" /></div>
              <div><Label className="text-gray-300">Description</Label><Textarea value={newScenario.description} onChange={(e) => setNewScenario({...newScenario, description: e.target.value})} className="bg-navy-900 border-navy-600 text-white" placeholder="Describe assumptions..." /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-gray-300">Probability (%)</Label><Input type="number" value={newScenario.probability} onChange={(e) => setNewScenario({...newScenario, probability: parseInt(e.target.value)})} className="bg-navy-900 border-navy-600 text-white" /></div>
                <div><Label className="text-gray-300">Revenue Change (%)</Label><Input type="number" value={newScenario.revenueChange} onChange={(e) => setNewScenario({...newScenario, revenueChange: parseFloat(e.target.value)})} className="bg-navy-900 border-navy-600 text-white" /></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-navy-600 text-white">Cancel</Button>
              <Button onClick={createScenario} className="bg-gold-500 text-navy-900">Create</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scenarios.map((s) => (
          <Card key={s.id} className={`bg-navy-800 border-${s.color}-500/30`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-white">{s.name}</CardTitle>
                <Badge className={`bg-${s.color}-500/20 text-${s.color}-400`}>{s.probability}%</Badge>
              </div>
              <CardDescription className="text-gray-400">{s.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-gray-400">Revenue</span><span className="text-white font-semibold">{formatCurrency(s.revenue)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">EBITDA</span><span className="text-white font-semibold">{formatCurrency(s.ebitda)}</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Margin</span><span className={`font-semibold text-${s.color}-400`}>{((s.ebitda / s.revenue) * 100).toFixed(1)}%</span></div>
              </div>
              <Button variant="outline" className="w-full mt-4 border-navy-600 text-white"><Eye className="w-4 h-4 mr-2" /> View Details</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Asset Investment Scenarios Component
const AssetScenarios = () => {
  const [assets, setAssets] = useState([
    { id: 1, name: 'Birmingham Site', assetClass: 'Real Estate', cost: 100000, usefulLife: 60, residualValue: 10000, financing: 'Loan', depreciation: 'Straight-Line', npv: 0, irr: 11.99, payback: 0.75, hasProjections: true },
    { id: 2, name: 'London Site', assetClass: 'Real Estate', cost: 120000, usefulLife: 60, residualValue: 15000, financing: 'Cash', depreciation: 'Straight-Line', npv: -120000, irr: null, payback: null, hasProjections: false },
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [newAsset, setNewAsset] = useState({
    name: '', assetClass: 'Equipment', cost: 100000, usefulLife: 60, residualValue: 10000,
    purchaseDate: '', inServiceDate: '', financing: 'Cash Purchase', depreciation: 'Straight-Line',
    utilization: 100, discountRate: 10, description: '', monthlyRevenue: 5000, annualGrowth: 5, maintenanceCost: 500
  });

  const assetClasses = [
    { value: 'Equipment', label: 'Equipment', icon: Factory },
    { value: 'Vehicles', label: 'Vehicles', icon: Truck },
    { value: 'Real Estate', label: 'Real Estate', icon: Building },
    { value: 'Technology', label: 'Technology', icon: Laptop },
    { value: 'Inventory', label: 'Inventory', icon: Package },
  ];

  const calculateMetrics = (asset) => {
    const { cost, usefulLife, monthlyRevenue, annualGrowth, maintenanceCost, discountRate } = asset;
    const months = usefulLife || 60;
    let totalCashFlow = 0;
    let discountedCashFlow = 0;
    const r = (discountRate || 10) / 100 / 12;
    
    for (let i = 1; i <= months; i++) {
      const growth = Math.pow(1 + (annualGrowth || 0) / 100, i / 12);
      const cf = (monthlyRevenue || 0) * growth - (maintenanceCost || 0);
      totalCashFlow += cf;
      discountedCashFlow += cf / Math.pow(1 + r, i);
    }
    
    const npv = discountedCashFlow - cost;
    const payback = cost / ((monthlyRevenue || 1) - (maintenanceCost || 0)) / 12;
    const irr = monthlyRevenue > 0 ? ((totalCashFlow / cost) - 1) * 100 / (months / 12) : null;
    
    return { npv: Math.round(npv), irr: irr ? parseFloat(irr.toFixed(2)) : null, payback: payback > 0 ? parseFloat(payback.toFixed(2)) : null };
  };

  const createAsset = () => {
    if (!newAsset.name) { toast.error('Asset name required'); return; }
    const metrics = calculateMetrics(newAsset);
    const asset = {
      id: Date.now(), ...newAsset, ...metrics,
      hasProjections: newAsset.monthlyRevenue > 0
    };
    setAssets([...assets, asset]);
    setShowCreate(false);
    toast.success('Asset scenario created!');
    setNewAsset({ name: '', assetClass: 'Equipment', cost: 100000, usefulLife: 60, residualValue: 10000, purchaseDate: '', inServiceDate: '', financing: 'Cash Purchase', depreciation: 'Straight-Line', utilization: 100, discountRate: 10, description: '', monthlyRevenue: 5000, annualGrowth: 5, maintenanceCost: 500 });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900"><Plus className="w-4 h-4 mr-2" /> Create Asset Scenario</Button>
          </DialogTrigger>
          <DialogContent className="bg-navy-800 border-navy-700 max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white">Create Asset Scenario</DialogTitle>
              <p className="text-gray-400 text-sm">Model a capital asset investment from acquisition to disposal</p>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h4 className="text-white font-medium mb-3 flex items-center"><Building2 className="w-4 h-4 mr-2 text-gold-400" /> Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label className="text-gray-300">Asset Name *</Label><Input value={newAsset.name} onChange={(e) => setNewAsset({...newAsset, name: e.target.value})} className="bg-navy-900 border-navy-600 text-white" placeholder="e.g., Production Line Alpha" /></div>
                    <div>
                      <Label className="text-gray-300">Asset Class *</Label>
                      <Select value={newAsset.assetClass} onValueChange={(v) => setNewAsset({...newAsset, assetClass: v})}>
                        <SelectTrigger className="bg-navy-900 border-navy-600 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-navy-800 border-navy-600">
                          {assetClasses.map((c) => <SelectItem key={c.value} value={c.value} className="text-white">{c.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-gray-300">Estimated Cost (£) *</Label><Input type="number" value={newAsset.cost} onChange={(e) => setNewAsset({...newAsset, cost: parseInt(e.target.value)})} className="bg-navy-900 border-navy-600 text-white" /></div>
                    <div><Label className="text-gray-300">Useful Life (Months) *</Label><Input type="number" value={newAsset.usefulLife} onChange={(e) => setNewAsset({...newAsset, usefulLife: parseInt(e.target.value)})} className="bg-navy-900 border-navy-600 text-white" /></div>
                    <div><Label className="text-gray-300">Residual Value (£)</Label><Input type="number" value={newAsset.residualValue} onChange={(e) => setNewAsset({...newAsset, residualValue: parseInt(e.target.value)})} className="bg-navy-900 border-navy-600 text-white" /></div>
                    <div><Label className="text-gray-300">Purchase Date *</Label><Input type="date" value={newAsset.purchaseDate} onChange={(e) => setNewAsset({...newAsset, purchaseDate: e.target.value})} className="bg-navy-900 border-navy-600 text-white" /></div>
                    <div><Label className="text-gray-300">In-Service Date *</Label><Input type="date" value={newAsset.inServiceDate} onChange={(e) => setNewAsset({...newAsset, inServiceDate: e.target.value})} className="bg-navy-900 border-navy-600 text-white" /></div>
                  </div>
                </div>

                <Separator className="bg-navy-700" />

                {/* Financing Method */}
                <div>
                  <h4 className="text-white font-medium mb-3 flex items-center"><DollarSign className="w-4 h-4 mr-2 text-gold-400" /> Financing Method</h4>
                  <Select value={newAsset.financing} onValueChange={(v) => setNewAsset({...newAsset, financing: v})}>
                    <SelectTrigger className="bg-navy-900 border-navy-600 text-white"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-navy-800 border-navy-600">
                      <SelectItem value="Cash Purchase" className="text-white">Cash Purchase</SelectItem>
                      <SelectItem value="Loan" className="text-white">Loan</SelectItem>
                      <SelectItem value="Lease" className="text-white">Lease</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator className="bg-navy-700" />

                {/* Depreciation & Analysis */}
                <div>
                  <h4 className="text-white font-medium mb-3 flex items-center"><BarChart3 className="w-4 h-4 mr-2 text-gold-400" /> Depreciation & Analysis</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label className="text-gray-300">Depreciation Method</Label>
                      <Select value={newAsset.depreciation} onValueChange={(v) => setNewAsset({...newAsset, depreciation: v})}>
                        <SelectTrigger className="bg-navy-900 border-navy-600 text-white"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-navy-800 border-navy-600">
                          <SelectItem value="Straight-Line" className="text-white">Straight-Line</SelectItem>
                          <SelectItem value="Declining Balance" className="text-white">Declining Balance</SelectItem>
                          <SelectItem value="Units of Production" className="text-white">Units of Production</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-gray-300">Utilization %</Label><Input type="number" value={newAsset.utilization} onChange={(e) => setNewAsset({...newAsset, utilization: parseInt(e.target.value)})} className="bg-navy-900 border-navy-600 text-white" /></div>
                    <div><Label className="text-gray-300">Discount Rate (%)</Label><Input type="number" step="0.1" value={newAsset.discountRate} onChange={(e) => setNewAsset({...newAsset, discountRate: parseFloat(e.target.value)})} className="bg-navy-900 border-navy-600 text-white" /></div>
                  </div>
                </div>

                <Separator className="bg-navy-700" />

                {/* Revenue & Cost Projections */}
                <div>
                  <h4 className="text-white font-medium mb-3 flex items-center"><TrendingUp className="w-4 h-4 mr-2 text-gold-400" /> Revenue & Cost Projections</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div><Label className="text-gray-300">Monthly Revenue/Savings (£)</Label><Input type="number" value={newAsset.monthlyRevenue} onChange={(e) => setNewAsset({...newAsset, monthlyRevenue: parseInt(e.target.value)})} className="bg-navy-900 border-navy-600 text-white" /></div>
                    <div><Label className="text-gray-300">Annual Growth Rate (%)</Label><Input type="number" value={newAsset.annualGrowth} onChange={(e) => setNewAsset({...newAsset, annualGrowth: parseFloat(e.target.value)})} className="bg-navy-900 border-navy-600 text-white" /></div>
                    <div><Label className="text-gray-300">Monthly Maintenance (£)</Label><Input type="number" value={newAsset.maintenanceCost} onChange={(e) => setNewAsset({...newAsset, maintenanceCost: parseInt(e.target.value)})} className="bg-navy-900 border-navy-600 text-white" /></div>
                  </div>
                </div>

                <Separator className="bg-navy-700" />

                {/* Description */}
                <div>
                  <Label className="text-gray-300">Scenario Description</Label>
                  <Textarea value={newAsset.description} onChange={(e) => setNewAsset({...newAsset, description: e.target.value})} className="bg-navy-900 border-navy-600 text-white" placeholder="Describe assumptions and strategy for this asset..." rows={3} />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-navy-600 text-white">Cancel</Button>
              <Button onClick={createAsset} className="bg-gold-500 text-navy-900">Create Asset Scenario</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Asset Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <Card key={asset.id} className="bg-navy-800 border-navy-700">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-white">{asset.name}</CardTitle>
                  <Badge className="bg-navy-700 text-gray-300 mt-1">{asset.assetClass}</Badge>
                </div>
                <Badge className={asset.hasProjections ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}>
                  {asset.hasProjections ? 'Complete' : 'Incomplete'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">Initial Cost</span><p className="text-white font-semibold">£{asset.cost.toLocaleString()}</p></div>
                <div><span className="text-gray-500">Financing</span><p className="text-white">{asset.financing}</p></div>
              </div>
              <Separator className="bg-navy-700" />
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div><span className="text-gray-500">NPV</span><p className={`font-semibold ${asset.npv >= 0 ? 'text-green-400' : 'text-red-400'}`}>£{asset.npv.toLocaleString()}</p></div>
                <div><span className="text-gray-500">IRR</span><p className="text-white font-semibold">{asset.irr !== null ? `${asset.irr}%` : 'N/A'}</p></div>
                <div><span className="text-gray-500">Payback</span><p className="text-white font-semibold">{asset.payback !== null ? `${asset.payback} yrs` : 'N/A'}</p></div>
              </div>
              {!asset.hasProjections && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2">
                  <p className="text-yellow-400 text-xs flex items-center"><AlertTriangle className="w-3 h-3 mr-1" /> Add revenue projections for complete metrics</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

// Compare Scenarios Component
const CompareScenarios = () => {
  const [assets] = useState([
    { id: 1, name: 'Birmingham Site', cost: 100000, financing: 'Loan', npv: 0, irr: 11.99, payback: 0.75 },
    { id: 2, name: 'London Site', cost: 120000, financing: 'Cash', npv: -120000, irr: null, payback: null },
    { id: 3, name: 'Manchester Equipment', cost: 85000, financing: 'Lease', npv: 15000, irr: 14.5, payback: 1.2 },
  ]);
  const [selected, setSelected] = useState([1, 2]);
  const [showResults, setShowResults] = useState(false);

  const toggleSelect = (id) => {
    if (selected.includes(id)) {
      setSelected(selected.filter(s => s !== id));
    } else if (selected.length < 3) {
      setSelected([...selected, id]);
    } else {
      toast.error('Max 3 assets to compare');
    }
  };

  const selectedAssets = assets.filter(a => selected.includes(a.id));
  const bestNPV = selectedAssets.reduce((best, a) => (a.npv > (best?.npv ?? -Infinity)) ? a : best, null);
  const bestIRR = selectedAssets.filter(a => a.irr !== null).reduce((best, a) => (a.irr > (best?.irr ?? -Infinity)) ? a : best, null);

  return (
    <div className="space-y-6">
      {/* Selection */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center"><GitCompare className="w-5 h-5 mr-2 text-gold-400" /> Compare Asset Scenarios</CardTitle>
          <CardDescription className="text-gray-400">Select 2-3 assets to compare NPV, IRR, and payback periods</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 mb-4">
            {assets.map((asset) => (
              <div key={asset.id} onClick={() => toggleSelect(asset.id)} className={`flex items-center space-x-2 p-3 rounded-lg cursor-pointer border transition-all ${
                selected.includes(asset.id) ? 'bg-gold-500/20 border-gold-500' : 'bg-navy-900 border-navy-700 hover:border-navy-500'
              }`}>
                <Checkbox checked={selected.includes(asset.id)} />
                <span className="text-white">{asset.name}</span>
              </div>
            ))}
          </div>
          <Button onClick={() => setShowResults(true)} disabled={selected.length < 2} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
            <Play className="w-4 h-4 mr-2" /> Calculate & Compare
          </Button>
        </CardContent>
      </Card>

      {/* Results */}
      {showResults && selected.length >= 2 && (
        <Card className="bg-navy-800 border-navy-700">
          <CardHeader>
            <CardTitle className="text-white">Comparison Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-navy-700">
                  <TableHead className="text-gray-400">Asset</TableHead>
                  <TableHead className="text-gray-400">Initial Cost</TableHead>
                  <TableHead className="text-gray-400">Financing</TableHead>
                  <TableHead className="text-gray-400">NPV</TableHead>
                  <TableHead className="text-gray-400">IRR</TableHead>
                  <TableHead className="text-gray-400">Payback</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedAssets.map((asset) => (
                  <TableRow key={asset.id} className="border-navy-700">
                    <TableCell className="text-white font-medium">{asset.name}</TableCell>
                    <TableCell className="text-gray-300">£{asset.cost.toLocaleString()}</TableCell>
                    <TableCell><Badge className="bg-navy-700 text-gray-300">{asset.financing}</Badge></TableCell>
                    <TableCell className={asset.npv >= 0 ? 'text-green-400' : 'text-red-400'}>£{asset.npv.toLocaleString()}</TableCell>
                    <TableCell className="text-white">{asset.irr !== null ? `${asset.irr}%` : 'N/A'}</TableCell>
                    <TableCell className="text-white">{asset.payback !== null ? `${asset.payback} years` : 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Recommendations */}
            <div className="mt-6 p-4 bg-navy-900 rounded-lg">
              <h4 className="text-white font-medium mb-3">Recommendations</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-3">
                  <Badge className="bg-green-500/20 text-green-400">Best by NPV</Badge>
                  <span className="text-white">{bestNPV?.name} (£{bestNPV?.npv?.toLocaleString()})</span>
                </div>
                {bestIRR && (
                  <div className="flex items-center space-x-3">
                    <Badge className="bg-blue-500/20 text-blue-400">Best by IRR</Badge>
                    <span className="text-white">{bestIRR.name} ({bestIRR.irr}%)</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ==================== ROLLING FORECAST TAB ====================
const RollingForecastTab = () => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentMonth = new Date().getMonth();
  
  const forecastData = months.map((m, i) => ({
    month: m,
    year: i < currentMonth ? 2025 : 2024,
    type: i <= currentMonth ? 'actual' : 'forecast',
    revenue: 280000 + Math.random() * 50000 + i * 5000,
    expenses: 200000 + Math.random() * 30000 + i * 3000,
  }));

  const [forecastMonths, setForecastMonths] = useState(12);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-white">Rolling Forecast</h2>
          <p className="text-gray-400">Continuous 12-18 month forecasting with actuals integration</p>
        </div>
        <div className="flex items-center space-x-3">
          <Label className="text-gray-400">Forecast Window:</Label>
          <Select value={forecastMonths.toString()} onValueChange={(v) => setForecastMonths(parseInt(v))}>
            <SelectTrigger className="w-32 bg-navy-900 border-navy-600 text-white"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-navy-800 border-navy-600">
              <SelectItem value="12" className="text-white">12 Months</SelectItem>
              <SelectItem value="15" className="text-white">15 Months</SelectItem>
              <SelectItem value="18" className="text-white">18 Months</SelectItem>
            </SelectContent>
          </Select>
          <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900"><RefreshCcw className="w-4 h-4 mr-2" /> Update Forecast</Button>
        </div>
      </div>

      {/* Progress */}
      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Forecast Completion</span>
            <span className="text-gold-400 font-semibold">{Math.round((currentMonth + 1) / 12 * 100)}% Actuals</span>
          </div>
          <div className="flex h-3 rounded-full overflow-hidden bg-navy-700">
            <div className="bg-green-500" style={{ width: `${((currentMonth + 1) / 12) * 100}%` }} />
            <div className="bg-gold-500" style={{ width: `${((12 - currentMonth - 1) / 12) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-green-400">{currentMonth + 1} months actual</span>
            <span className="text-gold-400">{12 - currentMonth - 1} months forecast</span>
          </div>
        </CardContent>
      </Card>

      {/* Forecast Table */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white">Monthly Forecast</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-navy-700">
                <TableHead className="text-gray-400">Period</TableHead>
                <TableHead className="text-gray-400">Type</TableHead>
                <TableHead className="text-gray-400 text-right">Revenue</TableHead>
                <TableHead className="text-gray-400 text-right">Expenses</TableHead>
                <TableHead className="text-gray-400 text-right">Net Income</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecastData.map((row, i) => (
                <TableRow key={i} className="border-navy-700 hover:bg-navy-700/50">
                  <TableCell className="text-white font-medium">{row.month} {row.year}</TableCell>
                  <TableCell>
                    <Badge className={row.type === 'actual' ? 'bg-green-500/20 text-green-400' : 'bg-gold-500/20 text-gold-400'}>
                      {row.type === 'actual' ? 'Actual' : 'Forecast'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-green-400">£{Math.round(row.revenue).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-red-400">£{Math.round(row.expenses).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-white font-semibold">£{Math.round(row.revenue - row.expenses).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Variance Analysis */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center"><AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" /> Variance Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-navy-900 rounded-lg p-4">
              <p className="text-gray-500 text-sm">Revenue Variance</p>
              <p className="text-2xl font-bold text-green-400">+£45,000</p>
              <p className="text-sm text-gray-400">3.2% above budget</p>
            </div>
            <div className="bg-navy-900 rounded-lg p-4">
              <p className="text-gray-500 text-sm">Expense Variance</p>
              <p className="text-2xl font-bold text-red-400">+£12,500</p>
              <p className="text-sm text-gray-400">1.8% over budget</p>
            </div>
            <div className="bg-navy-900 rounded-lg p-4">
              <p className="text-gray-500 text-sm">Net Variance</p>
              <p className="text-2xl font-bold text-green-400">+£32,500</p>
              <p className="text-sm text-gray-400">Favorable</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FPAModule;
