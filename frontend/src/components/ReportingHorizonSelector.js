import React, { useState } from 'react';
import { useReportingHorizon, HORIZON_OPTIONS } from '../context/ReportingHorizonContext';
import { Calendar, Clock, ChevronDown, Check, History, X, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format, subDays, startOfYear } from 'date-fns';

// Global Horizon Selector (for dashboard header)
export const GlobalHorizonSelector = ({ className }) => {
  const {
    globalHorizon,
    setHorizon,
    compareToPrior,
    toggleCompareToPrior,
    customStartDate,
    customEndDate,
    formatDateRange,
    getDateRangeFromHorizon
  } = useReportingHorizon();
  
  const [open, setOpen] = useState(false);
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(customStartDate ? new Date(customStartDate) : subDays(new Date(), 30));
  const [tempEndDate, setTempEndDate] = useState(customEndDate ? new Date(customEndDate) : new Date());

  const currentOption = HORIZON_OPTIONS.find(h => h.id === globalHorizon) || HORIZON_OPTIONS[0];
  const dateRange = getDateRangeFromHorizon(globalHorizon, customStartDate, customEndDate);

  const handleSelectHorizon = (horizonId) => {
    if (horizonId === 'custom') {
      setShowCustomPicker(true);
    } else {
      setHorizon(horizonId);
      setOpen(false);
    }
  };

  const handleApplyCustomRange = () => {
    setHorizon('custom', tempStartDate.toISOString(), tempEndDate.toISOString());
    setShowCustomPicker(false);
    setOpen(false);
  };

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      {/* Quick Toggle Buttons */}
      <div className="hidden md:flex items-center bg-navy-800 rounded-lg p-1 border border-navy-700">
        {HORIZON_OPTIONS.filter(h => ['30d', '60d', '90d', '6m'].includes(h.id)).map((option) => (
          <Button
            key={option.id}
            size="sm"
            variant="ghost"
            className={cn(
              "px-3 py-1 h-7 text-xs font-medium transition-all",
              globalHorizon === option.id
                ? "bg-gold-500 text-navy-900 hover:bg-gold-600"
                : "text-gray-400 hover:text-white hover:bg-navy-700"
            )}
            onClick={() => handleSelectHorizon(option.id)}
            data-testid={`horizon-${option.id}`}
          >
            {option.shortLabel}
          </Button>
        ))}
        
        {/* Compare Badge - Inside the toggle group to prevent layout shift */}
        <div className={cn(
          "ml-1 px-2 py-1 rounded text-xs font-medium transition-all flex items-center",
          compareToPrior 
            ? "bg-blue-500/20 text-blue-400" 
            : "bg-transparent text-transparent pointer-events-none"
        )}>
          <History className="w-3 h-3 mr-1" /> vs Prior
        </div>
      </div>

      {/* Full Selector Dropdown */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="border-navy-600 text-gray-300 hover:text-white bg-navy-800"
            data-testid="horizon-selector"
          >
            <Calendar className="w-4 h-4 mr-2 text-gold-400" />
            <span className="hidden sm:inline">{currentOption.label}</span>
            <span className="sm:hidden">{currentOption.shortLabel}</span>
            <ChevronDown className="w-4 h-4 ml-2 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 bg-navy-800 border-navy-700 p-0" align="start" sideOffset={8}>
          {!showCustomPicker ? (
            <div className="p-2">
              <div className="text-xs font-semibold text-gray-500 uppercase px-2 py-1 mb-1">
                Reporting Horizon
              </div>
              {HORIZON_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                    globalHorizon === option.id
                      ? "bg-gold-500/20 text-gold-400"
                      : "text-white hover:bg-navy-700"
                  )}
                  onClick={() => handleSelectHorizon(option.id)}
                >
                  <span>{option.label}</span>
                  {globalHorizon === option.id && <Check className="w-4 h-4" />}
                </button>
              ))}
              
              <Separator className="my-2 bg-navy-700" />
              
              {/* Compare to Prior Toggle */}
              <div className="flex items-center justify-between px-3 py-2">
                <div className="flex items-center space-x-2">
                  <History className="w-4 h-4 text-blue-400" />
                  <Label className="text-sm text-gray-300">Compare to Prior Period</Label>
                </div>
                <Switch
                  checked={compareToPrior}
                  onCheckedChange={toggleCompareToPrior}
                  className="data-[state=checked]:bg-blue-500"
                  data-testid="compare-prior-toggle"
                />
              </div>
              
              <Separator className="my-2 bg-navy-700" />
              
              {/* Current Selection Info */}
              <div className="px-3 py-2 bg-navy-900 rounded-md">
                <p className="text-xs text-gray-500">Current Range</p>
                <p className="text-sm text-white font-medium">
                  {formatDateRange(dateRange.startDate, dateRange.endDate)}
                </p>
                {compareToPrior && (
                  <p className="text-xs text-blue-400 mt-1">
                    Comparing with prior period
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-semibold text-white">Custom Date Range</h4>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-6 w-6 text-gray-400"
                  onClick={() => setShowCustomPicker(false)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-400">Start Date</Label>
                  <CalendarComponent
                    mode="single"
                    selected={tempStartDate}
                    onSelect={setTempStartDate}
                    className="rounded-md border border-navy-700 bg-navy-900"
                  />
                </div>
                <div>
                  <Label className="text-xs text-gray-400">End Date</Label>
                  <CalendarComponent
                    mode="single"
                    selected={tempEndDate}
                    onSelect={setTempEndDate}
                    className="rounded-md border border-navy-700 bg-navy-900"
                  />
                </div>
                
                <Button 
                  className="w-full bg-gold-500 hover:bg-gold-600 text-navy-900"
                  onClick={handleApplyCustomRange}
                >
                  Apply Range
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
};

// Widget-Level Horizon Override (for individual cards/widgets)
export const WidgetHorizonSelector = ({ widgetId, className, compact = false }) => {
  const {
    globalHorizon,
    widgetOverrides,
    getWidgetHorizon,
    setWidgetHorizon,
    clearWidgetOverride,
    getDateRangeFromHorizon
  } = useReportingHorizon();
  
  const [open, setOpen] = useState(false);
  const hasOverride = !!widgetOverrides[widgetId];
  const currentHorizon = getWidgetHorizon(widgetId);
  const currentOption = HORIZON_OPTIONS.find(h => h.id === currentHorizon) || HORIZON_OPTIONS[0];

  const handleSelect = (horizonId) => {
    if (horizonId === 'global') {
      clearWidgetOverride(widgetId);
    } else {
      setWidgetHorizon(widgetId, horizonId);
    }
    setOpen(false);
  };

  if (compact) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-6 px-2 text-xs",
              hasOverride ? "text-gold-400" : "text-gray-500 hover:text-gray-300",
              className
            )}
          >
            <Clock className="w-3 h-3 mr-1" />
            {currentOption.shortLabel}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-48 bg-navy-800 border-navy-700 p-1" align="end">
          <button
            className={cn(
              "w-full text-left px-3 py-2 rounded text-sm",
              !hasOverride ? "bg-navy-700 text-gold-400" : "text-gray-400 hover:bg-navy-700"
            )}
            onClick={() => handleSelect('global')}
          >
            <RefreshCcw className="w-3 h-3 inline mr-2" />
            Use Global ({HORIZON_OPTIONS.find(h => h.id === globalHorizon)?.shortLabel})
          </button>
          <Separator className="my-1 bg-navy-700" />
          {HORIZON_OPTIONS.filter(h => h.id !== 'custom').map((option) => (
            <button
              key={option.id}
              className={cn(
                "w-full text-left px-3 py-2 rounded text-sm",
                hasOverride && currentHorizon === option.id
                  ? "bg-gold-500/20 text-gold-400"
                  : "text-white hover:bg-navy-700"
              )}
              onClick={() => handleSelect(option.id)}
            >
              {option.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      {HORIZON_OPTIONS.filter(h => ['30d', '60d', '90d'].includes(h.id)).map((option) => (
        <Button
          key={option.id}
          size="sm"
          variant="ghost"
          className={cn(
            "px-2 py-1 h-6 text-xs",
            currentHorizon === option.id
              ? "bg-gold-500/20 text-gold-400"
              : "text-gray-500 hover:text-white"
          )}
          onClick={() => setWidgetHorizon(widgetId, option.id)}
        >
          {option.shortLabel}
        </Button>
      ))}
      {hasOverride && (
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-gray-500 hover:text-white"
          onClick={() => clearWidgetOverride(widgetId)}
          title="Reset to global"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
};

// Display component showing current horizon info
export const HorizonInfoBadge = ({ widgetId, className }) => {
  const { getWidgetDateRange, widgetOverrides, compareToPrior, getPriorPeriodRange } = useReportingHorizon();
  const dateRange = getWidgetDateRange(widgetId);
  const hasOverride = !!widgetOverrides[widgetId];

  return (
    <div className={cn("flex items-center space-x-2 text-xs text-gray-500", className)}>
      <Clock className="w-3 h-3" />
      <span>{dateRange.label}</span>
      {hasOverride && (
        <Badge variant="outline" className="text-[10px] px-1 py-0 border-gold-500/30 text-gold-400">
          Custom
        </Badge>
      )}
      {compareToPrior && (
        <Badge variant="outline" className="text-[10px] px-1 py-0 border-blue-500/30 text-blue-400">
          vs Prior
        </Badge>
      )}
    </div>
  );
};

export default GlobalHorizonSelector;
