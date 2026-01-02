import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cloud, CloudOff, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const SyncStatusQuadrant = ({ data, userId }) => {
  if (!data) return null;

  const { integrations, data_latency_minutes, connected_count, total_count } = data;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      default:
        return <CloudOff className="h-5 w-5 text-slate-400" />;
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      connected: 'bg-green-50 border-green-300 text-green-900',
      error: 'bg-red-50 border-red-300 text-red-900',
      pending: 'bg-yellow-50 border-yellow-300 text-yellow-900',
      disconnected: 'bg-slate-50 border-slate-300 text-slate-900'
    };
    return colors[status] || colors.disconnected;
  };

  const getLatencyStatus = (minutes) => {
    if (minutes < 5) return { color: 'text-green-600', label: 'Real-time' };
    if (minutes < 30) return { color: 'text-blue-600', label: 'Recent' };
    if (minutes < 120) return { color: 'text-yellow-600', label: 'Delayed' };
    return { color: 'text-red-600', label: 'Stale' };
  };

  const latencyStatus = getLatencyStatus(data_latency_minutes);

  return (
    <Card className="h-full">
      <CardHeader className="bg-slate-50 border-b">
        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Cloud className="h-5 w-5" />
          Sync Status & Data Integrity
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Data Latency Meter */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-600 mb-1">Data Freshness</p>
              <p className={`text-2xl font-bold ${latencyStatus.color}`}>
                {data_latency_minutes < 60
                  ? `${data_latency_minutes.toFixed(0)} min`
                  : `${(data_latency_minutes / 60).toFixed(1)} hrs`}
              </p>
              <p className="text-xs text-slate-600 mt-1">{latencyStatus.label}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-600">Connections</p>
              <p className="text-2xl font-bold text-slate-900">
                {connected_count}/{total_count}
              </p>
            </div>
          </div>
        </div>

        {/* Network Topology - Integration Status */}
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Integration Status</h3>
          <div className="space-y-2">
            {integrations.map((integration, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border flex items-center justify-between ${getStatusColor(integration.status)}`}
              >
                <div className="flex items-center gap-3">
                  {getStatusIcon(integration.status)}
                  <div>
                    <p className="font-medium text-sm">{integration.name}</p>
                    <p className="text-xs opacity-75">
                      {integration.status === 'connected' && integration.last_sync
                        ? `Last sync: ${formatDistanceToNow(new Date(integration.last_sync), { addSuffix: true })}`
                        : integration.status === 'error'
                        ? 'Connection error - retry required'
                        : 'Not configured'}
                    </p>
                  </div>
                </div>
                <div className="text-xs font-semibold uppercase">{integration.status}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Health Summary */}
        <div className="p-4 bg-slate-100 rounded-lg">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">System Health</h3>
          <div className="space-y-1 text-xs text-slate-600">
            <p>• {connected_count} active integration{connected_count !== 1 ? 's' : ''}</p>
            <p>• Data latency: {latencyStatus.label.toLowerCase()}</p>
            <p>
              • Overall status:{' '}
              <span
                className={`font-semibold ${
                  connected_count === total_count
                    ? 'text-green-600'
                    : connected_count > 0
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}
              >
                {connected_count === total_count
                  ? 'All systems operational'
                  : connected_count > 0
                  ? 'Partial connectivity'
                  : 'No active connections'}
              </span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SyncStatusQuadrant;