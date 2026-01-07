import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, AlertTriangle, DollarSign, TrendingDown, 
  X, Search, ExternalLink, Clock, CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import { API } from '@/App';
import { toast } from 'sonner';
import { getCurrencySymbol } from '@/utils/currencyFormatter';

const GovernanceRiskCapitalQuadrant = ({ data, userId, currency = 'GBP' }) => {
  const [dismissingAnomaly, setDismissingAnomaly] = useState(null);
  const currencySymbol = getCurrencySymbol(currency);
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    covenants: true,
    anomalies: true,
    arExposure: true,
    capitalSourcing: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  if (!data) return null;

  const { 
    loan_covenants = [], 
    anomalies = [], 
    ar_exposure = {},
    cash_runway = {},
    capital_sourcing = {},
    health_score = {},
    summary_metrics = {}
  } = data;

  // Handle anomaly actions
  const handleDismissAnomaly = async (anomalyId) => {
    try {
      setDismissingAnomaly(anomalyId);
      await axios.post(`${API}/cfo/dashboard/anomalies/${anomalyId}/dismiss`, null, {
        params: { user_id: userId, reason: 'Reviewed and dismissed' }
      });
      toast.success('Anomaly dismissed successfully');
      // In real app, would refresh data
    } catch (error) {
      console.error('Error dismissing anomaly:', error);
      toast.error('Failed to dismiss anomaly');
    } finally {
      setDismissingAnomaly(null);
    }
  };

  const handleInvestigateAnomaly = async (anomalyId) => {
    try {
      const response = await axios.post(`${API}/cfo/dashboard/anomalies/${anomalyId}/investigate`, null, {
        params: { user_id: userId }
      });
      toast.success('Opening transaction details for investigation');
      // In real app, would navigate to transactions page with filter
      console.log('Investigation details:', response.data);
    } catch (error) {
      console.error('Error investigating anomaly:', error);
      toast.error('Failed to start investigation');
    }
  };

  // Prepare AR Aging data for chart
  const arChartData = [
    { name: 'Current', value: ar_exposure.current || 0, color: '#10b981' },
    { name: '30 Days', value: ar_exposure.days_30 || 0, color: '#3b82f6' },
    { name: '60 Days', value: ar_exposure.days_60 || 0, color: '#f59e0b' },
    { name: '90+ Days', value: ar_exposure.days_90_plus || 0, color: '#ef4444' }
  ];

  // Get covenant status color
  const getCovenantColor = (status) => {
    if (status === 'healthy') return 'text-green-600 bg-green-100 border-green-300';
    if (status === 'warning') return 'text-yellow-600 bg-yellow-100 border-yellow-300';
    return 'text-red-600 bg-red-100 border-red-300';
  };

  // Get anomaly severity color
  const getAnomalySeverityColor = (severity) => {
    if (severity === 'high') return 'text-red-600 bg-red-100 border-red-300';
    if (severity === 'medium') return 'text-yellow-600 bg-yellow-100 border-yellow-300';
    return 'text-blue-600 bg-blue-100 border-blue-300';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Governance, Risk, & Strategic Capital
          </CardTitle>
          
          {/* Health Score Badge */}
          <Badge 
            variant="outline" 
            className={`
              ${health_score.color === 'green' ? 'border-green-500 bg-green-50 text-green-700' : ''}
              ${health_score.color === 'yellow' ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : ''}
              ${health_score.color === 'red' ? 'border-red-500 bg-red-50 text-red-700' : ''}
              font-semibold
            `}
          >
            {health_score.status?.toUpperCase()} - {(health_score.overall_score * 100).toFixed(0)}%
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 overflow-auto pt-4 space-y-4">
        {/* Loan Covenant Monitor */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('covenants')}
            className="w-full p-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
          >
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Loan Covenant Status
              <Badge variant="outline" className="ml-2">
                {loan_covenants.length}
              </Badge>
            </h3>
            {expandedSections.covenants ? (
              <ChevronUp className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-600" />
            )}
          </button>
          
          {expandedSections.covenants && (
            <div className="p-3 space-y-2">
              {loan_covenants.map((covenant, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg border ${getCovenantColor(covenant.status)}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{covenant.lender}</div>
                      <div className="text-xs opacity-75">{covenant.covenant_type}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold">
                        {covenant.current_value.toFixed(2)}x
                      </div>
                      <div className="text-xs">
                        {covenant.threshold_type === 'max' ? '≤' : '≥'} {covenant.threshold}x
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="relative w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`absolute h-full transition-all ${
                        covenant.status === 'healthy' ? 'bg-green-500' :
                        covenant.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ 
                        width: covenant.threshold_type === 'max' 
                          ? `${(covenant.current_value / covenant.threshold) * 100}%`
                          : `${(covenant.current_value / (covenant.threshold * 1.5)) * 100}%`
                      }}
                    />
                  </div>
                  
                  <div className="text-xs mt-1 opacity-75">
                    {covenant.distance_to_breach > 0 
                      ? `${covenant.distance_to_breach.toFixed(1)}% buffer to breach`
                      : `${Math.abs(covenant.distance_to_breach).toFixed(1)}% over threshold`
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* AI Risk & Anomaly Feed */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('anomalies')}
            className="w-full p-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
          >
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              AI Risk & Anomaly Alerts
              <Badge variant="outline" className="ml-2">
                {anomalies.length}
              </Badge>
            </h3>
            {expandedSections.anomalies ? (
              <ChevronUp className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-600" />
            )}
          </button>
          
          {expandedSections.anomalies && (
            <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
            {anomalies.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
                No anomalies detected
              </div>
            ) : (
              anomalies.map((anomaly) => (
                <div 
                  key={anomaly.id}
                  className={`p-3 rounded-lg border ${getAnomalySeverityColor(anomaly.severity)}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {anomaly.severity.toUpperCase()}
                        </Badge>
                        <span className="text-xs text-slate-600">{anomaly.entity}</span>
                      </div>
                      <p className="text-sm font-medium">{anomaly.description}</p>
                      <div className="text-xs text-slate-600 mt-1">
                        Amount: {currencySymbol}{(anomaly.amount / 1000).toFixed(1)}K | 
                        Confidence: {(anomaly.confidence * 100).toFixed(0)}% |
                        <Clock className="inline h-3 w-3 ml-1" />
                        {new Date(anomaly.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7 flex-1"
                      onClick={() => handleInvestigateAnomaly(anomaly.id)}
                    >
                      <Search className="h-3 w-3 mr-1" />
                      Investigate
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7"
                      onClick={() => handleDismissAnomaly(anomaly.id)}
                      disabled={dismissingAnomaly === anomaly.id}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))
            )}
            </div>
          )}
        </div>

        {/* AR Exposure & Liquidity */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('arExposure')}
            className="w-full p-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
          >
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              AR Aging & Liquidity Risk
            </h3>
            {expandedSections.arExposure ? (
              <ChevronUp className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-600" />
            )}
          </button>
          
          {expandedSections.arExposure && (
            <div className="p-3">
              <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="p-2 bg-slate-50 rounded border border-slate-200">
              <p className="text-xs text-slate-600">Total AR</p>
              <p className="text-lg font-bold text-slate-900">
                {currencySymbol}{(ar_exposure.total_ar / 1000).toFixed(0)}K
              </p>
            </div>
            <div className="p-2 bg-red-50 rounded border border-red-200">
              <p className="text-xs text-red-600">At Risk (90+)</p>
              <p className="text-lg font-bold text-red-900">
                {currencySymbol}{(ar_exposure.at_risk_capital / 1000).toFixed(0)}K
              </p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={arChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => `${currencySymbol}${value / 1000}K`} />
              <Tooltip formatter={(value) => `${currencySymbol}${(value / 1000).toFixed(1)}K`} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {arChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-900">
              <AlertCircle className="inline h-3 w-3 mr-1" />
              At-risk AR represents {(ar_exposure.risk_ratio * 100).toFixed(0)}% of monthly burn rate
            </p>
          </div>
            </div>
          )}
        </div>
        
        {/* Strategic Capital Sourcing */}
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('capitalSourcing')}
            className="w-full p-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
          >
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Strategic Capital Opportunities
              <Badge variant="outline" className="ml-2">
                {capital_sourcing.recommendations?.length || 0}
              </Badge>
            </h3>
            {expandedSections.capitalSourcing ? (
              <ChevronUp className="h-4 w-4 text-slate-600" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-600" />
            )}
          </button>
          
          {expandedSections.capitalSourcing && (
            <div className="p-3">
              {/* Cash Runway Alert (if urgent) */}
              {cash_runway.runway_days < 90 && (
                <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-300 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="font-semibold text-sm text-yellow-900">
                      Cash Runway Alert: {cash_runway.runway_days.toFixed(0)} days remaining
                    </span>
                  </div>
                  <p className="text-xs text-yellow-800">
                    Your cash runway is below 90 days. Consider these growth funding options:
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                {capital_sourcing.recommendations?.slice(0, 3).map((option) => (
                  <div 
                    key={option.id}
                    className="p-3 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-slate-900">{option.provider}</div>
                        <div className="text-xs text-slate-600">{option.product_type}</div>
                      </div>
                      <Badge variant="outline" className="bg-white text-xs">
                        Match: {(option.match_score * 100).toFixed(0)}%
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-slate-600">Amount:</span>
                        <span className="font-semibold ml-1">
                          ${(option.amount_min / 1000).toFixed(0)}K - ${(option.amount_max / 1000).toFixed(0)}K
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Rate:</span>
                        <span className="font-semibold ml-1">
                          {option.interest_rate === 0 ? 'No Interest' : `${(option.interest_rate * 100).toFixed(1)}%`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Term:</span>
                        <span className="font-semibold ml-1">{option.term_months} months</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Approval:</span>
                        <span className="font-semibold ml-1">{option.approval_time}</span>
                      </div>
                    </div>
                    
                    <div className="text-xs text-slate-700 mb-2 p-2 bg-white rounded border border-slate-200">
                      ✓ {option.eligibility}
                    </div>
                    
                    <Button size="sm" className="w-full text-xs h-7" variant="outline">
                      <ExternalLink className="h-3 w-3 mr-1" />
                      View Details & Apply
                    </Button>
                  </div>
                ))}
              </div>
          
              {capital_sourcing.total_available && (
                <div className="mt-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded border border-purple-200">
                  <p className="text-xs text-center text-purple-900 font-medium">
                    💰 Total Available Capital: ${(capital_sourcing.total_available / 1_000_000).toFixed(1)}M across {capital_sourcing.recommendations?.length} options
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GovernanceRiskCapitalQuadrant;
