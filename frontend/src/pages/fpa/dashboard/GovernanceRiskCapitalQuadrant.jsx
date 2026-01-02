import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, TrendingUp, AlertTriangle, DollarSign } from 'lucide-react';

const GovernanceRiskCapitalQuadrant = ({ data, userId }) => {
  // Placeholder component for future Governance, Risk, & Strategic Capital features
  
  return (
    <Card className="h-full">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b">
        <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
          <Shield className="h-5 w-5 text-purple-600" />
          Governance, Risk, & Strategic Capital
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        {/* Coming Soon Message */}
        <div className="text-center py-12">
          <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-10 w-10 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Strategic Governance Dashboard
          </h3>
          <p className="text-sm text-slate-600 mb-6 max-w-md mx-auto">
            Comprehensive risk management, compliance tracking, and strategic capital allocation tools coming soon.
          </p>
          
          {/* Feature Preview Cards */}
          <div className="grid grid-cols-1 gap-3 mt-6">
            <div className="p-4 bg-white border border-slate-200 rounded-lg text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <h4 className="font-semibold text-sm text-slate-900">Risk Management</h4>
              </div>
              <p className="text-xs text-slate-600">
                Real-time risk scoring, exposure monitoring, and mitigation strategies
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-lg text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <h4 className="font-semibold text-sm text-slate-900">Strategic Capital Allocation</h4>
              </div>
              <p className="text-xs text-slate-600">
                Optimize capital deployment across entities, projects, and initiatives
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-lg text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-purple-600" />
                </div>
                <h4 className="font-semibold text-sm text-slate-900">Compliance & Governance</h4>
              </div>
              <p className="text-xs text-slate-600">
                Track regulatory requirements, audit trails, and governance policies
              </p>
            </div>

            <div className="p-4 bg-white border border-slate-200 rounded-lg text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-yellow-600" />
                </div>
                <h4 className="font-semibold text-sm text-slate-900">Investment Portfolio</h4>
              </div>
              <p className="text-xs text-slate-600">
                Monitor strategic investments, ROI tracking, and portfolio performance
              </p>
            </div>
          </div>
        </div>

        {/* Status Badge */}
        <div className="p-3 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg border border-purple-300">
          <p className="text-xs text-center text-purple-900 font-medium">
            🚀 Feature in development - Stay tuned for updates
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default GovernanceRiskCapitalQuadrant;
