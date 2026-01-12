import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth, useApp } from '../App';
import { useCurrency } from '../context/CurrencyContext';
import { useRAGPolicy } from '../hooks/useRAGPolicy';
import { toast } from 'sonner';
import {
  LayoutDashboard, FileSpreadsheet, Cog, GitBranch, LineChart,
  Users, Plus, Lock, Unlock, Trash2, Copy, Edit2,
  TrendingUp, Building2, AlertTriangle, CheckCircle, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const FPAModule = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard/fpa', label: 'Overview', icon: LayoutDashboard, exact: true },
    { path: '/dashboard/fpa/planning', label: 'Planning', icon: FileSpreadsheet },
    { path: '/dashboard/fpa/drivers', label: 'Drivers', icon: Cog },
    { path: '/dashboard/fpa/setup-integrations', label: 'Setup Integrations', icon: GitBranch },
    { path: '/dashboard/fpa/scenario-planning', label: 'Scenarios', icon: LineChart },
    { path: '/dashboard/fpa/rolling-forecast', label: 'Rolling Forecast', icon: TrendingUp },
    { path: '/dashboard/fpa/user-permissions', label: 'Permissions', icon: Users }
  ];

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {navItems.map((item) => (
          <Link key={item.path} to={item.path}>
            <Button
              variant={isActive(item.path, item.exact) ? 'default' : 'outline'}
              className={isActive(item.path, item.exact)
                ? 'bg-gold-500 text-navy-900'
                : 'border-navy-600 text-gray-300 hover:text-white'
              }
              data-testid={`fpa-nav-${item.label.toLowerCase().replace(' ', '-')}`}
            >
              <item.icon className="w-4 h-4 mr-2" />
              {item.label}
            </Button>
          </Link>
        ))}
      </div>

      <Routes>
        <Route index element={<FPAOverview />} />
        <Route path="planning" element={<FPAPlanning />} />
        <Route path="drivers" element={<FPADrivers />} />
        <Route path="setup-integrations" element={<FPASetupIntegrations />} />
        <Route path="scenario-planning" element={<FPAScenarioPlanning />} />
        <Route path="rolling-forecast" element={<FPARollingForecast />} />
        <Route path="user-permissions" element={<FPAUserPermissions />} />
      </Routes>
    </div>
  );
};

// FP&A Overview - Connected to Backend
const FPAOverview = () => {
  const { authAxios } = useAuth();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverview();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await authAxios.get('/fpa/overview');
      setOverview(res.data);
    } catch (e) {
      console.error('Error fetching FP&A overview:', e);
    } finally {
      setLoading(false);
    }
  };

  const stats = overview || {
    planning_dimensions: 0,
    planning_versions: 0,
    drivers_count: 0,
    integrations_count: 0,
    entities_count: 0
  };

  return (
    <div className="space-y-6" data-testid="fpa-overview">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">FP&A Overview</h1>
        <p className="text-gray-400 mt-1">Financial Planning & Analysis Module</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard
              title="Planning Dimensions"
              value={stats.planning_dimensions}
              icon={<Building2 className="w-5 h-5" />}
              description={`${stats.entities_count} entities × 7 dimensions`}
            />
            <StatCard
              title="Planning Versions"
              value={stats.planning_versions}
              icon={<FileSpreadsheet className="w-5 h-5" />}
              description="Budgets, forecasts, scenarios"
            />
            <StatCard
              title="Drivers & Formulas"
              value={stats.drivers_count}
              icon={<Cog className="w-5 h-5" />}
              description="Driver-based models"
            />
            <StatCard
              title="Integrations"
              value={stats.integrations_count}
              icon={<GitBranch className="w-5 h-5" />}
              description="Connected platforms"
            />
          </div>

          <Card className="bg-navy-800 border-navy-700">
            <CardHeader>
              <CardTitle className="text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Link to="/dashboard/fpa/planning">
                  <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900">
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Budget & Forecast
                  </Button>
                </Link>
                <Link to="/dashboard/fpa/drivers">
                  <Button variant="outline" className="border-navy-600 text-white">
                    <Cog className="w-4 h-4 mr-2" /> Manage Drivers
                  </Button>
                </Link>
                <Link to="/dashboard/fpa/setup-integrations">
                  <Button variant="outline" className="border-navy-600 text-white">
                    <GitBranch className="w-4 h-4 mr-2" /> Setup Integrations
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              title="Multi-Dimensional Planning"
              description="7-dimension model: Entity, Department, Time, Account, Product, Segment, Geography"
              icon={<Building2 className="w-6 h-6" />}
            />
            <FeatureCard
              title="Driver-Based Modeling"
              description="Create operational drivers with formulas for dynamic financial modeling"
              icon={<Cog className="w-6 h-6" />}
            />
            <FeatureCard
              title="Rolling Forecasts"
              description="Continuous 12-18 month rolling forecasts with actuals integration"
              icon={<TrendingUp className="w-6 h-6" />}
            />
          </div>
        </>
      )}
    </div>
  );
};

