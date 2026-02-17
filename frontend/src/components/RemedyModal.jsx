import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, CheckCircle, AlertTriangle, TrendingUp, DollarSign,
  Scale, Zap, Shield, Clock, ArrowRight, FileText, Building2,
  ExternalLink, Loader2, User, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

// Confidence score color mapping
const getConfidenceColor = (score) => {
  if (score >= 90) return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/50';
  if (score >= 80) return 'text-amber-400 bg-amber-500/20 border-amber-500/50';
  return 'text-red-400 bg-red-500/20 border-red-500/50';
};

const getConfidenceLabel = (score) => {
  if (score >= 90) return 'High Confidence';
  if (score >= 80) return 'Moderate Confidence';
  return 'Low Confidence';
};

// Remedy type icons and colors
const REMEDY_TYPE_CONFIG = {
  optimization: {
    icon: Zap,
    color: 'emerald',
    bgClass: 'bg-emerald-500/10 border-emerald-500/30',
    textClass: 'text-emerald-400',
    label: 'Optimization',
    description: 'Fix the issue using existing data'
  },
  investment: {
    icon: TrendingUp,
    color: 'blue',
    bgClass: 'bg-blue-500/10 border-blue-500/30',
    textClass: 'text-blue-400',
    label: 'Investment',
    description: 'Resolve with external capital'
  },
  compromise: {
    icon: Scale,
    color: 'amber',
    bgClass: 'bg-amber-500/10 border-amber-500/30',
    textClass: 'text-amber-400',
    label: 'Compromise',
    description: 'Balance trade-offs to stabilize'
  }
};

