import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAuth, useApp } from '../App';
import { toast } from 'sonner';
import {
  Calculator, LayoutDashboard, FileSpreadsheet, Cog, GitBranch, LineChart,
  Users, Gauge, Plus, Lock, Unlock, Trash2, Eye, Zap, Brain,
  TrendingUp, AlertTriangle, Building2, RefreshCcw, CheckCircle, Clock
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

const FPAModule = () => {
  const location = useLocation();

  const navItems = [
    { path: '/dashboard/fpa', label: 'Overview', icon: LayoutDashboard, exact: true },
    { path: '/dashboard/fpa/planning', label: 'Planning', icon: FileSpreadsheet },
    { path: '/dashboard/fpa/drivers', label: 'Drivers', icon: Cog },
    { path: '/dashboard/fpa/setup-integrations', label: 'Setup Integrations', icon: GitBranch },
    { path: '/dashboard/fpa/scenario-planning', label: 'Scenarios', icon: LineChart },
    { path: '/dashboard/fpa/rolling-forecast', label: 'Rolling Forecast', icon: TrendingUp },
    { path: '/dashboard/fpa/user-permissions', label: 'Permissions', icon: Users },
    { path: '/dashboard/fpa/command-center', label: 'Command Center', icon: Gauge }
  ];

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="space-y-6">
      {/* FP&A Navigation */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2">
        {navItems.map((item) => (
          <Link key={item.path} to={item.path}>
            <Button
              variant={isActive(item.path, item.exact) ? 'default' : 'outline'}
              className={isActive(item.path, item.exact)
                ? 'bg-gold-500 text-navy-900'
                : 'border-navy-600 text-gray-300 hover:text-white'
              }
            >
              <item.icon className="w-4 h-4 mr-2" />
              {item.label}
            </Button>
          </Link>
        ))}
      </div>

      {/* Routes */}
      <Routes>
        <Route index element={<FPAOverview />} />
        <Route path="planning" element={<FPAPlanning />} />
        <Route path="drivers" element={<FPADrivers />} />
        <Route path="setup-integrations" element={<FPASetupIntegrations />} />
        <Route path="scenario-planning" element={<FPAScenarioPlanning />} />
        <Route path="rolling-forecast" element={<FPARollingForecast />} />
        <Route path="user-permissions" element={<FPAUserPermissions />} />
        <Route path="command-center" element={<FPACommandCenter />} />
      </Routes>
    </div>
  );
};

// FP&A Overview
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
    planning_dimensions: 42,
    planning_versions: 3,
    drivers_count: 12,
    integrations_count: 2,
    entities_count: 3
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">FP&A Overview</h1>
        <p className="text-gray-400 mt-1">Financial Planning & Analysis Module</p>
      </div>

      {/* Quick Stats */}
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

      {/* Quick Actions */}
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
            <Link to="/dashboard/fpa/user-permissions">
              <Button variant="outline" className="border-navy-600 text-white">
                <Users className="w-4 h-4 mr-2" /> User Permissions
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Feature Highlights */}
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
    </div>
  );
};

