import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { CurrencyProvider, useCurrency } from './context/CurrencyContext';
import { ReportingHorizonProvider } from './context/ReportingHorizonContext';

// Icons from lucide-react
import {
  Gauge, Receipt, RefreshCcw, BarChart3, Plug, Wallet, Bot,
  Calculator, Settings, LogOut, Building2, ChevronDown, Menu, X,
  TrendingUp, DollarSign, Clock, Activity, CheckCircle, AlertCircle,
  XCircle, Plus, Trash2, Search, Filter, ExternalLink, Lock, Unlock,
  Users, Layers, Target, Zap, Globe, ArrowUpRight, ArrowDownRight, Shield
} from 'lucide-react';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

export { API };

// Re-export useCurrency for convenience
export { useCurrency } from './context/CurrencyContext';

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
    } catch (e) {
      console.error('Auth error:', e);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('token', res.data.token);
    return res.data;
  };

  const register = async (email, password, name) => {
    const res = await axios.post(`${API}/auth/register`, { email, password, name });
    setToken(res.data.token);
    setUser(res.data.user);
    localStorage.setItem('token', res.data.token);
    return res.data;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('token');
  };

  const authAxios = axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, authAxios }}>
      {children}
    </AuthContext.Provider>
  );
};

// App Context for global state
const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

