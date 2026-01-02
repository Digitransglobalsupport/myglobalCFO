import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, DollarSign } from 'lucide-react';

const GlobalLiquidityStrip = ({ data }) => {
  const metrics = [
    {
      label: 'Group Net Cash',
      value: `$${(data.group_net_cash / 1000000).toFixed(2)}M`,
      icon: DollarSign,
      color: 'blue'
    },
    {
      label: 'Liquidity Ratio',
      value: data.liquidity_ratio.toFixed(2),
      icon: TrendingUp,
      color: data.liquidity_ratio > 1.5 ? 'green' : data.liquidity_ratio > 1.0 ? 'yellow' : 'red',
      status: data.liquidity_ratio > 1.5 ? 'Healthy' : data.liquidity_ratio > 1.0 ? 'Moderate' : 'Critical'
    },
    {
      label: 'Intercompany In-Flight',
      value: `$${(data.intercompany_in_flight / 1000).toFixed(0)}K`,
      icon: DollarSign,
      color: data.intercompany_in_flight > 100000 ? 'orange' : 'green'
    },
    {
      label: 'Forecasted 60-Day Minimum',
      value: `$${(data.forecasted_60_day_minimum / 1000000).toFixed(2)}M`,
      icon: TrendingUp,
      color: 'blue'
    }
  ];

  const getColorClass = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      orange: 'bg-orange-100 text-orange-800',
      red: 'bg-red-100 text-red-800'
    };
    return colors[color] || colors.blue;
  };

  return (
    <Card className="bg-gradient-to-r from-slate-900 to-slate-800 text-white border-none">
      <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Global Liquidity Heartbeat
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <div key={index} className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-5 w-5 text-blue-300" />
                  <span className="text-sm text-slate-300">{metric.label}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold">{metric.value}</span>
                  {metric.status && (
                    <span className={`text-xs px-2 py-1 rounded ${getColorClass(metric.color)}`}>
                      {metric.status}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default GlobalLiquidityStrip;