/**
 * Currency Formatting Utilities
 * Provides consistent currency formatting across the Command Centre
 */

/**
 * Get currency symbol from currency code
 */
export const getCurrencySymbol = (currencyCode) => {
  const symbols = {
    'USD': '$',
    'GBP': '£',
    'EUR': '€',
    'JPY': '¥',
    'CNY': '¥',
    'INR': '₹',
    'AUD': 'A$',
    'CAD': 'C$',
    'CHF': 'CHF',
    'SGD': 'S$',
    'HKD': 'HK$',
    'NZD': 'NZ$',
    'KRW': '₩',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'THB': '฿',
    'MYR': 'RM',
    'ZAR': 'R'
  };
  
  return symbols[currencyCode] || currencyCode || '$';
};

/**
 * Format amount with currency symbol
 * @param {number} amount - The amount to format
 * @param {string} currency - Currency code (e.g., 'USD', 'GBP', 'EUR')
 * @param {object} options - Formatting options
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (amount, currency = 'USD', options = {}) => {
  const {
    decimals = 0,
    compact = false,
    showSymbol = true,
    showCode = false
  } = options;

  if (amount === null || amount === undefined) return '-';

  const symbol = getCurrencySymbol(currency);
  
  // Handle compact notation (K, M, B)
  if (compact) {
    const absAmount = Math.abs(amount);
    let value = amount;
    let suffix = '';
    
    if (absAmount >= 1_000_000_000) {
      value = amount / 1_000_000_000;
      suffix = 'B';
    } else if (absAmount >= 1_000_000) {
      value = amount / 1_000_000;
      suffix = 'M';
    } else if (absAmount >= 1_000) {
      value = amount / 1_000;
      suffix = 'K';
    }
    
    const formatted = value.toFixed(decimals);
    return showSymbol ? `${symbol}${formatted}${suffix}` : `${formatted}${suffix}`;
  }
  
  // Standard formatting
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(Math.abs(amount));
  
  const sign = amount < 0 ? '-' : '';
  const symbolPart = showSymbol ? symbol : '';
  const codePart = showCode ? ` ${currency}` : '';
  
  return `${sign}${symbolPart}${formatted}${codePart}`;
};

/**
 * Format amount in thousands (K)
 */
export const formatCurrencyK = (amount, currency = 'USD') => {
  return formatCurrency(amount, currency, { compact: true, decimals: 0 });
};

/**
 * Format amount in millions (M)
 */
export const formatCurrencyM = (amount, currency = 'USD', decimals = 1) => {
  const symbol = getCurrencySymbol(currency);
  const value = (amount / 1_000_000).toFixed(decimals);
  return `${symbol}${value}M`;
};

/**
 * Format amount with 2 decimal places
 */
export const formatCurrencyDecimal = (amount, currency = 'USD') => {
  return formatCurrency(amount, currency, { decimals: 2 });
};

/**
 * Format percentage
 */
export const formatPercentage = (value, decimals = 1) => {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(decimals)}%`;
};

/**
 * Format ratio (e.g., 1.5x)
 */
export const formatRatio = (value, decimals = 2) => {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(decimals)}x`;
};

/**
 * Format chart tick values
 */
export const formatChartValue = (value, currency = 'USD') => {
  const symbol = getCurrencySymbol(currency);
  const absValue = Math.abs(value);
  
  if (absValue >= 1_000_000) {
    return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  } else if (absValue >= 1_000) {
    return `${symbol}${(value / 1_000).toFixed(0)}K`;
  }
  
  return `${symbol}${value.toFixed(0)}`;
};

/**
 * React hook to get currency formatting functions
 */
export const useCurrencyFormat = (currency) => {
  return {
    format: (amount, options) => formatCurrency(amount, currency, options),
    formatK: (amount) => formatCurrencyK(amount, currency),
    formatM: (amount, decimals) => formatCurrencyM(amount, currency, decimals),
    formatDecimal: (amount) => formatCurrencyDecimal(amount, currency),
    symbol: getCurrencySymbol(currency),
    currency: currency
  };
};

export default {
  getCurrencySymbol,
  formatCurrency,
  formatCurrencyK,
  formatCurrencyM,
  formatCurrencyDecimal,
  formatPercentage,
  formatRatio,
  formatChartValue,
  useCurrencyFormat
};
