import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, RefreshCcw, CheckCircle, ArrowRight, 
  GitMerge, Workflow, Cloud, Zap, Database, Link2, Server, Cpu
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter, GlobalFooterCTA } from './HomePage';

const DigitalTransformationPage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const navigate = useNavigate();

  const capabilities = [
    { 
      icon: Cloud, 
      title: 'Cloud Migration', 
      tagline: 'Elevate Your Infrastructure',
      desc: 'Seamless transition to cloud infrastructure with zero-downtime migration strategies.',
      details: ['AWS, Azure, GCP certified', 'Hybrid cloud architecture', 'Cost optimization', 'Security-first approach']
    },
    { 
      icon: Link2, 
      title: 'System Integration', 
      tagline: 'Connect. Unify. Accelerate.',
      desc: 'Connect ERP, CRM, and financial systems into a unified ecosystem.',
      details: ['API-first integration', 'Real-time data sync', 'Legacy system modernization', 'Custom middleware']
    },
    { 
      icon: RefreshCcw, 
      title: 'Process Automation', 
      tagline: 'Work Smarter, Not Harder',
      desc: 'Automate workflows for efficiency, accuracy, and scalability.',
      details: ['RPA implementation', 'Workflow orchestration', 'Document processing', 'Approval automation']
    },
    { 
      icon: Cpu, 
      title: 'AI Implementation', 
      tagline: 'Intelligence at Scale',
      desc: 'Leverage AI for intelligent operations and predictive insights.',
      details: ['Machine learning models', 'Natural language processing', 'Predictive analytics', 'Computer vision']
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <CorporateHeader 
        onLoginClick={() => setShowAuth(true)} 
        onContactClick={() => navigate('/contact')}
      />

      {/* Hero Section with Glassmorphism */}
      <section className="relative pt-44 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg" 
            alt="Digital transformation team" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAFAFA]/95 via-[#FAFAFA]/85 to-[#FAFAFA]/60" />
        </div>

        <div className="relative container mx-auto px-6">
          <div className="max-w-3xl">
            <div className="glass-card rounded-2xl p-10">
              <div className="inline-flex items-center px-4 py-2 bg-[#005994]/10 rounded-full text-[#005994] text-sm mb-6">
                <Layers className="w-4 h-4 mr-2" />
                Core Service
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#005994] mb-4 leading-tight">
                Unified Digital Transformation
              </h1>
              <p className="text-[#87c71f] font-semibold text-lg mb-4">
                System Integration • Cloud API • Data Alignment
              </p>
              <p className="text-lg text-[#969696] mb-8 leading-relaxed">
                Enterprise-wide visibility with audit-ready data alignment across all your systems. 
                We unlock efficiency and growth during complex transitions.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="bg-[#005994] hover:bg-[#004270] text-white font-semibold px-8 h-12"
                  onClick={() => navigate('/contact')}
                  data-testid="contact-btn"
                >
                  Start Your Transformation <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value Hook Stats */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-12 md:gap-20">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#005994] font-display">40%</div>
              <div className="text-[#969696] mt-2">Faster Integration</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#87c71f] font-display">95%</div>
              <div className="text-[#969696] mt-2">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#005994] font-display">30%</div>
              <div className="text-[#969696] mt-2">Cost Reduction</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#87c71f] font-display">60%</div>
              <div className="text-[#969696] mt-2">Process Efficiency</div>
            </div>
          </div>
        </div>
      </section>

      {/* Service Breakdown with Interactive Cards */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              Our Transformation Services
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Comprehensive digital transformation tailored to your business needs
            </p>
          </div>

          <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-start">
            
            {/* Block 1: Post-Merger Integration */}
            <div className="glass-card rounded-2xl p-8 hover:shadow-elevated transition-all">
              <div className="inline-flex items-center px-4 py-2 bg-[#005994]/10 rounded-full text-[#005994] text-sm mb-6">
                <GitMerge className="w-4 h-4 mr-2" />
                Post-Merger Integration
              </div>
              <h3 className="font-display text-2xl text-[#005994] mb-2">
                Navigate Complex Transitions with Confidence
              </h3>
              <p className="text-[#87c71f] font-medium text-sm mb-4">
                Unify Systems. Create Synergy. Win Faster.
              </p>
              <p className="text-[#969696] leading-relaxed mb-6">
                We specialize in integration solutions that help businesses navigate complex transitions. 
                Our expertise ensures systems and teams align smoothly to minimize disruption.
              </p>
              <ul className="space-y-3">
                {[
                  'System integration roadmap development',
                  'Data migration and consolidation',
                  'Process harmonization across entities',
                  'Cultural alignment and change management'
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-[#87c71f] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Block 2: Business Process Alignment */}
            <div className="glass-card rounded-2xl p-8 hover:shadow-elevated transition-all">
              <div className="inline-flex items-center px-4 py-2 bg-[#005994]/10 rounded-full text-[#005994] text-sm mb-6">
                <Workflow className="w-4 h-4 mr-2" />
                Business Process Alignment
              </div>
              <h3 className="font-display text-2xl text-[#005994] mb-2">
                Eliminate Inefficiencies. Scale with Confidence.
              </h3>
              <p className="text-[#87c71f] font-medium text-sm mb-4">
                Streamline. Standardize. Succeed.
              </p>
              <p className="text-[#969696] leading-relaxed mb-6">
                Align systems and streamline workflows for scalable, high-performance operations. 
                We identify bottlenecks and implement solutions that drive sustainable growth.
              </p>
              <ul className="space-y-3">
                {[
                  'Workflow analysis and optimization',
                  'Automation opportunity identification',
                  'KPI definition and tracking',
                  'Continuous improvement frameworks'
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-[#87c71f] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Capabilities Tabs */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-[#005994] text-center mb-4">
            Our Transformation Capabilities
          </h2>
          <p className="text-[#969696] text-center max-w-2xl mx-auto mb-12">
            Select a capability to learn more about how we can help
          </p>

          {/* Tab Navigation */}
          <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-4xl mx-auto">
            {capabilities.map((cap, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(i)}
                className={`flex items-center px-5 py-3 rounded-xl font-medium transition-all ${
                  activeTab === i 
                    ? 'bg-[#005994] text-white shadow-lg' 
                    : 'bg-[#FAFAFA] text-[#005994] hover:bg-[#005994]/10 border border-gray-200'
                }`}
                data-testid={`capability-tab-${i}`}
              >
                <cap.icon className="w-5 h-5 mr-2" />
                {cap.title}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="max-w-4xl mx-auto">
            <div className="glass-card rounded-2xl p-8 md:p-10">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <div className="w-16 h-16 bg-[#005994] rounded-2xl flex items-center justify-center mb-6">
                    {React.createElement(capabilities[activeTab].icon, { className: "w-8 h-8 text-white" })}
                  </div>
                  <h3 className="font-display text-2xl text-[#005994] mb-2">{capabilities[activeTab].title}</h3>
                  <p className="text-[#87c71f] font-medium mb-4">{capabilities[activeTab].tagline}</p>
                  <p className="text-[#969696] leading-relaxed mb-6">{capabilities[activeTab].desc}</p>
                  <Button 
                    className="bg-[#87c71f] hover:bg-[#6ba318] text-white"
                    onClick={() => navigate('/contact')}
                  >
                    Learn More <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
                <div className="bg-[#FAFAFA] rounded-xl p-6 border border-gray-100">
                  <h4 className="text-[#005994] font-semibold mb-4">Key Features</h4>
                  <ul className="space-y-3">
                    {capabilities[activeTab].details.map((detail, i) => (
                      <li key={i} className="flex items-center">
                        <div className="w-8 h-8 bg-[#87c71f]/10 rounded-lg flex items-center justify-center mr-3">
                          <CheckCircle className="w-4 h-4 text-[#87c71f]" />
                        </div>
                        <span className="text-gray-700">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-6">
                  Why Our Digital Transformation Delivers Results
                </h2>
                <p className="text-[#969696] leading-relaxed mb-8">
                  We don&apos;t just implement technology—we transform businesses. Our methodology 
                  ensures every initiative delivers measurable, lasting value.
                </p>
                <ul className="space-y-4">
                  {[
                    'Industry-specific expertise with proven frameworks',
                    'End-to-end implementation from strategy to support',
                    'Change management built into every project',
                    'ROI-focused approach with clear metrics'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-[#87c71f] mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '14+', label: 'ERP Systems Supported', color: 'bg-[#005994]' },
                  { value: '100+', label: 'Cloud Migrations', color: 'bg-[#87c71f]' },
                  { value: '500+', label: 'Integrations Built', color: 'bg-[#87c71f]' },
                  { value: '98%', label: 'Client Satisfaction', color: 'bg-[#005994]' }
                ].map((stat, i) => (
                  <div key={i} className={`${stat.color} rounded-2xl p-6 text-center text-white`}>
                    <div className="text-3xl font-bold mb-2">{stat.value}</div>
                    <div className="text-white/80 text-sm">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Footer CTA */}
      <GlobalFooterCTA onContactClick={() => navigate('/contact')} />

      <CorporateFooter />
    </div>
  );
};

export default DigitalTransformationPage;
