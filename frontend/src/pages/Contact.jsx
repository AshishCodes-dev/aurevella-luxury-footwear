import React, { useState } from 'react';
import { MessageCircle, Mail, Clock, MapPin, Send, CheckCircle2 } from 'lucide-react';
import useDocumentTitle from '../utils/useDocumentTitle.js';
import siteConfig from '../content/site.js';
import { Button } from '../components/ui/button.jsx';
import { Input } from '../components/ui/input.jsx';
import { Label } from '../components/ui/label.jsx';

const InstagramIcon = ({ size = 18, className = '' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const Contact = () => {
  useDocumentTitle('Contact & Concierge');

  const [formSubmitted, setFormSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    topic: 'sizing',
    message: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate swift client inquiry routing
    setTimeout(() => {
      setIsSubmitting(false);
      setFormSubmitted(true);
    }, 600);
  };

  const channels = [
    {
      icon: MessageCircle,
      title: 'WhatsApp Concierge',
      detail: siteConfig.contact.whatsapp.number,
      description: 'Instant sizing advice, live heel mechanism video demos, and bespoke booking.',
      actionText: 'Open WhatsApp Chat',
      actionUrl: siteConfig.contact.whatsapp.url,
      isExternal: true,
      highlight: true,
    },
    {
      icon: Mail,
      title: 'Atelier Inquiries',
      detail: siteConfig.contact.email,
      description: 'Private commissions, order reconciliation, and formal client communications.',
      actionText: 'Email Concierge',
      actionUrl: `mailto:${siteConfig.contact.email}`,
      isExternal: true,
      highlight: false,
    },
    {
      icon: InstagramIcon,
      title: 'Instagram Atelier',
      detail: siteConfig.contact.instagram.handle,
      description: 'Behind-the-scenes leather sourcing, runway previews, and styling showcases.',
      actionText: 'Follow @myaurevella',
      actionUrl: siteConfig.contact.instagram.url,
      isExternal: true,
      highlight: false,
    },
  ];

  return (
    <div className="flex-1 w-full bg-[#0F0A09] text-[#FEF5E6]">
      {/* Hero Header */}
      <section className="border-b border-[#2F1C15] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center bg-[#140E0C]">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#B8AD9A] font-medium block">
            Atelier Service
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#FEF5E6] tracking-wide">
            Contact & Concierge
          </h1>
          <p className="text-sm sm:text-base text-[#B8AD9A] max-w-xl mx-auto leading-relaxed pt-2">
            Whether you require personal fit consultation, wish to reserve a limited edition serial number, or need assistance with your existing commission.
          </p>
        </div>
      </section>

      {/* Direct Contact Cards */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {channels.map((chan, idx) => {
            const Icon = chan.icon;
            return (
              <div
                key={idx}
                className={`p-6 border transition-subtle flex flex-col justify-between space-y-4 ${
                  chan.highlight
                    ? 'bg-[#181210] border-[#FEF5E6]/40 shadow-sm'
                    : 'bg-[#140E0C] border-[#2F1C15] hover:border-[#4A2C26]'
                }`}
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-full bg-[#0F0A09] border border-[#2F1C15] flex items-center justify-center text-[#FEF5E6]">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg text-[#FEF5E6]">{chan.title}</h3>
                    <p className="font-mono text-xs text-[#FEF5E6] font-medium pt-0.5">{chan.detail}</p>
                  </div>
                  <p className="text-xs text-[#B8AD9A] leading-relaxed">{chan.description}</p>
                </div>

                <a
                  href={chan.actionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`min-h-[40px] px-4 text-xs uppercase tracking-wider font-semibold transition-subtle flex items-center justify-center ${
                    chan.highlight
                      ? 'bg-[#FEF5E6] text-[#0F0A09] hover:bg-white'
                      : 'border border-[#2F1C15] text-[#FEF5E6] hover:bg-[#1D1412]'
                  }`}
                >
                  {chan.actionText}
                </a>
              </div>
            );
          })}
        </div>
      </section>

      {/* Interactive Form & Atelier Details */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Form */}
          <div className="lg:col-span-7 bg-[#181210] border border-[#2F1C15] p-6 sm:p-8">
            <h2 className="font-serif text-2xl text-[#FEF5E6] mb-2">Send an Inquiry</h2>
            <p className="text-xs text-[#B8AD9A] mb-6">
              Our dedicated client relations team reviews all correspondence and responds within 4 business hours.
            </p>

            {formSubmitted ? (
              <div className="p-8 bg-[#140E0C] border border-emerald-800 text-center space-y-4 animate-fade-in">
                <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
                <h3 className="font-serif text-xl text-[#FEF5E6]">Inquiry Received</h3>
                <p className="text-xs text-[#B8AD9A] max-w-md mx-auto leading-relaxed">
                  Thank you for contacting AUREVELLA. An atelier concierge has received your request and will reach out to <strong className="text-[#FEF5E6]">{formData.email}</strong> shortly.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setFormSubmitted(false)}
                >
                  Send Another Inquiry
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact-name">Your Full Name *</Label>
                    <Input
                      id="contact-name"
                      type="text"
                      required
                      placeholder="e.g. Radhika Kapoor"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact-email">Email Address *</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      required
                      placeholder="radhika@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="contact-phone">Contact Phone (Optional)</Label>
                    <Input
                      id="contact-phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="contact-topic">Inquiry Nature</Label>
                    <select
                      id="contact-topic"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      className="w-full bg-[#0F0A09] border border-[#2F1C15] focus:border-[#FEF5E6] px-3.5 py-2.5 text-xs text-[#FEF5E6] outline-none transition-subtle cursor-pointer"
                    >
                      <option value="sizing">Fit & Sizing Consultation</option>
                      <option value="order_status">Order & Commission Tracking</option>
                      <option value="limited_edition">Limited Edition Reservation</option>
                      <option value="exchange_return">Sizing Exchange or Return</option>
                      <option value="wholesale_press">Press & Private Wholesale</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="contact-message">Your Message *</Label>
                  <textarea
                    id="contact-message"
                    required
                    rows={4}
                    placeholder="Please describe your sizing inquiry, footwear silhouette questions, or order number..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-[#0F0A09] border border-[#2F1C15] focus:border-[#FEF5E6] px-3.5 py-2.5 text-xs text-[#FEF5E6] outline-none transition-subtle"
                  />
                </div>

                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  <Send size={14} className="mr-2" />
                  {isSubmitting ? 'Transmitting...' : 'Submit Inquiry'}
                </Button>
              </form>
            )}
          </div>

          {/* Operational Details */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#181210] border border-[#2F1C15] p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#FEF5E6]">
                <Clock size={16} />
                <h3 className="font-serif text-lg">Concierge Operating Hours</h3>
              </div>
              <p className="text-xs text-[#B8AD9A] leading-relaxed">
                {siteConfig.contact.supportHours}<br />
                Inquiries received outside operational windows will be prioritized the following business morning.
              </p>
              {/* TODO(client): Confirm official concierge operating hours and holiday closures */}
            </div>

            <div className="bg-[#181210] border border-[#2F1C15] p-6 space-y-4">
              <div className="flex items-center gap-2 text-[#FEF5E6]">
                <MapPin size={16} />
                <h3 className="font-serif text-lg">Atelier Location</h3>
              </div>
              <p className="text-xs text-[#B8AD9A] leading-relaxed">
                {siteConfig.contact.studioAddress}
              </p>
              {/* TODO(client): Physical studio or registered office address to be published upon private showroom opening */}
              <p className="text-[10px] text-[#B8AD9A]/70">
                Showroom appointment details are provided upon concierge booking confirmation.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Contact;