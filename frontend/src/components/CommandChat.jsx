import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare, X, Send, Bot, User, AlertTriangle,
  CheckCircle, Zap, Building2, ArrowRight, Loader2,
  Sparkles, Bell
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useAuth, API } from '../App';

// Proactive nudge message component
const ProactiveNudge = ({ nudge, onAction, onDismiss }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      className="bg-gradient-to-r from-amber-500/20 to-transparent border border-amber-500/30 rounded-xl p-4 mb-4"
    >
      <div className="flex items-start space-x-3">
        <div className="p-2 rounded-lg bg-amber-500/20">
          <Sparkles className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-white text-sm">AI Alert</h4>
            <button
              onClick={onDismiss}
              className="text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-gray-300 mb-3">{nudge.message}</p>
          
          {nudge.stats && (
            <div className="flex items-center space-x-4 mb-3 text-xs text-gray-500">
              {nudge.stats.healed > 0 && (
                <span className="flex items-center space-x-1 text-emerald-400">
                  <CheckCircle className="w-3 h-3" />
                  <span>{nudge.stats.healed} healed</span>
                </span>
              )}
              {nudge.stats.pending > 0 && (
                <span className="flex items-center space-x-1 text-amber-400">
                  <AlertTriangle className="w-3 h-3" />
                  <span>{nudge.stats.pending} need review</span>
                </span>
              )}
            </div>
          )}
          
          <Button
            size="sm"
            onClick={() => onAction(nudge)}
            className="bg-amber-500 hover:bg-amber-600 text-black text-xs"
          >
            Review Suggestions
            <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

// Chat message component
const ChatMessage = ({ message, isBot }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start space-x-3 ${isBot ? '' : 'flex-row-reverse space-x-reverse'}`}
    >
      <div className={`p-2 rounded-lg ${isBot ? 'bg-[#FCD34D]/20' : 'bg-blue-500/20'}`}>
        {isBot ? (
          <Bot className="w-4 h-4 text-[#FCD34D]" />
        ) : (
          <User className="w-4 h-4 text-blue-400" />
        )}
      </div>
      <div className={`max-w-[80%] ${isBot ? '' : 'text-right'}`}>
        <div 
          className={`p-3 rounded-xl ${
            isBot 
              ? 'bg-slate-800 border border-slate-700 text-gray-200' 
              : 'bg-blue-500/20 border border-blue-500/30 text-blue-100'
          }`}
        >
          <p className="text-sm">{message.text}</p>
          
          {/* Rich media card for remedy suggestions */}
          {message.remedy && (
            <div className="mt-3 p-3 rounded-lg bg-[#0B1120] border border-[#FCD34D]/30">
              <div className="flex items-center space-x-2 mb-2">
                <Zap className="w-4 h-4 text-[#FCD34D]" />
                <span className="text-xs font-semibold text-[#FCD34D]">
                  {message.remedy.options} Options Available
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{message.remedy.summary}</p>
              <Button
                size="sm"
                onClick={message.remedy.onReview}
                className="w-full bg-[#FCD34D] hover:bg-[#FCD34D]/90 text-[#0B1120] text-xs"
              >
                Review Fix Options
              </Button>
            </div>
          )}
          
          {/* Entity card */}
          {message.entity && (
            <div className="mt-2 p-2 rounded bg-slate-700/50 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-gray-500" />
              <span className="text-xs text-gray-400">{message.entity}</span>
            </div>
          )}
        </div>
        <span className="text-xs text-gray-600 mt-1 block">
          {new Date(message.timestamp).toLocaleTimeString()}
        </span>
      </div>
    </motion.div>
  );
};

// Main Command Chat component
export const CommandChat = ({ 
  isOpen, 
  onClose, 
  onOpenRemedyModal,
  pendingRemedies = [],
  userName = ''
}) => {
  const { authAxios } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [nudges, setNudges] = useState([]);
  const messagesEndRef = useRef(null);
  
  // Initial greeting and check for pending issues
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const greeting = getGreeting(userName);
      setMessages([{
        id: 1,
        text: greeting,
        isBot: true,
        timestamp: new Date()
      }]);
      
      // Check for pending remediations
      checkForAnomalies();
    }
  }, [isOpen, userName]);
  
  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const getGreeting = (name) => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const firstName = name?.split(' ')[0] || '';
    return `${timeGreeting}${firstName ? `, ${firstName}` : ''}! I'm your Strategic Deputy. I've been monitoring your financial data while you were away. How can I assist you today?`;
  };
  
  const checkForAnomalies = async () => {
    try {
      const res = await authAxios.get('/remediation/anomalies/detect');
      const anomalies = res.data?.anomalies || [];
      
      if (anomalies.length > 0) {
        // Create proactive nudge
        const healedCount = anomalies.filter(a => a.type === 'coa_mapping_error').length;
        const pendingCount = anomalies.filter(a => a.type !== 'coa_mapping_error').length;
        
        const nudge = {
          id: Date.now(),
          message: `I've analyzed your entities and found ${anomalies.length} items that need attention. ${healedCount > 0 ? `I've prepared fixes for ${healedCount} mapping errors.` : ''} ${pendingCount > 0 ? `${pendingCount} require your review.` : ''}`,
          stats: {
            healed: healedCount,
            pending: pendingCount
          },
          anomalies
        };
        
        setNudges([nudge]);
        
        // Add message about findings
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: nudge.message,
            isBot: true,
            timestamp: new Date()
          }]);
        }, 1500);
      }
    } catch (err) {
      console.error('Error checking for anomalies:', err);
    }
  };
  
  const handleNudgeAction = (nudge) => {
    // Navigate to remediation view or open modal
    if (nudge.anomalies?.length > 0) {
      onOpenRemedyModal?.(nudge.anomalies[0]);
    }
    setNudges(prev => prev.filter(n => n.id !== nudge.id));
  };
  
  const handleNudgeDismiss = (nudge) => {
    setNudges(prev => prev.filter(n => n.id !== nudge.id));
  };
  
  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    const userMessage = {
      id: Date.now(),
      text: inputValue,
      isBot: false,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Simple command parsing
      const lowerInput = inputValue.toLowerCase();
      let botResponse;
      
      if (lowerInput.includes('status') || lowerInput.includes('how') || lowerInput.includes('report')) {
        botResponse = {
          text: "Based on my analysis, here's your current status: All entities are synced with ERPs. I've identified 3 potential optimizations. Your cash runway is healthy at 145 days. Would you like me to show the optimization suggestions?",
          isBot: true,
          timestamp: new Date()
        };
      } else if (lowerInput.includes('fix') || lowerInput.includes('heal') || lowerInput.includes('remedy')) {
        // Trigger remedy generation
        const anomaliesRes = await authAxios.get('/remediation/anomalies/detect');
        const anomalies = anomaliesRes.data?.anomalies || [];
        
        if (anomalies.length > 0) {
          botResponse = {
            text: `I found ${anomalies.length} issues that can be remediated. Here's the first one:`,
            isBot: true,
            timestamp: new Date(),
            remedy: {
              options: 3,
              summary: anomalies[0].description,
              onReview: () => onOpenRemedyModal?.(anomalies[0])
            }
          };
        } else {
          botResponse = {
            text: "Great news! I haven't detected any issues requiring remediation at this time. Your financial data looks clean.",
            isBot: true,
            timestamp: new Date()
          };
        }
      } else if (lowerInput.includes('approve') || lowerInput.includes('pending')) {
        const pendingRes = await authAxios.get('/remediation/pending');
        const pending = pendingRes.data?.remediations || [];
        
        botResponse = {
          text: pending.length > 0 
            ? `You have ${pending.length} remediation(s) pending approval. Would you like to review them now?`
            : "You have no pending remediations. Everything is up to date!",
          isBot: true,
          timestamp: new Date()
        };
      } else {
        botResponse = {
          text: "I understand you're asking about " + inputValue.substring(0, 50) + "... I can help with: checking status, generating fixes, reviewing pending approvals, or analyzing your entities. What would you like to do?",
          isBot: true,
          timestamp: new Date()
        };
      }
      
      setMessages(prev => [...prev, { id: Date.now(), ...botResponse }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "I encountered an error processing your request. Please try again.",
        isBot: true,
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="fixed bottom-4 right-4 w-96 h-[500px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50"
        data-testid="command-chat"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between bg-gradient-to-r from-[#FCD34D]/10 to-transparent">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-[#FCD34D]/20">
              <Bot className="w-5 h-5 text-[#FCD34D]" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Strategic Deputy</h3>
              <p className="text-xs text-gray-500">Always watching your financials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Proactive nudges */}
          <AnimatePresence>
            {nudges.map(nudge => (
              <ProactiveNudge
                key={nudge.id}
                nudge={nudge}
                onAction={handleNudgeAction}
                onDismiss={() => handleNudgeDismiss(nudge)}
              />
            ))}
          </AnimatePresence>
          
          {/* Chat messages */}
          {messages.map(message => (
            <ChatMessage key={message.id} message={message} isBot={message.isBot} />
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="flex items-center space-x-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Thinking...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center space-x-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything..."
              className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-gray-600 focus:border-[#FCD34D]"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="bg-[#FCD34D] hover:bg-[#FCD34D]/90 text-[#0B1120]"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Floating chat button
export const ChatButton = ({ onClick, hasNotifications = false }) => {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-4 right-4 w-14 h-14 bg-[#FCD34D] rounded-full flex items-center justify-center shadow-lg z-40"
      data-testid="chat-button"
    >
      <MessageSquare className="w-6 h-6 text-[#0B1120]" />
      {hasNotifications && (
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
          <Bell className="w-3 h-3 text-white" />
        </span>
      )}
    </motion.button>
  );
};

export default CommandChat;
