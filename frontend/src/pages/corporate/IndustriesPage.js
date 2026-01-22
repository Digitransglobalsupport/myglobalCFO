import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, Hotel, Building2, Factory, ShoppingCart, Briefcase,
  ArrowRight, CheckCircle, Globe, Shield, Zap, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter, GlobalFooterCTA } from './HomePage';

const IndustryCard = ({ icon: Icon, title, description, image, features, isActive, onClick }) => (
  <div 
    className={`glass-card rounded-2xl overflow-hidden transition-all cursor-pointer ${
      isActive ? 'shadow-elevated ring-2 ring-[#005994]' : 'shadow-subtle hover:shadow-elevated'
    }`}
    onClick={onClick}
  >
    {/* Image */}
    <div className="h-40 overflow-hidden relative">
      <img 
        src={image} 
        alt={title} 
        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <div className="absolute bottom-4 left-4 right-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mr-3">
            <Icon className="w-5 h-5 text-[#005994]" />
          </div>
          <h3 className="font-display text-lg text-white font-semibold">{title}</h3>
        </div>
      </div>
    </div>
    {/* Content */}
    <div className="p-6">
      <p className="text-[#969696] mb-4 text-sm leading-relaxed">{description}</p>
      <ul className="space-y-2">
        {features.slice(0, 3).map((feature, i) => (
          <li key={i} className="flex items-center text-sm">
            <CheckCircle className="w-4 h-4 text-[#87c71f] mr-2 flex-shrink-0" />
            <span className="text-gray-700">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

const IndustriesPage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [activeIndustry, setActiveIndustry] = useState(0);
  const navigate = useNavigate();

  const industries = [
    {
      icon: CreditCard,
      title: 'Payments & FinTech',
      description: 'Modernising infrastructure and secure transaction processing for the payments industry.',
      image: 'https://images.pexels.com/photos/4968391/pexels-photo-4968391.jpeg',
      features: [
        'Payment gateway integration',
        'PCI DSS compliance',
        'Fraud detection systems',
        'Multi-currency support',
        'Real-time settlement'
      ]
    },
    {
      icon: Hotel,
      title: 'Hospitality',
      description: 'Unified guest management, PMS integration, and cloud migration for hospitality.',
      image: 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg',
      features: [
        'Property management systems',
        'Guest experience platforms',
        'Revenue management',
        'Multi-property consolidation',
        'Channel management'
      ]
    },
    {
      icon: Building2,
      title: 'Financial Services',
      description: 'Secure, compliant (GDPR/FCA) financial systems and agile technology integrations.',
      image: 'https://images.pexels.com/photos/210607/pexels-photo-210607.jpeg',
      features: [
        'Regulatory compliance (FCA/GDPR)',
        'Risk management frameworks',
        'Core banking integration',
        'Real-time reporting',
        'AML/KYC automation'
      ]
    },
    {
      icon: Factory,
      title: 'Manufacturing',
      description: 'ERP and IoT integration for smart production and predictive maintenance.',
      image: 'https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg',
      features: [
        'IoT sensor integration',
        'Predictive maintenance',
        'ERP modernization',
        'Supply chain visibility',
        'Quality control automation'
      ]
    },
    {
      icon: ShoppingCart,
      title: 'Retail & E-commerce',
      description: 'Omnichannel integration and inventory management for modern retail.',
      image: 'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg',
      features: [
        'Omnichannel platforms',
        'Inventory management',
        'Customer analytics',
        'POS integration',
        'Fulfillment automation'
      ]
    },
    {
      icon: Briefcase,
      title: 'Professional Services',
      description: 'Practice management and client collaboration tools for service firms.',
      image: 'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg',
      features: [
        'Practice management',
        'Client portals',
        'Time & billing integration',
        'Document management',
        'Resource planning'
      ]
    }
  ];

  const crossCapabilities = [
    { icon: Layers, title: 'System Integration', desc: 'Connect ERP, CRM, and legacy systems seamlessly' },
    { icon: Globe, title: 'Data Migration', desc: 'Secure, validated data transfer with zero downtime' },
    { icon: Zap, title: 'Process Automation', desc: 'Eliminate manual tasks with intelligent workflows' },
    { icon: Shield, title: 'Cloud Transformation', desc: 'Modern infrastructure for scalable operations' }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <CorporateHeader 
        onLoginClick={() => setShowAuth(true)} 
        onContactClick={() => navigate('/contact')}
      />

      {/* Hero Section with Glassmorphism */}
      <section className="relative pt-44 pb-20">
        <div className="absolute inset-0">
          <img 
            src="https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg" 
            alt="Industry transformation" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAFAFA]/95 via-[#FAFAFA]/85 to-[#FAFAFA]/60" />
        </div>

        <div className="relative container mx-auto px-6">
          <div className="max-w-3xl">
            <div className="glass-card rounded-2xl p-10">
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#005994] mb-4 leading-tight">
                Powering Transformation Across Sectors
              </h1>
              <p className="text-lg text-[#969696] mb-8 leading-relaxed">
                We understand that every industry has unique challenges. Our solutions are tailored 
                to address the specific needs of your sector with deep domain expertise.
              </p>
              <Button 
                size="lg" 
                className="bg-[#005994] hover:bg-[#004270] text-white font-semibold px-8 h-12"
                onClick={() => navigate('/contact')}
                data-testid="discuss-industry-btn"
              >
                Discuss Your Industry <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Industries Grid */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              Industry Expertise
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Deep domain knowledge combined with technical excellence
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {industries.map((industry, i) => (
              <IndustryCard 
                key={i} 
                {...industry} 
                isActive={activeIndustry === i}
                onClick={() => setActiveIndustry(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Selected Industry Deep Dive */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <div className="glass-card rounded-2xl overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-0">
                <div className="h-64 lg:h-auto relative">
                  <img 
                    src={industries[activeIndustry].image} 
                    alt={industries[activeIndustry].title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/20 lg:hidden" />
                </div>
                <div className="p-8 lg:p-10">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-[#005994] rounded-xl flex items-center justify-center mr-4">
                      {React.createElement(industries[activeIndustry].icon, { className: "w-6 h-6 text-white" })}
                    </div>
                    <h3 className="font-display text-2xl text-[#005994]">{industries[activeIndustry].title}</h3>
                  </div>
                  <p className="text-[#969696] mb-6 leading-relaxed">{industries[activeIndustry].description}</p>
                  <h4 className="text-[#005994] font-semibold mb-4">Key Capabilities</h4>
                  <ul className="space-y-3 mb-6">
                    {industries[activeIndustry].features.map((feature, i) => (
                      <li key={i} className="flex items-center">
                        <CheckCircle className="w-5 h-5 text-[#87c71f] mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="bg-[#87c71f] hover:bg-[#6ba318] text-white"
                    onClick={() => navigate('/contact')}
                  >
                    Discuss Your Needs <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cross-Industry Capabilities */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-[#005994] text-center mb-4">
            Cross-Industry Capabilities
          </h2>
          <p className="text-[#969696] text-center max-w-2xl mx-auto mb-12">
            Core competencies that drive transformation across all sectors
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {crossCapabilities.map((item, i) => (
              <div key={i} className="glass-card rounded-xl p-6 text-center hover:shadow-elevated transition-all">
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

      {/* Global Footer CTA */}
      <GlobalFooterCTA onContactClick={() => navigate('/contact')} />

      <CorporateFooter />
    </div>
  );
};

export default IndustriesPage;
