import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Target, Eye, Users, Award, CheckCircle, ArrowRight,
  Lightbulb, Heart, Globe, Clock, Shield, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CorporateHeader, CorporateFooter, GlobalFooterCTA } from './HomePage';

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

  const timeline = [
    { year: '2015', title: 'Founded', desc: 'Digitrans Global established to help businesses navigate digital transformation' },
    { year: '2017', title: 'First Enterprise Client', desc: 'Partnered with a Fortune 500 company for post-merger integration' },
    { year: '2019', title: 'Global Expansion', desc: 'Expanded services across Europe, Americas, and Asia-Pacific' },
    { year: '2021', title: 'Realtime Finance Launch', desc: 'Launched our flagship CFO Agent Platform for multi-entity organizations' },
    { year: '2023', title: 'AI Integration', desc: 'Integrated AI-powered agents for self-healing financial data operations' },
    { year: '2024', title: '3,500+ Projects', desc: 'Celebrating over 3,500 successful transformation projects worldwide' }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <CorporateHeader 
        onLoginClick={() => setShowAuth(true)} 
        onContactClick={() => navigate('/get-in-touch')}
      />

      {/* Hero Section with Glassmorphism */}
      <section className="relative pt-44 pb-20">
        <div className="absolute inset-0">
          <img 
            src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg" 
            alt="Digitrans Global team" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAFAFA]/95 via-[#FAFAFA]/85 to-[#FAFAFA]/60" />
        </div>

        <div className="relative container mx-auto px-6">
          <div className="max-w-3xl">
            <div className="glass-card rounded-2xl p-10">
              <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#005994] mb-4 leading-tight">
                About Digitrans Global
              </h1>
              <p className="text-lg text-[#969696] leading-relaxed mb-8">
                We are your trusted partner for digital transformation, helping businesses 
                navigate IT complexities and achieve operational excellence since 2015.
              </p>
              <Button 
                size="lg" 
                className="bg-[#005994] hover:bg-[#004270] text-white font-semibold px-8 h-12"
                onClick={() => navigate('/get-in-touch')}
                data-testid="partner-with-us-btn"
              >
                Partner With Us <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Strip */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-12 md:gap-20">
            {[
              { value: '50+', label: 'Industry Verticals', icon: Globe },
              { value: '3,589+', label: 'Successful Projects', icon: TrendingUp },
              { value: '8,543+', label: 'Trusted Customers', icon: Users },
              { value: '15+', label: 'Countries Served', icon: Shield }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-[#005994]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <stat.icon className="w-6 h-6 text-[#005994]" />
                </div>
                <div className="text-3xl font-bold text-[#005994] font-display mb-1">{stat.value}</div>
                <div className="text-[#969696] text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Mission */}
            <div className="glass-card rounded-2xl p-8 hover:shadow-elevated transition-all">
              <div className="w-14 h-14 bg-[#005994] rounded-xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-white" />
              </div>
              <h2 className="font-display text-2xl text-[#005994] mb-4">Our Mission</h2>
              <p className="text-[#969696] leading-relaxed">
                To empower businesses to navigate IT complexities and simplify post-merger integration. 
                We deliver transformative solutions that drive measurable growth and operational excellence.
              </p>
            </div>

            {/* Vision */}
            <div className="glass-card rounded-2xl p-8 hover:shadow-elevated transition-all">
              <div className="w-14 h-14 bg-[#87c71f] rounded-xl flex items-center justify-center mb-6">
                <Eye className="w-7 h-7 text-white" />
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
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-[#005994] text-center mb-4">
            What Sets Us Apart
          </h2>
          <p className="text-[#969696] text-center max-w-2xl mx-auto mb-12">
            Why businesses choose Digitrans Global as their transformation partner
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {values.map((value, i) => (
              <div key={i} className="glass-card rounded-xl p-6 hover:shadow-elevated transition-all">
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

      {/* Timeline */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <h2 className="font-display text-3xl md:text-4xl text-[#005994] text-center mb-4">
            Our Journey
          </h2>
          <p className="text-[#969696] text-center max-w-2xl mx-auto mb-12">
            From startup to global transformation partner
          </p>

          <div className="max-w-4xl mx-auto">
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-[#005994]/20 hidden md:block" />
              
              {timeline.map((item, i) => (
                <div key={i} className="relative pl-0 md:pl-20 mb-8 last:mb-0">
                  {/* Timeline Dot */}
                  <div className="absolute left-6 top-3 w-5 h-5 bg-[#005994] rounded-full border-4 border-[#FAFAFA] hidden md:block" />
                  
                  <div className="glass-card rounded-xl p-6 hover:shadow-elevated transition-all">
                    <div className="flex items-start">
                      <div className="w-16 h-16 bg-[#005994] rounded-xl flex items-center justify-center mr-4 flex-shrink-0">
                        <span className="text-white font-bold">{item.year}</span>
                      </div>
                      <div>
                        <h3 className="text-[#005994] font-semibold text-lg mb-1">{item.title}</h3>
                        <p className="text-[#969696]">{item.desc}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why Partner With Us */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-6">
                  Why Partner With Digitrans Global
                </h2>
                <p className="text-[#969696] leading-relaxed mb-8">
                  We bring together deep industry expertise, cutting-edge technology, and a relentless 
                  focus on delivering measurable business outcomes for our clients.
                </p>
                <ul className="space-y-4">
                  {[
                    'Proven track record with 3,500+ successful projects',
                    'Deep expertise across 50+ industry verticals',
                    'End-to-end transformation capabilities',
                    'Long-term partnership approach with ongoing support',
                    'Innovation-first mindset with AI and automation'
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
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl text-[#005994] font-semibold">Response Time</h3>
                    <p className="text-[#87c71f] text-sm font-medium">Fast & Reliable</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Initial Response', value: '< 24 hours' },
                    { label: 'Proposal Delivery', value: '< 5 business days' },
                    { label: 'Project Kickoff', value: '< 2 weeks' },
                    { label: 'Support Response', value: '< 4 hours' }
                  ].map((item, i) => (
                    <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
                      <span className="text-[#969696]">{item.label}</span>
                      <span className="text-[#005994] font-semibold">{item.value}</span>
                    </div>
                  ))}
                </div>
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

export default CompanyPage;
