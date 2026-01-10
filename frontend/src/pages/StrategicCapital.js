import React, { useState, useEffect } from 'react';
import { useAuth, useApp } from '../App';
import { useCurrency } from '../context/CurrencyContext';
import { toast } from 'sonner';
import {
  Wallet, TrendingUp, ExternalLink, Search, DollarSign, Percent, Target,
  Building, FileText, AlertTriangle, CheckCircle, Clock, Shield, BarChart3,
  Plus, Trash2, Edit2, RefreshCcw, ChevronDown, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

const StrategicCapital = () => {
  return (
    <div className="space-y-6" data-testid="strategic-capital">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Strategic Capital</h1>
        <p className="text-gray-400 mt-1">AI-Powered Funding Recommendations & Loan Covenant Monitoring</p>
      </div>

      <Tabs defaultValue="funding" className="space-y-6">
        <TabsList className="bg-navy-800 border-navy-700">
          <TabsTrigger value="funding" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Wallet className="w-4 h-4 mr-2" /> AI Funding Recommendations
          </TabsTrigger>
          <TabsTrigger value="loans" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Building className="w-4 h-4 mr-2" /> Loans
          </TabsTrigger>
          <TabsTrigger value="covenants" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Shield className="w-4 h-4 mr-2" /> Covenant Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funding">
          <FundingRecommendations />
        </TabsContent>

        <TabsContent value="loans">
          <LoansManagement />
        </TabsContent>

        <TabsContent value="covenants">
          <CovenantMonitoring />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// AI Funding Recommendations
const FundingRecommendations = () => {
  const { authAxios } = useAuth();
  const { selectedCompany } = useApp();
  const { formatCurrency } = useCurrency();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const currency = selectedCompany?.currency || 'GBP';

  useEffect(() => {
    fetchOptions();
  }, []);

  const fetchOptions = async () => {
    try {
      setLoading(true);
      const res = await authAxios.get('/finance-sourcing');
      setOptions(res.data);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredOptions = options.filter(opt =>
    opt.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeBadge = (type) => {
    const colors = {
      'Term Loan': 'bg-blue-500/20 text-blue-400',
      'Credit Line': 'bg-purple-500/20 text-purple-400',
      'Invoice Finance': 'bg-emerald-500/20 text-emerald-400',
      'Growth Grant': 'bg-green-500/20 text-green-400',
      'Asset Finance': 'bg-orange-500/20 text-orange-400',
      'Revenue Based': 'bg-pink-500/20 text-pink-400'
    };
    return <Badge className={colors[type] || 'bg-gray-500/20 text-gray-400'}>{type}</Badge>;
  };

  return (
    <div className="space-y-6" data-testid="funding-recommendations">
      <Card className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500/30">
        <CardContent className="py-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">AI Funding Analysis</h3>
              <p className="text-gray-300 mb-4">
                Based on your company profile (25% EBITDA margin, {formatCurrency(485000, currency)} cash, 145-day runway), 
                our AI recommends <span className="text-gold-400 font-medium">Invoice Finance</span> and 
                <span className="text-gold-400 font-medium"> Revenue-Based Financing</span> as optimal funding options.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-green-500/20 text-green-400">Low Risk Profile</Badge>
                <Badge className="bg-blue-500/20 text-blue-400">Strong Cash Flow</Badge>
                <Badge className="bg-purple-500/20 text-purple-400">Growth Ready</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search funding options..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-navy-800 border-navy-600 text-white"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOptions.map((option) => (
            <Card key={option.id} className="bg-navy-800 border-navy-700 hover:border-gold-500/30 transition-all">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  {getTypeBadge(option.type)}
                  {option.interest_rate === 0 && <Badge className="bg-green-500/20 text-green-400">0% Interest</Badge>}
                </div>
                <CardTitle className="text-white text-xl mt-2">{option.provider}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center text-gray-500 text-sm mb-1">
                      <Percent className="w-4 h-4 mr-1" /> Rate
                    </div>
                    <p className="text-white font-semibold text-lg">
                      {option.interest_rate === 0 ? 'N/A' : `${option.interest_rate}%`}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center text-gray-500 text-sm mb-1">
                      <DollarSign className="w-4 h-4 mr-1" /> Amount
                    </div>
                    <p className="text-white font-semibold text-sm">
                      {formatCurrency(option.amount_min, currency)} - {formatCurrency(option.amount_max, currency)}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">{option.eligibility}</p>
                  <Button 
                    variant="outline" 
                    className="w-full border-navy-600 text-white hover:bg-navy-700"
                    onClick={() => window.open(option.source_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4 mr-2" /> Learn More
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

// Loans Management - Connected to Backend
const LoansManagement = () => {
  const { authAxios } = useAuth();
  const { selectedCompany, companies } = useApp();
  const { formatCurrency, currencies, searchCurrencies } = useCurrency();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newLoan, setNewLoan] = useState({
    company_id: '',
    lender_name: '',
    loan_type: 'Term Loan',
    principal_amount: '',
    currency: 'GBP',
    interest_rate: '',
    start_date: new Date().toISOString().split('T')[0],
    maturity_date: '',
    payment_frequency: 'Monthly',
    notes: ''
  });

  useEffect(() => {
    fetchLoans();
  }, [selectedCompany]);

  useEffect(() => {
    if (selectedCompany) {
      setNewLoan(prev => ({ ...prev, company_id: selectedCompany.id, currency: selectedCompany.currency || 'GBP' }));
    }
  }, [selectedCompany]);

  const fetchLoans = async () => {
    try {
      setLoading(true);
      const params = selectedCompany ? { company_id: selectedCompany.id } : {};
      const res = await authAxios.get('/loans', { params });
      setLoans(res.data);
    } catch (e) {
      console.error('Error fetching loans:', e);
    } finally {
      setLoading(false);
    }
  };

  const createLoan = async () => {
    if (!newLoan.company_id || !newLoan.lender_name || !newLoan.principal_amount) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const payload = {
        ...newLoan,
        principal_amount: parseFloat(newLoan.principal_amount),
        interest_rate: parseFloat(newLoan.interest_rate),
        start_date: new Date(newLoan.start_date).toISOString(),
        maturity_date: new Date(newLoan.maturity_date).toISOString()
      };
      await authAxios.post('/loans', payload);
      toast.success('Loan created successfully!');
      setShowCreate(false);
      fetchLoans();
      setNewLoan({
        company_id: selectedCompany?.id || '',
        lender_name: '',
        loan_type: 'Term Loan',
        principal_amount: '',
        currency: selectedCompany?.currency || 'GBP',
        interest_rate: '',
        start_date: new Date().toISOString().split('T')[0],
        maturity_date: '',
        payment_frequency: 'Monthly',
        notes: ''
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create loan');
    }
  };

  const deleteLoan = async (loanId) => {
    if (!window.confirm('Delete this loan and all associated covenants?')) return;
    try {
      await authAxios.delete(`/loans/${loanId}`);
      toast.success('Loan deleted');
      fetchLoans();
    } catch (e) {
      toast.error('Failed to delete loan');
    }
  };

  return (
    <div className="space-y-6" data-testid="loans-management">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Loans</h2>
          <p className="text-gray-400">Manage your loan facilities</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900" data-testid="create-loan-btn">
              <Plus className="w-4 h-4 mr-2" /> Add Loan
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-navy-800 border-navy-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Loan</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              <div>
                <Label className="text-gray-300">Company</Label>
                <Select
                  value={newLoan.company_id}
                  onValueChange={(v) => {
                    const comp = companies.find(c => c.id === v);
                    setNewLoan({ ...newLoan, company_id: v, currency: comp?.currency || 'GBP' });
                  }}
                >
                  <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                    <SelectValue placeholder="Select company" />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-600">
                    {companies.map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Lender Name</Label>
                <Input
                  value={newLoan.lender_name}
                  onChange={(e) => setNewLoan({ ...newLoan, lender_name: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white"
                  placeholder="e.g., Barclays Business"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Loan Type</Label>
                  <Select
                    value={newLoan.loan_type}
                    onValueChange={(v) => setNewLoan({ ...newLoan, loan_type: v })}
                  >
                    <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-navy-800 border-navy-600">
                      <SelectItem value="Term Loan" className="text-white">Term Loan</SelectItem>
                      <SelectItem value="Revolving Credit" className="text-white">Revolving Credit</SelectItem>
                      <SelectItem value="Line of Credit" className="text-white">Line of Credit</SelectItem>
                      <SelectItem value="Bridge Loan" className="text-white">Bridge Loan</SelectItem>
                      <SelectItem value="Asset Finance" className="text-white">Asset Finance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Currency</Label>
                  <Select
                    value={newLoan.currency}
                    onValueChange={(v) => setNewLoan({ ...newLoan, currency: v })}
                  >
                    <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-navy-800 border-navy-600">
                      {['GBP', 'USD', 'EUR', 'JPY', 'CHF'].map(c => (
                        <SelectItem key={c} value={c} className="text-white">{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Principal Amount</Label>
                  <Input
                    type="number"
                    value={newLoan.principal_amount}
                    onChange={(e) => setNewLoan({ ...newLoan, principal_amount: e.target.value })}
                    className="bg-navy-900 border-navy-600 text-white"
                    placeholder="500000"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Interest Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newLoan.interest_rate}
                    onChange={(e) => setNewLoan({ ...newLoan, interest_rate: e.target.value })}
                    className="bg-navy-900 border-navy-600 text-white"
                    placeholder="6.5"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Start Date</Label>
                  <Input
                    type="date"
                    value={newLoan.start_date}
                    onChange={(e) => setNewLoan({ ...newLoan, start_date: e.target.value })}
                    className="bg-navy-900 border-navy-600 text-white"
                  />
                </div>
                <div>
                  <Label className="text-gray-300">Maturity Date</Label>
                  <Input
                    type="date"
                    value={newLoan.maturity_date}
                    onChange={(e) => setNewLoan({ ...newLoan, maturity_date: e.target.value })}
                    className="bg-navy-900 border-navy-600 text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-gray-300">Payment Frequency</Label>
                <Select
                  value={newLoan.payment_frequency}
                  onValueChange={(v) => setNewLoan({ ...newLoan, payment_frequency: v })}
                >
                  <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-600">
                    <SelectItem value="Monthly" className="text-white">Monthly</SelectItem>
                    <SelectItem value="Quarterly" className="text-white">Quarterly</SelectItem>
                    <SelectItem value="Semi-Annual" className="text-white">Semi-Annual</SelectItem>
                    <SelectItem value="Annual" className="text-white">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Notes</Label>
                <Textarea
                  value={newLoan.notes}
                  onChange={(e) => setNewLoan({ ...newLoan, notes: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white"
                  placeholder="Additional notes..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-navy-600 text-white">
                Cancel
              </Button>
              <Button onClick={createLoan} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      ) : loans.length === 0 ? (
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="py-16 text-center">
            <Building className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Loans Yet</h3>
            <p className="text-gray-400 mb-4">Add your first loan facility to start tracking covenants</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {loans.map((loan) => (
            <Card key={loan.id} className="bg-navy-800 border-navy-700">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-white">{loan.lender_name}</CardTitle>
                    <CardDescription className="text-gray-400">{loan.loan_type}</CardDescription>
                  </div>
                  <Badge className="bg-blue-500/20 text-blue-400">{loan.currency}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Principal</p>
                    <p className="text-white font-semibold">{formatCurrency(loan.principal_amount, loan.currency)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Outstanding</p>
                    <p className="text-white font-semibold">{formatCurrency(loan.outstanding_balance, loan.currency)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Interest Rate</p>
                    <p className="text-white font-semibold">{loan.interest_rate}%</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Maturity</p>
                    <p className="text-white font-semibold">{new Date(loan.maturity_date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => deleteLoan(loan.id)}
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

// Covenant Monitoring - Connected to Backend
const CovenantMonitoring = () => {
  const { authAxios } = useAuth();
  const { selectedCompany, companies } = useApp();
  const { formatCurrency } = useCurrency();
  const [covenants, setCovenants] = useState([]);
  const [summary, setSummary] = useState({ total: 0, compliant: 0, warning: 0, breach: 0, not_measured: 0 });
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showMeasure, setShowMeasure] = useState(false);
  const [selectedCovenant, setSelectedCovenant] = useState(null);
  const [measureValue, setMeasureValue] = useState('');

  const [newCovenant, setNewCovenant] = useState({
    loan_id: '',
    company_id: '',
    covenant_type: 'DSCR',
    name: '',
    requirement_operator: '>=',
    threshold_value: '',
    measurement_frequency: 'Quarterly',
    warning_threshold_pct: 10
  });

  const covenantTypes = [
    { value: 'DSCR', label: 'Debt Service Coverage Ratio' },
    { value: 'ICR', label: 'Interest Coverage Ratio' },
    { value: 'Leverage', label: 'Leverage Ratio (Debt/EBITDA)' },
    { value: 'Current Ratio', label: 'Current Ratio' },
    { value: 'Quick Ratio', label: 'Quick Ratio' },
    { value: 'Minimum Cash', label: 'Minimum Cash Balance' },
    { value: 'Maximum CapEx', label: 'Maximum CapEx' },
    { value: 'Net Worth', label: 'Net Worth' },
    { value: 'Custom', label: 'Custom' }
  ];

  useEffect(() => {
    fetchData();
  }, [selectedCompany]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = selectedCompany ? { company_id: selectedCompany.id } : {};
      
      const [covenantsRes, summaryRes, loansRes] = await Promise.all([
        authAxios.get('/covenants', { params }),
        authAxios.get('/covenants/summary/status', { params }),
        authAxios.get('/loans', { params })
      ]);
      
      setCovenants(covenantsRes.data);
      setSummary(summaryRes.data);
      setLoans(loansRes.data);
    } catch (e) {
      console.error('Error fetching covenant data:', e);
    } finally {
      setLoading(false);
    }
  };

  const createCovenant = async () => {
    if (!newCovenant.loan_id || !newCovenant.name || !newCovenant.threshold_value) {
      toast.error('Please fill in all required fields');
      return;
    }
    try {
      const selectedLoan = loans.find(l => l.id === newCovenant.loan_id);
      const payload = {
        ...newCovenant,
        company_id: selectedLoan?.company_id || selectedCompany?.id,
        threshold_value: parseFloat(newCovenant.threshold_value),
        warning_threshold_pct: parseFloat(newCovenant.warning_threshold_pct)
      };
      await authAxios.post('/covenants', payload);
      toast.success('Covenant created successfully!');
      setShowCreate(false);
      fetchData();
      setNewCovenant({
        loan_id: '',
        company_id: '',
        covenant_type: 'DSCR',
        name: '',
        requirement_operator: '>=',
        threshold_value: '',
        measurement_frequency: 'Quarterly',
        warning_threshold_pct: 10
      });
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create covenant');
    }
  };

  const recordMeasurement = async () => {
    if (!selectedCovenant || !measureValue) {
      toast.error('Please enter a measurement value');
      return;
    }
    try {
      const res = await authAxios.post(
        `/covenants/${selectedCovenant.id}/measure?measured_value=${measureValue}`
      );
      toast.success(`Measurement recorded: ${res.data.status}`);
      setShowMeasure(false);
      setSelectedCovenant(null);
      setMeasureValue('');
      fetchData();
    } catch (e) {
      toast.error('Failed to record measurement');
    }
  };

  const deleteCovenant = async (covenantId) => {
    if (!window.confirm('Delete this covenant?')) return;
    try {
      await authAxios.delete(`/covenants/${covenantId}`);
      toast.success('Covenant deleted');
      fetchData();
    } catch (e) {
      toast.error('Failed to delete covenant');
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      compliant: 'bg-green-500/20 text-green-400 border-green-500/30',
      warning: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      breach: 'bg-red-500/20 text-red-400 border-red-500/30'
    };
    const icons = {
      compliant: <CheckCircle className="w-3 h-3 mr-1" />,
      warning: <AlertTriangle className="w-3 h-3 mr-1" />,
      breach: <AlertTriangle className="w-3 h-3 mr-1" />
    };
    return (
      <Badge className={`${styles[status] || 'bg-gray-500/20 text-gray-400'} border flex items-center`}>
        {icons[status] || <Clock className="w-3 h-3 mr-1" />}
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Not Measured'}
      </Badge>
    );
  };

  return (
    <div className="space-y-6" data-testid="covenant-monitoring">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Covenants</p>
                <p className="text-3xl font-bold text-white">{summary.total}</p>
              </div>
              <Shield className="w-8 h-8 text-gold-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-navy-800 border-green-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Compliant</p>
                <p className="text-3xl font-bold text-green-400">{summary.compliant}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-navy-800 border-yellow-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Warning</p>
                <p className="text-3xl font-bold text-yellow-400">{summary.warning}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-navy-800 border-red-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Breach</p>
                <p className="text-3xl font-bold text-red-400">{summary.breach}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-navy-800 border-gray-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Not Measured</p>
                <p className="text-3xl font-bold text-gray-400">{summary.not_measured}</p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end">
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900" disabled={loans.length === 0} data-testid="create-covenant-btn">
              <Plus className="w-4 h-4 mr-2" /> Add Covenant
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-navy-800 border-navy-700">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Covenant</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Loan</Label>
                <Select
                  value={newCovenant.loan_id}
                  onValueChange={(v) => setNewCovenant({ ...newCovenant, loan_id: v })}
                >
                  <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                    <SelectValue placeholder="Select loan" />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-600">
                    {loans.map(l => (
                      <SelectItem key={l.id} value={l.id} className="text-white">{l.lender_name} - {l.loan_type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Covenant Type</Label>
                <Select
                  value={newCovenant.covenant_type}
                  onValueChange={(v) => {
                    const type = covenantTypes.find(t => t.value === v);
                    setNewCovenant({ 
                      ...newCovenant, 
                      covenant_type: v,
                      name: type?.label || v
                    });
                  }}
                >
                  <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-600">
                    {covenantTypes.map(t => (
                      <SelectItem key={t.value} value={t.value} className="text-white">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">Covenant Name</Label>
                <Input
                  value={newCovenant.name}
                  onChange={(e) => setNewCovenant({ ...newCovenant, name: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white"
                  placeholder="e.g., Minimum DSCR"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Operator</Label>
                  <Select
                    value={newCovenant.requirement_operator}
                    onValueChange={(v) => setNewCovenant({ ...newCovenant, requirement_operator: v })}
                  >
                    <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-navy-800 border-navy-600">
                      <SelectItem value=">=" className="text-white">≥ (Greater or Equal)</SelectItem>
                      <SelectItem value="<=" className="text-white">≤ (Less or Equal)</SelectItem>
                      <SelectItem value="=" className="text-white">= (Equal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Threshold Value</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newCovenant.threshold_value}
                    onChange={(e) => setNewCovenant({ ...newCovenant, threshold_value: e.target.value })}
                    className="bg-navy-900 border-navy-600 text-white"
                    placeholder="1.25"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-300">Measurement Frequency</Label>
                  <Select
                    value={newCovenant.measurement_frequency}
                    onValueChange={(v) => setNewCovenant({ ...newCovenant, measurement_frequency: v })}
                  >
                    <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-navy-800 border-navy-600">
                      <SelectItem value="Monthly" className="text-white">Monthly</SelectItem>
                      <SelectItem value="Quarterly" className="text-white">Quarterly</SelectItem>
                      <SelectItem value="Annual" className="text-white">Annual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-gray-300">Warning Threshold (%)</Label>
                  <Input
                    type="number"
                    value={newCovenant.warning_threshold_pct}
                    onChange={(e) => setNewCovenant({ ...newCovenant, warning_threshold_pct: e.target.value })}
                    className="bg-navy-900 border-navy-600 text-white"
                    placeholder="10"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-navy-600 text-white">
                Cancel
              </Button>
              <Button onClick={createCovenant} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Measure Dialog */}
      <Dialog open={showMeasure} onOpenChange={setShowMeasure}>
        <DialogContent className="bg-navy-800 border-navy-700">
          <DialogHeader>
            <DialogTitle className="text-white">Record Measurement</DialogTitle>
          </DialogHeader>
          {selectedCovenant && (
            <div className="space-y-4">
              <p className="text-gray-300">
                Recording measurement for: <span className="text-white font-medium">{selectedCovenant.name}</span>
              </p>
              <p className="text-sm text-gray-400">
                Requirement: {selectedCovenant.requirement_operator} {selectedCovenant.threshold_value}
              </p>
              <div>
                <Label className="text-gray-300">Current Value</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={measureValue}
                  onChange={(e) => setMeasureValue(e.target.value)}
                  className="bg-navy-900 border-navy-600 text-white"
                  placeholder="Enter current value"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowMeasure(false)} className="border-navy-600 text-white">
              Cancel
            </Button>
            <Button onClick={recordMeasurement} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Covenant Table */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white">Covenant Status</CardTitle>
          <CardDescription className="text-gray-400">Real-time monitoring of loan covenant compliance</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
            </div>
          ) : covenants.length === 0 ? (
            <div className="py-16 text-center">
              <Shield className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Covenants Yet</h3>
              <p className="text-gray-400">
                {loans.length === 0 ? 'Add a loan first, then create covenants' : 'Create your first covenant to start monitoring'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-navy-700">
                  <TableHead className="text-gray-400">Covenant</TableHead>
                  <TableHead className="text-gray-400">Lender</TableHead>
                  <TableHead className="text-gray-400">Requirement</TableHead>
                  <TableHead className="text-gray-400">Current</TableHead>
                  <TableHead className="text-gray-400">Headroom</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {covenants.map((covenant) => (
                  <TableRow key={covenant.id} className="border-navy-700 hover:bg-navy-700/50">
                    <TableCell>
                      <div>
                        <p className="text-white font-medium">{covenant.name}</p>
                        <p className="text-sm text-gray-500">{covenant.covenant_type}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-300">{covenant.lender_name || '-'}</TableCell>
                    <TableCell className="text-gray-300">
                      {covenant.requirement_operator} {covenant.threshold_value}
                    </TableCell>
                    <TableCell className="text-white font-semibold">
                      {covenant.current_value !== null ? covenant.current_value : '-'}
                    </TableCell>
                    <TableCell className={
                      covenant.headroom_pct === null ? 'text-gray-400' :
                      covenant.headroom_pct < 0 ? 'text-red-400' : 'text-green-400'
                    }>
                      {covenant.headroom_pct !== null ? `${covenant.headroom_pct}%` : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(covenant.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-blue-400 hover:text-blue-300"
                          onClick={() => {
                            setSelectedCovenant(covenant);
                            setShowMeasure(true);
                          }}
                          title="Record Measurement"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => deleteCovenant(covenant.id)}
                          title="Delete"
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

      {/* Warning Alert */}
      {summary.warning > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="py-4">
            <div className="flex items-center space-x-4">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              <div>
                <h4 className="text-yellow-400 font-semibold">Covenant Warning</h4>
                <p className="text-gray-300 text-sm">
                  {summary.warning} covenant(s) approaching breach threshold. Review and take action.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breach Alert */}
      {summary.breach > 0 && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-4">
            <div className="flex items-center space-x-4">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <div>
                <h4 className="text-red-400 font-semibold">Covenant Breach</h4>
                <p className="text-gray-300 text-sm">
                  {summary.breach} covenant(s) in breach. Immediate attention required.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StrategicCapital;
