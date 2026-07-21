import React, { useState } from 'react';
import SwitcherPillDemo from '@/components/parent/childswitcher/SwitcherPillDemo';
import SwitcherTabsDemo from '@/components/parent/childswitcher/SwitcherTabsDemo';
import SwitcherBarDemo from '@/components/parent/childswitcher/SwitcherBarDemo';

const MOCK_CHILDREN = [
  { id: 'c1', first_name: 'Oliver', full_name: 'Oliver Thompson', initials: 'OT', section: 'Cubs', meeting: 'Wednesdays 6:30pm', color: '#23a950' },
  { id: 'c2', first_name: 'Amelia', full_name: 'Amelia Thompson', initials: 'AT', section: 'Beavers', meeting: 'Mondays 6:00pm', color: '#006ddf' },
];

// Fake nav strip so each option is shown in context — mimics the bottom row of the parent nav
function FakeNavStrip({ children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-visible">
      <div className="flex items-center gap-4 px-4 py-2.5 border-b border-gray-100">
        <span className="text-sm font-bold text-[#7413dc]">Parent Portal</span>
        {['Dashboard', 'My Child', 'Programme', 'Events', 'Badges'].map(l => (
          <span key={l} className="hidden sm:inline text-sm text-gray-500">{l}</span>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-gray-50/60 rounded-b-2xl flex-wrap">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Bottom nav strip ↓</span>
        {children}
      </div>
    </div>
  );
}

function OptionCard({ tag, title, blurb, children }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-8 h-8 rounded-lg bg-[#7413dc] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">{tag}</span>
        <div>
          <h2 className="font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{blurb}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function TestPage() {
  const [selectedA, setSelectedA] = useState('c1');
  const [selectedB, setSelectedB] = useState('c1');
  const [selectedC, setSelectedC] = useState('c1');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#7413dc] mb-1">Design Playground</p>
          <h1 className="text-2xl font-bold text-gray-900">Child Switcher — 3 Ideas</h1>
          <p className="text-sm text-gray-500 mt-1">
            All three live in the bottom strip of the parent nav bar. The selected child would be remembered as you
            move between pages (and across visits). Click each one to try switching between Oliver and Amelia.
          </p>
        </div>

        <OptionCard tag="A" title="Compact Pill + Dropdown" blurb="Small and unobtrusive — an avatar pill on the nav strip that opens a dropdown listing all children. Best if the nav strip is already busy.">
          <FakeNavStrip>
            <SwitcherPillDemo children={MOCK_CHILDREN} selected={selectedA} onSelect={setSelectedA} />
          </FakeNavStrip>
        </OptionCard>

        <OptionCard tag="B" title="Segmented Tabs" blurb="Both children are always visible side by side — switching is a single tap with no menu. Scales well up to 3 children.">
          <FakeNavStrip>
            <SwitcherTabsDemo children={MOCK_CHILDREN} selected={selectedB} onSelect={setSelectedB} />
          </FakeNavStrip>
        </OptionCard>

        <OptionCard tag="C" title="Identity Bar + Card Picker" blurb="The most prominent — a full identity bar tinted in the child's section colour, with a card grid picker. Makes it impossible to forget whose data you're looking at.">
          <FakeNavStrip>
            <SwitcherBarDemo children={MOCK_CHILDREN} selected={selectedC} onSelect={setSelectedC} />
          </FakeNavStrip>
        </OptionCard>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-sm text-gray-600 space-y-2">
          <p className="font-semibold text-gray-900">How it would work under the hood</p>
          <p>• The chosen child's ID is saved to the browser (localStorage), so it persists across every page and future visits.</p>
          <p>• Every parent page (My Child, Programme, Events, Badges) reads the same selection — switch once, it changes everywhere.</p>
          <p>• Section colour theming carries through, so the portal subtly reflects which child is active.</p>
          <p className="text-gray-400 pt-1">Tell me which option (or a mix) you'd like and I'll wire it into the real parent portal.</p>
        </div>
      </div>
    </div>
  );
}