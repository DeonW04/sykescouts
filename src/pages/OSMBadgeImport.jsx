import React, { useState } from 'react';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import ImportStep1 from '../components/admin/badge-import/ImportStep1';
import ImportStep2 from '../components/admin/badge-import/ImportStep2';
import ImportStep3 from '../components/admin/badge-import/ImportStep3';
import ImportSummary from '../components/admin/badge-import/ImportSummary';

const STEP_LABELS = ['Select section & term', 'Review badges', 'Build badges', 'Summary'];

export default function OSMBadgeImport() {
  const [step, setStep] = useState(1);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [badgesReady, setBadgesReady] = useState([]);
  const [finalStats, setFinalStats] = useState({ saved: 0, skipped: 0, alreadyExisted: 0 });

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Import Badges from OSM</h1>
        <p className="text-gray-500 text-sm mb-6">Pull badge definitions directly from Online Scout Manager and build your badge structure.</p>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-1">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;
            return (
              <React.Fragment key={n}>
                <div className={`flex items-center gap-2 text-sm whitespace-nowrap ${active ? 'text-[#7413dc] font-semibold' : done ? 'text-green-600' : 'text-gray-400'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 ${active ? 'border-[#7413dc] text-[#7413dc]' : done ? 'border-green-600 bg-green-600 text-white' : 'border-gray-200 text-gray-400'}`}>
                    {done ? '✓' : n}
                  </span>
                  {label}
                </div>
                {i < STEP_LABELS.length - 1 && <div className="w-8 h-px bg-gray-200 flex-shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>

        {step === 1 && (
          <ImportStep1 onNext={(section, term) => {
            setSelectedSection(section);
            setSelectedTerm(term);
            setStep(2);
          }} />
        )}
        {step === 2 && (
          <ImportStep2
            section={selectedSection}
            term={selectedTerm}
            onNext={badges => { setBadgesReady(badges); setStep(3); }}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <ImportStep3
            section={selectedSection}
            term={selectedTerm}
            badges={badgesReady}
            onComplete={stats => { setFinalStats(stats); setStep(4); }}
          />
        )}
        {step === 4 && <ImportSummary stats={finalStats} />}
      </div>
    </div>
  );
}