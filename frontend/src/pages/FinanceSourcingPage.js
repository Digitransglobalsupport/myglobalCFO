import React, { useState, useEffect } from 'react';
import { useAuth, useApp } from '../App';
import { Wallet, TrendingUp, ExternalLink, Search, Filter, DollarSign, Percent, Target, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const FinanceSourcingPage = () => {
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
      console.error('Error fetching finance options:', e);
    } finally {
      setLoading(false);
    }
  };

  const filteredOptions = options.filter(opt =>
    opt.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    opt.eligibility.toLowerCase().includes(searchTerm.toLowerCase())
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

  const formatCurrency = (amount, currency = 'GBP') => {
    const symbol = { GBP: '£', USD: '$', EUR: '€' }[currency] || '£';
    return `${symbol}${amount.toLocaleString('en-GB')}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Finance Sourcing</h1>
          <p className="text-gray-400 mt-1">Discover optimal funding options for your business</p>
        </div>
        <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900">
          <Search className="w-4 h-4 mr-2" /> Search Options
        </Button>
      </div>

      {/* AI Recommendation Banner */}
      <Card className="bg-gradient-to-r from-gold-500/20 to-gold-600/10 border-gold-500/30">
        <CardContent className="py-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-gold-500/20 rounded-lg">
              <Target className="w-6 h-6 text-gold-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">AI Finance Recommendations</h3>
              <p className="text-gray-300">
                Based on your company profile, we recommend exploring Invoice Finance and Revenue Based 
                financing options. These align well with your current cash flow patterns and growth trajectory.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by provider, type, or eligibility..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-navy-800 border-navy-600 text-white"
        />
      </div>

      {/* Finance Options Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
        </div>
      ) : filteredOptions.length === 0 ? (
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="py-16 text-center">
            <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">No Finance Options Found</h3>
            <p className="text-gray-400">Try adjusting your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOptions.map((option) => (
            <FinanceOptionCard key={option.id} option={option} formatCurrency={formatCurrency} getTypeBadge={getTypeBadge} />
          ))}
        </div>
      )}
    </div>
  );
};

const FinanceOptionCard = ({ option, formatCurrency, getTypeBadge }) => (
  <Card className="bg-navy-800 border-navy-700 hover:border-gold-500/30 transition-all">
    <CardHeader className="pb-2">
      <div className="flex items-start justify-between">
        {getTypeBadge(option.type)}
        {option.interest_rate === 0 && (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">0% Interest</Badge>
        )}
      </div>
      <CardTitle className="text-white text-xl mt-2">{option.provider}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center text-gray-500 text-sm mb-1">
            <Percent className="w-4 h-4 mr-1" /> Interest Rate
          </div>
          <p className="text-white font-semibold text-lg">
            {option.interest_rate === 0 ? 'N/A' : `${option.interest_rate}%`}
          </p>
        </div>
        <div>
          <div className="flex items-center text-gray-500 text-sm mb-1">
            <DollarSign className="w-4 h-4 mr-1" /> Amount Range
          </div>
          <p className="text-white font-semibold">
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
);

export default FinanceSourcingPage;
