import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Layers, Users, CheckCircle, ArrowRight, 
  Target, Zap, AlertTriangle, TrendingUp, Eye, BarChart3,
  Activity, Lock, RefreshCcw, GitBranch, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter, GlobalFooterCTA } from './HomePage';

// RAG Status Card - Control Tower Style
const RAGStatusCard = ({ title, status, metric, trend, description }) => {
  const statusColors = {
    green: { bg: 'bg-[#87C71F]', glow: 'glow-green', label: 'On Track' },
    amber: { bg: 'bg-amber-500', glow: '', label: 'At Risk' },
    red: { bg: 'bg-red-500', glow: '', label: 'Critical' }
  };
  
  const config = statusColors[status];
  
  return (
    <div className="glass-card rounded-xl p-5 hover:shadow-elevated transition-smooth" data-testid={`rag-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-display text-[#005994] font-semibold">{title}</h4>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${config.bg} ${config.glow}`} />
          <span className={`text-xs font-medium ${status === 'green' ? 'text-[#87C71F]' : status === 'amber' ? 'text-amber-500' : 'text-red-500'}`}>
            {config.label}
          </span>
        </div>
      </div>
      <div className="text-2xl font-bold text-[#005994] mb-1">{metric}</div>
      <div className="flex items-center gap-2">
        <TrendingUp className={`w-4 h-4 ${trend >= 0 ? 'text-[#87C71F]' : 'text-red-500'}`} />
        <span className={`text-sm ${trend >= 0 ? 'text-[#87C71F]' : 'text-red-500'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
        <span className="text-[#969696] text-sm">vs last period</span>
      </div>
      <p className="text-[#969696] text-sm mt-3">{description}</p>
    </div>
  );
};

// AI Recovery Path Indicator
const RecoveryPath = ({ riskItem, probability, action }) => (
  <div className="flex items-start gap-4 p-4 bg-white/50 rounded-lg border border-[#005994]/10">
    <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-lg flex items-center justify-center flex-shrink-0">
      <GitBranch className="w-5 h-5 text-[#D4AF37]" />
    </div>
    <div className="flex-1">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-[#005994]">{riskItem}</span>
        <span className="text-xs px-2 py-1 bg-[#87C71F]/10 text-[#87C71F] rounded-full font-medium">
          {probability}% Recovery
        </span>
      </div>
      <p className="text-sm text-[#969696]">{action}</p>
    </div>
  </div>
);

const ProgrammeGovernancePage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  const corePillars = [
    {
      icon: Target,
      title: 'Strategic Alignment',
      tagline: 'Bridging Strategy with Execution',
      desc: 'Transform your vision into measurable milestones. We create direct line-of-sight from strategic objectives to daily execution, ensuring every initiative drives business value.',
      benefits: ['OKR Framework Integration', 'Executive Dashboard Views', 'Priority Matrix Alignment']
    },
    {
      icon: AlertTriangle,
      title: 'Risk & Compliance Management',
      tagline: 'Mitigating Roadblocks',
      desc: 'Proactive risk identification with AI-predicted recovery paths. Our frameworks ensure regulatory compliance while enabling agile decision-making.',
      benefits: ['Predictive Risk Scoring', 'Compliance Automation', 'Real-time Alert Systems']
    },
    {
      icon: Activity,
      title: 'Performance Monitoring',
      tagline: 'Data-Driven Decision Making',
      desc: 'Real-time KPI dashboards with RAG status indicators. Track project health, resource utilization, and milestone progress from a single control tower.',
      benefits: ['Live RAG Dashboards', 'Automated Reporting', 'Trend Analysis']
    },
    {
      icon: Users,
      title: 'Stakeholder & Change Management',
      tagline: 'Driving Adoption',
      desc: 'Transform resistance into momentum. Structured communication plans and engagement strategies ensure organizational buy-in at every level.',
      benefits: ['Change Impact Analysis', 'Communication Playbooks', 'Adoption Metrics']
    }
  ];

  const ragMetrics = [
    { title: 'Schedule Health', status: 'green', metric: '98%', trend: 4, description: 'All milestones tracking on schedule' },
    { title: 'Budget Variance', status: 'green', metric: '2.1%', trend: -1.5, description: 'Under budget allocation' },
    { title: 'Resource Utilization', status: 'amber', metric: '87%', trend: 8, description: 'Approaching capacity threshold' },
    { title: 'Risk Exposure', status: 'green', metric: 'Low', trend: -12, description: 'Risk score reduced' },
  ];

  const recoveryPaths = [
    { riskItem: 'Vendor Delay Risk', probability: 92, action: 'AI recommends activating secondary vendor pathway' },
    { riskItem: 'Budget Overrun Signal', probability: 88, action: 'Reallocate Phase 3 contingency to Phase 2' },
    { riskItem: 'Integration Bottleneck', probability: 95, action: 'Parallel processing enabled for data migration' },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <CorporateHeader 
        onLoginClick={() => setShowAuth(true)} 
        onContactClick={() => navigate('/get-in-touch')}
      />

      {/* AWARENESS: Hero - The Pain */}
      <section className="relative pt-44 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg" 
            alt="Programme governance control room" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAFAFA]/98 via-[#FAFAFA]/90 to-[#FAFAFA]/70" />
        </div>

        <div className="relative container mx-auto px-6">
          <div className="max-w-3xl">
            <div className="glass-card rounded-2xl p-10">
              <div className="inline-flex items-center px-4 py-2 bg-[#005994]/10 rounded-full text-[#005994] text-sm mb-6">
                <Shield className="w-4 h-4 mr-2" />
                Integrated Programme Governance
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-[#005994] mb-6 leading-tight">
                Align. Execute. Deliver with Confidence.
              </h1>
              <p className="text-lg md:text-xl text-[#D4AF37] font-semibold mb-4">
                Transform Vision into Action
              </p>
              <p className="text-base md:text-lg text-[#969696] mb-8 leading-relaxed">
                Prevent costly delays through structured oversight and strategic governance. 
                Your Control Tower for complete programme visibility.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="ruler-cta px-8 h-12"
                  onClick={() => navigate('/get-in-touch')}
                  data-testid="claim-control-tower-btn"
                >
                  Claim Your Control Tower <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
              
              {/* Security Badge */}
              <div className="mt-6 flex items-center gap-4">
                <div className="security-badge">
                  <Lock className="w-3 h-3" />
                  SHA-256 LOGS
                </div>
                <div className="security-badge">
                  <Shield className="w-3 h-3" />
                  COMPLIANCE READY
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Bar */}
      <section className="py-10 bg-[#005994]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-6">
            <p className="text-white/90 font-display text-xl md:text-2xl">
              &quot;Transform Vision into Action&quot;
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#D4AF37] font-display">98%</div>
              <div className="text-white/80 mt-1">On-Time Delivery</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#87C71F] font-display">45%</div>
              <div className="text-white/80 mt-1">Risk Reduction</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#D4AF37] font-display">150+</div>
              <div className="text-white/80 mt-1">Projects Governed</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#87C71F] font-display">35%</div>
              <div className="text-white/80 mt-1">Cost Savings</div>
            </div>
          </div>
        </div>
      </section>

      {/* AGILITY: Control Tower Dashboard */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              Your Control Tower Dashboard
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Real-time RAG status indicators and AI-predicted recovery paths
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto">
            {/* RAG Status Grid */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {ragMetrics.map((metric, i) => (
                <RAGStatusCard key={i} {...metric} />
              ))}
            </div>
            
            {/* AI-Predicted Recovery Paths */}
            <div className="glass-card rounded-2xl p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="font-display text-xl text-[#005994]">AI-Predicted Recovery Paths</h3>
                  <p className="text-[#969696] text-sm">Proactive risk mitigation recommendations</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#87C71F]/10 rounded-full">
                  <div className="w-2 h-2 bg-[#87C71F] rounded-full self-heal-pulse" />
                  <span className="text-[#87C71F] text-sm font-medium">Self-Healing Active</span>
                </div>
              </div>
              <div className="space-y-4">
                {recoveryPaths.map((path, i) => (
                  <RecoveryPath key={i} {...path} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Pillars */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              The Four Pillars of Governance
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              A comprehensive framework ensuring project success at every stage
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {corePillars.map((pillar, i) => (
              <div key={i} className="glass-card rounded-2xl p-8 hover:shadow-elevated transition-smooth" data-testid={`pillar-${i}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-[#005994] rounded-xl flex items-center justify-center flex-shrink-0">
                    <pillar.icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-[#005994] font-semibold">{pillar.title}</h3>
                    <p className="text-[#D4AF37] font-medium text-sm">{pillar.tagline}</p>
                  </div>
                </div>
                <p className="text-[#969696] mb-6 leading-relaxed">{pillar.desc}</p>
                <ul className="space-y-2">
                  {pillar.benefits.map((benefit, j) => (
                    <li key={j} className="flex items-center text-sm">
                      <CheckCircle className="w-4 h-4 text-[#87C71F] mr-3 flex-shrink-0" />
                      <span className="text-[#4A4A4A]">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Risk & Compliance Framework Highlight */}
      <section className="py-20 bg-[#005994]">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-3xl md:text-4xl text-white mb-6">
                Risk & Compliance Frameworks
              </h2>
              <p className="text-white/80 mb-8 leading-relaxed">
                Enterprise-grade security and compliance built into every governance layer. 
                Real-time monitoring with immutable audit trails.
              </p>
              <div className="space-y-4">
                {[
                  { icon: Shield, text: 'SHA-256 encrypted audit logs' },
                  { icon: Lock, text: 'GDPR, IFRS, FCA compliant frameworks' },
                  { icon: Eye, text: 'Real-time compliance monitoring' },
                  { icon: RefreshCcw, text: 'Self-healing risk mitigation' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <span className="text-white/90">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="glass-card-dark rounded-2xl p-8">
              <div className="text-center">
                <div className="w-20 h-20 bg-[#D4AF37]/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-10 h-10 text-[#D4AF37]" />
                </div>
                <h3 className="font-display text-2xl text-white mb-2">Ruler-Level Stability</h3>
                <p className="text-white/60 mb-6">Enterprise security you can trust</p>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Uptime', value: '99.9%' },
                    { label: 'Encryption', value: 'SHA-256' },
                    { label: 'Compliance', value: 'Multi-Reg' },
                    { label: 'Audit Trail', value: 'Immutable' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white/5 rounded-lg p-3">
                      <div className="text-[#D4AF37] font-bold">{stat.value}</div>
                      <div className="text-white/50 text-xs">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ACTION: The Ruler's CTA */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-6">
              Ready to Take Control of Your Programme?
            </h2>
            <p className="text-[#969696] mb-8 max-w-2xl mx-auto text-lg">
              Transform vision into action with structured oversight that delivers 
              98% on-time delivery and 45% risk reduction.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="lg" 
                className="ruler-cta-gold px-8 h-12"
                onClick={() => navigate('/get-in-touch')}
                data-testid="master-operations-btn"
              >
                Master Your Operations <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-[#005994] text-[#005994] hover:bg-[#005994]/5 px-8 h-12"
                onClick={() => navigate('/consulting/unified-digital-transformation-services')}
              >
                Explore Digital Transformation
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Global Footer CTA */}
      <GlobalFooterCTA onContactClick={() => navigate('/get-in-touch')} />

      <CorporateFooter />
    </div>
  );
};

export default ProgrammeGovernancePage;
