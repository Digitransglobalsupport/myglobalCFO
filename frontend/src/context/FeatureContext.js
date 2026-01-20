import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

const FeatureContext = createContext(null);

export const useFeatures = () => {
  const context = useContext(FeatureContext);
  if (!context) {
    throw new Error('useFeatures must be used within a FeatureProvider');
  }
  return context;
};

export const FeatureProvider = ({ children, token }) => {
  const [features, setFeatures] = useState({
    enable_fetch_bridge: false,
    enable_predictive_mapping: false,
    enable_variance_resolver: false,
    enable_strategic_capital: false,
    enable_data_room: false
  });
  const [publicConfig, setPublicConfig] = useState({
    site_landing_visible: true,
    site_login_allowed: true
  });
  const [loading, setLoading] = useState(true);

  // Fetch public config (no auth required)
  useEffect(() => {
    const fetchPublicConfig = async () => {
      try {
        const res = await axios.get(`${API}/system/config/public`);
        setPublicConfig(res.data);
      } catch (err) {
        console.error('Error fetching public config:', err);
      }
    };
    fetchPublicConfig();
  }, []);

  // Fetch feature flags (requires auth)
  useEffect(() => {
    const fetchFeatures = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await axios.get(`${API}/system/features`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFeatures(res.data);
      } catch (err) {
        console.error('Error fetching features:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeatures();
  }, [token]);

  const isFeatureEnabled = (featureKey) => {
    return features[featureKey] || false;
  };

  const refreshFeatures = async () => {
    if (!token) return;
    
    try {
      const res = await axios.get(`${API}/system/features`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeatures(res.data);
    } catch (err) {
      console.error('Error refreshing features:', err);
    }
  };

  return (
    <FeatureContext.Provider value={{
      features,
      publicConfig,
      loading,
      isFeatureEnabled,
      refreshFeatures,
      isLandingVisible: publicConfig.site_landing_visible,
      isLoginAllowed: publicConfig.site_login_allowed
    }}>
      {children}
    </FeatureContext.Provider>
  );
};

export default FeatureContext;
