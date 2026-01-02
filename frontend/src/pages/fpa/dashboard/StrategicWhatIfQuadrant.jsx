import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, DollarSign } from 'lucide-react';

const StrategicWhatIfQuadrant = ({ data, userId }) => {
  const [revenueAdjustment, setRevenueAdjustment] = useState(0);
  const [interestRateAdjustment, setInterestRateAdjustment] = useState(0);

  if (!data) return null;

  const { asset_investment_npv, asset_investment_irr, proposed_assets_count, cash_forecast_13w } = data;

  // Calculate adjusted NPV based on revenue growth
  // NPV increases with revenue growth and decreases with higher interest rates
  const revenueMultiplier = 1 + (revenueAdjustment / 100);
  const interestImpactMultiplier = 1 - (interestRateAdjustment / 200); // Interest has less direct impact on NPV
  const adjustedNPV = asset_investment_npv * revenueMultiplier * interestImpactMultiplier;

  // Calculate adjusted IRR
  // IRR increases with revenue growth and decreases with higher interest rates
  const irrRevenueBoost = revenueAdjustment * 0.3; // Each 1% revenue = 0.3% IRR boost
  const irrInterestPenalty = interestRateAdjustment * 0.5; // Each 1% interest = 0.5% IRR penalty
  const adjustedIRR = asset_investment_irr + irrRevenueBoost - irrInterestPenalty;

  // Apply sensitivity adjustments to forecast
  const adjustedForecast = cash_forecast_13w.map(week => ({
    ...week,
    optimistic: week.optimistic * (1 + revenueAdjustment / 100) * (1 - interestRateAdjustment / 100),
    expected: week.expected * (1 + revenueAdjustment / 100) * (1 - interestRateAdjustment / 100),
    pessimistic: week.pessimistic * (1 + revenueAdjustment / 100) * (1 - interestRateAdjustment / 100)
  }));

  return (
    <Card className="h-full">
      <CardHeader className="bg-purple-50 border-b">
        <CardTitle className="text-lg font-bold text-purple-900 flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Strategic "What-If" Impact
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Asset Investment ROI */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-xs text-purple-600 mb-1">Proposed Assets NPV</p>
            <p className="text-2xl font-bold text-purple-900">
              ${(adjustedNPV / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-slate-600 mt-1">{proposed_assets_count} asset(s)</p>
            {(revenueAdjustment !== 0 || interestRateAdjustment !== 0) && (
              <p className="text-xs text-blue-600 mt-1">
                {adjustedNPV > asset_investment_npv ? '+' : ''}
                ${((adjustedNPV - asset_investment_npv) / 1000).toFixed(0)}K from base
              </p>
            )}
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-xs text-purple-600 mb-1">Average IRR</p>
            <p className="text-2xl font-bold text-purple-900">{adjustedIRR.toFixed(1)}%</p>
            {(revenueAdjustment !== 0 || interestRateAdjustment !== 0) && (
              <p className="text-xs text-blue-600 mt-1">
                {adjustedIRR > asset_investment_irr ? '+' : ''}
                {(adjustedIRR - asset_investment_irr).toFixed(1)}% from base
              </p>
            )}
          </div>
        </div>

        {/* 13-Week Cash Forecast Fan Chart */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">13-Week Cash Forecast (Confidence Interval)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={adjustedForecast}>
              <defs>
                <linearGradient id="colorOptimistic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="colorPessimistic" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} label={{ value: 'Week', position: 'insideBottom', offset: -5 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`} />
              <Tooltip 
                formatter={(value) => `$${(value / 1000000).toFixed(2)}M`}
                contentStyle={{ fontSize: '12px' }}
              />
              <Area type="monotone" dataKey="optimistic" stroke="#10b981" fill="url(#colorOptimistic)" name="Optimistic" />
              <Area type="monotone" dataKey="pessimistic" stroke="#ef4444" fill="url(#colorPessimistic)" name="Pessimistic" />
              <Line type="monotone" dataKey="expected" stroke="#3b82f6" strokeWidth={2} dot={false} name="Expected" />
            </AreaChart>
          </ResponsiveContainer>
          
          {/* Legend with current values */}
          {adjustedForecast.length >= 8 && (
            <div className="flex justify-end gap-4 mt-2 text-xs">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-slate-600">expected: <span className="font-semibold">${(adjustedForecast[7].expected / 1000000).toFixed(2)}M</span></span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-slate-600">optimistic: <span className="font-semibold">${(adjustedForecast[7].optimistic / 1000000).toFixed(2)}M</span></span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-slate-600">pessimistic: <span className="font-semibold">${(adjustedForecast[7].pessimistic / 1000000).toFixed(2)}M</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Sensitivity Toggles */}
        <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Sensitivity Analysis</h3>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-600">Revenue Growth Adjustment</label>
              <span className="text-sm font-semibold text-slate-900">
                {revenueAdjustment > 0 ? '+' : ''}{revenueAdjustment}%
              </span>
            </div>
            <Slider
              value={[revenueAdjustment]}
              onValueChange={(value) => setRevenueAdjustment(value[0])}
              min={-10}
              max={10}
              step={1}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-slate-600">Interest Rate Impact</label>
              <span className="text-sm font-semibold text-slate-900">
                {interestRateAdjustment > 0 ? '+' : ''}{interestRateAdjustment}%
              </span>
            </div>
            <Slider
              value={[interestRateAdjustment]}
              onValueChange={(value) => setInterestRateAdjustment(value[0])}
              min={-5}
              max={5}
              step={0.5}
              className="w-full"
            />
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-900 font-medium">
              💡 Impact: Adjusting revenue by {revenueAdjustment > 0 ? '+' : ''}{revenueAdjustment}% and interest by {interestRateAdjustment > 0 ? '+' : ''}{interestRateAdjustment}%
              {revenueAdjustment === 0 && interestRateAdjustment === 0 ? (
                <span> maintains current trajectory.</span>
              ) : (
                <span>
                  {' '}results in NPV of ${(adjustedNPV / 1000).toFixed(0)}K (
                  {adjustedNPV > asset_investment_npv ? '+' : ''}
                  ${((adjustedNPV - asset_investment_npv) / 1000).toFixed(0)}K) and IRR of {adjustedIRR.toFixed(1)}% (
                  {adjustedIRR > asset_investment_irr ? '+' : ''}
                  {(adjustedIRR - asset_investment_irr).toFixed(1)}%).
                </span>
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StrategicWhatIfQuadrant;