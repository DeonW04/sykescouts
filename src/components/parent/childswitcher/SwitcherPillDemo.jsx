import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

// Option A — compact pill with dropdown. Sits at the right end of the nav strip.
export default function SwitcherPillDemo({ children: kids, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const child = kids.find(k => k.id === selected);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white border border-gray-200 shadow-sm hover:border-[#7413dc] transition-colors"
      >
        <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: child.color }}>
          {child.initials}
        </span>
        <span className="text-sm font-semibold text-gray-800">{child.first_name}</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ background: child.color }}>{child.section}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-gray-200 shadow-lg py-1 z-50">
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">Viewing as parent of</p>
          {kids.map(k => (
            <button key={k.id} onClick={() => { onSelect(k.id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 text-left">
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: k.color }}>{k.initials}</span>
              <span className="flex-1">
                <span className="block text-sm font-medium text-gray-800">{k.full_name}</span>
                <span className="block text-xs text-gray-400">{k.section}</span>
              </span>
              {k.id === selected && <Check className="w-4 h-4 text-[#7413dc]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}