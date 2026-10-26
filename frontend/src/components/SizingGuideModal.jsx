import React, { useEffect, useRef, useState } from 'react';
import { X, Ruler, HelpCircle, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  SIZING_CONVERSION_TABLE,
  MEASUREMENT_STEPS,
  SIZING_DISCLAIMER,
  getSizingConciergeUrl,
} from '../content/sizing.js';

export const SizingGuideModal = ({ isOpen, onClose, productName = '' }) => {
  const [activeTab, setActiveTab] = useState('chart'); // 'chart' | 'measure'
  const modalRef = useRef(null);
  const closeBtnRef = useRef(null);
  const previousActiveElementRef = useRef(null);

  // Focus management & Escape key listener
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement;
    document.body.style.overflow = 'hidden';

    // Focus close button on open
    const timer = setTimeout(() => {
      closeBtnRef.current?.focus();
    }, 50);

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sizing-guide-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog Content */}
      <div
        ref={modalRef}
        className="relative w-full max-w-2xl bg-[#0F0A09] border border-[#2F1C15] shadow-2xl z-10 flex flex-col max-h-[90vh] my-auto animate-fade-in text-xs"
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#2F1C15] flex items-start justify-between bg-[#181210]">
          <div>
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#B8AD9A] block mb-1 font-medium">
              Atelier Fitting Guide
            </span>
            <h2
              id="sizing-guide-title"
              className="font-serif text-xl sm:text-2xl text-[#FEF5E6] tracking-wide"
            >
              Footwear Sizing & Measurements
            </h2>
            {productName && (
              <p className="text-[11px] text-[#B8AD9A] mt-0.5">
                Model: <span className="text-[#FEF5E6] font-medium">{productName}</span>
              </p>
            )}
          </div>

          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            aria-label="Close sizing guide"
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center text-[#B8AD9A] hover:text-[#FEF5E6] transition-subtle -mr-2 -mt-2 outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#2F1C15] bg-[#140E0C]">
          <button
            type="button"
            onClick={() => setActiveTab('chart')}
            className={`flex-1 py-3 px-4 text-center text-xs uppercase tracking-wider font-medium transition-subtle border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'chart'
                ? 'text-[#FEF5E6] border-[#FEF5E6] bg-[#181210]'
                : 'text-[#B8AD9A] border-transparent hover:text-[#FEF5E6]'
            }`}
          >
            <Ruler size={14} />
            <span>Size Conversion</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('measure')}
            className={`flex-1 py-3 px-4 text-center text-xs uppercase tracking-wider font-medium transition-subtle border-b-2 flex items-center justify-center gap-2 ${
              activeTab === 'measure'
                ? 'text-[#FEF5E6] border-[#FEF5E6] bg-[#181210]'
                : 'text-[#B8AD9A] border-transparent hover:text-[#FEF5E6]'
            }`}
          >
            <HelpCircle size={14} />
            <span>How to Measure</span>
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {activeTab === 'chart' ? (
            <div className="space-y-5">
              <p className="text-[#B8AD9A] text-xs leading-relaxed">
                AUREVELLA footwear adheres to continental sizing lasts. Please cross-reference your standard EU, UK, or US size and foot length below.
              </p>

              {/* Conversion Table */}
              <div className="border border-[#2F1C15] bg-[#140E0C] overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#2F1C15] bg-[#181210] text-[#B8AD9A] uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-3.5 font-semibold text-[#FEF5E6]">EU Size</th>
                      <th className="py-2.5 px-3.5">UK</th>
                      <th className="py-2.5 px-3.5">US</th>
                      <th className="py-2.5 px-3.5">Foot Length (cm)</th>
                      <th className="py-2.5 px-3.5">Foot Length (in)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2F1C15]/50 text-xs">
                    {SIZING_CONVERSION_TABLE.map((row) => (
                      <tr key={row.eu} className="hover:bg-[#181210]/50 transition-subtle">
                        <td className="py-2.5 px-3.5 font-medium text-[#FEF5E6]">{row.eu}</td>
                        <td className="py-2.5 px-3.5 text-[#B8AD9A]">{row.uk}</td>
                        <td className="py-2.5 px-3.5 text-[#B8AD9A]">{row.us}</td>
                        <td className="py-2.5 px-3.5 text-[#FEF5E6] font-mono">{row.footLengthCm} cm</td>
                        <td className="py-2.5 px-3.5 text-[#B8AD9A] font-mono">{row.footLengthIn}″</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 bg-[#181210] border border-[#2F1C15] flex items-start gap-2.5 text-[11px] text-[#B8AD9A]">
                <CheckCircle2 size={16} className="text-[#FEF5E6] shrink-0 mt-0.5" />
                <p>
                  <strong className="text-[#FEF5E6]">In-between sizes?</strong> We suggest choosing the next size up for a comfortable fit, especially on high-instep or closed-mule silhouettes.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-[#B8AD9A] text-xs leading-relaxed">
                For the most precise atelier fit, measure both feet standing upright using a wall and a blank sheet of paper:
              </p>

              {/* Numbered Steps */}
              <div className="space-y-3">
                {MEASUREMENT_STEPS.map((step) => (
                  <div
                    key={step.step}
                    className="p-3.5 bg-[#140E0C] border border-[#2F1C15] flex items-start gap-3.5"
                  >
                    <span className="font-serif text-sm text-[#FEF5E6] font-semibold bg-[#181210] border border-[#2F1C15] px-2 py-0.5 shrink-0">
                      {step.step}
                    </span>
                    <div className="space-y-0.5">
                      <h4 className="font-medium text-[#FEF5E6] text-xs">{step.title}</h4>
                      <p className="text-[#B8AD9A] text-[11px] leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Advisory Fit Disclaimer */}
          <div className="p-3.5 bg-[#181210]/60 border border-[#2F1C15] flex items-start gap-2.5 text-[10px] text-[#B8AD9A] leading-relaxed">
            <AlertCircle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p>{SIZING_DISCLAIMER}</p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-[#2F1C15] bg-[#140E0C] flex flex-col sm:flex-row items-center justify-between gap-3">
          <a
            href={getSizingConciergeUrl(productName)}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 min-h-[42px] px-4 text-xs uppercase tracking-wider bg-[#181210] border border-[#2F1C15] hover:border-[#FEF5E6]/40 text-[#FEF5E6] hover:bg-[#241B18] transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-[#FEF5E6]"
          >
            <MessageSquare size={14} />
            <span>Chat with Fitting Concierge</span>
          </a>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto min-h-[42px] px-6 text-xs uppercase tracking-wider bg-[#FEF5E6] text-[#0F0A09] hover:bg-white font-semibold transition-subtle outline-none focus-visible:ring-1 focus-visible:ring-white"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

export default SizingGuideModal;
