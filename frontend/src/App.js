import React, { useState, useEffect, createContext, useContext, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation, Outlet, Link } from 'react-router-dom';
import axios from 'axios';
import '@/App.css';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { CurrencyProvider, useCurrency } from './context/CurrencyContext';
import { ReportingHorizonProvider } from './context/ReportingHorizonContext';
import { FeatureProvider, useFeatures } from './context/FeatureContext';
import { OnboardingProgressBar, OnboardingSpotlight, OnboardingCelebration, useOnboarding, ONBOARDING_STEPS } from './components/CFOLaunchpad';

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

// ScrollToTop Component - Scrolls to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  
  return null;
};

// Re-export useCurrency for convenience
export { useCurrency } from './context/CurrencyContext';

// Error Boundary - Catches JavaScript errors and shows fallback UI
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="w-16 h-16 bg-[#005994]/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-[#005994]" />
            </div>
            <h1 className="text-2xl font-bold text-[#005994] mb-4">Something went wrong</h1>
            <p className="text-[#969696] mb-6">
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            <Button 
              onClick={() => {
                // Clear any stale data
                localStorage.removeItem('token');
                window.location.href = '/';
              }}
              className="bg-[#005994] hover:bg-[#004270] text-white"
            >
              Go to Homepage
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
      // Safely handle response - ensure it's an array
      const companiesData = Array.isArray(res?.data) ? res.data : [];
      setCompanies(companiesData);
      if (companiesData.length > 0 && !selectedCompany) {
        setSelectedCompany(companiesData[0]);
      }
    } catch (e) {
      console.error('Error fetching companies:', e);
      setCompanies([]);
    }
  };

  const fetchPreferences = async () => {
    try {
      const res = await authAxios.get('/preferences');
      setPreferences(res?.data || null);
    } catch (e) {
      console.error('Error fetching preferences:', e);
      setPreferences(null);
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
  const { user, loading, token } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // If there's a token but no user, the token is invalid - redirect to home
  if (!user) {
    // Clear any stale token
    if (token) {
      localStorage.removeItem('token');
    }
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Admin Protected Route - RBAC enforcement
const AdminRoute = ({ children }) => {
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
  
  if (user.role !== 'admin') {
    return <Navigate to="/forbidden" replace />;
  }
  
  return children;
};


// Old LandingPage component removed - now using corporate/HomePage.js

// Dashboard Layout
const DashboardLayout = () => {
  const { user, logout, authAxios } = useAuth();
  const { companies, selectedCompany, setSelectedCompany, mockDataEnabled, setMockDataEnabled, fetchCompanies } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Onboarding state
  const [onboardingProgress, setOnboardingProgress] = useState(null);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentOnboardingStep, setCurrentOnboardingStep] = useState(null);
  const [onboardingInitialized, setOnboardingInitialized] = useState(false);

  // Fetch onboarding progress
  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await authAxios.get('/onboarding/progress');
        setOnboardingProgress(res.data);
        
        // Auto-start tour for new users (only once)
        if (!onboardingInitialized && res.data && !res.data.dismissed && !res.data.completed_at && res.data.steps_completed?.length === 0) {
          setOnboardingInitialized(true);
          setTimeout(() => {
            const step = ONBOARDING_STEPS[0];
            setCurrentOnboardingStep(step);
            setShowSpotlight(true);
          }, 1500);
        }
      } catch (e) {
        console.error('Error fetching onboarding progress:', e);
      }
    };
    fetchProgress();
  }, [authAxios, onboardingInitialized]);

  // Auto-detect step completion
  useEffect(() => {
    if (!onboardingProgress || onboardingProgress.dismissed) return;
    
    const checkSteps = async () => {
      // Step 1: Company created
      if (companies.length > 0 && !onboardingProgress.steps_completed?.includes(1)) {
        try {
          await authAxios.put('/onboarding/step', { step: 1, completed: true });
          const res = await authAxios.get('/onboarding/progress');
          setOnboardingProgress(res.data);
          
          // Show next step
          if (!res.data.dismissed && res.data.steps_completed?.length < 3) {
            const nextStep = ONBOARDING_STEPS.find(s => !res.data.steps_completed?.includes(s.id));
            if (nextStep) {
              setTimeout(() => {
                setCurrentOnboardingStep(nextStep);
                setShowSpotlight(true);
              }, 500);
            }
          }
        } catch (e) {
          console.error('Error updating step:', e);
        }
      }
    };
    checkSteps();
  }, [companies, onboardingProgress, authAxios]);

  const handleDismissOnboarding = async () => {
    try {
      await authAxios.put('/onboarding/dismiss');
      setShowSpotlight(false);
      setOnboardingProgress(prev => ({ ...prev, dismissed: true }));
    } catch (e) {
      console.error('Error dismissing onboarding:', e);
    }
  };

  const handleOnboardingStepClick = (step) => {
    setCurrentOnboardingStep(step);
    setShowSpotlight(false);
    navigate(step.ctaPath);
  };

  const handleSpotlightNext = () => {
    setShowSpotlight(false);
  };

  const handleCelebrationComplete = () => {
    setShowCelebration(false);
    navigate('/dashboard');
  };

  const navItems = [
    { path: '/dashboard', icon: Gauge, label: 'Command Centre', exact: true },
    { path: '/dashboard/financial-management', icon: Receipt, label: 'Financial Management' },
    { path: '/dashboard/fpa', icon: Calculator, label: 'FP&A' },
    { path: '/dashboard/strategic-capital', icon: Wallet, label: 'Strategic Capital' },
    { path: '/dashboard/entity-tree', icon: Building2, label: 'Entity Tree' },
    { path: '/dashboard/consolidation', icon: Layers, label: 'Consolidation' },
    { path: '/dashboard/coa-mapping', icon: Target, label: 'COA Mapping' },
    { path: '/dashboard/data-governance', icon: Shield, label: 'Data Governance' },
    { path: '/dashboard/agent-hub', icon: Bot, label: 'Agent Hub' },
    { path: '/dashboard/integrations', icon: Plug, label: 'Integrations' },
    { path: '/dashboard/settings', icon: Settings, label: 'Settings' },
  ];

  // Admin nav item - only shown to admins
  const adminNavItem = { path: '/admin', icon: Shield, label: 'Admin Panel', adminOnly: true };

  const isActive = (path, exact) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Onboarding Progress Bar */}
      {onboardingProgress && !onboardingProgress.dismissed && !onboardingProgress.completed_at && (
        <OnboardingProgressBar 
          onStepClick={handleOnboardingStepClick}
        />
      )}
      
      <div className="flex-1 flex">
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
            
            {/* Admin Panel Link - Only visible to admins */}
            {user?.role === 'admin' && (
              <>
                <div className="my-3 border-t border-slate-700" />
                <Link
                  to={adminNavItem.path}
                  className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive(adminNavItem.path, false)
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'text-purple-400 hover:bg-slate-700 hover:text-purple-300'
                  }`}
                  data-testid="admin-panel-link"
                >
                  <adminNavItem.icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span>{adminNavItem.label}</span>}
                </Link>
              </>
            )}
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
      
      {/* Onboarding Spotlight Tooltip */}
      {showSpotlight && currentOnboardingStep && (
        <OnboardingSpotlight
          step={currentOnboardingStep}
          onNext={handleSpotlightNext}
          onDismiss={handleDismissOnboarding}
          userName={user?.name?.split(' ')[0]}
        />
      )}
      
      {/* Onboarding Celebration Modal */}
      {showCelebration && (
        <OnboardingCelebration onComplete={handleCelebrationComplete} />
      )}
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

// Corporate Pages (Lazy Loaded)
const HomePage = React.lazy(() => import('./pages/corporate/HomePage'));
const DigitalTransformationPage = React.lazy(() => import('./pages/corporate/DigitalTransformationPage'));
const ProgrammeGovernancePage = React.lazy(() => import('./pages/corporate/ProgrammeGovernancePage'));
const ProcessAlignmentPage = React.lazy(() => import('./pages/corporate/ProcessAlignmentPage'));
const RealtimeFinancePage = React.lazy(() => import('./pages/corporate/RealtimeFinancePage'));
const IndustriesPage = React.lazy(() => import('./pages/corporate/IndustriesPage'));
const CompanyPage = React.lazy(() => import('./pages/corporate/CompanyPage'));
const ContactPage = React.lazy(() => import('./pages/corporate/ContactPage'));

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
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const ForbiddenPage = React.lazy(() => import('./pages/ForbiddenPage'));

// Inline Maintenance Page (for when landing is hidden)
const MaintenancePageInline = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6" data-testid="maintenance-page-inline">
    <div className="text-center max-w-lg">
      <div className="w-24 h-24 bg-amber-500/10 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
        <AlertCircle className="w-12 h-12 text-amber-400" />
      </div>
      <h1 className="text-3xl font-bold text-white mb-4">System Under Maintenance</h1>
      <p className="text-gray-400 mb-6 leading-relaxed">
        We're currently performing scheduled maintenance to improve your experience. 
        Please check back shortly.
      </p>
      <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6 mb-8">
        <div className="flex items-center justify-center gap-2 text-gray-300 mb-3">
          <Clock className="w-5 h-5 text-blue-400" />
          <span className="font-medium">Expected Duration</span>
        </div>
        <p className="text-gray-400 text-sm">
          We'll be back online as soon as possible. Thank you for your patience.
        </p>
      </div>
      <div className="flex items-center justify-center">
        <img 
          src="https://customer-assets.emergentagent.com/job_cfo-toolkit-1/artifacts/mr25aajy_Digitrans%20Global%20-%20Digitrans%20Global%20Logo.png" 
          alt="Digitrans Global" 
          className="h-12 w-auto opacity-50"
        />
      </div>
    </div>
  </div>
);

// Main App
function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <ScrollToTop />
        <AuthProvider>
          <CurrencyProvider>
            <ReportingHorizonProvider>
              <AppProvider>
                <Toaster position="top-right" richColors />
                <Routes>
                  {/* Corporate Website Pages - SEO-Friendly Long Tail Routes */}
                
                {/* Homepage */}
                <Route path="/" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <HomePage />
                  </React.Suspense>
                } />
                
                {/* Consulting Services - Primary SEO Routes */}
                <Route path="/consulting/unified-digital-transformation-services" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <DigitalTransformationPage />
                  </React.Suspense>
                } />
                <Route path="/consulting/integrated-programme-governance-solutions" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ProgrammeGovernancePage />
                  </React.Suspense>
                } />
                <Route path="/consulting/business-process-alignment-standardisation" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ProcessAlignmentPage />
                  </React.Suspense>
                } />
                
                {/* Platform/Products - Primary SEO Routes */}
                <Route path="/platform/realtime-finance-cfo-automation" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <RealtimeFinancePage />
                  </React.Suspense>
                } />
                
                {/* Company Pages - Primary SEO Routes */}
                <Route path="/industries-we-serve" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <IndustriesPage />
                  </React.Suspense>
                } />
                <Route path="/about-digitrans-global" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <CompanyPage />
                  </React.Suspense>
                } />
                <Route path="/get-in-touch" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ContactPage />
                  </React.Suspense>
                } />
                
                {/* Legacy/Short Routes - Backwards Compatibility */}
                <Route path="/solutions/digital-transformation" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <DigitalTransformationPage />
                  </React.Suspense>
                } />
                <Route path="/services/digital-transformation" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <DigitalTransformationPage />
                  </React.Suspense>
                } />
                <Route path="/solutions/programme-governance" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ProgrammeGovernancePage />
                  </React.Suspense>
                } />
                <Route path="/services/programme-governance" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ProgrammeGovernancePage />
                  </React.Suspense>
                } />
                <Route path="/services/process-alignment" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ProcessAlignmentPage />
                  </React.Suspense>
                } />
                <Route path="/solutions/realtime-finance" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <RealtimeFinancePage />
                  </React.Suspense>
                } />
                <Route path="/products/realtime-finance" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <RealtimeFinancePage />
                  </React.Suspense>
                } />
                <Route path="/industries" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <IndustriesPage />
                  </React.Suspense>
                } />
                <Route path="/company" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <CompanyPage />
                  </React.Suspense>
                } />
                <Route path="/contact" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ContactPage />
                  </React.Suspense>
                } />
                
                {/* Admin Panel - RBAC Protected */}
                <Route path="/admin" element={
                  <AdminRoute>
                    <React.Suspense fallback={<PageLoader />}>
                      <AdminPanel />
                    </React.Suspense>
                  </AdminRoute>
                } />
                
                {/* 403 Forbidden Page */}
                <Route path="/forbidden" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <ForbiddenPage />
                  </React.Suspense>
                } />
                
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
                <Route path="agent-hub" element={
                  <React.Suspense fallback={<PageLoader />}>
                    <AgentHubPage />
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
              
              {/* Catch-all route - redirect unknown paths to homepage */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppProvider>
        </ReportingHorizonProvider>
        </CurrencyProvider>
      </AuthProvider>
    </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
