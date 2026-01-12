import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';
import { toast } from 'sonner';
import {
  MapPin, Plus, Check, X, AlertTriangle, FileSpreadsheet, RefreshCcw,
  Download, Upload, Search, ArrowRight, CheckCircle, XCircle, Info
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const COAMappingPage = () => {
  const { authAxios } = useAuth();
  const [entities, setEntities] = useState([]);
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [groupSchema, setGroupSchema] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [entitiesRes, schemaRes] = await Promise.all([
        authAxios.get('/entity-tree/nodes'),
        authAxios.get('/coa/group-schema')
      ]);
      setEntities(entitiesRes.data);
      setGroupSchema(schemaRes.data);
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
    <div className="space-y-6" data-testid="coa-mapping-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Chart of Accounts Mapping</h1>
        <p className="text-gray-400 mt-1">Map local account codes to the Unified Group Schema</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity Selector */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Select Entity</CardTitle>
            <CardDescription className="text-gray-400">Choose an entity to configure mappings</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {entities.map((entity) => (
                    <EntityCard
                      key={entity.id}
                      entity={entity}
                      isSelected={selectedEntity?.id === entity.id}
                      onClick={() => setSelectedEntity(entity)}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Mapping Configuration */}
        <div className="lg:col-span-2">
          {selectedEntity ? (
            <MappingConfiguration
              entity={selectedEntity}
              groupSchema={groupSchema}
              onUpdate={fetchData}
            />
          ) : (
            <Card className="bg-slate-800 border-slate-700">
              <CardContent className="py-16 text-center">
                <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">No Entity Selected</h3>
                <p className="text-gray-400">Select an entity from the list to configure COA mappings</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Group Schema Reference */}
      {groupSchema && (
        <GroupSchemaReference schema={groupSchema} />
      )}
    </div>
  );
};

// Entity Card Component
const EntityCard = ({ entity, isSelected, onClick }) => {
  const healthColor = entity.data_health_pct >= 100 ? 'green' : entity.data_health_pct >= 50 ? 'yellow' : 'red';

  return (
    <div
      onClick={onClick}
      className={`p-4 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'bg-blue-500/10 border-blue-500/50'
          : 'bg-slate-900 border-slate-700 hover:border-slate-600'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-medium">{entity.name}</span>
        <Badge className={
          entity.erp_provider
            ? 'bg-blue-500/20 text-blue-400'
            : 'bg-gray-500/20 text-gray-400'
        }>
          {entity.erp_provider || 'Manual'}
        </Badge>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-gray-400 text-sm">{entity.entity_code}</span>
        <div className="flex items-center space-x-2">
          <Progress value={entity.data_health_pct} className="w-16 h-2" />
          <span className={`text-sm ${
            healthColor === 'green' ? 'text-green-400' :
            healthColor === 'yellow' ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {entity.data_health_pct}%
          </span>
        </div>
      </div>
    </div>
  );
};

// Mapping Configuration Component
const MappingConfiguration = ({ entity, groupSchema, onUpdate }) => {
  const { authAxios } = useAuth();
  const [mapping, setMapping] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newMappings, setNewMappings] = useState([]);

  const fetchMapping = useCallback(async () => {
    try {
      setLoading(true);
      const res = await authAxios.get(`/coa/mappings/${entity.id}`);
      setMapping(res.data);
      setNewMappings(res.data.mappings || []);
    } catch (e) {
      console.error('Error fetching mapping:', e);
    } finally {
      setLoading(false);
    }
  }, [authAxios, entity.id]);

  useEffect(() => {
    fetchMapping();
  }, [fetchMapping]);

  const applyDefaults = async () => {
    try {
      await authAxios.post(`/coa/mappings/${entity.id}/apply-defaults`);
      toast.success('Default mappings applied!');
      fetchMapping();
      onUpdate?.();
    } catch (e) {
      toast.error('Failed to apply defaults');
    }
  };

  const saveMapping = async () => {
    try {
      setSaving(true);
      await authAxios.post('/coa/mappings', {
        entity_id: entity.id,
        erp_provider: entity.erp_provider || 'manual',
        mappings: newMappings
      });
      toast.success('Mappings saved!');
      fetchMapping();
      onUpdate?.();
    } catch (e) {
      toast.error('Failed to save mappings');
    } finally {
      setSaving(false);
    }
  };

  const addMapping = () => {
    setNewMappings([
      ...newMappings,
      {
        local_account_code: '',
        local_account_name: '',
        group_category: '',
        is_verified: false
      }
    ]);
  };

  const updateMapping = (index, field, value) => {
    const updated = [...newMappings];
    updated[index] = { ...updated[index], [field]: value };
    setNewMappings(updated);
  };

  const removeMapping = (index) => {
    setNewMappings(newMappings.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardContent className="py-16 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">{entity.name}</CardTitle>
            <CardDescription className="text-gray-400">
              {entity.erp_provider ? `ERP: ${entity.erp_provider}` : 'Manual Entry'} • 
              Completion: {mapping?.completion_pct || 0}%
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="border-slate-600 text-white"
              onClick={applyDefaults}
              disabled={!entity.erp_provider}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" /> Apply Defaults
            </Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white"
              onClick={saveMapping}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Mappings'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Completion Progress */}
        <div className="mb-6 p-4 bg-slate-900 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-400">Mapping Completion</span>
            <span className={`font-semibold ${
              (mapping?.completion_pct || 0) >= 100 ? 'text-green-400' :
              (mapping?.completion_pct || 0) >= 50 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {mapping?.completion_pct || 0}%
            </span>
          </div>
          <Progress value={mapping?.completion_pct || 0} className="h-2" />
          {mapping?.required_missing?.length > 0 && (
            <div className="mt-3">
              <p className="text-yellow-400 text-sm flex items-center">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Missing required: {mapping.required_missing.slice(0, 3).join(', ')}
                {mapping.required_missing.length > 3 && ` +${mapping.required_missing.length - 3} more`}
              </p>
            </div>
          )}
        </div>

        {/* Mappings Table */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-semibold">Account Mappings</h4>
            <Button variant="outline" size="sm" className="border-slate-600 text-white" onClick={addMapping}>
              <Plus className="w-4 h-4 mr-2" /> Add Mapping
            </Button>
          </div>

          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-gray-400 w-32">Local Code</TableHead>
                  <TableHead className="text-gray-400">Local Name</TableHead>
                  <TableHead className="text-gray-400 w-8"></TableHead>
                  <TableHead className="text-gray-400 w-64">Group Category</TableHead>
                  <TableHead className="text-gray-400 w-24">Verified</TableHead>
                  <TableHead className="text-gray-400 w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newMappings.map((m, idx) => (
                  <TableRow key={idx} className="border-slate-700">
                    <TableCell>
                      <Input
                        value={m.local_account_code}
                        onChange={(e) => updateMapping(idx, 'local_account_code', e.target.value)}
                        className="bg-slate-900 border-slate-600 text-white h-8"
                        placeholder="e.g., 4000"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={m.local_account_name}
                        onChange={(e) => updateMapping(idx, 'local_account_name', e.target.value)}
                        className="bg-slate-900 border-slate-600 text-white h-8"
                        placeholder="Account name"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <ArrowRight className="w-4 h-4 text-gray-500" />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={m.group_category}
                        onValueChange={(v) => updateMapping(idx, 'group_category', v)}
                      >
                        <SelectTrigger className="bg-slate-900 border-slate-600 text-white h-8">
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-600 max-h-[300px]">
                          {groupSchema && Object.entries(groupSchema.categories).map(([key, cat]) => (
                            <SelectItem key={key} value={key} className="text-white">
                              <span className="flex items-center">
                                {cat.name}
                                {cat.is_required && (
                                  <span className="ml-2 text-yellow-400 text-xs">*</span>
                                )}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateMapping(idx, 'is_verified', !m.is_verified)}
                        className={m.is_verified ? 'text-green-400' : 'text-gray-400'}
                      >
                        {m.is_verified ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMapping(idx)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {newMappings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-400 py-8">
                      No mappings yet. Click "Apply Defaults" or "Add Mapping" to start.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};

// Group Schema Reference
const GroupSchemaReference = ({ schema }) => {
  const [expanded, setExpanded] = useState(false);

  const categoryTypes = {
    income: { label: 'Income', color: 'green' },
    expense: { label: 'Expense', color: 'red' },
    asset: { label: 'Asset', color: 'blue' },
    liability: { label: 'Liability', color: 'orange' },
    equity: { label: 'Equity', color: 'purple' },
    calculated: { label: 'Calculated', color: 'gray' }
  };

  const groupedCategories = Object.entries(schema.categories).reduce((acc, [key, cat]) => {
    const type = cat.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push({ key, ...cat });
    return acc;
  }, {});

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white">Unified Group Schema Reference</CardTitle>
            <CardDescription className="text-gray-400">
              Standard categories for consolidated reporting • {schema.required_categories.length} required
            </CardDescription>
          </div>
          <Button
            variant="outline"
            className="border-slate-600 text-white"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(groupedCategories).map(([type, categories]) => (
              <div key={type}>
                <h4 className={`text-sm font-semibold mb-3 ${
                  categoryTypes[type]?.color === 'green' ? 'text-green-400' :
                  categoryTypes[type]?.color === 'red' ? 'text-red-400' :
                  categoryTypes[type]?.color === 'blue' ? 'text-blue-400' :
                  categoryTypes[type]?.color === 'orange' ? 'text-orange-400' :
                  categoryTypes[type]?.color === 'purple' ? 'text-purple-400' :
                  'text-gray-400'
                }`}>
                  {categoryTypes[type]?.label || type}
                </h4>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <div
                      key={cat.key}
                      className="flex items-center justify-between p-2 bg-slate-900 rounded"
                    >
                      <div>
                        <span className="text-white text-sm">{cat.name}</span>
                        {cat.is_required && (
                          <span className="ml-2 text-yellow-400 text-xs">Required</span>
                        )}
                      </div>
                      <code className="text-gray-500 text-xs">{cat.key}</code>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default COAMappingPage;
