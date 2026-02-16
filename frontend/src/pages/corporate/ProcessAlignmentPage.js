import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, CheckCircle, ArrowRight, GitMerge, FileText, Eye, 
  Layers, Target, Workflow, RefreshCcw, ClipboardList, Users,
  Factory, Building2, CreditCard, Briefcase, Plane, ShoppingBag,
  Zap, Lock, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter, GlobalFooterCTA } from './HomePage';

// Animated Process Flow - Complex to Golden Path
const ProcessFlowAnimation = () => {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 500);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className="relative w-full h-48 md:h-64" data-testid="process-flow-animation">
      <svg className="w-full h-full" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid meet">
        {/* Complex overlapping paths (greyed out when animated) */}
        <g className={`transition-opacity duration-1000 ${animated ? 'opacity-20' : 'opacity-60'}`}>
          <path d="M20,60 Q60,20 100,50 T180,40 T260,70 T340,50" fill="none" stroke="#969696" strokeWidth="2" strokeDasharray="4,4" />
          <path d="M20,70 Q80,100 120,60 T200,80 T280,40 T340,60" fill="none" stroke="#969696" strokeWidth="2" strokeDasharray="4,4" />
          <path d="M20,50 Q70,80 110,70 T190,30 T270,90 T340,70" fill="none" stroke="#969696" strokeWidth="2" strokeDasharray="4,4" />
        </g>
        
        {/* Golden Optimised Path */}
        <path 
          d="M20,60 Q100,60 200,60 T380,60" 
          fill="none" 
          stroke="#D4AF37" 
          strokeWidth="4"
          strokeLinecap="round"
          className={animated ? 'golden-path' : 'opacity-0'}
        />
        
        {/* Start Node */}
        <circle cx="20" cy="60" r="8" fill="#005994" />
        <text x="20" y="85" textAnchor="middle" className="text-[8px] fill-[#005994] font-semibold">Complex</text>
        
        {/* End Node */}
        <circle cx="380" cy="60" r="10" fill="#D4AF37" className={animated ? 'glow-gold' : ''} />
        <text x="380" y="85" textAnchor="middle" className="text-[8px] fill-[#D4AF37] font-semibold">Optimised</text>
        
        {/* Middle Checkpoint */}
        <circle cx="200" cy="60" r="6" fill={animated ? '#87C71F' : '#969696'} className={animated ? 'status-green' : ''} />
      </svg>
      
      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 text-xs">
        <span className="text-[#969696]">Overlapping Processes</span>
        <span className="text-[#D4AF37] font-semibold">Single Golden Path</span>
      </div>
    </div>
  );
};

// Industry Sector Card for Masonry Grid
const IndustryCard = ({ icon: Icon, name, focus, className = '' }) => (
  <div className={`bg-white rounded-xl p-6 border border-gray-100 shadow-subtle hover:shadow-elevated transition-smooth ${className}`} data-testid={`industry-${name.toLowerCase().replace(/\s+/g, '-')}`}>
    <div className="w-12 h-12 bg-[#005994]/10 rounded-xl flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-[#005994]" />
    </div>
    <h4 className="font-display text-[#005994] font-semibold mb-1">{name}</h4>
    <p className="text-[#969696] text-sm">{focus}</p>
  </div>
);