// FP&A Planning Versions - Full CRUD Connected to Backend
const FPAPlanning = () => {
  const { authAxios } = useAuth();
  const { companies, selectedCompany } = useApp();
  const [versions, setVersions] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [copyName, setCopyName] = useState('');
  const [loading, setLoading] = useState(true);

  const [newVersion, setNewVersion] = useState({
    name: '',
    version_type: 'Budget',
    fiscal_year: new Date().getFullYear(),
    start_period: 'Jan',
    end_period: 'Dec',
    is_rolling: false,
    rolling_months: 12
  });

  useEffect(() => {
    fetchVersions();
  }, [selectedCompany]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const params = selectedCompany ? { company_id: selectedCompany.id } : {};
      const res = await authAxios.get('/fpa/versions', { params });
      setVersions(res.data);
    } catch (e) {
      console.error('Error fetching versions:', e);
      toast.error('Failed to fetch planning versions');
    } finally {
      setLoading(false);
    }
  };

  const createVersion = async () => {
    if (!selectedCompany) {
      toast.error('Please select a company first');
      return;
    }
    if (!newVersion.name.trim()) {
      toast.error('Please enter a version name');
      return;
    }
    try {
      await authAxios.post('/fpa/versions', {
        ...newVersion,
        company_id: selectedCompany.id
      });
      toast.success('Version created successfully!');
      setShowCreate(false);
      fetchVersions();
      setNewVersion({
        name: '',
        version_type: 'Budget',
        fiscal_year: new Date().getFullYear(),
        start_period: 'Jan',
        end_period: 'Dec',
        is_rolling: false,
        rolling_months: 12
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create version');
    }
  };

  const toggleLock = async (versionId) => {
    try {
      const res = await authAxios.put(`/fpa/versions/${versionId}/lock`);
      toast.success(res.data.message);
      fetchVersions();
    } catch (e) {
      toast.error('Failed to toggle lock');
    }
  };

  const copyVersion = async () => {
    if (!selectedVersion || !copyName.trim()) {
      toast.error('Please enter a name for the copy');
      return;
    }
    try {
      await authAxios.post(`/fpa/versions/${selectedVersion.id}/copy?new_name=${encodeURIComponent(copyName)}`);
      toast.success('Version copied successfully!');
      setShowCopy(false);
      setCopyName('');
      setSelectedVersion(null);
      fetchVersions();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to copy version');
    }
  };

  const deleteVersion = async (versionId) => {
    try {
      await authAxios.delete(`/fpa/versions/${versionId}`);
      toast.success('Version deleted');
      fetchVersions();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to delete version');
    }
  };

  const getTypeBadge = (type) => {
    const colors = {
      'Budget': 'bg-blue-500/20 text-blue-400',
      'Forecast': 'bg-purple-500/20 text-purple-400',
      'Actuals': 'bg-green-500/20 text-green-400',
      'Scenario': 'bg-orange-500/20 text-orange-400'
    };
    return <Badge className={colors[type] || 'bg-gray-500/20 text-gray-400'}>{type}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="fpa-planning">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Planning Versions</h2>
          <p className="text-gray-400">Create and manage budget and forecast versions</p>
        </div>
        <div className="flex items-center space-x-3">
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900" data-testid="create-version-btn">
                <Plus className="w-4 h-4 mr-2" /> Create Version
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-navy-800 border-navy-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create Planning Version</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Version Name</Label>
                  <Input
                    value={newVersion.name}
                    onChange={(e) => setNewVersion({ ...newVersion, name: e.target.value })}
                    className="bg-navy-900 border-navy-600 text-white"
                    placeholder="e.g., 2025 Budget"
                    data-testid="version-name-input"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Type</Label>
                  <Select
                    value={newVersion.version_type}
                    onValueChange={(v) => setNewVersion({ ...newVersion, version_type: v })}
                  >
                    <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-navy-800 border-navy-600">
                      <SelectItem value="Budget" className="text-white">Budget</SelectItem>
                      <SelectItem value="Forecast" className="text-white">Forecast</SelectItem>
                      <SelectItem value="Actuals" className="text-white">Actuals</SelectItem>
                      <SelectItem value="Scenario" className="text-white">Scenario</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-300">Fiscal Year</Label>
                    <Input
                      type="number"
                      value={newVersion.fiscal_year}
                      onChange={(e) => setNewVersion({ ...newVersion, fiscal_year: parseInt(e.target.value) })}
                      className="bg-navy-900 border-navy-600 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Start Period</Label>
                    <Input
                      value={newVersion.start_period}
                      onChange={(e) => setNewVersion({ ...newVersion, start_period: e.target.value })}
                      className="bg-navy-900 border-navy-600 text-white"
                      placeholder="Jan"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">End Period</Label>
                    <Input
                      value={newVersion.end_period}
                      onChange={(e) => setNewVersion({ ...newVersion, end_period: e.target.value })}
                      className="bg-navy-900 border-navy-600 text-white"
                      placeholder="Dec"
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-gray-300">Rolling Forecast</Label>
                  <Switch
                    checked={newVersion.is_rolling}
                    onCheckedChange={(v) => setNewVersion({ ...newVersion, is_rolling: v })}
                  />
                </div>
                {newVersion.is_rolling && (
                  <div>
                    <Label className="text-gray-300">Rolling Months</Label>
                    <Input
                      type="number"
                      min="12"
                      max="18"
                      value={newVersion.rolling_months}
                      onChange={(e) => setNewVersion({ ...newVersion, rolling_months: parseInt(e.target.value) })}
                      className="bg-navy-900 border-navy-600 text-white"
                    />
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)} className="border-navy-600 text-white">
                  Cancel
                </Button>
                <Button onClick={createVersion} className="bg-gold-500 hover:bg-gold-600 text-navy-900" data-testid="submit-version-btn">
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Copy Dialog */}
      <Dialog open={showCopy} onOpenChange={setShowCopy}>
        <DialogContent className="bg-navy-800 border-navy-700">
          <DialogHeader>
            <DialogTitle className="text-white">Copy Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-400">
              Create a copy of &quot;{selectedVersion?.name}&quot;
            </p>
            <div>
              <Label className="text-gray-300">New Version Name</Label>
              <Input
                value={copyName}
                onChange={(e) => setCopyName(e.target.value)}
                className="bg-navy-900 border-navy-600 text-white"
                placeholder="e.g., 2025 Budget v2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCopy(false)} className="border-navy-600 text-white">
              Cancel
            </Button>
            <Button onClick={copyVersion} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
              Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versions Table */}
      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
            </div>
          ) : versions.length === 0 ? (
            <div className="py-16 text-center">
              <FileSpreadsheet className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Versions Yet</h3>
              <p className="text-gray-400 mb-4">Create your first planning version to get started</p>
              <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Create Version
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-navy-700">
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Fiscal Year</TableHead>
                  <TableHead className="text-gray-400">Period</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id} className="border-navy-700 hover:bg-navy-700/50">
                    <TableCell className="text-white font-medium">{version.name}</TableCell>
                    <TableCell>{getTypeBadge(version.version_type)}</TableCell>
                    <TableCell className="text-gray-300">{version.fiscal_year}</TableCell>
                    <TableCell className="text-gray-300">
                      {version.start_period} - {version.end_period}
                      {version.is_rolling && (
                        <Badge className="ml-2 bg-purple-500/20 text-purple-400">Rolling</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {version.is_locked ? (
                        <Badge className="bg-red-500/20 text-red-400 flex items-center w-fit">
                          <Lock className="w-3 h-3 mr-1" /> Locked
                        </Badge>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-400 flex items-center w-fit">
                          <Unlock className="w-3 h-3 mr-1" /> Open
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                          onClick={() => toggleLock(version.id)}
                          title={version.is_locked ? 'Unlock' : 'Lock'}
                        >
                          {version.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                          onClick={() => {
                            setSelectedVersion(version);
                            setCopyName(`${version.name} (Copy)`);
                            setShowCopy(true);
                          }}
                          title="Copy"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => deleteVersion(version.id)}
                          disabled={version.is_locked}
                          title="Delete"
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
    </div>
  );
};

// FP&A Drivers - Full CRUD Connected to Backend
const FPADrivers = () => {
  const { authAxios } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [driverTypes, setDriverTypes] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  const [newDriver, setNewDriver] = useState({
    name: '',
    formula: '',
    driver_type: 'Revenue',
    linked_accounts: []
  });

  useEffect(() => {
    fetchDrivers();
    fetchDriverTypes();
  }, [filterType]);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      const params = filterType !== 'all' ? { driver_type: filterType } : {};
      const res = await authAxios.get('/fpa/drivers', { params });
      setDrivers(res.data);
    } catch (e) {
      console.error('Error fetching drivers:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDriverTypes = async () => {
    try {
      const res = await authAxios.get('/fpa/driver-types');
      setDriverTypes(res.data.driver_types);
    } catch (e) {
      console.error('Error fetching driver types:', e);
    }
  };

  const createDriver = async () => {
    if (!newDriver.name.trim() || !newDriver.formula.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await authAxios.post('/fpa/drivers', newDriver);
      toast.success('Driver created successfully!');
      setShowCreate(false);
      fetchDrivers();
      setNewDriver({ name: '', formula: '', driver_type: 'Revenue', linked_accounts: [] });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create driver');
    }
  };

  const updateDriver = async () => {
    if (!selectedDriver) return;
    try {
      await authAxios.put(`/fpa/drivers/${selectedDriver.id}`, {
        name: selectedDriver.name,
        formula: selectedDriver.formula,
        driver_type: selectedDriver.driver_type
      });
      toast.success('Driver updated successfully!');
      setShowEdit(false);
      setSelectedDriver(null);
      fetchDrivers();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to update driver');
    }
  };

  const deleteDriver = async (driverId) => {
    try {
      await authAxios.delete(`/fpa/drivers/${driverId}`);
      toast.success('Driver deleted');
      fetchDrivers();
    } catch (e) {
      toast.error('Failed to delete driver');
    }
  };

  const getTypeColor = (type) => {
    const colors = {
      'Revenue': 'bg-green-500/20 text-green-400',
      'Cost': 'bg-red-500/20 text-red-400',
      'Operational': 'bg-blue-500/20 text-blue-400',
      'Headcount': 'bg-purple-500/20 text-purple-400',
      'Volume': 'bg-orange-500/20 text-orange-400',
      'Price': 'bg-pink-500/20 text-pink-400'
    };
    return colors[type] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <div className="space-y-6" data-testid="fpa-drivers">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Drivers & Formulas</h2>
          <p className="text-gray-400">Define operational drivers for dynamic modeling</p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 bg-navy-900 border-navy-600 text-white">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="bg-navy-800 border-navy-600">
              <SelectItem value="all" className="text-white">All Types</SelectItem>
              {driverTypes.map(dt => (
                <SelectItem key={dt.value} value={dt.value} className="text-white">{dt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900" data-testid="create-driver-btn">
                <Plus className="w-4 h-4 mr-2" /> Create Driver
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-navy-800 border-navy-700">
              <DialogHeader>
                <DialogTitle className="text-white">Create Driver</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label className="text-gray-300">Driver Name</Label>
                  <Input
                    value={newDriver.name}
                    onChange={(e) => setNewDriver({ ...newDriver, name: e.target.value })}
                    className="bg-navy-900 border-navy-600 text-white"
                    placeholder="e.g., Headcount Growth Rate"
                    data-testid="driver-name-input"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Driver Type</Label>
                  <Select
                    value={newDriver.driver_type}
                    onValueChange={(v) => setNewDriver({ ...newDriver, driver_type: v })}
                  >
                    <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-navy-800 border-navy-600">
                      {driverTypes.map(dt => (
                        <SelectItem key={dt.value} value={dt.value} className="text-white">{dt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Formula</Label>
                  <Textarea
                    value={newDriver.formula}
                    onChange={(e) => setNewDriver({ ...newDriver, formula: e.target.value })}
                    className="bg-navy-900 border-navy-600 text-white font-mono"
                    placeholder="e.g., [Headcount] * [Avg Salary]"
                    rows={3}
                    data-testid="driver-formula-input"
                  />
                  <p className="text-xs text-gray-500 mt-1">Use [Variable] syntax for references</p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreate(false)} className="border-navy-600 text-white">
                  Cancel
                </Button>
                <Button onClick={createDriver} className="bg-gold-500 hover:bg-gold-600 text-navy-900" data-testid="submit-driver-btn">
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="bg-navy-800 border-navy-700">
          <DialogHeader>
            <DialogTitle className="text-white">Edit Driver</DialogTitle>
          </DialogHeader>
          {selectedDriver && (
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Driver Name</Label>
                <Input
                  value={selectedDriver.name}
                  onChange={(e) => setSelectedDriver({ ...selectedDriver, name: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white"
                />
              </div>
              <div>
                <Label className="text-gray-300">Driver Type</Label>
                <Select
                  value={selectedDriver.driver_type}
                  onValueChange={(v) => setSelectedDriver({ ...selectedDriver, driver_type: v })}
                >
                  <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-600">
                    {driverTypes.map(dt => (
                      <SelectItem key={dt.value} value={dt.value} className="text-white">{dt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Formula</Label>
                <Textarea
                  value={selectedDriver.formula}
                  onChange={(e) => setSelectedDriver({ ...selectedDriver, formula: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white font-mono"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)} className="border-navy-600 text-white">
              Cancel
            </Button>
            <Button onClick={updateDriver} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {drivers.length === 0 ? (
            <Card className="col-span-full bg-navy-800 border-navy-700">
              <CardContent className="py-16 text-center">
                <Cog className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Drivers Yet</h3>
                <p className="text-gray-400 mb-4">Create drivers to enable driver-based planning</p>
              </CardContent>
            </Card>
          ) : (
            drivers.map((driver) => (
              <Card key={driver.id} className="bg-navy-800 border-navy-700 hover:border-gold-500/30 transition-all">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-white text-lg">{driver.name}</CardTitle>
                    <Badge className={getTypeColor(driver.driver_type)}>{driver.driver_type}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="bg-navy-900 rounded p-3 mb-3">
                    <code className="text-sm text-gray-300 break-all">{driver.formula}</code>
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white"
                      onClick={() => {
                        setSelectedDriver(driver);
                        setShowEdit(true);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300"
                      onClick={() => deleteDriver(driver.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Placeholder components for other FP&A pages
const FPASetupIntegrations = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-white">Setup Integrations</h2>
      <p className="text-gray-400">Connect FP&A module to data sources</p>
    </div>
    <Card className="bg-navy-800 border-navy-700">
      <CardContent className="py-16 text-center">
        <GitBranch className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Integration Hub</h3>
        <p className="text-gray-400">Connect your ERP, data warehouse, and other systems</p>
      </CardContent>
    </Card>
  </div>
);

const FPAScenarioPlanning = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-white">Scenario Planning</h2>
      <p className="text-gray-400">Model different business outcomes</p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <ScenarioCard title="Best Case" description="Optimistic growth scenario" color="green" />
      <ScenarioCard title="Base Case" description="Most likely outcome" color="blue" />
      <ScenarioCard title="Worst Case" description="Conservative scenario" color="red" />
    </div>
  </div>
);

const ScenarioCard = ({ title, description, color }) => {
  const colors = {
    green: 'border-green-500/30 bg-green-500/10',
    blue: 'border-blue-500/30 bg-blue-500/10',
    red: 'border-red-500/30 bg-red-500/10'
  };
  return (
    <Card className={`border ${colors[color]} bg-navy-800`}>
      <CardHeader>
        <CardTitle className="text-white">{title}</CardTitle>
        <CardDescription className="text-gray-400">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="w-full border-navy-600 text-white">
          Configure Scenario
        </Button>
      </CardContent>
    </Card>
  );
};

const FPARollingForecast = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-white">Rolling Forecast</h2>
      <p className="text-gray-400">Continuous 12-18 month forecasting</p>
    </div>
    <Card className="bg-navy-800 border-navy-700">
      <CardHeader>
        <CardTitle className="text-white">Forecast Configuration</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-300">Rolling Window</span>
          <Badge className="bg-gold-500/20 text-gold-400">12 Months</Badge>
        </div>
        <Progress value={75} className="h-2" />
        <p className="text-sm text-gray-400">9 of 12 months forecasted</p>
      </CardContent>
    </Card>
  </div>
);

const FPAUserPermissions = () => (
  <div className="space-y-6">
    <div>
      <h2 className="text-2xl font-bold text-white">User Permissions</h2>
      <p className="text-gray-400">Manage access to FP&A features</p>
    </div>
    <Card className="bg-navy-800 border-navy-700">
      <CardContent className="py-8">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Permission management coming soon</p>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Helper Components
const StatCard = ({ title, value, icon, description }) => (
  <Card className="bg-navy-800 border-navy-700">
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          <p className="text-sm text-gray-500 mt-1">{description}</p>
        </div>
        <div className="p-3 bg-gold-500/10 rounded-lg text-gold-400">
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const FeatureCard = ({ title, description, icon }) => (
  <Card className="bg-navy-800 border-navy-700">
    <CardHeader>
      <div className="p-3 bg-gold-500/10 rounded-lg w-fit text-gold-400 mb-2">
        {icon}
      </div>
      <CardTitle className="text-white">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-gray-400">{description}</p>
    </CardContent>
  </Card>
);

export default FPAModule;
