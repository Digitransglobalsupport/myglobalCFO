import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, CheckCircle, ArrowRight, 
  GitMerge, FileText, Eye, Layers, Target, Workflow, 
  RefreshCcw, ClipboardList, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter, GlobalFooterCTA } from './HomePage';

const ProcessAlignmentPage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [activeService, setActiveService] = useState(0);
  const navigate = useNavigate();

  const services = [
    {
      icon: Layers,
      title: 'Process Standardisation',
      tagline: 'Consistency is Power',
      description: 'Establish uniform workflows across all business units. Create repeatable, scalable processes that eliminate variation and drive operational excellence.',
      benefits: ['Unified operations across entities', 'Reduced training time', 'Improved quality control', 'Scalable growth foundation'],
      stat: { value: '40%', label: 'Efficiency Gain' }
    },
    {
      icon: GitMerge,
      title: 'Process Consolidation',
      tagline: 'Simplify to Multiply',
      description: 'Identify and eliminate redundant tasks post-merger. Streamline operations by combining overlapping processes into optimized workflows.',
      benefits: ['Eliminate duplicate efforts', 'Reduce operational costs', 'Faster decision-making', 'Improved resource allocation'],
      stat: { value: '60%', label: 'Reduced Duplication' }
    },
    {
      icon: FileText,
      title: 'Process Mapping & Validation',
      tagline: 'Visibility Leads to Victory',
      description: 'Create documented procedures for training and compliance. Build a shared roadmap that provides complete visibility into your operations.',
      benefits: ['Comprehensive documentation', 'Audit-ready processes', 'Clear accountability', 'Continuous improvement baseline'],
      stat: { value: '95%', label: 'Compliance Rate' }
    }
  ];

  const deliverables = [
    { icon: ClipboardList, title: 'Process Documentation', desc: 'Complete workflow documentation and SOPs' },
    { icon: Workflow, title: 'Workflow Diagrams', desc: 'Visual process maps and flow diagrams' },
    { icon: Target, title: 'KPI Framework', desc: 'Measurable metrics for process health' },
    { icon: Users, title: 'Training Materials', desc: 'Comprehensive onboarding resources' }
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
            alt="Process alignment team" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAFAFA]/95 via-[#FAFAFA]/85 to-[#FAFAFA]/60" />
        </div>

        <div className="relative container mx-auto px-6">
          <div className="max-w-3xl">
            <div className="glass-card rounded-2xl p-10">
              <div className="inline-flex items-center px-4 py-2 bg-[#005994]/10 rounded-full text-[#005994] text-sm mb-6">
                <Settings className="w-4 h-4 mr-2" />
                Core Service
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#005994] mb-4 leading-tight">
                Business Process Alignment
              </h1>
              <p className="text-[#87c71f] font-semibold text-lg mb-4">
                Standardisation • Consolidation • Mapping
              </p>
              <p className="text-lg text-[#969696] mb-8 leading-relaxed">
                Creating a shared roadmap for operations with visibility that leads to victory. 
                Simplify, standardise, and scale with precision.
              </p>
              <Button 
                size="lg" 
                className="bg-[#005994] hover:bg-[#004270] text-white font-semibold px-8 h-12"
                onClick={() => navigate('/contact')}
                data-testid="start-journey-btn"
              >
                Start Your Journey <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Stats */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-12 md:gap-20">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#005994] font-display">40%</div>
              <div className="text-[#969696] mt-2">Process Efficiency Gain</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#87c71f] font-display">60%</div>
              <div className="text-[#969696] mt-2">Reduced Duplication</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#005994] font-display">95%</div>
              <div className="text-[#969696] mt-2">Compliance Rate</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#87c71f] font-display">3x</div>
              <div className="text-[#969696] mt-2">Faster Onboarding</div>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Experience */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              What You&apos;ll Experience
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              A systematic approach to aligning your business processes for maximum efficiency
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { icon: Eye, title: 'Complete Visibility', desc: 'Full transparency into every process across your organization' },
              { icon: Target, title: 'Measurable Outcomes', desc: 'Clear KPIs and metrics to track improvement and success' },
              { icon: RefreshCcw, title: 'Scalable Framework', desc: 'Processes designed to grow with your business' }
            ].map((item, i) => (
              <div key={i} className="glass-card rounded-2xl p-8 text-center hover:shadow-elevated transition-all">
                <div className="w-16 h-16 bg-[#005994] rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-[#005994] font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-[#969696]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Service Tabs */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              Our Process Alignment Services
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Select a service to learn how we transform your operations
            </p>
          </div>

          {/* Service Tabs */}
          <div className="flex flex-wrap justify-center gap-3 mb-8 max-w-4xl mx-auto">
            {services.map((service, i) => (
              <button
                key={i}
                onClick={() => setActiveService(i)}
                className={`flex items-center px-5 py-3 rounded-xl font-medium transition-all ${
                  activeService === i 
                    ? 'bg-[#005994] text-white shadow-lg' 
                    : 'bg-[#FAFAFA] text-[#005994] hover:bg-[#005994]/10 border border-gray-200'
                }`}
                data-testid={`service-tab-${i}`}
              >
                <service.icon className="w-5 h-5 mr-2" />
                {service.title}
              </button>
            ))}
          </div>

          {/* Service Content */}
          <div className="max-w-5xl mx-auto">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="grid lg:grid-cols-5 gap-0">
                {/* Main Content */}
                <div className="lg:col-span-3 p-8 md:p-10">
                  <div className="inline-flex items-center px-4 py-2 bg-[#87c71f]/10 rounded-full text-[#87c71f] text-sm mb-4">
                    {React.createElement(services[activeService].icon, { className: "w-4 h-4 mr-2" })}
                    {services[activeService].tagline}
                  </div>
                  <h3 className="font-display text-2xl text-[#005994] mb-4">{services[activeService].title}</h3>
                  <p className="text-[#969696] mb-6 leading-relaxed">{services[activeService].description}</p>
                  <ul className="space-y-3 mb-6">
                    {services[activeService].benefits.map((benefit, j) => (
                      <li key={j} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-[#87c71f] mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="bg-[#87c71f] hover:bg-[#6ba318] text-white"
                    onClick={() => navigate('/contact')}
                  >
                    Get Started <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>

                {/* Stat Card */}
                <div className="lg:col-span-2 bg-[#005994] p-8 md:p-10 flex flex-col justify-center items-center text-center">
                  <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mb-6">
                    {React.createElement(services[activeService].icon, { className: "w-10 h-10 text-white" })}
                  </div>
                  <div className="text-5xl font-bold text-white mb-2">{services[activeService].stat.value}</div>
                  <div className="text-white/80">{services[activeService].stat.label}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deliverables */}
      <section className="py-20">
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
            {deliverables.map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-subtle hover:shadow-elevated transition-all text-center">
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

      {/* Why Choose Us */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-6">
                  Why Process Alignment Matters
                </h2>
                <p className="text-[#969696] leading-relaxed mb-8">
                  Misaligned processes cost businesses millions in lost productivity, errors, and missed opportunities. 
                  Our systematic approach creates a unified operational foundation for sustainable growth.
                </p>
                <ul className="space-y-4">
                  {[
                    'Eliminate redundant and conflicting processes',
                    'Create consistent customer and employee experiences',
                    'Enable faster decision-making with clear workflows',
                    'Build a foundation for automation and scaling'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-[#87c71f] mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-card rounded-2xl p-8">
                <h3 className="text-xl text-[#005994] font-semibold mb-6">The Alignment Journey</h3>
                <div className="space-y-6">
                  {[
                    { step: '01', title: 'Discovery', desc: 'Map current processes and identify gaps' },
                    { step: '02', title: 'Analysis', desc: 'Evaluate efficiency and find redundancies' },
                    { step: '03', title: 'Design', desc: 'Create optimized, standardized workflows' },
                    { step: '04', title: 'Implement', desc: 'Roll out with training and support' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start">
                      <div className="w-10 h-10 bg-[#005994] rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                        <span className="text-white font-bold text-sm">{item.step}</span>
                      </div>
                      <div>
                        <div className="text-[#005994] font-medium">{item.title}</div>
                        <div className="text-[#969696] text-sm">{item.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
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

export default ProcessAlignmentPage;
