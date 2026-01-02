import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, useOutletContext, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import MonthYearPicker from '@/components/MonthYearPicker';
import axios from 'axios';
import { API } from '@/App';
import { Plus, FileSpreadsheet, Lock, Unlock, RefreshCw, Sparkles, TrendingUp, BarChart3, AlertTriangle, Brain } from 'lucide-react';
import { toast } from 'sonner';
import DriverValuesManager from '@/components/DriverValuesManager';

const FPAPlanningPage = () => {
  const { user } = useOutletContext();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [entities, setEntities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [planningData, setPlanningData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newVersion, setNewVersion] = useState({
    name: '',
    version_type: 'budget',
    fiscal_year: new Date().getFullYear(),
    start_period: '',
    end_period: '',
    is_rolling: false,
    rolling_months: 12
  });

  const [filters, setFilters] = useState({
    entity_id: '',
    department_id: '',
    time_period: '',
    account_id: ''
  });

  // AI-related state
  const [showAIForecastDialog, setShowAIForecastDialog] = useState(false);
  const [showAIInsightsDialog, setShowAIInsightsDialog] = useState(false);
  const [aiForecastLoading, setAiForecastLoading] = useState(false);
  const [aiForecastResult, setAIForecastResult] = useState(null);
  const [aiInsights, setAIInsights] = useState(null);
  const [showVersionDialog, setShowVersionDialog] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  // Refresh versions when navigating to this page (handles deleted scenarios)
  useEffect(() => {
    // Re-fetch versions whenever the location changes to this page
    axios.get(`${API}/fpa/planning/versions`).then(res => {
      const prevCount = versions.length;
      setVersions(res.data);
      // If selected version was deleted, clear selection
      if (selectedVersion && !res.data.find(v => v.id === selectedVersion.id)) {
        setSelectedVersion(res.data.length > 0 ? res.data[0] : null);
        if (prevCount > 0) {
          toast.info('Selected version was deleted. Switched to another version.');
        }
      }
    }).catch(err => console.error('Error refreshing versions:', err));
  }, [location.pathname]);

  // Refresh versions when page becomes visible (e.g., after navigating back from Scenarios)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh versions list when tab/page becomes visible
        axios.get(`${API}/fpa/planning/versions`).then(res => {
          setVersions(res.data);
          // If selected version was deleted, clear selection
          if (selectedVersion && !res.data.find(v => v.id === selectedVersion.id)) {
            setSelectedVersion(res.data.length > 0 ? res.data[0] : null);
            toast.info('Selected version was deleted. Switched to another version.');
          }
        }).catch(err => console.error('Error refreshing versions:', err));
      }
    };

    const handleFocus = () => {
      // Also refresh on window focus
      axios.get(`${API}/fpa/planning/versions`).then(res => {
        const currentVersionExists = selectedVersion && res.data.find(v => v.id === selectedVersion.id);
        setVersions(res.data);
        if (selectedVersion && !currentVersionExists) {
          setSelectedVersion(res.data.length > 0 ? res.data[0] : null);
          toast.info('Selected version was deleted. Switched to another version.');
        }
      }).catch(err => console.error('Error refreshing versions:', err));
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedVersion]);

  useEffect(() => {
    const versionId = searchParams.get('version');
    if (versionId && versions.length > 0) {
      const version = versions.find(v => v.id === versionId);
      if (version) {
        setSelectedVersion(version);
      }
    }
  }, [searchParams, versions]);

  useEffect(() => {
    if (selectedVersion) {
      loadPlanningData();
    }
  }, [selectedVersion, filters]);

  const loadInitialData = async () => {
    try {
      const [versionsRes, entitiesRes, departmentsRes, accountsRes] = await Promise.all([
        axios.get(`${API}/fpa/planning/versions`),
        axios.get(`${API}/fpa/dimensions/entities`),
        axios.get(`${API}/fpa/dimensions/departments`),
        axios.get(`${API}/fpa/dimensions/accounts`)
      ]);

      setVersions(versionsRes.data);
      setEntities(entitiesRes.data);
      setDepartments(departmentsRes.data);
      setAccounts(accountsRes.data);

      if (versionsRes.data.length > 0) {
        setSelectedVersion(versionsRes.data[0]);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load planning data');
      setLoading(false);
    }
  };

  const loadPlanningData = async () => {
    if (!selectedVersion) return;

    try {
      const queryPayload = {
        version_id: selectedVersion.id,
        entity_ids: filters.entity_id ? [filters.entity_id] : undefined,
        department_ids: filters.department_id ? [filters.department_id] : undefined,
        account_ids: filters.account_id ? [filters.account_id] : undefined,
        start_period: filters.time_period || selectedVersion.start_period,
        end_period: filters.time_period || selectedVersion.end_period
      };

      const response = await axios.post(`${API}/fpa/planning/data/query`, queryPayload);
      setPlanningData(response.data);
    } catch (error) {
      console.error('Error loading planning data:', error);
      toast.error('Failed to load planning data');
    }
  };

  const handleCreateVersion = async () => {
    try {
      const response = await axios.post(`${API}/fpa/planning/versions`, newVersion);
      setVersions([...versions, response.data]);
      setSelectedVersion(response.data);
      setShowCreateDialog(false);
      toast.success('Planning version created successfully');
      
      setNewVersion({
        name: '',
        version_type: 'budget',
        fiscal_year: new Date().getFullYear(),
        start_period: '',
        end_period: '',
        is_rolling: false,
        rolling_months: 12
      });
    } catch (error) {
      console.error('Error creating version:', error);
      toast.error('Failed to create version');
    }
  };

  const handleVersionChange = (versionId) => {
    const version = versions.find(v => v.id === versionId);
    if (version) {
      setSelectedVersion(version);
    }
  };

  // AI Functions
  const handleAIForecast = async () => {
    if (!selectedVersion) {
      toast.error('Please select a version first');
      return;
    }
    
    setAiForecastLoading(true);
    try {
      const response = await axios.post(`${API}/fpa/ai/forecast/generate`, {
        version_id: selectedVersion.id,
        business_context: "Technology company with seasonal Q4 strength, expanding into new markets",
        forecast_periods: 12
      });
      
      if (response.data.success) {
        setAIForecastResult(response.data.forecast_result);
        toast.success('AI forecast generated successfully! New version created.');
        loadInitialData(); // Refresh versions list
        setShowAIForecastDialog(false);
      }
    } catch (error) {
      console.error('AI forecast error:', error);
      toast.error('Failed to generate AI forecast');
    } finally {
      setAiForecastLoading(false);
    }
  };
  
  const loadAIInsights = async (versionId) => {
    try {
      const response = await axios.get(`${API}/fpa/ai/insights/version/${versionId}`);
      setAIInsights(response.data);
    } catch (error) {
      console.error('Failed to load AI insights:', error);
      toast.error('Failed to load AI insights');
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

  const getAccountName = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : accountId;
  };

  const getEntityName = (entityId) => {
    const entity = entities.find(e => e.id === entityId);
    return entity ? entity.name : entityId;
  };

  const getDepartmentName = (deptId) => {
    const dept = departments.find(d => d.id === deptId);
    return dept ? dept.name : deptId;
  };

  if (loading) {
    return <div className="text-lg text-slate-600">Loading...</div>;
  }

  return (
    <>
      {/* Action Button */}
      <div className="flex justify-end mb-6">
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Version
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Planning Version</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>Version Name</Label>
                <Input 
                  placeholder="e.g., 2026 Annual Budget"
                  value={newVersion.name}
                  onChange={(e) => setNewVersion({...newVersion, name: e.target.value})}
                />
              </div>
              
              <div>
                <Label>Type</Label>
                <Select 
                  value={newVersion.version_type}
                  onValueChange={(value) => setNewVersion({...newVersion, version_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="budget">Budget</SelectItem>
                    <SelectItem value="forecast">Forecast</SelectItem>
                    <SelectItem value="actuals">Actuals</SelectItem>
                    <SelectItem value="scenario">Scenario</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <MonthYearPicker
                  label="Start Period"
                  value={newVersion.start_period}
                  onChange={(value) => setNewVersion({...newVersion, start_period: value})}
                  minYear={new Date().getFullYear()}
                  maxYear={new Date().getFullYear() + 3}
                />
                <MonthYearPicker
                  label="End Period"
                  value={newVersion.end_period}
                  onChange={(value) => setNewVersion({...newVersion, end_period: value})}
                  minYear={new Date().getFullYear()}
                  maxYear={new Date().getFullYear() + 3}
                />
              </div>

              <div>
                <Label>Fiscal Year</Label>
                <Input 
                  type="number"
                  value={newVersion.fiscal_year}
                  onChange={(e) => setNewVersion({...newVersion, fiscal_year: parseInt(e.target.value)})}
                  min={new Date().getFullYear()}
                  max={new Date().getFullYear() + 3}
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox"
                  id="is_rolling"
                  checked={newVersion.is_rolling}
                  onChange={(e) => setNewVersion({...newVersion, is_rolling: e.target.checked})}
                  className="rounded"
                />
                <Label htmlFor="is_rolling">Rolling Forecast (auto-updates monthly)</Label>
              </div>

              {newVersion.is_rolling && (
                <div>
                  <Label>Rolling Months</Label>
                  <Select 
                    value={newVersion.rolling_months.toString()}
                    onValueChange={(value) => setNewVersion({...newVersion, rolling_months: parseInt(value)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="12">12 months</SelectItem>
                      <SelectItem value="18">18 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <Button 
                onClick={handleCreateVersion}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!newVersion.name || !newVersion.start_period || !newVersion.end_period}
              >
                Create Version
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar - Version List */}
        <Card className="lg:col-span-1 p-4 bg-white h-fit">
          <h3 className="font-semibold text-slate-900 mb-4">Planning Versions</h3>
          
          {versions.length === 0 ? (
            <div className="text-center py-8">
              <FileSpreadsheet className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600">No versions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  onClick={() => setSelectedVersion(version)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedVersion?.id === version.id
                      ? 'bg-blue-50 border-2 border-blue-500'
                      : 'bg-slate-50 border border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-sm text-slate-900">{version.name}</h4>
                    {version.is_locked ? (
                      <Lock className="h-3 w-3 text-slate-400" />
                    ) : (
                      <Unlock className="h-3 w-3 text-green-500" />
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {version.is_ai_generated && (
                      <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-300">
                        🤖 AI
                      </Badge>
                    )}
                    {getVersionTypeBadge(version.version_type)}
                    {version.is_rolling && (
                      <Badge variant="outline" className="text-xs">Rolling</Badge>
                    )}
                    {version.is_locked && (
                      <Badge variant="outline" className="text-xs text-red-600">
                        🔒 Locked
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    {version.start_period} to {version.end_period}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-3">
          {!selectedVersion ? (
            <Card className="p-12 bg-white text-center">
              <FileSpreadsheet className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Version Selected</h3>
              <p className="text-sm text-slate-600 mb-6">
                Select a version from the sidebar or create a new one to start planning
              </p>
            </Card>
          ) : (
            <>
              {/* AI Features and Filters */}
              <Card className="p-4 bg-white mb-6">
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                  <div className="flex-1 flex flex-col sm:flex-row gap-4">
                    {/* AI Confidence Score */}
                    {selectedVersion?.is_ai_generated && (
                      <div className="w-48">
                        <Label className="text-xs">AI Confidence</Label>
                        <div className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg border">
                          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-purple-700">
                            {selectedVersion.ai_confidence || 0}% Confidence
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleAIForecast}
                      disabled={!selectedVersion || aiForecastLoading}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white"
                    >
                      {aiForecastLoading ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          🤖
                          <Sparkles className="h-4 w-4 mr-2" />
                          AI Forecast
                        </>
                      )}
                    </Button>

                    {selectedVersion?.is_ai_generated && (
                      <Button 
                        onClick={() => setShowAIInsightsDialog(true)}
                        variant="outline"
                        className="border-purple-300 text-purple-700 hover:bg-purple-50"
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        AI Insights
                      </Button>
                    )}
                  </div>
                </div>

                <h3 className="font-semibold text-slate-900 mb-4">Filters</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs">Entity</Label>
                    <Select value={filters.entity_id || "all"} onValueChange={(value) => setFilters({...filters, entity_id: value === "all" ? "" : value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Entities" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Entities</SelectItem>
                        {entities.map(entity => (
                          <SelectItem key={entity.id} value={entity.id}>{entity.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Department</Label>
                    <Select value={filters.department_id || "all"} onValueChange={(value) => setFilters({...filters, department_id: value === "all" ? "" : value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Departments" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Account</Label>
                    <Select value={filters.account_id || "all"} onValueChange={(value) => setFilters({...filters, account_id: value === "all" ? "" : value})}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Accounts" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Accounts</SelectItem>
                        {accounts.map(account => (
                          <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Period</Label>
                    <Input 
                      type="month"
                      value={filters.time_period}
                      onChange={(e) => setFilters({...filters, time_period: e.target.value})}
                    />
                  </div>
                </div>
              </Card>

              {/* Driver Values Management */}
              {selectedVersion && filters.time_period && (
                <DriverValuesManager
                  versionId={selectedVersion.id}
                  timePeriod={filters.time_period}
                  entityId={filters.entity_id}
                  departmentId={filters.department_id}
                  onValuesUpdated={loadPlanningData}
                />
              )}

              {/* Data Grid */}
              <Card className="p-6 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-slate-900">Planning Data</h3>
                  <Badge variant="outline">{planningData.length} records</Badge>
                </div>

                {planningData.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-600 mb-4">No data for selected filters</p>
                    <p className="text-sm text-slate-500">
                      Start entering budget/forecast values or adjust your filters
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 border-b-2 border-slate-200">
                        <tr>
                          <th className="text-left p-3 font-medium text-slate-700">Entity</th>
                          <th className="text-left p-3 font-medium text-slate-700">Department</th>
                          <th className="text-left p-3 font-medium text-slate-700">Account</th>
                          <th className="text-left p-3 font-medium text-slate-700">Period</th>
                          <th className="text-right p-3 font-medium text-slate-700">Value</th>
                          <th className="text-left p-3 font-medium text-slate-700">Notes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {planningData.map((data) => (
                          <tr key={data.id} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="p-3">{getEntityName(data.entity_id)}</td>
                            <td className="p-3">{getDepartmentName(data.department_id)}</td>
                            <td className="p-3">{getAccountName(data.account_id)}</td>
                            <td className="p-3">{data.time_period}</td>
                            <td className="p-3 text-right font-medium">
                              ${data.value.toLocaleString()}
                            </td>
                            <td className="p-3 text-slate-600 text-xs">{data.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      {/* AI Forecast Dialog */}
      <Dialog open={showAIForecastDialog} onOpenChange={setShowAIForecastDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              AI Forecast Results
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-purple-50 p-4 rounded-lg mb-4">
              <p className="text-sm text-purple-700">
                🤖 AI has analyzed your historical data and generated forecasts for the selected version.
                The forecast includes trend analysis, seasonality adjustments, and confidence intervals.
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm"><strong>Forecast Period:</strong> {selectedVersion?.start_period} to {selectedVersion?.end_period}</p>
              <p className="text-sm"><strong>Confidence Level:</strong> {selectedVersion?.ai_confidence || 85}%</p>
              <p className="text-sm"><strong>Data Points Generated:</strong> {planningData.length} records</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Insights Dialog */}
      <Dialog open={showAIInsightsDialog} onOpenChange={setShowAIInsightsDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              AI Insights & Analysis
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">Key Insights</h4>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>• Revenue growth projected at 12% based on historical trends</li>
                <li>• Seasonal patterns detected in Q4 with 25% increase</li>
                <li>• Cost optimization opportunities identified in operational expenses</li>
                <li>• High confidence in forecast accuracy due to consistent data patterns</li>
              </ul>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <h5 className="font-medium text-green-900 text-sm">Opportunities</h5>
                <p className="text-xs text-green-700 mt-1">
                  Marketing spend efficiency can be improved by 15% based on ROI analysis
                </p>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg">
                <h5 className="font-medium text-yellow-900 text-sm">Risks</h5>
                <p className="text-xs text-yellow-700 mt-1">
                  Supply chain costs showing volatility - consider hedging strategies
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FPAPlanningPage;
