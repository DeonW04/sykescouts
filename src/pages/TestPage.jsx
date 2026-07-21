import React, { useState } from 'react';
import ParentNavDemo from '@/components/parent/childswitcher/ParentNavDemo';

const MOCK_CHILDREN = [
  { id: 'c1', first_name: 'Oliver', full_name: 'Oliver Thompson', initials: 'OT', section: 'Cubs', color: '#23a950' },
  { id: 'c2', first_name: 'Amelia', full_name: 'Amelia Thompson', initials: 'AT', section: 'Beavers', color: '#006ddf' },
];

const MOCK_USER = { name: 'Sarah Thompson', email: 'sarah.thompson@example.com' };

function Option({ tag, title, blurb, children }) {
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
  const [sel1, setSel1] = useState('c1');
  const [sel2, setSel2] = useState('c1');
  const [sel3, setSel3] = useState('c1');
  const [sel4, setSel4] = useState('c1');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 py-10 px-4">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');`}</style>
      <div className="max-w-5xl mx-auto space-y-12">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-[#7413dc] mb-1">Design Playground</p>
          <h1 className="text-2xl font-bold text-gray-900">Child Switcher Placement — Real Parent Nav</h1>
          <p className="text-sm text-gray-500 mt-1 max-w-2xl">
            Below is the exact parent-mode floating nav (strip expanded), with the pill switcher in four different
            placements. All fully clickable — try switching between Oliver (Cubs) and Amelia (Beavers).
          </p>
        </div>

        <Option
          tag="1"
          title="Combined — replaces the Account dropdown (your idea)"
          blurb="The account button becomes the child pill for all parents. One dropdown holds everything: account details, child switching (only shown when >1 child), settings and sign out. Cleanest — no extra element added to the strip."
        >
          <ParentNavDemo variant="combined" children={MOCK_CHILDREN} selected={sel1} onSelect={setSel1} user={MOCK_USER} />
        </Option>

        <Option
          tag="2"
          title="Right side — next to the Account dropdown"
          blurb="A dedicated child pill sits beside the existing account button. Child switching and account actions stay separate, at the cost of a slightly busier right side. Only rendered for parents with 2+ children."
        >
          <ParentNavDemo variant="right" children={MOCK_CHILDREN} selected={sel2} onSelect={setSel2} user={MOCK_USER} />
        </Option>

        <Option
          tag="3"
          title="Left side — next to the Dashboard button"
          blurb="The pill anchors the strip on the left, right after Dashboard — reads as 'context first': you pick whose portal you're in, then navigate. Very discoverable."
        >
          <ParentNavDemo variant="left" children={MOCK_CHILDREN} selected={sel3} onSelect={setSel3} user={MOCK_USER} />
        </Option>

        <Option
          tag="4"
          title="Centre — at the end of the nav links"
          blurb="The pill joins the page links in the middle, separated by a small divider. Keeps both edges of the strip untouched."
        >
          <ParentNavDemo variant="centre" children={MOCK_CHILDREN} selected={sel4} onSelect={setSel4} user={MOCK_USER} />
        </Option>

        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-sm text-gray-600 space-y-2">
          <p className="font-semibold text-gray-900">My take</p>
          <p>• <strong>Option 1</strong> is the most elegant — no new element, and single-child parents just see a nicer account button with their child's avatar. The tradeoff: switching takes two clicks (open menu → pick child) and is slightly less discoverable.</p>
          <p>• <strong>Option 2 or 3</strong> make the current child impossible to miss and switching one click faster — better if parents will swap frequently.</p>
          <p className="text-gray-400 pt-1">Pick one and I'll wire it into the real nav with persistence across all parent pages.</p>
        </div>
      </div>
    </div>
  );
}