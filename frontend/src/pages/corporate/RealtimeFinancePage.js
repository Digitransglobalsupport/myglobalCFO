import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BarChart3, Layers, RefreshCcw, Bot, Wallet, Calculator,
  Shield, CheckCircle, ArrowRight, Play, Globe, Target,
  Building2, FileText
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';
import { CorporateHeader, CorporateFooter } from './HomePage';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

// Trial Dialog - Light Theme
const TrialDialog = ({ open, onOpenChange }) => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post(`${API}/auth/register`, { email, password, name });
      localStorage.setItem('token', res.data.token);
      toast.success('Welcome to Realtime Finance! Your trial has started.');
      onOpenChange(false);
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-[#87c71f]/10 rounded-2xl flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-[#87c71f]" />
            </div>
          </div>
          <DialogTitle className="text-[#005994] text-2xl font-display text-center">
            Start Your Free Trial
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <Label className="text-gray-700">Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
              placeholder="John Smith"
              required
            />
          </div>
          <div>
            <Label className="text-gray-700">Work Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
              placeholder="john@company.com"
              required
            />
          </div>
          <div>
            <Label className="text-gray-700">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
              placeholder="••••••••"
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-[#87c71f] hover:bg-[#9ed93d] text-white font-semibold" 
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Start Free Trial'}
          </Button>
          <p className="text-center text-[#969696] text-sm">
            No credit card required • 14-day free trial
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const RealtimeFinancePage = () => {
  const [showTrial, setShowTrial] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  const features = [
    {
      icon: Building2,
      title: 'Multi-Entity Consolidation',
      desc: 'Manage multiple companies from a single dashboard with real-time FX conversion across 130+ entities.'
    },
    {
      icon: RefreshCcw,
      title: 'Auto-Reconciliation',
      desc: 'Automated transaction matching with bank feed integration. Reclaim 80% of your time.'
    },
    {
      icon: Bot,
      title: 'AI Financial Advisor',
      desc: 'Get intelligent recommendations and predictive forecasting powered by advanced AI.'
    },
    {
      icon: Globe,
      title: 'Real-Time FX',
      desc: 'Automatic currency conversion with live exchange rates across all your global entities.'
    },
    {
      icon: Target,
      title: 'Custom KPIs',
      desc: 'Build bespoke KPIs and custom RAG alerts that follow your rules, not industry averages.'
    },
    {
      icon: Shield,
      title: 'Audit-Ready',
      desc: 'Maintain absolute transparency with automated audit trails and regulatory-ready reporting.'
    }
  ];

  const capabilities = [
    {
      icon: Wallet,
      title: 'Strategic Capital',
      headline: 'Loan Tracking & Covenant Monitoring',
      desc: 'Monitor "Headroom" ratios in real-time to protect bank covenants and bridge cash gaps via integrated lenders.'
    },
    {
      icon: Calculator,
      title: 'FP&A Planning',
      headline: 'Budgeting, Forecasting & Scenario Modeling',
      desc: 'Stress-test non-uniform assumptions in a safe sandbox environment without corrupting your historical records.'
    },
    {
      icon: FileText,
      title: 'Compliance',
      headline: 'Audit Trails & Regulatory Reporting',
      desc: 'Automated compliance workflows with complete audit trails for GDPR, FCA, and international regulations.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <CorporateHeader 
        onLoginClick={() => setShowAuth(true)} 
        onContactClick={() => navigate('/contact')}
      />

      {/* Hero Section */}
      <section className="relative pt-44 pb-20 overflow-hidden bg-white">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center px-4 py-2 bg-[#87c71f]/10 rounded-full text-[#87c71f] text-sm mb-6 border border-[#87c71f]/20">
                <BarChart3 className="w-4 h-4 mr-2" />
                SaaS Platform
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#005994] mb-6 leading-tight">
                Your Enterprise CFO Agent
              </h1>
              <p className="text-lg text-[#969696] max-w-xl mb-10 leading-relaxed">
                Automate finance operations, reconciliations, and reporting across multi-entity 
                organizations in real-time. Transition from &quot;Data Collector&quot; to &quot;Strategic Architect.&quot;
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="bg-[#87c71f] hover:bg-[#9ed93d] text-white font-semibold px-8 h-12"
                  onClick={() => setShowTrial(true)}
                  data-testid="start-free-trial-btn"
                >
                  Start Free Trial <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-[#005994] text-[#005994] hover:bg-[#005994]/5 px-8 h-12"
                  onClick={() => navigate('/contact')}
                >
                  <Play className="mr-2 w-5 h-5" /> Watch Demo
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <img 
                src="https://images.pexels.com/photos/7681091/pexels-photo-7681091.jpeg" 
                alt="Financial dashboard analytics" 
                className="rounded-2xl shadow-2xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Strip */}
      <section className="py-8 border-y border-gray-100 bg-[#005994]">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {[
              { value: '14+', label: 'ERP Integrations' },
              { value: '7D', label: 'Planning Dimensions' },
              { value: 'Real-time', label: 'Dashboard Updates' },
              { value: '99.9%', label: 'Uptime SLA' }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl md:text-3xl font-bold text-white">{item.value}</div>
                <div className="text-white/70 text-sm">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Tiles */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-[#005994] text-center mb-4">
            The Intelligence Hub
          </h2>
          <p className="text-[#969696] text-center max-w-2xl mx-auto mb-12">
            Everything you need to transform financial operations
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className="bg-[#FAFAFA] rounded-xl p-6 border border-gray-100 hover:border-[#87c71f]/30 transition-all hover:shadow-elevated group"
              >
                <div className="w-12 h-12 bg-[#87c71f]/10 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#87c71f]/15 transition-colors">
                  <feature.icon className="w-6 h-6 text-[#87c71f]" />
                </div>
                <h3 className="text-[#005994] font-semibold mb-2">{feature.title}</h3>
                <p className="text-[#969696] text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Deep Capabilities */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-[#005994] text-center mb-4">
            Deep Capabilities
          </h2>
          <p className="text-[#969696] text-center max-w-2xl mx-auto mb-12">
            Comprehensive financial management at your fingertips
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {capabilities.map((cap, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-gray-100 shadow-subtle hover:shadow-elevated transition-all">
                <div className="w-14 h-14 bg-[#87c71f]/10 rounded-xl flex items-center justify-center mb-6">
                  <cap.icon className="w-7 h-7 text-[#87c71f]" />
                </div>
                <h3 className="font-display text-xl text-[#005994] mb-2">{cap.title}</h3>
                <p className="text-[#87c71f] text-sm font-medium mb-4">{cap.headline}</p>
                <p className="text-[#969696] leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integration Partners */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-[#005994] text-center mb-4">
            Seamless Integrations
          </h2>
          <p className="text-[#969696] text-center max-w-2xl mx-auto mb-12">
            Connect to your existing systems with our secure API engine
          </p>

          <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
            {['NetSuite', 'Sage', 'Xero', 'QuickBooks', 'SAP', 'Oracle', 'Dynamics 365'].map((name, i) => (
              <div 
                key={i}
                className="bg-[#FAFAFA] rounded-lg px-6 py-4 text-[#005994] font-medium border border-gray-100 hover:border-[#005994]/30 transition-all"
              >
                {name}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#005994]">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-8 h-8 text-[#87c71f]" />
            </div>
            <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
              Ready to Transform Your Finance Operations?
            </h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto">
              Join leading enterprises who have made the shift from data janitor to strategic architect.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-[#87c71f] hover:bg-[#9ed93d] text-white font-semibold px-8"
                onClick={() => setShowTrial(true)}
              >
                Start Free Trial
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10 px-8"
                onClick={() => navigate('/contact')}
              >
                Request Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      <CorporateFooter />

      {/* Trial Dialog */}
      <TrialDialog open={showTrial} onOpenChange={setShowTrial} />
    </div>
  );
};

export default RealtimeFinancePage;