// Single Remedy Option Card
const RemedyOptionCard = ({ option, type, isSelected, onSelect, disabled }) => {
  if (!option) return null;
  
  const config = REMEDY_TYPE_CONFIG[type];
  const Icon = config.icon;
  const confidenceColor = getConfidenceColor(option.confidence_score);
  
  return (
    <motion.div
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={() => !disabled && onSelect(option.id, type)}
      className={`
        relative p-5 rounded-xl border-2 cursor-pointer transition-all
        ${isSelected 
          ? 'border-[#FCD34D] bg-[#FCD34D]/10 ring-2 ring-[#FCD34D]/30' 
          : `${config.bgClass} hover:border-[#FCD34D]/50`
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {/* Selected indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2">
          <div className="w-6 h-6 bg-[#FCD34D] rounded-full flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-[#0B1120]" />
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${config.bgClass}`}>
            <Icon className={`w-5 h-5 ${config.textClass}`} />
          </div>
          <div>
            <h4 className="font-semibold text-white">{option.title}</h4>
            <p className="text-xs text-gray-500">{config.label}</p>
          </div>
        </div>
        
        {/* Confidence badge */}
        <div className={`px-2 py-1 rounded-full text-xs font-bold border ${confidenceColor}`}>
          {option.confidence_score}%
        </div>
      </div>
      
      {/* Description */}
      <p className="text-sm text-gray-300 mb-4">{option.description}</p>
      
      {/* Impact */}
      <div className="p-3 rounded-lg bg-[#0B1120]/50 border border-gray-700/50 mb-4">
        <p className="text-xs text-gray-500 mb-1">Impact</p>
        <p className="text-sm text-gray-200">{option.impact_summary}</p>
      </div>
      
      {/* Value & warnings */}
      <div className="flex items-center justify-between">
        {option.estimated_value > 0 && (
          <div className="flex items-center space-x-1 text-sm">
            <DollarSign className="w-4 h-4 text-gray-500" />
            <span className="text-white font-medium">
              {option.currency === 'GBP' ? '£' : '$'}{option.estimated_value.toLocaleString()}
            </span>
          </div>
        )}
        
        {option.policy_warnings?.length > 0 && (
          <div className="flex items-center space-x-1 text-amber-400 text-xs">
            <AlertTriangle className="w-3 h-3" />
            <span>{option.policy_warnings.length} warning(s)</span>
          </div>
        )}
        
        {option.lender_search_link && (
          <a 
            href={option.lender_search_link}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center space-x-1 text-blue-400 text-xs hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            <span>Lender Search</span>
          </a>
        )}
      </div>
      
      {/* Auto-approve badge */}
      {option.auto_approve_eligible && (
        <div className="mt-3 flex items-center space-x-1 text-xs text-emerald-400">
          <Shield className="w-3 h-3" />
          <span>Eligible for auto-approval</span>
        </div>
      )}
    </motion.div>
  );
};

// Main Tri-Option Remedy Modal
export const TriOptionRemedyModal = ({ 
  remedy, 
  isOpen, 
  onClose, 
  onApprove, 
  onReject,
  isLoading = false 
}) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [approverName, setApproverName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      setSelectedOption(null);
      setSelectedType(null);
      setApproverName('');
    }
  }, [isOpen]);
  
  const handleSelect = (optionId, type) => {
    setSelectedOption(optionId);
    setSelectedType(type);
  };
  
  const handleApprove = async () => {
    if (!selectedOption || !approverName.trim()) {
      toast.error('Please select an option and enter your name');
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onApprove(remedy.id, selectedOption, approverName.trim());
      toast.success('Remedy approved successfully');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to approve remedy');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleReject = async () => {
    setIsSubmitting(true);
    try {
      await onReject(remedy.id, 'User rejected all options');
      toast.info('Remedy rejected - feedback logged for AI learning');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to reject remedy');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (!isOpen || !remedy) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        data-testid="tri-option-modal"
      >
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          onClick={onClose}
        />
        
        {/* Modal - Midnight & Gold styling */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl"
          style={{ backgroundColor: '#0B1120' }}
        >
          {/* Gold border accent */}
          <div className="absolute inset-0 rounded-2xl border-2 border-[#FCD34D]/30 pointer-events-none" />
          
          {/* Header */}
          <div 
            className="px-6 py-4 border-b border-[#FCD34D]/20"
            style={{ background: 'linear-gradient(to right, rgba(252, 211, 77, 0.1), transparent)' }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-2 rounded-lg bg-[#FCD34D]/20">
                  <Zap className="w-6 h-6 text-[#FCD34D]" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">AI Remediation</h2>
                  <p className="text-sm text-gray-400">Select the best option to resolve this issue</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
            {/* Problem summary */}
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-white mb-1">Issue Detected</h3>
                  <p className="text-sm text-gray-300">{remedy.problem_summary}</p>
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <Building2 className="w-3 h-3" />
                      <span>{remedy.entity_name}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <DollarSign className="w-3 h-3" />
                      <span>
                        {remedy.problem_currency === 'GBP' ? '£' : '$'}
                        {remedy.problem_value?.toLocaleString()}
                      </span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{remedy.affected_period}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Tri-option grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <RemedyOptionCard
                option={remedy.optimization_option}
                type="optimization"
                isSelected={selectedType === 'optimization'}
                onSelect={handleSelect}
                disabled={isSubmitting}
              />
              <RemedyOptionCard
                option={remedy.investment_option}
                type="investment"
                isSelected={selectedType === 'investment'}
                onSelect={handleSelect}
                disabled={isSubmitting}
              />
              <RemedyOptionCard
                option={remedy.compromise_option}
                type="compromise"
                isSelected={selectedType === 'compromise'}
                onSelect={handleSelect}
                disabled={isSubmitting}
              />
            </div>
            
            {/* Audit signature input */}
            <div className="p-4 rounded-xl bg-[#0B1120]/50 border border-gray-700">
              <div className="flex items-start space-x-3">
                <Lock className="w-5 h-5 text-[#FCD34D] flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-white mb-1">Audit Trail Signature</h4>
                  <p className="text-xs text-gray-500 mb-3">
                    Enter your full name to approve. This action is logged for compliance.
                  </p>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4 text-gray-500" />
                    <Input
                      value={approverName}
                      onChange={(e) => setApproverName(e.target.value)}
                      placeholder="Enter your full name..."
                      className="bg-[#0B1120] border-gray-700 text-white placeholder:text-gray-600 focus:border-[#FCD34D]"
                      disabled={isSubmitting}
                      data-testid="approver-name-input"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Read-only notice */}
            <div className="mt-4 flex items-center space-x-2 text-xs text-gray-500">
              <Shield className="w-4 h-4" />
              <span>
                This approval updates our internal Draft Ledger only. No changes will be made to your ERP system.
              </span>
            </div>
          </div>
          
          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handleReject}
              disabled={isSubmitting}
              className="text-gray-400 hover:text-red-400"
            >
              Reject All Options
            </Button>
            
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
                className="border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleApprove}
                disabled={!selectedOption || !approverName.trim() || isSubmitting}
                className="bg-[#FCD34D] hover:bg-[#FCD34D]/90 text-[#0B1120] font-semibold disabled:opacity-50"
                data-testid="execute-remedy-btn"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Execute Remedy
                  </>
                )}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Compact inline remedy card for Financial Management page
export const InlineRemedyCard = ({ anomaly, onGenerateRemedy }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  
  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerateRemedy(anomaly);
    } finally {
      setIsGenerating(false);
    }
  };
  
  return (
    <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div>
            <h4 className="font-medium text-white">{anomaly.description}</h4>
            <p className="text-xs text-gray-500 mt-1">
              {anomaly.entity_name} • {anomaly.type.replace(/_/g, ' ')}
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="bg-[#FCD34D] hover:bg-[#FCD34D]/90 text-[#0B1120] text-xs"
        >
          {isGenerating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            'Generate Fix'
          )}
        </Button>
      </div>
    </div>
  );
};

// Decision History item for Agent Hub
export const DecisionHistoryItem = ({ decision, onClick }) => {
  const statusColors = {
    approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    pending_approval: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
  };
  
  return (
    <div 
      onClick={onClick}
      className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-[#FCD34D]/30 cursor-pointer transition-all"
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Building2 className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-white">{decision.entity_name}</span>
        </div>
        <Badge className={statusColors[decision.status] || statusColors.pending_approval}>
          {decision.status.replace(/_/g, ' ')}
        </Badge>
      </div>
      
      <p className="text-sm text-gray-400 mb-2">{decision.problem_summary}</p>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{decision.anomaly_type?.replace(/_/g, ' ')}</span>
        {decision.approval_signature && (
          <span className="flex items-center space-x-1">
            <User className="w-3 h-3" />
            <span>{decision.approval_signature}</span>
          </span>
        )}
        <span>{new Date(decision.approved_at || decision.generated_at).toLocaleDateString()}</span>
      </div>
    </div>
  );
};

export default TriOptionRemedyModal;
