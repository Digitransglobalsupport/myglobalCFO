import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CreditCard, Hotel, Building2, Factory,
  ArrowRight, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter } from './HomePage';

const IndustryCard = ({ icon: Icon, title, description, image, features }) => (
  <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-subtle hover:shadow-elevated transition-all group">
    {/* Image */}
    <div className="h-48 overflow-hidden">
      <img 
        src={image} 
        alt={title} 
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
    </div>
    {/* Content */}
    <div className="p-8">
      <div className="w-12 h-12 bg-[#005994]/10 rounded-xl flex items-center justify-center mb-4 -mt-14 relative z-10 border-4 border-white shadow-md">
        <Icon className="w-6 h-6 text-[#005994]" />
      </div>
      <h3 className="font-display text-xl text-[#005994] mb-3">{title}</h3>
      <p className="text-[#969696] mb-4 leading-relaxed text-sm">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, i) => (
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
  const navigate = useNavigate();

  const industries = [
    {
      icon: CreditCard,
      title: 'Payments',
      description: 'Modernising infrastructure and secure transaction processing for the payments industry.',
      image: 'https://images.pexels.com/photos/4968391/pexels-photo-4968391.jpeg',
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
      image: 'https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg',
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
      image: 'https://images.pexels.com/photos/210607/pexels-photo-210607.jpeg',
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
      image: 'https://images.pexels.com/photos/1108101/pexels-photo-1108101.jpeg',
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

      {/* Hero Section with Image */}
      <section className="relative pt-44 pb-20">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#005994] mb-6 leading-tight">
                Powering Transformation Across Sectors
              </h1>
              <p className="text-lg text-[#969696] mb-8 leading-relaxed">
                We understand that every industry has unique challenges. Our solutions are tailored 
                to address the specific needs of your sector.
              </p>
              <Button 
                size="lg" 
                className="bg-[#005994] hover:bg-[#004270] text-white font-semibold px-8 h-12"
                onClick={() => navigate('/contact')}
              >
                Discuss Your Industry <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
            <div className="hidden lg:block">
              <img 
                src="https://images.pexels.com/photos/3183197/pexels-photo-3183197.jpeg" 
                alt="Industry transformation" 
                className="rounded-2xl shadow-2xl w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Industries Grid */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              Industry Expertise
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Deep domain knowledge combined with technical excellence
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
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
