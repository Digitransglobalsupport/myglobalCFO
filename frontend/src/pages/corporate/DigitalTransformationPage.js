import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, RefreshCcw, CheckCircle, ArrowRight, 
  GitMerge, Workflow, Cloud, Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter } from './HomePage';

const DigitalTransformationPage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      <CorporateHeader 
        onLoginClick={() => setShowAuth(true)} 
        onContactClick={() => navigate('/contact')}
      />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.pexels.com/photos/1181396/pexels-photo-1181396.jpeg" 
            alt="Digital Transformation" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#1a1a2e]/80 via-[#1a1a2e]/90 to-[#1a1a2e]" />
        </div>

        <div className="relative container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="inline-flex items-center px-4 py-2 bg-[#005994]/10 rounded-full text-[#005994] text-sm mb-6">
              <Layers className="w-4 h-4 mr-2" />
              Consultancy Service
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Seamless Digital Transformation for{' '}
              <span className="text-[#87c71f]">Mergers &amp; Acquisitions</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mb-10 leading-relaxed">
              In today&apos;s fast-evolving landscape, we unlock efficiency and growth during complex transitions. 
              Our expertise ensures systems and teams align smoothly to minimize disruption.
            </p>
            <Button 
              size="lg" 
              className="bg-[#87c71f] hover:bg-[#9ed93d] text-[#1a1a2e] font-semibold px-8 h-12"
              onClick={() => navigate('/contact')}
            >
              Contact Us Today <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Service Breakdown */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto space-y-20">
            
            {/* Block 1: Post-Merger Integration */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center px-4 py-2 bg-[#005994]/10 rounded-full text-[#005994] text-sm mb-6">
                  <GitMerge className="w-4 h-4 mr-2" />
                  Post-Merger Integration
                </div>
                <h2 className="font-display text-3xl md:text-4xl text-white mb-6">
                  Navigate Complex Transitions with Confidence
                </h2>
                <p className="text-gray-400 leading-relaxed mb-6">
                  We specialize in integration solutions that help businesses navigate complex transitions with confidence. 
                  Our expertise ensures systems and teams align smoothly to minimize disruption and maximize value creation.
                </p>
                <ul className="space-y-4">
                  {[
                    'System integration roadmap development',
                    'Data migration and consolidation',
                    'Process harmonization across entities',
                    'Cultural alignment and change management'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-[#87c71f] mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="glass-card rounded-2xl p-8 lg:p-12">
                <div className="w-16 h-16 bg-[#005994]/10 rounded-2xl flex items-center justify-center mb-6">
                  <GitMerge className="w-8 h-8 text-[#005994]" />
                </div>
                <h3 className="text-xl text-white font-semibold mb-4">Integration Excellence</h3>
                <p className="text-gray-400 mb-6">
                  Our proven methodology has helped enterprises achieve seamless post-merger integration, 
                  reducing transition time by up to 40%.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-[#87c71f]">40%</div>
                    <div className="text-gray-500 text-sm">Faster Integration</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#87c71f]">95%</div>
                    <div className="text-gray-500 text-sm">Success Rate</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Block 2: Business Process Alignment */}
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div className="order-2 lg:order-1 glass-card rounded-2xl p-8 lg:p-12">
                <div className="w-16 h-16 bg-[#005994]/10 rounded-2xl flex items-center justify-center mb-6">
                  <Workflow className="w-8 h-8 text-[#005994]" />
                </div>
                <h3 className="text-xl text-white font-semibold mb-4">Operational Excellence</h3>
                <p className="text-gray-400 mb-6">
                  Transform your operations with streamlined workflows that drive efficiency and reduce operational costs.
                </p>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-[#87c71f]">60%</div>
                    <div className="text-gray-500 text-sm">Process Efficiency</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-[#87c71f]">30%</div>
                    <div className="text-gray-500 text-sm">Cost Reduction</div>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center px-4 py-2 bg-[#005994]/10 rounded-full text-[#005994] text-sm mb-6">
                  <Workflow className="w-4 h-4 mr-2" />
                  Business Process Alignment
                </div>
                <h2 className="font-display text-3xl md:text-4xl text-white mb-6">
                  Eliminate Inefficiencies. Scale with Confidence.
                </h2>
                <p className="text-gray-400 leading-relaxed mb-6">
                  Align systems and streamline workflows for scalable, high-performance operations post-merger. 
                  We identify bottlenecks and implement solutions that drive sustainable growth.
                </p>
                <ul className="space-y-4">
                  {[
                    'Workflow analysis and optimization',
                    'Automation opportunity identification',
                    'KPI definition and tracking',
                    'Continuous improvement frameworks'
                  ].map((item, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle className="w-5 h-5 text-[#87c71f] mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-300">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Key Capabilities */}
      <section className="py-20 bg-[#252542]/50">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-white text-center mb-4">
            Our Transformation Capabilities
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12">
            Comprehensive services to guide your digital transformation journey
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { icon: Cloud, title: 'Cloud Migration', desc: 'Seamless transition to cloud infrastructure' },
              { icon: Layers, title: 'System Integration', desc: 'Connect ERP, CRM, and financial systems' },
              { icon: RefreshCcw, title: 'Process Automation', desc: 'Automate workflows for efficiency' },
              { icon: Zap, title: 'AI Implementation', desc: 'Leverage AI for intelligent operations' }
            ].map((item, i) => (
              <div key={i} className="glass-card rounded-xl p-6 hover:border-[#005994]/50 transition-all">
                <div className="w-12 h-12 bg-[#005994]/10 rounded-lg flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6 text-[#005994]" />
                </div>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center glass-card rounded-3xl p-12 border-[#005994]/20">
            <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
              Ready to Transform Your Business with a Seamless Integration Strategy?
            </h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Our experts are ready to help you navigate your digital transformation journey.
            </p>
            <Button 
              size="lg" 
              className="bg-[#87c71f] hover:bg-[#9ed93d] text-[#1a1a2e] font-semibold px-8"
              onClick={() => navigate('/contact')}
            >
              Contact Us Today <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      <CorporateFooter />
    </div>
  );
};

export default DigitalTransformationPage;
