import React from 'react';
import { CheckCircle, ChevronLeft } from 'lucide-react';

const STEP_LABELS = ['Your Name', 'Child Details', 'Parent Info', 'Medical Info', 'Emergency Contact', 'Review & Consent', 'Payment'];

// Desktop: two-pane layout (light step list rail + wide content area) that
// follows the site's white/purple-accent styling — no solid colour blocks.
// Mobile: unchanged full-screen single-column experience.
export default function WizardShell({ step, totalSteps, onBack, children, footer }) {
  return (
    <div
      className="min-h-screen w-full flex bg-white"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Desktop step rail */}
      <div className="hidden md:flex md:flex-col md:w-72 lg:w-80 flex-shrink-0 bg-gray-50 border-r border-gray-100 p-8">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png"
          alt="40th Rochdale (Syke) Scouts"
          className="w-12 h-12 object-contain mb-6"
        />
        <h1 className="text-lg font-bold text-gray-900 leading-tight mb-1">Complete Your Registration</h1>
        <p className="text-gray-400 text-sm mb-8">A few details to get your scout set up.</p>
        <div className="flex-1 space-y-1">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const active = stepNum === step;
            const done = stepNum < step;
            return (
              <div key={label} className={`flex items-center gap-3 py-2.5 px-3 rounded-xl transition-colors ${active ? 'bg-[#7413dc]/10' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  done || active ? 'bg-[#7413dc] text-white' : 'bg-gray-200 text-gray-400'
                }`}>
                  {done ? <CheckCircle className="w-3.5 h-3.5" /> : stepNum}
                </div>
                <span className={`text-sm font-medium ${active ? 'text-[#7413dc]' : done ? 'text-gray-700' : 'text-gray-400'}`}>{label}</span>
              </div>
            );
          })}
        </div>
        <p className="text-gray-300 text-xs">40th Rochdale (Syke) Scouts</p>
      </div>

      {/* Content column */}
      <div className="flex-1 flex flex-col md:h-screen">
        {/* Mobile-only back button */}
        <div className="md:hidden flex-shrink-0 px-4 pt-4 pb-0 flex items-center">
          <button onClick={onBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500">
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>

        {/* Desktop-only back + step counter */}
        <div className="hidden md:flex items-center justify-between px-10 lg:px-16 pt-8 pb-2 flex-shrink-0">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <span className="text-xs text-gray-400 font-medium">Step {step} of {totalSteps}</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl md:mx-auto md:px-6 lg:px-0">
            {children}
          </div>
        </div>

        <div
          className="flex-shrink-0 border-t border-gray-100 bg-white px-4 md:px-10 lg:px-16 py-4 md:py-6"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
        >
          <div className="max-w-2xl md:mx-auto md:flex md:justify-end">
            {footer}
          </div>
        </div>
      </div>
    </div>
  );
}