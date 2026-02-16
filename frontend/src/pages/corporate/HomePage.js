import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Cloud, Shield, BarChart3, ArrowRight, 
  ChevronRight, Quote, Users, Briefcase,
  Menu, X, ChevronDown, Phone, Mail, Layers, Settings, Rocket, Compass,
  Target, Zap, Database, Lock, Activity, TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

// Global Footer CTA Component
export const GlobalFooterCTA = ({ onContactClick }) => (
  <section className="py-20 bg-[#005994]">
    <div className="container mx-auto px-6">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
          Ready to Transform?
        </h2>
        <p className="text-white/80 mb-8 max-w-2xl mx-auto text-lg">
          Whether you&apos;re integrating new systems, scaling your business, or managing complex programmes, 
          we have the expertise to support your journey.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Button 
            size="lg" 
            className="ruler-cta-gold px-8"
            onClick={onContactClick}
          >
            Claim Your Command Centre
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="border-white/30 text-white hover:bg-white/10 px-8"
            onClick={onContactClick}
          >
            Request a Consultation
          </Button>
        </div>
      </div>
    </div>
  </section>
);

// Corporate Header Component - Updated Navigation
export const CorporateHeader = ({ onLoginClick, onContactClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#005994] shadow-md">
      {/* Top Contact Bar */}
      <div className="bg-[#004270] text-white/90 text-sm py-2">
        <div className="container mx-auto px-6 flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <a href="tel:08451630722" className="flex items-center hover:text-white transition-colors">
              <Phone className="w-3.5 h-3.5 mr-1.5" />
              08451630722
            </a>
            <a href="mailto:hello@digitransglobal.com" className="flex items-center hover:text-white transition-colors">
              <Mail className="w-3.5 h-3.5 mr-1.5" />
              hello@digitransglobal.com
            </a>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <a 
              href="https://www.linkedin.com/company/digitransglobal" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              LinkedIn
            </a>
          </div>
        </div>
      </div>
      
      {/* Main Navigation */}
      <div className="container mx-auto px-6">
        <nav className="flex items-center justify-between h-20">
          {/* Logo - Flush on off-white, no border */}
          <Link to="/" className="flex items-center">
            <img 
              src="https://customer-assets.emergentagent.com/job_cfo-toolkit-1/artifacts/mr25aajy_Digitrans%20Global%20-%20Digitrans%20Global%20Logo.png" 
              alt="Digitrans Global" 
              className="h-12 w-auto bg-[#FAFAFA] rounded px-2 py-1"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link to="/" className="text-white/90 hover:text-white transition-colors font-medium">
              Home
            </Link>
            
            {/* Our Core Services Dropdown */}
            <div className="relative group">
              <button 
                className="flex items-center text-white/90 hover:text-white transition-colors font-medium"
                onMouseEnter={() => setServicesOpen(true)}
                onMouseLeave={() => setServicesOpen(false)}
              >
                Our Core Services <ChevronDown className="w-4 h-4 ml-1" />
              </button>
              <div 
                className={`absolute top-full left-0 mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden transition-all duration-200 ${servicesOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onMouseEnter={() => setServicesOpen(true)}
                onMouseLeave={() => setServicesOpen(false)}
              >
                <Link to="/consulting/unified-digital-transformation-services" className="block px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
                  <div className="flex items-center">
                    <Rocket className="w-5 h-5 text-[#005994] mr-3" />
                    <div>
                      <div className="text-[#005994] font-semibold">Unified Digital Transformation</div>
                      <div className="text-[#969696] text-sm mt-0.5">System Integration &amp; Data Alignment</div>
                    </div>
                  </div>
                </Link>
                <Link to="/consulting/integrated-programme-governance-solutions" className="block px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
                  <div className="flex items-center">
                    <Compass className="w-5 h-5 text-[#005994] mr-3" />
                    <div>
                      <div className="text-[#005994] font-semibold">Integrated Programme Governance</div>
                      <div className="text-[#969696] text-sm mt-0.5">Strategic Alignment &amp; Risk Management</div>
                    </div>
                  </div>
                </Link>
                <Link to="/consulting/business-process-alignment-standardisation" className="block px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center">
                    <Settings className="w-5 h-5 text-[#005994] mr-3" />
                    <div>
                      <div className="text-[#005994] font-semibold">Business Process Alignment</div>
                      <div className="text-[#969696] text-sm mt-0.5">Standardisation &amp; Consolidation</div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>

            <Link to="/platform/realtime-finance-cfo-automation" className="text-white/90 hover:text-white transition-colors font-medium">
              Products
            </Link>
            <Link to="/industries-we-serve" className="text-white/90 hover:text-white transition-colors font-medium">
              Industries
            </Link>
            <Link to="/about-digitrans-global" className="text-white/90 hover:text-white transition-colors font-medium">
              About Us
            </Link>
            <Link to="/get-in-touch" className="text-white/90 hover:text-white transition-colors font-medium">
              Contact
            </Link>
          </div>

          {/* CTA Button */}
          <div className="hidden lg:flex items-center space-x-4">
            <Button 
              variant="outline" 
              className="border-white/30 text-white hover:bg-white/10"
              onClick={onLoginClick}
            >
              Login
            </Button>
            <Button 
              className="ruler-cta-gold font-semibold px-6"
              onClick={onContactClick}
              data-testid="get-started-btn"
            >
              Claim Your Command Centre
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button 
            className="lg:hidden text-white p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden py-4 border-t border-white/20">
            <div className="flex flex-col space-y-4">
              <Link to="/" className="text-white/90 hover:text-white py-2">Home</Link>
              <div className="border-t border-white/20 pt-2">
                <div className="text-white/60 text-sm mb-2">Our Core Services</div>
                <Link to="/consulting/unified-digital-transformation-services" className="block text-white/90 hover:text-white py-2 pl-4">
                  Digital Transformation
                </Link>
                <Link to="/consulting/integrated-programme-governance-solutions" className="block text-white/90 hover:text-white py-2 pl-4">
                  Programme Governance
                </Link>
                <Link to="/consulting/business-process-alignment-standardisation" className="block text-white/90 hover:text-white py-2 pl-4">
                  Process Alignment
                </Link>
              </div>
              <Link to="/platform/realtime-finance-cfo-automation" className="text-white/90 hover:text-white py-2">Products</Link>
              <Link to="/industries-we-serve" className="text-white/90 hover:text-white py-2">Industries</Link>
              <Link to="/about-digitrans-global" className="text-white/90 hover:text-white py-2">About Us</Link>
              <Link to="/get-in-touch" className="text-white/90 hover:text-white py-2">Contact</Link>
              <div className="flex flex-col space-y-2 pt-4 border-t border-white/20">
                <Button variant="outline" className="border-white/30 text-white" onClick={onLoginClick}>
                  Login
                </Button>
                <Button className="ruler-cta-gold text-white" onClick={onContactClick}>
                  Claim Your Command Centre
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

// Corporate Footer Component
export const CorporateFooter = () => (
  <footer className="bg-[#005994] text-white">
    <div className="container mx-auto px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Brand */}
        <div>
          <img 
            src="https://customer-assets.emergentagent.com/job_cfo-toolkit-1/artifacts/mr25aajy_Digitrans%20Global%20-%20Digitrans%20Global%20Logo.png" 
            alt="Digitrans Global" 
            className="h-10 w-auto bg-[#FAFAFA] rounded px-2 py-1 mb-6"
          />
          <p className="text-white/80 leading-relaxed">
            Empowering industries with scalable, future-ready digital transformation solutions.
          </p>
        </div>

        {/* Core Services */}
        <div>
          <h4 className="font-semibold mb-6 text-lg">Our Core Services</h4>
          <ul className="space-y-3">
            <li><Link to="/consulting/unified-digital-transformation-services" className="text-white/80 hover:text-[#D4AF37] transition-colors">Digital Transformation</Link></li>
            <li><Link to="/consulting/integrated-programme-governance-solutions" className="text-white/80 hover:text-[#D4AF37] transition-colors">Programme Governance</Link></li>
            <li><Link to="/consulting/business-process-alignment-standardisation" className="text-white/80 hover:text-[#D4AF37] transition-colors">Process Alignment</Link></li>
            <li><Link to="/platform/realtime-finance-cfo-automation" className="text-[#D4AF37] hover:text-[#E8C577] transition-colors font-medium">Realtime Finance Platform</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="font-semibold mb-6 text-lg">Company</h4>
          <ul className="space-y-3">
            <li><Link to="/about-digitrans-global" className="text-white/80 hover:text-[#D4AF37] transition-colors">About Us</Link></li>
            <li><Link to="/industries-we-serve" className="text-white/80 hover:text-[#D4AF37] transition-colors">Industries</Link></li>
            <li><Link to="/get-in-touch" className="text-white/80 hover:text-[#D4AF37] transition-colors">Contact</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold mb-6 text-lg">Contact Us</h4>
          <ul className="space-y-3 text-white/80">
            <li className="flex items-center">
              <Phone className="w-4 h-4 mr-2 text-[#D4AF37]" />
              08451630722
            </li>
            <li className="flex items-center">
              <Mail className="w-4 h-4 mr-2 text-[#D4AF37]" />
              hello@digitransglobal.com
            </li>
            <li className="pt-2">
              The Works Lab, Claysdon Lane,<br />
              Rayleigh, Essex, SS6 7UP
            </li>
          </ul>
          <div className="flex items-center space-x-4 mt-6">
            <a 
              href="https://www.linkedin.com/company/digitransglobal" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#D4AF37] transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/20 mt-12 pt-8 text-center text-white/60 text-sm">
        &copy; {new Date().getFullYear()} Digitrans Global. All rights reserved.
      </div>
    </div>
  </footer>
);

// Auth Dialog Component
const AuthDialog = ({ open, onOpenChange, onSuccess }) => {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload = mode === 'login' 
        ? { email, password }
        : { email, password, name };
      
      const res = await axios.post(`${API}${endpoint}`, payload);
      localStorage.setItem('token', res.data.token);
      toast.success(mode === 'login' ? 'Welcome back!' : 'Account created successfully!');
      onOpenChange(false);
      if (onSuccess) onSuccess();
      window.location.href = '/dashboard';
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border-gray-200 text-gray-900 max-w-md">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <img 
              src="https://customer-assets.emergentagent.com/job_cfo-toolkit-1/artifacts/mr25aajy_Digitrans%20Global%20-%20Digitrans%20Global%20Logo.png" 
              alt="Digitrans Global" 
              className="h-12 w-auto"
            />
          </div>
          <DialogTitle className="text-[#005994] text-2xl font-display text-center">
            {mode === 'login' ? 'Client Portal' : 'Create Account'}
          </DialogTitle>
          <DialogDescription className="text-[#969696] text-center">
            {mode === 'login' ? 'Sign in to access your dashboard' : 'Get started with Digitrans Global'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {mode === 'signup' && (
            <div>
              <Label className="text-gray-700">Full Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                placeholder="John Smith"
                required
              />
            </div>
          )}
          <div>
            <Label className="text-gray-700">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
              placeholder="john@company.com"
              required
            />
          </div>
          <div>
            <Label className="text-gray-700">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
              placeholder="••••••••"
              required
            />
          </div>
          <Button 
            type="submit" 
            className="w-full bg-[#005994] hover:bg-[#004270] text-white font-semibold" 
            disabled={loading}
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </Button>
        </form>
        <div className="text-center text-[#969696] mt-4">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          <button 
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} 
            className="text-[#D4AF37] hover:text-[#B8923F] ml-2 font-medium"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Evolution Stage Card
const EvolutionStage = ({ stage, title, desc, icon: Icon, isActive, isPast }) => {
  const stageStyles = {
    past: 'bg-gray-200 border-gray-300 evolution-past',
    present: 'bg-gray-100 border-gray-400 evolution-present',
    future: 'bg-white border-[#D4AF37] evolution-future glow-gold'
  };
  
  const variant = isPast ? 'past' : isActive ? 'future' : 'present';
  
  return (
    <div className={`rounded-2xl p-8 border-2 transition-all duration-500 ${stageStyles[variant]}`} data-testid={`evolution-${stage}`}>
      <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${
        isPast ? 'bg-gray-400' : isActive ? 'bg-[#D4AF37]' : 'bg-gray-500'
      }`}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <div className={`text-xs font-medium uppercase tracking-wide mb-2 ${
        isPast ? 'text-gray-500' : isActive ? 'text-[#D4AF37]' : 'text-gray-600'
      }`}>
        {stage}
      </div>
      <h3 className={`font-display text-xl mb-2 ${
        isPast ? 'text-gray-500' : isActive ? 'text-[#005994]' : 'text-gray-700'
      }`}>
        {title}
      </h3>
      <p className={`text-sm ${isPast ? 'text-gray-400' : isActive ? 'text-[#969696]' : 'text-gray-500'}`}>
        {desc}
      </p>
    </div>
  );
};

