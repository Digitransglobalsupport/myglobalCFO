import React, { useState, useEffect } from 'react';
import { useAuth, useApp } from '../App';
import { toast } from 'sonner';
import {
  Layout, Settings, Plus, Trash2, GripVertical, Eye, EyeOff, ChevronDown,
  Check, RotateCcw, Save, Users, Briefcase, PieChart, Share2, Lock, Edit2, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';

// Default tabs configuration
const DEFAULT_TABS = [
  { id: 'command-centre', name: 'Command Centre', path: '/dashboard', visible: true, order: 1, icon: 'gauge', locked: true },
  { id: 'financial-management', name: 'Financial Management', path: '/dashboard/financial-management', visible: true, order: 2, icon: 'receipt' },
  { id: 'fpa', name: 'FP&A', path: '/dashboard/fpa', visible: true, order: 3, icon: 'calculator' },
  { id: 'strategic-capital', name: 'Strategic Capital', path: '/dashboard/strategic-capital', visible: true, order: 4, icon: 'wallet' },
  { id: 'consolidation', name: 'Consolidation', path: '/dashboard/consolidation', visible: true, order: 5, icon: 'layers' },
  { id: 'ai-advisor', name: 'AI Financial Advisor', path: '/dashboard/ai-advisor', visible: true, order: 6, icon: 'bot' },
  { id: 'integrations', name: 'Integrations', path: '/dashboard/integrations', visible: true, order: 7, icon: 'plug' },
  { id: 'settings', name: 'Settings', path: '/dashboard/settings', visible: true, order: 8, icon: 'settings' },
];

// Role template icons
const roleIcons = {
  cfo: Briefcase,
  fpa: PieChart,
  investor_relations: Users
};

// Dashboard Layout Manager Component
export const DashboardLayoutManager = () => {
  const { authAxios } = useAuth();
  const [layouts, setLayouts] = useState([]);
  const [activeLayout, setActiveLayout] = useState(null);
  const [tabs, setTabs] = useState(DEFAULT_TABS);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [editingTab, setEditingTab] = useState(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    fetchLayouts();
    loadActiveLayout();
  }, []);

  const fetchLayouts = async () => {
    try {
      const res = await authAxios.get('/dashboard-layouts', { params: { include_templates: true } });
      setLayouts(res.data);
    } catch (e) {
      console.error('Error fetching layouts:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadActiveLayout = async () => {
    try {
      const res = await authAxios.get('/user/preferences/active_layout');
      if (res.data && res.data.preferences) {
        const prefs = res.data.preferences;
        if (prefs.tabs && prefs.tabs.length > 0) {
          setTabs(prefs.tabs);
        }
        setActiveLayout(prefs.active_layout_id);
      } else {
        // Use cached from localStorage
        const cached = localStorage.getItem('dashboard_layout');
        if (cached) {
          const cachedLayout = JSON.parse(cached);
          setTabs(cachedLayout.tabs || DEFAULT_TABS);
        }
      }
    } catch (e) {
      console.log('No active layout found');
    }
  };

  const applyLayout = async (layoutId) => {
    try {
      const res = await authAxios.post(`/dashboard-layouts/${layoutId}/apply`);
      const layout = res.data.layout;
      
      if (layout.tabs) {
        // Merge with default tabs to ensure all routes work
        const mergedTabs = DEFAULT_TABS.map(defaultTab => {
          const layoutTab = layout.tabs.find(t => t.id === defaultTab.id);
          return layoutTab ? { ...defaultTab, ...layoutTab } : defaultTab;
        });
        setTabs(mergedTabs);
        localStorage.setItem('dashboard_layout', JSON.stringify({ tabs: mergedTabs }));
      }
      
      setActiveLayout(layoutId);
      toast.success(`Applied "${layout.name}" layout`);
      setHasChanges(false);
    } catch (e) {
      toast.error('Failed to apply layout');
    }
  };

  const toggleTabVisibility = (tabId) => {
    const tab = tabs.find(t => t.id === tabId);
    if (tab?.locked) {
      toast.error('This tab cannot be hidden');
      return;
    }
    
    setTabs(prev => prev.map(t => 
      t.id === tabId ? { ...t, visible: !t.visible } : t
    ));
    setHasChanges(true);
  };

  const updateTabName = (tabId, newName) => {
    setTabs(prev => prev.map(t => 
      t.id === tabId ? { ...t, name: newName } : t
    ));
    setHasChanges(true);
    setEditingTab(null);
  };

  const reorderTabs = (fromIndex, toIndex) => {
    const newTabs = [...tabs];
    const [movedTab] = newTabs.splice(fromIndex, 1);
    newTabs.splice(toIndex, 0, movedTab);
    
    // Update order values
    const reorderedTabs = newTabs.map((t, i) => ({ ...t, order: i + 1 }));
    setTabs(reorderedTabs);
    setHasChanges(true);
  };

  const saveCurrentLayout = async () => {
    try {
      await authAxios.put('/user/preferences/active_layout', {
        preferences: {
          tabs,
          active_layout_id: 'custom'
        }
      });
      localStorage.setItem('dashboard_layout', JSON.stringify({ tabs }));
      toast.success('Layout saved');
      setHasChanges(false);
    } catch (e) {
      toast.error('Failed to save layout');
    }
  };

  const createNewLayout = async () => {
    if (!newLayoutName.trim()) {
      toast.error('Please enter a layout name');
      return;
    }
    
    try {
      const res = await authAxios.post('/dashboard-layouts', {
        name: newLayoutName,
        tabs,
        widgets: {}
      });
      
      toast.success(`Layout "${newLayoutName}" created`);
      setNewLayoutName('');
      setShowCreateDialog(false);
      fetchLayouts();
    } catch (e) {
      toast.error('Failed to create layout');
    }
  };

  const deleteLayout = async (layoutId) => {
    try {
      await authAxios.delete(`/dashboard-layouts/${layoutId}`);
      toast.success('Layout deleted');
      fetchLayouts();
    } catch (e) {
      toast.error('Failed to delete layout');
    }
  };

  const resetToDefault = () => {
    setTabs(DEFAULT_TABS);
    setHasChanges(true);
    toast.success('Reset to default layout');
  };

  // Separate templates and user layouts
  const templates = layouts.filter(l => l.is_role_template);
  const userLayouts = layouts.filter(l => !l.is_role_template);

  return (
    <div className="space-y-6" data-testid="dashboard-layout-manager">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center">
            <Layout className="w-5 h-5 mr-2 text-gold-400" />
            Dashboard Layout
          </h2>
          <p className="text-gray-400 text-sm">Customize your navigation tabs and dashboard views</p>
        </div>
        <div className="flex items-center space-x-2">
          {hasChanges && (
            <Badge className="bg-yellow-500/20 text-yellow-400">Unsaved Changes</Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-navy-600 text-gray-400"
            onClick={resetToDefault}
          >
            <RotateCcw className="w-4 h-4 mr-1" /> Reset
          </Button>
          <Button
            className="bg-gold-500 hover:bg-gold-600 text-navy-900"
            onClick={saveCurrentLayout}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4 mr-2" /> Save Layout
          </Button>
        </div>
      </div>

      {/* Role-Based Templates */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Role-Based Templates</CardTitle>
          <CardDescription className="text-gray-400">
            Pre-configured layouts optimized for specific roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((template) => {
              const IconComponent = roleIcons[template.role_name] || Layout;
              const isActive = activeLayout === template.id;
              
              return (
                <button
                  key={template.id}
                  onClick={() => applyLayout(template.id)}
                  className={cn(
                    "p-4 rounded-lg border text-left transition-all",
                    isActive
                      ? "bg-gold-500/20 border-gold-500/50"
                      : "bg-navy-900 border-navy-700 hover:border-gold-500/30"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="p-2 rounded-lg bg-navy-700">
                      <IconComponent className={cn(
                        "w-5 h-5",
                        isActive ? "text-gold-400" : "text-gray-400"
                      )} />
                    </div>
                    {isActive && (
                      <Badge className="bg-gold-500/20 text-gold-400">Active</Badge>
                    )}
                  </div>
                  <h3 className={cn(
                    "font-semibold mt-3",
                    isActive ? "text-gold-400" : "text-white"
                  )}>{template.name}</h3>
                  <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {template.tabs?.slice(0, 3).map(tab => (
                      <Badge key={tab.id} variant="outline" className="text-[10px] border-navy-600 text-gray-400">
                        {tab.name}
                      </Badge>
                    ))}
                    {template.tabs?.length > 3 && (
                      <Badge variant="outline" className="text-[10px] border-navy-600 text-gray-400">
                        +{template.tabs.length - 3} more
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Tab Configuration */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white text-lg flex items-center justify-between">
            <span>Tab Management</span>
            <Button
              size="sm"
              variant="outline"
              className="border-gold-500/50 text-gold-400"
              onClick={() => setShowCreateDialog(true)}
            >
              <Plus className="w-4 h-4 mr-1" /> Save as Template
            </Button>
          </CardTitle>
          <CardDescription className="text-gray-400">
            Show, hide, or rename navigation tabs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {tabs.sort((a, b) => a.order - b.order).map((tab, index) => (
              <div
                key={tab.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg transition-all",
                  tab.visible ? "bg-navy-900" : "bg-navy-900/50 opacity-60"
                )}
              >
                <div className="flex items-center space-x-3">
                  <GripVertical className="w-4 h-4 text-gray-600 cursor-grab" />
                  
                  {editingTab === tab.id ? (
                    <div className="flex items-center space-x-2">
                      <Input
                        autoFocus
                        defaultValue={tab.name}
                        className="h-8 w-48 bg-navy-800 border-navy-600 text-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateTabName(tab.id, e.target.value);
                          } else if (e.key === 'Escape') {
                            setEditingTab(null);
                          }
                        }}
                        onBlur={(e) => updateTabName(tab.id, e.target.value)}
                      />
                    </div>
                  ) : (
                    <span className="text-white font-medium">{tab.name}</span>
                  )}
                  
                  {tab.locked && (
                    <Lock className="w-3 h-3 text-gray-500" title="This tab cannot be hidden" />
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {!tab.locked && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-gray-400 hover:text-white"
                      onClick={() => setEditingTab(tab.id)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    className={cn(
                      "h-8 w-8",
                      tab.visible ? "text-green-400" : "text-gray-500"
                    )}
                    onClick={() => toggleTabVisibility(tab.id)}
                    disabled={tab.locked}
                  >
                    {tab.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* User Saved Layouts */}
      {userLayouts.length > 0 && (
        <Card className="bg-navy-800 border-navy-700">
          <CardHeader>
            <CardTitle className="text-white text-lg">My Saved Layouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {userLayouts.map((layout) => (
                <div
                  key={layout.id}
                  className="flex items-center justify-between p-3 bg-navy-900 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <Layout className="w-4 h-4 text-gray-400" />
                    <span className="text-white">{layout.name}</span>
                    {activeLayout === layout.id && (
                      <Badge className="bg-gold-500/20 text-gold-400">Active</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white"
                      onClick={() => applyLayout(layout.id)}
                    >
                      Apply
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:text-red-300">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-navy-800 border-navy-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Delete Layout?</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            This will permanently delete &quot;{layout.name}&quot;.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-navy-700 text-white">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => deleteLayout(layout.id)}
                            className="bg-red-500 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Layout Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-navy-800 border-navy-700">
          <DialogHeader>
            <DialogTitle className="text-white">Save Current Layout</DialogTitle>
            <DialogDescription className="text-gray-400">
              Save your current tab configuration as a reusable layout
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label className="text-gray-300">Layout Name</Label>
              <Input
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                placeholder="e.g., My Custom View"
                className="bg-navy-900 border-navy-600 text-white"
              />
            </div>
            <div className="p-3 bg-navy-900 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">Tabs included:</p>
              <div className="flex flex-wrap gap-1">
                {tabs.filter(t => t.visible).map(tab => (
                  <Badge key={tab.id} className="bg-navy-700 text-gray-300">{tab.name}</Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="border-navy-600 text-white">
              Cancel
            </Button>
            <Button onClick={createNewLayout} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
              Save Layout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Compact Layout Switcher for Header/Sidebar
export const LayoutSwitcher = ({ className }) => {
  const { authAxios } = useAuth();
  const [layouts, setLayouts] = useState([]);
  const [activeLayout, setActiveLayout] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetchLayouts();
  }, []);

  const fetchLayouts = async () => {
    try {
      const [layoutsRes, prefRes] = await Promise.all([
        authAxios.get('/dashboard-layouts', { params: { include_templates: true } }),
        authAxios.get('/user/preferences/active_layout')
      ]);
      setLayouts(layoutsRes.data);
      if (prefRes.data?.preferences?.active_layout_id) {
        setActiveLayout(prefRes.data.preferences.active_layout_id);
      }
    } catch (e) {
      console.error('Error fetching layouts');
    }
  };

  const applyLayout = async (layoutId) => {
    try {
      await authAxios.post(`/dashboard-layouts/${layoutId}/apply`);
      setActiveLayout(layoutId);
      setOpen(false);
      toast.success('Layout applied');
      // Reload page to apply new navigation
      window.location.reload();
    } catch (e) {
      toast.error('Failed to apply layout');
    }
  };

  const currentLayout = layouts.find(l => l.id === activeLayout);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("text-gray-400 hover:text-white", className)}
        >
          <Layout className="w-4 h-4 mr-2" />
          {currentLayout?.name || 'Default Layout'}
          <ChevronDown className="w-4 h-4 ml-1 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-navy-800 border-navy-700 p-1" align="start">
        <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1">
          Quick Switch
        </div>
        {layouts.slice(0, 5).map((layout) => (
          <button
            key={layout.id}
            className={cn(
              "w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between",
              activeLayout === layout.id
                ? "bg-gold-500/20 text-gold-400"
                : "text-white hover:bg-navy-700"
            )}
            onClick={() => applyLayout(layout.id)}
          >
            <span className="flex items-center">
              <Layout className="w-4 h-4 mr-2 opacity-50" />
              {layout.name}
            </span>
            {activeLayout === layout.id && <Check className="w-4 h-4" />}
          </button>
        ))}
        <Separator className="my-1 bg-navy-700" />
        <button
          className="w-full text-left px-3 py-2 rounded text-sm text-gray-400 hover:bg-navy-700 flex items-center"
          onClick={() => {
            setOpen(false);
            window.location.href = '/dashboard/settings?tab=layouts';
          }}
        >
          <Settings className="w-4 h-4 mr-2" />
          Manage Layouts...
        </button>
      </PopoverContent>
    </Popover>
  );
};

export default DashboardLayoutManager;
