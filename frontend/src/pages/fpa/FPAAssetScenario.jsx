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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import axios from 'axios';
import { API } from '@/App';
import { Plus, TrendingUp, TrendingDown, GitCompare, DollarSign, Calendar, Trash2, Edit, Calculator, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const FPAAssetScenario = () => {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const { currency } = useContext(FPACurrencyContext);
  const [assetScenarios, setAssetScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assets');
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [disposalResult, setDisposalResult] = useState(null);
  
  // Create asset dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    asset_name: '',
    asset_class: '',
    estimated_cost: '',
    purchase_date: '',
    in_service_date: '',
    useful_life_months: '',
    residual_value: '',
    financing_method: 'cash',
    down_payment: '',
    interest_rate: '',
    term_months: '',
    monthly_lease_payment: '',
    depreciation_method: 'straight_line',
    utilization_percentage: '100',
    discount_rate_override: '',
    functional_currency: 'USD',
    scenario_description: '',
    manual_revenue_projections: [],
    maintenance_curve: [],
    linked_driver_ids: []
  });
  
  // Comparison state
  const [showCompareDialog, setShowCompareDialog] = useState(false);
  const [selectedAssetsForComparison, setSelectedAssetsForComparison] = useState([]);
  const [comparisonResult, setComparisonResult] = useState(null);
  
  // ROI calculation state
  const [showROIDialog, setShowROIDialog] = useState(false);
  const [selectedAssetForROI, setSelectedAssetForROI] = useState(null);
  const [roiResult, setROIResult] = useState(null);
  
  // Disposal state
  const [showDisposalDialog, setShowDisposalDialog] = useState(false);
  const [disposalForm, setDisposalForm] = useState({
    asset_id: null,
    sale_date: '',
    sale_price: ''
  });
  
  // Delete state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [assetToDelete, setAssetToDelete] = useState(null);
  
  // Edit/Adjust state
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [assetToEdit, setAssetToEdit] = useState(null);
  const [editForm, setEditForm] = useState({
    asset_name: '',
    estimated_cost: '',
    useful_life_months: '',
    residual_value: '',
    financing_method: 'cash',
    down_payment: '',
    interest_rate: '',
    term_months: '',
    monthly_lease_payment: '',
    depreciation_method: 'straight_line',
    utilization_percentage: '100',
    discount_rate_override: '',
    scenario_description: '',
    maintenance_curve: [],
    manual_revenue_projections: []
  });
  
  // Revenue & Cost projection helpers
  const [revenueInputType, setRevenueInputType] = useState('simple'); // 'simple' or 'detailed'
  const [simpleRevenue, setSimpleRevenue] = useState({ monthly: '', growth: '0' });
  const [maintenanceCosts, setMaintenanceCosts] = useState([{ year: 1, cost: '' }]);

  useEffect(() => {
    loadAssetScenarios();
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    try {
      const response = await axios.get(`${API}/fpa/drivers/`);
      setAvailableDrivers(response.data || []);
    } catch (error) {
      console.error('Error loading drivers:', error);
      // Don't show error toast - drivers are optional
    }
  };

  const loadAssetScenarios = async () => {
    try {
      const response = await axios.get(`${API}/fpa/assets/scenarios`);
      if (response.data.success) {
        setAssetScenarios(response.data.scenarios);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading asset scenarios:', error);
      toast.error('Failed to load asset scenarios');
      setLoading(false);
    }
  };

  const generateRevenueProjections = () => {
    if (revenueInputType === 'simple' && simpleRevenue.monthly) {
      const monthly = parseFloat(simpleRevenue.monthly);
      const growth = parseFloat(simpleRevenue.growth) / 100;
      const months = parseInt(createForm.useful_life_months) || 60;
      const projections = [];
      
      for (let month = 1; month <= months; month++) {
        const yearMultiplier = Math.pow(1 + growth, Math.floor((month - 1) / 12));
        projections.push({
          month,
          revenue: monthly * yearMultiplier,
          description: `Month ${month} revenue`
        });
      }
      
      return projections;
    }
    return createForm.manual_revenue_projections;
  };

  const handleCreateAsset = async () => {
    if (!createForm.asset_name || !createForm.estimated_cost || !createForm.useful_life_months) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Generate revenue projections based on input type
      const revenueProjections = generateRevenueProjections();
      
      // Filter and format maintenance costs
      const maintenanceCurve = maintenanceCosts
        .filter(m => m.cost && parseFloat(m.cost) > 0)
        .map(m => ({ year: m.year, cost: parseFloat(m.cost) }));

      const payload = {
        asset_name: createForm.asset_name,
        asset_class: createForm.asset_class,
        estimated_cost: parseFloat(createForm.estimated_cost),
        purchase_date: createForm.purchase_date,
        in_service_date: createForm.in_service_date,
        useful_life_months: parseInt(createForm.useful_life_months),
        residual_value: parseFloat(createForm.residual_value) || 0,
        financing_details: {
          method: createForm.financing_method,
          down_payment: parseFloat(createForm.down_payment) || 0,
          interest_rate: parseFloat(createForm.interest_rate) || 0,
          term_months: parseInt(createForm.term_months) || 0,
          monthly_lease_payment: parseFloat(createForm.monthly_lease_payment) || 0
        },
        depreciation_method: createForm.depreciation_method,
        utilization_percentage: parseFloat(createForm.utilization_percentage) || 100,
        discount_rate_override: createForm.discount_rate_override ? parseFloat(createForm.discount_rate_override) : null,
        functional_currency: createForm.functional_currency,
        scenario_description: createForm.scenario_description,
        manual_revenue_projections: revenueProjections,
        maintenance_curve: maintenanceCurve,
        linked_driver_ids: createForm.linked_driver_ids,
        user_id: user.id
      };

      const response = await axios.post(`${API}/fpa/assets/scenarios`, payload);
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowCreateDialog(false);
        resetCreateForm();
        loadAssetScenarios();
      } else {
        toast.error(response.data.error || 'Failed to create asset scenario');
      }
    } catch (error) {
      console.error('Error creating asset scenario:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create asset scenario';
      toast.error(errorMessage);
    }
  };

  const resetCreateForm = () => {
    setCreateForm({
      asset_name: '',
      asset_class: '',
      estimated_cost: '',
      purchase_date: '',
      in_service_date: '',
      useful_life_months: '',
      residual_value: '',
      financing_method: 'cash',
      down_payment: '',
      interest_rate: '',
      term_months: '',
      monthly_lease_payment: '',
      depreciation_method: 'straight_line',
      utilization_percentage: '100',
      discount_rate_override: '',
      functional_currency: 'USD',
      scenario_description: '',
      manual_revenue_projections: [],
      maintenance_curve: [],
      linked_driver_ids: []
    });
    setRevenueInputType('simple');
    setSimpleRevenue({ monthly: '', growth: '0' });
    setMaintenanceCosts([{ year: 1, cost: '' }]);
  };

  const handleCalculateROI = async (assetId) => {
    try {
      const response = await axios.post(`${API}/fpa/assets/scenarios/${assetId}/calculate-roi`);
      if (response.data.success) {
        setROIResult(response.data);
        setShowROIDialog(true);
      } else {
        toast.error('Failed to calculate ROI');
      }
    } catch (error) {
      console.error('Error calculating ROI:', error);
      toast.error('Failed to calculate ROI');
    }
  };

  const handleCompareAssets = async () => {
    if (selectedAssetsForComparison.length < 2 || selectedAssetsForComparison.length > 3) {
      toast.error('Please select 2-3 assets to compare');
      return;
    }

    try {
      // Show loading state
      toast.info('Calculating NPV, IRR, and Payback for selected assets...');
      
      const response = await axios.post(`${API}/fpa/assets/scenarios/compare`, {
        asset_ids: selectedAssetsForComparison
      });
      
      if (response.data.success) {
        setComparisonResult(response.data);
        toast.success('Assets compared successfully! All metrics recalculated.');
      } else {
        toast.error('Failed to compare assets');
      }
    } catch (error) {
      console.error('Error comparing assets:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to compare assets';
      toast.error(errorMsg);
    }
  };

  const handleRefreshComparison = async () => {
    if (!comparisonResult || selectedAssetsForComparison.length === 0) {
      toast.error('No comparison to refresh');
      return;
    }
    
    toast.info('Refreshing comparison with latest data...');
    await handleCompareAssets();
  };

  const handleDisposeAsset = async () => {
    if (!disposalForm.sale_date || !disposalForm.sale_price) {
      toast.error('Please provide sale date and price');
      return;
    }

    try {
      const response = await axios.post(
        `${API}/fpa/assets/scenarios/${disposalForm.asset_id}/dispose`,
        {
          sale_date: disposalForm.sale_date,
          sale_price: parseFloat(disposalForm.sale_price)
        }
      );
      
      if (response.data.success) {
        setDisposalResult(response.data.disposal_impact);
        toast.success(response.data.message);
        loadAssetScenarios();
      } else {
        toast.error('Failed to dispose asset');
      }
    } catch (error) {
      console.error('Error disposing asset:', error);
      const errorMsg = error.response?.data?.detail || 'Failed to dispose asset';
      toast.error(errorMsg);
    }
  };

  const addDriverLink = () => {
    setCreateForm({
      ...createForm,
      linked_driver_ids: [
        ...createForm.linked_driver_ids,
        { driver_id: '', multiplier: 1.0 }
      ]
    });
  };

  const removeDriverLink = (index) => {
    const updated = [...createForm.linked_driver_ids];
    updated.splice(index, 1);
    setCreateForm({ ...createForm, linked_driver_ids: updated });
  };

  const updateDriverLink = (index, field, value) => {
    const updated = [...createForm.linked_driver_ids];
    updated[index][field] = value;
    setCreateForm({ ...createForm, linked_driver_ids: updated });
  };

  const handleDeleteAsset = async () => {
    if (!assetToDelete) return;

    try {
      const response = await axios.delete(`${API}/fpa/assets/scenarios/${assetToDelete.id}`);
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowDeleteDialog(false);
        setAssetToDelete(null);
        loadAssetScenarios();
      } else {
        toast.error('Failed to delete asset');
      }
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Failed to delete asset');
    }
  };

  const openEditDialog = (asset) => {
    setAssetToEdit(asset);
    setEditForm({
      asset_name: asset.asset_name,
      estimated_cost: asset.estimated_cost.toString(),
      useful_life_months: asset.useful_life_months.toString(),
      residual_value: asset.residual_value.toString(),
      financing_method: asset.financing_details.method,
      down_payment: asset.financing_details.down_payment?.toString() || '',
      interest_rate: asset.financing_details.interest_rate?.toString() || '',
      term_months: asset.financing_details.term_months?.toString() || '',
      monthly_lease_payment: asset.financing_details.monthly_lease_payment?.toString() || '',
      depreciation_method: asset.depreciation_method,
      utilization_percentage: asset.utilization_percentage?.toString() || '100',
      discount_rate_override: asset.discount_rate_override?.toString() || '',
      scenario_description: asset.scenario_description || '',
      maintenance_curve: asset.maintenance_curve || [],
      manual_revenue_projections: asset.manual_revenue_projections || []
    });
    setShowEditDialog(true);
  };

  const handleUpdateAsset = async () => {
    if (!assetToEdit || !editForm.asset_name || !editForm.estimated_cost) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const payload = {
        asset_name: editForm.asset_name,
        estimated_cost: parseFloat(editForm.estimated_cost),
        useful_life_months: parseInt(editForm.useful_life_months),
        residual_value: parseFloat(editForm.residual_value) || 0,
        financing_details: {
          method: editForm.financing_method,
          down_payment: parseFloat(editForm.down_payment) || 0,
          interest_rate: parseFloat(editForm.interest_rate) || 0,
          term_months: parseInt(editForm.term_months) || 0,
          monthly_lease_payment: parseFloat(editForm.monthly_lease_payment) || 0
        },
        depreciation_method: editForm.depreciation_method,
        utilization_percentage: parseFloat(editForm.utilization_percentage) || 100,
        discount_rate_override: editForm.discount_rate_override ? parseFloat(editForm.discount_rate_override) : null,
        scenario_description: editForm.scenario_description,
        maintenance_curve: editForm.maintenance_curve,
        manual_revenue_projections: editForm.manual_revenue_projections
      };

      const response = await axios.put(`${API}/fpa/assets/scenarios/${assetToEdit.id}`, payload);
      
      if (response.data.success) {
        toast.success(response.data.message);
        setShowEditDialog(false);
        setAssetToEdit(null);
        await loadAssetScenarios();
        
        // If this asset is in the current comparison, refresh it
        if (selectedAssetsForComparison.includes(assetToEdit.id)) {
          toast.info('Asset updated! Click "Refresh" in comparison to see updated metrics.');
        }
      } else {
        toast.error(response.data.error || 'Failed to update asset scenario');
      }
    } catch (error) {
      console.error('Error updating asset scenario:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update asset scenario';
      toast.error(errorMessage);
    }
  };

  const toggleAssetSelection = (assetId) => {
    setSelectedAssetsForComparison(prev => {
      if (prev.includes(assetId)) {
        return prev.filter(id => id !== assetId);
      } else if (prev.length < 3) {
        return [...prev, assetId];
      } else {
        toast.warning('Maximum 3 assets can be compared');
        return prev;
      }
    });
  };

  const formatCurrency = (value) => {
    return formatCurrencyUtil(value, currency, { decimals: 0 });
  };

  const getAssetClassIcon = (assetClass) => {
    const icons = {
      'IT Hardware': '💻',
      'Heavy Machinery': '🏗️',
      'Real Estate': '🏢',
      'Vehicles': '🚗',
      'Equipment': '⚙️'
    };
    return icons[assetClass] || '📦';
  };

  const getFinancingBadge = (method) => {
    const badges = {
      'cash': { color: 'bg-green-500', label: 'Cash' },
      'loan': { color: 'bg-blue-500', label: 'Loan' },
      'lease': { color: 'bg-purple-500', label: 'Lease' }
    };
    const badge = badges[method] || { color: 'bg-gray-500', label: method };
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  if (loading) {
    return <div className="text-lg text-slate-600">Loading asset scenarios...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Asset Lifecycle Management</h2>
          <p className="text-sm text-slate-600">Model capital investments from acquisition to exit</p>
        </div>
        
        <div className="flex gap-3">
          <Dialog open={showCompareDialog} onOpenChange={setShowCompareDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                disabled={assetScenarios.length < 2}
              >
                <GitCompare className="h-4 w-4 mr-2" />
                Compare Assets
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Compare Asset Scenarios</DialogTitle>
                <DialogDescription>
                  Select 2-3 asset scenarios to compare NPV, IRR, and payback periods. 
                  All metrics are calculated in real-time with latest data.
                </DialogDescription>
              </DialogHeader>
              
              {/* Asset selection grid */}
              <div className="py-4">
                <Label className="mb-2">Select Assets to Compare (2-3)</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                  {assetScenarios.filter(a => a.status === 'active').map((asset) => (
                    <div
                      key={asset.id}
                      onClick={() => toggleAssetSelection(asset.id)}
                      className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
                        selectedAssetsForComparison.includes(asset.id)
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-slate-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getAssetClassIcon(asset.asset_class)}</span>
                          <div>
                            <p className="font-medium text-slate-900">{asset.asset_name}</p>
                            <p className="text-xs text-slate-600">{asset.asset_class}</p>
                          </div>
                        </div>
                        {selectedAssetsForComparison.includes(asset.id) && (
                          <CheckCircle className="h-5 w-5 text-purple-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleCompareAssets}
                    disabled={selectedAssetsForComparison.length < 2 || selectedAssetsForComparison.length > 3}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    <Calculator className="h-4 w-4 mr-2" />
                    Calculate & Compare
                  </Button>
                  
                  {comparisonResult && (
                    <Button 
                      onClick={handleRefreshComparison}
                      variant="outline"
                      className="border-purple-300 text-purple-700 hover:bg-purple-50"
                    >
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Refresh
                    </Button>
                  )}
                </div>
                
                {/* Comparison Results */}
                {comparisonResult && (
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-slate-900">Comparison Results</h4>
                      <div className="text-xs text-slate-500">
                        Real-time calculation with latest asset data
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {comparisonResult.comparisons.map((comp) => (
                        <Card key={comp.asset_id} className="p-4">
                          <h5 className="font-medium text-slate-900 mb-2">{comp.asset_name}</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">Initial Cost:</span>
                              <span className="font-medium">{formatCurrency(comp.initial_cost)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">Financing:</span>
                              {getFinancingBadge(comp.financing_method)}
                            </div>
                            <div className="flex justify-between border-t pt-2 mt-2">
                              <span className="text-slate-600 font-medium">NPV:</span>
                              <span className={`font-bold ${comp.metrics.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(comp.metrics.npv)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 font-medium">IRR:</span>
                              <span className={`font-bold ${comp.metrics.irr && comp.metrics.irr > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                                {comp.metrics.irr ? `${comp.metrics.irr.toFixed(2)}%` : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600 font-medium">Payback:</span>
                              <span className={`font-bold ${comp.metrics.payback_period_years ? 'text-purple-600' : 'text-slate-400'}`}>
                                {comp.metrics.payback_period_years ? `${comp.metrics.payback_period_years} years` : 'N/A'}
                              </span>
                            </div>
                            
                            {/* Show warning if metrics are N/A */}
                            {(!comp.metrics.irr || !comp.metrics.payback_period_years) && (
                              <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                                ⚠️ Add revenue projections for complete metrics
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                    
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                      <h5 className="font-medium text-green-900 mb-2">Recommendations</h5>
                      <div className="text-sm text-green-700 space-y-1">
                        <p>• Best by NPV: <strong>{comparisonResult.recommendations.best_by_npv}</strong> ({formatCurrency(comparisonResult.recommendations.best_npv_value)})</p>
                        <p>• Best by IRR: <strong>{comparisonResult.recommendations.best_by_irr}</strong> ({comparisonResult.recommendations.best_irr_value?.toFixed(2)}%)</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                New Asset Scenario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Asset Scenario</DialogTitle>
                <DialogDescription>
                  Model a capital asset investment from acquisition to disposal
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-900">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Asset Name *</Label>
                      <Input 
                        placeholder="e.g., Production Line Alpha"
                        value={createForm.asset_name}
                        onChange={(e) => setCreateForm({...createForm, asset_name: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label>Asset Class *</Label>
                      <Select 
                        value={createForm.asset_class}
                        onValueChange={(value) => setCreateForm({...createForm, asset_class: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select class" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IT Hardware">💻 IT Hardware</SelectItem>
                          <SelectItem value="Heavy Machinery">🏗️ Heavy Machinery</SelectItem>
                          <SelectItem value="Real Estate">🏢 Real Estate</SelectItem>
                          <SelectItem value="Vehicles">🚗 Vehicles</SelectItem>
                          <SelectItem value="Equipment">⚙️ Equipment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Estimated Cost *</Label>
                      <Input 
                        type="number"
                        placeholder="100000"
                        value={createForm.estimated_cost}
                        onChange={(e) => setCreateForm({...createForm, estimated_cost: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label>Useful Life (Months) *</Label>
                      <Input 
                        type="number"
                        placeholder="60"
                        value={createForm.useful_life_months}
                        onChange={(e) => setCreateForm({...createForm, useful_life_months: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label>Residual Value</Label>
                      <Input 
                        type="number"
                        placeholder="10000"
                        value={createForm.residual_value}
                        onChange={(e) => setCreateForm({...createForm, residual_value: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Purchase Date *</Label>
                      <Input 
                        type="date"
                        value={createForm.purchase_date}
                        onChange={(e) => setCreateForm({...createForm, purchase_date: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label>In-Service Date *</Label>
                      <Input 
                        type="date"
                        value={createForm.in_service_date}
                        onChange={(e) => setCreateForm({...createForm, in_service_date: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Financing */}
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium text-slate-900">Financing Method</h4>
                  <div>
                    <Label>Financing Type</Label>
                    <Select 
                      value={createForm.financing_method}
                      onValueChange={(value) => setCreateForm({...createForm, financing_method: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash Purchase</SelectItem>
                        <SelectItem value="loan">Loan</SelectItem>
                        <SelectItem value="lease">Lease</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {createForm.financing_method === 'loan' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Down Payment</Label>
                        <Input 
                          type="number"
                          placeholder="20000"
                          value={createForm.down_payment}
                          onChange={(e) => setCreateForm({...createForm, down_payment: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label>Interest Rate (%)</Label>
                        <Input 
                          type="number"
                          step="0.1"
                          placeholder="5.5"
                          value={createForm.interest_rate}
                          onChange={(e) => setCreateForm({...createForm, interest_rate: e.target.value})}
                        />
                      </div>
                      
                      <div>
                        <Label>Term (Months)</Label>
                        <Input 
                          type="number"
                          placeholder="60"
                          value={createForm.term_months}
                          onChange={(e) => setCreateForm({...createForm, term_months: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                  
                  {createForm.financing_method === 'lease' && (
                    <div>
                      <Label>Monthly Lease Payment</Label>
                      <Input 
                        type="number"
                        placeholder="2000"
                        value={createForm.monthly_lease_payment}
                        onChange={(e) => setCreateForm({...createForm, monthly_lease_payment: e.target.value})}
                      />
                    </div>
                  )}
                </div>
                
                {/* Depreciation & Analysis */}
                <div className="space-y-4 border-t pt-4">
                  <h4 className="font-medium text-slate-900">Depreciation & Analysis</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Depreciation Method</Label>
                      <Select 
                        value={createForm.depreciation_method}
                        onValueChange={(value) => setCreateForm({...createForm, depreciation_method: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="straight_line">Straight-Line</SelectItem>
                          <SelectItem value="double_declining_balance">Double Declining Balance</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Utilization %</Label>
                      <Input 
                        type="number"
                        placeholder="100"
                        min="0"
                        max="100"
                        value={createForm.utilization_percentage}
                        onChange={(e) => setCreateForm({...createForm, utilization_percentage: e.target.value})}
                      />
                    </div>
                    
                    <div>
                      <Label>Discount Rate (%) - Optional</Label>
                      <Input 
                        type="number"
                        step="0.1"
                        placeholder="10.0"
                        value={createForm.discount_rate_override}
                        onChange={(e) => setCreateForm({...createForm, discount_rate_override: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Scenario Description</Label>
                    <Textarea 
                      placeholder="Describe assumptions and strategy for this asset..."
                      value={createForm.scenario_description}
                      onChange={(e) => setCreateForm({...createForm, scenario_description: e.target.value})}
                      rows={3}
                    />
                  </div>
                </div>
                
                {/* Linked Operational Drivers */}
                <div className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900">Link to Operational Drivers</h4>
                      <p className="text-xs text-slate-600">Connect asset performance to existing operational drivers</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={addDriverLink}
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Driver
                    </Button>
                  </div>
                  
                  {createForm.linked_driver_ids.length > 0 && (
                    <div className="space-y-3">
                      {createForm.linked_driver_ids.map((link, index) => (
                        <div key={index} className="grid grid-cols-[1fr,120px,40px] gap-2 items-end bg-slate-50 p-3 rounded">
                          <div>
                            <Label className="text-xs">Driver</Label>
                            <Select
                              value={link.driver_id}
                              onValueChange={(value) => updateDriverLink(index, 'driver_id', value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select driver" />
                              </SelectTrigger>
                              <SelectContent>
                                {availableDrivers.map(driver => (
                                  <SelectItem key={driver.id} value={driver.id}>
                                    {driver.name} ({driver.code})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-xs">Multiplier</Label>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="1.0"
                              value={link.multiplier}
                              onChange={(e) => updateDriverLink(index, 'multiplier', parseFloat(e.target.value) || 0)}
                              className="h-9"
                            />
                          </div>
                          
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => removeDriverLink(index)}
                            className="h-9 w-9 p-0 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {availableDrivers.length === 0 && (
                    <p className="text-xs text-slate-500 italic">
                      No drivers available. Create drivers in the Drivers page first.
                    </p>
                  )}
                </div>
                
                {/* Revenue & Cost Projections - CRITICAL FOR NPV/IRR */}
                <div className="space-y-4 border-t pt-4 bg-amber-50 p-4 rounded-lg">
                  <div className="flex items-start gap-2">
                    <div className="text-2xl">💰</div>
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900">Revenue & Cost Projections</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        ⚠️ Required for NPV, IRR, and Payback calculations. Without revenue/savings, these metrics will show as £0/N/A.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <Label>Revenue Input Method</Label>
                      <Select 
                        value={revenueInputType}
                        onValueChange={setRevenueInputType}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simple">Simple (Monthly Revenue + Growth)</SelectItem>
                          <SelectItem value="none">No Revenue (Skip for now)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {revenueInputType === 'simple' && (
                      <div className="bg-white p-3 rounded border border-amber-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>Monthly Revenue/Savings</Label>
                            <Input 
                              type="number"
                              placeholder="50000"
                              value={simpleRevenue.monthly}
                              onChange={(e) => setSimpleRevenue({...simpleRevenue, monthly: e.target.value})}
                            />
                            <p className="text-xs text-slate-600 mt-1">Expected monthly revenue or cost savings from this asset</p>
                          </div>
                          
                          <div>
                            <Label>Annual Growth Rate (%)</Label>
                            <Input 
                              type="number"
                              step="0.1"
                              placeholder="5"
                              value={simpleRevenue.growth}
                              onChange={(e) => setSimpleRevenue({...simpleRevenue, growth: e.target.value})}
                            />
                            <p className="text-xs text-slate-600 mt-1">Expected year-over-year growth</p>
                          </div>
                        </div>
                        
                        {simpleRevenue.monthly && (
                          <div className="mt-3 text-sm bg-green-50 p-2 rounded">
                            <p className="text-green-700">
                              ✓ This will generate {createForm.useful_life_months || '60'} months of revenue projections
                              {simpleRevenue.growth > 0 && ` with ${simpleRevenue.growth}% annual growth`}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="border-t pt-3">
                      <Label>Maintenance & Operating Costs (Optional)</Label>
                      <p className="text-xs text-slate-600 mb-2">Add yearly maintenance costs (will increase over asset life)</p>
                      {maintenanceCosts.map((mc, index) => (
                        <div key={index} className="flex gap-2 mb-2">
                          <Input 
                            type="number"
                            placeholder={`Year ${mc.year} cost`}
                            value={mc.cost}
                            onChange={(e) => {
                              const newCosts = [...maintenanceCosts];
                              newCosts[index].cost = e.target.value;
                              setMaintenanceCosts(newCosts);
                            }}
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (index === maintenanceCosts.length - 1) {
                                setMaintenanceCosts([...maintenanceCosts, { year: mc.year + 1, cost: '' }]);
                              } else {
                                setMaintenanceCosts(maintenanceCosts.filter((_, i) => i !== index));
                              }
                            }}
                          >
                            {index === maintenanceCosts.length - 1 ? '+' : '×'}
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={handleCreateAsset}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={!createForm.asset_name || !createForm.estimated_cost || !createForm.useful_life_months}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Asset Scenario
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assetScenarios.length === 0 ? (
          <Card className="p-12 col-span-full text-center">
            <DollarSign className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-base font-medium text-slate-900 mb-2">No Asset Scenarios Yet</h3>
            <p className="text-sm text-slate-600 mb-6">
              Create your first asset scenario to model capital investments
            </p>
            <Button 
              onClick={() => setShowCreateDialog(true)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Asset Scenario
            </Button>
          </Card>
        ) : (
          assetScenarios.map((asset) => (
            <Card key={asset.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getAssetClassIcon(asset.asset_class)}</span>
                    <div>
                      <h3 className="font-semibold text-slate-900">{asset.asset_name}</h3>
                      <p className="text-xs text-slate-600">{asset.asset_class}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                      onClick={() => openEditDialog(asset)}
                      title="Edit asset"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                      onClick={() => {
                        setAssetToDelete(asset);
                        setShowDeleteDialog(true);
                      }}
                      title="Delete asset"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getFinancingBadge(asset.financing_details.method)}
                  {asset.status === 'disposed' && (
                    <Badge className="bg-red-500">Disposed</Badge>
                  )}
                  {asset.status === 'active' && (
                    <Badge className="bg-green-500">Active</Badge>
                  )}
                </div>
                
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Cost:</span>
                    <span className="font-medium">{formatCurrency(asset.estimated_cost)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Life:</span>
                    <span className="font-medium">{asset.useful_life_months} months</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">Depreciation:</span>
                    <span className="font-medium text-xs">{asset.depreciation_method === 'straight_line' ? 'SL' : 'DDB'}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-3 border-t">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="flex-1 text-xs"
                    onClick={() => {
                      setSelectedAssetForROI(asset);
                      handleCalculateROI(asset.id);
                    }}
                  >
                    <Calculator className="h-3 w-3 mr-1" />
                    Calculate ROI
                  </Button>
                  
                  {asset.status === 'active' && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="flex-1 text-xs border-orange-300 text-orange-700 hover:bg-orange-50"
                      onClick={() => {
                        setDisposalForm({ asset_id: asset.id, sale_date: '', sale_price: '' });
                        setShowDisposalDialog(true);
                      }}
                    >
                      <Calendar className="h-3 w-3 mr-1" />
                      Dispose
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* ROI Results Dialog */}
      <Dialog open={showROIDialog} onOpenChange={setShowROIDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              ROI Analysis Results
            </DialogTitle>
          </DialogHeader>
          
          {roiResult && (
            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">Net Present Value</p>
                  <p className={`text-2xl font-bold ${roiResult.npv >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(roiResult.npv)}
                  </p>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">Internal Rate of Return</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {roiResult.irr ? `${roiResult.irr.toFixed(2)}%` : 'N/A'}
                  </p>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">Payback Period</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {roiResult.payback_period_years ? `${roiResult.payback_period_years} years` : 'N/A'}
                  </p>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-lg">
                  <p className="text-xs text-slate-600 mb-1">ROI Percentage</p>
                  <p className={`text-2xl font-bold ${roiResult.roi_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {roiResult.roi_percentage.toFixed(2)}%
                  </p>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h5 className="font-medium text-blue-900 mb-2">Summary</h5>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>• Total Revenue: {formatCurrency(roiResult.total_revenue)}</p>
                  <p>• Total Costs: {formatCurrency(roiResult.total_costs)}</p>
                  <p>• Financing Costs: {formatCurrency(roiResult.total_financing_costs)}</p>
                  <p>• Net Profit: <strong>{formatCurrency(roiResult.net_profit)}</strong></p>
                  <p>• Discount Rate Used: {roiResult.discount_rate_used}%</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disposal Dialog */}
      <Dialog open={showDisposalDialog} onOpenChange={(open) => {
        setShowDisposalDialog(open);
        if (!open) {
          setDisposalResult(null);
          setDisposalForm({ asset_id: null, sale_date: '', sale_price: '' });
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Dispose Asset</DialogTitle>
            <DialogDescription>
              Enter the disposal details to calculate gain/loss on sale
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {!disposalResult ? (
              <>
                <div>
                  <Label>Sale Date</Label>
                  <Input 
                    type="date"
                    value={disposalForm.sale_date}
                    onChange={(e) => setDisposalForm({...disposalForm, sale_date: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Sale Price ({currency})</Label>
                  <Input 
                    type="number"
                    placeholder="50000"
                    value={disposalForm.sale_price}
                    onChange={(e) => setDisposalForm({...disposalForm, sale_price: e.target.value})}
                  />
                </div>
                
                <Button 
                  onClick={handleDisposeAsset}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                  disabled={!disposalForm.sale_date || !disposalForm.sale_price}
                >
                  Process Disposal
                </Button>
              </>
            ) : (
              <>
                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    {disposalResult.gain_loss_type === 'gain' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : disposalResult.gain_loss_type === 'loss' ? (
                      <XCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    )}
                    Disposal Impact Calculated
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-slate-600">Book Value</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(disposalResult.book_value)}</p>
                    </div>
                    
                    <div>
                      <p className="text-slate-600">Sale Price</p>
                      <p className="font-semibold text-slate-900">{formatCurrency(disposalResult.sale_price)}</p>
                    </div>
                    
                    <div className="col-span-2 border-t pt-2">
                      <p className="text-slate-600">
                        {disposalResult.gain_loss_type === 'gain' ? 'Gain on Sale' : 
                         disposalResult.gain_loss_type === 'loss' ? 'Loss on Sale' : 'Break Even'}
                      </p>
                      <p className={`font-bold text-lg ${
                        disposalResult.gain_loss_type === 'gain' ? 'text-green-600' : 
                        disposalResult.gain_loss_type === 'loss' ? 'text-red-600' : 'text-blue-600'
                      }`}>
                        {formatCurrency(Math.abs(disposalResult.gain_loss))}
                      </p>
                    </div>
                    
                    <div className="col-span-2">
                      <p className="text-slate-600">Cash Inflow</p>
                      <p className="font-semibold text-green-600">{formatCurrency(disposalResult.cash_inflow)}</p>
                    </div>
                    
                    <div className="col-span-2 bg-amber-50 p-2 rounded text-xs text-amber-900">
                      <p className="font-medium">Tax Note:</p>
                      <p>{disposalResult.tax_impact_note}</p>
                    </div>
                  </div>
                </div>
                
                <Button 
                  onClick={() => {
                    setShowDisposalDialog(false);
                    setDisposalResult(null);
                    setDisposalForm({ asset_id: null, sale_date: '', sale_price: '' });
                  }}
                  className="w-full"
                >
                  Close
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit/Adjust Asset Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-blue-600" />
              Adjust Asset Scenario
            </DialogTitle>
            <DialogDescription>
              Update asset parameters and recalculate depreciation & ROI
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">Basic Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Asset Name *</Label>
                  <Input 
                    placeholder="e.g., Production Line Alpha"
                    value={editForm.asset_name}
                    onChange={(e) => setEditForm({...editForm, asset_name: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Estimated Cost *</Label>
                  <Input 
                    type="number"
                    placeholder="100000"
                    value={editForm.estimated_cost}
                    onChange={(e) => setEditForm({...editForm, estimated_cost: e.target.value})}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Useful Life (Months) *</Label>
                  <Input 
                    type="number"
                    placeholder="60"
                    value={editForm.useful_life_months}
                    onChange={(e) => setEditForm({...editForm, useful_life_months: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Residual Value</Label>
                  <Input 
                    type="number"
                    placeholder="10000"
                    value={editForm.residual_value}
                    onChange={(e) => setEditForm({...editForm, residual_value: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label>Utilization %</Label>
                  <Input 
                    type="number"
                    placeholder="100"
                    min="0"
                    max="100"
                    value={editForm.utilization_percentage}
                    onChange={(e) => setEditForm({...editForm, utilization_percentage: e.target.value})}
                  />
                </div>
              </div>
            </div>
            
            {/* Financing */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-slate-900">Financing Method</h4>
              <div>
                <Label>Financing Type</Label>
                <Select 
                  value={editForm.financing_method}
                  onValueChange={(value) => setEditForm({...editForm, financing_method: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash Purchase</SelectItem>
                    <SelectItem value="loan">Loan</SelectItem>
                    <SelectItem value="lease">Lease</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {editForm.financing_method === 'loan' && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Down Payment</Label>
                    <Input 
                      type="number"
                      placeholder="20000"
                      value={editForm.down_payment}
                      onChange={(e) => setEditForm({...editForm, down_payment: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label>Interest Rate (%)</Label>
                    <Input 
                      type="number"
                      step="0.1"
                      placeholder="5.5"
                      value={editForm.interest_rate}
                      onChange={(e) => setEditForm({...editForm, interest_rate: e.target.value})}
                    />
                  </div>
                  
                  <div>
                    <Label>Term (Months)</Label>
                    <Input 
                      type="number"
                      placeholder="60"
                      value={editForm.term_months}
                      onChange={(e) => setEditForm({...editForm, term_months: e.target.value})}
                    />
                  </div>
                </div>
              )}
              
              {editForm.financing_method === 'lease' && (
                <div>
                  <Label>Monthly Lease Payment</Label>
                  <Input 
                    type="number"
                    placeholder="2000"
                    value={editForm.monthly_lease_payment}
                    onChange={(e) => setEditForm({...editForm, monthly_lease_payment: e.target.value})}
                  />
                </div>
              )}
            </div>
            
            {/* Depreciation & Analysis */}
            <div className="space-y-4 border-t pt-4">
              <h4 className="font-medium text-slate-900">Depreciation & Analysis</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Depreciation Method</Label>
                  <Select 
                    value={editForm.depreciation_method}
                    onValueChange={(value) => setEditForm({...editForm, depreciation_method: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="straight_line">Straight-Line</SelectItem>
                      <SelectItem value="double_declining_balance">Double Declining Balance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Discount Rate (%) - Optional</Label>
                  <Input 
                    type="number"
                    step="0.1"
                    placeholder="10.0"
                    value={editForm.discount_rate_override}
                    onChange={(e) => setEditForm({...editForm, discount_rate_override: e.target.value})}
                  />
                </div>
              </div>
              
              <div>
                <Label>Scenario Description</Label>
                <Textarea 
                  placeholder="Describe assumptions and strategy for this asset..."
                  value={editForm.scenario_description}
                  onChange={(e) => setEditForm({...editForm, scenario_description: e.target.value})}
                  rows={3}
                />
              </div>
            </div>
            
            {/* Revenue & Cost Projections - For Edit */}
            <div className="space-y-4 border-t pt-4 bg-blue-50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="text-2xl">📊</div>
                <div className="flex-1">
                  <h4 className="font-medium text-slate-900">Revenue & Cost Adjustments</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    ℹ️ To update revenue/cost projections, please use the "Calculate ROI" feature after saving these changes.
                  </p>
                </div>
              </div>
              
              <div className="bg-white p-3 rounded border border-blue-200">
                <p className="text-sm text-slate-600">
                  Current projections: {assetToEdit?.manual_revenue_projections?.length || 0} revenue entries, 
                  {' '}{assetToEdit?.maintenance_curve?.length || 0} maintenance years defined
                </p>
              </div>
            </div>
            
            {/* Impact Preview */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h5 className="font-medium text-blue-900 mb-2">💡 What will be recalculated:</h5>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Depreciation schedule (if cost, life, or method changed)</li>
                <li>• Loan amortization (if financing terms changed)</li>
                <li>• NPV and IRR (based on new parameters)</li>
                <li>• Payback period</li>
              </ul>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline"
                onClick={() => setShowEditDialog(false)}
                className="flex-1 text-slate-700 border-slate-300 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateAsset}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!editForm.asset_name || !editForm.estimated_cost}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Update & Recalculate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Delete Asset Scenario
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>&ldquo;{assetToDelete?.asset_name}&rdquo;</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-slate-700 border-slate-300 hover:bg-slate-100">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAsset}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              Delete Asset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FPAAssetScenario;
