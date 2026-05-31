import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronRight } from 'lucide-react';

const SECTION_COLORS = {
  squirrels: 'bg-red-100 text-red-700',
  beavers: 'bg-orange-100 text-orange-700',
  cubs: 'bg-yellow-100 text-yellow-800',
  scouts: 'bg-teal-100 text-teal-700',
  explorers: 'bg-purple-100 text-purple-700',
};

export default function ChildSelectPage({ children, onSelect, allowBack, onBack }) {
  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7413dc] to-[#004851] flex flex-col" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="px-6 pt-10 pb-8 text-white">
        {allowBack && (
          <button onClick={onBack} className="text-white/70 text-sm mb-4 flex items-center gap-1">← Back</button>
        )}
        <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-5">
          <span className="text-3xl">👦</span>
        </div>
        <h1 className="text-2xl font-bold">Who are you here for?</h1>
        <p className="text-white/70 text-sm mt-1">Select a child to continue</p>
      </div>

      {/* Children list */}
      <div className="flex-1 bg-white rounded-t-3xl px-5 pt-6 pb-8 space-y-3">
        {children.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">👦</p>
            <p className="font-medium text-gray-600">No children linked</p>
            <p className="text-sm mt-1">Contact your section leader to link your child's account.</p>
          </div>
        ) : (
          children.map(child => {
            const section = sections.find(s => s.id === child.section_id);
            const sectionColor = SECTION_COLORS[section?.name] || 'bg-gray-100 text-gray-600';
            return (
              <button
                key={child.id}
                onClick={() => onSelect(child.id)}
                className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 text-left active:bg-gray-50 transition-colors"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-[#7413dc] to-[#004851] rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
                  {child.full_name?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 text-base">{child.full_name}</p>
                  {section && (
                    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${sectionColor}`}>
                      {section.display_name}
                    </span>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 flex-shrink-0" />
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}