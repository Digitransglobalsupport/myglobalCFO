import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { API } from '@/App';
import { 
  TrendingUp, 
  Plus, 
  FileSpreadsheet, 
  Calculator, 
  GitBranch, 
  BarChart3, 
  Calendar
} from 'lucide-react';

const FPAOverviewPage = () => {
  const navigate = useNavigate();
  const [dimensionSummary, setDimensionSummary] = useState(null);
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [summaryRes, versionsRes] = await Promise.all([
        axios.get(`${API}/fpa/dimensions/summary`),
        axios.get(`${API}/fpa/planning/versions`)
      ]);
      
      setDimensionSummary(summaryRes.data);
      setVersions(versionsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading FP&A dashboard:', error);
      setLoading(false);
    }
  };

  const getVersionTypeBadge = (type) => {
    const badges = {
      'budget': <Badge className="bg-blue-500">Budget</Badge>,
      'forecast': <Badge className="bg-green-500">Forecast</Badge>,
      'actuals': <Badge className="bg-purple-500">Actuals</Badge>,
      'scenario': <Badge className="bg-orange-500">Scenario</Badge>
    };
    return badges[type] || <Badge>{type}</Badge>;
  };

  if (loading) {
    return <div className="text-lg text-slate-600">Loading FP&A Dashboard...</div>;
  }

  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate('/dashboard/fpa/dimensions')}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-blue-600" />
            </div>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Planning Dimensions</h3>
          <p className="text-3xl font-bold text-slate-900">
            {dimensionSummary ? 
              dimensionSummary.entities + 
              dimensionSummary.departments + 
              dimensionSummary.accounts +
              dimensionSummary.products +
              dimensionSummary.customer_segments +
              dimensionSummary.geographies : 0}
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {dimensionSummary?.entities || 0} entities, {dimensionSummary?.departments || 0} departments
          </p>
        </Card>

        <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate('/dashboard/fpa/planning')}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Planning Versions</h3>
          <p className="text-3xl font-bold text-slate-900">{versions.length}</p>
          <p className="text-xs text-slate-500 mt-2">
            Budgets, forecasts & scenarios
          </p>
        </Card>

        <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate('/dashboard/fpa/drivers')}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Calculator className="h-6 w-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Drivers & Formulas</h3>
          <p className="text-3xl font-bold text-slate-900">-</p>
          <p className="text-xs text-slate-500 mt-2">
            Driver-based modeling
          </p>
        </Card>

        <Card className="p-6 bg-white hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => navigate('/dashboard/fpa/setup-integrations')}>
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <GitBranch className="h-6 w-6 text-orange-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-slate-600 mb-1">Integrations</h3>
          <p className="text-3xl font-bold text-slate-900">0</p>
          <p className="text-xs text-slate-500 mt-2">
            Connected platforms
          </p>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Planning Versions */}
        <Card className="lg:col-span-2 p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-slate-900">Planning Versions</h2>
            <Button 
              size="sm"
              onClick={() => navigate('/dashboard/fpa/planning')}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Version
            </Button>
          </div>

          {versions.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Planning Versions</h3>
              <p className="text-sm text-slate-600 mb-6">
                Create your first budget or forecast to get started
              </p>
              <Button 
                onClick={() => navigate('/dashboard/fpa/planning')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Version
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {versions.slice(0, 5).map((version) => (
                <div 
                  key={version.id}
                  className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-slate-50 transition-all cursor-pointer"
                  onClick={() => navigate(`/dashboard/fpa/planning?version=${version.id}`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-slate-900">{version.name}</h3>
                      <p className="text-sm text-slate-600">
                        {version.start_period} to {version.end_period}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getVersionTypeBadge(version.version_type)}
                    {version.is_rolling && (
                      <Badge variant="outline" className="border-purple-300 text-purple-700">
                        Rolling
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              
              {versions.length > 5 && (
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => navigate('/dashboard/fpa/planning')}
                >
                  View All {versions.length} Versions
                </Button>
              )}
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-6 bg-white">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/dashboard/fpa/planning')}
            >
              <FileSpreadsheet className="h-4 w-4 mr-3" />
              Budget & Forecast
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/dashboard/fpa/drivers')}
            >
              <Calculator className="h-4 w-4 mr-3" />
              Manage Drivers
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/dashboard/fpa/setup-integrations')}
            >
              <GitBranch className="h-4 w-4 mr-3" />
              Setup Integrations
            </Button>

            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => navigate('/dashboard/fpa/user-permissions')}
            >
              <span className="h-4 w-4 mr-3">🛡️</span>
              User Permissions
            </Button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 Getting Started</h3>
            <p className="text-xs text-blue-700 mb-3">
              Set up your planning dimensions first, then create your first budget or forecast version.
            </p>
            <Button 
              size="sm" 
              variant="outline"
              className="w-full border-blue-300 text-blue-700 hover:bg-blue-100"
              onClick={() => navigate('/dashboard/fpa/dimensions')}
            >
              Setup Dimensions
            </Button>
          </div>
        </Card>
      </div>

      {/* Feature Overview */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center mb-4">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Multi-Dimensional Planning</h3>
          <p className="text-sm text-slate-700">
            Plan across 7 dimensions: Entity, Department, Time, Account, Product, Customer Segment, and Geography
          </p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center mb-4">
            <Calculator className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Driver-Based Modeling</h3>
          <p className="text-sm text-slate-700">
            Create operational drivers and formulas with real-time recalculation for accurate forecasting
          </p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Rolling Forecasts</h3>
          <p className="text-sm text-slate-700">
            Automated 12-18 month rolling forecasts that update continuously with actual data
          </p>
        </Card>
      </div>
    </>
  );
};

export default FPAOverviewPage;
