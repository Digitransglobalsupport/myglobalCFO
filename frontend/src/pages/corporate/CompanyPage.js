import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, Eye, Users, Award, CheckCircle, ArrowRight,
  Lightbulb, Heart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter } from './HomePage';

const CompanyPage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  const values = [
    {
      icon: Users,
      title: 'Customer-Centric Approach',
      desc: 'Your success is our priority. We listen, understand, and deliver solutions tailored to your unique challenges.'
    },
    {
      icon: Award,
      title: 'Unparalleled Expertise',
      desc: 'Decades of combined experience across industries, with proven methodologies refined through hundreds of successful projects.'
    },
    {
      icon: Heart,
      title: 'Ongoing Support',
      desc: "We don't just deliver and leave. Our partnership continues with comprehensive support and continuous improvement."
    },
    {
      icon: Lightbulb,
      title: 'Innovation-Driven',
      desc: 'We stay ahead of technology trends to bring you cutting-edge solutions that future-proof your operations.'
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
              About Digitrans Global
            </h1>
            <p className="text-lg text-[#969696] max-w-2xl mx-auto leading-relaxed">
              We are your trusted partner for digital transformation, helping businesses 
              navigate IT complexities and achieve operational excellence.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Mission */}
            <div className="bg-[#FAFAFA] rounded-2xl p-8 border border-gray-100">
              <div className="w-14 h-14 bg-[#005994]/10 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-[#005994]" />
              </div>
              <h2 className="font-display text-2xl text-[#005994] mb-4">Our Mission</h2>
              <p className="text-[#969696] leading-relaxed">
                To empower businesses to navigate IT complexities and simplify post-merger integration. 
                We deliver transformative solutions that drive measurable growth and operational excellence.
              </p>
            </div>

            {/* Vision */}
            <div className="bg-[#FAFAFA] rounded-2xl p-8 border border-gray-100">
              <div className="w-14 h-14 bg-[#005994]/10 rounded-xl flex items-center justify-center mb-6">
                <Eye className="w-7 h-7 text-[#005994]" />
              </div>
              <h2 className="font-display text-2xl text-[#005994] mb-4">Our Vision</h2>
              <p className="text-[#969696] leading-relaxed">
                To be the trusted partner for businesses worldwide, driving operational excellence 
                through innovative digital transformation and industry-leading governance frameworks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What Sets Us Apart */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-[#005994] text-center mb-4">
            What Sets Us Apart
          </h2>
          <p className="text-[#969696] text-center max-w-2xl mx-auto mb-12">
            Why businesses choose Digitrans Global as their transformation partner
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {values.map((value, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-gray-100 shadow-subtle hover:shadow-elevated transition-all">
                <div className="w-12 h-12 bg-[#005994]/10 rounded-lg flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-[#005994]" />
                </div>
                <h3 className="text-[#005994] font-semibold mb-2">{value.title}</h3>
                <p className="text-[#969696] text-sm leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto text-center">
            {[
              { value: '50+', label: 'Industry Verticals' },
              { value: '3,589+', label: 'Successful Projects' },
              { value: '8,543+', label: 'Trusted Customers' },
              { value: '15+', label: 'Countries Served' }
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-bold text-[#005994] font-display mb-2">{stat.value}</div>
                <div className="text-[#969696]">{stat.label}</div>
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
              Ready to Partner with Us?
            </h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto">
              Let&apos;s discuss how we can help transform your business.
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

export default CompanyPage;
