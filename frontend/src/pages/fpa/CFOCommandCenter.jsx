import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import axios from 'axios';
import { API } from '@/App';
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import GlobalLiquidityStrip from './dashboard/GlobalLiquidityStrip';
import ProfitabilityQuadrant from './dashboard/ProfitabilityQuadrant';
import OperationalEfficiencyQuadrant from './dashboard/OperationalEfficiencyQuadrant';
import StrategicWhatIfQuadrant from './dashboard/StrategicWhatIfQuadrant';
import GovernanceRiskCapitalQuadrant from './dashboard/GovernanceRiskCapitalQuadrant';

const CFOCommandCenter = () => {
  const { user } = useOutletContext();
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [useMockedData] = useState(true); // Default to mocked data for now

  // Fetch companies on mount
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const response = await axios.get(`${API}/companies`, {
          params: { user_id: user.id }
        });
        setCompanies(response.data || []);
      } catch (error) {
        console.error('Error fetching companies:', error);
      }
    };
    
    if (user?.id) {
      fetchCompanies();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      setRefreshing(true);
      const response = await axios.get(`${API}/cfo/dashboard/overview`, {
        params: { 
          user_id: user.id,
          company_id: selectedCompany === 'all' ? null : selectedCompany,
          use_mocked_data: useMockedData 
        }
      });
      setDashboardData(response.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchDashboardData();
    }
  }, [user, useMockedData, selectedCompany]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">No dashboard data available</p>
      </div>
    );
  }

  const { liquidity_strip, profitability, efficiency, strategic, governance_risk_capital, anomalies, ai_narrative } = dashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Command Centre</h1>
          <p className="text-slate-600 mt-1">Strategic Analytics & Sync Layer</p>
        </div>
        <Button
          onClick={fetchDashboardData}
          disabled={refreshing}
          variant="outline"
          size="sm"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      {/* AI Narrative */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-blue-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            AI Executive Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 leading-relaxed">{ai_narrative}</p>
        </CardContent>
      </Card>

      {/* Anomaly Alerts */}
      {anomalies && anomalies.length > 0 && (
        <Card className="bg-purple-50 border-purple-300">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-purple-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Anomalies Detected ({anomalies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {anomalies.map((anomaly, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-200">
                  <div>
                    <span className="font-medium text-slate-900">{anomaly.metric}</span>
                    <p className="text-sm text-slate-600">
                      Current: {anomaly.current_value.toFixed(2)} | Expected: {anomaly.expected_range[0].toFixed(2)} - {anomaly.expected_range[1].toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`font-semibold ${anomaly.deviation_percent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {anomaly.deviation_percent > 0 ? '+' : ''}{anomaly.deviation_percent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Global Liquidity Strip */}
      <GlobalLiquidityStrip data={liquidity_strip} />

      {/* Four Quadrants Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quadrant 1: Profitability */}
        <ProfitabilityQuadrant data={profitability} userId={user.id} />

        {/* Quadrant 2: Operational Efficiency */}
        <OperationalEfficiencyQuadrant data={efficiency} userId={user.id} />

        {/* Quadrant 3: Strategic What-If */}
        <StrategicWhatIfQuadrant data={strategic} userId={user.id} />

        {/* Quadrant 4: Governance, Risk, & Strategic Capital */}
        <GovernanceRiskCapitalQuadrant data={governance_risk_capital} userId={user.id} />
      </div>
    </div>
  );
};

export default CFOCommandCenter;