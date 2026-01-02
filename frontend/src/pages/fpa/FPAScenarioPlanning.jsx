import { useState, useEffect, useContext } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { FPACurrencyContext } from './FPALayout';
import { formatCurrency as formatCurrencyUtil } from '@/utils/currencyUtils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import axios from 'axios';
import { API } from '@/App';
import { Copy, ArrowRightLeft, TrendingUp, TrendingDown, GitCompare, Plus, Check, AlertCircle, Sliders, History, RotateCcw, Eye, Trash2, Pencil, Building2, BarChart3, Filter } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const FPAScenarioPlanning = () => {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const { currency } = useContext(FPACurrencyContext);
  const [versions, setVersions] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [assetScenarios, setAssetScenarios] = useState([]);
  const [baseVersions, setBaseVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scenarioFilter, setScenarioFilter] = useState('all'); // 'all', 'standard', 'asset'
  
  // Clone dialog state
  const [showScenarioTypeDialog, setShowScenarioTypeDialog] = useState(false);
  const [showCloneDialog, setShowCloneDialog] = useState(false);
  const [cloneForm, setCloneForm] = useState({
    base_version_id: '',
    new_name: '',
    scenario_description: ''
  });
  
  // Comparison state
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [comparisonForm, setComparisonForm] = useState({
    version_a_id: '',
    version_b_id: ''
  });
  const [comparisonResult, setComparisonResult] = useState(null);
  const [comparingVersions, setComparingVersions] = useState(false);
  
  // Interactive adjustment state
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [adjustments, setAdjustments] = useState({
    revenue_growth: 0,
    cost_of_sales_pct: 0,
    opex_change: 0,
    headcount_change: 0,
    custom_drivers: {}
  });
  const [previewData, setPreviewData] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  
  // History state
  const [activeTab, setActiveTab] = useState('scenarios');
  const [historyData, setHistoryData] = useState([]);
  const [selectedHistoryScenario, setSelectedHistoryScenario] = useState(null);
  const [historyView, setHistoryView] = useState('table'); // 'table' or 'feed'
  const [historyDetailLevel, setHistoryDetailLevel] = useState('detailed'); // 'high_level', 'detailed', 'full_audit'
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [restoreMode, setRestoreMode] = useState('create_new');
  const [newVersionName, setNewVersionName] = useState('');
  
  // Delete scenario state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [scenarioToDelete, setScenarioToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Edit scenario state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [scenarioToEdit, setScenarioToEdit] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', scenario_description: '' });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadVersions();
    loadAssetScenarios();
  }, []);

  const loadVersions = async () => {
    try {
      const response = await axios.get(`${API}/fpa/planning/versions`);
      const allVersions = response.data;
      
      // Separate scenarios from base versions
      const scenarioList = allVersions.filter(v => v.version_type === 'scenario');
      const baseList = allVersions.filter(v => v.version_type !== 'scenario');
      
      setVersions(allVersions);
      setScenarios(scenarioList);
      setBaseVersions(baseList);
      setLoading(false);
    } catch (error) {
      console.error('Error loading versions:', error);
      toast.error('Failed to load versions');
      setLoading(false);
    }
  };

  const loadAssetScenarios = async () => {
    try {
      const response = await axios.get(`${API}/fpa/assets/scenarios`);
      if (response.data.success) {
        setAssetScenarios(response.data.scenarios || []);
      }
    } catch (error) {
      console.error('Error loading asset scenarios:', error);
      // Don't show error - asset scenarios are optional
    }
  };

  const filteredScenarios = () => {
    if (scenarioFilter === 'standard') {
      return scenarios;
    } else if (scenarioFilter === 'asset') {
      return assetScenarios.map(a => ({
        ...a,
        type: 'asset',
        name: a.asset_name,
        description: a.scenario_description
      }));
    }
    // all
    const standardList = scenarios.map(s => ({ ...s, type: 'standard' }));
    const assetList = assetScenarios.map(a => ({
      ...a,
      type: 'asset',
      name: a.asset_name,
      description: a.scenario_description
    }));
    return [...standardList, ...assetList];
  };

  const handleCloneVersion = async () => {
    if (!cloneForm.base_version_id || !cloneForm.new_name) {
      toast.error('Please select a base version and provide a name');
      return;
    }

    try {
      const response = await axios.post(`${API}/fpa/phase4/scenario/clone`, cloneForm);
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowCloneDialog(false);
        setCloneForm({ base_version_id: '', new_name: '', scenario_description: '' });
        loadVersions();
      } else {
        toast.error(response.data.error || 'Failed to clone version');
      }
    } catch (error) {
      console.error('Error cloning version:', error);
      toast.error('Failed to clone version');
    }
  };

  const handleCompareVersions = async () => {
    if (!comparisonForm.version_a_id || !comparisonForm.version_b_id) {
      toast.error('Please select both versions to compare');
      return;
    }

    setComparingVersions(true);
    try {
      const response = await axios.post(`${API}/fpa/phase4/scenario/compare`, comparisonForm);
      
      if (response.data.success) {
        setComparisonResult(response.data);
        toast.success('Versions compared successfully');
      } else {
        toast.error(response.data.error || 'Failed to compare versions');
      }
    } catch (error) {
      console.error('Error comparing versions:', error);
      toast.error('Failed to compare versions');
    } finally {
      setComparingVersions(false);
    }
  };

  const getVersionBadge = (type) => {
    const badges = {
      'budget': { color: 'bg-blue-500', label: 'Budget' },
      'forecast': { color: 'bg-green-500', label: 'Forecast' },
      'actuals': { color: 'bg-purple-500', label: 'Actuals' },
      'scenario': { color: 'bg-orange-500', label: 'Scenario' }
    };
    const badge = badges[type] || { color: 'bg-gray-500', label: type };
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  const formatCurrency = (value) => {
    return formatCurrencyUtil(value, currency, { decimals: 0 });
  };
  
  // Calculate real-time preview based on adjustments
  const calculatePreview = (scenario, adjustments) => {
    if (!scenario) return null;
    
    // Mock baseline values (in real app, fetch from API)
    const baseline = {
      revenue: 1000000,
      cogs: 400000,
      opex: 300000,
      headcount: 50
    };
    
    // Apply adjustments
    const adjusted = {
      revenue: baseline.revenue * (1 + adjustments.revenue_growth / 100),
      cogs: baseline.revenue * (1 + adjustments.revenue_growth / 100) * 
             (0.4 + adjustments.cost_of_sales_pct / 100),
      opex: baseline.opex * (1 + adjustments.opex_change / 100),
      headcount: Math.round(baseline.headcount * (1 + adjustments.headcount_change / 100))
    };
    
    const baselineProfit = baseline.revenue - baseline.cogs - baseline.opex;
    const adjustedProfit = adjusted.revenue - adjusted.cogs - adjusted.opex;
    
    return {
      baseline,
      adjusted,
      variance: {
        revenue: adjusted.revenue - baseline.revenue,
        cogs: adjusted.cogs - baseline.cogs,
        opex: adjusted.opex - baseline.opex,
        profit: adjustedProfit - baselineProfit,
        headcount: adjusted.headcount - baseline.headcount
      }
    };
  };
  
  // Update preview whenever adjustments change
  useEffect(() => {
    if (selectedScenario) {
      const preview = calculatePreview(selectedScenario, adjustments);
      setPreviewData(preview);
    }
  }, [adjustments, selectedScenario]);
  
  const handleAdjustmentChange = (key, value) => {
    setAdjustments(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleApplyAdjustments = async () => {
    if (!selectedScenario) return;
    
    setIsApplying(true);
    try {
      const response = await axios.post(`${API}/fpa/phase4/scenario/adjust`, {
        scenario_id: selectedScenario.id,
        adjustments
      });
      
      if (response.data.success) {
        toast.success('Adjustments applied successfully!');
        setShowAdjustDialog(false);
        setAdjustments({
          revenue_growth: 0,
          cost_of_sales_pct: 0,
          opex_change: 0,
          headcount_change: 0,
          custom_drivers: {}
        });
        loadVersions();
      } else {
        toast.error(response.data.error || 'Failed to apply adjustments');
      }
    } catch (error) {
      console.error('Error applying adjustments:', error);
      toast.error('Failed to apply adjustments');
    } finally {
      setIsApplying(false);
    }
  };
  
  const resetAdjustments = () => {
    setAdjustments({
      revenue_growth: 0,
      cost_of_sales_pct: 0,
      opex_change: 0,
      headcount_change: 0,
      custom_drivers: {}
    });
  };
  
  const loadHistory = async (scenarioId) => {
    setLoadingHistory(true);
    try {
      const response = await axios.get(
        `${API}/fpa/phase4/scenario/${scenarioId}/history`,
        { params: { detail_level: historyDetailLevel } }
      );
      setHistoryData(response.data);
    } catch (error) {
      console.error('Error loading history:', error);
      toast.error('Failed to load history');
    } finally {
      setLoadingHistory(false);
    }
  };
  
  const handleRestoreVersion = async () => {
    if (!selectedHistory || !selectedHistoryScenario) return;
    
    if (restoreMode === 'create_new' && !newVersionName) {
      toast.error('Please enter a name for the new version');
      return;
    }
    
    try {
      const response = await axios.post(
        `${API}/fpa/phase4/scenario/${selectedHistoryScenario.id}/restore`,
        {
          history_id: selectedHistory.id,
          restore_mode: restoreMode,
          new_name: restoreMode === 'create_new' ? newVersionName : null
        }
      );
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowRestoreDialog(false);
        setNewVersionName('');
        loadVersions();
        loadHistory(selectedHistoryScenario.id);
      } else {
        toast.error(response.data.error || 'Failed to restore version');
      }
    } catch (error) {
      console.error('Error restoring version:', error);
      toast.error('Failed to restore version');
    }
  };
  
  const handleDeleteScenario = async () => {
    if (!scenarioToDelete) return;
    
    setIsDeleting(true);
    try {
      const response = await axios.delete(`${API}/fpa/phase4/scenario/${scenarioToDelete.id}`);
      
      if (response.data.success) {
        toast.success(response.data.message || 'Scenario deleted successfully');
        setShowDeleteDialog(false);
        setScenarioToDelete(null);
        loadVersions();
      } else {
        toast.error(response.data.error || 'Failed to delete scenario');
      }
    } catch (error) {
      console.error('Error deleting scenario:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete scenario';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };
  
  const handleEditScenario = async () => {
    if (!scenarioToEdit || !editForm.name.trim()) return;
    
    setIsEditing(true);
    try {
      const response = await axios.put(`${API}/fpa/phase4/scenario/${scenarioToEdit.id}`, {
        name: editForm.name.trim(),
        scenario_description: editForm.scenario_description.trim() || null
      });
      
      if (response.data.success) {
        toast.success(response.data.message || 'Scenario updated successfully');
        setShowEditDialog(false);
        setScenarioToEdit(null);
        setEditForm({ name: '', scenario_description: '' });
        loadVersions();
      } else {
        toast.error(response.data.error || 'Failed to update scenario');
      }
    } catch (error) {
      console.error('Error updating scenario:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update scenario';
      toast.error(errorMessage);
    } finally {
      setIsEditing(false);
    }
  };
  
  const openEditDialog = (scenario) => {
    setScenarioToEdit(scenario);
    setEditForm({
      name: scenario.name,
      scenario_description: scenario.scenario_description || ''
    });
    setShowEditDialog(true);
  };
  
  useEffect(() => {
    if (selectedHistoryScenario && activeTab === 'history') {
      loadHistory(selectedHistoryScenario.id);
    }
  }, [selectedHistoryScenario, historyDetailLevel, activeTab]);

  const getScenarioIcon = (type) => {
    if (type === 'asset') {
      return <Building2 className="h-5 w-5" />;
    }
    return <BarChart3 className="h-5 w-5" />;
  };

  const getScenarioTypeBadge = (type) => {
    if (type === 'asset') {
      return <Badge className="bg-purple-500 text-white">Asset-Based</Badge>;
    }
    return <Badge className="bg-blue-500 text-white">Standard</Badge>;
  };

  const handleScenarioClick = (scenario, type) => {
    if (type === 'asset') {
      navigate('/dashboard/fpa/asset-scenarios');
    } else {
      navigate(`/dashboard/fpa/planning?version=${scenario.id}`);
    }
  };

  if (loading) {
    return <div className="text-lg text-slate-600">Loading scenarios...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Scenario Planning</h2>
          <p className="text-sm text-slate-600">Create and compare what-if scenarios</p>
        </div>
        
        <div className="flex gap-3">
          {/* Filter Dropdown */}
          <Select value={scenarioFilter} onValueChange={setScenarioFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter scenarios" />
            </SelectTrigger>
            <SelectContent className="z-[150]">
              <SelectItem value="all">All Scenarios</SelectItem>
              <SelectItem value="standard">Standard Only</SelectItem>
              <SelectItem value="asset">Asset-Based Only</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={showAdjustDialog} onOpenChange={setShowAdjustDialog} modal={true}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="border-green-300 text-green-700 hover:bg-green-50"
                disabled={scenarios.length === 0}
              >
                <Sliders className="h-4 w-4 mr-2" />
                Adjust Scenario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto z-[100]">
              <DialogHeader>
                <DialogTitle>Interactive Scenario Adjustments</DialogTitle>
                <DialogDescription>
                  Use sliders to adjust key metrics and see real-time impact
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Scenario Selection */}
                <div>
                  <Label>Select Scenario to Adjust</Label>
                  <Select 
                    value={selectedScenario?.id}
                    onValueChange={(value) => {
                      const scenario = scenarios.find(s => s.id === value);
                      setSelectedScenario(scenario);
                      resetAdjustments();
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a scenario" />
                    </SelectTrigger>
                    <SelectContent className="z-[150]">
                      {scenarios.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {selectedScenario && (
                  <>
                    {/* Adjustment Sliders */}
                    <div className="space-y-6 bg-slate-50 p-4 rounded-lg">
                      <h4 className="font-medium text-slate-900">Adjustment Sliders</h4>
                      
                      {/* Revenue Growth */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Revenue Growth Rate</Label>
                          <Badge variant="outline">{adjustments.revenue_growth}%</Badge>
                        </div>
                        <Slider
                          value={[adjustments.revenue_growth]}
                          onValueChange={(value) => handleAdjustmentChange('revenue_growth', value[0])}
                          min={-50}
                          max={200}
                          step={1}
                          className="w-full"
                        />
                        <p className="text-xs text-slate-600">Range: -50% to +200%</p>
                      </div>
                      
                      {/* Cost of Sales */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Cost of Sales % Change</Label>
                          <Badge variant="outline">{adjustments.cost_of_sales_pct > 0 ? '+' : ''}{adjustments.cost_of_sales_pct}%</Badge>
                        </div>
                        <Slider
                          value={[adjustments.cost_of_sales_pct]}
                          onValueChange={(value) => handleAdjustmentChange('cost_of_sales_pct', value[0])}
                          min={-30}
                          max={30}
                          step={0.5}
                          className="w-full"
                        />
                        <p className="text-xs text-slate-600">Range: -30% to +30%</p>
                      </div>
                      
                      {/* Operating Expenses */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Operating Expenses Change</Label>
                          <Badge variant="outline">{adjustments.opex_change > 0 ? '+' : ''}{adjustments.opex_change}%</Badge>
                        </div>
                        <Slider
                          value={[adjustments.opex_change]}
                          onValueChange={(value) => handleAdjustmentChange('opex_change', value[0])}
                          min={-50}
                          max={100}
                          step={1}
                          className="w-full"
                        />
                        <p className="text-xs text-slate-600">Range: -50% to +100%</p>
                      </div>
                      
                      {/* Headcount */}
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Label>Headcount Change</Label>
                          <Badge variant="outline">{adjustments.headcount_change > 0 ? '+' : ''}{adjustments.headcount_change}%</Badge>
                        </div>
                        <Slider
                          value={[adjustments.headcount_change]}
                          onValueChange={(value) => handleAdjustmentChange('headcount_change', value[0])}
                          min={-50}
                          max={200}
                          step={5}
                          className="w-full"
                        />
                        <p className="text-xs text-slate-600">Range: -50% to +200%</p>
                      </div>
                    </div>
                    
                    {/* Real-time Preview */}
                    {previewData && (
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                        <h4 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Impact Preview
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white p-3 rounded border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">Revenue</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatCurrency(previewData.baseline.revenue)} → {formatCurrency(previewData.adjusted.revenue)}
                            </p>
                            <p className={`text-xs font-medium mt-1 ${previewData.variance.revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {previewData.variance.revenue >= 0 ? '+' : ''}{formatCurrency(previewData.variance.revenue)}
                            </p>
                          </div>
                          
                          <div className="bg-white p-3 rounded border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">COGS</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatCurrency(previewData.baseline.cogs)} → {formatCurrency(previewData.adjusted.cogs)}
                            </p>
                            <p className={`text-xs font-medium mt-1 ${previewData.variance.cogs <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {previewData.variance.cogs >= 0 ? '+' : ''}{formatCurrency(previewData.variance.cogs)}
                            </p>
                          </div>
                          
                          <div className="bg-white p-3 rounded border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">Operating Expenses</p>
                            <p className="text-sm font-semibold text-slate-900">
                              {formatCurrency(previewData.baseline.opex)} → {formatCurrency(previewData.adjusted.opex)}
                            </p>
                            <p className={`text-xs font-medium mt-1 ${previewData.variance.opex <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {previewData.variance.opex >= 0 ? '+' : ''}{formatCurrency(previewData.variance.opex)}
                            </p>
                          </div>
                          
                          <div className="bg-white p-3 rounded border border-slate-200">
                            <p className="text-xs text-slate-600 mb-1">Net Profit Impact</p>
                            <p className="text-lg font-bold text-slate-900">
                              {formatCurrency(Math.abs(previewData.variance.profit))}
                            </p>
                            <p className={`text-xs font-medium mt-1 ${previewData.variance.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {previewData.variance.profit >= 0 ? '↑ Increase' : '↓ Decrease'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-blue-900">Headcount</span>
                            <span className="text-sm font-semibold text-blue-900">
                              {previewData.baseline.headcount} → {previewData.adjusted.headcount}
                              <span className={`ml-2 ${previewData.variance.headcount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                ({previewData.variance.headcount >= 0 ? '+' : ''}{previewData.variance.headcount})
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t">
                      <Button 
                        onClick={resetAdjustments}
                        variant="outline"
                        className="flex-1"
                      >
                        Reset All
                      </Button>
                      <Button 
                        onClick={handleApplyAdjustments}
                        disabled={isApplying}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        {isApplying ? 'Applying...' : 'Apply Changes'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog} modal={true}>
            <DialogTrigger asChild>
              <Button variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-50">
                <GitCompare className="h-4 w-4 mr-2" />
                Compare Scenarios
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl z-[100]">
              <DialogHeader>
                <DialogTitle>Compare Scenarios</DialogTitle>
                <DialogDescription>
                  Compare two versions side-by-side to analyze variances
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Baseline Version</Label>
                    <Select 
                      value={comparisonForm.version_a_id}
                      onValueChange={(value) => setComparisonForm({...comparisonForm, version_a_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select baseline" />
                      </SelectTrigger>
                      <SelectContent className="z-[150]">
                        {versions.map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} ({v.version_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label>Compare To</Label>
                    <Select 
                      value={comparisonForm.version_b_id}
                      onValueChange={(value) => setComparisonForm({...comparisonForm, version_b_id: value})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent className="z-[150]">
                        {versions.map(v => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.name} ({v.version_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Button 
                  onClick={handleCompareVersions}
                  disabled={comparingVersions || !comparisonForm.version_a_id || !comparisonForm.version_b_id}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  {comparingVersions ? 'Comparing...' : 'Compare Versions'}
                </Button>
                
                {/* Comparison Results */}
                {comparisonResult && (
                  <div className="mt-6 space-y-4">
                    <div className="bg-slate-50 p-4 rounded-lg">
                      <h4 className="font-medium text-slate-900 mb-3">Overall Variance</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-slate-600">Baseline Total</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {formatCurrency(comparisonResult.version_a.total)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-600">Scenario Total</p>
                          <p className="text-lg font-semibold text-slate-900">
                            {formatCurrency(comparisonResult.version_b.total)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-200">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-slate-700">Variance</p>
                          <div className="flex items-center gap-2">
                            {comparisonResult.overall_variance >= 0 ? (
                              <TrendingUp className="h-4 w-4 text-green-600" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-red-600" />
                            )}
                            <p className={`text-lg font-semibold ${comparisonResult.overall_variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(Math.abs(comparisonResult.overall_variance))} 
                              <span className="text-sm ml-1">({comparisonResult.overall_variance_pct.toFixed(1)}%)</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Category Summaries */}
                    {comparisonResult.category_summaries && comparisonResult.category_summaries.length > 0 && (
                      <div className="bg-white border rounded-lg p-4">
                        <h4 className="font-medium text-slate-900 mb-3">Variance by Category</h4>
                        <div className="space-y-2">
                          {comparisonResult.category_summaries.map((cat, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                              <span className="text-sm font-medium text-slate-700">{cat.category}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-sm text-slate-600">
                                  {formatCurrency(cat.version_a_total)} → {formatCurrency(cat.version_b_total)}
                                </span>
                                <span className={`text-sm font-semibold ${cat.variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {cat.variance >= 0 ? '+' : ''}{cat.variance_pct.toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Scenario Type Selection Dialog */}
          <Dialog open={showScenarioTypeDialog} onOpenChange={setShowScenarioTypeDialog} modal={true}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Scenario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md z-[100]">
              <DialogHeader>
                <DialogTitle>Create New Scenario</DialogTitle>
                <DialogDescription>
                  Choose the type of scenario you want to create
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {/* Scenario Type Selection */}
                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => {
                      setShowScenarioTypeDialog(false);
                      setTimeout(() => setShowCloneDialog(true), 100);
                    }}
                    className="p-4 border-2 border-blue-300 rounded-lg hover:bg-blue-50 text-left transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">📊</div>
                      <div>
                        <h4 className="font-semibold text-slate-900">Standard Financial Scenario</h4>
                        <p className="text-sm text-slate-600 mt-1">
                          Create a what-if scenario by cloning an existing budget or forecast
                        </p>
                      </div>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowScenarioTypeDialog(false);
                      navigate('/dashboard/fpa/asset-scenarios');
                    }}
                    className="p-4 border-2 border-purple-300 rounded-lg hover:bg-purple-50 text-left transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">🏗️</div>
                      <div>
                        <h4 className="font-semibold text-slate-900">Asset-Based Investment Scenario</h4>
                        <p className="text-sm text-slate-600 mt-1">
                          Model capital assets with depreciation, ROI analysis, and disposal planning
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Standard Scenario Clone Dialog */}
          <Dialog open={showCloneDialog} onOpenChange={setShowCloneDialog} modal={true}>
            <DialogContent className="max-w-md z-[100]">
              <DialogHeader>
                <DialogTitle>Create Financial Scenario</DialogTitle>
                <DialogDescription>
                  Clone an existing version to create a what-if scenario
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="z-[110]">
                  <Label>Base Version</Label>
                  <Select 
                    value={cloneForm.base_version_id}
                    onValueChange={(value) => setCloneForm({...cloneForm, base_version_id: value})}
                  >
                    <SelectTrigger className="z-[110]">
                      <SelectValue placeholder="Select version to clone" />
                    </SelectTrigger>
                    <SelectContent className="z-[120]">
                      {baseVersions.map(version => (
                        <SelectItem key={version.id} value={version.id}>
                          {version.name} ({version.version_type})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Scenario Name</Label>
                  <Input 
                    placeholder="e.g., Optimistic Growth Scenario"
                    value={cloneForm.new_name}
                    onChange={(e) => setCloneForm({...cloneForm, new_name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea 
                    placeholder="Describe the what-if assumptions for this scenario..."
                    value={cloneForm.scenario_description}
                    onChange={(e) => setCloneForm({...cloneForm, scenario_description: e.target.value})}
                    rows={3}
                  />
                </div>
                
                <Button 
                  onClick={handleCloneVersion}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!cloneForm.base_version_id || !cloneForm.new_name}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Create Scenario
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="history">
            <History className="h-4 w-4 mr-2" />
            History
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="scenarios" className="mt-6">
          {/* Scenarios Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredScenarios().length === 0 ? (
          <Card className="p-8 col-span-full text-center">
            <Copy className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-medium text-slate-900 mb-2">No Scenarios Yet</h3>
            <p className="text-sm text-slate-600 mb-4">
              Create your first scenario to explore what-if analysis
            </p>
            <Button 
              onClick={() => setShowScenarioTypeDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Scenario
            </Button>
          </Card>
        ) : (
          filteredScenarios().map((scenario) => (
            <Card 
              key={scenario.id} 
              className="p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                if (scenario.type === 'asset') {
                  navigate('/dashboard/fpa/asset-scenarios');
                } else {
                  navigate(`/dashboard/fpa/planning?version=${scenario.id}`);
                }
              }}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {scenario.type === 'asset' ? (
                        <div className="p-1.5 bg-purple-100 rounded">
                          <Copy className="h-4 w-4 text-purple-600" />
                        </div>
                      ) : (
                        <div className="p-1.5 bg-blue-100 rounded">
                          <Copy className="h-4 w-4 text-blue-600" />
                        </div>
                      )}
                      <h3 className="font-semibold text-slate-900">{scenario.name}</h3>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {scenario.type === 'asset' ? (
                        <Badge className="bg-purple-500 text-white text-xs">Asset-Based</Badge>
                      ) : (
                        <>
                          {getVersionBadge(scenario.version_type)}
                          {scenario.base_version_id && (
                            <Badge variant="outline" className="text-xs">Cloned</Badge>
                          )}
                        </>
                      )}
                      {scenario.is_locked && (
                        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-300">Locked</Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {scenario.type !== 'asset' && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(scenario);
                          }}
                          title="Edit scenario"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setScenarioToDelete(scenario);
                            setShowDeleteDialog(true);
                          }}
                          title="Delete scenario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                {scenario.scenario_description && (
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {scenario.scenario_description}
                  </p>
                )}
                
                <div className="pt-3 border-t border-slate-100">
                  {scenario.type === 'asset' ? (
                    <p className="text-xs text-slate-500 mb-2">
                      Asset: {scenario.asset_class} | Purchase: {scenario.purchase_date || 'N/A'}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 mb-2">
                      Period: {scenario.start_period} to {scenario.end_period}
                    </p>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (scenario.type === 'asset') {
                          navigate('/dashboard/fpa/asset-scenarios');
                        } else {
                          navigate(`/dashboard/fpa/planning?version=${scenario.id}`);
                        }
                      }}
                    >
                      View Data
                    </Button>
                    {scenario.type !== 'asset' && (
                      <>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 text-xs border-green-300 text-green-700 hover:bg-green-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedScenario(scenario);
                            resetAdjustments();
                            setShowAdjustDialog(true);
                          }}
                        >
                          <Sliders className="h-3 w-3 mr-1" />
                          Adjust
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            setComparisonForm({
                              version_a_id: scenario.base_version_id || '',
                              version_b_id: scenario.id
                            });
                            setShowCompareDialog(true);
                          }}
                        >
                          <GitCompare className="h-3 w-3 mr-1" />
                          Compare
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Base Versions Reference */}
      <Card className="p-4 bg-slate-50">
        <h3 className="font-semibold text-slate-900 mb-3">Available Base Versions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {baseVersions.slice(0, 6).map((version) => (
            <div key={version.id} className="p-3 bg-white rounded border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-900 truncate">{version.name}</span>
                {getVersionBadge(version.version_type)}
              </div>
              <p className="text-xs text-slate-600">
                {version.start_period} to {version.end_period}
              </p>
            </div>
          ))}
        </div>
      </Card>
        </TabsContent>
        
        <TabsContent value="history" className="mt-6">
          <Card className="p-6">
            {/* History Controls */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Version History</h3>
                  <p className="text-sm text-slate-600">Track all changes and restore previous states</p>
                </div>
                
                <div className="flex gap-4 items-center">
                  {/* View Toggle */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">View:</Label>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={historyView === 'table' ? 'default' : 'outline'}
                        onClick={() => setHistoryView('table')}
                      >
                        Table
                      </Button>
                      <Button
                        size="sm"
                        variant={historyView === 'feed' ? 'default' : 'outline'}
                        onClick={() => setHistoryView('feed')}
                      >
                        Feed
                      </Button>
                    </div>
                  </div>
                  
                  {/* Detail Level Toggle */}
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Detail:</Label>
                    <Select value={historyDetailLevel} onValueChange={setHistoryDetailLevel}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="z-[150]">
                        <SelectItem value="high_level">High Level</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                        <SelectItem value="full_audit">Full Audit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Scenario Selector */}
              <div className="w-64">
                <Label>Select Scenario</Label>
                <Select 
                  value={selectedHistoryScenario?.id}
                  onValueChange={(value) => {
                    const scenario = scenarios.find(s => s.id === value);
                    setSelectedHistoryScenario(scenario);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose scenario" />
                  </SelectTrigger>
                  <SelectContent className="z-[150]">
                    {scenarios.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* History Content */}
            {!selectedHistoryScenario ? (
              <div className="text-center py-12">
                <History className="h-16 w-16 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-600">Select a scenario to view its history</p>
              </div>
            ) : loadingHistory ? (
              <div className="text-center py-12">
                <p className="text-sm text-slate-600">Loading history...</p>
              </div>
            ) : historyView === 'table' ? (
              /* Table View */
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Change Type</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-600">
                        No history entries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    historyData.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-sm">
                          {new Date(entry.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>
                            <p className="font-medium">{entry.user_name}</p>
                            <p className="text-xs text-slate-600">{entry.user_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{entry.change_type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-md">
                          {entry.summary}
                          {historyDetailLevel === 'full_audit' && entry.details && (
                            <pre className="text-xs mt-2 bg-slate-50 p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(entry.details, null, 2)}
                            </pre>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedHistory(entry);
                              setShowRestoreDialog(true);
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Restore
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            ) : (
              /* Activity Feed View */
              <div className="space-y-3">
                {historyData.length === 0 ? (
                  <div className="text-center py-12 text-slate-600">
                    No history entries found
                  </div>
                ) : (
                  historyData.map((entry, index) => (
                    <Card key={entry.id} className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">{entry.change_type}</Badge>
                            <span className="text-xs text-slate-600">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-900 mb-1">
                            {entry.user_name}
                          </p>
                          <p className="text-sm text-slate-700">{entry.summary}</p>
                          {historyDetailLevel === 'full_audit' && entry.details && (
                            <pre className="text-xs mt-2 bg-slate-50 p-2 rounded overflow-auto max-h-32">
                              {JSON.stringify(entry.details, null, 2)}
                            </pre>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedHistory(entry);
                            setShowRestoreDialog(true);
                          }}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" />
                          Restore
                        </Button>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Restore Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent className="max-w-lg z-[100]">
          <DialogHeader>
            <DialogTitle>Restore Version</DialogTitle>
            <DialogDescription>
              Choose how you want to restore this version
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <div 
                className={`p-4 border rounded-lg cursor-pointer ${restoreMode === 'create_new' ? 'border-blue-500 bg-blue-50' : 'border-slate-200'}`}
                onClick={() => setRestoreMode('create_new')}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    checked={restoreMode === 'create_new'}
                    onChange={() => setRestoreMode('create_new')}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-slate-900">Create New Version</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Creates a new scenario from this historical state. Original scenario remains unchanged.
                    </p>
                  </div>
                </div>
              </div>
              
              <div 
                className={`p-4 border rounded-lg cursor-pointer ${restoreMode === 'overwrite' ? 'border-orange-500 bg-orange-50' : 'border-slate-200'}`}
                onClick={() => setRestoreMode('overwrite')}
              >
                <div className="flex items-start gap-3">
                  <input 
                    type="radio" 
                    checked={restoreMode === 'overwrite'}
                    onChange={() => setRestoreMode('overwrite')}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium text-slate-900">Overwrite Current</p>
                    <p className="text-sm text-slate-600 mt-1">
                      ⚠️ Replaces current scenario with this historical state. This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {restoreMode === 'create_new' && (
              <div>
                <Label>New Version Name</Label>
                <Input
                  placeholder="e.g., Restored Q4 2025"
                  value={newVersionName}
                  onChange={(e) => setNewVersionName(e.target.value)}
                />
              </div>
            )}
            
            <Button
              onClick={handleRestoreVersion}
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={restoreMode === 'create_new' && !newVersionName}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Restore Version
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="z-[100]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Scenario
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>&ldquo;{scenarioToDelete?.name}&rdquo;</strong>?
              </p>
              <p className="text-red-600 font-medium">
                This action cannot be undone. All associated planning data, driver values, and history will be permanently deleted.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting} className="text-slate-700 border-slate-300 hover:bg-slate-100">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteScenario}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete Scenario'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Edit Scenario Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md z-[100]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Edit Scenario
            </DialogTitle>
            <DialogDescription>
              Update the scenario name and description
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Scenario Name</Label>
              <Input 
                placeholder="e.g., Optimistic Growth Scenario"
                value={editForm.name}
                onChange={(e) => setEditForm({...editForm, name: e.target.value})}
              />
            </div>
            
            <div>
              <Label>Description (Optional)</Label>
              <Textarea 
                placeholder="Describe the what-if assumptions for this scenario..."
                value={editForm.scenario_description}
                onChange={(e) => setEditForm({...editForm, scenario_description: e.target.value})}
                rows={3}
              />
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1 text-slate-700 border-slate-300 hover:bg-slate-100"
                disabled={isEditing}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditScenario}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!editForm.name.trim() || isEditing}
              >
                {isEditing ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FPAScenarioPlanning;
