import React, { useState, useEffect, useMemo } from 'react';
import { useAuth, useApp, useCurrency } from '../App';
import { toast } from 'sonner';
import {
  Settings, Palette, BarChart3, Layout, Building2, Users, Bot,
  Plus, Trash2, Save, RefreshCcw, Check, Search, ChevronDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

const SettingsPage = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Settings</h1>
        <p className="text-gray-400 mt-1">Configure your MyGlobalCFO experience</p>
      </div>

      <Tabs defaultValue="companies" className="space-y-6">
        <TabsList className="bg-navy-800 border-navy-700">
          <TabsTrigger value="companies" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Building2 className="w-4 h-4 mr-2" /> Companies
          </TabsTrigger>
          <TabsTrigger value="appearance" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Palette className="w-4 h-4 mr-2" /> Appearance
          </TabsTrigger>
          <TabsTrigger value="kpis" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <BarChart3 className="w-4 h-4 mr-2" /> KPI Config
          </TabsTrigger>
          <TabsTrigger value="groups" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Users className="w-4 h-4 mr-2" /> Entity Groups
          </TabsTrigger>
          <TabsTrigger value="ai" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Bot className="w-4 h-4 mr-2" /> AI Advisor
          </TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <CompanySettings />
        </TabsContent>

        <TabsContent value="appearance">
          <AppearanceSettings />
        </TabsContent>

        <TabsContent value="kpis">
          <KPISettings />
        </TabsContent>

        <TabsContent value="groups">
          <EntityGroupSettings />
        </TabsContent>

        <TabsContent value="ai">
          <AIAdvisorSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Company Settings
const CompanySettings = () => {
  const { authAxios } = useAuth();
  const { companies, fetchCompanies, selectedCompany, setSelectedCompany } = useApp();
  const { countries, currencies, getSymbol, getCountryDefaultCurrency, getCountryRegion, formatCurrency } = useCurrency();
  const [showCreate, setShowCreate] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    country: 'United Kingdom',
    country_code: 'GBR',
    currency: 'GBP',
    global_region: 'EMEA',
    company_type: 'Standalone',
    parent_company_id: null
  });
  const [countryOpen, setCountryOpen] = useState(false);
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [countrySearch, setCountrySearch] = useState('');
  const [currencySearch, setCurrencySearch] = useState('');

  // Filter countries based on search
  const filteredCountries = useMemo(() => {
    if (!countrySearch) return countries.slice(0, 50);
    const q = countrySearch.toLowerCase();
    return countries.filter(c => 
      c.country.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [countries, countrySearch]);

  // Filter currencies based on search
  const filteredCurrencies = useMemo(() => {
    if (!currencySearch) return currencies.slice(0, 50);
    const q = currencySearch.toLowerCase();
    return currencies.filter(c => 
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [currencies, currencySearch]);

  // Handle country selection
  const handleCountrySelect = (country) => {
    const defaultCurrency = getCountryDefaultCurrency(country.country);
    const region = getCountryRegion(country.country);
    setNewCompany({
      ...newCompany,
      country: country.country,
      country_code: country.code,
      currency: defaultCurrency,
      global_region: region
    });
    setCountryOpen(false);
    setCountrySearch('');
  };

  // Handle currency selection
  const handleCurrencySelect = (currency) => {
    setNewCompany({
      ...newCompany,
      currency: currency.code
    });
    setCurrencyOpen(false);
    setCurrencySearch('');
  };

  const createCompany = async () => {
    if (!newCompany.name) {
      toast.error('Company name is required');
      return;
    }
    try {
      const res = await authAxios.post('/companies', newCompany);
      toast.success('Company created successfully!');
      setShowCreate(false);
      setNewCompany({
        name: '',
        country: 'United Kingdom',
        country_code: 'GBR',
        currency: 'GBP',
        global_region: 'EMEA',
        company_type: 'Standalone',
        parent_company_id: null
      });
      fetchCompanies();
      setSelectedCompany(res.data);
    } catch (e) {
      toast.error('Failed to create company');
    }
  };

  const deleteCompany = async (companyId) => {
    try {
      await authAxios.delete(`/companies/${companyId}`);
      toast.success('Company deleted');
      fetchCompanies();
      if (selectedCompany?.id === companyId) {
        setSelectedCompany(null);
      }
    } catch (e) {
      toast.error('Failed to delete company');
    }
  };

  // Get selected currency display
  const selectedCurrencyDisplay = useMemo(() => {
    const curr = currencies.find(c => c.code === newCompany.currency);
    if (curr) return `${curr.symbol} ${curr.code} - ${curr.name}`;
    return `${getSymbol(newCompany.currency)} ${newCompany.currency}`;
  }, [currencies, newCompany.currency, getSymbol]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Company Management</h2>
          <p className="text-gray-400">Manage your entities and subsidiaries</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900" data-testid="add-company-btn">
              <Plus className="w-4 h-4 mr-2" /> Add Company
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-navy-800 border-navy-700 max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-white">Add New Company</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Company Name</Label>
                <Input
                  value={newCompany.name}
                  onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white"
                  placeholder="Acme Corp Ltd"
                  data-testid="company-name-input"
                />
              </div>
              
              {/* Searchable Country Dropdown */}
              <div>
                <Label className="text-gray-300">Country</Label>
                <Popover open={countryOpen} onOpenChange={setCountryOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={countryOpen}
                      className="w-full justify-between bg-navy-900 border-navy-600 text-white hover:bg-navy-800"
                      data-testid="country-select-btn"
                    >
                      {newCompany.country || "Select country..."}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-navy-800 border-navy-600" align="start">
                    <div className="p-2">
                      <div className="flex items-center border border-navy-600 rounded-md px-3 bg-navy-900">
                        <Search className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                          placeholder="Search countries..."
                          value={countrySearch}
                          onChange={(e) => setCountrySearch(e.target.value)}
                          className="flex h-9 w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
                          data-testid="country-search-input"
                        />
                      </div>
                    </div>
                    <ScrollArea className="h-[200px]">
                      {filteredCountries.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-sm">No countries found</div>
                      ) : (
                        <div className="p-1">
                          {filteredCountries.map((country) => (
                            <button
                              key={country.code}
                              onClick={() => handleCountrySelect(country)}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer ${
                                newCompany.country === country.country
                                  ? 'bg-gold-500/20 text-gold-400'
                                  : 'text-white hover:bg-navy-700'
                              }`}
                              data-testid={`country-option-${country.code}`}
                            >
                              <span>{country.country}</span>
                              <span className="text-gray-500 text-xs">{country.region}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
                {newCompany.global_region && (
                  <p className="text-xs text-gray-500 mt-1">Region: {newCompany.global_region}</p>
                )}
              </div>

              {/* Searchable Currency Dropdown */}
              <div>
                <Label className="text-gray-300">Currency</Label>
                <Popover open={currencyOpen} onOpenChange={setCurrencyOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={currencyOpen}
                      className="w-full justify-between bg-navy-900 border-navy-600 text-white hover:bg-navy-800"
                      data-testid="currency-select-btn"
                    >
                      {selectedCurrencyDisplay}
                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0 bg-navy-800 border-navy-600" align="start">
                    <div className="p-2">
                      <div className="flex items-center border border-navy-600 rounded-md px-3 bg-navy-900">
                        <Search className="w-4 h-4 text-gray-400 mr-2" />
                        <input
                          placeholder="Search currencies..."
                          value={currencySearch}
                          onChange={(e) => setCurrencySearch(e.target.value)}
                          className="flex h-9 w-full bg-transparent text-sm text-white placeholder:text-gray-500 outline-none"
                          data-testid="currency-search-input"
                        />
                      </div>
                    </div>
                    <ScrollArea className="h-[200px]">
                      {filteredCurrencies.length === 0 ? (
                        <div className="p-4 text-center text-gray-400 text-sm">No currencies found</div>
                      ) : (
                        <div className="p-1">
                          {filteredCurrencies.map((currency) => (
                            <button
                              key={currency.code}
                              onClick={() => handleCurrencySelect(currency)}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md cursor-pointer ${
                                newCompany.currency === currency.code
                                  ? 'bg-gold-500/20 text-gold-400'
                                  : 'text-white hover:bg-navy-700'
                              }`}
                              data-testid={`currency-option-${currency.code}`}
                            >
                              <span className="flex items-center">
                                <span className="w-8 text-gold-400">{currency.symbol}</span>
                                <span className="font-medium">{currency.code}</span>
                                <span className="text-gray-400 ml-2 text-xs truncate max-w-[150px]">{currency.name}</span>
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <Label className="text-gray-300">Company Type</Label>
                <Select
                  value={newCompany.company_type}
                  onValueChange={(v) => setNewCompany({ ...newCompany, company_type: v })}
                >
                  <SelectTrigger className="bg-navy-900 border-navy-600 text-white" data-testid="company-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-navy-800 border-navy-600">
                    <SelectItem value="Standalone" className="text-white">Standalone</SelectItem>
                    <SelectItem value="TopCo" className="text-white">TopCo (Holding Company)</SelectItem>
                    <SelectItem value="Subsidiary" className="text-white">Subsidiary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {newCompany.company_type === 'Subsidiary' && companies.length > 0 && (
                <div>
                  <Label className="text-gray-300">Parent Company</Label>
                  <Select
                    value={newCompany.parent_company_id || ''}
                    onValueChange={(v) => setNewCompany({ ...newCompany, parent_company_id: v })}
                  >
                    <SelectTrigger className="bg-navy-900 border-navy-600 text-white">
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                    <SelectContent className="bg-navy-800 border-navy-600">
                      {companies.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-white">{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-navy-600 text-white">
                Cancel
              </Button>
              <Button onClick={createCompany} className="bg-gold-500 hover:bg-gold-600 text-navy-900" data-testid="create-company-btn">
                Create Company
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Companies List */}
      <div className="grid gap-4">
        {companies.length === 0 ? (
          <Card className="bg-navy-800 border-navy-700">
            <CardContent className="py-16 text-center">
              <Building2 className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Companies Yet</h3>
              <p className="text-gray-400 mb-4">Create your first company to get started</p>
              <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900" onClick={() => setShowCreate(true)}>
                <Plus className="w-4 h-4 mr-2" /> Add Company
              </Button>
            </CardContent>
          </Card>
        ) : (
          companies.map((company) => (
            <Card key={company.id} className="bg-navy-800 border-navy-700" data-testid={`company-card-${company.id}`}>
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-gold-500/10 rounded-lg">
                      <Building2 className="w-6 h-6 text-gold-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{company.name}</h3>
                      <p className="text-sm text-gray-400">
                        {company.country} • {getSymbol(company.currency)} {company.currency} • {company.company_type}
                        {company.global_region && ` • ${company.global_region}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {selectedCompany?.id === company.id && (
                      <Badge className="bg-green-500/20 text-green-400">Selected</Badge>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" data-testid={`delete-company-${company.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="bg-navy-800 border-navy-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-white">Delete {company.name}?</AlertDialogTitle>
                          <AlertDialogDescription className="text-gray-400">
                            This will permanently delete the company and all associated transactions.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="bg-navy-700 text-white">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCompany(company.id)}
                            className="bg-red-500 text-white"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

// Appearance Settings
const AppearanceSettings = () => {
  const { authAxios } = useAuth();
  const { preferences, fetchPreferences } = useApp();
  const [colors, setColors] = useState({
    primary_color: '#1e3a5f',
    secondary_color: '#d4af37',
    background_color: '#0a1929',
    text_color: '#ffffff'
  });

  useEffect(() => {
    if (preferences) {
      setColors({
        primary_color: preferences.primary_color || '#1e3a5f',
        secondary_color: preferences.secondary_color || '#d4af37',
        background_color: preferences.background_color || '#0a1929',
        text_color: preferences.text_color || '#ffffff'
      });
    }
  }, [preferences]);

  const saveColors = async () => {
    try {
      await authAxios.put('/preferences', colors);
      toast.success('Appearance settings saved!');
      fetchPreferences();
    } catch (e) {
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">Appearance</h2>
        <p className="text-gray-400">Customize your dashboard colors</p>
      </div>

      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white">Color Customization</CardTitle>
          <CardDescription className="text-gray-400">Changes apply to your account only</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <ColorPicker
              label="Primary Color"
              value={colors.primary_color}
              onChange={(v) => setColors({ ...colors, primary_color: v })}
            />
            <ColorPicker
              label="Secondary Color"
              value={colors.secondary_color}
              onChange={(v) => setColors({ ...colors, secondary_color: v })}
            />
            <ColorPicker
              label="Background Color"
              value={colors.background_color}
              onChange={(v) => setColors({ ...colors, background_color: v })}
            />
            <ColorPicker
              label="Text Color"
              value={colors.text_color}
              onChange={(v) => setColors({ ...colors, text_color: v })}
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={saveColors} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const ColorPicker = ({ label, value, onChange }) => (
  <div>
    <Label className="text-gray-300">{label}</Label>
    <div className="flex items-center space-x-3 mt-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-12 h-10 rounded cursor-pointer border-0"
      />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-navy-900 border-navy-600 text-white w-32"
      />
    </div>
  </div>
);

// KPI Settings
const KPISettings = () => {
  const { authAxios } = useAuth();
  const { preferences, fetchPreferences } = useApp();
  const [enabledKPIs, setEnabledKPIs] = useState(['revenue', 'ebitda', 'cash_balance', 'runway']);

  const allKPIs = [
    { id: 'revenue', label: 'Total Revenue' },
    { id: 'ebitda', label: 'EBITDA' },
    { id: 'ebitda_margin', label: 'EBITDA Margin' },
    { id: 'cash_balance', label: 'Cash Balance' },
    { id: 'runway', label: 'Runway (Days)' },
    { id: 'burn_rate', label: 'Burn Rate' },
    { id: 'quick_ratio', label: 'Quick Ratio' },
    { id: 'revenue_growth', label: 'Revenue Growth' }
  ];

  useEffect(() => {
    if (preferences?.enabled_kpis) {
      setEnabledKPIs(preferences.enabled_kpis);
    }
  }, [preferences]);

  const toggleKPI = (kpiId) => {
    setEnabledKPIs(prev =>
      prev.includes(kpiId)
        ? prev.filter(k => k !== kpiId)
        : [...prev, kpiId]
    );
  };

  const saveKPIs = async () => {
    try {
      await authAxios.put('/preferences', { enabled_kpis: enabledKPIs });
      toast.success('KPI settings saved!');
      fetchPreferences();
    } catch (e) {
      toast.error('Failed to save settings');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">KPI Configuration</h2>
        <p className="text-gray-400">Choose which KPIs to display on your dashboard</p>
      </div>

      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="pt-6">
          <div className="space-y-4">
            {allKPIs.map((kpi) => (
              <div key={kpi.id} className="flex items-center justify-between p-3 bg-navy-900 rounded-lg">
                <span className="text-white">{kpi.label}</span>
                <Switch
                  checked={enabledKPIs.includes(kpi.id)}
                  onCheckedChange={() => toggleKPI(kpi.id)}
                  className="data-[state=checked]:bg-gold-500"
                />
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-6">
            <Button onClick={saveKPIs} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
              <Save className="w-4 h-4 mr-2" /> Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// Entity Group Settings
const EntityGroupSettings = () => {
  const { authAxios } = useAuth();
  const { companies } = useApp();
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    entity_ids: []
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await authAxios.get('/entity-groups');
      setGroups(res.data);
    } catch (e) {
      console.error('Error fetching groups:', e);
    }
  };

  const createGroup = async () => {
    try {
      await authAxios.post('/entity-groups', newGroup);
      toast.success('Group created!');
      setShowCreate(false);
      setNewGroup({ name: '', description: '', entity_ids: [] });
      fetchGroups();
    } catch (e) {
      toast.error('Failed to create group');
    }
  };

  const deleteGroup = async (groupId) => {
    try {
      await authAxios.delete(`/entity-groups/${groupId}`);
      toast.success('Group deleted');
      fetchGroups();
    } catch (e) {
      toast.error('Failed to delete group');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">Entity Groups</h2>
          <p className="text-gray-400">Create custom groupings of your entities</p>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button className="bg-gold-500 hover:bg-gold-600 text-navy-900">
              <Plus className="w-4 h-4 mr-2" /> Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-navy-800 border-navy-700">
            <DialogHeader>
              <DialogTitle className="text-white">Create Entity Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label className="text-gray-300">Group Name</Label>
                <Input
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white"
                  placeholder="e.g., EMEA Region"
                />
              </div>
              <div>
                <Label className="text-gray-300">Description</Label>
                <Input
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  className="bg-navy-900 border-navy-600 text-white"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <Label className="text-gray-300">Select Entities</Label>
                <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                  {companies.map((company) => (
                    <label key={company.id} className="flex items-center space-x-2 p-2 bg-navy-900 rounded cursor-pointer hover:bg-navy-700">
                      <input
                        type="checkbox"
                        checked={newGroup.entity_ids.includes(company.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewGroup({ ...newGroup, entity_ids: [...newGroup.entity_ids, company.id] });
                          } else {
                            setNewGroup({ ...newGroup, entity_ids: newGroup.entity_ids.filter(id => id !== company.id) });
                          }
                        }}
                        className="rounded border-navy-600"
                      />
                      <span className="text-white">{company.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-navy-600 text-white">
                Cancel
              </Button>
              <Button onClick={createGroup} className="bg-gold-500 hover:bg-gold-600 text-navy-900">
                Create Group
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {groups.length === 0 ? (
          <Card className="bg-navy-800 border-navy-700">
            <CardContent className="py-16 text-center">
              <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-2">No Groups Yet</h3>
              <p className="text-gray-400">Create groups to organize your entities</p>
            </CardContent>
          </Card>
        ) : (
          groups.map((group) => (
            <Card key={group.id} className="bg-navy-800 border-navy-700">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold">{group.name}</h3>
                    <p className="text-sm text-gray-400">
                      {group.description || `${group.entity_ids.length} entities`}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-400 hover:text-red-300"
                    onClick={() => deleteGroup(group.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

// AI Advisor Settings
const AIAdvisorSettings = () => {
  const { user } = useAuth();

  if (user?.role !== 'admin') {
    return (
      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="py-16 text-center">
          <Bot className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Admin Access Required</h3>
          <p className="text-gray-400">Only administrators can manage AI Advisor settings</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">AI Advisor Settings</h2>
        <p className="text-gray-400">Configure AI Advisor access for your organization</p>
      </div>

      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white">Global Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-navy-900 rounded-lg">
            <div>
              <p className="text-white font-medium">Enable AI Advisor</p>
              <p className="text-sm text-gray-400">Allow users to access AI financial advisor</p>
            </div>
            <Switch defaultChecked className="data-[state=checked]:bg-gold-500" />
          </div>
          <div className="flex items-center justify-between p-3 bg-navy-900 rounded-lg">
            <div>
              <p className="text-white font-medium">Voice Input</p>
              <p className="text-sm text-gray-400">Enable speech recognition for queries</p>
            </div>
            <Switch defaultChecked className="data-[state=checked]:bg-gold-500" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
