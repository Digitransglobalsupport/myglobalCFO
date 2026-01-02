import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const MonthYearPicker = ({ value, onChange, label, minYear, maxYear, showAllMonths = false }) => {
  const currentYear = new Date().getFullYear();
  const minYearValue = minYear || currentYear;
  const maxYearValue = maxYear || currentYear + 3;
  
  // Parse current value (format: YYYY-MM)
  const [year, month] = value && value.includes('-') ? value.split('-') : [currentYear.toString(), '01'];
  const selectedYear = parseInt(year) || currentYear;
  const selectedMonth = parseInt(month) || 1;
  
  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];
  
  const years = [];
  for (let y = minYearValue; y <= maxYearValue; y++) {
    years.push(y);
  }
  
  const handleYearChange = (newYear) => {
    const formattedMonth = month.padStart(2, '0');
    onChange(`${newYear}-${formattedMonth}`);
  };
  
  const handleMonthChange = (newMonth) => {
    onChange(`${year}-${newMonth}`);
  };
  
  const handleMonthYearChange = (newValue) => {
    onChange(newValue);
  };
  
  const canGoPrevYear = selectedYear > minYearValue;
  const canGoNextYear = selectedYear < maxYearValue;
  
  // If showAllMonths is true, render a single dropdown with all month-year combinations
  if (showAllMonths) {
    // Generate all month-year combinations
    const allMonthYears = [];
    years.forEach((y) => {
      months.forEach((m) => {
        allMonthYears.push({
          value: `${y}-${m.value}`,
          label: `${m.label} ${y}`
        });
      });
    });
    
    return (
      <div className="space-y-2">
        {label && <Label>{label}</Label>}
        
        <Select value={value || `${currentYear}-01`} onValueChange={handleMonthYearChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select month and year" />
          </SelectTrigger>
          <SelectContent className="z-[150] max-h-[300px]">
            {allMonthYears.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }
  
  // Original two-dropdown layout for dialogs
  // Ensure we have a valid year value for the Select
  const effectiveYear = years.includes(parseInt(year)) ? year : years[0]?.toString() || currentYear.toString();
  
  return (
    <div className="space-y-2">
      {label && <Label className="text-slate-900">{label}</Label>}
      
      <div className="flex gap-2">
        {/* Year Navigation */}
        <div className="flex items-center gap-1 border rounded-md px-2 bg-white">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => handleYearChange(selectedYear - 1)}
            disabled={!canGoPrevYear}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <Select value={effectiveYear} onValueChange={handleYearChange}>
            <SelectTrigger className="border-0 shadow-none h-8 w-20 focus:ring-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[150]">
              {/* Render all years in the range */}
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y === currentYear ? `${y} (Current)` : y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => handleYearChange(selectedYear + 1)}
            disabled={!canGoNextYear}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Month Selection */}
        <Select value={month || '01'} onValueChange={handleMonthChange}>
          <SelectTrigger className="flex-1">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="z-[150]">
            {months.map(m => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default MonthYearPicker;
