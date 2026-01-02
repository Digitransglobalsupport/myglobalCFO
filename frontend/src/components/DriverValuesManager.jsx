import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import axios from 'axios';
import { API } from '@/App';
import { Calculator, Plus, Save, TrendingUp, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const DriverValuesManager = ({ versionId, timePeriod, entityId, departmentId, onValuesUpdated }) => {
  const [drivers, setDrivers] = useState([]);
  const [driverValues, setDriverValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [changedDrivers, setChangedDrivers] = useState(new Set());

  useEffect(() => {
    loadDrivers();
  }, []);

  useEffect(() => {
    if (drivers.length > 0 && versionId && timePeriod) {
      loadDriverValues();
    }
  }, [drivers, versionId, timePeriod, entityId, departmentId]);

  const loadDrivers = async () => {
    try {
      const params = {};
      if (entityId) params.entity_id = entityId;
      if (departmentId) params.department_id = departmentId;
      
      const response = await axios.get(`${API}/fpa/drivers/`, { params });
      setDrivers(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading drivers:', error);
      toast.error('Failed to load drivers');
      setLoading(false);
    }
  };

  const loadDriverValues = async () => {
    try {
      const values = {};
      
      for (const driver of drivers) {
        const params = {
          version_id: versionId,
          start_period: timePeriod,
          end_period: timePeriod
        };
        
        const response = await axios.get(`${API}/fpa/drivers/values/${driver.id}`, { params });
        
        if (response.data.length > 0) {
          const driverValue = response.data.find(dv => 
            dv.time_period === timePeriod &&
            (!entityId || dv.entity_id === entityId) &&
            (!departmentId || dv.department_id === departmentId)
          );
          
          if (driverValue) {
            values[driver.id] = driverValue.value;
          }
        }
      }
      
      setDriverValues(values);
    } catch (error) {
      console.error('Error loading driver values:', error);
      toast.error('Failed to load driver values');
    }
  };

  const handleValueChange = (driverId, value) => {
    setDriverValues(prev => ({ ...prev, [driverId]: parseFloat(value) || 0 }));
    setChangedDrivers(prev => new Set([...prev, driverId]));
  };

  const handleSaveValue = async (driverId) => {
    try {
      setSaving(true);
      const value = driverValues[driverId];
      
      if (value === undefined || value === null) {
        toast.error('Please enter a value');
        return;
      }

      const payload = {
        driver_id: driverId,
        version_id: versionId,
        time_period: timePeriod,
        value: value
      };

      if (entityId) payload.entity_id = entityId;
      if (departmentId) payload.department_id = departmentId;

      await axios.post(`${API}/fpa/drivers/values`, payload);
      
      setChangedDrivers(prev => {
        const updated = new Set(prev);
        updated.delete(driverId);
        return updated;
      });
      
      toast.success('Driver value saved and calculations triggered');
      
      if (onValuesUpdated) {
        onValuesUpdated();
      }
    } catch (error) {
      console.error('Error saving driver value:', error);
      toast.error(error.response?.data?.detail || 'Failed to save driver value');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAllValues = async () => {
    try {
      setSaving(true);
      
      for (const driverId of changedDrivers) {
        const value = driverValues[driverId];
        
        if (value !== undefined && value !== null) {
          const payload = {
            driver_id: driverId,
            version_id: versionId,
            time_period: timePeriod,
            value: value
          };

          if (entityId) payload.entity_id = entityId;
          if (departmentId) payload.department_id = departmentId;

          await axios.post(`${API}/fpa/drivers/values`, payload);
        }
      }
      
      setChangedDrivers(new Set());
      toast.success(`All ${changedDrivers.size} driver values saved and calculations triggered`);
      
      if (onValuesUpdated) {
        onValuesUpdated();
      }
    } catch (error) {
      console.error('Error saving driver values:', error);
      toast.error(error.response?.data?.detail || 'Failed to save driver values');
    } finally {
      setSaving(false);
    }
  };

  const getDriverTypeBadge = (type) => {
    const badges = {
      'headcount': { color: 'bg-blue-500', label: 'Headcount' },
      'units': { color: 'bg-green-500', label: 'Units' },
      'percentage': { color: 'bg-purple-500', label: 'Percentage' },
      'currency': { color: 'bg-orange-500', label: 'Currency' },
      'custom': { color: 'bg-slate-500', label: 'Custom' }
    };
    const badge = badges[type] || { color: 'bg-slate-500', label: type };
    return <Badge className={badge.color}>{badge.label}</Badge>;
  };

  if (loading) {
    return (
      <Card className="p-6 bg-white">
        <div className="text-center text-slate-600">Loading drivers...</div>
      </Card>
    );
  }

  if (drivers.length === 0) {
    return (
      <Card className="p-8 bg-white text-center">
        <Calculator className="h-12 w-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-medium text-slate-900 mb-2">No Drivers Defined</h3>
        <p className="text-sm text-slate-600 mb-4">
          Create operational drivers to enable driver-based planning
        </p>
        <Button 
          onClick={() => window.location.href = '/dashboard/fpa/drivers'}
          variant="outline"
          size="sm"
        >
          Go to Drivers Page
        </Button>
      </Card>
    );
  }

  if (!versionId || !timePeriod) {
    return (
      <Card className="p-6 bg-yellow-50 border-yellow-200">
        <div className="text-sm text-yellow-800">
          Please select a version and time period to manage driver values
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 bg-white">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            Driver Values - {timePeriod}
          </h3>
          <p className="text-sm text-slate-600 mt-1">
            Update operational driver values to trigger automatic formula calculations
          </p>
        </div>
        {changedDrivers.size > 0 && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
              {changedDrivers.size} unsaved
            </Badge>
            <Button 
              onClick={handleSaveAllValues}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {drivers.map((driver) => {
          const hasUnsavedChanges = changedDrivers.has(driver.id);
          
          return (
            <div 
              key={driver.id} 
              className={`p-4 rounded-lg border transition-all ${
                hasUnsavedChanges 
                  ? 'bg-blue-50 border-blue-200' 
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Label className="font-medium text-slate-900">{driver.name}</Label>
                    {getDriverTypeBadge(driver.driver_type)}
                    {hasUnsavedChanges && (
                      <Badge variant="outline" className="text-xs bg-orange-100 text-orange-700 border-orange-300">
                        Modified
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-slate-600">
                    Code: <code className="bg-white px-1.5 py-0.5 rounded border">{driver.code}</code>
                    {driver.unit && ` • Unit: ${driver.unit}`}
                  </div>
                  {driver.description && (
                    <p className="text-xs text-slate-600 mt-1">{driver.description}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    step="any"
                    value={driverValues[driver.id] || ''}
                    onChange={(e) => handleValueChange(driver.id, e.target.value)}
                    placeholder="Enter value"
                    className="w-32 text-right"
                  />
                  <Button
                    onClick={() => handleSaveValue(driver.id)}
                    disabled={saving || !hasUnsavedChanges}
                    variant={hasUnsavedChanges ? "default" : "outline"}
                    size="sm"
                    className={hasUnsavedChanges ? "bg-blue-600 hover:bg-blue-700" : ""}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="flex items-start gap-2 text-xs text-slate-600">
          <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
          <p>
            <strong className="text-slate-700">Auto-calculation:</strong> When you save a driver value, 
            all formulas that depend on this driver will automatically recalculate. Changes will be reflected 
            in your planning data immediately.
          </p>
        </div>
      </div>
    </Card>
  );
};

export default DriverValuesManager;
