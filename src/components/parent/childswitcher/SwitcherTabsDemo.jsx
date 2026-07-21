import React from 'react';

// Option B — segmented tabs. Both children always visible, one tap to switch.
export default function SwitcherTabsDemo({ children: kids, selected, onSelect }) {
  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-gray-100 border border-gray-200">
      {kids.map(k => {
        const active = k.id === selected;
        return (
          <button
            key={k.id}
            onClick={() => onSelect(k.id)}
            className={`flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-sm font-semibold transition-all ${
              active ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold transition-opacity ${active ? '' : 'opacity-40'}`}
              style={{ background: k.color }}
            >
              {k.initials}
            </span>
            {k.first_name}
            {active && <span className="text-[9px] px-1.5 py-0.5 rounded-full text-white font-medium" style={{ background: k.color }}>{k.section}</span>}
          </button>
        );
      })}
    </div>
  );
}