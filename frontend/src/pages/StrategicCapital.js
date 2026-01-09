import React, { useState, useEffect } from 'react';
import { useAuth, useApp } from '../App';
import { toast } from 'sonner';
import {
  Wallet, TrendingUp, ExternalLink, Search, DollarSign, Percent, Target,
  Building, FileText, AlertTriangle, CheckCircle, Clock, Shield, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const StrategicCapital = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Strategic Capital</h1>
        <p className="text-gray-400 mt-1">AI-Powered Funding Recommendations & Loan Covenant Monitoring</p>
      </div>

      <Tabs defaultValue="funding" className="space-y-6">
        <TabsList className="bg-navy-800 border-navy-700">
          <TabsTrigger value="funding" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Wallet className="w-4 h-4 mr-2" /> AI Funding Recommendations
          </TabsTrigger>
          <TabsTrigger value="covenants" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Shield className="w-4 h-4 mr-2" /> Loan Covenant Monitoring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="funding">
          <FundingRecommendations />
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
  const { selectedCompany, mockDataEnabled } = useApp();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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

  const formatCurrency = (amount) => `£${amount.toLocaleString('en-GB')}`;

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
    <div className="space-y-6">
      {/* AI Recommendation Banner */}
      <Card className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border-blue-500/30">
        <CardContent className="py-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-blue-500/20 rounded-lg">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-white mb-2">AI Funding Analysis</h3>
              <p className="text-gray-300 mb-4">
                Based on your company profile (25% EBITDA margin, £485K cash, 145-day runway), 
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search funding options..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-navy-800 border-navy-600 text-white"
        />
      </div>

      {/* Funding Options Grid */}
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
                      {formatCurrency(option.amount_min)} - {formatCurrency(option.amount_max)}
                    </p>
                  </div>
                </div>
                <div>
                  <div className="flex items-center text-gray-500 text-sm mb-1">
                    <Building className="w-4 h-4 mr-1" /> Eligibility
                  </div>
                  <p className="text-gray-300 text-sm">{option.eligibility}</p>
                </div>
                <Button 
                  variant="outline" 
                  className="w-full border-gold-500/50 text-gold-400 hover:bg-gold-500/10"
                  onClick={() => window.open(option.source_url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" /> Learn More
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// Loan Covenant Monitoring
const CovenantMonitoring = () => {
  const { mockDataEnabled } = useApp();

  const covenants = [
    {
      id: 1,
      name: 'Debt Service Coverage Ratio',
      abbreviation: 'DSCR',
      requirement: '≥ 1.25x',
      current: 1.85,
      threshold: 1.25,
      status: 'compliant',
      headroom: '48%',
      lender: 'Barclays Business Loan'
    },
    {
      id: 2,
      name: 'Interest Coverage Ratio',
      abbreviation: 'ICR',
      requirement: '≥ 3.0x',
      current: 4.2,
      threshold: 3.0,
      status: 'compliant',
      headroom: '40%',
      lender: 'Barclays Business Loan'
    },
    {
      id: 3,
      name: 'Leverage Ratio',
      abbreviation: 'Debt/EBITDA',
      requirement: '≤ 3.5x',
      current: 2.8,
      threshold: 3.5,
      status: 'compliant',
      headroom: '20%',
      lender: 'HSBC Facility'
    },
    {
      id: 4,
      name: 'Current Ratio',
      abbreviation: 'CA/CL',
      requirement: '≥ 1.2x',
      current: 1.15,
      threshold: 1.2,
      status: 'warning',
      headroom: '-4%',
      lender: 'HSBC Facility'
    },
    {
      id: 5,
      name: 'Minimum Cash Balance',
      abbreviation: 'Cash',
      requirement: '≥ £250K',
      current: 485000,
      threshold: 250000,
      status: 'compliant',
      headroom: '94%',
      lender: 'All Facilities'
    }
  ];

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
      <Badge className={`${styles[status]} border flex items-center`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const compliantCount = covenants.filter(c => c.status === 'compliant').length;
  const warningCount = covenants.filter(c => c.status === 'warning').length;
  const breachCount = covenants.filter(c => c.status === 'breach').length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Covenants</p>
                <p className="text-3xl font-bold text-white">{covenants.length}</p>
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
                <p className="text-3xl font-bold text-green-400">{compliantCount}</p>
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
                <p className="text-3xl font-bold text-yellow-400">{warningCount}</p>
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
                <p className="text-3xl font-bold text-red-400">{breachCount}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Covenant Table */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white">Covenant Status</CardTitle>
          <CardDescription className="text-gray-400">Real-time monitoring of loan covenant compliance</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-navy-700">
                <TableHead className="text-gray-400">Covenant</TableHead>
                <TableHead className="text-gray-400">Lender</TableHead>
                <TableHead className="text-gray-400">Requirement</TableHead>
                <TableHead className="text-gray-400">Current</TableHead>
                <TableHead className="text-gray-400">Headroom</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {covenants.map((covenant) => (
                <TableRow key={covenant.id} className="border-navy-700 hover:bg-navy-700/50">
                  <TableCell>
                    <div>
                      <p className="text-white font-medium">{covenant.name}</p>
                      <p className="text-sm text-gray-500">{covenant.abbreviation}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">{covenant.lender}</TableCell>
                  <TableCell className="text-gray-300">{covenant.requirement}</TableCell>
                  <TableCell className="text-white font-semibold">
                    {typeof covenant.current === 'number' && covenant.current > 1000 
                      ? `£${(covenant.current/1000).toFixed(0)}K` 
                      : `${covenant.current}x`}
                  </TableCell>
                  <TableCell className={covenant.headroom.startsWith('-') ? 'text-red-400' : 'text-green-400'}>
                    {covenant.headroom}
                  </TableCell>
                  <TableCell>{getStatusBadge(covenant.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Warning Alert */}
      {warningCount > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="py-4">
            <div className="flex items-center space-x-4">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              <div>
                <h4 className="text-yellow-400 font-semibold">Covenant Warning</h4>
                <p className="text-gray-300 text-sm">
                  Current Ratio is approaching breach threshold. Consider improving working capital position.
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