const AppProvider = ({ children }) => {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [mockDataEnabled, setMockDataEnabled] = useState(
    localStorage.getItem('mockDataEnabled') !== 'false'
  );
  const [preferences, setPreferences] = useState(null);
  const { authAxios, token } = useAuth();

  const fetchCompanies = async () => {
    try {
      const res = await authAxios.get('/companies');
      setCompanies(res.data);
      if (res.data.length > 0 && !selectedCompany) {
        setSelectedCompany(res.data[0]);
      }
    } catch (e) {
      console.error('Error fetching companies:', e);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await authAxios.get('/preferences');
      setPreferences(res.data);
    } catch (e) {
      console.error('Error fetching preferences:', e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchCompanies();
      fetchPreferences();
    }
  }, [token]);

  useEffect(() => {
    localStorage.setItem('mockDataEnabled', mockDataEnabled);
  }, [mockDataEnabled]);

  return (
    <AppContext.Provider value={{
      companies, setCompanies, fetchCompanies,
      selectedCompany, setSelectedCompany,
      mockDataEnabled, setMockDataEnabled,
      preferences, setPreferences, fetchPreferences
    }}>
      {children}
    </AppContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Landing Page
const LandingPage = () => {
  const { user } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
      {/* Header */}
      <header className="container mx-auto px-6 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="https://customer-assets.emergentagent.com/job_cfo-toolkit-1/artifacts/mr25aajy_Digitrans%20Global%20-%20Digitrans%20Global%20Logo.png" 
              alt="Digitrans Global" 
              className="h-32 w-auto"
            />
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" className="text-gray-700 hover:text-blue-600" onClick={() => setShowLogin(true)}>
              Sign In
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold" onClick={() => setShowSignup(true)}>
              Get Started
            </Button>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <h1 className="text-5xl md:text-6xl font-bold text-blue-600 font-display mb-4">
          Realtime Finance
        </h1>
        <h2 className="text-2xl md:text-3xl font-normal text-gray-700 mb-6">
          Your Enterprise Finance Command Centre
        </h2>
        <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-10">
          Stop being a "Data Janitor." Shift from backward-looking reporting to strategic architecture with the power of a real-time API engine.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-16">
          <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8" onClick={() => setShowSignup(true)}>
            Start Free Trial
          </Button>
          <Button size="lg" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100">
            Watch Demo
          </Button>
        </div>
      </section>

      {/* The Intelligence Hub Section */}
      <section className="container mx-auto px-6 py-12">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">The Intelligence Hub</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <FeatureCard
            icon={<Globe className="w-8 h-8" />}
            title="Multi-Entity Command"
            description="Consolidate 130+ global entities instantly with automated currency standardization and a unified 'True and Fair' view."
            color="blue"
          />
          <FeatureCard
            icon={<Target className="w-8 h-8" />}
            title='The "Define Your Ratio" Engine'
            description="Build bespoke KPIs and custom RAG (Red-Amber-Green) alerts that follow your rules, not industry averages."
            color="green"
          />
          <FeatureCard
            icon={<Bot className="w-8 h-8" />}
            title="AI-Powered Strategic Architect"
            description="Transition from manual data collection to predictive analytics and intelligent, real-time recommendations."
            color="blue"
          />
        </div>
      </section>

      {/* Enterprise Performance Metrics Section */}
      <section className="container mx-auto px-6 py-16 bg-gray-50 rounded-2xl my-8">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Enterprise Performance Metrics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          <MetricCard 
            value="130+" 
            label="ERP Integrations" 
            description="Secure API connection to NetSuite, Sage, and more—no consultants required."
            color="blue"
          />
          <MetricCard 
            value="7D" 
            label="Planning Dimensions" 
            description="Conduct sophisticated scenario modeling across multiple layers of your business."
            color="green"
          />
          <MetricCard 
            value="Real-time" 
            label="Dashboard Updates" 
            description='Eliminate the "Excel lag" with instantaneous synchronization of your global health.'
            color="blue"
          />
          <MetricCard 
            value="99.9%" 
            label="Uptime SLA" 
            description="Enterprise-grade reliability for mission-critical financial oversight."
            color="green"
          />
        </div>
      </section>

      {/* Complete Financial Control Section */}
      <section className="container mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Complete Financial Control</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          <MiniFeatureCard 
            icon={<Calculator />} 
            title="Dynamic FP&A Sandbox" 
            description="Stress-test non-uniform assumptions in a safe environment without corrupting your historical records." 
          />
          <MiniFeatureCard 
            icon={<Wallet />} 
            title="Strategic Capital & Covenants" 
            description='Monitor "Headroom" ratios in real-time to protect bank covenants and bridge cash gaps via integrated lenders.' 
          />
          <MiniFeatureCard 
            icon={<RefreshCcw />} 
            title="Auto-Reconciliation Engine" 
            description="Reclaim 80% of your time with automated transaction matching and live bank feed integration." 
          />
          <MiniFeatureCard 
            icon={<Shield />} 
            title="Audit-Ready Compliance" 
            description="Maintain absolute transparency for stakeholders with automated audit trails and regulatory-ready reporting." 
          />
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16 text-center">
        <div className="bg-blue-600 rounded-2xl py-12 px-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Transform Your Finance Operations?</h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">Join leading enterprises who have made the shift from data janitor to strategic architect.</p>
          <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100 font-semibold px-8" onClick={() => setShowSignup(true)}>
            Start Free Trial
          </Button>
        </div>
      </section>

      {/* Login Dialog */}
      <AuthDialog
        open={showLogin}
        onOpenChange={setShowLogin}
        mode="login"
        onSwitch={() => { setShowLogin(false); setShowSignup(true); }}
      />

      {/* Signup Dialog */}
      <AuthDialog
        open={showSignup}
        onOpenChange={setShowSignup}
        mode="signup"
        onSwitch={() => { setShowSignup(false); setShowLogin(true); }}
      />
    </div>
  );
};

const FeatureCard = ({ icon, title, description, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 hover:border-blue-300",
    green: "bg-green-50 text-green-600 hover:border-green-300"
  };
  return (
    <Card className={`bg-white border-gray-200 shadow-sm ${colorClasses[color]} transition-all`}>
      <CardHeader>
        <div className={`w-14 h-14 ${color === 'blue' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'} rounded-lg flex items-center justify-center mb-4`}>
          {icon}
        </div>
        <CardTitle className="text-gray-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600">{description}</p>
      </CardContent>
    </Card>
  );
};

const MetricCard = ({ value, label, description, color = "blue" }) => (
  <div className="text-center bg-white rounded-xl p-6 shadow-sm border border-gray-100">
    <div className={`text-4xl font-bold ${color === 'blue' ? 'text-blue-600' : 'text-green-600'} font-display mb-2`}>{value}</div>
    <div className="text-gray-900 font-semibold mb-2">{label}</div>
    <p className="text-gray-500 text-sm">{description}</p>
  </div>
);

const MiniFeatureCard = ({ icon, title, description }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all">
    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 mb-4">
      {icon}
    </div>
    <h3 className="text-gray-900 font-semibold mb-2">{title}</h3>
    <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
  </div>
);

const StatCard = ({ value, label, color = "blue" }) => (
  <div className="text-center">
    <div className={`text-4xl font-bold ${color === 'blue' ? 'text-blue-600' : 'text-green-600'} font-display`}>{value}</div>
    <div className="text-gray-600 mt-2">{label}</div>
  </div>
);

const AuthDialog = ({ open, onOpenChange, mode, onSwitch }) => {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created successfully!');
      onOpenChange(false);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_cfo-toolkit-1/artifacts/mr25aajy_Digitrans%20Global%20-%20Digitrans%20Global%20Logo.png" 
              alt="Digitrans Global" 
              className="h-14 w-auto"
            />
          </div>
          <DialogTitle className="text-gray-900 text-2xl font-display text-center">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-center">
            {mode === 'login' ? 'Sign in to Realtime Finance' : 'Get started with Realtime Finance'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <Label className="text-gray-700">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-50 border-gray-300 text-gray-900"
                placeholder="John Smith"
                required
              />
            </div>
          )}
          <div>
            <Label className="text-gray-700">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-50 border-gray-300 text-gray-900"
              placeholder="john@company.com"
              required
            />
          </div>
          <div>
            <Label className="text-gray-700">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-50 border-gray-300 text-gray-900"
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
        <div className="text-center text-gray-500">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          <button onClick={onSwitch} className="text-blue-600 hover:text-blue-700 ml-2">
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Dashboard Layout
const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const { companies, selectedCompany, setSelectedCompany, mockDataEnabled, setMockDataEnabled } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/dashboard', icon: Gauge, label: 'Command Centre', exact: true },
    { path: '/dashboard/financial-management', icon: Receipt, label: 'Financial Management' },
    { path: '/dashboard/fpa', icon: Calculator, label: 'FP&A' },
    { path: '/dashboard/strategic-capital', icon: Wallet, label: 'Strategic Capital' },
    { path: '/dashboard/entity-tree', icon: Building2, label: 'Entity Tree' },
    { path: '/dashboard/consolidation', icon: Layers, label: 'Consolidation' },
    { path: '/dashboard/coa-mapping', icon: Target, label: 'COA Mapping' },
    { path: '/dashboard/data-governance', icon: Shield, label: 'Data Governance' },
    { path: '/dashboard/ai-advisor', icon: Bot, label: 'AI Financial Advisor' },
    { path: '/dashboard/integrations', icon: Plug, label: 'Integrations' },
    { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Sidebar */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-800 border-r border-slate-700 transition-all duration-300 flex flex-col`}>
        {/* Logo */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center space-x-3">
            {sidebarOpen ? (
              <img 
                src="https://customer-assets.emergentagent.com/job_cfo-toolkit-1/artifacts/mr25aajy_Digitrans%20Global%20-%20Digitrans%20Global%20Logo.png" 
                alt="Digitrans Global" 
                className="h-10 w-auto"
              />
            ) : (
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Activity className="w-6 h-6 text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 py-4">
          <nav className="space-y-1 px-3">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive(item.path, item.exact)
                    ? 'bg-blue-500/20 text-blue-400'
                    : 'text-gray-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            ))}
          </nav>
        </ScrollArea>

        {/* Toggle Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-slate-700 text-gray-400 hover:text-white flex items-center justify-center"
        >
          <Menu className="w-5 h-5" />
        </button>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Mock Data Toggle */}
              <div className="flex items-center space-x-2 bg-slate-900 rounded-lg px-3 py-2">
                <span className="text-sm text-gray-400">Mock Data</span>
                <Switch
                  checked={mockDataEnabled}
                  onCheckedChange={setMockDataEnabled}
                  className="data-[state=checked]:bg-blue-500"
                />
              </div>

              {/* Entity Selector */}
              {companies.length > 0 && (
                <Select
                  value={selectedCompany?.id || ''}
                  onValueChange={(id) => setSelectedCompany(companies.find(c => c.id === id))}
                >
                  <SelectTrigger className="w-[200px] bg-slate-900 border-slate-600 text-white">
                    <SelectValue placeholder="Select entity" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id} className="text-white hover:bg-slate-700">
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 text-white">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">{user?.name?.charAt(0) || 'U'}</span>
                  </div>
                  <span className="hidden md:inline">{user?.name}</span>
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-slate-800 border-slate-600">
                <DropdownMenuItem className="text-gray-300">
                  <span>{user?.email}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-600" />
                <DropdownMenuItem onClick={() => navigate('/dashboard/settings')} className="text-gray-300 cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" /> Settings
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout} className="text-red-400 cursor-pointer">
                  <LogOut className="w-4 h-4 mr-2" /> Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

// Dashboard Home
const DashboardHome = () => {
  const { selectedCompany, mockDataEnabled } = useApp();
  const { authAxios } = useAuth();
  const { formatCurrency: formatCurrencyFn, getSymbol } = useCurrency();
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (selectedCompany) {
      fetchMetrics();
    } else {
      setLoading(false);
    }
  }, [selectedCompany]);

  const fetchMetrics = async () => {
    try {
      const res = await authAxios.get(`/dashboard/${selectedCompany.id}`);
      setMetrics(res.data);
    } catch (e) {
      console.error('Error fetching metrics:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!selectedCompany) {
    return <NoEntitySelected />;
  }

  if (loading) {
    return <LoadingState />;
  }

  const displayMetrics = mockDataEnabled || (metrics && metrics.transaction_count > 0);
  const m = displayMetrics ? (metrics || getMockMetrics()) : null;
  const currency = selectedCompany?.currency || 'GBP';
  const currencySymbol = getSymbol(currency);

  // Local formatCurrency helper using context
  const formatCurrencyValue = (amount) => formatCurrencyFn(amount, currency);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white font-display">Executive Dashboard</h1>
        <p className="text-gray-400 mt-1">{selectedCompany.name} • {currencySymbol} {selectedCompany.currency}</p>
      </div>

      {!displayMetrics ? (
        <EmptyDashboard onGenerateData={() => {}} />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Revenue"
              value={formatCurrencyValue(m?.revenue || 0)}
              trend={m?.revenue_growth || 0}
              icon={<DollarSign className="w-5 h-5" />}
            />
            <KPICard
              title="EBITDA"
              value={formatCurrencyValue(m?.ebitda || 0)}
              subtitle={`${m?.ebitda_margin || 0}% margin`}
              icon={<TrendingUp className="w-5 h-5" />}
            />
            <KPICard
              title="Cash Balance"
              value={formatCurrencyValue(m?.cash_balance || 0)}
              icon={<Wallet className="w-5 h-5" />}
            />
            <KPICard
              title="Runway"
              value={`${m?.runway_days || 0} days`}
              subtitle={`Burn: ${formatCurrencyValue(m?.burn_rate || 0)}/mo`}
              icon={<Clock className="w-5 h-5" />}
              warning={m?.runway_days < 90}
            />
          </div>

          {/* Reconciliation Status & AR Aging */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Reconciliation Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  <StatusBox label="Matched" value={m?.matched_count || 0} color="green" />
                  <StatusBox label="Pending" value={m?.pending_count || 0} color="yellow" />
                  <StatusBox label="Unmatched" value={m?.unmatched_count || 0} color="red" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">AR Aging Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <AgingRow label="Current" value={m?.ar_current || 0} formatCurrency={formatCurrencyValue} />
                  <AgingRow label="30 Days" value={m?.ar_30_days || 0} formatCurrency={formatCurrencyValue} />
                  <AgingRow label="60 Days" value={m?.ar_60_days || 0} formatCurrency={formatCurrencyValue} />
                  <AgingRow label="90+ Days" value={m?.ar_90_plus_days || 0} formatCurrency={formatCurrencyValue} warning />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Cost Centers */}
          {m?.cost_centers?.length > 0 && (
            <Card className="bg-slate-800 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Top Cost Centers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {m.cost_centers.map((cc, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-gray-300">{cc.name}</span>
                      <span className="text-white font-semibold">{formatCurrencyValue(cc.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

// Helper Components
const KPICard = ({ title, value, subtitle, trend, icon, warning }) => (
  <Card className={`bg-slate-800 border-slate-700 ${warning ? 'border-yellow-500/50' : ''}`}>
    <CardContent className="pt-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center mt-2 ${trend >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span className="text-sm">{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
        <div className="p-3 bg-blue-500/10 rounded-lg text-blue-400">
          {icon}
        </div>
      </div>
    </CardContent>
  </Card>
);

const StatusBox = ({ label, value, color }) => {
  const colors = {
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30'
  };
  return (
    <div className={`p-4 rounded-lg border ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm opacity-80">{label}</div>
    </div>
  );
};

