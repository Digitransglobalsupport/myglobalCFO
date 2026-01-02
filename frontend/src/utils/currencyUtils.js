// Currency utilities for FP&A module

export const CURRENCIES = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US'
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE'
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB'
  }
};

export const formatCurrency = (value, currencyCode = 'GBP', options = {}) => {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.GBP;
  
  return new Intl.NumberFormat(currency.locale, {
    style: 'currency',
    currency: currency.code,
    minimumFractionDigits: options.decimals !== undefined ? options.decimals : 0,
    maximumFractionDigits: options.decimals !== undefined ? options.decimals : 0,
    ...options
  }).format(value || 0);
};

export const getCurrencySymbol = (currencyCode) => {
  return CURRENCIES[currencyCode]?.symbol || '$';
};

export const getCurrencyName = (currencyCode) => {
  return CURRENCIES[currencyCode]?.name || 'US Dollar';
};

export const getAvailableCurrencies = () => {
  return Object.values(CURRENCIES);
};
