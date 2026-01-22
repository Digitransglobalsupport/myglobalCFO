import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Settings, CheckCircle, ArrowRight, 
  GitMerge, FileText, Eye, Layers, Target
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter, GlobalFooterCTA } from './HomePage';

const ProcessAlignmentPage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  const features = [
    {
      icon: Layers,
      title: 'Process Standardisation',
      tagline: 'Consistency is Power',
      description: 'Establish uniform workflows across all business units. Create repeatable, scalable processes that eliminate variation and drive operational excellence.',
      benefits: ['Unified operations across entities', 'Reduced training time', 'Improved quality control', 'Scalable growth foundation']
    },
    {
      icon: GitMerge,
      title: 'Process Consolidation',
      tagline: 'Simplify to Multiply',
      description: 'Identify and eliminate redundant tasks post-merger. Streamline operations by combining overlapping processes into optimized workflows.',
      benefits: ['Eliminate duplicate efforts', 'Reduce operational costs', 'Faster decision-making', 'Improved resource allocation']
    },
    {
      icon: FileText,
      title: 'Process Mapping & Validation',
      tagline: 'Visibility Leads to Victory',
      description: 'Create documented procedures for training and compliance. Build a shared roadmap that provides complete visibility into your operations.',
      benefits: ['Comprehensive documentation', 'Audit-ready processes', 'Clear accountability', 'Continuous improvement baseline']
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <CorporateHeader 
        onLoginClick={() => setShowAuth(true)} 
        onContactClick={() => navigate('/contact')}
      />

      {/* Hero Section */}
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
                Simplify. Standardise. Scale with Precision!
              </h1>
              <p className="text-lg text-[#969696] mb-8 leading-relaxed">
                Transform your operations with unified processes that drive efficiency, 
                ensure compliance, and create a shared roadmap for sustainable growth.
              </p>
              <Button 
                size="lg" 
                className="bg-[#005994] hover:bg-[#004270] text-white font-semibold px-8 h-12"
                onClick={() => navigate('/contact')}
              >
                Start Your Journey <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* What You'll Experience */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              What You&apos;ll Experience
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              A systematic approach to aligning your business processes for maximum efficiency
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              { icon: Eye, title: 'Complete Visibility', desc: 'Full transparency into every process across your organization' },
              { icon: Target, title: 'Measurable Outcomes', desc: 'Clear KPIs and metrics to track improvement and success' },
              { icon: Layers, title: 'Scalable Framework', desc: 'Processes designed to grow with your business' }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-[#005994]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-8 h-8 text-[#005994]" />
                </div>
                <h3 className="text-[#005994] font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-[#969696]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Value We Bring */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              The Value We Bring
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Our process alignment services create lasting operational improvements
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto text-center">
            {[
              { value: '40%', label: 'Process Efficiency Gain' },
              { value: '60%', label: 'Reduced Duplication' },
              { value: '95%', label: 'Compliance Rate' },
              { value: '3x', label: 'Faster Onboarding' }
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-subtle">
                <div className="text-3xl font-bold text-[#87c71f] mb-2">{stat.value}</div>
                <div className="text-[#969696] text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              Our Process Alignment Services
            </h2>
          </div>

          <div className="max-w-5xl mx-auto space-y-12">
            {features.map((feature, i) => (
              <div 
                key={i} 
                className={`grid lg:grid-cols-2 gap-12 items-center ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
              >
                <div className={i % 2 === 1 ? 'lg:order-2' : ''}>
                  <div className="inline-flex items-center px-4 py-2 bg-[#87c71f]/10 rounded-full text-[#87c71f] text-sm mb-4">
                    <feature.icon className="w-4 h-4 mr-2" />
                    {feature.tagline}
                  </div>
                  <h3 className="font-display text-2xl text-[#005994] mb-4">{feature.title}</h3>
                  <p className="text-[#969696] mb-6 leading-relaxed">{feature.description}</p>
                  <ul className="space-y-3">
                    {feature.benefits.map((benefit, j) => (
                      <li key={j} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-[#87c71f] mr-3 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-700">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`bg-[#FAFAFA] rounded-2xl p-8 border border-gray-100 ${i % 2 === 1 ? 'lg:order-1' : ''}`}>
                  <div className="w-20 h-20 bg-[#005994] rounded-2xl flex items-center justify-center mb-6">
                    <feature.icon className="w-10 h-10 text-white" />
                  </div>
                  <div className="space-y-4">
                    {feature.benefits.map((benefit, j) => (
                      <div key={j} className="flex items-center bg-white rounded-lg p-3 border border-gray-100">
                        <div className="w-8 h-8 bg-[#87c71f]/10 rounded-lg flex items-center justify-center mr-3">
                          <CheckCircle className="w-4 h-4 text-[#87c71f]" />
                        </div>
                        <span className="text-[#005994] font-medium text-sm">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
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
