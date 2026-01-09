import React, { useState, useEffect } from 'react';
import { useAuth, useApp } from '../App';
import { toast } from 'sonner';
import { Receipt, Filter, Trash2, Plus, RefreshCcw, Download, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const TransactionsPage = () => {
  const { authAxios } = useAuth();
  const { selectedCompany, mockDataEnabled } = useApp();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    category: '',
    source: '',
    status: '',
    search: ''
  });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  useEffect(() => {
    if (selectedCompany) {
      fetchTransactions();
    }
  }, [selectedCompany]);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCompany) params.append('company_id', selectedCompany.id);
      if (filters.type) params.append('type', filters.type);
      if (filters.category) params.append('category', filters.category);
      if (filters.source) params.append('source', filters.source);
      if (filters.status) params.append('status', filters.status);
      
      const res = await authAxios.get(`/transactions?${params.toString()}`);
      setTransactions(res.data);
    } catch (e) {
      console.error('Error fetching transactions:', e);
    } finally {
      setLoading(false);
    }
  };

  const generateDemoData = async () => {
    try {
      await authAxios.post(`/seed-demo-data?company_id=${selectedCompany.id}`);
      toast.success('Demo data generated successfully!');
      fetchTransactions();
    } catch (e) {
      toast.error('Failed to generate demo data');
    }
  };

  const clearAllData = async () => {
    try {
      await authAxios.delete(`/transactions?company_id=${selectedCompany.id}`);
      toast.success('All transactions deleted');
      fetchTransactions();
    } catch (e) {
      toast.error('Failed to delete transactions');
    }
  };

  const clearFilters = () => {
    setFilters({ type: '', category: '', source: '', status: '', search: '' });
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    const aVal = a[sortConfig.key];
    const bVal = b[sortConfig.key];
    const modifier = sortConfig.direction === 'asc' ? 1 : -1;
    if (sortConfig.key === 'amount') return (aVal - bVal) * modifier;
    return String(aVal).localeCompare(String(bVal)) * modifier;
  });

  const filteredTransactions = sortedTransactions.filter(tx => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      return tx.description.toLowerCase().includes(searchLower) ||
             tx.counterparty?.toLowerCase().includes(searchLower) ||
             tx.reference?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  const displayTransactions = mockDataEnabled && transactions.length === 0 
    ? getMockTransactions() 
    : filteredTransactions;

  const formatCurrency = (amount) => {
    const symbol = { GBP: '£', USD: '$', EUR: '€' }[selectedCompany?.currency] || '£';
    return `${amount < 0 ? '-' : ''}${symbol}${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      'Matched': 'bg-green-500/20 text-green-400 border-green-500/30',
      'Pending': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      'Unmatched': 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    return <Badge className={`${styles[status]} border`}>{status}</Badge>;
  };

  const getTypeBadge = (type) => {
    const styles = {
      'Invoice': 'bg-blue-500/20 text-blue-400',
      'Bill': 'bg-purple-500/20 text-purple-400',
      'Bank Transaction': 'bg-emerald-500/20 text-emerald-400',
      'Journal Entry': 'bg-orange-500/20 text-orange-400'
    };
    return <Badge className={styles[type]}>{type}</Badge>;
  };

  if (!selectedCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Receipt className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">No Entity Selected</h2>
        <p className="text-gray-400">Please select an entity to view transactions</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Transactions</h1>
          <p className="text-gray-400 mt-1">{selectedCompany.name}</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" className="border-navy-600 text-white" onClick={generateDemoData}>
            <Plus className="w-4 h-4 mr-2" /> Generate Demo Data
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                <Trash2 className="w-4 h-4 mr-2" /> Clear All
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-navy-800 border-navy-700">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-white">Delete All Transactions?</AlertDialogTitle>
                <AlertDialogDescription className="text-gray-400">
                  This will permanently delete all transactions for {selectedCompany.name}. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="bg-navy-700 text-white border-navy-600">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={clearAllData} className="bg-red-500 text-white">Delete All</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="pl-10 bg-navy-900 border-navy-600 text-white"
                />
              </div>
            </div>
            <Select value={filters.type} onValueChange={(v) => setFilters({ ...filters, type: v })}>
              <SelectTrigger className="w-[150px] bg-navy-900 border-navy-600 text-white">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-navy-800 border-navy-600">
                <SelectItem value="all" className="text-white">All Types</SelectItem>
                <SelectItem value="Invoice" className="text-white">Invoice</SelectItem>
                <SelectItem value="Bill" className="text-white">Bill</SelectItem>
                <SelectItem value="Bank Transaction" className="text-white">Bank Transaction</SelectItem>
                <SelectItem value="Journal Entry" className="text-white">Journal Entry</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger className="w-[150px] bg-navy-900 border-navy-600 text-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-navy-800 border-navy-600">
                <SelectItem value="all" className="text-white">All Categories</SelectItem>
                <SelectItem value="Sales" className="text-white">Sales</SelectItem>
                <SelectItem value="Marketing" className="text-white">Marketing</SelectItem>
                <SelectItem value="Operations" className="text-white">Operations</SelectItem>
                <SelectItem value="Technology" className="text-white">Technology</SelectItem>
                <SelectItem value="Administration" className="text-white">Administration</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
              <SelectTrigger className="w-[150px] bg-navy-900 border-navy-600 text-white">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-navy-800 border-navy-600">
                <SelectItem value="all" className="text-white">All Status</SelectItem>
                <SelectItem value="Matched" className="text-white">Matched</SelectItem>
                <SelectItem value="Pending" className="text-white">Pending</SelectItem>
                <SelectItem value="Unmatched" className="text-white">Unmatched</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="border-navy-600 text-gray-400" onClick={clearFilters}>
              <X className="w-4 h-4 mr-2" /> Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
            </div>
          ) : displayTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Receipt className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Transactions</h3>
              <p className="text-gray-400 mb-4">Get started by generating demo data</p>
              <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900" onClick={generateDemoData}>
                Generate Demo Data
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-navy-700 hover:bg-navy-700/50">
                  <TableHead className="text-gray-400 cursor-pointer" onClick={() => handleSort('date')}>
                    Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-gray-400">Description</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Category</TableHead>
                  <TableHead className="text-gray-400">Source</TableHead>
                  <TableHead className="text-gray-400 cursor-pointer text-right" onClick={() => handleSort('amount')}>
                    Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayTransactions.slice(0, 100).map((tx) => (
                  <TableRow key={tx.id} className="border-navy-700 hover:bg-navy-700/50">
                    <TableCell className="text-gray-300">{formatDate(tx.date)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="text-white">{tx.description}</div>
                        {tx.counterparty && <div className="text-sm text-gray-500">{tx.counterparty}</div>}
                      </div>
                    </TableCell>
                    <TableCell>{getTypeBadge(tx.type)}</TableCell>
                    <TableCell className="text-gray-300">{tx.category}</TableCell>
                    <TableCell className="text-gray-400">{tx.source}</TableCell>
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

const getMockTransactions = () => {
  const types = ['Invoice', 'Bill', 'Bank Transaction', 'Journal Entry'];
  const categories = ['Sales', 'Marketing', 'Operations', 'Technology', 'Administration'];
  const sources = ['Email', 'Xero', 'TrueLayer', 'Manual'];
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
    source: sources[Math.floor(Math.random() * sources.length)],
    status: statuses[Math.floor(Math.random() * statuses.length)],
    counterparty: counterparties[Math.floor(Math.random() * counterparties.length)],
    reference: `REF-${Math.random().toString(36).substr(2, 8).toUpperCase()}`
  }));
};

export default TransactionsPage;