const AgingRow = ({ label, value, formatCurrency, warning }) => (
  <div className="flex items-center justify-between">
    <span className="text-gray-400">{label}</span>
    <span className={`font-semibold ${warning ? 'text-red-400' : 'text-white'}`}>
      {formatCurrency ? formatCurrency(value) : value}
    </span>
  </div>
);

const NoEntitySelected = () => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center">
    <Building2 className="w-16 h-16 text-gray-600 mb-4" />
    <h2 className="text-xl font-semibold text-white mb-2">No Entity Selected</h2>
    <p className="text-gray-400 mb-4">Create a company to get started</p>
    <Link to="/dashboard/settings">
      <Button className="bg-blue-600 hover:bg-blue-700 text-white">
        <Plus className="w-4 h-4 mr-2" /> Add Entity
      </Button>
    </Link>
  </div>
);

const LoadingState = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

const EmptyDashboard = ({ onGenerateData }) => (
  <Card className="bg-slate-800 border-slate-700">
    <CardContent className="py-16 text-center">
      <BarChart3 className="w-16 h-16 text-gray-600 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-white mb-2">No Data Available</h3>
      <p className="text-gray-400 mb-4">Enable Mock Data or generate demo data to see metrics</p>
    </CardContent>
  </Card>
);

const PageLoader = () => (
  <div className="flex items-center justify-center h-[60vh]">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Format Currency
const formatCurrency = (amount, currency = 'GBP') => {
  const symbols = { GBP: '£', USD: '$', EUR: '€' };
  const symbol = symbols[currency] || '£';
  return `${symbol}${Math.abs(amount).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Mock Metrics
const getMockMetrics = () => ({
  revenue: 1250000,
  ebitda: 312500,
  ebitda_margin: 25,
  cash_balance: 485000,
  runway_days: 145,
  burn_rate: 95000,
  quick_ratio: 1.8,
  revenue_growth: 18.5,
  ar_current: 125000,
  ar_30_days: 85000,
  ar_60_days: 42000,
  ar_90_plus_days: 28000,
  matched_count: 156,
  pending_count: 34,
  unmatched_count: 12,
  transaction_count: 202,
  cost_centers: [
    { name: 'Operations', amount: 180000 },
    { name: 'Marketing', amount: 125000 },
    { name: 'Technology', amount: 98000 },
    { name: 'Administration', amount: 67000 },
    { name: 'Sales', amount: 54000 }
  ]
});

// Placeholder Pages (will be implemented)
const CFOCommandCenter = React.lazy(() => import('./pages/CFOCommandCenter'));
const FinancialManagement = React.lazy(() => import('./pages/FinancialManagement'));
const FPAModule = React.lazy(() => import('./pages/FPAModule'));
const StrategicCapital = React.lazy(() => import('./pages/StrategicCapital'));
const ConsolidationPage = React.lazy(() => import('./pages/ConsolidationPage'));
const AIAdvisorPage = React.lazy(() => import('./pages/AIAdvisorPage'));
const IntegrationsPage = React.lazy(() => import('./pages/IntegrationsPage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const EntityKPIsPage = React.lazy(() => import('./pages/EntityKPIsPage'));
const EntityTreeManager = React.lazy(() => import('./pages/EntityTreeManager'));
const COAMappingPage = React.lazy(() => import('./pages/COAMappingPage'));
const DataGovernancePage = React.lazy(() => import('./pages/DataGovernancePage'));
const AgentHubPage = React.lazy(() => import('./pages/AgentHubPage'));

// Main App
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CurrencyProvider>
          <ReportingHorizonProvider>
            <AppProvider>
              <Toaster position="top-right" richColors />
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/dashboard" element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }>
                  <Route index element={
                    <React.Suspense fallback={<PageLoader />}>
                      <CFOCommandCenter />
                    </React.Suspense>
                  } />
                <Route path="financial-management" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <FinancialManagement />
                  </React.Suspense>
                } />
                <Route path="fpa/*" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <FPAModule />
                  </React.Suspense>
                } />
                <Route path="strategic-capital" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <StrategicCapital />
                  </React.Suspense>
                } />
                <Route path="consolidation" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ConsolidationPage />
                  </React.Suspense>
                } />
                <Route path="entity-tree" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <EntityTreeManager />
                  </React.Suspense>
                } />
                <Route path="coa-mapping" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <COAMappingPage />
                  </React.Suspense>
                } />
                <Route path="data-governance" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <DataGovernancePage />
                  </React.Suspense>
                } />
                <Route path="entity-kpis" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <EntityKPIsPage />
                  </React.Suspense>
                } />
                <Route path="ai-advisor" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <AIAdvisorPage />
                  </React.Suspense>
                } />
                <Route path="integrations" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <IntegrationsPage />
                  </React.Suspense>
                } />
                <Route path="settings" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <SettingsPage />
                  </React.Suspense>
                } />
              </Route>
            </Routes>
          </AppProvider>
        </ReportingHorizonProvider>
        </CurrencyProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
