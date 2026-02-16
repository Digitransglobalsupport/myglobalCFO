import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, useApp } from '../App';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Plug, Map, X, ChevronRight, CheckCircle, 
  Shield, Sparkles, ArrowRight, Clock, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import confetti from 'canvas-confetti';

// Onboarding steps configuration
const ONBOARDING_STEPS = [
  {
    id: 1,
    key: 'company',
    title: 'Build Your Structure',
    icon: Building2,
    targetPath: '/dashboard/entity-tree',
    targetSelector: '[data-testid="create-entity-btn"], button:has-text("Add Entity")',
    header: 'Step 1: Build Your Structure',
    body: "Let's start by adding your first entity. Whether it's a single Standalone business or a complex Holdco with 100+ subsidiaries, define your hierarchy here to begin consolidation.",
    tip: "Define your structure now to enable real-time multi-entity visibility by tomorrow morning.",
    tipAuthor: "Igor's Tip",
    ctaText: 'Add Company',
    ctaPath: '/dashboard/entity-tree?openDialog=true'
  },
  {
    id: 2,
    key: 'integrations',
    title: 'Connect Your Data',
    icon: Plug,
    targetPath: '/dashboard/integrations',
    targetSelector: '[data-testid="integrations-page"]',
    header: 'Step 2: Connect Your Data Stack',
    body: "Securely link your ERP (Xero, Sage, NetSuite), Banks, and your Finance Inbox. Our 'Fetch Agent' will immediately begin pulling your live ledgers and contract data.",
    tip: "Connecting your email allows our AI to find 'hidden' MSAs and contracts for project profitability tracking.",
    tipAuthor: "Kayon's Tip",
    securityBadge: true,
    ctaText: 'Connect Integrations',
    ctaPath: '/dashboard/integrations'
  },
  {
    id: 3,
    key: 'mapping',
    title: 'Review AI Mapping',
    icon: Map,
    targetPath: '/dashboard/coa-mapping',
    targetSelector: '[data-testid="coa-mapping-page"]',
    header: 'Step 3: Review Your AI Mapping',
    body: "Our 'Match Agent' has already suggested a Group Schema for your Chart of Accounts. Review the auto-mappings to ensure your reports are board-ready and 100% accurate.",
    tip: "Once mapped, you can immediately begin building your own proprietary custom ratios.",
    tipAuthor: "Nosa's Tip",
    ctaText: 'Review Mappings',
    ctaPath: '/dashboard/coa-mapping'
  }
];