const ProcessAlignmentPage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [activeModule, setActiveModule] = useState(0);
  const navigate = useNavigate();

  const coreModules = [
    { 
      icon: Layers, 
      title: 'Process Standardisation',
      tagline: 'Consistency is Power',
      desc: 'Establish uniform workflows across all business units. Create repeatable, scalable processes that eliminate variation and drive operational excellence across your entire organization.',
      benefits: ['Unified operations across entities', 'Reduced training time by 60%', 'Improved quality control', 'Scalable growth foundation'],
      stat: { value: '40%', label: 'Efficiency Gain' }
    },
    { 
      icon: GitMerge, 
      title: 'Process Consolidation',
      tagline: 'Simplify to Multiply',
      desc: 'Identify and eliminate redundant tasks post-merger. Streamline operations by combining overlapping processes into optimized, efficient workflows that save time and resources.',
      benefits: ['Eliminate duplicate efforts', 'Reduce operational costs by 35%', 'Faster decision-making', 'Improved resource allocation'],
      stat: { value: '60%', label: 'Reduced Duplication' }
    },
    { 
      icon: Target, 
      title: 'Process Optimisation',
      tagline: 'Turn Weak Points into Strengths',
      desc: 'Leverage AI-driven analysis to identify bottlenecks and inefficiencies. Transform problem areas into competitive advantages with data-backed process improvements.',
      benefits: ['AI bottleneck detection', 'Continuous improvement loops', 'Performance benchmarking', 'ROI-focused optimization'],
      stat: { value: '3x', label: 'Faster Throughput' }
    },
    { 
      icon: FileText, 
      title: 'Process Mapping & Validation',
      tagline: 'See It, Validate It, Perfect It',
      desc: 'Create documented procedures for training and compliance. Build a shared roadmap that provides complete visibility into your operations with audit-ready documentation.',
      benefits: ['Comprehensive documentation', 'Audit-ready processes', 'Clear accountability chains', 'Continuous improvement baseline'],
      stat: { value: '95%', label: 'Compliance Rate' }
    }
  ];

  const industries = [
    { icon: Factory, name: 'Automotive', focus: 'Supply chain optimization' },
    { icon: CreditCard, name: 'Fintech', focus: 'Regulatory compliance' },
    { icon: Building2, name: 'Banking', focus: 'Multi-entity governance' },
    { icon: Briefcase, name: 'Professional Services', focus: 'Resource optimization' },
    { icon: Plane, name: 'Travel & Hospitality', focus: 'Operations scaling' },
    { icon: ShoppingBag, name: 'Retail & E-commerce', focus: 'Inventory management' },
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
            src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg" 
            alt="Process alignment team collaboration" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAFAFA]/98 via-[#FAFAFA]/90 to-[#FAFAFA]/70" />
        </div>

        <div className="relative container mx-auto px-6">
          <div className="max-w-3xl">
            <div className="glass-card rounded-2xl p-10">
              <div className="inline-flex items-center px-4 py-2 bg-[#005994]/10 rounded-full text-[#005994] text-sm mb-6">
                <Settings className="w-4 h-4 mr-2" />
                Business Process Alignment
              </div>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-[#005994] mb-6 leading-tight">
                Simplify. Standardise. Scale with Precision!
              </h1>
              <p className="text-lg md:text-xl text-[#D4AF37] font-semibold mb-4">
                Visibility Leads to Victory!
              </p>
              <p className="text-base md:text-lg text-[#969696] mb-8 leading-relaxed">
                Eliminate inefficiencies and build a business that operates flawlessly—without you in the room. 
                Transform complex process webs into a single, optimized golden path.
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
                  AUDIT-READY
                </div>
                <div className="security-badge">
                  <Shield className="w-3 h-3" />
                  ISO COMPLIANT
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
              &quot;Visibility Leads to Victory!&quot;
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#D4AF37] font-display">40%</div>
              <div className="text-white/80 mt-1">Efficiency Gain</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#87C71F] font-display">60%</div>
              <div className="text-white/80 mt-1">Reduced Duplication</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#D4AF37] font-display">95%</div>
              <div className="text-white/80 mt-1">Compliance Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-[#87C71F] font-display">3x</div>
              <div className="text-white/80 mt-1">Faster Onboarding</div>
            </div>
          </div>
        </div>
      </section>

      {/* AGILITY: Process Flow Animation */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              From Complexity to Clarity
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Watch complex, overlapping processes transform into a single, golden optimized path
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto glass-card rounded-2xl p-8">
            <ProcessFlowAnimation />
          </div>
        </div>
      </section>

      {/* Core Modules - Interactive Tabs */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              Four Pillars of Process Excellence
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Select a module to explore our systematic approach
            </p>
          </div>

          {/* Module Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-4xl mx-auto">
            {coreModules.map((module, i) => (
              <button
                key={i}
                onClick={() => setActiveModule(i)}
                className={`flex items-center px-5 py-3 rounded-xl font-medium transition-smooth ${
                  activeModule === i 
                    ? 'bg-[#005994] text-white shadow-lg' 
                    : 'bg-[#FAFAFA] text-[#005994] hover:bg-[#005994]/10 border border-gray-200'
                }`}
                data-testid={`module-tab-${i}`}
              >
                <module.icon className="w-5 h-5 mr-2" />
                {module.title.split(' ')[1]}
              </button>
            ))}
          </div>

          {/* Module Content */}
          <div className="max-w-5xl mx-auto">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="grid lg:grid-cols-5 gap-0">
                {/* Main Content */}
                <div className="lg:col-span-3 p-8 md:p-10">
                  <div className="inline-flex items-center px-4 py-2 bg-[#D4AF37]/10 rounded-full text-[#D4AF37] text-sm mb-4">
                    {React.createElement(coreModules[activeModule].icon, { className: "w-4 h-4 mr-2" })}
                    {coreModules[activeModule].tagline}
                  </div>
                  <h3 className="font-display text-2xl text-[#005994] mb-4">{coreModules[activeModule].title}</h3>
                  <p className="text-[#969696] mb-6 leading-relaxed">{coreModules[activeModule].desc}</p>
                  <ul className="space-y-3 mb-6">
                    {coreModules[activeModule].benefits.map((benefit, j) => (
                      <li key={j} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-[#87C71F] mr-3 flex-shrink-0" />
                        <span className="text-[#4A4A4A]">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="ruler-cta"
                    onClick={() => navigate('/get-in-touch')}
                  >
                    Get Started <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>

                {/* Stat Card */}
                <div className="lg:col-span-2 bg-[#005994] p-8 md:p-10 flex flex-col justify-center items-center text-center">
                  <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                    {React.createElement(coreModules[activeModule].icon, { className: "w-10 h-10 text-[#D4AF37]" })}
                  </div>
                  <div className="text-5xl font-bold text-white mb-2">{coreModules[activeModule].stat.value}</div>
                  <div className="text-white/80">{coreModules[activeModule].stat.label}</div>
                  
                  {/* Self-Healing Indicator */}
                  <div className="mt-6 flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
                    <div className="w-2 h-2 bg-[#87C71F] rounded-full self-heal-pulse" />
                    <span className="text-white/80 text-xs">Self-Optimizing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Industry Sectors - High Contrast Masonry Grid */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              Industry Expertise
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Proven process alignment frameworks across diverse sectors
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {industries.map((industry, i) => (
              <IndustryCard 
                key={i} 
                {...industry} 
                className={i === 0 || i === 3 ? 'md:row-span-2' : ''}
              />
            ))}
          </div>
        </div>
      </section>

      {/* What We Deliver */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              What We Deliver
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Comprehensive deliverables that ensure lasting operational improvements
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { icon: ClipboardList, title: 'Process Documentation', desc: 'Complete workflow documentation and SOPs' },
              { icon: Workflow, title: 'Workflow Diagrams', desc: 'Visual process maps and flow diagrams' },
              { icon: Target, title: 'KPI Framework', desc: 'Measurable metrics for process health' },
              { icon: Users, title: 'Training Materials', desc: 'Comprehensive onboarding resources' },
            ].map((item, i) => (
              <div key={i} className="glass-card rounded-xl p-6 text-center hover:shadow-elevated transition-smooth">
                <div className="w-14 h-14 bg-[#005994]/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-7 h-7 text-[#005994]" />
                </div>
                <h3 className="text-[#005994] font-semibold mb-2">{item.title}</h3>
                <p className="text-[#969696] text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACTION: The Ruler's CTA */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-6">
              Ready to Simplify and Scale?
            </h2>
            <p className="text-[#969696] mb-8 max-w-2xl mx-auto text-lg">
              Build a business that operates flawlessly without you in the room. 
              Transform process chaos into operational excellence.
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
                onClick={() => navigate('/consulting/integrated-programme-governance-solutions')}
              >
                Explore Programme Governance
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

export default ProcessAlignmentPage;
