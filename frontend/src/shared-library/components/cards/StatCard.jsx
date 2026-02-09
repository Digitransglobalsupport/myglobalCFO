/**
 * StatCard - Reusable statistic card component
 * 
 * Usage:
 *   <StatCard
 *     title="Total Revenue"
 *     value={125000}
 *     format="currency"
 *     change={12.5}
 *     icon={<DollarSign />}
 *   />
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

// Format options
const formatValue = (value, format, options = {}) => {
  const { currency = 'USD', locale = 'en-US', decimals = 0 } = options;
  
  if (value === null || value === undefined) return '—';
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);
      
    case 'percent':
      return `${value.toFixed(decimals)}%`;
      
    case 'number':
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(value);
      
    case 'compact':
      return new Intl.NumberFormat(locale, {
        notation: 'compact',
        compactDisplay: 'short'
      }).format(value);
      
    default:
      return String(value);
  }
};

export const StatCard = ({
  title,
  value,
  format = 'number',
  formatOptions = {},
  change = null,
  changeLabel = 'vs last period',
  icon = null,
  color = 'blue',
  loading = false,
  className = ''
}) => {
  const colorClasses = {
    blue: 'bg-blue-500/10 text-blue-400',
    green: 'bg-green-500/10 text-green-400',
    red: 'bg-red-500/10 text-red-400',
    yellow: 'bg-yellow-500/10 text-yellow-400',
    purple: 'bg-purple-500/10 text-purple-400',
    gray: 'bg-gray-500/10 text-gray-400'
  };
  
  const getChangeIndicator = () => {
    if (change === null || change === undefined) return null;
    
    const isPositive = change > 0;
    const isNeutral = change === 0;
    
    return (
      <div className={`flex items-center text-sm ${
        isPositive ? 'text-green-400' : 
        isNeutral ? 'text-gray-400' : 
        'text-red-400'
      }`}>
        {isPositive ? (
          <TrendingUp className="w-4 h-4 mr-1" />
        ) : isNeutral ? (
          <Minus className="w-4 h-4 mr-1" />
        ) : (
          <TrendingDown className="w-4 h-4 mr-1" />
        )}
        <span>{isPositive ? '+' : ''}{change.toFixed(1)}%</span>
        <span className="text-gray-500 ml-1">{changeLabel}</span>
      </div>
    );
  };
  
  if (loading) {
    return (
      <Card className={`bg-slate-800 border-slate-700 ${className}`}>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-700 rounded w-1/2" />
            <div className="h-8 bg-slate-700 rounded w-3/4" />
            <div className="h-4 bg-slate-700 rounded w-1/3" />
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className={`bg-slate-800 border-slate-700 hover:border-slate-600 transition-colors ${className}`}>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white">
              {formatValue(value, format, formatOptions)}
            </p>
            {getChangeIndicator()}
          </div>
          {icon && (
            <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

/**
 * MetricCard - Compact metric display
 */
export const MetricCard = ({
  label,
  value,
  format = 'number',
  formatOptions = {},
  sublabel = null,
  status = null, // 'good' | 'warning' | 'critical'
  className = ''
}) => {
  const statusColors = {
    good: 'border-l-green-500',
    warning: 'border-l-yellow-500',
    critical: 'border-l-red-500'
  };
  
  return (
    <div className={`
      bg-slate-800/50 rounded-lg p-4 border-l-4
      ${status ? statusColors[status] : 'border-l-slate-600'}
      ${className}
    `}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-xl font-semibold text-white mt-1">
        {formatValue(value, format, formatOptions)}
      </p>
      {sublabel && (
        <p className="text-xs text-gray-400 mt-1">{sublabel}</p>
      )}
    </div>
  );
};

/**
 * KPICard - Key Performance Indicator with target comparison
 */
export const KPICard = ({
  title,
  value,
  target,
  format = 'number',
  formatOptions = {},
  unit = '',
  description = null,
  className = ''
}) => {
  const percentage = target ? (value / target) * 100 : 0;
  const isOnTrack = percentage >= 100;
  const isClose = percentage >= 80;
  
  return (
    <Card className={`bg-slate-800 border-slate-700 ${className}`}>
      <CardContent className="pt-6 space-y-4">
        <div>
          <p className="text-sm text-gray-400">{title}</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-bold text-white">
              {formatValue(value, format, formatOptions)}
            </span>
            {unit && <span className="text-gray-500">{unit}</span>}
          </div>
        </div>
        
        {target && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Target</span>
              <span className={
                isOnTrack ? 'text-green-400' : 
                isClose ? 'text-yellow-400' : 
                'text-red-400'
              }>
                {percentage.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  isOnTrack ? 'bg-green-500' : 
                  isClose ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500">
              Target: {formatValue(target, format, formatOptions)} {unit}
            </p>
          </div>
        )}
        
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
