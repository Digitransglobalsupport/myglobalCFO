import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getAvailableCurrencies } from '@/utils/currencyUtils';

const CurrencySelector = ({ value, onChange, label = "Currency", className = "" }) => {
  const currencies = getAvailableCurrencies();
  const selectedCurrency = currencies.find(c => c.code === (value || 'GBP')) || currencies[2]; // GBP is index 2
  
  return (
    <div className={`space-y-2 ${className}`}>
      {label && <Label>{label}</Label>}
      <Select value={value || 'GBP'} onValueChange={onChange}>
        <SelectTrigger className="bg-white border border-slate-300">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700">{selectedCurrency.symbol}</span>
            <span className="text-slate-900">{selectedCurrency.code}</span>
          </div>
        </SelectTrigger>
        <SelectContent className="z-[150]">
          {currencies.map((currency) => (
            <SelectItem key={currency.code} value={currency.code}>
              {currency.symbol} {currency.code} - {currency.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CurrencySelector;
