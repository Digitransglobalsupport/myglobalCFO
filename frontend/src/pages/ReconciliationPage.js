import React, { useState, useEffect } from 'react';
import { useAuth, useApp } from '../App';
import { toast } from 'sonner';
import { RefreshCcw, CheckCircle, Clock, XCircle, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

const ReconciliationPage = () => {
  const { authAxios } = useAuth();
  const { selectedCompany, mockDataEnabled } = useApp();
  const [status, setStatus] = useState({ matched_count: 0, pending_count: 0, unmatched_count: 0 });
  const [loading, setLoading] = useState(true);
  const [reconciling, setReconciling] = useState(false);

  useEffect(() => {
    if (selectedCompany) {
      fetchStatus();
    }
  }, [selectedCompany]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await authAxios.get(`/reconciliation/status/${selectedCompany.id}`);
      setStatus(res.data);
    } catch (e) {
      console.error('Error fetching reconciliation status:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleAutoReconcile = async () => {
    try {
      setReconciling(true);
      const res = await authAxios.post(`/reconciliation/auto-match?company_id=${selectedCompany.id}`);
      setStatus({
        matched_count: res.data.matched_count,
        pending_count: res.data.pending_count,
        unmatched_count: res.data.unmatched_count
      });
      toast.success(`Successfully matched ${res.data.newly_matched} transactions!`);
    } catch (e) {
      toast.error('Failed to auto-reconcile');
    } finally {
      setReconciling(false);
    }
  };

  const displayStatus = mockDataEnabled && status.matched_count + status.pending_count + status.unmatched_count === 0
    ? { matched_count: 156, pending_count: 34, unmatched_count: 12 }
    : status;

  const total = displayStatus.matched_count + displayStatus.pending_count + displayStatus.unmatched_count;
  const matchedPercent = total > 0 ? (displayStatus.matched_count / total) * 100 : 0;

  if (!selectedCompany) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <RefreshCcw className="w-16 h-16 text-gray-600 mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">No Entity Selected</h2>
        <p className="text-gray-400">Please select an entity to manage reconciliation</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display">Reconciliation</h1>
          <p className="text-gray-400 mt-1">Bank feed reconciliation for {selectedCompany.name}</p>
        </div>
        <Button 
          className="bg-gold-500 hover:bg-gold-600 text-navy-900"
          onClick={handleAutoReconcile}
          disabled={reconciling || loading}
        >
          {reconciling ? (
            <><RefreshCcw className="w-4 h-4 mr-2 animate-spin" /> Reconciling...</>
          ) : (
            <><Zap className="w-4 h-4 mr-2" /> Auto-Reconcile</>
          )}
        </Button>
      </div>

      {/* Overall Progress */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white">Reconciliation Progress</CardTitle>
          <CardDescription className="text-gray-400">
            {matchedPercent.toFixed(1)}% of transactions matched
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress value={matchedPercent} className="h-3 bg-navy-700" />
          <div className="flex justify-between mt-2 text-sm">
            <span className="text-gray-400">{displayStatus.matched_count} matched</span>
            <span className="text-gray-400">{total} total</span>
          </div>
        </CardContent>
      </Card>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatusCard
          title="Matched"
          count={displayStatus.matched_count}
          icon={<CheckCircle className="w-8 h-8" />}
          color="green"
          description="Successfully reconciled"
        />
        <StatusCard
          title="Pending"
          count={displayStatus.pending_count}
          icon={<Clock className="w-8 h-8" />}
          color="yellow"
          description="Awaiting review"
        />
        <StatusCard
          title="Unmatched"
          count={displayStatus.unmatched_count}
          icon={<XCircle className="w-8 h-8" />}
          color="red"
          description="Requires attention"
        />
      </div>

      {/* Info Card */}
      <Card className="bg-navy-800 border-navy-700">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-gold-500/10 rounded-lg">
              <RefreshCcw className="w-6 h-6 text-gold-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Auto-Reconciliation</h3>
              <p className="text-gray-400">
                Our intelligent matching algorithm automatically matches bank transactions with accounting records 
                based on amount, date proximity, and reference patterns. Click "Auto-Reconcile" to process pending 
                transactions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const StatusCard = ({ title, count, icon, color, description }) => {
  const colors = {
    green: 'bg-green-500/10 text-green-400 border-green-500/30',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30',
    red: 'bg-red-500/10 text-red-400 border-red-500/30'
  };

  return (
    <Card className={`border ${colors[color]} bg-navy-800`}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">{title}</p>
            <p className="text-4xl font-bold text-white mt-2">{count}</p>
            <p className="text-sm text-gray-500 mt-1">{description}</p>
          </div>
          <div className={`p-4 rounded-lg ${colors[color].split(' ')[0]}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReconciliationPage;
