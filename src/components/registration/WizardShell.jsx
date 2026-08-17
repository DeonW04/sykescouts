import React from 'react';
import { CheckCircle, ChevronLeft } from 'lucide-react';

const STEP_LABELS = ['Your Name', 'Child Details', 'Parent Info', 'Medical Info', 'Emergency Contact', 'Review & Consent'];

// Desktop: full-height two-pane layout (branding/step-list rail + wide content area)
// so the wizard uses the available screen instead of looking like a phone screen.
// Mobile: unchanged full-screen single-column experience.
export default function WizardShell({ step, totalSteps, onBack, children, footer }) {
  return (
    <div
      className="min-h-screen w-full flex bg-gray-50"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {/* Desktop step rail */}
      <div className="hidden md:flex md:flex-col md:w-80 lg:w-96 flex-shrink-0 bg-gradient-to-br from-[#7413dc] to-[#004851] text-white p-10">
        <img
          src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png"
          alt="40th Rochdale (Syke) Scouts"
          className="w-14 h-14 object-contain mb-8"
        />
        <h1 className="text-2xl font-extrabold leading-tight mb-2">Complete Your Registration</h1>
        <p className="text-white/70 text-sm mb-10">A few details to get your scout set up.</p>
        <div className="flex-1 space-y-1">
          {STEP_LABELS.map((label, i) => {
            const stepNum = i + 1;
            const active = stepNum === step;
            const done = stepNum < step;
            return (
              <div key={label} className={`flex items-center gap-3 py-3 px-3 rounded-xl transition-colors ${active ? 'bg-white/15' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  done ? 'bg-white text-[#7413dc]' : active ? 'bg-white/25 border border-white/60' : 'bg-white/10 border border-white/20 text-white/50'
                }`}>
                  {done ? <CheckCircle className="w-4 h-4" /> : stepNum}
                </div>
                <span className={`text-sm font-medium ${active ? 'text-white' : done ? 'text-white/80' : 'text-white/40'}`}>{label}</span>
              </div>
            );
          })}
        </div>
        <p className="text-white/40 text-xs">40th Rochdale (Syke) Scouts</p>
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