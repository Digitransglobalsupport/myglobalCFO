import { useState, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import LandingPage from "./pages/LandingPage";
import DashboardLayout from "./pages/DashboardLayout";
import ResetPassword from "./pages/ResetPassword";
import AIAdvisor from "./pages/AIAdvisor";
import FPADashboard from "./pages/FPADashboard";
import FPAPlanning from "./pages/FPAPlanning";
import FPADrivers from "./pages/FPADrivers";
import FPAIntegrations from "./pages/FPAIntegrations";
import FPAAdmin from "./pages/FPAAdmin";
import TransactionsPage from "./pages/dashboard/TransactionsPage";
import ReconciliationPage from "./pages/dashboard/ReconciliationPage";
import EntityKPIsPage from "./pages/dashboard/EntityKPIsPage";
import ReportsPage from "./pages/dashboard/ReportsPage";
import IntegrationsPage from "./pages/dashboard/IntegrationsPage";
import FinanceSourcingPage from "./pages/dashboard/FinanceSourcingPage";
import AIAdvisorPage from "./pages/dashboard/AIAdvisorPage";
import SettingsPage from "./pages/dashboard/SettingsPage";
import FPALayout from "./pages/fpa/FPALayout";
import FPAOverviewPage from "./pages/fpa/FPAOverviewPage";
import FPAPlanningPage from "./pages/fpa/FPAPlanningPage";
import FPADriversPage from "./pages/fpa/FPADriversPage";
import FPAIntegrationsPage from "./pages/fpa/FPAIntegrationsPage";
import FPAUserPermissionsPage from "./pages/fpa/FPAUserPermissionsPage";
import FPAScenarioPlanning from "./pages/fpa/FPAScenarioPlanning";
import FPARollingForecast from "./pages/fpa/FPARollingForecast";
import FPADimensionsPage from "./pages/fpa/FPADimensionsPage";
import FPAAssetScenario from "./pages/fpa/FPAAssetScenario";
import CFOCommandCenter from "./pages/fpa/CFOCommandCenter";

// Import Longtail Logger
import longtailLogger, { setupAxiosLogging, trackPerformance } from "./utils/longtailLogger";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Setup Longtail Logging for Axios
setupAxiosLogging(axios);

// Log application start
longtailLogger.logInfo('APP_START', 'MyGlobalCFO application initializing', {
  backendUrl: BACKEND_URL,
  environment: process.env.NODE_ENV
});

// Axios interceptor for auth
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('cfo_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cfo_token');
    const userData = localStorage.getItem('cfo_user');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const handleAuth = (token, userData) => {
    localStorage.setItem('cfo_token', token);
    localStorage.setItem('cfo_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('cfo_token');
    localStorage.removeItem('cfo_user');
    setUser(null);
  };

  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }

  // Use basename only in production builds
  const basename = process.env.PUBLIC_URL || '';

  return (
    <div className="App">
      <Toaster position="top-right" />
      <BrowserRouter basename={basename}>
        <Routes>
          <Route 
            path="/" 
            element={user ? <Navigate to="/dashboard/transactions" /> : <LandingPage onAuth={handleAuth} />} 
          />
          <Route 
            path="/reset-password" 
            element={<ResetPassword />} 
          />
          
          {/* Dashboard with nested routes */}
          <Route 
            path="/dashboard" 
            element={user ? <DashboardLayout user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
          >
            <Route index element={<Navigate to="/dashboard/transactions" replace />} />
            <Route path="command-center" element={<CFOCommandCenter />} />
            <Route path="transactions" element={<TransactionsPage />} />
            <Route path="reconciliation" element={<ReconciliationPage />} />
            <Route path="entity-kpis" element={<EntityKPIsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="integrations" element={<IntegrationsPage />} />
            <Route path="finance-sourcing" element={<FinanceSourcingPage />} />
            <Route path="ai-advisor" element={<AIAdvisorPage />} />
            <Route path="settings" element={<SettingsPage />} />
            
            {/* FP&A nested routes */}
            <Route 
              path="fpa" 
              element={<FPALayout user={user} onLogout={handleLogout} />}
            >
              <Route index element={<Navigate to="/dashboard/fpa/overview" replace />} />
              <Route path="overview" element={<FPAOverviewPage />} />
              <Route path="planning" element={<FPAPlanningPage />} />
              <Route path="drivers" element={<FPADriversPage />} />
              <Route path="dimensions" element={<FPADimensionsPage />} />
              <Route path="setup-integrations" element={<FPAIntegrationsPage />} />
              <Route path="user-permissions" element={<FPAUserPermissionsPage />} />
              <Route path="scenario-planning" element={<FPAScenarioPlanning />} />
              <Route path="asset-scenarios" element={<FPAAssetScenario />} />
              <Route path="rolling-forecast" element={<FPARollingForecast />} />
            </Route>
          </Route>

          {/* Standalone routes for iframe content */}
          <Route 
            path="/ai-advisor" 
            element={user ? <AIAdvisor user={user} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/fpa-dashboard" 
            element={user ? <FPADashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/fpa-planning" 
            element={user ? <FPAPlanning user={user} onLogout={handleLogout} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/fpa-drivers" 
            element={user ? <FPADrivers user={user} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/fpa-integrations" 
            element={user ? <FPAIntegrations user={user} /> : <Navigate to="/" />} 
          />
          <Route 
            path="/fpa-admin" 
            element={user ? <FPAAdmin user={user} /> : <Navigate to="/" />} 
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;