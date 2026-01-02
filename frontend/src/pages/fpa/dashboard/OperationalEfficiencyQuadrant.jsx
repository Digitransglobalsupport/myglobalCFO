import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { CheckCircle2, AlertCircle, Clock, Info } from 'lucide-react';

const OperationalEfficiencyQuadrant = ({ data, userId }) => {
  if (!data) return null;

  const { close_progress, certified_entities, total_entities, dso_by_entity, sod_status, sod_violations_count } = data;

  const getStatusColor = (status) => {
    const colors = {
      green: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
      yellow: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
      red: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' }
    };
    return colors[status] || colors.green;
  };

  const statusColors = getStatusColor(sod_status);

  return (
    <Card className="h-full">
      <CardHeader className="bg-blue-50 border-b">
        <CardTitle className="text-lg font-bold text-blue-900 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Operational Efficiency & Close Health
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Close Status Tracker */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-700">Month-End Close Progress</h3>
            <span className="text-lg font-bold text-blue-600">{close_progress.toFixed(1)}%</span>
          </div>
          <Progress value={close_progress} className="h-3" />
          <p className="text-xs text-slate-600 mt-2">
            {certified_entities} of {total_entities} entities certified
          </p>
        </div>

        {/* DSO by Entity */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Days Sales Outstanding (DSO) by Entity</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={dso_by_entity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="entity" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 11 }} />
              <RechartsTooltip formatter={(value) => `${value.toFixed(0)} days`} />
              <Bar dataKey="dso" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* SoD Control Exception */}
        <div className={`p-4 rounded-lg border-2 ${statusColors.bg} ${statusColors.border}`}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                {sod_status === 'green' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : sod_status === 'yellow' ? (
                  <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                )}
                <h3 className={`text-sm font-semibold ${statusColors.text}`}>
                  Segregation of Duties (SoD)
                </h3>
                <TooltipProvider>
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <Info className={`h-4 w-4 ${statusColors.text} opacity-60 hover:opacity-100 cursor-help flex-shrink-0`} />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-4" side="right">
                      <div className="space-y-2">
                        <p className="font-semibold text-sm">What is SoD?</p>
                        <p className="text-xs">
                          Segregation of Duties prevents fraud by ensuring no single person controls a complete financial transaction.
                        </p>
                        <div className="text-xs space-y-1 pt-2">
                          <p className="font-medium">Example Violations:</p>
                          <p>• Same user creates AND approves payments</p>
                          <p>• Same user records sales AND handles cash</p>
                          <p>• Same user creates vendors AND pays invoices</p>
                        </div>
                        <p className="text-xs pt-2 italic opacity-80">
                          Demo: Showing {sod_violations_count} violations across entities
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className={`text-xs ${statusColors.text} ml-7`}>
                {sod_violations_count === 0
                  ? 'No violations detected'
                  : `${sod_violations_count} violation${sod_violations_count > 1 ? 's' : ''} detected`}
              </p>
            </div>
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${statusColors.bg} ${statusColors.text} flex-shrink-0`}
            >
              {sod_status === 'green' ? '✓' : sod_status === 'yellow' ? '!' : '✗'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default OperationalEfficiencyQuadrant;