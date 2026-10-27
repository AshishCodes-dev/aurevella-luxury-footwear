import React from 'react';
import { Scale, FileCheck, AlertCircle, ShieldAlert } from 'lucide-react';
import useDocumentTitle from '../utils/useDocumentTitle.js';
import siteConfig from '../content/site.js';

export const TermsConditions = () => {
  useDocumentTitle('Terms & Conditions');

  return (
    <div className="flex-1 w-full bg-[#0F0A09] text-[#FEF5E6]">
      {/* Header */}
      <section className="border-b border-[#2F1C15] py-16 sm:py-24 px-4 sm:px-6 lg:px-8 text-center bg-[#140E0C]">
        <div className="max-w-3xl mx-auto space-y-4">
          <span className="text-[11px] uppercase tracking-[0.25em] text-[#B8AD9A] font-medium block">
            Client Agreement
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#FEF5E6] tracking-wide">
            Terms & Conditions
          </h1>
          <p className="text-sm sm:text-base text-[#B8AD9A] max-w-xl mx-auto leading-relaxed pt-2">
            The legal framework governing purchases, bespoke commissions, and atelier footwear rights.
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8 text-xs sm:text-sm text-[#B8AD9A] leading-relaxed">
        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-[#FEF5E6]">
            <Scale size={20} />
            <h2 className="font-serif text-xl">1. Agreement to Terms</h2>
          </div>
          <p>
            By accessing the AUREVELLA platform, placing an order, or commissioning bespoke footwear, you agree to be bound by these Terms and Conditions and our associated policies (including our Privacy, Shipping, and Returns Policies).
          </p>
        </div>

        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-[#FEF5E6]">
            <FileCheck size={20} />
            <h2 className="font-serif text-xl">2. Product Descriptions & Artisanal Hallmarks</h2>
          </div>
          <p>
            Every piece of AUREVELLA footwear is crafted individually by skilled artisans using premium natural materials.
          </p>
          <p>
            <strong className="text-[#FEF5E6]">Handcrafted Nuance:</strong> Natural leathers possess subtle grain variations, organic pore structures, and nuanced dye absorption. Such subtleties are the authentic signatures of luxury benchcraft and do not constitute manufacturing defects.
          </p>
        </div>

        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-xl text-[#FEF5E6]">3. Pricing, Taxes & Payment Verification</h2>
          <p>
            All prices displayed on the store are denominated in Indian Rupees (INR) and are inclusive of all applicable Goods and Services Tax (GST).
          </p>
          <p>
            Orders are validated upon electronic confirmation of receipt from our payment processing partner, Razorpay. AUREVELLA reserves the right to cancel or place on administrative hold any transaction flagged by security algorithms for unauthorized or fraudulent card usage.
          </p>
        </div>

        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-[#FEF5E6]">
            <ShieldAlert size={20} />
            <h2 className="font-serif text-xl">4. Intellectual Property & Proprietary Rights</h2>
          </div>
          <p>
            The AUREVELLA name, trademark, bespoke heel attachment engineering, website visuals, product silhouettes, and editorial copy are protected under intellectual property laws.
          </p>
          <p>
            No reproduction, reverse-engineering, mechanical copying, or commercial re-distribution of our interchangeable heel mechanism or designs is permitted without prior written consent.
          </p>
        </div>

        <div className="bg-[#181210] border border-[#2F1C15] p-6 sm:p-8 space-y-4">
          <h2 className="font-serif text-xl text-[#FEF5E6]">5. Governing Law & Jurisdiction</h2>
          <p>
            These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of India. Any legal dispute or claim arising under these terms shall be subject to the exclusive jurisdiction of the competent courts in India.
          </p>
          {/* TODO(client): Specify city of judicial jurisdiction (e.g., Mumbai, Maharashtra or New Delhi) and formal corporate registration number */}
          <p className="text-[11px] text-[#B8AD9A]/70 italic pt-2">
            Subject to the exclusive jurisdiction of the competent courts in India. Official corporate registration details are set forth on commercial receipts.
          </p>
        </div>
      </section>
    </div>
  );
};

export default TermsConditions;