import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Layers, RefreshCcw, BarChart3, Users, 
  CheckCircle, ArrowRight, ChevronDown, ChevronUp,
  Target, Zap, AlertTriangle, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter } from './HomePage';

const AccordionItem = ({ icon: Icon, title, headline, body, benefit, isOpen, onToggle }) => (
  <div className="glass-card rounded-xl overflow-hidden mb-4">
    <button 
      className="w-full px-6 py-5 flex items-center justify-between text-left"
      onClick={onToggle}
    >
      <div className="flex items-center">
        <div className="w-12 h-12 bg-[#00F0FF]/10 rounded-lg flex items-center justify-center mr-4">
          <Icon className="w-6 h-6 text-[#00F0FF]" />
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <p className="text-[#00F0FF] text-sm font-medium">{headline}</p>
        </div>
      </div>
      {isOpen ? (
        <ChevronUp className="w-5 h-5 text-gray-400" />
      ) : (
        <ChevronDown className="w-5 h-5 text-gray-400" />
      )}
    </button>
    {isOpen && (
      <div className="px-6 pb-6">
        <div className="pl-16">
          <p className="text-gray-400 mb-4 leading-relaxed">{body}</p>
          <div className="flex items-start bg-[#00F0FF]/5 rounded-lg p-4">
            <CheckCircle className="w-5 h-5 text-[#00F0FF] mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[#00F0FF] text-sm font-medium">Key Benefit: </span>
              <span className="text-gray-300 text-sm">{benefit}</span>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);

const ProgrammeGovernancePage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [openAccordion, setOpenAccordion] = useState(0);
  const navigate = useNavigate();

  const pillars = [
    {
      icon: Layers,
      title: 'Integration Programme Management',
      headline: 'Unify Systems. Create Synergy. Win Faster.',
      body: 'We connect the dots—systems, processes, and teams. From ERP to CRM, we develop a high-impact integration plan that aligns your technology landscape with business objectives.',
      benefit: 'Seamless system integration and operational alignment across all business units.'
    },
    {
      icon: Users,
      title: 'Change Management & Stakeholder Engagement',
      headline: 'Lead the Change. Inspire Action.',
      body: 'We turn resistance into momentum. Strategic change plans drive adoption of new systems and processes while maintaining employee engagement and productivity.',
      benefit: 'Higher user adoption rates with minimal resistance and faster time-to-value.'
    },
    {
      icon: Zap,
      title: 'Technology Transformation Oversight',
      headline: 'Modernise. Scale. Conquer.',
      body: 'From cloud migration to AI automation, we align tech initiatives with business objectives. Our oversight ensures technology investments deliver measurable ROI.',
      benefit: 'Scalable cloud infrastructure and automated workflows that drive efficiency.'
    },
    {
      icon: AlertTriangle,
      title: 'Performance & Risk Management',
      headline: 'Measure. Mitigate. Master Success.',
      body: 'Real-time KPI dashboards and proactive risk assessment to keep projects on budget and on time. We identify potential issues before they become problems.',
      benefit: 'Early risk detection, predictable outcomes, and consistent project delivery.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0A192F]">
      <CorporateHeader 
        onLoginClick={() => setShowAuth(true)} 
        onContactClick={() => navigate('/contact')}
      />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.pexels.com/photos/7647938/pexels-photo-7647938.jpeg" 
            alt="Programme Governance" 
            className="w-full h-full object-cover opacity-20"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A192F]/80 via-[#0A192F]/90 to-[#0A192F]" />
        </div>

        <div className="relative container mx-auto px-6">
          <div className="max-w-4xl">
            <div className="inline-flex items-center px-4 py-2 bg-[#00F0FF]/10 rounded-full text-[#00F0FF] text-sm mb-6">
              <Shield className="w-4 h-4 mr-2" />
              Consultancy Service
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Dominate Every Project.{' '}
              <span className="text-gradient-cyan">Deliver Every Goal.</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mb-10 leading-relaxed">
              Your blueprint for project success. Total oversight, real-time tracking, and risk management 
              to ensure every initiative achieves its objectives.
            </p>
            <Button 
              size="lg" 
              className="bg-[#00F0FF] hover:bg-[#00c4d4] text-[#0A192F] font-semibold px-8 h-12"
              onClick={() => navigate('/contact')}
            >
              Speak to an Expert <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* The 4 Pillars */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-white text-center mb-4">
            The 4 Pillars of Governance
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12">
            Our comprehensive governance framework ensures project success at every stage
          </p>

          <div className="max-w-4xl mx-auto">
            {pillars.map((pillar, i) => (
              <AccordionItem
                key={i}
                {...pillar}
                isOpen={openAccordion === i}
                onToggle={() => setOpenAccordion(openAccordion === i ? -1 : i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-[#112240]/50">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto text-center">
            {[
              { value: '98%', label: 'On-Time Delivery', icon: Target },
              { value: '45%', label: 'Risk Reduction', icon: AlertTriangle },
              { value: '150+', label: 'Projects Managed', icon: Layers },
              { value: '35%', label: 'Cost Savings', icon: TrendingUp }
            ].map((stat, i) => (
              <div key={i} className="glass-card rounded-xl p-6">
                <div className="w-12 h-12 bg-[#00F0FF]/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <stat.icon className="w-6 h-6 text-[#00F0FF]" />
                </div>
                <div className="text-3xl font-bold text-[#00F0FF] mb-2">{stat.value}</div>
                <div className="text-gray-400 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <h2 className="font-display text-3xl md:text-4xl text-white mb-6">
                Why Our Governance Framework Delivers Results
              </h2>
              <p className="text-gray-400 leading-relaxed mb-8">
                We don't just manage projects—we ensure they succeed. Our governance framework is built 
                on decades of experience across industries, refined to deliver consistent results.
              </p>
              <ul className="space-y-4">
                {[
                  'Real-time visibility into project health and KPIs',
                  'Proactive risk identification and mitigation',
                  'Stakeholder alignment and communication excellence',
                  'Scalable frameworks that grow with your organization'
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle className="w-5 h-5 text-[#00F0FF] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card rounded-2xl p-8">
              <h3 className="text-xl text-white font-semibold mb-6">Our Approach</h3>
              <div className="space-y-6">
                {[
                  { step: '01', title: 'Assess', desc: 'Understand your current state and objectives' },
                  { step: '02', title: 'Design', desc: 'Create tailored governance frameworks' },
                  { step: '03', title: 'Implement', desc: 'Deploy with minimal disruption' },
                  { step: '04', title: 'Optimise', desc: 'Continuously improve and scale' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start">
                    <div className="w-10 h-10 bg-[#00F0FF]/10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-[#00F0FF] font-bold text-sm">{item.step}</span>
                    </div>
                    <div>
                      <div className="text-white font-medium">{item.title}</div>
                      <div className="text-gray-400 text-sm">{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center glass-card rounded-3xl p-12 border-[#00F0FF]/20">
            <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
              Ready to Take Control of Your Projects?
            </h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Our governance experts are ready to help you achieve predictable, successful outcomes.
            </p>
            <Button 
              size="lg" 
              className="bg-[#00F0FF] hover:bg-[#00c4d4] text-[#0A192F] font-semibold px-8"
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

export default ProgrammeGovernancePage;
