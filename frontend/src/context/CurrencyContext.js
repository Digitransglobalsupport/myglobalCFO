import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || '';
const API = BACKEND_URL ? `${BACKEND_URL}/api` : '/api';

// Currency Context
const CurrencyContext = createContext(null);

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

// Default currency symbols fallback
const DEFAULT_SYMBOLS = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  JPY: '¥',
  CNY: '¥',
  INR: '₹',
  AUD: 'A$',
  CAD: 'C$',
  CHF: 'CHF'
};

export const CurrencyProvider = ({ children }) => {
  const [currencies, setCurrencies] = useState([]);
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [currencyMap, setCurrencyMap] = useState(DEFAULT_SYMBOLS);
  const [loading, setLoading] = useState(true);

  // Fetch all reference data on mount
  useEffect(() => {
    fetchReferenceData();
  }, []);

  const fetchReferenceData = async () => {
    try {
      setLoading(true);
      const [currenciesRes, countriesRes, regionsRes] = await Promise.all([
        axios.get(`${API}/reference/currencies`),
        axios.get(`${API}/reference/countries`),
        axios.get(`${API}/reference/regions`)
      ]);

      // Safely set data with array validation
      const currenciesData = Array.isArray(currenciesRes?.data) ? currenciesRes.data : [];
      const countriesData = Array.isArray(countriesRes?.data) ? countriesRes.data : [];
      const regionsData = Array.isArray(regionsRes?.data) ? regionsRes.data : [];

      setCurrencies(currenciesData);
      setCountries(countriesData);
      setRegions(regionsData);

      // Build currency symbol map
      const symbolMap = {};
      currenciesData.forEach(c => {
        if (c?.code && c?.symbol) {
          symbolMap[c.code] = c.symbol;
        }
      });
      setCurrencyMap({ ...DEFAULT_SYMBOLS, ...symbolMap });

    } catch (error) {
      console.error('Error fetching reference data:', error);
      // Use defaults on error
      setCurrencies([]);
      setCountries([]);
      setRegions([]);
      setCurrencyMap(DEFAULT_SYMBOLS);
    } finally {
      setLoading(false);
    }
  };

  // Get currency symbol by code
  const getSymbol = useCallback((currencyCode) => {
    if (!currencyCode) return '£';
    return currencyMap[currencyCode.toUpperCase()] || currencyCode;
  }, [currencyMap]);

  // Get currency details by code
  const getCurrency = useCallback((currencyCode) => {
    if (!currencyCode) return null;
    return currencies.find(c => c.code === currencyCode.toUpperCase());
  }, [currencies]);

  // Format currency value with symbol
  const formatCurrency = useCallback((amount, currencyCode = 'GBP', options = {}) => {
    const symbol = getSymbol(currencyCode);
    const absAmount = Math.abs(amount || 0);
    const currency = getCurrency(currencyCode);
    const decimalPlaces = currency?.decimal_places ?? 2;
    
    const {
      showDecimals = decimalPlaces > 0,
      compact = false,
      showSign = false
    } = options;

    let formattedValue;
    
    if (compact && absAmount >= 1000000) {
      formattedValue = `${(absAmount / 1000000).toFixed(1)}M`;
    } else if (compact && absAmount >= 1000) {
      formattedValue = `${(absAmount / 1000).toFixed(1)}K`;
    } else {
      formattedValue = absAmount.toLocaleString('en-GB', {
        minimumFractionDigits: showDecimals ? Math.min(decimalPlaces, 2) : 0,
        maximumFractionDigits: showDecimals ? Math.min(decimalPlaces, 2) : 0
      });
    }

    const sign = showSign && amount < 0 ? '-' : '';
    return `${sign}${symbol}${formattedValue}`;
  }, [getSymbol, getCurrency]);

  // Get default currency for a country
  const getCountryDefaultCurrency = useCallback((countryName) => {
    const country = countries.find(c => 
      c.country.toLowerCase() === countryName?.toLowerCase() ||
      c.code === countryName?.toUpperCase()
    );
    return country?.default_currency || 'GBP';
  }, [countries]);

  // Get region for a country
  const getCountryRegion = useCallback((countryName) => {
    const country = countries.find(c => 
      c.country.toLowerCase() === countryName?.toLowerCase() ||
      c.code === countryName?.toUpperCase()
    );
    return country?.region || 'EMEA';
  }, [countries]);

  // Search currencies (for autocomplete)
  const searchCurrencies = useCallback((query) => {
    if (!query) return currencies.slice(0, 20);
    const q = query.toLowerCase();
    return currencies.filter(c => 
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [currencies]);

  // Search countries (for autocomplete)
  const searchCountries = useCallback((query) => {
    if (!query) return countries.slice(0, 20);
    const q = query.toLowerCase();
    return countries.filter(c => 
      c.country.toLowerCase().includes(q) ||
      c.code.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [countries]);

  return (
    <CurrencyContext.Provider value={{
      currencies,
      countries,
      regions,
      currencyMap,
      loading,
      getSymbol,
      getCurrency,
      formatCurrency,
      getCountryDefaultCurrency,
      getCountryRegion,
      searchCurrencies,
      searchCountries,
      refetch: fetchReferenceData
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export default CurrencyContext;
