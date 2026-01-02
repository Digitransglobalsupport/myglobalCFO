import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import axios from 'axios';
import { API } from '@/App';
import { ArrowLeft, Plus, Calculator, TrendingUp, Edit, Trash2, CheckCircle, XCircle, Pencil } from 'lucide-react';
import { toast } from 'sonner';

const FPADrivers = ({ user }) => {
  const navigate = useNavigate();
  const [drivers, setDrivers] = useState([]);
  const [formulas, setFormulas] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDriver, setShowCreateDriver] = useState(false);
  const [showCreateFormula, setShowCreateFormula] = useState(false);
  const [newDriver, setNewDriver] = useState({
    name: '',
    code: '',
    driver_type: 'headcount',
    description: '',
    unit: ''
  });
  const [newFormula, setNewFormula] = useState({
    name: '',
    account_id: '',
    expression: '',
    dependencies: []
  });
  const [formulaValidation, setFormulaValidation] = useState(null);
  
  // Edit driver state
  const [showEditDriver, setShowEditDriver] = useState(false);
  const [driverToEdit, setDriverToEdit] = useState(null);
  const [editDriverForm, setEditDriverForm] = useState({
    name: '',
    code: '',
    driver_type: 'headcount',
    description: '',
    unit: ''
  });
  const [isEditingDriver, setIsEditingDriver] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [driversRes, formulasRes, accountsRes] = await Promise.all([
        axios.get(`${API}/fpa/drivers/`),
        axios.get(`${API}/fpa/drivers/formulas/`),
        axios.get(`${API}/fpa/dimensions/accounts`)
      ]);

      setDrivers(driversRes.data);
      setFormulas(formulasRes.data);
      setAccounts(accountsRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading drivers:', error);
      toast.error('Failed to load drivers and formulas');
      setLoading(false);
    }
  };

  const handleCreateDriver = async () => {
    try {
      const response = await axios.post(`${API}/fpa/drivers/`, newDriver);
      setDrivers([...drivers, response.data]);
      setShowCreateDriver(false);
      toast.success('Driver created successfully');
      setNewDriver({
        name: '',
        code: '',
        driver_type: 'headcount',
        description: '',
        unit: ''
      });
    } catch (error) {
      console.error('Error creating driver:', error);
      toast.error(error.response?.data?.detail || 'Failed to create driver');
    }
  };

  const validateFormula = async () => {
    try {
      const response = await axios.post(`${API}/fpa/drivers/formulas/validate`, {
        expression: newFormula.expression,
        dependencies: newFormula.dependencies
      });
      setFormulaValidation(response.data);
      
      if (response.data.valid) {
        toast.success('Formula is valid!');
      } else {
        toast.error('Formula has errors');
      }
    } catch (error) {
      console.error('Error validating formula:', error);
      toast.error('Failed to validate formula');
    }
  };

  const handleCreateFormula = async () => {
    try {
      const response = await axios.post(`${API}/fpa/drivers/formulas/`, newFormula);
      setFormulas([...formulas, response.data]);
      setShowCreateFormula(false);
      toast.success('Formula created successfully');
      setNewFormula({
        name: '',
        account_id: '',
        expression: '',
        dependencies: []
      });
      setFormulaValidation(null);
    } catch (error) {
      console.error('Error creating formula:', error);
      toast.error(error.response?.data?.detail || 'Failed to create formula');
    }
  };

  const handleDeleteDriver = async (driverId) => {
    if (!window.confirm('Are you sure you want to delete this driver?')) return;
    
    try {
      await axios.delete(`${API}/fpa/drivers/${driverId}`);
      setDrivers(drivers.filter(d => d.id !== driverId));
      toast.success('Driver deleted successfully');
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error('Failed to delete driver');
    }
  };

  const handleDeleteFormula = async (formulaId) => {
    if (!window.confirm('Are you sure you want to delete this formula?')) return;
    
    try {
      await axios.delete(`${API}/fpa/drivers/formulas/${formulaId}`);
      setFormulas(formulas.filter(f => f.id !== formulaId));
      toast.success('Formula deleted successfully');
    } catch (error) {
      console.error('Error deleting formula:', error);
      toast.error('Failed to delete formula');
    }
  };

  const openEditDriverDialog = (driver) => {
    setDriverToEdit(driver);
    setEditDriverForm({
      name: driver.name,
      code: driver.code,
      driver_type: driver.driver_type,
      description: driver.description || '',
      unit: driver.unit || ''
    });
    setShowEditDriver(true);
  };

  const handleEditDriver = async () => {
    if (!driverToEdit || !editDriverForm.name.trim() || !editDriverForm.code.trim()) return;
    
    setIsEditingDriver(true);
    try {
      const response = await axios.put(`${API}/fpa/drivers/${driverToEdit.id}`, {
        name: editDriverForm.name.trim(),
        code: editDriverForm.code.trim().toUpperCase(),
        driver_type: editDriverForm.driver_type,
        description: editDriverForm.description.trim() || null,
        unit: editDriverForm.unit.trim() || null
      });
      
      // Update drivers list
      setDrivers(drivers.map(d => d.id === driverToEdit.id ? response.data : d));
      setShowEditDriver(false);
      setDriverToEdit(null);
      toast.success('Driver updated successfully');
    } catch (error) {
      console.error('Error updating driver:', error);
      toast.error(error.response?.data?.detail || 'Failed to update driver');
    } finally {
      setIsEditingDriver(false);
    }
  };

  const getAccountName = (accountId) => {
    const account = accounts.find(a => a.id === accountId);
    return account ? account.name : accountId;
  };

  const getDriverTypeBadge = (type) => {
    const badges = {
      'headcount': <Badge className="bg-blue-500">Headcount</Badge>,
      'units': <Badge className="bg-green-500">Units</Badge>,
      'percentage': <Badge className="bg-purple-500">Percentage</Badge>,
      'currency': <Badge className="bg-orange-500">Currency</Badge>,
      'custom': <Badge className="bg-slate-500">Custom</Badge>
    };
    return badges[type] || <Badge>{type}</Badge>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-lg text-slate-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/fpa-dashboard')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Drivers & Formulas</h1>
                <p className="text-sm text-slate-600">Manage operational drivers and driver-based formulas</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="drivers" className="space-y-6">
          <TabsList className="bg-white p-1 border border-slate-200">
            <TabsTrigger value="drivers">Operational Drivers</TabsTrigger>
            <TabsTrigger value="formulas">Formulas</TabsTrigger>
          </TabsList>

          {/* Drivers Tab */}
          <TabsContent value="drivers" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Operational Drivers</h2>
                <p className="text-sm text-slate-600">Define key operational metrics that drive your financial model</p>
              </div>
              <Dialog open={showCreateDriver} onOpenChange={setShowCreateDriver}>
                <DialogTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    New Driver
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create Operational Driver</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Driver Name</Label>
                      <Input 
                        placeholder="e.g., Sales Headcount"
                        value={newDriver.name}
                        onChange={(e) => setNewDriver({...newDriver, name: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label>Driver Code</Label>
                      <Input 
                        placeholder="e.g., HC_SALES (used in formulas)"
                        value={newDriver.code}
                        onChange={(e) => setNewDriver({...newDriver, code: e.target.value.toUpperCase()})}
                      />
                      <p className="text-xs text-slate-500 mt-1">Use uppercase, no spaces (e.g., HC_SALES, UNITS_SOLD)</p>
                    </div>

                    <div>
                      <Label>Type</Label>
                      <Select 
                        value={newDriver.driver_type}
                        onValueChange={(value) => setNewDriver({...newDriver, driver_type: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="headcount">Headcount</SelectItem>
                          <SelectItem value="units">Units</SelectItem>
                          <SelectItem value="percentage">Percentage</SelectItem>
                          <SelectItem value="currency">Currency</SelectItem>
                          <SelectItem value="custom">Custom</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Unit</Label>
                      <Input 
                        placeholder="e.g., employees, units, %"
                        value={newDriver.unit}
                        onChange={(e) => setNewDriver({...newDriver, unit: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label>Description (Optional)</Label>
                      <Textarea 
                        placeholder="Describe what this driver represents"
                        value={newDriver.description}
                        onChange={(e) => setNewDriver({...newDriver, description: e.target.value})}
                        rows={3}
                      />
                    </div>

                    <Button 
                      onClick={handleCreateDriver}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      disabled={!newDriver.name || !newDriver.code}
                    >
                      Create Driver
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {drivers.length === 0 ? (
              <Card className="p-12 bg-white text-center">
                <Calculator className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Drivers Yet</h3>
                <p className="text-sm text-slate-600 mb-6">
                  Create operational drivers like headcount, units sold, or average salary to power your financial model
                </p>
                <Button onClick={() => setShowCreateDriver(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Driver
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {drivers.map((driver) => (
                  <Card key={driver.id} className="p-6 bg-white hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-slate-900">{driver.name}</h3>
                          {getDriverTypeBadge(driver.driver_type)}
                        </div>
                        <p className="text-sm text-slate-600 mb-2">Code: <code className="bg-slate-100 px-2 py-1 rounded">{driver.code}</code></p>
                        {driver.unit && (
                          <p className="text-sm text-slate-600">Unit: {driver.unit}</p>
                        )}
                        {driver.description && (
                          <p className="text-sm text-slate-700 mt-3">{driver.description}</p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => openEditDriverDialog(driver)}
                          className="text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit driver"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteDriver(driver.id)}
                          className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                          title="Delete driver"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Formulas Tab */}
          <TabsContent value="formulas" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Driver-Based Formulas</h2>
                <p className="text-sm text-slate-600">Link drivers to financial accounts with automatic calculations</p>
              </div>
              <Dialog open={showCreateFormula} onOpenChange={setShowCreateFormula}>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    New Formula
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Formula</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div>
                      <Label>Formula Name</Label>
                      <Input 
                        placeholder="e.g., Total Salary Expense"
                        value={newFormula.name}
                        onChange={(e) => setNewFormula({...newFormula, name: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label>Target Account</Label>
                      <Select 
                        value={newFormula.account_id}
                        onValueChange={(value) => setNewFormula({...newFormula, account_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select account to calculate" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map(account => (
                            <SelectItem key={account.id} value={account.id}>
                              {account.name} ({account.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Formula Expression</Label>
                      <Textarea 
                        placeholder="e.g., HC_SALES * AVG_SALARY * (1 + INFLATION)"
                        value={newFormula.expression}
                        onChange={(e) => setNewFormula({...newFormula, expression: e.target.value})}
                        rows={3}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-slate-500 mt-1">
                        Use driver codes. Supports +, -, *, /, (), abs(), round(), min(), max()
                      </p>
                    </div>

                    <div>
                      <Label>Dependencies</Label>
                      <Input 
                        placeholder="e.g., HC_SALES, AVG_SALARY, INFLATION"
                        value={newFormula.dependencies.join(', ')}
                        onChange={(e) => setNewFormula({
                          ...newFormula, 
                          dependencies: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                        })}
                      />
                      <p className="text-xs text-slate-500 mt-1">Comma-separated list of driver codes used in the formula</p>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        onClick={validateFormula}
                        variant="outline"
                        className="flex-1"
                        disabled={!newFormula.expression || newFormula.dependencies.length === 0}
                      >
                        Validate Formula
                      </Button>
                      <Button 
                        onClick={handleCreateFormula}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={!newFormula.name || !newFormula.account_id || !newFormula.expression || !formulaValidation?.valid}
                      >
                        Create Formula
                      </Button>
                    </div>

                    {formulaValidation && (
                      <div className={`p-3 rounded-lg ${formulaValidation.valid ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          {formulaValidation.valid ? (
                            <CheckCircle className="h-5 w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-600" />
                          )}
                          <span className={`font-medium ${formulaValidation.valid ? 'text-green-900' : 'text-red-900'}`}>
                            {formulaValidation.valid ? 'Formula is valid!' : 'Formula has errors'}
                          </span>
                        </div>
                        {formulaValidation.errors && formulaValidation.errors.length > 0 && (
                          <ul className="text-sm text-red-700 list-disc list-inside">
                            {formulaValidation.errors.map((error, idx) => (
                              <li key={idx}>{error}</li>
                            ))}
                          </ul>
                        )}
                        {formulaValidation.warnings && formulaValidation.warnings.length > 0 && (
                          <ul className="text-sm text-orange-700 list-disc list-inside mt-2">
                            {formulaValidation.warnings.map((warning, idx) => (
                              <li key={idx}>{warning}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {formulas.length === 0 ? (
              <Card className="p-12 bg-white text-center">
                <TrendingUp className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">No Formulas Yet</h3>
                <p className="text-sm text-slate-600 mb-6">
                  Create formulas to automatically calculate financial accounts based on your drivers
                </p>
                <Button onClick={() => setShowCreateFormula(true)} className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Formula
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {formulas.map((formula) => (
                  <Card key={formula.id} className="p-6 bg-white hover:shadow-lg transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-semibold text-slate-900">{formula.name}</h3>
                          <Badge variant="outline" className="text-xs">
                            → {getAccountName(formula.account_id)}
                          </Badge>
                        </div>
                        
                        <div className="bg-slate-50 p-3 rounded-lg mb-3">
                          <p className="text-sm font-mono text-slate-800">{formula.expression}</p>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-600">Dependencies:</span>
                          {formula.dependencies.map((dep, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteFormula(formula.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Help Section */}
        <Card className="p-6 bg-blue-50 border-blue-200 mt-8">
          <h3 className="font-semibold text-blue-900 mb-3">💡 How Driver-Based Modeling Works</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>1. Create Drivers:</strong> Define operational metrics like headcount, units sold, average salary</p>
            <p><strong>2. Build Formulas:</strong> Link drivers to financial accounts with mathematical expressions</p>
            <p><strong>3. Auto-Calculate:</strong> When you change a driver value, all dependent accounts recalculate automatically</p>
            <p className="mt-3 text-xs">Example: <code className="bg-blue-100 px-2 py-1 rounded">Salary Expense = HC_SALES * AVG_SALARY * (1 + INFLATION)</code></p>
          </div>
        </Card>
      </div>
      
      {/* Edit Driver Dialog */}
      <Dialog open={showEditDriver} onOpenChange={setShowEditDriver}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-blue-600" />
              Edit Driver
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Driver Name</Label>
              <Input 
                placeholder="e.g., Sales Headcount"
                value={editDriverForm.name}
                onChange={(e) => setEditDriverForm({...editDriverForm, name: e.target.value})}
              />
            </div>

            <div>
              <Label>Driver Code</Label>
              <Input 
                placeholder="e.g., HC_SALES (used in formulas)"
                value={editDriverForm.code}
                onChange={(e) => setEditDriverForm({...editDriverForm, code: e.target.value.toUpperCase()})}
              />
              <p className="text-xs text-slate-500 mt-1">Use uppercase, no spaces (e.g., HC_SALES, UNITS_SOLD)</p>
            </div>

            <div>
              <Label>Type</Label>
              <Select 
                value={editDriverForm.driver_type}
                onValueChange={(value) => setEditDriverForm({...editDriverForm, driver_type: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="headcount">Headcount</SelectItem>
                  <SelectItem value="units">Units</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Unit</Label>
              <Input 
                placeholder="e.g., employees, units, %"
                value={editDriverForm.unit}
                onChange={(e) => setEditDriverForm({...editDriverForm, unit: e.target.value})}
              />
            </div>

            <div>
              <Label>Description (Optional)</Label>
              <Textarea 
                placeholder="Describe what this driver represents"
                value={editDriverForm.description}
                onChange={(e) => setEditDriverForm({...editDriverForm, description: e.target.value})}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button 
                variant="outline"
                onClick={() => setShowEditDriver(false)}
                className="flex-1 text-slate-700 border-slate-300 hover:bg-slate-100"
                disabled={isEditingDriver}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEditDriver}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={!editDriverForm.name || !editDriverForm.code || isEditingDriver}
              >
                {isEditingDriver ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FPADrivers;
