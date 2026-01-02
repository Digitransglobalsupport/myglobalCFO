import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CurrencySelector from '@/components/CurrencySelector';

// Create Currency Context for FPA module
export const FPACurrencyContext = createContext({
  currency: 'GBP',
  setCurrency: () => {}
});

const FPALayout = ({ user, onLogout }) => {
  const navigate = useNavigate();
  
  // Currency state - persisted in localStorage
  const [currency, setCurrency] = useState(() => {
    const stored = localStorage.getItem('fpa_currency');
    // Migrate old USD default to new GBP default for UK market
    if (stored === 'USD') {
      localStorage.setItem('fpa_currency', 'GBP');
      return 'GBP';
    }
    return stored || 'GBP';
  });
  
  useEffect(() => {
    localStorage.setItem('fpa_currency', currency);
  }, [currency]);

  return (
    <FPACurrencyContext.Provider value={{ currency, setCurrency }}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => navigate('/dashboard/transactions')}
                className="hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Main Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Real-Time CFO</h1>
                <p className="text-sm text-slate-600">Strategic planning and driver-based modeling</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <CurrencySelector 
                value={currency}
                onChange={setCurrency}
                label={null}
                className="w-48"
              />
              <span className="text-sm text-slate-600">{user?.email || user?.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 py-2">
            <NavLink 
              to="/dashboard/fpa/overview" 
              className={({ isActive }) => 
                `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              📊 Overview
            </NavLink>
            <NavLink 
              to="/dashboard/fpa/planning" 
              className={({ isActive }) => 
                `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              📈 Planning
            </NavLink>
            <NavLink 
              to="/dashboard/fpa/drivers" 
              className={({ isActive }) => 
                `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              🧮 Drivers
            </NavLink>
            <NavLink 
              to="/dashboard/fpa/setup-integrations" 
              className={({ isActive }) => 
                `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              🔗 Setup Integrations
            </NavLink>
            <NavLink 
              to="/dashboard/fpa/scenario-planning" 
              className={({ isActive }) => 
                `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              🎯 Scenarios
            </NavLink>
            <NavLink 
              to="/dashboard/fpa/rolling-forecast" 
              className={({ isActive }) => 
                `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              🔄 Rolling Forecast
            </NavLink>
            <NavLink 
              to="/dashboard/fpa/user-permissions" 
              className={({ isActive }) => 
                `px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              🛡️ Permissions
            </NavLink>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet context={{ user }} />
      </div>
    </div>
    </FPACurrencyContext.Provider>
  );
};

export default FPALayout;
