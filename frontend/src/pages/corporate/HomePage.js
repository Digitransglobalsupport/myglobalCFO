import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Cloud, Shield, BarChart3, ArrowRight, CheckCircle, 
  ChevronRight, Quote, Users, Briefcase, Award,
  Menu, X, ChevronDown, Phone, Mail
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL ? `${process.env.REACT_APP_BACKEND_URL}/api` : '/api';

// Corporate Header Component - Light Theme with Blue Nav
export const CorporateHeader = ({ onLoginClick, onContactClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);

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
          {/* Logo */}
          <Link to="/" className="flex items-center bg-white rounded-lg px-3 py-2">
            <img 
              src="https://customer-assets.emergentagent.com/job_cfo-toolkit-1/artifacts/mr25aajy_Digitrans%20Global%20-%20Digitrans%20Global%20Logo.png" 
              alt="Digitrans Global" 
              className="h-10 w-auto"
            />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            <Link to="/" className="text-white/90 hover:text-white transition-colors font-medium">
              Home
            </Link>
            
            {/* Solutions Dropdown */}
            <div className="relative group">
              <button 
                className="flex items-center text-white/90 hover:text-white transition-colors font-medium"
                onMouseEnter={() => setSolutionsOpen(true)}
                onMouseLeave={() => setSolutionsOpen(false)}
              >
                Solutions <ChevronDown className="w-4 h-4 ml-1" />
              </button>
              <div 
                className={`absolute top-full left-0 mt-2 w-80 bg-white border border-gray-100 rounded-xl shadow-xl overflow-hidden transition-all duration-200 ${solutionsOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onMouseEnter={() => setSolutionsOpen(true)}
                onMouseLeave={() => setSolutionsOpen(false)}
              >
                <Link to="/solutions/digital-transformation" className="block px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
                  <div className="text-[#005994] font-semibold">Unified Digital Transformation</div>
                  <div className="text-[#969696] text-sm mt-1">M&amp;A Integration &amp; Process Alignment</div>
                </Link>
                <Link to="/solutions/programme-governance" className="block px-5 py-4 hover:bg-gray-50 transition-colors border-b border-gray-100">
                  <div className="text-[#005994] font-semibold">End-to-End Programme Governance</div>
                  <div className="text-[#969696] text-sm mt-1">Risk, Change &amp; Project Management</div>
                </Link>
                <Link to="/solutions/realtime-finance" className="block px-5 py-4 hover:bg-gray-50 transition-colors">
                  <div className="text-[#87c71f] font-semibold">Realtime Finance</div>
                  <div className="text-[#969696] text-sm mt-1">Enterprise CFO Agent Platform</div>
                </Link>
              </div>
            </div>

            <Link to="/industries" className="text-white/90 hover:text-white transition-colors font-medium">
              Industries
            </Link>
            <Link to="/company" className="text-white/90 hover:text-white transition-colors font-medium">
              About Us
            </Link>
            <Link to="/contact" className="text-white/90 hover:text-white transition-colors font-medium">
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
              className="bg-[#87c71f] hover:bg-[#9ed93d] text-white font-semibold px-6"
              onClick={onContactClick}
            >
              Get Started
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
                <div className="text-white/60 text-sm mb-2">Solutions</div>
                <Link to="/solutions/digital-transformation" className="block text-white/90 hover:text-white py-2 pl-4">
                  Digital Transformation
                </Link>
                <Link to="/solutions/programme-governance" className="block text-white/90 hover:text-white py-2 pl-4">
                  Programme Governance
                </Link>
                <Link to="/solutions/realtime-finance" className="block text-[#87c71f] hover:text-[#9ed93d] py-2 pl-4">
                  Realtime Finance
                </Link>
              </div>
              <Link to="/industries" className="text-white/90 hover:text-white py-2">Industries</Link>
              <Link to="/company" className="text-white/90 hover:text-white py-2">About Us</Link>
              <Link to="/contact" className="text-white/90 hover:text-white py-2">Contact</Link>
              <div className="flex flex-col space-y-2 pt-4 border-t border-white/20">
                <Button variant="outline" className="border-white/30 text-white" onClick={onLoginClick}>
                  Login
                </Button>
                <Button className="bg-[#87c71f] text-white" onClick={onContactClick}>
                  Get Started
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

// Corporate Footer Component - Light Theme
export const CorporateFooter = () => (
  <footer className="bg-[#005994] text-white">
    <div className="container mx-auto px-6 py-16">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Brand */}
        <div>
          <div className="bg-white rounded-lg px-3 py-2 inline-block mb-6">
            <img 
              src="https://customer-assets.emergentagent.com/job_cfo-toolkit-1/artifacts/mr25aajy_Digitrans%20Global%20-%20Digitrans%20Global%20Logo.png" 
              alt="Digitrans Global" 
              className="h-10 w-auto"
            />
          </div>
          <p className="text-white/80 leading-relaxed">
            Empowering industries with scalable, future-ready digital transformation solutions.
          </p>
        </div>

        {/* Solutions */}
        <div>
          <h4 className="font-semibold mb-6 text-lg">Solutions</h4>
          <ul className="space-y-3">
            <li><Link to="/solutions/digital-transformation" className="text-white/80 hover:text-[#87c71f] transition-colors">Digital Transformation</Link></li>
            <li><Link to="/solutions/programme-governance" className="text-white/80 hover:text-[#87c71f] transition-colors">Programme Governance</Link></li>
            <li><Link to="/solutions/realtime-finance" className="text-[#87c71f] hover:text-[#9ed93d] transition-colors">Realtime Finance</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className="font-semibold mb-6 text-lg">Company</h4>
          <ul className="space-y-3">
            <li><Link to="/company" className="text-white/80 hover:text-[#87c71f] transition-colors">About Us</Link></li>
            <li><Link to="/industries" className="text-white/80 hover:text-[#87c71f] transition-colors">Industries</Link></li>
            <li><Link to="/contact" className="text-white/80 hover:text-[#87c71f] transition-colors">Contact</Link></li>
          </ul>
        </div>

        {/* Contact */}
        <div>
          <h4 className="font-semibold mb-6 text-lg">Contact Us</h4>
          <ul className="space-y-3 text-white/80">
            <li className="flex items-center">
              <Phone className="w-4 h-4 mr-2 text-[#87c71f]" />
              08451630722
            </li>
            <li className="flex items-center">
              <Mail className="w-4 h-4 mr-2 text-[#87c71f]" />
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
              className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-[#87c71f] transition-colors"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>

      <div className="border-t border-white/20 mt-12 pt-8 text-center text-white/60 text-sm">
        © {new Date().getFullYear()} Digitrans Global. All rights reserved.
      </div>
    </div>
  </footer>
);

// Auth Dialog Component - Light Theme
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
            className="text-[#87c71f] hover:text-[#6ba318] ml-2 font-medium"
          >
            {mode === 'login' ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Main HomePage Component - Light Theme
const HomePage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();

  const handleContactClick = () => navigate('/contact');

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <CorporateHeader 
        onLoginClick={() => setShowAuth(true)} 
        onContactClick={handleContactClick}
      />

      {/* Hero Section */}
      <section className="relative pt-44 pb-24 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-[#005994] mb-6 leading-tight">
              Empowering Industries with Scalable, Future-Ready Digital Transformation
            </h1>
            <p className="text-lg text-[#969696] max-w-2xl mb-10 leading-relaxed">
              From payments to hospitality, finance to manufacturing—our expert-driven solutions 
              streamline operations, integrate systems, and drive measurable growth.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button 
                size="lg" 
                className="bg-[#005994] hover:bg-[#004270] text-white font-semibold px-8 h-12"
                onClick={() => navigate('/solutions/digital-transformation')}
                data-testid="view-solutions-btn"
              >
                Explore Solutions <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-[#005994] text-[#005994] hover:bg-[#005994]/5 px-8 h-12"
                onClick={handleContactClick}
                data-testid="contact-us-btn"
              >
                Speak to an Expert
              </Button>
            </div>
            </div>
            
            {/* Hero Image */}
            <div className="hidden lg:block">
              <img 
                src="https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg" 
                alt="Business professionals collaborating" 
                className="rounded-2xl shadow-2xl w-full h-auto object-cover"
              />
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
              <div className="text-4xl md:text-5xl font-bold text-[#005994] font-display">3,589+</div>
              <div className="text-[#969696] mt-2">Successful Projects</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#005994] font-display">8,543+</div>
              <div className="text-[#969696] mt-2">Customers Trust</div>
            </div>
          </div>
        </div>
      </section>

      {/* Solution Cards */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              Our Core Solutions
            </h2>
            <p className="text-[#969696] max-w-2xl mx-auto">
              Comprehensive transformation services tailored to your industry needs
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Card 1: Digital Transformation */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-subtle hover:shadow-elevated transition-all group">
              <div className="w-14 h-14 bg-[#005994]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#005994]/15 transition-colors">
                <Cloud className="w-7 h-7 text-[#005994]" />
              </div>
              <h3 className="font-display text-xl text-[#005994] mb-3">Unified Digital Transformation</h3>
              <p className="text-[#969696] mb-6 leading-relaxed">
                Integrating ERP, CRM, and financial systems with cloud and AI for seamless workflows.
              </p>
              <Link 
                to="/solutions/digital-transformation" 
                className="inline-flex items-center text-[#87c71f] hover:text-[#6ba318] font-medium"
              >
                Learn More <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>

            {/* Card 2: Programme Governance */}
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-subtle hover:shadow-elevated transition-all group">
              <div className="w-14 h-14 bg-[#005994]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#005994]/15 transition-colors">
                <Shield className="w-7 h-7 text-[#005994]" />
              </div>
              <h3 className="font-display text-xl text-[#005994] mb-3">End-to-End Programme Governance</h3>
              <p className="text-[#969696] mb-6 leading-relaxed">
                Strategic alignment, risk mitigation, and real-time KPI tracking for large-scale projects.
              </p>
              <Link 
                to="/solutions/programme-governance" 
                className="inline-flex items-center text-[#87c71f] hover:text-[#6ba318] font-medium"
              >
                Learn More <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>

            {/* Card 3: Realtime Finance */}
            <div className="bg-white rounded-2xl p-8 border-2 border-[#87c71f]/30 shadow-subtle hover:shadow-elevated transition-all group">
              <div className="w-14 h-14 bg-[#87c71f]/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-[#87c71f]/15 transition-colors">
                <BarChart3 className="w-7 h-7 text-[#87c71f]" />
              </div>
              <h3 className="font-display text-xl text-[#005994] mb-3">Realtime Finance</h3>
              <p className="text-[#969696] mb-6 leading-relaxed">
                Transform financial operations with real-time insights and automated reconciliations.
              </p>
              <Link 
                to="/solutions/realtime-finance" 
                className="inline-flex items-center text-[#87c71f] hover:text-[#6ba318] font-medium"
              >
                Start Free Trial <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* What Sets Us Apart */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl text-[#005994] mb-4">
              What Sets Us Apart
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="bg-[#FAFAFA] rounded-2xl p-8 border border-gray-100">
              <Quote className="w-10 h-10 text-[#005994]/30 mb-4" />
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

            <div className="bg-[#FAFAFA] rounded-2xl p-8 border border-gray-100">
              <Quote className="w-10 h-10 text-[#005994]/30 mb-4" />
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

      {/* CTA Section */}
      <section className="py-20 bg-[#005994]">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-display text-3xl md:text-4xl text-white mb-4">
              Ready to Transform Your Business?
            </h2>
            <p className="text-white/80 mb-8 max-w-2xl mx-auto">
              Let&apos;s discuss how our solutions can drive measurable growth for your organization.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button 
                size="lg" 
                className="bg-[#87c71f] hover:bg-[#9ed93d] text-white font-semibold px-8"
                onClick={handleContactClick}
              >
                Speak to an Expert
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-white/30 text-white hover:bg-white/10 px-8"
                onClick={() => setShowAuth(true)}
              >
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </section>

      <CorporateFooter />

      {/* Auth Dialog */}
      <AuthDialog open={showAuth} onOpenChange={setShowAuth} />
    </div>
  );
};

export default HomePage;
