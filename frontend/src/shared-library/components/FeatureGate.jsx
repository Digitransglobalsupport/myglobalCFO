/**
 * FeatureGate - Component for gating premium features by plan
 * 
 * Renders children only if the current org's plan includes the feature.
 * Shows upgrade prompt otherwise.
 * 
 * Usage:
 *   <FeatureGate feature="ai_editing">
 *     <AIEditingPanel />
 *   </FeatureGate>
 */

import React from 'react';
import { usePlanFeatures, FEATURE_DEFINITIONS } from '../hooks/usePlanFeatures';
import { Lock, Sparkles, ArrowRight } from 'lucide-react';

// Import shadcn components - adjust path as needed
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

/**
 * Main FeatureGate component
 */
export const FeatureGate = ({ 
  feature,
  children,
  fallback = null,
  showUpgradePrompt = true,
  onUpgradeClick = null
}) => {
  const { hasFeature, getRequiredPlan, loading, plan } = usePlanFeatures();
  
  // Loading state
  if (loading) {
    return (
      <div className="animate-pulse bg-slate-800 rounded-lg h-32" />
    );
  }
  
  // Feature is available
  if (hasFeature(feature)) {
    return children;
  }
  
  // Feature not available - show fallback or upgrade prompt
  if (fallback) {
    return fallback;
  }
  
  if (!showUpgradePrompt) {
    return null;
  }
  
  // Default upgrade prompt
  const featureInfo = FEATURE_DEFINITIONS[feature] || { name: feature, description: '' };
  const requiredPlan = getRequiredPlan(feature);
  
  return (
    <UpgradePrompt
      featureName={featureInfo.name}
      featureDescription={featureInfo.description}
      requiredPlan={requiredPlan}
      currentPlan={plan?.name || 'Free'}
      onUpgradeClick={onUpgradeClick}
    />
  );
};

/**
 * Upgrade prompt card
 */
export const UpgradePrompt = ({
  featureName,
  featureDescription,
  requiredPlan,
  currentPlan,
  onUpgradeClick
}) => {
  const handleUpgrade = () => {
    if (onUpgradeClick) {
      onUpgradeClick(requiredPlan);
    } else {
      // Default: navigate to billing
      window.location.href = '/settings/billing';
    }
  };
  
  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-yellow-500" />
        </div>
        <CardTitle className="text-white text-xl">
          {featureName}
        </CardTitle>
        <CardDescription className="text-gray-400">
          {featureDescription}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <div className="flex items-center justify-center space-x-2">
          <Badge variant="outline" className="border-gray-600 text-gray-400">
            {currentPlan}
          </Badge>
          <ArrowRight className="w-4 h-4 text-gray-500" />
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)}
          </Badge>
        </div>
        
        <p className="text-sm text-gray-500">
          Upgrade to {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} to unlock this feature
        </p>
        
        <Button 
          onClick={handleUpgrade}
          className="bg-blue-500 hover:bg-blue-600 text-white"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Upgrade Plan
        </Button>
      </CardContent>
    </Card>
  );
};

/**
 * Inline feature check (for smaller UI elements)
 */
export const FeatureCheck = ({ 
  feature, 
  children, 
  lockedContent = null 
}) => {
  const { hasFeature } = usePlanFeatures();
  
  if (hasFeature(feature)) {
    return children;
  }
  
  return lockedContent || (
    <div className="opacity-50 cursor-not-allowed relative">
      {children}
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 rounded">
        <Lock className="w-4 h-4 text-gray-400" />
      </div>
    </div>
  );
};

/**
 * Feature badge - shows if feature is included in plan
 */
export const FeatureBadge = ({ feature }) => {
  const { hasFeature } = usePlanFeatures();
  const featureInfo = FEATURE_DEFINITIONS[feature];
  
  if (hasFeature(feature)) {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
        <Sparkles className="w-3 h-3 mr-1" />
        {featureInfo?.name || feature}
      </Badge>
    );
  }
  
  return (
    <Badge variant="outline" className="border-gray-600 text-gray-500">
      <Lock className="w-3 h-3 mr-1" />
      {featureInfo?.name || feature}
    </Badge>
  );
};

/**
 * Limit gate - shows warning when approaching or exceeding limits
 */
export const LimitGate = ({
  limitKey,
  currentValue,
  children,
  warningThreshold = 0.8,
  onLimitReached = null
}) => {
  const { limits, isLimitExceeded, getRemainingQuota } = usePlanFeatures();
  
  const limit = limits[limitKey];
  const remaining = getRemainingQuota(limitKey, currentValue);
  const exceeded = isLimitExceeded(limitKey, currentValue);
  const approaching = limit > 0 && (currentValue / limit) >= warningThreshold;
  
  if (exceeded) {
    return (
      <Card className="bg-red-500/10 border-red-500/30">
        <CardContent className="py-4 text-center">
          <Lock className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-red-400 font-medium">Limit Reached</p>
          <p className="text-sm text-gray-400 mt-1">
            You've reached the maximum of {limit} {limitKey.replace(/_/g, ' ')}
          </p>
          <Button 
            size="sm" 
            className="mt-3 bg-red-500 hover:bg-red-600"
            onClick={onLimitReached}
          >
            Upgrade Plan
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      {approaching && (
        <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">
            ⚠️ Approaching limit: {remaining} {limitKey.replace(/_/g, ' ')} remaining
          </p>
        </div>
      )}
      {children}
    </>
  );
};

export default FeatureGate;
