import React, { useState, useEffect } from 'react';
import { useAuth, API } from '../App';
import { toast } from 'sonner';
import { 
  Shield, Settings, Users, ToggleLeft, ToggleRight, Save, 
  AlertTriangle, CheckCircle, Eye, EyeOff, Lock, Unlock,
  Bot, Target, Search, DollarSign, FolderOpen, Globe, LogIn
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const AdminPanel = () => {
  const { authAxios, user } = useAuth();
  const [config, setConfig] = useState(null);
  const [draftConfig, setDraftConfig] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (config && draftConfig) {
      const changed = JSON.stringify(config) !== JSON.stringify(draftConfig);
      setHasChanges(changed);
    }
  }, [config, draftConfig]);

  const fetchData = async () => {
    try {
      const [configRes, usersRes] = await Promise.all([
        authAxios.get('/admin/config'),
        authAxios.get('/admin/users')
      ]);
      setConfig(configRes.data);
      setDraftConfig(configRes.data);
      setUsers(usersRes.data);
    } catch (err) {
      console.error('Error fetching admin data:', err);
      toast.error('Failed to load admin configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key) => {
    setDraftConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authAxios.put('/admin/config', draftConfig);
      setConfig(res.data);
      setDraftConfig(res.data);
      toast.success('Configuration saved successfully');
    } catch (err) {
      console.error('Error saving config:', err);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscardChanges = () => {
    setDraftConfig(config);
    toast.info('Changes discarded');
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await authAxios.put(`/admin/users/${userId}/role?role=${newRole}`);
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
      toast.success('User role updated');
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error(err.response?.data?.detail || 'Failed to update user role');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const featureToggles = [
    {
      key: 'enable_fetch_bridge',
      name: 'Agentic Fetch Bridge',
      description: 'AI agent that scans emails and cloud storage for missing invoices',
      icon: <Search className="w-5 h-5" />,
      category: 'agentic'
    },
    {
      key: 'enable_predictive_mapping',
      name: 'Predictive Mapping Engine',
      description: 'AI-powered COA mapping suggestions with anomaly detection',
      icon: <Target className="w-5 h-5" />,
      category: 'agentic'
    },
    {
      key: 'enable_variance_resolver',
      name: 'Forensic Variance Resolver',
      description: 'AI agent that investigates and resolves intercompany variances',
      icon: <Bot className="w-5 h-5" />,
      category: 'agentic'
    },
    {
      key: 'enable_strategic_capital',
      name: 'Strategic Capital/Loan Monitoring',
      description: 'Real-time covenant monitoring and capital management',
      icon: <DollarSign className="w-5 h-5" />,
      category: 'feature'
    },
    {
      key: 'enable_data_room',
      name: 'Lender-Ready Data Room',
      description: 'Secure document repository for lender communications',
      icon: <FolderOpen className="w-5 h-5" />,
      category: 'feature'
    }
  ];

  const visibilityToggles = [
    {
      key: 'site_landing_visible',
      name: 'Public Landing Page',
      description: 'Show or hide the public-facing landing page',
      icon: <Globe className="w-5 h-5" />,
      enabledText: 'Visible',
      disabledText: 'Hidden'
    },
    {
      key: 'site_login_allowed',
      name: 'Product Login Access',
      description: 'Enable or disable the login portal (shows maintenance message when disabled)',
      icon: <LogIn className="w-5 h-5" />,
      enabledText: 'Enabled',
      disabledText: 'Maintenance Mode'
    }
  ];

  return (
    <div className="space-y-6" data-testid="admin-panel">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-400" />
            Admin Control Panel
          </h1>
          <p className="text-gray-400 mt-1">Manage feature flags and system configuration</p>
        </div>
        {hasChanges && (
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={handleDiscardChanges}
              className="border-slate-600 text-gray-300 hover:bg-slate-700"
              data-testid="discard-changes-btn"
            >
              Discard
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              data-testid="save-changes-btn"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Changes Banner */}
      {hasChanges && (
        <Alert className="bg-amber-500/10 border-amber-500/30">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <AlertTitle className="text-amber-400">Unsaved Changes</AlertTitle>
          <AlertDescription className="text-amber-300">
            You have pending changes. Click "Save Changes" to apply them.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="features" className="space-y-6">
        <TabsList className="bg-slate-800 border-slate-700">
          <TabsTrigger value="features" className="data-[state=active]:bg-blue-600" data-testid="features-tab">
            <Settings className="w-4 h-4 mr-2" />
            Feature Toggles
          </TabsTrigger>
          <TabsTrigger value="visibility" className="data-[state=active]:bg-blue-600" data-testid="visibility-tab">
            <Eye className="w-4 h-4 mr-2" />
            Site Visibility
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-blue-600" data-testid="users-tab">
            <Users className="w-4 h-4 mr-2" />
            User Management
          </TabsTrigger>
        </TabsList>

        {/* Feature Toggles Tab */}
        <TabsContent value="features" className="space-y-6">
          {/* Agentic Features */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-purple-400" />
                Agentic Features
              </CardTitle>
              <CardDescription className="text-gray-400">
                AI-powered automation agents. These features are disabled by default for controlled rollout.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {featureToggles.filter(f => f.category === 'agentic').map((toggle) => (
                <FeatureToggleRow
                  key={toggle.key}
                  toggle={toggle}
                  enabled={draftConfig?.[toggle.key] || false}
                  onToggle={() => handleToggle(toggle.key)}
                />
              ))}
            </CardContent>
          </Card>

          {/* Product Features */}
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-400" />
                Product Features
              </CardTitle>
              <CardDescription className="text-gray-400">
                Core platform capabilities. Toggle these to control feature availability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {featureToggles.filter(f => f.category === 'feature').map((toggle) => (
                <FeatureToggleRow
                  key={toggle.key}
                  toggle={toggle}
                  enabled={draftConfig?.[toggle.key] || false}
                  onToggle={() => handleToggle(toggle.key)}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Site Visibility Tab */}
        <TabsContent value="visibility" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-green-400" />
                Public Access Controls
              </CardTitle>
              <CardDescription className="text-gray-400">
                Control public-facing pages and access to the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {visibilityToggles.map((toggle) => (
                <div 
                  key={toggle.key}
                  className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700"
                  data-testid={`visibility-toggle-${toggle.key}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-lg ${draftConfig?.[toggle.key] ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {toggle.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-medium">{toggle.name}</h4>
                      <p className="text-gray-400 text-sm">{toggle.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge 
                      variant="outline" 
                      className={draftConfig?.[toggle.key] 
                        ? 'border-green-500/50 text-green-400' 
                        : 'border-red-500/50 text-red-400'
                      }
                    >
                      {draftConfig?.[toggle.key] ? toggle.enabledText : toggle.disabledText}
                    </Badge>
                    <Switch
                      checked={draftConfig?.[toggle.key] || false}
                      onCheckedChange={() => handleToggle(toggle.key)}
                      className="data-[state=checked]:bg-green-500"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Warning for maintenance mode */}
          {!draftConfig?.site_login_allowed && (
            <Alert className="bg-red-500/10 border-red-500/30">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <AlertTitle className="text-red-400">Maintenance Mode Active</AlertTitle>
              <AlertDescription className="text-red-300">
                When login is disabled, users will see a "System Under Maintenance" message. 
                Existing logged-in sessions will continue to work until they expire.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                User Management
              </CardTitle>
              <CardDescription className="text-gray-400">
                Manage user roles and permissions. Admins have full access to this control panel.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-gray-400">Name</TableHead>
                    <TableHead className="text-gray-400">Email</TableHead>
                    <TableHead className="text-gray-400">Role</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} className="border-slate-700" data-testid={`user-row-${u.id}`}>
                      <TableCell className="text-white font-medium">
                        {u.name}
                        {u.id === user?.id && (
                          <Badge className="ml-2 bg-blue-500/20 text-blue-400">You</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-gray-400">{u.email}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={u.role === 'admin' 
                            ? 'border-purple-500/50 text-purple-400' 
                            : 'border-slate-500/50 text-slate-400'
                          }
                        >
                          {u.role === 'admin' ? (
                            <><Shield className="w-3 h-3 mr-1" /> Admin</>
                          ) : (
                            <><Users className="w-3 h-3 mr-1" /> Tenant</>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onValueChange={(value) => handleRoleChange(u.id, value)}
                          disabled={u.id === user?.id}
                        >
                          <SelectTrigger className="w-[140px] bg-slate-900 border-slate-600 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-600">
                            <SelectItem value="admin" className="text-white hover:bg-slate-700">
                              Admin
                            </SelectItem>
                            <SelectItem value="tenant" className="text-white hover:bg-slate-700">
                              Tenant
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Last Updated Info */}
      {config?.updated_at && (
        <div className="text-sm text-gray-500 text-right">
          Last updated: {new Date(config.updated_at).toLocaleString()}
        </div>
      )}
    </div>
  );
};

const FeatureToggleRow = ({ toggle, enabled, onToggle }) => (
  <div 
    className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700"
    data-testid={`feature-toggle-${toggle.key}`}
  >
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${enabled ? 'bg-green-500/10 text-green-400' : 'bg-slate-700 text-gray-400'}`}>
        {toggle.icon}
      </div>
      <div>
        <h4 className="text-white font-medium">{toggle.name}</h4>
        <p className="text-gray-400 text-sm">{toggle.description}</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <Badge 
        variant="outline" 
        className={enabled 
          ? 'border-green-500/50 text-green-400' 
          : 'border-slate-500/50 text-slate-400'
        }
      >
        {enabled ? 'Enabled' : 'Disabled'}
      </Badge>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        className="data-[state=checked]:bg-green-500"
      />
    </div>
  </div>
);

export default AdminPanel;
