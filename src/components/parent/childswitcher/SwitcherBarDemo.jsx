import React, { useState } from 'react';
import { Repeat } from 'lucide-react';

// Option C — full-width identity bar with slide-down picker. Most prominent.
export default function SwitcherBarDemo({ children: kids, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const child = kids.find(k => k.id === selected);

  return (
    <div className="w-full max-w-md">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-2xl border transition-colors text-left"
        style={{ background: `${child.color}10`, borderColor: `${child.color}40` }}
      >
        <span className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: child.color }}>
          {child.initials}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-bold text-gray-900 truncate">{child.full_name}</span>
          <span className="block text-xs" style={{ color: child.color }}>{child.section} · {child.meeting}</span>
        </span>
        <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-full text-white" style={{ background: child.color }}>
          <Repeat className="w-3 h-3" /> Switch
        </span>
      </button>
      {open && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {kids.map(k => (
            <button key={k.id} onClick={() => { onSelect(k.id); setOpen(false); }}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${k.id === selected ? 'shadow-md' : 'border-gray-100 hover:border-gray-300 opacity-60'}`}
              style={k.id === selected ? { borderColor: k.color, background: `${k.color}0d` } : {}}
            >
              <span className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: k.color }}>{k.initials}</span>
              <span className="text-sm font-semibold text-gray-800">{k.first_name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full text-white" style={{ background: k.color }}>{k.section}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}