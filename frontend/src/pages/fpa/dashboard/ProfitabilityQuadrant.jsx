import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { getCurrencySymbol } from '@/utils/currencyFormatter';

const ProfitabilityQuadrant = ({ data, userId, currency = 'GBP' }) => {
  const [selectedSKU, setSelectedSKU] = useState(null);
  const [drillModalOpen, setDrillModalOpen] = useState(false);
  const currencySymbol = getCurrencySymbol(currency);

  if (!data) return null;

  const { top_5_skus, bottom_5_skus, waterfall_data } = data;

  // Prepare waterfall chart data
  const waterfallData = [
    { name: 'Gross Revenue', value: waterfall_data.gross_revenue, color: '#10b981' },
    { name: 'Gross Profit', value: waterfall_data.gross_profit, color: '#3b82f6' },
    { name: 'Overhead', value: -waterfall_data.overhead, color: '#ef4444' },
    { name: 'Net Profit', value: waterfall_data.net_profit, color: waterfall_data.net_profit > 0 ? '#10b981' : '#ef4444' }
  ];

  const handleSKUClick = (sku) => {
    setSelectedSKU(sku);
    setDrillModalOpen(true);
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="bg-green-50 border-b">
          <CardTitle className="text-lg font-bold text-green-900 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Profitability & Unit Economics
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          {/* Waterfall Chart */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Revenue to Net Profit Waterfall</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={waterfallData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}K`} />
                <Tooltip formatter={(value) => `${currencySymbol}${(value / 1000).toFixed(0)}K`} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {waterfallData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Top 5 SKUs */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Top 5 Products (Fully-Loaded Margin %)
            </h3>
            <div className="space-y-2">
              {top_5_skus.slice(0, 5).map((sku, index) => (
                <button
                  key={index}
                  onClick={() => handleSKUClick(sku)}
                  className="w-full flex items-center justify-between p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors text-left"
                >
                  <span className="font-medium text-slate-900">{sku.name}</span>
                  <span className="text-green-700 font-semibold">
                    {sku.fully_loaded_margin?.toFixed(1) || 0}%
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Bottom 5 SKUs */}
          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Bottom 5 Products (Action Needed)
            </h3>
            <div className="space-y-2">
              {bottom_5_skus.slice(0, 5).map((sku, index) => (
                <button
                  key={index}
                  onClick={() => handleSKUClick(sku)}
                  className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors text-left"
                >
                  <span className="font-medium text-slate-900">{sku.name}</span>
                  <span className="text-red-700 font-semibold">
                    {sku.fully_loaded_margin?.toFixed(1) || 0}%
                  </span>
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drill-to-Source Modal */}
      <Dialog open={drillModalOpen} onOpenChange={setDrillModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Product Details: {selectedSKU?.name}</DialogTitle>
          </DialogHeader>
          {selectedSKU && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">Revenue</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {currencySymbol}{(selectedSKU.revenue / 1000).toFixed(1)}K
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">Gross Margin</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {(selectedSKU.gross_margin * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-600">Allocated Overhead</p>
                  <p className="text-2xl font-bold text-slate-900">
                    {currencySymbol}{(selectedSKU.allocated_overhead / 1000).toFixed(1)}K
                  </p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-300">
                  <p className="text-sm text-blue-600">Fully-Loaded Margin</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {selectedSKU.fully_loaded_margin?.toFixed(1)}%
                  </p>
                </div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-300">
                <p className="text-sm font-semibold text-yellow-900 mb-2">💡 Recommendation</p>
                <p className="text-sm text-yellow-800">
                  {selectedSKU.fully_loaded_margin > 20
                    ? 'This product is highly profitable. Consider increasing marketing investment or production capacity.'
                    : selectedSKU.fully_loaded_margin > 10
                    ? 'Moderate profitability. Review overhead allocation and pricing strategy.'
                    : 'Low profitability. Consider discontinuing, repricing, or reducing allocated overhead.'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ProfitabilityQuadrant;