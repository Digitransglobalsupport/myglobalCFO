import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth, useApp } from '../App';
import { toast } from 'sonner';
import {
  Receipt, RefreshCcw, Building2, Plus, Trash2, Search, Filter, X,
  CheckCircle, Clock, XCircle, Zap, Download, Upload, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const FinancialManagement = () => {
  const location = useLocation();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Financial Management</h1>
        <p className="text-gray-400 mt-1">Transaction Management, Reconciliation & Multi-Entity Consolidation</p>
      </div>

      {/* Sub-navigation */}
      <Tabs defaultValue="transactions" className="space-y-6">
        <TabsList className="bg-navy-800 border-navy-700">
          <TabsTrigger value="transactions" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Receipt className="w-4 h-4 mr-2" /> Transaction Management
          </TabsTrigger>
          <TabsTrigger value="reconciliation" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <RefreshCcw className="w-4 h-4 mr-2" /> Automated Reconciliation
          </TabsTrigger>
          <TabsTrigger value="consolidation" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Layers className="w-4 h-4 mr-2" /> Multi-Entity Consolidation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <TransactionManagement />
        </TabsContent>

        <TabsContent value="reconciliation">
          <AutomatedReconciliation />
        </TabsContent>

        <TabsContent value="consolidation">
          <MultiEntityConsolidation />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Transaction Management Component
const TransactionManagement = () => {
  const { authAxios } = useAuth();
  const { selectedCompany, mockDataEnabled } = useApp();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', category: '', status: '', search: '' });

  useEffect(() => {
    if (selectedCompany) fetchTransactions();
  }, [selectedCompany]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCompany) params.append('company_id', selectedCompany.id);
      const res = await authAxios.get(`/transactions?${params.toString()}`);
      setTransactions(res.data);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const generateDemoData = async () => {
    try {
      await authAxios.post(`/seed-demo-data?company_id=${selectedCompany.id}`);
      toast.success('Demo data generated!');
      fetchTransactions();
    } catch (e) {
      toast.error('Failed to generate data');
    }
  };

  const clearAllData = async () => {
    try {
      await authAxios.delete(`/transactions?company_id=${selectedCompany.id}`);
      toast.success('All transactions deleted');
      fetchTransactions();
    } catch (e) {
      toast.error('Failed to delete');
    }
  };

  const displayTransactions = mockDataEnabled && transactions.length === 0 ? getMockTransactions() : transactions;

  const filteredTransactions = displayTransactions.filter(tx => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!tx.description.toLowerCase().includes(search) && 
          !tx.counterparty?.toLowerCase().includes(search)) return false;
    }
    if (filters.type && filters.type !== 'all' && tx.type !== filters.type) return false;
    if (filters.category && filters.category !== 'all' && tx.category !== filters.category) return false;
    if (filters.status && filters.status !== 'all' && tx.status !== filters.status) return false;
    return true;
  });

  const formatCurrency = (amount) => {
    const symbol = { GBP: '£', USD: '$', EUR: '€' }[selectedCompany?.currency] || '£';
    return `${amount < 0 ? '-' : ''}${symbol}${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  const getStatusBadge = (status) => {
    const styles = {
      'Matched': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Unmatched': 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return <Badge className={`${styles[status]} border`}>{status}</Badge>;
  };

  if (!selectedCompany) {
    return (
      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="py-16 text-center">
          <Receipt className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Select an Entity</h3>
          <p className="text-gray-400">Choose a company to view transactions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="relative flex-1 min-w-[300px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search transactions..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 bg-navy-900 border-navy-600 text-white"
            />
          </div>
          <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
            <SelectTrigger className="w-[140px] bg-navy-900 border-navy-600 text-white">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-navy-800 border-navy-600">
              <SelectItem value="all" className="text-white">All Types</SelectItem>
              <SelectItem value="Invoice" className="text-white">Invoice</SelectItem>
              <SelectItem value="Bill" className="text-white">Bill</SelectItem>
              <SelectItem value="Bank Transaction" className="text-white">Bank Transaction</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger className="w-[140px] bg-navy-900 border-navy-600 text-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-navy-800 border-navy-600">
              <SelectItem value="all" className="text-white">All Status</SelectItem>
              <SelectItem value="Matched" className="text-white">Matched</SelectItem>
              <SelectItem value="Pending" className="text-white">Pending</SelectItem>
              <SelectItem value="Unmatched" className="text-white">Unmatched</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="border-navy-600 text-white" onClick={generateDemoData}>
            <Plus className="w-4 h-4 mr-2" /> Generate Demo Data
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-red-500/50 text-red-400">
                <Trash2 className="w-4 h-4 mr-2" /> Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-navy-800 border-navy-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete All Transactions?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">This action cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-navy-700 text-white">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearAllData} className="bg-red-500">Delete All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Table */}
      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-16 text-center">
              <Receipt className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Transactions</h3>
              <Button className="bg-gold-500 text-navy-900 mt-4" onClick={generateDemoData}>Generate Demo Data</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-navy-700">
                  <TableHead className="text-gray-400">Date</TableHead>
                  <TableHead className="text-gray-400">Description</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Category</TableHead>
                  <TableHead className="text-gray-400 text-right">Amount</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.slice(0, 50).map((tx) => (
                  <TableRow key={tx.id} className="border-navy-700 hover:bg-navy-700/50">
                    <TableCell className="text-gray-300">{formatDate(tx.date)}</TableCell>
                    <TableCell>
                      <div className="text-white">{tx.description}</div>
                      {tx.counterparty && <div className="text-sm text-gray-500">{tx.counterparty}</div>}
                    </TableCell>
                    <TableCell><Badge className="bg-blue-500/20 text-blue-400">{tx.type}</Badge></TableCell>
                    <TableCell className="text-gray-300">{tx.category}</TableCell>
                    <TableCell className={`text-right font-semibold ${tx.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell>{getStatusBadge(tx.status)}</TableCell>
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

// Automated Reconciliation Component
const AutomatedReconciliation = () => {
  const { authAxios } = useAuth();
  const { selectedCompany, mockDataEnabled } = useApp();
  const [status, setStatus] = useState({ matched_count: 0, pending_count: 0, unmatched_count: 0 });
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    if (selectedCompany) fetchStatus();
  }, [selectedCompany]);

  const fetchStatus = async () => {
    try {
      const res = await authAxios.get(`/reconciliation/status/${selectedCompany.id}`);
      setStatus(res.data);
    } catch (e) {
      console.error('Error:', e);
    }
  };

  const handleAutoReconcile = async () => {
    try {
      setReconciling(true);
      const res = await authAxios.post(`/reconciliation/auto-match?company_id=${selectedCompany.id}`);
      setStatus({ matched_count: res.data.matched_count, pending_count: res.data.pending_count, unmatched_count: res.data.unmatched_count });
      toast.success(`Matched ${res.data.newly_matched} transactions!`);
    } catch (e) {
      toast.error('Failed to reconcile');
    } finally {
      setReconciling(false);
    }
  };

  const displayStatus = mockDataEnabled && status.matched_count + status.pending_count + status.unmatched_count === 0
    ? { matched_count: 156, pending_count: 34, unmatched_count: 12 }
    : status;

  const total = displayStatus.matched_count + displayStatus.pending_count + displayStatus.unmatched_count;
  const matchedPercent = total > 0 ? (displayStatus.matched_count / total) * 100 : 0;

  if (!selectedCompany) {
    return (
      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="py-16 text-center">
          <RefreshCcw className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Select an Entity</h3>
          <p className="text-gray-400">Choose a company to manage reconciliation</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Auto-Reconcile Action */}
      <Card className="bg-gradient-to-r from-gold-500/20 to-gold-600/10 border-gold-500/30">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gold-500/20 rounded-lg">
                <Zap className="w-6 h-6 text-gold-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Auto-Reconciliation Engine</h3>
                <p className="text-gray-400">Intelligent matching of bank transactions with accounting records</p>
              </div>
            </div>
            <Button 
              className="bg-gold-500 hover:bg-gold-600 text-navy-900"
              onClick={handleAutoReconcile}
              disabled={reconciling}
            >
              {reconciling ? <><RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : <><Zap className="w-4 h-4 mr-2" /> Run Auto-Reconcile</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Progress */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white">Reconciliation Progress</CardTitle>
          <CardDescription className="text-gray-400">{matchedPercent.toFixed(1)}% of transactions matched</CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={matchedPercent} className="h-3 bg-navy-700" />
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatusCard title="Matched" count={displayStatus.matched_count} icon={<CheckCircle />} color="green" description="Successfully reconciled" />
        <StatusCard title="Pending" count={displayStatus.pending_count} icon={<Clock />} color="yellow" description="Awaiting review" />
        <StatusCard title="Unmatched" count={displayStatus.unmatched_count} icon={<XCircle />} color="red" description="Requires attention" />
      </div>
    </div>
  );
};

const StatusCard = ({ title, count, icon, color, description }) => {
  const colors = {
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30'
  };
  return (
    <Card className={`border ${colors[color]} bg-navy-800`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-4xl font-bold text-white mt-2">{count}</p>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <div className={`p-4 rounded-lg ${colors[color].split(' ')[0]}`}>
            {React.cloneElement(icon, { className: 'w-8 h-8' })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Multi-Entity Consolidation Component
const MultiEntityConsolidation = () => {
  const { authAxios } = useAuth();
  const { companies, mockDataEnabled } = useApp();
  const [groupSummary, setGroupSummary] = useState(null);
  const [entityMetrics, setEntityMetrics] = useState({});
  const [entityRAGEvaluations, setEntityRAGEvaluations] = useState({});

  useEffect(() => {
    let isMounted = true;
    
    const fetchAllData = async () => {
      try {
        const groupRes = await authAxios.get('/dashboard/group/summary');
        if (!isMounted) return;
        setGroupSummary(groupRes.data);

        const metricsMap = {};
        const ragEvaluations = {};
        
        for (const company of companies) {
          try {
            const res = await authAxios.get(`/dashboard/${company.id}`);
            metricsMap[company.id] = res.data;
            
            // Evaluate RAG for each entity
            const metricsForRAG = {
              ebitda_margin: res.data?.ebitda_margin || 0,
              revenue_growth: res.data?.revenue_growth || 0,
              quick_ratio: res.data?.quick_ratio || 0,
              cash_runway: res.data?.runway_days || 0
            };
            
            try {
              const ragRes = await authAxios.post(`/rag-policies/${company.id}/evaluate`, metricsForRAG);
              ragEvaluations[company.id] = ragRes.data.evaluations || {};
            } catch (ragErr) {
              ragEvaluations[company.id] = {};
            }
          } catch (err) {
            console.error(`Error fetching data for company ${company.id}:`, err);
          }
        }
        
        if (isMounted) {
          setEntityMetrics(metricsMap);
          setEntityRAGEvaluations(ragEvaluations);
        }
      } catch (e) {
        console.error('Error:', e);
      }
    };
    
    fetchAllData();
    
    return () => {
      isMounted = false;
    };
  }, [authAxios, companies]);

  const formatCurrency = (amount, currency = 'GBP') => {
    const symbol = { GBP: '£', USD: '$', EUR: '€' }[currency] || '£';
    return `${symbol}${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 0 })}`;
  };

  // Get RAG color for a specific company and metric
  const getRAGColor = (companyId, metricId) => {
    const status = entityRAGEvaluations[companyId]?.[metricId]?.status;
    switch (status) {
      case 'green': return 'text-green-400';
      case 'amber': return 'text-yellow-400';
      case 'red': return 'text-red-400';
      default: return 'text-white';
    }
  };

  const displaySummary = mockDataEnabled && (!groupSummary || groupSummary.total_revenue === 0)
    ? { total_revenue: 3750000, total_ebitda: 937500, group_margin: 25, total_cash: 1455000, entity_count: 3 }
    : groupSummary;

  const getMockMetrics = (i) => ({ revenue: 1250000 + i * 250000, ebitda: 312500 + i * 62500, ebitda_margin: 22 + i * 3, cash_balance: 485000 + i * 100000 });

  return (
    <div className="space-y-6" data-testid="multi-entity-consolidation">
      {/* Group Summary */}
      <Card className="bg-gradient-to-r from-gold-500/20 to-gold-600/10 border-gold-500/30">
        <CardHeader>
          <CardTitle className="text-gold-400 flex items-center">
            <Layers className="w-5 h-5 mr-2" /> Consolidated Group Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div><p className="text-sm text-gray-400">Total Revenue</p><p className="text-2xl font-bold text-white">{formatCurrency(displaySummary?.total_revenue || 0)}</p></div>
            <div><p className="text-sm text-gray-400">Total EBITDA</p><p className="text-2xl font-bold text-white">{formatCurrency(displaySummary?.total_ebitda || 0)}</p></div>
            <div><p className="text-sm text-gray-400">Group Margin</p><p className="text-2xl font-bold text-white">{displaySummary?.group_margin || 0}%</p></div>
            <div><p className="text-sm text-gray-400">Total Cash</p><p className="text-2xl font-bold text-white">{formatCurrency(displaySummary?.total_cash || 0)}</p></div>
            <div><p className="text-sm text-gray-400">Entities</p><p className="text-2xl font-bold text-white">{displaySummary?.entity_count || companies.length}</p></div>
          </div>
        </CardContent>
      </Card>

      {/* Entity Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {companies.map((company, i) => {
          const metrics = mockDataEnabled && (!entityMetrics[company.id] || entityMetrics[company.id]?.transaction_count === 0)
            ? getMockMetrics(i)
            : entityMetrics[company.id];
          return (
            <Card key={company.id} className="bg-navy-800 border-navy-700" data-testid={`consolidation-entity-${company.id}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white text-lg">{company.name}</CardTitle>
                  <Badge className="bg-gold-500/20 text-gold-400">{company.currency}</Badge>
                </div>
                <p className="text-sm text-gray-400">{company.country} • {company.company_type}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <div><p className="text-xs text-gray-500">Revenue</p><p className="text-sm font-semibold text-white">{formatCurrency(metrics?.revenue || 0, company.currency)}</p></div>
                  <div><p className="text-xs text-gray-500">EBITDA</p><p className="text-sm font-semibold text-white">{formatCurrency(metrics?.ebitda || 0, company.currency)}</p></div>
                  <div><p className="text-xs text-gray-500">Margin</p><p className={`text-sm font-semibold ${getRAGColor(company.id, 'ebitda_margin')}`}>{metrics?.ebitda_margin || 0}%</p></div>
                  <div><p className="text-xs text-gray-500">Cash</p><p className="text-sm font-semibold text-white">{formatCurrency(metrics?.cash_balance || 0, company.currency)}</p></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

// Mock data helper
const getMockTransactions = () => {
  const types = ['Invoice', 'Bill', 'Bank Transaction', 'Journal Entry'];
  const categories = ['Sales', 'Marketing', 'Operations', 'Technology', 'Administration'];
  const statuses = ['Matched', 'Pending', 'Unmatched'];
  const counterparties = ['Acme Corp', 'TechStart Ltd', 'GlobalTrade Inc', 'ServicePro Ltd'];
  const descriptions = ['Professional services', 'Software subscription', 'Office supplies', 'Marketing campaign'];

  return Array.from({ length: 50 }, (_, i) => ({
    id: `mock-${i}`,
    date: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    amount: (Math.random() > 0.4 ? 1 : -1) * Math.round(Math.random() * 50000 * 100) / 100,
    type: types[Math.floor(Math.random() * types.length)],
    category: categories[Math.floor(Math.random() * categories.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    counterparty: counterparties[Math.floor(Math.random() * counterparties.length)]
  }));
};

export default FinancialManagement;
