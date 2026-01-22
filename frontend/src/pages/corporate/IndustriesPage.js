import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, Hotel, Building2, Factory,
  ArrowRight, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter } from './HomePage';

const IndustryCard = ({ icon: Icon, title, description, features }) => (
  <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-subtle hover:shadow-elevated transition-all group">
    <div className="w-14 h-14 bg-[#005994]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#005994]/15 transition-colors">
      <Icon className="w-7 h-7 text-[#005994]" />
    </div>
    <h3 className="font-display text-2xl text-[#005994] mb-3">{title}</h3>
    <p className="text-[#969696] mb-6 leading-relaxed">{description}</p>
    <ul className="space-y-2">
      {features.map((feature, i) => (
        <li key={i} className="flex items-center text-sm">
          <CheckCircle className="w-4 h-4 text-[#87c71f] mr-2 flex-shrink-0" />
          <span className="text-gray-700">{feature}</span>
        </li>
      ))}
    </ul>
  </div>
);

const IndustriesPage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  const industries = [
    {
      icon: CreditCard,
      title: 'Payments',
      description: 'Modernising infrastructure and secure transaction processing for the payments industry.',
      features: [
        'Payment gateway integration',
        'PCI DSS compliance',
        'Fraud detection systems',
        'Multi-currency support'
      ]
    },
    {
      icon: Hotel,
      title: 'Hospitality',
      description: 'Unified guest management, PMS integration, and cloud migration for hospitality.',
      features: [
        'Property management systems',
        'Guest experience platforms',
        'Revenue management',
        'Multi-property consolidation'
      ]
    },
    {
      icon: Building2,
      title: 'Financial Services',
      description: 'Secure, compliant (GDPR/FCA) financial systems and agile technology integrations.',
      features: [
        'Regulatory compliance',
        'Risk management frameworks',
        'Core banking integration',
        'Real-time reporting'
      ]
    },
    {
      icon: Factory,
      title: 'Manufacturing',
      description: 'ERP and IoT integration for smart production and predictive maintenance.',
      features: [
        'IoT sensor integration',
        'Predictive maintenance',
        'ERP modernization',
        'Supply chain visibility'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <CorporateHeader 
        onLoginClick={() => setShowAuth(true)} 
        onContactClick={() => navigate('/contact')}
      />

      {/* Hero Section */}
      <section className="relative pt-44 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-[#005994] mb-6 leading-tight">
              Powering Transformation Across Sectors
            </h1>
            <p className="text-lg text-[#969696] max-w-2xl mx-auto leading-relaxed">
              We understand that every industry has unique challenges. Our solutions are tailored 
              to address the specific needs of your sector.
            </p>
          </div>
        </div>
      </section>

      {/* Industries Grid */}
      <section className="py-12 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {industries.map((industry, i) => (
              <IndustryCard key={i} {...industry} />
            ))}
          </div>
        </div>
      </section>

      {/* Cross-Industry Capabilities */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-[#005994] text-center mb-4">
            Cross-Industry Capabilities
          </h2>
          <p className="text-[#969696] text-center max-w-2xl mx-auto mb-12">
            Core competencies that drive transformation across all sectors
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { title: 'System Integration', desc: 'Connect ERP, CRM, and legacy systems seamlessly' },
              { title: 'Data Migration', desc: 'Secure, validated data transfer with zero downtime' },
              { title: 'Process Automation', desc: 'Eliminate manual tasks with intelligent workflows' },
              { title: 'Cloud Transformation', desc: 'Modern infrastructure for scalable operations' }
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 text-center border border-gray-100 shadow-subtle">
                <h3 className="text-[#005994] font-semibold mb-2">{item.title}</h3>
                <p className="text-[#969696] text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-[#005994]">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
              Ready to Transform Your Industry?
            </h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto">
              Let&apos;s discuss how our industry-specific expertise can drive your digital transformation.
            </p>
            <Button 
              size="lg" 
              className="bg-[#87c71f] hover:bg-[#9ed93d] text-white font-semibold px-8"
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

export default IndustriesPage;
