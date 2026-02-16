import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, RefreshCcw, CheckCircle, ArrowRight, 
  Cpu, Cloud, Database, Link2, Zap, Server,
  Network, Shield, Lock, Activity
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter, GlobalFooterCTA } from './HomePage';

// Nervous System Visualization Component
const NervousSystemGraphic = () => {
  const [activeNode, setActiveNode] = useState(null);
  
  const nodes = [
    { id: 'erp', label: 'ERP', x: 15, y: 30 },
    { id: 'crm', label: 'CRM', x: 15, y: 70 },
    { id: 'ai', label: 'AI Engine', x: 50, y: 50, isCore: true },
    { id: 'data', label: 'Data Lake', x: 85, y: 30 },
    { id: 'api', label: 'Cloud API', x: 85, y: 70 },
  ];

  return (
    <div className="relative w-full h-64 md:h-80" data-testid="nervous-system-graphic">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        {/* Connection Lines */}
        <line x1="20" y1="30" x2="45" y2="50" className="nervous-line" />
        <line x1="20" y1="70" x2="45" y2="50" className="nervous-line" />
        <line x1="55" y1="50" x2="80" y2="30" className="nervous-line" />
        <line x1="55" y1="50" x2="80" y2="70" className="nervous-line" />
        
        {/* Core AI Engine - Glowing */}
        <circle cx="50" cy="50" r="12" fill="#005994" className="glow-navy" />
        <circle cx="50" cy="50" r="8" fill="#D4AF37" />
        <text x="50" y="53" textAnchor="middle" className="text-[6px] fill-white font-semibold">AI</text>
        
        {/* Silo Nodes */}
        {nodes.filter(n => !n.isCore).map((node) => (
          <g key={node.id} className="cursor-pointer transition-smooth">
            <circle 
              cx={node.x} 
              cy={node.y} 
              r="8" 
              fill={activeNode === node.id ? '#D4AF37' : '#005994'}
              onMouseEnter={() => setActiveNode(node.id)}
              onMouseLeave={() => setActiveNode(null)}
            />
            <text 
              x={node.x} 
              y={node.y + 15} 
              textAnchor="middle" 
              className="text-[5px] fill-[#005994] font-medium"
            >
              {node.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
};

// Logic Memo Card - Glassmorphism
const LogicMemo = ({ icon: Icon, title, automation, status }) => (
  <div className="glass-card rounded-xl p-5 hover:shadow-elevated transition-smooth" data-testid={`logic-memo-${title.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className="flex items-start justify-between mb-3">
      <div className="w-10 h-10 bg-[#005994] rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div className={`w-3 h-3 rounded-full ${status === 'active' ? 'status-green self-heal-pulse' : 'status-amber'}`} />
    </div>
    <h4 className="font-display text-[#005994] font-semibold mb-1">{title}</h4>
    <p className="text-[#969696] text-sm">{automation}</p>
  </div>
);

const DigitalTransformationPage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  const coreModules = [
    { 
      icon: Link2, 
      title: 'System Integration',
      tagline: 'Unify Tech, Maximise Efficiency',
      desc: 'Connect ERP, CRM, and legacy systems into a single, coherent ecosystem. Eliminate data silos that fragment your operations.',
      benefits: ['14+ ERP native plugs', 'Real-time bidirectional sync', 'Zero data loss migration']
    },
    { 
      icon: Cloud, 
      title: 'Cloud API',
      tagline: 'Scale Without Limits',
      desc: 'Enterprise-grade cloud infrastructure with intelligent API orchestration. Scale globally without architectural constraints.',
      benefits: ['Auto-scaling architecture', '99.9% uptime SLA', 'Multi-region deployment']
    },
    { 
      icon: Cpu, 
      title: 'AI Workflow',
      tagline: 'Automate, Innovate, Accelerate',
      desc: 'Deploy AI agents that learn your processes and automate intelligently. Transform manual tasks into self-healing workflows.',
      benefits: ['Self-healing automation', 'Predictive intervention', 'Continuous optimization']
    },
    { 
      icon: Database, 
      title: 'Data Alignment',
      tagline: 'Control Your Data, Control Your Business',
      desc: 'Achieve enterprise-wide data visibility with audit-ready governance. Every data point tracked, validated, and secured.',
      benefits: ['Immutable audit trails', 'SHA-256 encryption', 'GDPR/IFRS compliant']
    }
  ];

  const automations = [
    { icon: RefreshCcw, title: 'Auto-Reconciliation', automation: 'AI matches 95% of transactions automatically', status: 'active' },
    { icon: Shield, title: 'Compliance Check', automation: 'Real-time regulatory validation', status: 'active' },
    { icon: Activity, title: 'Health Monitor', automation: 'System vitals tracked 24/7', status: 'active' },
    { icon: Zap, title: 'Smart Routing', automation: 'Intelligent workflow orchestration', status: 'pending' },
  ];

  const techStack = [
    { name: 'SAP S/4HANA', type: 'Native' },
    { name: 'Jira', type: 'Native' },
    { name: 'Workday', type: 'Native' },
    { name: 'Salesforce', type: 'Native' },
    { name: 'NetSuite', type: 'Native' },
    { name: 'Oracle', type: 'API' },
    { name: 'Dynamics 365', type: 'Native' },
    { name: 'ServiceNow', type: 'API' },
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
            src="https://images.pexels.com/photos/256381/pexels-photo-256381.jpeg" 
            alt="Digital transformation architecture" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAFAFA]/98 via-[#FAFAFA]/90 to-[#FAFAFA]/70" />
        </div>

        <div className="relative container mx-auto px-6">
          <div className="max-w-3xl">
            <div className="glass-card rounded-2xl p-10">
              <div className="inline-flex items-center px-4 py-2 bg-[#005994]/10 rounded-full text-[#005994] text-sm mb-6">
                <Network className="w-4 h-4 mr-2" />
                Unified Digital Transformation
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-[#005994] mb-6 leading-tight">
                Next-Level Digital Transformation
              </h1>
              <p className="text-lg md:text-xl text-[#D4AF37] font-semibold mb-4">
                Break Barriers. Streamline Systems. Scale Without Limits.
              </p>
              <p className="text-base md:text-lg text-[#969696] mb-8 leading-relaxed">
                Data silos kill growth—we break them down. Achieve enterprise-wide visibility 
                and audit-ready governance across every system, every entity, every transaction.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="ruler-cta px-8 h-12"
                  onClick={() => navigate('/get-in-touch')}
                  data-testid="claim-command-centre-btn"
                >
                  Claim Your Command Centre <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
              
              {/* Security Badge */}
              <div className="mt-6 flex items-center gap-4">
                <div className="security-badge">
                  <Lock className="w-3 h-3" />
                  SHA-256 ENCRYPTED
                </div>
                <div className="security-badge">
                  <Shield className="w-3 h-3" />
                  AUDIT-READY
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Bar - The Stakes */}
      <section className="py-10 bg-[#005994]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-6">
            <p className="text-white/90 font-display text-xl md:text-2xl">
              &quot;Data Silos Kill Growth — We Break Them Down!&quot;
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#D4AF37] font-display">40%</div>
              <div className="text-white/80 mt-1">Faster Integration</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#87C71F] font-display">95%</div>
              <div className="text-white/80 mt-1">Auto-Match Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#D4AF37] font-display">Zero</div>
              <div className="text-white/80 mt-1">Data Loss</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#87C71F] font-display">24/7</div>
              <div className="text-white/80 mt-1">Self-Healing</div>
            </div>
          </div>
        </div>
      </section>

      {/* AGILITY: The Nervous System Visualization */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              The Nervous System Architecture
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Your silos (ERP, CRM, Legacy) connect to a central AI engine that orchestrates, 
              validates, and optimizes in real-time.
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto glass-card rounded-2xl p-8">
            <NervousSystemGraphic />
          </div>
        </div>
      </section>

      {/* Core Modules - The Agentic Solution */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              Core Transformation Modules
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Four pillars of enterprise-wide digital transformation
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {coreModules.map((module, i) => (
              <div key={i} className="glass-card rounded-2xl p-8 hover:shadow-elevated transition-smooth" data-testid={`module-${i}`}>
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-14 h-14 bg-[#005994] rounded-xl flex items-center justify-center flex-shrink-0">
                    <module.icon className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-[#005994] font-semibold">{module.title}</h3>
                    <p className="text-[#D4AF37] font-medium text-sm">{module.tagline}</p>
                  </div>
                </div>
                <p className="text-[#969696] mb-6 leading-relaxed">{module.desc}</p>
                <ul className="space-y-2">
                  {module.benefits.map((benefit, j) => (
                    <li key={j} className="flex items-center text-sm">
                      <div className="w-2 h-2 bg-[#87C71F] rounded-full mr-3 flex-shrink-0" />
                      <span className="text-[#4A4A4A]">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Logic Memos - AI Automation in Real-Time */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              AI-Driven Automation in Real-Time
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Watch the system work—every automation tracked, every action logged
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {automations.map((auto, i) => (
              <LogicMemo key={i} {...auto} />
            ))}
          </div>
        </div>
      </section>

      {/* Tech Grid - Proof Points */}
      <section className="py-20 bg-[#005994]">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
              Native Integration Ecosystem
            </h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              Pre-built connectors for the enterprise systems you rely on
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {techStack.map((tech, i) => (
              <div key={i} className="tech-grid-item rounded-lg p-4 text-center" data-testid={`tech-${tech.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <span className="text-white font-medium">{tech.name}</span>
                <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${tech.type === 'Native' ? 'bg-[#87C71F]/20 text-[#87C71F]' : 'bg-[#D4AF37]/20 text-[#D4AF37]'}`}>
                  {tech.type}
                </span>
              </div>
            ))}
          </div>
          
          {/* Narrative Audit Trail Mention */}
          <div className="text-center mt-10">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white/10 rounded-full">
              <Shield className="w-5 h-5 text-[#D4AF37]" />
              <span className="text-white/90 font-precision">Narrative Audit Trails with Immutable SHA-256 Logs</span>
            </div>
          </div>
        </div>
      </section>

      {/* ACTION: The Ruler's CTA */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-6">
              Ready to Break Down Your Data Silos?
            </h2>
            <p className="text-[#969696] mb-8 max-w-2xl mx-auto text-lg">
              Join enterprises who have achieved 40% faster integration 
              and enterprise-wide visibility in weeks, not years.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="lg" 
                className="ruler-cta-gold px-8 h-12"
                onClick={() => navigate('/get-in-touch')}
                data-testid="deploy-deputy-btn"
              >
                Deploy the Deputy <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-[#005994] text-[#005994] hover:bg-[#005994]/5 px-8 h-12"
                onClick={() => navigate('/platform/realtime-finance-cfo-automation')}
              >
                Explore the Platform
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

export default DigitalTransformationPage;
