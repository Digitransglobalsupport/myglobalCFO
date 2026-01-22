import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Phone, MapPin, Send, CheckCircle, Clock
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
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-[#005994] mb-6 leading-tight">
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
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-subtle">
              <h2 className="font-display text-2xl text-[#005994] mb-6">Send us a Message</h2>
              
              {submitted ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-[#87c71f]/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="w-8 h-8 text-[#87c71f]" />
                  </div>
                  <h3 className="text-xl text-[#005994] mb-2">Thank You!</h3>
                  <p className="text-[#969696] mb-6">
                    We&apos;ve received your message and will get back to you within 24 hours.
                  </p>
                  <Button 
                    variant="outline" 
                    className="border-[#005994] text-[#005994]"
                    onClick={() => setSubmitted(false)}
                  >
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-gray-700">Full Name *</Label>
                      <Input
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                        placeholder="John Smith"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Work Email *</Label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                        placeholder="john@company.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-gray-700">Company</Label>
                      <Input
                        value={formData.company}
                        onChange={(e) => handleChange('company', e.target.value)}
                        className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                        placeholder="Company Name"
                      />
                    </div>
                    <div>
                      <Label className="text-gray-700">Phone</Label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        className="bg-gray-50 border-gray-200 text-gray-900 mt-1"
                        placeholder="+44 1234 567890"
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-gray-700">Service of Interest</Label>
                    <Select 
                      value={formData.service} 
                      onValueChange={(value) => handleChange('service', value)}
                    >
                      <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-900 mt-1">
                        <SelectValue placeholder="Select a service" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200">
                        <SelectItem value="digital-transformation" className="text-gray-900">Digital Transformation</SelectItem>
                        <SelectItem value="programme-governance" className="text-gray-900">Programme Governance</SelectItem>
                        <SelectItem value="realtime-finance" className="text-gray-900">Realtime Finance</SelectItem>
                        <SelectItem value="other" className="text-gray-900">Other / General Inquiry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-gray-700">Message *</Label>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => handleChange('message', e.target.value)}
                      className="bg-gray-50 border-gray-200 text-gray-900 mt-1 min-h-[120px]"
                      placeholder="Tell us about your project or requirements..."
                      required
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-[#005994] hover:bg-[#004270] text-white font-semibold h-12"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Message'}
                    <Send className="ml-2 w-4 h-4" />
                  </Button>
                </form>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-8">
              {/* Direct Contact */}
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-subtle">
                <h2 className="font-display text-2xl text-[#005994] mb-6">Contact Information</h2>
                <div className="space-y-6">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-[#005994]/10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <Phone className="w-5 h-5 text-[#005994]" />
                    </div>
                    <div>
                      <div className="text-[#005994] font-medium mb-1">Phone</div>
                      <a href="tel:08451630722" className="text-[#969696] hover:text-[#87c71f] transition-colors">
                        08451630722
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-[#005994]/10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <Mail className="w-5 h-5 text-[#005994]" />
                    </div>
                    <div>
                      <div className="text-[#005994] font-medium mb-1">Email</div>
                      <a href="mailto:hello@digitransglobal.com" className="text-[#969696] hover:text-[#87c71f] transition-colors">
                        hello@digitransglobal.com
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-[#005994]/10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <MapPin className="w-5 h-5 text-[#005994]" />
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

              {/* Response Time */}
              <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-subtle">
                <div className="flex items-start">
                  <div className="w-12 h-12 bg-[#87c71f]/10 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                    <Clock className="w-5 h-5 text-[#87c71f]" />
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

              {/* Map */}
              <div className="bg-white rounded-2xl overflow-hidden h-64 border border-gray-100 shadow-subtle">
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
