import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Car, ShoppingBag, Building2, Hotel, Factory, CreditCard,
  ArrowRight, CheckCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter } from './HomePage';

const IndustryCard = ({ icon: Icon, title, description, image, features }) => (
  <div className="group relative overflow-hidden rounded-2xl">
    {/* Background Image */}
    <div className="absolute inset-0">
      <img src={image} alt={title} className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e] via-[#1a1a2e]/80 to-transparent" />
    </div>
    
    {/* Content */}
    <div className="relative p-8 min-h-[400px] flex flex-col justify-end">
      <div className="w-12 h-12 bg-[#005994]/20 rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#005994]/30 transition-colors">
        <Icon className="w-6 h-6 text-[#005994]" />
      </div>
      <h3 className="font-display text-2xl text-white mb-3">{title}</h3>
      <p className="text-gray-300 mb-4 leading-relaxed">{description}</p>
      <ul className="space-y-2">
        {features.map((feature, i) => (
          <li key={i} className="flex items-center text-sm">
            <CheckCircle className="w-4 h-4 text-[#87c71f] mr-2 flex-shrink-0" />
            <span className="text-gray-400">{feature}</span>
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
      icon: Car,
      title: 'Automotive',
      description: 'Optimise production and manage supply chains with intelligent automation.',
      image: 'https://images.pexels.com/photos/19233057/pexels-photo-19233057.jpeg',
      features: [
        'Supply chain optimization',
        'Production line automation',
        'Quality control systems',
        'Vendor management integration'
      ]
    },
    {
      icon: ShoppingBag,
      title: 'Retail Operations',
      description: 'Inventory and supply chain optimisation for M&A scaling and growth.',
      image: 'https://images.pexels.com/photos/6772843/pexels-photo-6772843.jpeg',
      features: [
        'Inventory management',
        'POS system integration',
        'Multi-location consolidation',
        'Demand forecasting'
      ]
    },
    {
      icon: Building2,
      title: 'Financial Services',
      description: 'Secure, compliant (GDPR/FCA), and agile technology integrations.',
      image: 'https://images.pexels.com/photos/50987/money-card-business-credit-card-50987.jpeg',
      features: [
        'Regulatory compliance',
        'Risk management frameworks',
        'Core banking integration',
        'Real-time reporting'
      ]
    },
    {
      icon: Hotel,
      title: 'Hospitality',
      description: 'Unified guest management, PMS integration, and automated billing.',
      image: 'https://images.pexels.com/photos/5371676/pexels-photo-5371676.jpeg',
      features: [
        'Property management systems',
        'Guest experience platforms',
        'Revenue management',
        'Multi-property consolidation'
      ]
    },
    {
      icon: Factory,
      title: 'Manufacturing',
      description: 'IoT and analytics for predictive maintenance and operational excellence.',
      image: 'https://images.pexels.com/photos/7222227/pexels-photo-7222227.jpeg',
      features: [
        'IoT sensor integration',
        'Predictive maintenance',
        'ERP modernization',
        'Supply chain visibility'
      ]
    },
    {
      icon: CreditCard,
      title: 'Payments',
      description: 'PCI DSS-compliant security and seamless gateway integration.',
      image: 'https://images.pexels.com/photos/9122014/pexels-photo-9122014.jpeg',
      features: [
        'Payment gateway integration',
        'PCI DSS compliance',
        'Fraud detection systems',
        'Multi-currency support'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#1a1a2e]">
      <CorporateHeader 
        onLoginClick={() => setShowAuth(true)} 
        onContactClick={() => navigate('/contact')}
      />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
              Industry-Specific{' '}
              <span className="text-[#87c71f]">Digital Solutions</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              We understand that every industry has unique challenges. Our solutions are tailored 
              to address the specific needs of your sector.
            </p>
          </div>
        </div>
      </section>

      {/* Industries Grid */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {industries.map((industry, i) => (
              <IndustryCard key={i} {...industry} />
            ))}
          </div>
        </div>
      </section>

      {/* Cross-Industry Capabilities */}
      <section className="py-20 bg-[#252542]/50">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-white text-center mb-4">
            Cross-Industry Capabilities
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12">
            Core competencies that drive transformation across all sectors
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {[
              { title: 'System Integration', desc: 'Connect ERP, CRM, and legacy systems seamlessly' },
              { title: 'Data Migration', desc: 'Secure, validated data transfer with zero downtime' },
              { title: 'Process Automation', desc: 'Eliminate manual tasks with intelligent workflows' },
              { title: 'Cloud Transformation', desc: 'Modern infrastructure for scalable operations' }
            ].map((item, i) => (
              <div key={i} className="glass-card rounded-xl p-6 text-center">
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
              Ready to Transform Your Industry?
            </h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Let&apos;s discuss how our industry-specific expertise can drive your digital transformation.
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

export default IndustriesPage;
