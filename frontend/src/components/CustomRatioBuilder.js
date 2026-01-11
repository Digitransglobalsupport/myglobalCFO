import React, { useState, useEffect } from 'react';
import { useAuth, useApp } from '../App';
import { toast } from 'sonner';
import {
  Plus, Trash2, Calculator, Sparkles, Pin, PinOff, Users, Lock,
  ChevronDown, ArrowRight, Info, AlertTriangle, CheckCircle, Save
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

// RAG status colors
const ragColors = {
  green: 'bg-green-500/20 text-green-400 border-green-500/30',
  amber: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  red: 'bg-red-500/20 text-red-400 border-red-500/30',
  unknown: 'bg-gray-500/20 text-gray-400 border-gray-500/30'
};

// Main Custom Ratio Builder Modal
export const CustomRatioBuilderModal = ({ 
  open, 
  onOpenChange, 
  onRatioCreated,
  editRatio = null 
}) => {
  const { authAxios } = useAuth();
  const { selectedCompany } = useApp();
  const [variables, setVariables] = useState({ variables: [], by_category: {} });
  const [loading, setLoading] = useState(false);
  const [previewValue, setPreviewValue] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    numerator_variables: [],
    denominator_variables: [],
    operator: '/',
    constant: 0,
    unit: 'ratio',
    is_higher_better: true,
    green_threshold: '',
    amber_threshold: '',
    is_pinned: false,
    visibility: 'private'
  });

  // Fetch available variables
  useEffect(() => {
    if (open) {
      fetchVariables();
      if (editRatio) {
        setFormData({
          name: editRatio.name || '',
          description: editRatio.description || '',
          numerator_variables: editRatio.numerator_variables || [],
          denominator_variables: editRatio.denominator_variables || [],
          operator: editRatio.operator || '/',
          constant: editRatio.constant || 0,
          unit: editRatio.unit || 'ratio',
          is_higher_better: editRatio.is_higher_better ?? true,
          green_threshold: editRatio.green_threshold ?? '',
          amber_threshold: editRatio.amber_threshold ?? '',
          is_pinned: editRatio.is_pinned || false,
          visibility: editRatio.visibility || 'private'
        });
      }
    }
  }, [open, editRatio]);

  // Calculate preview when formula changes
  useEffect(() => {
    if (formData.numerator_variables.length > 0) {
      calculatePreview();
    } else {
      setPreviewValue(null);
    }
  }, [formData.numerator_variables, formData.denominator_variables, formData.operator, formData.constant, formData.unit]);

  const fetchVariables = async () => {
    try {
      const res = await authAxios.get('/custom-ratios/variables');
      setVariables(res.data);
    } catch (e) {
      console.error('Error fetching variables:', e);
    }
  };

  const calculatePreview = () => {
    // Calculate using default values from variables
    let numerator = 0;
    formData.numerator_variables.forEach(v => {
      const varInfo = variables.variables?.find(x => x.id === v.variable_id);
      if (varInfo) {
        numerator += (varInfo.default_value || 0) * (v.coefficient || 1);
      }
    });

    let denominator = 0;
    formData.denominator_variables.forEach(v => {
      const varInfo = variables.variables?.find(x => x.id === v.variable_id);
      if (varInfo) {
        denominator += (varInfo.default_value || 0) * (v.coefficient || 1);
      }
    });

    let result = 0;
    switch (formData.operator) {
      case '/':
        result = denominator !== 0 ? (numerator / denominator) + formData.constant : 0;
        break;
      case '*':
        result = (numerator * denominator) + formData.constant;
        break;
      case '+':
        result = numerator + denominator + formData.constant;
        break;
      case '-':
        result = numerator - denominator + formData.constant;
        break;
      default:
        result = numerator + formData.constant;
    }

    if (formData.unit === 'percentage') {
      result = result * 100;
    }

    setPreviewValue(result);
  };

  const addVariable = (type, variableId) => {
    const key = type === 'numerator' ? 'numerator_variables' : 'denominator_variables';
    setFormData(prev => ({
      ...prev,
      [key]: [...prev[key], { variable_id: variableId, coefficient: 1.0 }]
    }));
  };

  const removeVariable = (type, index) => {
    const key = type === 'numerator' ? 'numerator_variables' : 'denominator_variables';
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index)
    }));
  };

  const updateCoefficient = (type, index, coefficient) => {
    const key = type === 'numerator' ? 'numerator_variables' : 'denominator_variables';
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].map((v, i) => i === index ? { ...v, coefficient: parseFloat(coefficient) || 1 } : v)
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      toast.error('Please enter a ratio name');
      return;
    }
    if (formData.numerator_variables.length === 0) {
      toast.error('Please add at least one variable to the formula');
      return;
    }
    if (!selectedCompany) {
      toast.error('Please select a company first');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        company_id: selectedCompany.id,
        green_threshold: formData.green_threshold !== '' ? parseFloat(formData.green_threshold) : null,
        amber_threshold: formData.amber_threshold !== '' ? parseFloat(formData.amber_threshold) : null
      };

      let res;
      if (editRatio) {
        res = await authAxios.put(`/custom-ratios/${editRatio.id}`, payload);
        toast.success('Custom ratio updated!');
      } else {
        res = await authAxios.post('/custom-ratios', payload);
        toast.success('Custom ratio created!');
      }
      
      onRatioCreated?.(res.data);
      onOpenChange(false);
      resetForm();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to save custom ratio');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      numerator_variables: [],
      denominator_variables: [],
      operator: '/',
      constant: 0,
      unit: 'ratio',
      is_higher_better: true,
      green_threshold: '',
      amber_threshold: '',
      is_pinned: false,
      visibility: 'private'
    });
    setPreviewValue(null);
  };

  const getVariableName = (varId) => {
    const v = variables.variables?.find(x => x.id === varId);
    return v?.name || varId;
  };

  const formatPreviewValue = (value) => {
    if (value === null) return '—';
    if (formData.unit === 'percentage') return `${value.toFixed(2)}%`;
    if (formData.unit === 'currency') return `$${value.toLocaleString()}`;
    if (formData.unit === 'days') return `${value.toFixed(0)} days`;
    if (formData.unit === 'count') return value.toFixed(0);
    return value.toFixed(4);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-navy-800 border-navy-700 max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <div className="p-2 bg-gold-500/20 rounded-lg">
              <Sparkles className="w-5 h-5 text-gold-400" />
            </div>
            <span>{editRatio ? 'Edit Custom Ratio' : 'Define Your Ratio'}</span>
            <Badge className="bg-gold-500/20 text-gold-400 ml-2">✨ Custom</Badge>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Build a bespoke financial ratio using your organization&apos;s data variables
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-gray-300">Ratio Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Nosa's Liquidity Index"
                className="bg-navy-900 border-navy-600 text-white"
                data-testid="ratio-name-input"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-gray-300">Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe what this ratio measures..."
                className="bg-navy-900 border-navy-600 text-white"
                rows={2}
              />
            </div>
          </div>

          {/* Formula Builder */}
          <Card className="bg-navy-900 border-navy-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-lg flex items-center">
                <Calculator className="w-5 h-5 mr-2 text-blue-400" />
                Formula Builder
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Numerator */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-gray-300">Numerator Variables</Label>
                  <VariableSelector 
                    variables={variables} 
                    onSelect={(varId) => addVariable('numerator', varId)}
                    disabled={formData.numerator_variables.length >= 5}
                  />
                </div>
                <div className="space-y-2">
                  {formData.numerator_variables.length === 0 ? (
                    <div className="text-sm text-gray-500 p-3 border border-dashed border-navy-600 rounded-lg text-center">
                      Click &quot;Add Variable&quot; to build your formula
                    </div>
                  ) : (
                    formData.numerator_variables.map((v, i) => (
                      <div key={i} className="flex items-center space-x-2 bg-navy-800 p-2 rounded-lg">
                        <Input
                          type="number"
                          step="0.1"
                          value={v.coefficient}
                          onChange={(e) => updateCoefficient('numerator', i, e.target.value)}
                          className="w-20 bg-navy-700 border-navy-600 text-white text-sm"
                        />
                        <span className="text-gray-400">×</span>
                        <span className="flex-1 text-white">{getVariableName(v.variable_id)}</span>
                        {i < formData.numerator_variables.length - 1 && (
                          <span className="text-gold-400 font-bold">+</span>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300 h-8 w-8"
                          onClick={() => removeVariable('numerator', i)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Operator */}
              <div className="flex items-center justify-center space-x-4 py-2">
                <div className="h-px flex-1 bg-navy-600" />
                <Select
                  value={formData.operator}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, operator: v }))}
                >
                  <SelectTrigger className="w-36 bg-gold-500/20 border-gold-500/30 text-gold-400 text-lg font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-600 min-w-[140px]">
                    <SelectItem value="/" className="text-white text-lg">÷ Divide</SelectItem>
                    <SelectItem value="*" className="text-white text-lg">× Multiply</SelectItem>
                    <SelectItem value="+" className="text-white text-lg">+ Add</SelectItem>
                    <SelectItem value="-" className="text-white text-lg">− Subtract</SelectItem>
                  </SelectContent>
                </Select>
                <div className="h-px flex-1 bg-navy-600" />
              </div>

              {/* Denominator */}
              {(formData.operator === '/' || formData.operator === '*') && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-gray-300">Denominator Variables</Label>
                    <VariableSelector 
                      variables={variables} 
                      onSelect={(varId) => addVariable('denominator', varId)}
                      disabled={formData.denominator_variables.length >= 5}
                    />
                  </div>
                  <div className="space-y-2">
                    {formData.denominator_variables.length === 0 ? (
                      <div className="text-sm text-gray-500 p-3 border border-dashed border-navy-600 rounded-lg text-center">
                        Add denominator variables for division
                      </div>
                    ) : (
                      formData.denominator_variables.map((v, i) => (
                        <div key={i} className="flex items-center space-x-2 bg-navy-800 p-2 rounded-lg">
                          <Input
                            type="number"
                            step="0.1"
                            value={v.coefficient}
                            onChange={(e) => updateCoefficient('denominator', i, e.target.value)}
                            className="w-20 bg-navy-700 border-navy-600 text-white text-sm"
                          />
                          <span className="text-gray-400">×</span>
                          <span className="flex-1 text-white">{getVariableName(v.variable_id)}</span>
                          {i < formData.denominator_variables.length - 1 && (
                            <span className="text-gold-400 font-bold">+</span>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 h-8 w-8"
                            onClick={() => removeVariable('denominator', i)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Constant */}
              <div className="flex items-center space-x-4">
                <Label className="text-gray-300 whitespace-nowrap">Add Constant:</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.constant}
                  onChange={(e) => setFormData(prev => ({ ...prev, constant: parseFloat(e.target.value) || 0 }))}
                  className="w-32 bg-navy-700 border-navy-600 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {/* Preview & Settings */}
          <div className="grid grid-cols-2 gap-4">
            {/* Live Preview */}
            <Card className="bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-500/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-white">
                  {formatPreviewValue(previewValue)}
                </div>
                <p className="text-xs text-gray-400 mt-1">Based on sample data</p>
              </CardContent>
            </Card>

            {/* Unit & Direction */}
            <div className="space-y-3">
              <div>
                <Label className="text-gray-300">Result Unit</Label>
                <Select
                  value={formData.unit}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, unit: v }))}
                >
                  <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-600">
                    <SelectItem value="ratio" className="text-white">Ratio (x.xx)</SelectItem>
                    <SelectItem value="percentage" className="text-white">Percentage (%)</SelectItem>
                    <SelectItem value="currency" className="text-white">Currency ($)</SelectItem>
                    <SelectItem value="days" className="text-white">Days</SelectItem>
                    <SelectItem value="count" className="text-white">Count</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-gray-300">Higher is Better</Label>
                <Switch
                  checked={formData.is_higher_better}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_higher_better: v }))}
                  className="data-[state=checked]:bg-green-500"
                />
              </div>
            </div>
          </div>

          {/* RAG Thresholds */}
          <Card className="bg-navy-900 border-navy-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2 text-yellow-400" />
                RAG Thresholds (Optional)
              </CardTitle>
              <CardDescription className="text-gray-500 text-xs">
                Set thresholds for Red/Amber/Green status indicators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-green-400 text-sm flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2" />
                    Green Threshold ({formData.is_higher_better ? '≥' : '≤'})
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.green_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, green_threshold: e.target.value }))}
                    placeholder={formData.is_higher_better ? 'Min value for green' : 'Max value for green'}
                    className="bg-navy-800 border-navy-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-yellow-400 text-sm flex items-center">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2" />
                    Amber Threshold ({formData.is_higher_better ? '≥' : '≤'})
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.amber_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, amber_threshold: e.target.value }))}
                    placeholder={formData.is_higher_better ? 'Min value for amber' : 'Max value for amber'}
                    className="bg-navy-800 border-navy-600 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Visibility Options */}
          <div className="flex items-center justify-between p-4 bg-navy-900 rounded-lg border border-navy-700">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_pinned}
                  onCheckedChange={(v) => setFormData(prev => ({ ...prev, is_pinned: v }))}
                  className="data-[state=checked]:bg-gold-500"
                />
                <Label className="text-gray-300 flex items-center">
                  <Pin className="w-4 h-4 mr-1" /> Pin to Dashboard
                </Label>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Label className="text-gray-400 text-sm">Visibility:</Label>
              <Select
                value={formData.visibility}
                onValueChange={(v) => setFormData(prev => ({ ...prev, visibility: v }))}
              >
                <SelectTrigger className="w-32 bg-navy-800 border-navy-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-navy-800 border-navy-600">
                  <SelectItem value="private" className="text-white">
                    <span className="flex items-center"><Lock className="w-3 h-3 mr-1" /> Private</span>
                  </SelectItem>
                  <SelectItem value="team" className="text-white">
                    <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> Team</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="space-x-2">
          <Button 
            variant="outline" 
            onClick={() => { onOpenChange(false); resetForm(); }}
            className="border-navy-600 text-white"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="bg-gold-500 hover:bg-gold-600 text-navy-900"
            data-testid="create-ratio-btn"
          >
            {loading ? 'Saving...' : (editRatio ? 'Update Ratio' : 'Create Ratio')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Variable Selector Dropdown
const VariableSelector = ({ variables, onSelect, disabled }) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredVariables = variables.variables?.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.category.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="sm" 
          variant="outline" 
          className="border-gold-500/50 text-gold-400 hover:bg-gold-500/10"
          disabled={disabled}
        >
          <Plus className="w-4 h-4 mr-1" /> Add Variable
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-navy-800 border-navy-700 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Select Variable</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Search variables..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-navy-900 border-navy-600 text-white"
          />
          <ScrollArea className="h-[300px]">
            {Object.entries(variables.by_category || {}).map(([category, vars]) => (
              <div key={category} className="mb-4">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">{category}</h4>
                <div className="space-y-1">
                  {vars.filter(v => 
                    v.name.toLowerCase().includes(search.toLowerCase())
                  ).map(v => (
                    <button
                      key={v.id}
                      onClick={() => { onSelect(v.id); setOpen(false); setSearch(''); }}
                      className="w-full text-left px-3 py-2 rounded-lg text-white hover:bg-navy-700 transition-colors flex items-center justify-between"
                    >
                      <span>{v.name}</span>
                      <span className="text-xs text-gray-500">{v.default_value?.toLocaleString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Custom Ratio Card for Display
export const CustomRatioCard = ({ 
  ratio, 
  onEdit, 
  onDelete, 
  onTogglePin,
  onPromote,
  compact = false 
}) => {
  const ragStatus = ratio.rag_status || 'unknown';
  
  const formatValue = (value, unit) => {
    if (value === null || value === undefined) return '—';
    switch (unit) {
      case 'percentage': return `${value.toFixed(2)}%`;
      case 'currency': return `$${value.toLocaleString()}`;
      case 'days': return `${value.toFixed(0)} days`;
      case 'count': return value.toFixed(0);
      default: return value.toFixed(4);
    }
  };

  if (compact) {
    return (
      <div className={`p-3 rounded-lg border ${ragColors[ragStatus]} transition-all`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Badge className="bg-gold-500/20 text-gold-400 text-xs">✨ Custom</Badge>
            <span className="text-white font-medium">{ratio.name}</span>
          </div>
          <span className={`text-lg font-bold ${
            ragStatus === 'green' ? 'text-green-400' :
            ragStatus === 'amber' ? 'text-yellow-400' :
            ragStatus === 'red' ? 'text-red-400' : 'text-white'
          }`}>
            {formatValue(ratio.current_value, ratio.unit)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Card className={`bg-navy-800 border-navy-700 ${ragColors[ragStatus]}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <Badge className="bg-gold-500/20 text-gold-400">✨ Custom</Badge>
              {ratio.visibility === 'team' && (
                <Badge className="bg-blue-500/20 text-blue-400"><Users className="w-3 h-3 mr-1" /> Team</Badge>
              )}
              {ratio.is_pinned && (
                <Badge className="bg-purple-500/20 text-purple-400"><Pin className="w-3 h-3" /></Badge>
              )}
            </div>
            <h3 className="text-white font-semibold">{ratio.name}</h3>
            {ratio.description && (
              <p className="text-sm text-gray-400 mt-1">{ratio.description}</p>
            )}
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${
              ragStatus === 'green' ? 'text-green-400' :
              ragStatus === 'amber' ? 'text-yellow-400' :
              ragStatus === 'red' ? 'text-red-400' : 'text-white'
            }`}>
              {formatValue(ratio.current_value, ratio.unit)}
            </div>
            {ragStatus !== 'unknown' && (
              <div className={`flex items-center justify-end mt-1 text-xs ${
                ragStatus === 'green' ? 'text-green-400' :
                ragStatus === 'amber' ? 'text-yellow-400' : 'text-red-400'
              }`}>
                {ragStatus === 'green' ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                {ragStatus.charAt(0).toUpperCase() + ragStatus.slice(1)}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-navy-700">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white h-8 w-8" onClick={onTogglePin}>
                  {ratio.is_pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{ratio.is_pinned ? 'Unpin from Dashboard' : 'Pin to Dashboard'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" className="text-gray-400 hover:text-white h-8 w-8" onClick={onPromote}>
                  {ratio.visibility === 'team' ? <Lock className="w-4 h-4" /> : <Users className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{ratio.visibility === 'team' ? 'Make Private' : 'Promote to Team'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white" onClick={onEdit}>
            Edit
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="icon" variant="ghost" className="text-red-400 hover:text-red-300 h-8 w-8">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-navy-800 border-navy-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete &quot;{ratio.name}&quot;?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  This custom ratio will be permanently deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-navy-700 text-white">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-red-500 text-white">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
};

// Custom Ratios List/Manager Component
export const CustomRatiosManager = () => {
  const { authAxios } = useAuth();
  const { selectedCompany } = useApp();
  const [ratios, setRatios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRatio, setEditingRatio] = useState(null);

  useEffect(() => {
    if (selectedCompany) {
      fetchRatios();
    }
  }, [selectedCompany]);

  const fetchRatios = async () => {
    if (!selectedCompany) return;
    try {
      setLoading(true);
      const res = await authAxios.get('/custom-ratios', { params: { company_id: selectedCompany.id } });
      setRatios(res.data);
    } catch (e) {
      console.error('Error fetching ratios:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ratioId) => {
    try {
      await authAxios.delete(`/custom-ratios/${ratioId}`);
      toast.success('Custom ratio deleted');
      fetchRatios();
    } catch (e) {
      toast.error('Failed to delete ratio');
    }
  };

  const handleTogglePin = async (ratioId) => {
    try {
      await authAxios.post(`/custom-ratios/${ratioId}/pin`);
      fetchRatios();
    } catch (e) {
      toast.error('Failed to update pin status');
    }
  };

  const handlePromote = async (ratioId) => {
    try {
      await authAxios.post(`/custom-ratios/${ratioId}/promote`);
      fetchRatios();
    } catch (e) {
      toast.error('Failed to update visibility');
    }
  };

  const handleEdit = (ratio) => {
    setEditingRatio(ratio);
    setShowBuilder(true);
  };

  if (!selectedCompany) {
    return (
      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="py-12 text-center">
          <Calculator className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">Select a company to view custom ratios</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6" data-testid="custom-ratios-manager">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Custom Ratios</h2>
          <p className="text-gray-400">Your bespoke financial metrics for {selectedCompany.name}</p>
        </div>
        <Button 
          className="bg-gold-500 hover:bg-gold-600 text-navy-900"
          onClick={() => { setEditingRatio(null); setShowBuilder(true); }}
          data-testid="define-ratio-btn"
        >
          <Sparkles className="w-4 h-4 mr-2" /> Define Your Ratio
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      ) : ratios.length === 0 ? (
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="py-12 text-center">
            <Sparkles className="w-12 h-12 text-gold-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Custom Ratios Yet</h3>
            <p className="text-gray-400 mb-4">Create your first bespoke financial ratio</p>
            <Button 
              className="bg-gold-500 hover:bg-gold-600 text-navy-900"
              onClick={() => setShowBuilder(true)}
            >
              <Plus className="w-4 h-4 mr-2" /> Define Your Ratio
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ratios.map(ratio => (
            <CustomRatioCard
              key={ratio.id}
              ratio={ratio}
              onEdit={() => handleEdit(ratio)}
              onDelete={() => handleDelete(ratio.id)}
              onTogglePin={() => handleTogglePin(ratio.id)}
              onPromote={() => handlePromote(ratio.id)}
            />
          ))}
        </div>
      )}

      <CustomRatioBuilderModal
        open={showBuilder}
        onOpenChange={setShowBuilder}
        editRatio={editingRatio}
        onRatioCreated={() => {
          fetchRatios();
          setEditingRatio(null);
        }}
      />
    </div>
  );
};

export default CustomRatiosManager;
