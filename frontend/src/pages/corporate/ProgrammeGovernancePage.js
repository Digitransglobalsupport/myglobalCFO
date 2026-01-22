import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Shield, Layers, Users, 
  CheckCircle, ArrowRight, ChevronDown, ChevronUp,
  Target, Zap, AlertTriangle, TrendingUp, Eye, BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter, GlobalFooterCTA } from './HomePage';

const AccordionItem = ({ icon: Icon, title, headline, body, benefit, isOpen, onToggle }) => (
  <div className={`glass-card rounded-xl overflow-hidden mb-4 transition-all ${isOpen ? 'shadow-elevated' : 'shadow-subtle'}`}>
    <button 
      className="w-full px-6 py-5 flex items-center justify-between text-left hover:bg-white/50 transition-colors"
      onClick={onToggle}
      data-testid={`accordion-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-center">
        <div className="w-12 h-12 bg-[#005994] rounded-lg flex items-center justify-center mr-4">
          <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-[#005994] font-semibold text-lg">{title}</h3>
          <p className="text-[#87c71f] text-sm font-medium">{headline}</p>
        </div>
      </div>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-[#005994]' : 'bg-gray-100'}`}>
        {isOpen ? (
          <ChevronUp className={`w-5 h-5 ${isOpen ? 'text-white' : 'text-[#969696]'}`} />
        ) : (
          <ChevronDown className={`w-5 h-5 ${isOpen ? 'text-white' : 'text-[#969696]'}`} />
        )}
      </div>
    </button>
    {isOpen && (
      <div className="px-6 pb-6 bg-white/50">
        <div className="pl-16">
          <p className="text-[#969696] mb-4 leading-relaxed">{body}</p>
          <div className="flex items-start bg-[#87c71f]/10 rounded-lg p-4 border border-[#87c71f]/20">
            <CheckCircle className="w-5 h-5 text-[#87c71f] mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-[#87c71f] text-sm font-semibold">Key Benefit: </span>
              <span className="text-gray-700 text-sm">{benefit}</span>
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

  const approach = [
    { step: '01', title: 'Assess', desc: 'Understand your current state, objectives, and challenges', icon: Eye },
    { step: '02', title: 'Design', desc: 'Create tailored governance frameworks aligned with your goals', icon: Target },
    { step: '03', title: 'Implement', desc: 'Deploy with minimal disruption and maximum efficiency', icon: Zap },
    { step: '04', title: 'Optimise', desc: 'Continuously improve, scale, and deliver lasting value', icon: TrendingUp }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <CorporateHeader 
        onLoginClick={() => setShowAuth(true)} 
        onContactClick={() => navigate('/get-in-touch')}
      />

      {/* Hero Section with Glassmorphism */}
      <section className="relative pt-44 pb-20 overflow-hidden">
        <div className="absolute inset-0">
          <img 
            src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg" 
            alt="Programme governance team" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAFAFA]/95 via-[#FAFAFA]/85 to-[#FAFAFA]/60" />
        </div>

        <div className="relative container mx-auto px-6">
          <div className="max-w-3xl">
            <div className="glass-card rounded-2xl p-10">
              <div className="inline-flex items-center px-4 py-2 bg-[#005994]/10 rounded-full text-[#005994] text-sm mb-6">
                <Shield className="w-4 h-4 mr-2" />
                Core Service
              </div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#005994] mb-4 leading-tight">
                Integrated Programme Governance
              </h1>
              <p className="text-[#87c71f] font-semibold text-lg mb-4">
                Strategic Alignment • Risk & Compliance • Performance
              </p>
              <p className="text-lg text-[#969696] mb-8 leading-relaxed">
                Managing the &quot;people&quot; side of transformation to ensure adoption and success. 
                Your blueprint for project success with total oversight and real-time tracking.
              </p>
              <Button 
                size="lg" 
                className="bg-[#005994] hover:bg-[#004270] text-white font-semibold px-8 h-12"
                onClick={() => navigate('/get-in-touch')}
                data-testid="speak-to-expert-btn"
              >
                Speak to an Expert <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Hook Stats */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-8 md:gap-16">
            {[
              { value: '98%', label: 'On-Time Delivery', icon: Target },
              { value: '45%', label: 'Risk Reduction', icon: AlertTriangle },
              { value: '150+', label: 'Projects Managed', icon: Layers },
              { value: '35%', label: 'Cost Savings', icon: TrendingUp }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-[#005994]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-[#005994]" />
                </div>
                <div className="text-3xl font-bold text-[#87c71f] mb-1">{stat.value}</div>
                <div className="text-[#969696] text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The 4 Pillars with Accordions */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-[#005994] text-center mb-4">
            The 4 Pillars of Governance
          </h2>
          <p className="text-[#969696] text-center max-w-2xl mx-auto mb-12">
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

      {/* Our Approach */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              Our Proven Approach
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              A systematic methodology refined through hundreds of successful engagements
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {approach.map((item, i) => (
              <div key={i} className="glass-card rounded-2xl p-6 text-center hover:shadow-elevated transition-all group">
                <div className="w-14 h-14 bg-[#005994] rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                  <span className="text-white font-bold text-lg">{item.step}</span>
                </div>
                <h3 className="text-[#005994] font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-[#969696] text-sm">{item.desc}</p>
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
              <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-6">
                Why Our Governance Framework Delivers Results
              </h2>
              <p className="text-[#969696] leading-relaxed mb-8">
                We don&apos;t just manage projects—we ensure they succeed. Our governance framework is built 
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
                    <CheckCircle className="w-5 h-5 text-[#87c71f] mr-3 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="glass-card rounded-2xl p-8">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-[#005994] rounded-xl flex items-center justify-center mr-4">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl text-[#005994] font-semibold">Governance Dashboard</h3>
                  <p className="text-[#87c71f] text-sm font-medium">Real-time project insights</p>
                </div>
              </div>
              <div className="space-y-4">
                {[
                  { label: 'Project Health', value: 95, color: '#87c71f' },
                  { label: 'Risk Mitigation', value: 88, color: '#005994' },
                  { label: 'Stakeholder Alignment', value: 92, color: '#87c71f' },
                  { label: 'Budget Adherence', value: 97, color: '#005994' }
                ].map((metric, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#969696]">{metric.label}</span>
                      <span className="text-[#005994] font-semibold">{metric.value}%</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${metric.value}%`, backgroundColor: metric.color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
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
