import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import axios from 'axios';
import { API } from '@/App';
import { Plus, Building, Users, DollarSign, Package, Target, Globe, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const FPADimensionsPage = () => {
  const [activeTab, setActiveTab] = useState('entities');
  const [entities, setEntities] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [products, setProducts] = useState([]);
  const [segments, setSegments] = useState([]);
  const [geographies, setGeographies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newItem, setNewItem] = useState({});

  useEffect(() => {
    loadAllDimensions();
  }, []);

  const loadAllDimensions = async () => {
    try {
      const [
        entitiesRes,
        departmentsRes,
        accountsRes,
        productsRes,
        segmentsRes,
        geographiesRes
      ] = await Promise.all([
        axios.get(`${API}/fpa/dimensions/entities`),
        axios.get(`${API}/fpa/dimensions/departments`),
        axios.get(`${API}/fpa/dimensions/accounts`),
        axios.get(`${API}/fpa/dimensions/products`),
        axios.get(`${API}/fpa/dimensions/segments`),
        axios.get(`${API}/fpa/dimensions/geographies`)
      ]);

      setEntities(entitiesRes.data);
      setDepartments(departmentsRes.data);
      setAccounts(accountsRes.data);
      setProducts(productsRes.data);
      setSegments(segmentsRes.data);
      setGeographies(geographiesRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Error loading dimensions:', error);
      toast.error('Failed to load dimensions');
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      let endpoint = '';
      switch (activeTab) {
        case 'entities':
          endpoint = `${API}/fpa/dimensions/entities`;
          break;
        case 'departments':
          endpoint = `${API}/fpa/dimensions/departments`;
          break;
        case 'accounts':
          endpoint = `${API}/fpa/dimensions/accounts`;
          break;
        case 'products':
          endpoint = `${API}/fpa/dimensions/products`;
          break;
        case 'segments':
          endpoint = `${API}/fpa/dimensions/segments`;
          break;
        case 'geographies':
          endpoint = `${API}/fpa/dimensions/geographies`;
          break;
        default:
          return;
      }

      await axios.post(endpoint, newItem);
      toast.success('Item created successfully');
      setShowCreateDialog(false);
      setNewItem({});
      loadAllDimensions();
    } catch (error) {
      console.error('Error creating item:', error);
      toast.error('Failed to create item');
    }
  };

  const getCreateFields = () => {
    switch (activeTab) {
      case 'entities':
        return (
          <>
            <div>
              <Label>Entity Name</Label>
              <Input 
                placeholder="e.g., US Operations"
                value={newItem.name || ''}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Entity Code</Label>
              <Input 
                placeholder="e.g., US-OPS"
                value={newItem.code || ''}
                onChange={(e) => setNewItem({...newItem, code: e.target.value})}
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Input 
                placeholder="e.g., USD"
                value={newItem.currency || 'GBP'}
                onChange={(e) => setNewItem({...newItem, currency: e.target.value})}
              />
            </div>
          </>
        );
      case 'departments':
        return (
          <>
            <div>
              <Label>Department Name</Label>
              <Input 
                placeholder="e.g., Sales & Marketing"
                value={newItem.name || ''}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Department Code</Label>
              <Input 
                placeholder="e.g., SALES"
                value={newItem.code || ''}
                onChange={(e) => setNewItem({...newItem, code: e.target.value})}
              />
            </div>
          </>
        );
      case 'accounts':
        return (
          <>
            <div>
              <Label>Account Name</Label>
              <Input 
                placeholder="e.g., Revenue"
                value={newItem.name || ''}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Account Code</Label>
              <Input 
                placeholder="e.g., 4000"
                value={newItem.code || ''}
                onChange={(e) => setNewItem({...newItem, code: e.target.value})}
              />
            </div>
            <div>
              <Label>Account Type</Label>
              <Input 
                placeholder="e.g., Revenue"
                value={newItem.account_type || ''}
                onChange={(e) => setNewItem({...newItem, account_type: e.target.value})}
              />
            </div>
          </>
        );
      case 'products':
        return (
          <>
            <div>
              <Label>Product Name</Label>
              <Input 
                placeholder="e.g., Premium Software"
                value={newItem.name || ''}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Product Code</Label>
              <Input 
                placeholder="e.g., PREM-SW"
                value={newItem.code || ''}
                onChange={(e) => setNewItem({...newItem, code: e.target.value})}
              />
            </div>
          </>
        );
      case 'segments':
        return (
          <>
            <div>
              <Label>Segment Name</Label>
              <Input 
                placeholder="e.g., Enterprise"
                value={newItem.name || ''}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Segment Code</Label>
              <Input 
                placeholder="e.g., ENT"
                value={newItem.code || ''}
                onChange={(e) => setNewItem({...newItem, code: e.target.value})}
              />
            </div>
          </>
        );
      case 'geographies':
        return (
          <>
            <div>
              <Label>Geography Name</Label>
              <Input 
                placeholder="e.g., North America"
                value={newItem.name || ''}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              />
            </div>
            <div>
              <Label>Geography Code</Label>
              <Input 
                placeholder="e.g., NAM"
                value={newItem.code || ''}
                onChange={(e) => setNewItem({...newItem, code: e.target.value})}
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  const renderDimensionList = (items, icon) => {
    if (items.length === 0) {
      return (
        <div className="text-center py-12">
          <div className="text-slate-300 mb-4">{icon}</div>
          <p className="text-sm text-slate-600">No items yet. Create your first one!</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Card key={item.id} className="p-4 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-slate-900">{item.name}</h4>
                <p className="text-sm text-slate-600">{item.code}</p>
                {item.currency && (
                  <Badge variant="outline" className="mt-2">{item.currency}</Badge>
                )}
                {item.account_type && (
                  <Badge variant="outline" className="mt-2">{item.account_type}</Badge>
                )}
              </div>
              <Badge variant={item.is_active ? "default" : "secondary"}>
                {item.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="text-lg text-slate-600">Loading dimensions...</div>;
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Planning Dimensions</h2>
          <p className="text-sm text-slate-600 mt-1">
            Manage entities, departments, accounts, and other planning dimensions
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New {activeTab.slice(0, -1)}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {getCreateFields()}
              <Button 
                onClick={handleCreate}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!newItem.name || !newItem.code}
              >
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-6 bg-white">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="entities">
              <Building className="h-4 w-4 mr-2" />
              Entities ({entities.length})
            </TabsTrigger>
            <TabsTrigger value="departments">
              <Users className="h-4 w-4 mr-2" />
              Departments ({departments.length})
            </TabsTrigger>
            <TabsTrigger value="accounts">
              <DollarSign className="h-4 w-4 mr-2" />
              Accounts ({accounts.length})
            </TabsTrigger>
            <TabsTrigger value="products">
              <Package className="h-4 w-4 mr-2" />
              Products ({products.length})
            </TabsTrigger>
            <TabsTrigger value="segments">
              <Target className="h-4 w-4 mr-2" />
              Segments ({segments.length})
            </TabsTrigger>
            <TabsTrigger value="geographies">
              <Globe className="h-4 w-4 mr-2" />
              Geographies ({geographies.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="entities">
            {renderDimensionList(entities, <Building className="h-16 w-16 mx-auto" />)}
          </TabsContent>

          <TabsContent value="departments">
            {renderDimensionList(departments, <Users className="h-16 w-16 mx-auto" />)}
          </TabsContent>

          <TabsContent value="accounts">
            {renderDimensionList(accounts, <DollarSign className="h-16 w-16 mx-auto" />)}
          </TabsContent>

          <TabsContent value="products">
            {renderDimensionList(products, <Package className="h-16 w-16 mx-auto" />)}
          </TabsContent>

          <TabsContent value="segments">
            {renderDimensionList(segments, <Target className="h-16 w-16 mx-auto" />)}
          </TabsContent>

          <TabsContent value="geographies">
            {renderDimensionList(geographies, <Globe className="h-16 w-16 mx-auto" />)}
          </TabsContent>
        </Tabs>
      </Card>
    </>
  );
};

export default FPADimensionsPage;
