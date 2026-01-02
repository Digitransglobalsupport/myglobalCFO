import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { API } from '@/App';
import { RefreshCw, Calendar, TrendingUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';

const FPARollingForecast = () => {
  const { user } = useOutletContext();
  const [rollingVersions, setRollingVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rollingVersion, setRollingVersion] = useState(null);
  const [showRollDialog, setShowRollDialog] = useState(false);
  const [isRolling, setIsRolling] = useState(false);
  const [rollResult, setRollResult] = useState(null);

  useEffect(() => {
    loadRollingVersions();
  }, []);

  const loadRollingVersions = async () => {
    try {
      const response = await axios.get(`${API}/fpa/planning/versions`);
      const rolling = response.data.filter(v => v.is_rolling === true);
      setRollingVersions(rolling);
      setLoading(false);
    } catch (error) {
      console.error('Error loading rolling versions:', error);
      toast.error('Failed to load rolling forecasts');
      setLoading(false);
    }
  };

  const handleRollForward = async (versionId) => {
    setIsRolling(true);
    setRollResult(null);
    
    try {
      const response = await axios.post(`${API}/fpa/phase4/rolling-forecast/${versionId}/roll-forward`);
      
      if (response.data.success) {
        setRollResult(response.data);
        toast.success(response.data.message);
        await loadRollingVersions(); // Reload to show updated periods
      } else {
        toast.error(response.data.error || 'Failed to roll forecast');
      }
    } catch (error) {
      console.error('Error rolling forecast:', error);
      toast.error(error.response?.data?.detail || 'Failed to roll forecast');
    } finally {
      setIsRolling(false);
    }
  };

  const handleAutoRollAll = async () => {
    setIsRolling(true);
    
    try {
      const response = await axios.post(`${API}/fpa/phase4/rolling-forecast/auto-roll-all`);
      
      if (response.data.success) {
        toast.success(`Successfully rolled ${response.data.rolled_count} forecasts`);
        await loadRollingVersions();
      } else {
        toast.error(response.data.error || 'Failed to auto-roll forecasts');
      }
    } catch (error) {
      console.error('Error auto-rolling:', error);
      toast.error('Failed to auto-roll forecasts');
    } finally {
      setIsRolling(false);
    }
  };

  const openRollDialog = (version) => {
    setRollingVersion(version);
    setRollResult(null);
    setShowRollDialog(true);
  };

  if (loading) {
    return <div className="text-lg text-slate-600">Loading rolling forecasts...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Rolling Forecast Manager</h2>
          <p className="text-sm text-slate-600">Manage automated rolling forecasts</p>
        </div>
        
        {rollingVersions.length > 0 && (
          <Button 
            onClick={handleAutoRollAll}
            disabled={isRolling}
            className="bg-green-600 hover:bg-green-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRolling ? 'animate-spin' : ''}`} />
            Auto-Roll All Forecasts
          </Button>
        )}
      </div>

      {/* Info Card */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-blue-900 text-sm mb-1">About Rolling Forecasts</h3>
            <p className="text-xs text-blue-700">
              Rolling forecasts automatically update by dropping the oldest month and adding a new forecast month at the end.
              This maintains a constant {rollingVersions[0]?.rolling_months || 12}-month forward-looking view.
            </p>
          </div>
        </div>
      </Card>

      {/* Rolling Versions List */}
      {rollingVersions.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="h-16 w-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-base font-medium text-slate-900 mb-2">No Rolling Forecasts</h3>
          <p className="text-sm text-slate-600 mb-6">
            Create a new version with "Rolling Forecast" enabled to use this feature
          </p>
          <Button 
            onClick={() => window.location.href = '/dashboard/fpa/planning'}
            variant="outline"
          >
            Create Rolling Forecast
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rollingVersions.map((version) => (
            <Card key={version.id} className="p-5">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 mb-2">{version.name}</h3>
                    <div className="flex flex-wrap gap-2">
                      <Badge className="bg-green-500">
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Rolling
                      </Badge>
                      <Badge variant="outline">
                        {version.rolling_months} months
                      </Badge>
                      {version.is_locked && (
                        <Badge variant="outline" className="text-red-600 border-red-300">
                          🔒 Locked
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Period Info */}
                <div className="bg-slate-50 p-3 rounded-lg space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Current Period:</span>
                    <span className="font-medium text-slate-900">
                      {version.start_period} → {version.end_period}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Fiscal Year:</span>
                    <span className="font-medium text-slate-900">{version.fiscal_year}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Last Updated:</span>
                    <span className="text-xs text-slate-600">
                      {new Date(version.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <Button 
                    onClick={() => openRollDialog(version)}
                    disabled={version.is_locked || isRolling}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Roll Forward
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = `/dashboard/fpa/planning?version=${version.id}`}
                    className="flex-1"
                  >
                    View Data
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Roll Forward Confirmation Dialog */}
      <Dialog open={showRollDialog} onOpenChange={setShowRollDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Roll Forecast Forward</DialogTitle>
            <DialogDescription>
              This will shift the forecast window forward by one month
            </DialogDescription>
          </DialogHeader>
          
          {rollingVersion && (
            <div className="py-4 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-yellow-800 font-medium mb-1">Action Summary:</p>
                    <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
                      <li>Drop data for <strong>{rollingVersion.start_period}</strong></li>
                      <li>Shift forecast window forward</li>
                      <li>Generate forecast for new end month</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              {rollResult && rollResult.success && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-green-800 font-medium mb-1">Successfully Rolled Forward!</p>
                      <div className="text-xs text-green-700 space-y-1">
                        <p>Dropped Period: <strong>{rollResult.dropped_period}</strong></p>
                        <p>Added Period: <strong>{rollResult.added_period}</strong></p>
                        <p>Records Dropped: {rollResult.records_dropped}</p>
                        <p>Records Added: {rollResult.records_added}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRollDialog(false)}
              disabled={isRolling}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => handleRollForward(rollingVersion.id)}
              disabled={isRolling}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isRolling ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Rolling...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm Roll
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FPARollingForecast;