// Progress Bar Component (shown at top of dashboard)
export const OnboardingProgressBar = ({ onStepClick }) => {
  const { authAxios, user } = useAuth();
  const { companies } = useApp();
  const navigate = useNavigate();
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await authAxios.get('/onboarding/progress');
      setProgress(res.data);
    } catch (e) {
      console.error('Error fetching onboarding progress:', e);
    } finally {
      setLoading(false);
    }
  }, [authAxios]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Auto-detect step completion based on app state
  useEffect(() => {
    if (!progress) return;
    
    const checkAndUpdateProgress = async () => {
      // Step 1: Check if company exists
      if (companies.length > 0 && !progress.steps_completed?.includes(1)) {
        try {
          await authAxios.put('/onboarding/step', { step: 1, completed: true });
          fetchProgress();
        } catch (e) {
          console.error('Error updating step 1:', e);
        }
      }
    };
    
    checkAndUpdateProgress();
  }, [companies, progress, authAxios, fetchProgress]);

  if (loading || !progress || progress.dismissed || progress.completed_at) {
    return null;
  }

  const completedSteps = progress.steps_completed?.length || 0;
  const progressPercent = (completedSteps / 3) * 100;

  const handleStepClick = (step) => {
    if (onStepClick) {
      onStepClick(step);
    }
    navigate(step.ctaPath);
  };

  const handleDismiss = async () => {
    try {
      await authAxios.put('/onboarding/dismiss');
      setProgress({ ...progress, dismissed: true });
    } catch (e) {
      console.error('Error dismissing onboarding:', e);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-navy-800/90 via-slate-800/90 to-navy-800/90 backdrop-blur-sm border-b border-gold-500/30 px-6 py-3"
      data-testid="onboarding-progress-bar"
    >
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-gold-400" />
            <span className="text-sm font-semibold text-white">CFO Launchpad</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-1">
            {ONBOARDING_STEPS.map((step, index) => {
              const isCompleted = progress.steps_completed?.includes(step.id);
              const isCurrent = progress.current_step === step.id;
              const StepIcon = step.icon;
              
              return (
                <React.Fragment key={step.id}>
                  <button
                    onClick={() => handleStepClick(step)}
                    className={`flex items-center space-x-2 px-3 py-1.5 rounded-full transition-all ${
                      isCompleted 
                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                        : isCurrent 
                          ? 'bg-gold-500/20 text-gold-400 hover:bg-gold-500/30 ring-1 ring-gold-500/50' 
                          : 'bg-slate-700/50 text-gray-400 hover:bg-slate-700'
                    }`}
                    data-testid={`onboarding-step-${step.id}`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-4 h-4" />
                    )}
                    <span className="text-xs font-medium hidden lg:inline">{step.title}</span>
                  </button>
                  {index < ONBOARDING_STEPS.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-gray-600" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Progress value={progressPercent} className="w-24 h-2 bg-slate-700" />
            <span className="text-xs text-gray-400">{completedSteps}/3</span>
          </div>
          
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            <span>~5 min to first insight</span>
          </div>

          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            title="Dismiss tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// Spotlight Tooltip Component
export const OnboardingSpotlight = ({ step, onCTAClick, onDismiss, userName }) => {
  const StepIcon = step.icon;

  const handleCTA = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCTAClick) {
      onCTAClick(step);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
      >
        {/* Dimmed overlay */}
        <div 
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={onDismiss}
        />
        
        {/* Tooltip card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: "spring", duration: 0.5 }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="bg-gradient-to-br from-slate-900 via-navy-900 to-slate-900 rounded-2xl border border-gold-500/30 shadow-2xl shadow-gold-500/10 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-gold-500/20 to-transparent px-6 py-4 border-b border-gold-500/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gold-500/20 rounded-lg">
                    <StepIcon className="w-6 h-6 text-gold-400" />
                  </div>
                  <div>
                    <p className="text-xs text-gold-400 font-medium uppercase tracking-wider">Step {step.id} of 3</p>
                    <h3 className="text-lg font-bold text-white">{step.header}</h3>
                  </div>
                </div>
                <button
                  onClick={onDismiss}
                  className="text-gray-500 hover:text-white transition-colors p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              <p className="text-gray-300 leading-relaxed">
                {userName && step.id === 1 ? (
                  <>Welcome, <span className="text-gold-400 font-medium">{userName}</span>. {step.body}</>
                ) : (
                  step.body
                )}
              </p>

              {/* CFO Value Tip */}
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Zap className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-blue-400 font-semibold mb-1">{step.tipAuthor}</p>
                    <p className="text-sm text-blue-200">{step.tip}</p>
                  </div>
                </div>
              </div>

              {/* Security Badge for Step 2 */}
              {step.securityBadge && (
                <div className="flex items-center space-x-2 text-sm">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-green-400">Bank-level encryption</span>
                  <span className="text-gray-500">•</span>
                  <a href="#" className="text-blue-400 hover:underline">How we protect your data</a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-800/50 border-t border-slate-700 flex items-center justify-between">
              <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-white text-sm transition-colors"
              >
                Skip tour
              </button>
              <button
                onClick={handleCTA}
                className="bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold px-6 py-2 rounded-md flex items-center"
                data-testid={`onboarding-cta-step-${step.id}`}
              >
                {step.ctaText}
                <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Celebration Modal
export const OnboardingCelebration = ({ onComplete }) => {
  useEffect(() => {
    // Trigger confetti
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#D4AF37', '#FFD700', '#FFA500']
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#D4AF37', '#FFD700', '#FFA500']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  }, []);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center"
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", duration: 0.6 }}
          className="relative bg-gradient-to-br from-slate-900 via-navy-900 to-slate-900 rounded-2xl border border-gold-500/50 shadow-2xl shadow-gold-500/20 p-8 max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-20 h-20 bg-gradient-to-br from-gold-400 to-gold-600 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-navy-900" />
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold text-white mb-2"
          >
            You're All Set!
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-gray-400 mb-6"
          >
            Your Command Centre is now fully activated. The AI Advisor is analyzing your data and preparing your first executive insights.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-6"
          >
            <div className="flex items-center justify-center space-x-2 text-green-400">
              <Sparkles className="w-5 h-5" />
              <span className="font-medium">Data Health Check: Running...</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              onClick={onComplete}
              className="bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold px-8 py-3"
              data-testid="onboarding-complete-btn"
            >
              View Your Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Main Onboarding Controller Hook
export const useOnboarding = () => {
  const { authAxios, user } = useAuth();
  const { companies } = useApp();
  const location = useLocation();
  const [progress, setProgress] = useState(null);
  const [showSpotlight, setShowSpotlight] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);

  const fetchProgress = useCallback(async () => {
    try {
      const res = await authAxios.get('/onboarding/progress');
      setProgress(res.data);
      return res.data;
    } catch (e) {
      console.error('Error fetching onboarding progress:', e);
      return null;
    }
  }, [authAxios]);

  const markStepComplete = useCallback(async (stepId) => {
    try {
      await authAxios.put('/onboarding/step', { step: stepId, completed: true });
      const newProgress = await fetchProgress();
      
      // Check if all steps are complete
      if (newProgress?.steps_completed?.length === 3) {
        setShowCelebration(true);
      }
      
      return newProgress;
    } catch (e) {
      console.error('Error marking step complete:', e);
    }
  }, [authAxios, fetchProgress]);

  const dismissOnboarding = useCallback(async () => {
    try {
      await authAxios.put('/onboarding/dismiss');
      setShowSpotlight(false);
      setProgress(prev => ({ ...prev, dismissed: true }));
    } catch (e) {
      console.error('Error dismissing onboarding:', e);
    }
  }, [authAxios]);

  const startTour = useCallback(() => {
    if (progress && !progress.dismissed && !progress.completed_at) {
      const nextStep = ONBOARDING_STEPS.find(s => !progress.steps_completed?.includes(s.id));
      if (nextStep) {
        setCurrentStep(nextStep);
        setShowSpotlight(true);
      }
    }
  }, [progress]);

  // Initialize on mount
  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  // Auto-start tour for new users on first login
  useEffect(() => {
    if (progress && !progress.dismissed && !progress.completed_at && progress.steps_completed?.length === 0) {
      // Small delay to let the page render
      const timer = setTimeout(() => {
        startTour();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [progress, startTour]);

  return {
    progress,
    showSpotlight,
    showCelebration,
    currentStep,
    setShowSpotlight,
    setShowCelebration,
    markStepComplete,
    dismissOnboarding,
    startTour,
    fetchProgress
  };
};

// Empty State Component for incomplete onboarding
export const OnboardingEmptyState = ({ step, onAction }) => {
  const StepIcon = step?.icon || Building2;
  
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="relative mb-6">
        {/* Skeleton pulse effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 rounded-lg animate-pulse" />
        <div className="relative p-8 bg-slate-800/50 rounded-lg border border-slate-700">
          <StepIcon className="w-16 h-16 text-gray-600" />
        </div>
      </div>
      
      <h3 className="text-xl font-semibold text-white mb-2">
        {step ? `Complete ${step.title} to unlock` : 'Complete setup to unlock'}
      </h3>
      <p className="text-gray-400 text-center max-w-md mb-6">
        {step?.body || 'Complete the onboarding steps to see your real-time financial insights.'}
      </p>
      
      {onAction && (
        <Button
          onClick={onAction}
          className="bg-gold-500 hover:bg-gold-600 text-navy-900"
        >
          {step?.ctaText || 'Continue Setup'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      )}
    </div>
  );
};

export { ONBOARDING_STEPS };
