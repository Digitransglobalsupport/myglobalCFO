import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, useApp } from '../App';
import { useCurrency } from '../context/CurrencyContext';
import { toast } from 'sonner';
import {
  Building2, Globe, RefreshCcw, TrendingUp, DollarSign, ArrowRight,
  Plus, Trash2, Play, Eye, Calendar, AlertCircle, CheckCircle,
  Layers, Activity, Download, Clock, Link2, Unlink, FileX, Settings,
  ArrowLeftRight, Zap, Filter, Search
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
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';

const ConsolidationPage = () => {
  return (
    <div className="space-y-6" data-testid="consolidation-page">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Multi-Entity Consolidation</h1>
        <p className="text-gray-400 mt-1">Consolidate financials across entities with automatic currency conversion</p>
      </div>

      <Tabs defaultValue="groups" className="space-y-6">
        <TabsList className="bg-navy-800 border-navy-700">
          <TabsTrigger value="groups" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Layers className="w-4 h-4 mr-2" /> Consolidation Groups
          </TabsTrigger>
          <TabsTrigger value="ic-eliminations" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900" data-testid="ic-eliminations-tab">
            <ArrowLeftRight className="w-4 h-4 mr-2" /> IC Eliminations
          </TabsTrigger>
          <TabsTrigger value="fx" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Globe className="w-4 h-4 mr-2" /> FX Rates
          </TabsTrigger>
          <TabsTrigger value="results" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Activity className="w-4 h-4 mr-2" /> Results History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups">
          <ConsolidationGroups />
        </TabsContent>

        <TabsContent value="ic-eliminations">
          <ICEliminationsPanel />
        </TabsContent>

        <TabsContent value="fx">
          <FXRatesPanel />
        </TabsContent>

        <TabsContent value="results">
          <ResultsHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Consolidation Groups Management
const ConsolidationGroups = () => {
  const { authAxios } = useAuth();
  const { companies } = useApp();
  const { formatCurrency } = useCurrency();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [consolidationResult, setConsolidationResult] = useState(null);
  const [runningGroup, setRunningGroup] = useState(null);

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    reporting_currency: 'USD',
    entity_ids: []
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/consolidation/groups');
      setGroups(res.data);
    } catch (e) {
      console.error('Error fetching groups:', e);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async () => {
    if (!newGroup.name.trim() || newGroup.entity_ids.length === 0) {
      toast.error('Please enter a name and select at least one entity');
      return;
    }
    try {
      await authAxios.post('/consolidation/groups', newGroup);
      toast.success('Consolidation group created!');
      setShowCreate(false);
      fetchGroups();
      setNewGroup({ name: '', description: '', reporting_currency: 'USD', entity_ids: [] });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create group');
    }
  };

  const runConsolidation = async (groupId) => {
    try {
      setRunningGroup(groupId);
      const res = await authAxios.post(`/consolidation/groups/${groupId}/consolidate?period=current`);
      setConsolidationResult(res.data);
      setShowResults(true);
      toast.success('Consolidation completed!');
    } catch (e) {
      toast.error('Failed to run consolidation');
    } finally {
      setRunningGroup(null);
    }
  };

  const deleteGroup = async (groupId) => {
    if (!window.confirm('Delete this consolidation group?')) return;
    try {
      await authAxios.delete(`/consolidation/groups/${groupId}`);
      toast.success('Group deleted');
      fetchGroups();
    } catch (e) {
      toast.error('Failed to delete group');
    }
  };

  const toggleEntity = (entityId) => {
    setNewGroup(prev => ({
      ...prev,
      entity_ids: prev.entity_ids.includes(entityId)
        ? prev.entity_ids.filter(id => id !== entityId)
        : [...prev.entity_ids, entityId]
    }));
  };

  return (
    <div className="space-y-6" data-testid="consolidation-groups">
      {/* Entity Summary */}
      <EntitySummaryCards />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-white">Consolidation Groups</h2>
          <p className="text-gray-400 text-sm">Define entity groupings for consolidated reporting</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900" data-testid="create-group-btn">
              <Plus className="w-4 h-4 mr-2" /> Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-navy-800 border-navy-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Create Consolidation Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Group Name</Label>
                <Input
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white"
                  placeholder="e.g., Global Consolidated"
                />
              </div>
              <div>
                <Label className="text-gray-300">Description</Label>
                <Textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white"
                  placeholder="Description of this consolidation group"
                  rows={2}
                />
              </div>
              <div>
                <Label className="text-gray-300">Reporting Currency</Label>
                <Select
                  value={newGroup.reporting_currency}
                  onValueChange={(v) => setNewGroup({ ...newGroup, reporting_currency: v })}
                >
                  <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-600">
                    <SelectItem value="USD" className="text-white">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR" className="text-white">EUR - Euro</SelectItem>
                    <SelectItem value="GBP" className="text-white">GBP - British Pound</SelectItem>
                    <SelectItem value="JPY" className="text-white">JPY - Japanese Yen</SelectItem>
                    <SelectItem value="CHF" className="text-white">CHF - Swiss Franc</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300 mb-3 block">Select Entities</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {companies.map((company) => (
                    <div
                      key={company.id}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                        newGroup.entity_ids.includes(company.id)
                          ? 'bg-gold-500/10 border-gold-500/50'
                          : 'bg-navy-900 border-navy-700 hover:border-navy-600'
                      }`}
                      onClick={() => toggleEntity(company.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={newGroup.entity_ids.includes(company.id)}
                          onCheckedChange={() => toggleEntity(company.id)}
                        />
                        <div>
                          <p className="text-white font-medium">{company.name}</p>
                          <p className="text-sm text-gray-400">{company.country}</p>
                        </div>
                      </div>
                      <Badge className="bg-blue-500/20 text-blue-400">{company.currency}</Badge>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {newGroup.entity_ids.length} entities selected
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-navy-600 text-white">
                Cancel
              </Button>
              <Button onClick={createGroup} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Results Dialog */}
      <Dialog open={showResults} onOpenChange={setShowResults}>
        <DialogContent className="bg-navy-800 border-navy-700 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Consolidation Results</DialogTitle>
          </DialogHeader>
          {consolidationResult && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-white">{consolidationResult.group_name}</h3>
                  <p className="text-sm text-gray-400">
                    Period: {consolidationResult.period} | Reporting Currency: {consolidationResult.reporting_currency}
                  </p>
                </div>
                <Badge className="bg-green-500/20 text-green-400">
                  <CheckCircle className="w-3 h-3 mr-1" /> Live FX Rates
                </Badge>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <ResultCard
                  title="Total Revenue"
                  value={formatCurrency(consolidationResult.total_revenue, consolidationResult.reporting_currency)}
                  icon={<TrendingUp className="w-4 h-4" />}
                />
                <ResultCard
                  title="Total Expenses"
                  value={formatCurrency(consolidationResult.total_expenses, consolidationResult.reporting_currency)}
                  icon={<TrendingUp className="w-4 h-4" />}
                />
                <ResultCard
                  title="Total EBITDA"
                  value={formatCurrency(consolidationResult.total_ebitda, consolidationResult.reporting_currency)}
                  icon={<DollarSign className="w-4 h-4" />}
                  highlight={consolidationResult.total_ebitda > 0}
                />
              </div>

              {/* Entity Breakdown */}
              <div>
                <h4 className="text-white font-semibold mb-3">Entity Breakdown</h4>
                <Table>
                  <TableHeader>
                    <TableRow className="border-navy-700">
                      <TableHead className="text-gray-400">Entity</TableHead>
                      <TableHead className="text-gray-400">Local Currency</TableHead>
                      <TableHead className="text-gray-400">FX Rate</TableHead>
                      <TableHead className="text-gray-400">Local Revenue</TableHead>
                      <TableHead className="text-gray-400">Converted Revenue</TableHead>
                      <TableHead className="text-gray-400">Converted EBITDA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {consolidationResult.entity_breakdown.map((entity, idx) => (
                      <TableRow key={idx} className="border-navy-700">
                        <TableCell className="text-white font-medium">{entity.entity_name}</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-500/20 text-blue-400">{entity.local_currency}</Badge>
                        </TableCell>
                        <TableCell className="text-gray-300">{entity.fx_rate.toFixed(4)}</TableCell>
                        <TableCell className="text-gray-300">
                          {formatCurrency(entity.local_values.revenue, entity.local_currency)}
                        </TableCell>
                        <TableCell className="text-white font-semibold">
                          {formatCurrency(entity.converted_values.revenue, consolidationResult.reporting_currency)}
                        </TableCell>
                        <TableCell className={entity.converted_values.ebitda >= 0 ? 'text-green-400' : 'text-red-400'}>
                          {formatCurrency(entity.converted_values.ebitda, consolidationResult.reporting_currency)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* FX Rates Used */}
              <div>
                <h4 className="text-white font-semibold mb-3">FX Rates Used</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(consolidationResult.fx_rates_used).map(([currency, rate]) => (
                    <Badge key={currency} className="bg-navy-700 text-gray-300">
                      {currency} → {consolidationResult.reporting_currency}: {rate.toFixed(4)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Groups List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      ) : groups.length === 0 ? (
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="py-16 text-center">
            <Layers className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Consolidation Groups</h3>
            <p className="text-gray-400 mb-4">Create your first group to start consolidating financials</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {groups.map((group) => (
            <Card key={group.id} className="bg-navy-800 border-navy-700">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white">{group.name}</CardTitle>
                    <CardDescription className="text-gray-400">{group.description || 'No description'}</CardDescription>
                  </div>
                  <Badge className="bg-gold-500/20 text-gold-400">{group.reporting_currency}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Entities ({group.entities?.length || 0})</p>
                  <div className="flex flex-wrap gap-2">
                    {group.entities?.map((entity, idx) => (
                      <Badge key={idx} className="bg-navy-700 text-gray-300">
                        {entity.name} ({entity.currency})
                      </Badge>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    className="border-navy-600 text-white"
                    onClick={() => runConsolidation(group.id)}
                    disabled={runningGroup === group.id}
                  >
                    {runningGroup === group.id ? (
                      <>
                        <RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Running...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" /> Run Consolidation
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => deleteGroup(group.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Entity Summary Cards
const EntitySummaryCards = () => {
  const { authAxios } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await authAxios.get('/consolidation/entity-summary');
      setSummary(res.data);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Entities</p>
              <p className="text-3xl font-bold text-white">{summary?.total_entities || 0}</p>
            </div>
            <Building2 className="w-8 h-8 text-gold-400" />
          </div>
        </CardContent>
      </Card>
      <Card className="bg-navy-800 border-navy-700 col-span-3">
        <CardContent className="pt-6">
          <p className="text-sm text-gray-400 mb-2">By Currency</p>
          <div className="flex flex-wrap gap-2">
            {summary?.by_currency && Object.entries(summary.by_currency).map(([curr, count]) => (
              <Badge key={curr} className="bg-blue-500/20 text-blue-400">
                {curr}: {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// FX Rates Panel
const FXRatesPanel = () => {
  const { authAxios } = useAuth();
  const [rates, setRates] = useState(null);
  const [baseCurrency, setBaseCurrency] = useState('EUR');
  const [loading, setLoading] = useState(true);
  const [convertAmount, setConvertAmount] = useState('1000');
  const [fromCurrency, setFromCurrency] = useState('GBP');
  const [toCurrency, setToCurrency] = useState('USD');
  const [conversionResult, setConversionResult] = useState(null);

  useEffect(() => {
    fetchRates();
  }, [baseCurrency]);

  const fetchRates = async () => {
    try {
      setLoading(true);
      const res = await authAxios.get(`/fx/rates?base_currency=${baseCurrency}`);
      setRates(res.data);
    } catch (e) {
      console.error('Error fetching FX rates:', e);
    } finally {
      setLoading(false);
    }
  };

  const convertCurrency = async () => {
    try {
      const res = await authAxios.get(
        `/fx/convert?amount=${convertAmount}&from_currency=${fromCurrency}&to_currency=${toCurrency}`
      );
      setConversionResult(res.data);
    } catch (e) {
      toast.error('Conversion failed');
    }
  };

  const majorCurrencies = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'CNY', 'INR'];

  return (
    <div className="space-y-6" data-testid="fx-rates-panel">
      {/* Live Rates Card */}
      <Card className="bg-gradient-to-r from-blue-900/30 to-green-900/30 border-blue-500/30">
        <CardContent className="py-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <Globe className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Live Exchange Rates</h3>
              </div>
              <p className="text-gray-300 text-sm">
                Source: <span className="text-blue-400">{rates?.source || 'Loading...'}</span>
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Last updated: {rates?.as_of ? new Date(rates.as_of).toLocaleString() : '-'}
              </p>
            </div>
            <Badge className="bg-green-500/20 text-green-400">
              <CheckCircle className="w-3 h-3 mr-1" /> Live Data
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rates Table */}
        <Card className="bg-navy-800 border-navy-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-white">Exchange Rates</CardTitle>
              <Select value={baseCurrency} onValueChange={setBaseCurrency}>
                <SelectTrigger className="w-32 bg-navy-900 border-navy-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-navy-800 border-navy-600">
                  {majorCurrencies.map(c => (
                    <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-gold-500"></div>
              </div>
            ) : (
              <div className="space-y-2">
                {rates?.rates && Object.entries(rates.rates)
                  .filter(([curr]) => majorCurrencies.includes(curr) && curr !== baseCurrency)
                  .map(([currency, rate]) => (
                    <div key={currency} className="flex items-center justify-between p-3 bg-navy-900 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-white font-medium">{currency}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-semibold">{rate.toFixed(4)}</span>
                        <span className="text-gray-400 text-sm ml-2">/ 1 {baseCurrency}</span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Currency Converter */}
        <Card className="bg-navy-800 border-navy-700">
          <CardHeader>
            <CardTitle className="text-white">Currency Converter</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-gray-300">Amount</Label>
              <Input
                type="number"
                value={convertAmount}
                onChange={(e) => setConvertAmount(e.target.value)}
                className="bg-navy-900 border-navy-600 text-white"
              />
            </div>
            <div className="grid grid-cols-5 gap-2 items-center">
              <div className="col-span-2">
                <Label className="text-gray-300">From</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-600">
                    {majorCurrencies.map(c => (
                      <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-center pt-6">
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
              <div className="col-span-2">
                <Label className="text-gray-300">To</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-600">
                    {majorCurrencies.map(c => (
                      <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={convertCurrency} className="w-full bg-gold-500 hover:bg-gold-600 text-navy-900">
              Convert
            </Button>
            {conversionResult && (
              <div className="p-4 bg-navy-900 rounded-lg text-center">
                <p className="text-gray-400 text-sm">
                  {conversionResult.original_amount.toLocaleString()} {conversionResult.original_currency}
                </p>
                <p className="text-3xl font-bold text-white mt-2">
                  {conversionResult.converted_amount.toLocaleString()} {conversionResult.target_currency}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Rate: 1 {conversionResult.original_currency} = {conversionResult.fx_rate.toFixed(4)} {conversionResult.target_currency}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Results History
const ResultsHistory = () => {
  const { authAxios } = useAuth();
  const { formatCurrency } = useCurrency();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/consolidation/results?limit=20');
      setResults(res.data);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="results-history">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Consolidation History</h2>
          <p className="text-gray-400 text-sm">Historical consolidation results</p>
        </div>
        <Button variant="outline" className="border-navy-600 text-white" onClick={fetchResults}>
          <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      ) : results.length === 0 ? (
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="py-16 text-center">
            <Activity className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Results Yet</h3>
            <p className="text-gray-400">Run a consolidation to see results here</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-navy-700">
                  <TableHead className="text-gray-400">Group</TableHead>
                  <TableHead className="text-gray-400">Period</TableHead>
                  <TableHead className="text-gray-400">Currency</TableHead>
                  <TableHead className="text-gray-400">Total Revenue</TableHead>
                  <TableHead className="text-gray-400">Total EBITDA</TableHead>
                  <TableHead className="text-gray-400">Entities</TableHead>
                  <TableHead className="text-gray-400">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result, idx) => (
                  <TableRow key={idx} className="border-navy-700">
                    <TableCell className="text-white font-medium">{result.group_name}</TableCell>
                    <TableCell className="text-gray-300">{result.period}</TableCell>
                    <TableCell>
                      <Badge className="bg-gold-500/20 text-gold-400">{result.reporting_currency}</Badge>
                    </TableCell>
                    <TableCell className="text-white">
                      {formatCurrency(result.total_revenue, result.reporting_currency)}
                    </TableCell>
                    <TableCell className={result.total_ebitda >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {formatCurrency(result.total_ebitda, result.reporting_currency)}
                    </TableCell>
                    <TableCell className="text-gray-300">{result.entity_breakdown?.length || 0}</TableCell>
                    <TableCell className="text-gray-400 text-sm">
                      {new Date(result.consolidated_at).toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// Result Card Component
const ResultCard = ({ title, value, icon, highlight }) => (
  <div className={`p-4 rounded-lg ${highlight ? 'bg-green-500/10 border border-green-500/30' : 'bg-navy-900'}`}>
    <div className="flex items-center space-x-2 text-gray-400 text-sm mb-1">
      {icon}
      <span>{title}</span>
    </div>
    <p className={`text-xl font-bold ${highlight ? 'text-green-400' : 'text-white'}`}>{value}</p>
  </div>
);

// ======================= IC ELIMINATIONS PANEL =======================

const ICEliminationsPanel = () => {
  const { authAxios } = useAuth();
  const { companies } = useApp();
  const { formatCurrency } = useCurrency();
  const [icTransactions, setIcTransactions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTx, setShowCreateTx] = useState(false);
  const [showRulesDialog, setShowRulesDialog] = useState(false);
  const [showEliminationResult, setShowEliminationResult] = useState(false);
  const [eliminationResult, setEliminationResult] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [processing, setProcessing] = useState(false);
  const [selectedForMatch, setSelectedForMatch] = useState([]);

  const [newTx, setNewTx] = useState({
    source_entity_id: '',
    counterparty_entity_id: '',
    transaction_type: 'sale',
    description: '',
    amount: '',
    currency: 'USD',
    transaction_date: new Date().toISOString().split('T')[0],
    reference: ''
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [txRes, statsRes, rulesRes] = await Promise.all([
        authAxios.get('/ic-transactions'),
        authAxios.get('/ic-eliminations/statistics'),
        authAxios.get('/ic-elimination-rules')
      ]);
      setIcTransactions(txRes.data);
      setStatistics(statsRes.data);
      setRules(rulesRes.data);
    } catch (e) {
      console.error('Error fetching IC data:', e);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createTransaction = async () => {
    if (!newTx.source_entity_id || !newTx.counterparty_entity_id || !newTx.amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      await authAxios.post('/ic-transactions', {
        ...newTx,
        amount: parseFloat(newTx.amount),
        transaction_date: new Date(newTx.transaction_date).toISOString()
      });
      toast.success('IC transaction created');
      setShowCreateTx(false);
      setNewTx({
        source_entity_id: '',
        counterparty_entity_id: '',
        transaction_type: 'sale',
        description: '',
        amount: '',
        currency: 'USD',
        transaction_date: new Date().toISOString().split('T')[0],
        reference: ''
      });
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create transaction');
    }
  };

  const runAutoMatch = async () => {
    try {
      setProcessing(true);
      const res = await authAxios.post('/ic-eliminations/auto-match');
      toast.success(`Auto-matched ${res.data.newly_matched} transaction pairs`);
      fetchData();
    } catch (e) {
      toast.error('Auto-match failed');
    } finally {
      setProcessing(false);
    }
  };

  const runEliminations = async () => {
    try {
      setProcessing(true);
      const res = await authAxios.post('/ic-eliminations/run');
      setEliminationResult(res.data);
      setShowEliminationResult(true);
      toast.success(`Created ${res.data.eliminated_count} elimination entries`);
      fetchData();
    } catch (e) {
      toast.error('Elimination failed');
    } finally {
      setProcessing(false);
    }
  };

  const generateMockData = async () => {
    try {
      setProcessing(true);
      const res = await authAxios.post('/ic-transactions/generate-mock');
      toast.success(res.data.message);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to generate mock data');
    } finally {
      setProcessing(false);
    }
  };

  const manualMatch = async () => {
    if (selectedForMatch.length !== 2) {
      toast.error('Select exactly 2 transactions to match');
      return;
    }
    try {
      await authAxios.post('/ic-transactions/manual-match', {
        transaction_id_1: selectedForMatch[0],
        transaction_id_2: selectedForMatch[1]
      });
      toast.success('Transactions matched');
      setSelectedForMatch([]);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Match failed');
    }
  };

  const unmatchTransaction = async (txId) => {
    try {
      await authAxios.post(`/ic-transactions/unmatch/${txId}`);
      toast.success('Transaction unmatched');
      fetchData();
    } catch (e) {
      toast.error('Unmatch failed');
    }
  };

  const deleteTransaction = async (txId) => {
    if (!window.confirm('Delete this IC transaction?')) return;
    try {
      await authAxios.delete(`/ic-transactions/${txId}`);
      toast.success('Transaction deleted');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Delete failed');
    }
  };

  const toggleSelectForMatch = (txId) => {
    setSelectedForMatch(prev => {
      if (prev.includes(txId)) {
        return prev.filter(id => id !== txId);
      }
      if (prev.length >= 2) {
        return [prev[1], txId];
      }
      return [...prev, txId];
    });
  };

  const filteredTransactions = icTransactions.filter(tx => {
    if (filterStatus === 'all') return true;
    return tx.status === filterStatus;
  });

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Clock },
      matched: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Link2 },
      eliminated: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
      disputed: { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertCircle }
    };
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    return (
      <Badge className={`${config.bg} ${config.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      sale: { bg: 'bg-green-500/20', text: 'text-green-400' },
      purchase: { bg: 'bg-red-500/20', text: 'text-red-400' },
      loan: { bg: 'bg-purple-500/20', text: 'text-purple-400' },
      dividend: { bg: 'bg-pink-500/20', text: 'text-pink-400' },
      management_fee: { bg: 'bg-cyan-500/20', text: 'text-cyan-400' },
      royalty: { bg: 'bg-orange-500/20', text: 'text-orange-400' },
      transfer: { bg: 'bg-indigo-500/20', text: 'text-indigo-400' },
      other: { bg: 'bg-gray-500/20', text: 'text-gray-400' }
    };
    const config = typeConfig[type] || typeConfig.other;
    return (
      <Badge className={`${config.bg} ${config.text}`}>
        {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  return (
    <div className="space-y-6" data-testid="ic-eliminations-panel">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-400">Total IC Transactions</p>
            <p className="text-2xl font-bold text-white">{statistics?.total_count || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-400">Pending</p>
            <p className="text-2xl font-bold text-yellow-400">{statistics?.pending_count || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-400">Matched</p>
            <p className="text-2xl font-bold text-blue-400">{statistics?.matched_count || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-400">Eliminated</p>
            <p className="text-2xl font-bold text-green-400">{statistics?.eliminated_count || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="pt-4">
            <p className="text-sm text-gray-400">Total IC Amount</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(statistics?.total_ic_amount || 0, 'USD')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40 bg-navy-900 border-navy-600 text-white">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-navy-800 border-navy-600">
              <SelectItem value="all" className="text-white">All Status</SelectItem>
              <SelectItem value="pending" className="text-white">Pending</SelectItem>
              <SelectItem value="matched" className="text-white">Matched</SelectItem>
              <SelectItem value="eliminated" className="text-white">Eliminated</SelectItem>
              <SelectItem value="disputed" className="text-white">Disputed</SelectItem>
            </SelectContent>
          </Select>
          {selectedForMatch.length === 2 && (
            <Button onClick={manualMatch} className="bg-blue-600 hover:bg-blue-700 text-white">
              <Link2 className="w-4 h-4 mr-2" /> Match Selected
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="border-navy-600 text-white" onClick={generateMockData} disabled={processing}>
            <Zap className="w-4 h-4 mr-2" /> Generate Test Data
          </Button>
          <Button variant="outline" className="border-navy-600 text-white" onClick={() => setShowRulesDialog(true)}>
            <Settings className="w-4 h-4 mr-2" /> Rules
          </Button>
          <Button variant="outline" className="border-blue-600 text-blue-400 hover:bg-blue-600/20" onClick={runAutoMatch} disabled={processing}>
            <RefreshCcw className={`w-4 h-4 mr-2 ${processing ? 'animate-spin' : ''}`} /> Auto-Match
          </Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={runEliminations} disabled={processing || (statistics?.matched_count || 0) === 0}>
            <Play className="w-4 h-4 mr-2" /> Run Eliminations
          </Button>
          <Dialog open={showCreateTx} onOpenChange={setShowCreateTx}>
            <DialogTrigger asChild>
              <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900" data-testid="create-ic-tx-btn">
                <Plus className="w-4 h-4 mr-2" /> Add IC Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-navy-800 border-navy-700 max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-white">Add Inter-Company Transaction</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Source Entity</Label>
                    <Select value={newTx.source_entity_id} onValueChange={(v) => setNewTx({ ...newTx, source_entity_id: v })}>
                      <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                      <SelectContent className="bg-navy-800 border-navy-600">
                        {companies.map(c => (
                          <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Counterparty Entity</Label>
                    <Select value={newTx.counterparty_entity_id} onValueChange={(v) => setNewTx({ ...newTx, counterparty_entity_id: v })}>
                      <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                        <SelectValue placeholder="Select entity" />
                      </SelectTrigger>
                      <SelectContent className="bg-navy-800 border-navy-600">
                        {companies.filter(c => c.id !== newTx.source_entity_id).map(c => (
                          <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Transaction Type</Label>
                    <Select value={newTx.transaction_type} onValueChange={(v) => setNewTx({ ...newTx, transaction_type: v })}>
                      <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-navy-800 border-navy-600">
                        <SelectItem value="sale" className="text-white">Sale (Revenue)</SelectItem>
                        <SelectItem value="purchase" className="text-white">Purchase (Expense)</SelectItem>
                        <SelectItem value="loan" className="text-white">Loan</SelectItem>
                        <SelectItem value="dividend" className="text-white">Dividend</SelectItem>
                        <SelectItem value="management_fee" className="text-white">Management Fee</SelectItem>
                        <SelectItem value="royalty" className="text-white">Royalty</SelectItem>
                        <SelectItem value="transfer" className="text-white">Asset Transfer</SelectItem>
                        <SelectItem value="other" className="text-white">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-gray-300">Currency</Label>
                    <Select value={newTx.currency} onValueChange={(v) => setNewTx({ ...newTx, currency: v })}>
                      <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-navy-800 border-navy-600">
                        <SelectItem value="USD" className="text-white">USD</SelectItem>
                        <SelectItem value="EUR" className="text-white">EUR</SelectItem>
                        <SelectItem value="GBP" className="text-white">GBP</SelectItem>
                        <SelectItem value="JPY" className="text-white">JPY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-300">Amount</Label>
                    <Input
                      type="number"
                      value={newTx.amount}
                      onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                      className="bg-navy-900 border-navy-600 text-white"
                      placeholder="100000"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-300">Transaction Date</Label>
                    <Input
                      type="date"
                      value={newTx.transaction_date}
                      onChange={(e) => setNewTx({ ...newTx, transaction_date: e.target.value })}
                      className="bg-navy-900 border-navy-600 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-gray-300">Description</Label>
                  <Input
                    value={newTx.description}
                    onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                    className="bg-navy-900 border-navy-600 text-white"
                    placeholder="IC services invoice"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Reference (Invoice/PO Number)</Label>
                  <Input
                    value={newTx.reference}
                    onChange={(e) => setNewTx({ ...newTx, reference: e.target.value })}
                    className="bg-navy-900 border-navy-600 text-white"
                    placeholder="INV-2024-001"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateTx(false)} className="border-navy-600 text-white">Cancel</Button>
                <Button onClick={createTransaction} className="bg-gold-500 hover:bg-gold-600 text-navy-900">Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* IC Transactions Table */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white">Inter-Company Transactions</CardTitle>
          <CardDescription className="text-gray-400">
            Manage and eliminate inter-company transactions for accurate consolidated reporting
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-10">
              <ArrowLeftRight className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No IC Transactions</h3>
              <p className="text-gray-400 mb-4">Add inter-company transactions or generate test data to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-navy-700">
                  <TableHead className="text-gray-400 w-10">
                    <Checkbox checked={false} disabled className="opacity-50" />
                  </TableHead>
                  <TableHead className="text-gray-400">Source Entity</TableHead>
                  <TableHead className="text-gray-400">Counterparty</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Amount</TableHead>
                  <TableHead className="text-gray-400">Date</TableHead>
                  <TableHead className="text-gray-400">Reference</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id} className={`border-navy-700 ${selectedForMatch.includes(tx.id) ? 'bg-blue-500/10' : ''}`}>
                    <TableCell>
                      <Checkbox
                        checked={selectedForMatch.includes(tx.id)}
                        onCheckedChange={() => toggleSelectForMatch(tx.id)}
                        disabled={tx.status === 'eliminated'}
                      />
                    </TableCell>
                    <TableCell className="text-white font-medium">{tx.source_entity_name}</TableCell>
                    <TableCell className="text-gray-300">{tx.counterparty_entity_name}</TableCell>
                    <TableCell>{getTypeBadge(tx.transaction_type)}</TableCell>
                    <TableCell className="text-white font-semibold">
                      {formatCurrency(tx.amount, tx.currency)}
                    </TableCell>
                    <TableCell className="text-gray-300">
                      {new Date(tx.transaction_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-gray-400">{tx.reference || '-'}</TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {tx.status === 'matched' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-orange-400 hover:text-orange-300 p-1"
                            onClick={() => unmatchTransaction(tx.id)}
                            title="Unmatch"
                          >
                            <Unlink className="w-4 h-4" />
                          </Button>
                        )}
                        {tx.status !== 'eliminated' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 p-1"
                            onClick={() => deleteTransaction(tx.id)}
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Elimination Rules Dialog */}
      <Dialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
        <DialogContent className="bg-navy-800 border-navy-700 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">IC Elimination Rules</DialogTitle>
          </DialogHeader>
          <ICEliminationRulesConfig rules={rules} onSave={() => { fetchData(); setShowRulesDialog(false); }} />
        </DialogContent>
      </Dialog>

      {/* Elimination Result Dialog */}
      <Dialog open={showEliminationResult} onOpenChange={setShowEliminationResult}>
        <DialogContent className="bg-navy-800 border-navy-700 max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Elimination Results</DialogTitle>
          </DialogHeader>
          {eliminationResult && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-navy-900 p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Transactions Processed</p>
                  <p className="text-2xl font-bold text-white">{eliminationResult.total_ic_transactions}</p>
                </div>
                <div className="bg-navy-900 p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Elimination Entries</p>
                  <p className="text-2xl font-bold text-green-400">{eliminationResult.eliminated_count}</p>
                </div>
                <div className="bg-navy-900 p-4 rounded-lg">
                  <p className="text-sm text-gray-400">Revenue Eliminated</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(eliminationResult.eliminated_revenue, 'USD')}</p>
                </div>
                <div className="bg-navy-900 p-4 rounded-lg">
                  <p className="text-sm text-gray-400">AR/AP Eliminated</p>
                  <p className="text-2xl font-bold text-white">{formatCurrency(eliminationResult.eliminated_ar, 'USD')}</p>
                </div>
              </div>
              
              {eliminationResult.elimination_entries?.length > 0 && (
                <div>
                  <h4 className="text-white font-semibold mb-3">Elimination Entries</h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {eliminationResult.elimination_entries.map((entry, idx) => (
                      <div key={idx} className="bg-navy-900 p-3 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className="bg-green-500/20 text-green-400">{entry.type}</Badge>
                          <span className="text-white font-semibold">{formatCurrency(entry.amount, entry.currency)}</span>
                        </div>
                        <p className="text-sm text-gray-300">{entry.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          DR: {entry.debit_account} → CR: {entry.credit_account}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {eliminationResult.unmatched_transactions?.length > 0 && (
                <div>
                  <h4 className="text-yellow-400 font-semibold mb-3 flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" /> Unmatched Transactions ({eliminationResult.unmatched_transactions.length})
                  </h4>
                  <div className="space-y-2">
                    {eliminationResult.unmatched_transactions.slice(0, 5).map((tx, idx) => (
                      <div key={idx} className="bg-yellow-500/10 p-2 rounded border border-yellow-500/30">
                        <p className="text-sm text-white">{tx.source_entity_name} → {tx.counterparty_entity_name}</p>
                        <p className="text-xs text-gray-400">{tx.description} | Amount: {tx.amount}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// IC Elimination Rules Configuration Component
const ICEliminationRulesConfig = ({ rules, onSave }) => {
  const { authAxios } = useAuth();
  const [rule, setRule] = useState(rules[0] || {
    name: 'Default IC Elimination Rule',
    amount_tolerance_pct: 0.01,
    date_tolerance_days: 30,
    require_reference_match: false,
    auto_match_enabled: true
  });
  const [saving, setSaving] = useState(false);

  const saveRule = async () => {
    try {
      setSaving(true);
      const ruleId = rules[0]?.id || 'default';
      await authAxios.put(`/ic-elimination-rules/${ruleId}`, rule);
      toast.success('Rules saved');
      onSave();
    } catch (e) {
      toast.error('Failed to save rules');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300">Amount Tolerance (%)</Label>
        <Input
          type="number"
          step="0.01"
          value={rule.amount_tolerance_pct * 100}
          onChange={(e) => setRule({ ...rule, amount_tolerance_pct: parseFloat(e.target.value) / 100 })}
          className="bg-navy-900 border-navy-600 text-white"
        />
        <p className="text-xs text-gray-500 mt-1">Allow ±{(rule.amount_tolerance_pct * 100).toFixed(1)}% difference in amounts for matching</p>
      </div>
      <div>
        <Label className="text-gray-300">Date Tolerance (Days)</Label>
        <Input
          type="number"
          value={rule.date_tolerance_days}
          onChange={(e) => setRule({ ...rule, date_tolerance_days: parseInt(e.target.value) })}
          className="bg-navy-900 border-navy-600 text-white"
        />
        <p className="text-xs text-gray-500 mt-1">Match transactions within ±{rule.date_tolerance_days} days</p>
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-gray-300">Require Reference Match</Label>
          <p className="text-xs text-gray-500">Only match if reference numbers are identical</p>
        </div>
        <Switch
          checked={rule.require_reference_match}
          onCheckedChange={(checked) => setRule({ ...rule, require_reference_match: checked })}
        />
      </div>
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-gray-300">Auto-Match on Create</Label>
          <p className="text-xs text-gray-500">Automatically try to match when adding new transactions</p>
        </div>
        <Switch
          checked={rule.auto_match_enabled}
          onCheckedChange={(checked) => setRule({ ...rule, auto_match_enabled: checked })}
        />
      </div>
      <DialogFooter>
        <Button onClick={saveRule} disabled={saving} className="bg-gold-500 hover:bg-gold-600 text-navy-900 w-full">
          {saving ? 'Saving...' : 'Save Rules'}
        </Button>
      </DialogFooter>
    </div>
  );
};

export default ConsolidationPage;