// Main HomePage Component
const HomePage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const [activeEvolution, setActiveEvolution] = useState(2);
  const navigate = useNavigate();
  const evolutionRef = useRef(null);

  const handleContactClick = () => navigate('/get-in-touch');

  // Evolution scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (evolutionRef.current) {
        const rect = evolutionRef.current.getBoundingClientRect();
        const scrollProgress = 1 - (rect.top / window.innerHeight);
        if (scrollProgress < 0.3) setActiveEvolution(0);
        else if (scrollProgress < 0.6) setActiveEvolution(1);
        else setActiveEvolution(2);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const evolutionStages = [
    { stage: 'The Past', title: 'The Data Janitor', desc: 'Manual data collection, endless reconciliation, reactive decision-making', icon: Database },
    { stage: 'The Present', title: 'The Informed Observer', desc: 'Basic reporting, siloed systems, limited visibility across entities', icon: Activity },
    { stage: 'The Future', title: 'The Strategic Architect', desc: 'AI-powered automation, enterprise-wide visibility, proactive insights', icon: Target },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <CorporateHeader 
        onLoginClick={() => setShowAuth(true)} 
        onContactClick={handleContactClick}
      />

      {/* Hero Section - Architectural Imagery */}
      <section className="relative pt-44 pb-24 overflow-hidden">
        {/* Background - Steel & Glass Architecture */}
        <div className="absolute inset-0">
          <img 
            src="https://images.pexels.com/photos/256381/pexels-photo-256381.jpeg" 
            alt="Modern glass architecture" 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FAFAFA]/98 via-[#FAFAFA]/90 to-[#FAFAFA]/70" />
        </div>

        <div className="relative container mx-auto px-6">
          <div className="max-w-3xl">
            {/* Glassmorphism Card */}
            <div className="glass-card rounded-2xl p-10">
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-[#005994] mb-6 leading-tight">
                Empowering Industries with Scalable, Future-Ready Digital Transformation
              </h1>
              <p className="text-lg md:text-xl text-[#969696] mb-8 leading-relaxed">
                From payments to hospitality, finance to manufacturing—our expert-driven solutions 
                streamline operations, integrate systems, and drive measurable growth.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button 
                  size="lg" 
                  className="ruler-cta px-8 h-12"
                  onClick={() => navigate('/consulting/unified-digital-transformation-services')}
                  data-testid="explore-services-btn"
                >
                  Explore Our Services <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-[#005994] text-[#005994] hover:bg-[#005994]/5 px-8 h-12"
                  onClick={handleContactClick}
                  data-testid="speak-expert-btn"
                >
                  Speak to an Expert
                </Button>
              </div>
              
              {/* Security Badges */}
              <div className="mt-6 flex items-center gap-4">
                <div className="security-badge">
                  <Lock className="w-3 h-3" />
                  ENTERPRISE SECURE
                </div>
                <div className="security-badge">
                  <Shield className="w-3 h-3" />
                  AUDIT-READY
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="py-12 bg-white border-y border-gray-100">
        <div className="container mx-auto px-6">
          <div className="flex flex-wrap justify-center gap-12 md:gap-20">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#005994] font-display">50+</div>
              <div className="text-[#969696] mt-2">Occupations</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#D4AF37] font-display">3,589+</div>
              <div className="text-[#969696] mt-2">Successful Projects</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#005994] font-display">8,543+</div>
              <div className="text-[#969696] mt-2">Customers Trust</div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Core Services Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              Our Core Services
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Comprehensive transformation services tailored to your industry needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Card 1: Digital Transformation */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-subtle hover:shadow-elevated transition-smooth group">
              <div className="h-48 relative overflow-hidden">
                <img 
                  src="https://images.pexels.com/photos/7688336/pexels-photo-7688336.jpeg" 
                  alt="Cloud integration" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              </div>
              <div className="p-8 -mt-8 relative">
                <div className="w-14 h-14 bg-[#005994] rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <Rocket className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display text-xl text-[#005994] mb-2">Unified Digital Transformation</h3>
                <p className="text-[#D4AF37] font-medium text-sm mb-3">System Integration &bull; Cloud API &bull; Data Alignment</p>
                <p className="text-[#969696] mb-6 text-sm leading-relaxed">
                  Enterprise-wide visibility with audit-ready data alignment across all your systems.
                </p>
                <Link 
                  to="/consulting/unified-digital-transformation-services" 
                  className="inline-flex items-center text-[#D4AF37] hover:text-[#B8923F] font-medium"
                  data-testid="dt-learn-more"
                >
                  Learn More <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 2: Programme Governance */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-subtle hover:shadow-elevated transition-smooth group">
              <div className="h-48 relative overflow-hidden">
                <img 
                  src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg" 
                  alt="Programme governance" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              </div>
              <div className="p-8 -mt-8 relative">
                <div className="w-14 h-14 bg-[#005994] rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <Compass className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display text-xl text-[#005994] mb-2">Integrated Programme Governance</h3>
                <p className="text-[#D4AF37] font-medium text-sm mb-3">Strategic Alignment &bull; Risk &amp; Compliance &bull; Performance</p>
                <p className="text-[#969696] mb-6 text-sm leading-relaxed">
                  Your Control Tower for complete programme visibility and risk management.
                </p>
                <Link 
                  to="/consulting/integrated-programme-governance-solutions" 
                  className="inline-flex items-center text-[#D4AF37] hover:text-[#B8923F] font-medium"
                  data-testid="pg-learn-more"
                >
                  Learn More <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Card 3: Business Process Alignment */}
            <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-subtle hover:shadow-elevated transition-smooth group">
              <div className="h-48 relative overflow-hidden">
                <img 
                  src="https://images.pexels.com/photos/3182812/pexels-photo-3182812.jpeg" 
                  alt="Process alignment" 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent to-transparent" />
              </div>
              <div className="p-8 -mt-8 relative">
                <div className="w-14 h-14 bg-[#005994] rounded-xl flex items-center justify-center mb-4 shadow-lg">
                  <Settings className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display text-xl text-[#005994] mb-2">Business Process Alignment</h3>
                <p className="text-[#D4AF37] font-medium text-sm mb-3">Standardisation &bull; Consolidation &bull; Mapping</p>
                <p className="text-[#969696] mb-6 text-sm leading-relaxed">
                  Visibility that leads to victory—simplify, standardize, and scale with precision.
                </p>
                <Link 
                  to="/consulting/business-process-alignment-standardisation" 
                  className="inline-flex items-center text-[#D4AF37] hover:text-[#B8923F] font-medium"
                  data-testid="pa-learn-more"
                >
                  Learn More <ArrowRight className="ml-2 w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The Evolution Scroll */}
      <section ref={evolutionRef} className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              The Evolution of Finance Operations
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Transform from reactive data collection to strategic decision-making
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {evolutionStages.map((stage, i) => (
              <EvolutionStage 
                key={i} 
                {...stage} 
                isActive={activeEvolution === i && i === 2}
                isPast={i < activeEvolution}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Product Spotlight - Midnight & Gold */}
      <section className="py-20 midnight-section">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-8">
              <span className="inline-block px-4 py-1 bg-[#D4AF37]/20 text-[#D4AF37] rounded-full text-sm font-medium mb-4">
                Featured Platform
              </span>
              <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
                Product Spotlight
              </h2>
            </div>

            <div className="glass-card-dark rounded-3xl overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-0">
                {/* Image Side */}
                <div className="relative h-64 lg:h-auto">
                  <img 
                    src="https://images.pexels.com/photos/7681091/pexels-photo-7681091.jpeg" 
                    alt="Financial dashboard" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#1A1A2E]/50" />
                </div>
                
                {/* Content Side */}
                <div className="p-10 lg:p-12 flex flex-col justify-center">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 bg-[#D4AF37] rounded-xl flex items-center justify-center mr-4 glow-gold">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-display text-2xl text-white">Realtime Finance</h3>
                      <p className="text-[#D4AF37] font-medium text-sm">Enterprise CFO Agent Platform</p>
                    </div>
                  </div>
                  
                  <p className="text-white/70 mb-6 leading-relaxed">
                    Automate finance operations, reconciliations, and reporting across multi-entity 
                    organizations. Transform from &quot;Data Collector&quot; to &quot;Strategic Architect.&quot;
                  </p>

                  <div className="flex flex-wrap gap-3 mb-6">
                    <span className="px-3 py-1 bg-[#D4AF37]/20 text-[#D4AF37] rounded-full text-sm">14+ ERP Integrations</span>
                    <span className="px-3 py-1 bg-[#D4AF37]/20 text-[#D4AF37] rounded-full text-sm">Real-time FX</span>
                    <span className="px-3 py-1 bg-[#87C71F]/20 text-[#87C71F] rounded-full text-sm">Self-Healing</span>
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <Button 
                      className="ruler-cta-gold px-6"
                      onClick={() => navigate('/platform/realtime-finance-cfo-automation')}
                      data-testid="explore-platform-btn"
                    >
                      Explore Platform <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-[#D4AF37]/50 text-[#D4AF37] hover:bg-[#D4AF37]/10"
                      onClick={() => setShowAuth(true)}
                    >
                      Start Free Trial
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              What Sets Us Apart
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="glass-card rounded-2xl p-8 hover:shadow-elevated transition-smooth">
              <Quote className="w-10 h-10 text-[#D4AF37]/30 mb-4" />
              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                &quot;DigiTrans Global provided exceptional Integrated Programme Governance... 
                A truly invaluable transformation partner!&quot;
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#005994]/10 rounded-full flex items-center justify-center mr-4">
                  <Users className="w-6 h-6 text-[#005994]" />
                </div>
                <div>
                  <div className="text-[#005994] font-medium">Senior Finance System Director</div>
                  <div className="text-[#969696] text-sm">Enterprise Client</div>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-8 hover:shadow-elevated transition-smooth">
              <Quote className="w-10 h-10 text-[#D4AF37]/30 mb-4" />
              <p className="text-gray-700 text-lg leading-relaxed mb-6">
                &quot;Seamlessly integrated disparate internal systems... 
                A game-changing partner for our digital transformation journey.&quot;
              </p>
              <div className="flex items-center">
                <div className="w-12 h-12 bg-[#005994]/10 rounded-full flex items-center justify-center mr-4">
                  <Briefcase className="w-6 h-6 text-[#005994]" />
                </div>
                <div>
                  <div className="text-[#005994] font-medium">CIO, Banking</div>
                  <div className="text-[#969696] text-sm">Financial Services</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Global Footer CTA */}
      <GlobalFooterCTA onContactClick={handleContactClick} />

      <CorporateFooter />

      {/* Auth Dialog */}
      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </div>
  );
};

export default HomePage;