// FP&A Planning
const FPAPlanning = () => {
  const { authAxios } = useAuth();
  const { companies, selectedCompany } = useApp();
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  // New version form
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
  }, []);

  const fetchVersions = async () => {
    try {
      const res = await authAxios.get('/fpa/versions');
      setVersions(res.data);
      if (res.data.length > 0) setSelectedVersion(res.data[0]);
    } catch (e) {
      console.error('Error fetching versions:', e);
    } finally {
      setLoading(false);
    }
  };

  const createVersion = async () => {
    if (!selectedCompany) {
      toast.error('Please select a company first');
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
      toast.error('Failed to create version');
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

  const deleteVersion = async (versionId) => {
    try {
      await authAxios.delete(`/fpa/versions/${versionId}`);
      toast.success('Version deleted');
      fetchVersions();
    } catch (e) {
      toast.error('Failed to delete version');
    }
  };

  const getTypeBadge = (type) => {
    const colors = {
      'Budget': 'bg-blue-500/20 text-blue-400',
      'Forecast': 'bg-purple-500/20 text-purple-400',
      'Actuals': 'bg-green-500/20 text-green-400',
      'Scenario': 'bg-orange-500/20 text-orange-400'
    };
    return <Badge className={colors[type]}>{type}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Planning Versions</h2>
          <p className="text-gray-400">Create and manage budget and forecast versions</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="border-navy-600 text-white">
            <Brain className="w-4 h-4 mr-2" /> AI Forecast
          </Button>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900">
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
                    placeholder="e.g., 2024 Budget"
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
                <Button onClick={createVersion} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
                  Create
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Versions Table */}
      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="p-0">
          {versions.length === 0 ? (
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
                  <TableHead className="text-gray-400">Period</TableHead>
                  <TableHead className="text-gray-400">Rolling</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versions.map((version) => (
                  <TableRow key={version.id} className="border-navy-700 hover:bg-navy-700/50">
                    <TableCell className="text-white font-medium">{version.name}</TableCell>
                    <TableCell>{getTypeBadge(version.version_type)}</TableCell>
                    <TableCell className="text-gray-300">
                      {version.start_period} - {version.end_period} {version.fiscal_year}
                    </TableCell>
                    <TableCell>
                      {version.is_rolling ? (
                        <Badge className="bg-gold-500/20 text-gold-400">{version.rolling_months}mo Rolling</Badge>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {version.is_locked ? (
                        <Badge className="bg-red-500/20 text-red-400"><Lock className="w-3 h-3 mr-1" /> Locked</Badge>
                      ) : (
                        <Badge className="bg-green-500/20 text-green-400"><Unlock className="w-3 h-3 mr-1" /> Open</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                          onClick={() => toggleLock(version.id)}
                        >
                          {version.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => deleteVersion(version.id)}
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

// FP&A Drivers
const FPADrivers = () => {
  const { authAxios } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: '',
    formula: '',
    driver_type: 'Revenue',
    linked_accounts: []
  });

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const res = await authAxios.get('/fpa/drivers');
      setDrivers(res.data);
    } catch (e) {
      console.error('Error fetching drivers:', e);
    }
  };

  const createDriver = async () => {
    try {
      await authAxios.post('/fpa/drivers', newDriver);
      toast.success('Driver created successfully!');
      setShowCreate(false);
      fetchDrivers();
      setNewDriver({ name: '', formula: '', driver_type: 'Revenue', linked_accounts: [] });
    } catch (e) {
      toast.error('Failed to create driver');
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Drivers & Formulas</h2>
          <p className="text-gray-400">Define operational drivers for dynamic modeling</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900">
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
                    <SelectItem value="Revenue" className="text-white">Revenue Driver</SelectItem>
                    <SelectItem value="Cost" className="text-white">Cost Driver</SelectItem>
                    <SelectItem value="Operational" className="text-white">Operational Driver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Formula</Label>
                <Input
                  value={newDriver.formula}
                  onChange={(e) => setNewDriver({ ...newDriver, formula: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white font-mono"
                  placeholder="e.g., [Headcount] * [Avg Salary]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-navy-600 text-white">
                Cancel
              </Button>
              <Button onClick={createDriver} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

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
            <Card key={driver.id} className="bg-navy-800 border-navy-700">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-white">{driver.name}</CardTitle>
                  <Badge className="bg-gold-500/20 text-gold-400">{driver.driver_type}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="bg-navy-900 rounded p-2 mb-3">
                  <code className="text-sm text-gray-300">{driver.formula}</code>
                </div>
                <div className="flex justify-end">
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

const FPACommandCenter = () => (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-2xl font-bold text-white">Command Centre</h2>
        <p className="text-gray-400">Strategic Analytics & Sync Layer</p>
      </div>
      <Button variant="outline" className="border-navy-600 text-white">
        <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
      </Button>
    </div>

    {/* AI Executive Summary */}
    <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-500/30">
      <CardContent className="py-6">
        <div className="flex items-start space-x-4">
          <Brain className="w-8 h-8 text-blue-400" />
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">AI Executive Summary</h3>
            <p className="text-gray-300">
              Overall financial health is strong with 25% EBITDA margin. Cash runway of 145 days 
              provides adequate buffer. Recommend focusing on AR collection to improve working capital. 
              Marketing spend showing positive ROI - consider scaling successful campaigns.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Anomaly Alerts */}
    <Card className="bg-navy-800 border-navy-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2 text-yellow-400" />
          Anomalies Detected (3)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <AnomalyItem metric="Marketing Spend" current="£125K" expected="£95K-£110K" deviation="+14%" />
          <AnomalyItem metric="DSO" current="45 days" expected="30-35 days" deviation="+33%" negative />
          <AnomalyItem metric="Gross Margin" current="68%" expected="62-65%" deviation="+5%" positive />
        </div>
      </CardContent>
    </Card>

    {/* Four Quadrants */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <QuadrantCard title="Profitability & Unit Economics" icon={<TrendingUp />}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">Revenue</span><span className="text-white">£1.25M</span></div>
          <div className="flex justify-between"><span className="text-gray-400">EBITDA</span><span className="text-white">£312.5K</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Margin</span><span className="text-green-400">25%</span></div>
        </div>
      </QuadrantCard>
      <QuadrantCard title="Operational Efficiency" icon={<Gauge />}>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-400">DSO</span><span className="text-yellow-400">45 days</span></div>
          <div className="flex justify-between"><span className="text-gray-400">DPO</span><span className="text-white">38 days</span></div>
          <div className="flex justify-between"><span className="text-gray-400">CCC</span><span className="text-white">52 days</span></div>
        </div>
      </QuadrantCard>
      <QuadrantCard title="Strategic What-If" icon={<LineChart />}>
        <div className="text-center py-4">
          <Button variant="outline" className="border-navy-600 text-white">Run Scenario Analysis</Button>
        </div>
      </QuadrantCard>
      <QuadrantCard title="Sync Status" icon={<RefreshCcw />}>
        <div className="space-y-2 text-sm">
          <SyncStatus name="Xero" status="synced" time="2 min ago" />
          <SyncStatus name="QuickBooks" status="synced" time="5 min ago" />
          <SyncStatus name="TrueLayer" status="pending" time="Syncing..." />
        </div>
      </QuadrantCard>
    </div>
  </div>
);

const AnomalyItem = ({ metric, current, expected, deviation, positive, negative }) => (
  <div className="flex items-center justify-between p-3 bg-navy-900 rounded-lg">
    <div>
      <p className="text-white font-medium">{metric}</p>
      <p className="text-sm text-gray-400">Expected: {expected}</p>
    </div>
    <div className="text-right">
      <p className="text-white">{current}</p>
      <p className={`text-sm ${positive ? 'text-green-400' : negative ? 'text-red-400' : 'text-yellow-400'}`}>
        {deviation}
      </p>
    </div>
  </div>
);

const QuadrantCard = ({ title, icon, children }) => (
  <Card className="bg-navy-800 border-navy-700">
    <CardHeader className="pb-2">
      <CardTitle className="text-white text-lg flex items-center">
        <span className="text-gold-400 mr-2">{icon}</span>
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>{children}</CardContent>
  </Card>
);

const SyncStatus = ({ name, status, time }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-300">{name}</span>
    <div className="flex items-center">
      {status === 'synced' ? (
        <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
      ) : (
        <Clock className="w-4 h-4 text-yellow-400 mr-2 animate-pulse" />
      )}
      <span className="text-sm text-gray-400">{time}</span>
    </div>
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
