import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../App';
import { toast } from 'sonner';
import {
  Bot, Bell, CheckCircle, AlertTriangle, Clock, Activity,
  RefreshCcw, Eye, RotateCcw, ThumbsUp, ThumbsDown, Search,
  Mail, Link2, Stethoscope, Shield, ChevronRight, FileText,
  TrendingUp, ArrowDown, ArrowUp, Filter, Zap, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const AgentHubPage = () => {
  const { authAxios } = useAuth();
  const [statistics, setStatistics] = useState(null);
  const [actions, setActions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [bridgeReport, setBridgeReport] = useState(null);
  const [violations, setViolations] = useState([]);
  const [pendingHeals, setPendingHeals] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAction, setSelectedAction] = useState(null);
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showRollbackDialog, setShowRollbackDialog] = useState(false);
  const [rollbackReason, setRollbackReason] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [statsRes, actionsRes, notifsRes, bridgeRes, violationsRes, healsRes] = await Promise.all([
        authAxios.get('/agents/statistics'),
        authAxios.get('/agents/actions?limit=50'),
        authAxios.get('/agents/notifications?limit=30'),
        authAxios.get('/agents/bridge-report'),
        authAxios.get('/agents/compliance/violations'),
        authAxios.get('/agents/heal/pending')
      ]);
      setStatistics(statsRes.data);
      setActions(actionsRes.data);
      setNotifications(notifsRes.data);
      setBridgeReport(bridgeRes.data);
      setViolations(violationsRes.data);
      setPendingHeals(healsRes.data);
    } catch (e) {
      console.error('Error fetching agent data:', e);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const markNotificationRead = async (notifId) => {
    try {
      await authAxios.put(`/agents/notifications/${notifId}/read`);
      fetchData();
    } catch (e) {
      console.error('Error marking notification read:', e);
    }
  };

  const rollbackAction = async () => {
    if (!selectedAction) return;
    try {
      await authAxios.post(`/agents/actions/${selectedAction.id}/rollback`, {
        reason: rollbackReason
      });
      toast.success('Action rolled back successfully');
      setShowRollbackDialog(false);
      setSelectedAction(null);
      setRollbackReason('');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to rollback');
    }
  };

  const approveAction = async (actionId) => {
    try {
      await authAxios.post(`/agents/actions/${actionId}/approve`);
      toast.success('Action approved');
      fetchData();
    } catch (e) {
      toast.error('Failed to approve');
    }
  };

  const rejectAction = async (actionId, reason) => {
    try {
      await authAxios.post(`/agents/actions/${actionId}/reject`, { reason });
      toast.success('Action rejected');
      fetchData();
    } catch (e) {
      toast.error('Failed to reject');
    }
  };

  const runFetchAgent = async () => {
    try {
      toast.info('Scanning inbox...');
      const res = await authAxios.post('/agents/fetch/scan-inbox', { days_back: 30 });
      toast.success(`Found ${res.data.scan_results.invoices_extracted} invoices`);
      fetchData();
    } catch (e) {
      toast.error('Scan failed');
    }
  };

  const runMatchAgent = async () => {
    try {
      toast.info('Generating mapping suggestions...');
      const res = await authAxios.post('/agents/match/suggest-mappings', {});
      toast.success(`Generated ${res.data.suggestions_count} suggestions`);
      fetchData();
    } catch (e) {
      toast.error('Match agent failed');
    }
  };

  const runGovernanceCheck = async () => {
    try {
      toast.info('Running governance check...');
      const res = await authAxios.post('/agents/compliance/governance-check', {});
      toast.success(`Checked ${res.data.total_eliminations_checked} IC relationships`);
      fetchData();
    } catch (e) {
      toast.error('Governance check failed');
    }
  };

  const filteredActions = actions.filter(a => {
    if (filterAgent !== 'all' && a.agent_type !== filterAgent) return false;
    if (filterStatus !== 'all' && a.status !== filterStatus) return false;
    return true;
  });

  const getStatusBadge = (status) => {
    const config = {
      automated: { bg: 'bg-green-500/20', text: 'text-green-400', icon: CheckCircle },
      proposed: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Clock },
      flagged: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: AlertTriangle },
      approved: { bg: 'bg-green-500/20', text: 'text-green-400', icon: ThumbsUp },
      rejected: { bg: 'bg-red-500/20', text: 'text-red-400', icon: ThumbsDown },
      rolled_back: { bg: 'bg-gray-500/20', text: 'text-gray-400', icon: RotateCcw }
    };
    const c = config[status] || config.automated;
    const Icon = c.icon;
    return (
      <Badge className={`${c.bg} ${c.text}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const getAgentIcon = (agent) => {
    const icons = {
      fetch: Mail,
      match: Link2,
      heal: Stethoscope,
      compliance: Shield
    };
    return icons[agent] || Bot;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gold-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="agent-hub-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white font-display flex items-center gap-3">
            <Bot className="w-8 h-8 text-gold-500" />
            Agent Hub
          </h1>
          <p className="text-gray-400 mt-1">Self-healing financial data engine - autonomous actions & audit trail</p>
        </div>
        <Button onClick={fetchData} variant="outline" className="border-navy-600 text-white">
          <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Actions</p>
                <p className="text-2xl font-bold text-white">{statistics?.total_actions || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-gold-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Automated</p>
                <p className="text-2xl font-bold text-green-400">{statistics?.automated || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Proposed</p>
                <p className="text-2xl font-bold text-blue-400">{statistics?.proposed || 0}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Flagged</p>
                <p className="text-2xl font-bold text-yellow-400">{statistics?.flagged || 0}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Rolled Back</p>
                <p className="text-2xl font-bold text-gray-400">{statistics?.rolled_back || 0}</p>
              </div>
              <RotateCcw className="w-8 h-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-navy-800 border-navy-700">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Unread</p>
                <p className="text-2xl font-bold text-red-400">{statistics?.unread_notifications || 0}</p>
              </div>
              <Bell className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-navy-800 border-navy-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-gold-500" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button onClick={runFetchAgent} className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 h-auto py-4 flex flex-col items-center gap-2">
              <Mail className="w-6 h-6" />
              <span>Scan Inbox</span>
              <span className="text-xs text-gray-400">Fetch Agent</span>
            </Button>
            <Button onClick={runMatchAgent} className="bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 border border-purple-500/30 h-auto py-4 flex flex-col items-center gap-2">
              <Link2 className="w-6 h-6" />
              <span>Suggest Mappings</span>
              <span className="text-xs text-gray-400">Match Agent</span>
            </Button>
            <Button onClick={() => toast.info('Run from IC Eliminations tab')} className="bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-500/30 h-auto py-4 flex flex-col items-center gap-2">
              <Stethoscope className="w-6 h-6" />
              <span>Investigate Variances</span>
              <span className="text-xs text-gray-400">Heal Agent</span>
            </Button>
            <Button onClick={runGovernanceCheck} className="bg-orange-600/20 hover:bg-orange-600/30 text-orange-400 border border-orange-500/30 h-auto py-4 flex flex-col items-center gap-2">
              <Shield className="w-6 h-6" />
              <span>Governance Check</span>
              <span className="text-xs text-gray-400">Compliance Agent</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="notifications" className="space-y-4">
        <TabsList className="bg-navy-800 border-navy-700">
          <TabsTrigger value="notifications" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Bell className="w-4 h-4 mr-2" /> Notifications
            {(statistics?.unread_notifications || 0) > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{statistics.unread_notifications}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="actions" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <Activity className="w-4 h-4 mr-2" /> Action Log
          </TabsTrigger>
          <TabsTrigger value="bridge" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <BarChart3 className="w-4 h-4 mr-2" /> Bridge Report
          </TabsTrigger>
          <TabsTrigger value="violations" className="data-[state=active]:bg-gold-500 data-[state=active]:text-navy-900">
            <AlertTriangle className="w-4 h-4 mr-2" /> Violations
            {violations.length > 0 && (
              <Badge className="ml-2 bg-yellow-500 text-navy-900">{violations.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader>
              <CardTitle className="text-white">Self-Healing Inbox</CardTitle>
              <CardDescription className="text-gray-400">Daily summary of autonomous agent actions</CardDescription>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications yet. Run an agent to see activity.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notif) => {
                    const AgentIcon = getAgentIcon(notif.agent_type);
                    return (
                      <div
                        key={notif.id}
                        className={`p-4 rounded-lg border ${notif.is_read ? 'bg-navy-900 border-navy-700' : 'bg-navy-900/50 border-gold-500/30'}`}
                        onClick={() => markNotificationRead(notif.id)}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${
                            notif.category === 'automated' ? 'bg-green-500/20' :
                            notif.category === 'proposed' ? 'bg-blue-500/20' :
                            'bg-yellow-500/20'
                          }`}>
                            <AgentIcon className={`w-5 h-5 ${
                              notif.category === 'automated' ? 'text-green-400' :
                              notif.category === 'proposed' ? 'text-blue-400' :
                              'text-yellow-400'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-white font-medium">{notif.title}</h4>
                              {!notif.is_read && <Badge className="bg-gold-500 text-navy-900">New</Badge>}
                            </div>
                            <p className="text-gray-400 text-sm mt-1">{notif.message}</p>
                            <p className="text-gray-500 text-xs mt-2">
                              {new Date(notif.created_at).toLocaleString()}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Action Log Tab */}
        <TabsContent value="actions">
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-white">Agent Action Log</CardTitle>
                  <CardDescription className="text-gray-400">Immutable audit trail with Logic Memos</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={filterAgent} onValueChange={setFilterAgent}>
                    <SelectTrigger className="w-32 bg-navy-900 border-navy-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-navy-800 border-navy-600">
                      <SelectItem value="all" className="text-white">All Agents</SelectItem>
                      <SelectItem value="fetch" className="text-white">Fetch</SelectItem>
                      <SelectItem value="match" className="text-white">Match</SelectItem>
                      <SelectItem value="heal" className="text-white">Heal</SelectItem>
                      <SelectItem value="compliance" className="text-white">Compliance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32 bg-navy-900 border-navy-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-navy-800 border-navy-600">
                      <SelectItem value="all" className="text-white">All Status</SelectItem>
                      <SelectItem value="automated" className="text-white">Automated</SelectItem>
                      <SelectItem value="proposed" className="text-white">Proposed</SelectItem>
                      <SelectItem value="flagged" className="text-white">Flagged</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow className="border-navy-700">
                    <TableHead className="text-gray-400">Agent</TableHead>
                    <TableHead className="text-gray-400">Action</TableHead>
                    <TableHead className="text-gray-400">Status</TableHead>
                    <TableHead className="text-gray-400">Confidence</TableHead>
                    <TableHead className="text-gray-400">Time</TableHead>
                    <TableHead className="text-gray-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredActions.map((action) => {
                    const AgentIcon = getAgentIcon(action.agent_type);
                    const confidence = action.logic_memo?.confidence_score || 0;
                    return (
                      <TableRow key={action.id} className="border-navy-700">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <AgentIcon className="w-4 h-4 text-gold-500" />
                            <span className="text-white capitalize">{action.agent_type}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-white">{action.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                            {action.delta_summary && (
                              <p className="text-gray-400 text-xs truncate max-w-xs">{action.delta_summary}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(action.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-navy-900 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  confidence >= 0.9 ? 'bg-green-500' :
                                  confidence >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-gray-400 text-sm">{(confidence * 100).toFixed(0)}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-400 text-sm">
                          {new Date(action.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-gray-400 hover:text-white p-1"
                              onClick={() => setSelectedAction(action)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {action.status === 'proposed' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-400 hover:text-green-300 p-1"
                                  onClick={() => approveAction(action.id)}
                                >
                                  <ThumbsUp className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-400 hover:text-red-300 p-1"
                                  onClick={() => rejectAction(action.id, 'User rejected')}
                                >
                                  <ThumbsDown className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {action.is_rollback_available && action.status === 'automated' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-orange-400 hover:text-orange-300 p-1"
                                onClick={() => { setSelectedAction(action); setShowRollbackDialog(true); }}
                              >
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bridge Report Tab */}
        <TabsContent value="bridge">
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader>
              <CardTitle className="text-white">Transformation Bridge Report</CardTitle>
              <CardDescription className="text-gray-400">
                Before vs After - How agents transformed raw ERP data into consolidated view
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bridgeReport && (
                <div className="space-y-6">
                  {/* Waterfall visualization */}
                  <div className="flex items-end gap-2 h-64 bg-navy-900 rounded-lg p-4">
                    {bridgeReport.bridge_entries.map((entry, idx) => {
                      const maxAmount = Math.max(...bridgeReport.bridge_entries.map(e => Math.abs(e.amount)));
                      const height = Math.abs(entry.amount) / maxAmount * 180;
                      const isPositive = entry.amount >= 0;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center justify-end gap-2">
                          <div
                            className={`w-full rounded-t ${
                              entry.category === 'Raw ERP Data' ? 'bg-gray-500' :
                              entry.category === 'Agent Additions' ? 'bg-green-500' :
                              entry.category === 'Agent Eliminations' ? 'bg-red-500' :
                              entry.category === 'Agent Adjustments' ? 'bg-yellow-500' :
                              'bg-gold-500'
                            }`}
                            style={{ height: `${height}px` }}
                          />
                          <div className="text-center">
                            <p className="text-xs text-gray-400">{entry.category}</p>
                            <p className={`text-sm font-semibold ${isPositive ? 'text-white' : 'text-red-400'}`}>
                              {isPositive ? '+' : ''}{formatCurrency(entry.amount)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Summary Table */}
                  <Table>
                    <TableHeader>
                      <TableRow className="border-navy-700">
                        <TableHead className="text-gray-400">Category</TableHead>
                        <TableHead className="text-gray-400">Description</TableHead>
                        <TableHead className="text-gray-400">Source</TableHead>
                        <TableHead className="text-gray-400 text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bridgeReport.bridge_entries.map((entry, idx) => (
                        <TableRow key={idx} className="border-navy-700">
                          <TableCell>
                            <Badge className={
                              entry.category === 'Raw ERP Data' ? 'bg-gray-500/20 text-gray-400' :
                              entry.category === 'Agent Additions' ? 'bg-green-500/20 text-green-400' :
                              entry.category === 'Agent Eliminations' ? 'bg-red-500/20 text-red-400' :
                              entry.category === 'Agent Adjustments' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-gold-500/20 text-gold-400'
                            }>
                              {entry.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-white">{entry.description}</TableCell>
                          <TableCell className="text-gray-400">{entry.source}</TableCell>
                          <TableCell className={`text-right font-semibold ${entry.amount >= 0 ? 'text-white' : 'text-red-400'}`}>
                            {formatCurrency(entry.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-4 gap-4 pt-4 border-t border-navy-700">
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Raw Total</p>
                      <p className="text-xl font-bold text-white">{formatCurrency(bridgeReport.raw_total)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">+ Additions</p>
                      <p className="text-xl font-bold text-green-400">{formatCurrency(bridgeReport.additions)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">- Eliminations</p>
                      <p className="text-xl font-bold text-red-400">{formatCurrency(bridgeReport.eliminations)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-gray-400 text-sm">Final Total</p>
                      <p className="text-xl font-bold text-gold-400">{formatCurrency(bridgeReport.final_total)}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Violations Tab */}
        <TabsContent value="violations">
          <Card className="bg-navy-800 border-navy-700">
            <CardHeader>
              <CardTitle className="text-white">Governance Violations</CardTitle>
              <CardDescription className="text-gray-400">IFRS/GAAP compliance issues requiring attention</CardDescription>
            </CardHeader>
            <CardContent>
              {violations.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-green-500" />
                  <p className="text-green-400 font-medium">All Clear!</p>
                  <p className="text-sm">No governance violations detected.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {violations.map((v) => (
                    <div key={v.id} className={`p-4 rounded-lg border ${
                      v.severity === 'critical' ? 'bg-red-500/10 border-red-500/30' :
                      v.severity === 'high' ? 'bg-orange-500/10 border-orange-500/30' :
                      'bg-yellow-500/10 border-yellow-500/30'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge className={
                              v.severity === 'critical' ? 'bg-red-500 text-white' :
                              v.severity === 'high' ? 'bg-orange-500 text-white' :
                              'bg-yellow-500 text-navy-900'
                            }>
                              {v.severity.toUpperCase()}
                            </Badge>
                            <span className="text-white font-medium">{v.violation_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                          </div>
                          <p className="text-gray-300 mt-2">{v.description}</p>
                          <p className="text-gray-500 text-sm mt-1">
                            <strong>Rule:</strong> {v.rule_violated}
                          </p>
                          <p className="text-blue-400 text-sm mt-1">
                            <strong>Action:</strong> {v.recommended_action}
                          </p>
                        </div>
                        {v.blocked && (
                          <Badge className="bg-red-600 text-white">BLOCKED</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Detail Dialog */}
      <Dialog open={!!selectedAction && !showRollbackDialog} onOpenChange={() => setSelectedAction(null)}>
        <DialogContent className="bg-navy-800 border-navy-700 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Action Details & Logic Memo</DialogTitle>
          </DialogHeader>
          {selectedAction && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Agent</Label>
                  <p className="text-white capitalize">{selectedAction.agent_type}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Status</Label>
                  <div>{getStatusBadge(selectedAction.status)}</div>
                </div>
              </div>

              {selectedAction.logic_memo && (
                <div className="bg-navy-900 p-4 rounded-lg space-y-3">
                  <h4 className="text-gold-400 font-semibold flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Logic Memo
                  </h4>
                  <div>
                    <Label className="text-gray-400">Action</Label>
                    <p className="text-white">{selectedAction.logic_memo.action}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Evidence</Label>
                    <p className="text-white">{selectedAction.logic_memo.evidence}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Logic</Label>
                    <p className="text-white">{selectedAction.logic_memo.logic}</p>
                  </div>
                  <div>
                    <Label className="text-gray-400">Confidence Score</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-32 bg-navy-800 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            selectedAction.logic_memo.confidence_score >= 0.9 ? 'bg-green-500' :
                            selectedAction.logic_memo.confidence_score >= 0.7 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${selectedAction.logic_memo.confidence_score * 100}%` }}
                        />
                      </div>
                      <span className="text-white">{(selectedAction.logic_memo.confidence_score * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              )}

              {selectedAction.delta_summary && (
                <div>
                  <Label className="text-gray-400">Summary</Label>
                  <p className="text-white">{selectedAction.delta_summary}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rollback Dialog */}
      <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
        <DialogContent className="bg-navy-800 border-navy-700">
          <DialogHeader>
            <DialogTitle className="text-white">Rollback Action</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Are you sure you want to rollback this automated action? This will:
            </p>
            <ul className="text-gray-400 text-sm list-disc pl-5 space-y-1">
              <li>Undo the action's effects</li>
              <li>Train the AI not to repeat this specific logic</li>
              <li>Create an audit record of the rollback</li>
            </ul>
            <div>
              <Label className="text-gray-300">Reason for rollback</Label>
              <Textarea
                value={rollbackReason}
                onChange={(e) => setRollbackReason(e.target.value)}
                className="bg-navy-900 border-navy-600 text-white mt-1"
                placeholder="Explain why this action should be rolled back..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRollbackDialog(false)} className="border-navy-600 text-white">
              Cancel
            </Button>
            <Button onClick={rollbackAction} className="bg-orange-600 hover:bg-orange-700 text-white">
              <RotateCcw className="w-4 h-4 mr-2" /> Rollback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AgentHubPage;
