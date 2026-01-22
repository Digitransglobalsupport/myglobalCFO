import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Phone, MapPin, Send, CheckCircle, Clock, MessageSquare, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { CorporateHeader, CorporateFooter } from './HomePage';

const ContactPage = () => {
  const [showAuth, setShowAuth] = useState(false);
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    service: '',
    message: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Thank you! We will be in touch shortly.');
    setSubmitted(true);
    setLoading(false);
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const services = [
    { value: 'digital-transformation', label: 'Digital Transformation' },
    { value: 'programme-governance', label: 'Programme Governance' },
    { value: 'process-alignment', label: 'Business Process Alignment' },
    { value: 'realtime-finance', label: 'Realtime Finance Platform' },
    { value: 'other', label: 'Other / General Inquiry' }
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <CorporateHeader 
        onLoginClick={() => setShowAuth(true)} 
        onContactClick={() => {}}
      />

      {/* Hero Section */}
      <section className="relative pt-44 pb-12">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#005994] mb-4 leading-tight">
              Ready to Transform Your Business?
            </h1>
            <p className="text-lg text-[#969696] max-w-2xl mx-auto leading-relaxed">
              Get in touch with our team of experts to discuss how we can help 
              drive your digital transformation journey.
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            
            {/* Contact Form */}
            <div className="glass-card rounded-2xl p-8">
              <h2 className="font-display text-2xl text-[#005994] mb-6">Send us a Message</h2>
              
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-[#87c71f]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-10 h-10 text-[#87c71f]" />
                  </div>
                  <h3 className="text-2xl text-[#005994] font-display mb-2">Thank You!</h3>
                  <p className="text-[#969696] mb-6">
                    We&apos;ve received your message and will get back to you within 24 hours.
                  </p>
                  <Button 
                    variant="outline" 
                    className="border-[#005994] text-[#005994] hover:bg-[#005994]/5"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ name: '', email: '', company: '', phone: '', service: '', message: '' });
                    }}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" data-testid="contact-form">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-gray-700">Full Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="bg-white/50 border-gray-200 text-gray-900 mt-1 focus:bg-white"
                        placeholder="John Smith"
                        required
                        data-testid="contact-name-input"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Work Email *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="bg-white/50 border-gray-200 text-gray-900 mt-1 focus:bg-white"
                        placeholder="john@company.com"
                        required
                        data-testid="contact-email-input"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-gray-700">Company</Label>
                      <Input
                        value={formData.company}
                        onChange={(e) => handleChange('company', e.target.value)}
                        className="bg-white/50 border-gray-200 text-gray-900 mt-1 focus:bg-white"
                        placeholder="Company Name"
                        data-testid="contact-company-input"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Phone</Label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="bg-white/50 border-gray-200 text-gray-900 mt-1 focus:bg-white"
                        placeholder="+44 1234 567890"
                        data-testid="contact-phone-input"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-700">Service of Interest</Label>
                    <Select 
                      value={formData.service} 
                      onValueChange={(value) => handleChange('service', value)}
                    >
                      <SelectTrigger className="bg-white/50 border-gray-200 text-gray-900 mt-1" data-testid="contact-service-select">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        {services.map((service) => (
                          <SelectItem key={service.value} value={service.value} className="text-gray-900">
                            {service.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-700">Message *</Label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => handleChange('message', e.target.value)}
                      className="bg-white/50 border-gray-200 text-gray-900 mt-1 min-h-[120px] focus:bg-white"
                      placeholder="Tell us about your project or requirements..."
                      required
                      data-testid="contact-message-input"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-[#005994] hover:bg-[#004270] text-white font-semibold h-12"
                    disabled={loading}
                    data-testid="contact-submit-btn"
                  >
                    {loading ? 'Sending...' : 'Send Message'}
                    <Send className="ml-2 w-4 h-4" />
                  </Button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-6">
              {/* Direct Contact */}
              <div className="glass-card rounded-2xl p-8">
                <h2 className="font-display text-2xl text-[#005994] mb-6">Contact Information</h2>
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-[#005994] rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <Phone className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-[#005994] font-medium mb-1">Phone</div>
                      <a href="tel:08451630722" className="text-[#969696] hover:text-[#87c71f] transition-colors">
                        08451630722
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-[#005994] rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <Mail className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-[#005994] font-medium mb-1">Email</div>
                      <a href="mailto:hello@digitransglobal.com" className="text-[#969696] hover:text-[#87c71f] transition-colors">
                        hello@digitransglobal.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-[#005994] rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-[#005994] font-medium mb-1">Office</div>
                      <address className="text-[#969696] not-italic">
                        The Works Lab, Claysdon Lane,<br />
                        Rayleigh, Essex, SS6 7UP
                      </address>
                    </div>
                  </div>
                </div>
              </div>

              {/* Response Time Card */}
              <div className="glass-card rounded-2xl p-8">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-[#87c71f] rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-[#005994] font-medium mb-2">Response Time</div>
                    <p className="text-[#969696] text-sm">
                      We typically respond to all inquiries within 24 hours during business days. 
                      For urgent matters, please call us directly.
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Contact Options */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-card rounded-xl p-5 text-center hover:shadow-elevated transition-all">
                  <div className="w-10 h-10 bg-[#005994]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <MessageSquare className="w-5 h-5 text-[#005994]" />
                  </div>
                  <div className="text-[#005994] font-medium text-sm">Live Chat</div>
                  <div className="text-[#969696] text-xs">Coming Soon</div>
                </div>
                <div className="glass-card rounded-xl p-5 text-center hover:shadow-elevated transition-all">
                  <div className="w-10 h-10 bg-[#005994]/10 rounded-lg flex items-center justify-center mx-auto mb-3">
                    <Users className="w-5 h-5 text-[#005994]" />
                  </div>
                  <div className="text-[#005994] font-medium text-sm">Schedule a Call</div>
                  <div className="text-[#969696] text-xs">Book Meeting</div>
                </div>
              </div>

              {/* Map */}
              <div className="glass-card rounded-2xl overflow-hidden h-48">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2478.8!2d0.6!3d51.58!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTHCsDM0JzQ4LjAiTiAwwrAzNicwMC4wIkU!5e0!3m2!1sen!2suk!4v1234567890"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Office Location"
                  className="opacity-90 hover:opacity-100 transition-opacity"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <CorporateFooter />
    </div>
  );
};

export default ContactPage;
