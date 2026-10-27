import React from 'react';
import { ShieldCheck, Lock, Eye, FileText, CheckCircle2 } from 'lucide-react';
import useDocumentTitle from '../utils/useDocumentTitle.js';
import siteConfig from '../content/site.js';

export const PrivacyPolicy = () => {
  useDocumentTitle('Privacy Policy');

  return (
    <div className="flex-1 w-full bg-[#0F0A09] text-[#FEF5E6]">
      {/* Header */}
      <section className="border-b border-[#2F1C15] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center bg-[#140E0C]">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#B8AD9A] font-medium block">
            Client Protection
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#FEF5E6] tracking-wide">
            Privacy Policy
          </h1>
          <p className="text-sm sm:text-base text-[#B8AD9A] max-w-xl mx-auto leading-relaxed pt-2">
            Your privacy, sizing preferences, and transaction records are safeguarded with strict atelier discretion and industry-leading security protocols.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-xs sm:text-sm text-[#B8AD9A] leading-relaxed">
        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-[#FEF5E6]">
            <ShieldCheck size={20} />
            <h2 className="font-serif text-xl">1. Our Commitment to Client Discretion</h2>
          </div>
          <p>
            At AUREVELLA, we treat our patrons’ information with the same meticulous discretion we apply to our handcrafted footwear. We collect only the data necessary to fulfill your orders, provide sizing consultation, and ensure a seamless bespoke shopping experience.
          </p>
        </div>

        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-[#FEF5E6]">
            <FileText size={20} />
            <h2 className="font-serif text-xl">2. Information We Collect</h2>
          </div>
          <p>We collect and process the following information when you interact with our platform:</p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs">
            <li><strong className="text-[#FEF5E6]">Account Details:</strong> Your name, email address, and contact telephone number.</li>
            <li><strong className="text-[#FEF5E6]">Delivery Destination:</strong> Residential, office, or atelier shipping addresses and PIN codes.</li>
            <li><strong className="text-[#FEF5E6]">Order History & Preferences:</strong> Selected shoe sizes, historical commissions, and payment transaction references.</li>
            <li><strong className="text-[#FEF5E6]">Concierge Communications:</strong> Sizing questions, custom requests, and feedback submitted via email or WhatsApp.</li>
          </ul>
        </div>

        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-[#FEF5E6]">
            <Lock size={20} />
            <h2 className="font-serif text-xl">3. Payment Security & PCI-DSS Compliance</h2>
          </div>
          <p>
            All online financial transactions are processed securely through our authorized payment partner, <strong className="text-[#FEF5E6]">Razorpay</strong>, utilizing bank-grade 256-bit encryption and adhering strictly to <strong className="text-[#FEF5E6]">PCI-DSS Level 1</strong> compliance.
          </p>
          <p>
            AUREVELLA does not store, record, or retain your credit card numbers, CVVs, debit card PINs, or net banking passwords on our application servers at any time.
          </p>
        </div>

        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-[#FEF5E6]">
            <Eye size={20} />
            <h2 className="font-serif text-xl">4. Information Sharing & Third Parties</h2>
          </div>
          <p>
            We strictly do not sell, rent, license, or monetize your personal data. We disclose information only to vetted third-party operational providers essential for service delivery:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Insured courier partners (for door-to-door delivery fulfillment).</li>
            <li>Payment gateways (for payment capture and fraud detection).</li>
            <li>Regulatory or judicial authorities when strictly required by applicable Indian law.</li>
          </ul>
        </div>

        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-xl text-[#FEF5E6]">5. Client Rights & Grievance Contact</h2>
          <p>
            You have the right to request access to your stored personal data, request corrections to your delivery details, or request account closure.
          </p>
          <p>
            For privacy inquiries, please contact our data privacy officer at <a href={`mailto:${siteConfig.contact.email}`} className="text-[#FEF5E6] underline">{siteConfig.contact.email}</a>.
          </p>
          {/* TODO(client): Provide official registered business legal entity name (e.g. Aurevella Luxury Footwear LLP / Pvt Ltd) and formal grievance officer contact details */}
          <p className="text-[11px] text-[#B8AD9A]/70 italic pt-2">
            AUREVELLA complies with the Information Technology Act, 2000 and SPDI Rules. Formal corporate entity registration and grievance officer particulars are available upon request.
          </p>
        </div>
      </section>
    </div>
  );
};

export default PrivacyPolicy;