import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, Eye, Users, Award, CheckCircle, ArrowRight,
  Building2, Globe, Lightbulb, Heart
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
      desc: "We don&apos;t just deliver and leave. Our partnership continues with comprehensive support and continuous improvement."
    },
    {
      icon: Lightbulb,
      title: 'Innovation-Driven',
      desc: 'We stay ahead of technology trends to bring you cutting-edge solutions that future-proof your operations.'
    }
  ];

  const milestones = [
    { year: '2015', title: 'Founded', desc: 'Digitrans Global established with a vision to transform enterprises' },
    { year: '2017', title: 'First Major Client', desc: 'Successfully delivered enterprise-wide transformation for FTSE 100 company' },
    { year: '2019', title: 'Global Expansion', desc: 'Expanded operations to serve clients across Europe and North America' },
    { year: '2021', title: 'Realtime Finance Launch', desc: 'Introduced our flagship SaaS platform for financial operations' },
    { year: '2023', title: '3,500+ Projects', desc: 'Reached milestone of successful project deliveries' }
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
              About{' '}
              <span className="text-[#87c71f]">Digitrans Global</span>
            </h1>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed">
              We are your trusted partner for digital transformation, helping businesses 
              navigate IT complexities and achieve operational excellence.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Mission */}
            <div className="glass-card rounded-2xl p-8">
              <div className="w-14 h-14 bg-[#005994]/10 rounded-xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-[#005994]" />
              </div>
              <h2 className="font-display text-2xl text-white mb-4">Our Mission</h2>
              <p className="text-gray-400 leading-relaxed">
                To empower businesses to navigate IT complexities and simplify post-merger integration. 
                We deliver transformative solutions that drive measurable growth and operational excellence.
              </p>
            </div>

            {/* Vision */}
            <div className="glass-card rounded-2xl p-8">
              <div className="w-14 h-14 bg-[#005994]/10 rounded-xl flex items-center justify-center mb-6">
                <Eye className="w-7 h-7 text-[#005994]" />
              </div>
              <h2 className="font-display text-2xl text-white mb-4">Our Vision</h2>
              <p className="text-gray-400 leading-relaxed">
                To be the trusted partner for businesses worldwide, driving operational excellence 
                through innovative digital transformation and industry-leading governance frameworks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-[#252542]/50">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-white text-center mb-4">
            Why Choose Us
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12">
            What sets Digitrans Global apart from the rest
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {values.map((value, i) => (
              <div key={i} className="glass-card rounded-xl p-6 hover:border-[#005994]/50 transition-all">
                <div className="w-12 h-12 bg-[#005994]/10 rounded-lg flex items-center justify-center mb-4">
                  <value.icon className="w-6 h-6 text-[#005994]" />
                </div>
                <h3 className="text-white font-semibold mb-2">{value.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{value.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Our Journey */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-white text-center mb-4">
            Our Journey
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-12">
            Key milestones in our growth story
          </p>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-8 top-0 bottom-0 w-px bg-[#005994]/20" />

              {milestones.map((milestone, i) => (
                <div key={i} className="relative flex items-start mb-8 last:mb-0">
                  <div className="w-16 h-16 bg-[#005994]/10 rounded-full flex items-center justify-center flex-shrink-0 z-10 border-2 border-[#005994]/30">
                    <span className="text-[#005994] font-bold text-sm">{milestone.year}</span>
                  </div>
                  <div className="ml-6 glass-card rounded-xl p-6 flex-1">
                    <h3 className="text-white font-semibold mb-2">{milestone.title}</h3>
                    <p className="text-gray-400 text-sm">{milestone.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-[#252542]/50">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto text-center">
            {[
              { value: '50+', label: 'Industry Verticals' },
              { value: '3,589+', label: 'Successful Projects' },
              { value: '8,543+', label: 'Trusted Customers' },
              { value: '15+', label: 'Countries Served' }
            ].map((stat, i) => (
              <div key={i}>
                <div className="text-4xl md:text-5xl font-bold text-[#87c71f] font-display mb-2">{stat.value}</div>
                <div className="text-gray-400">{stat.label}</div>
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
              Ready to Partner with Us?
            </h2>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              Let&apos;s discuss how we can help transform your business.
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

export default CompanyPage;
