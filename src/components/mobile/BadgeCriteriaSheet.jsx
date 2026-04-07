import React, { useState } from 'react';
import { X, ChevronDown, ChevronUp, CheckCircle, Circle, Shirt } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const POSITION_LABELS = {
  left_sleeve_upper: 'Left Sleeve (Upper)',
  left_sleeve_lower: 'Left Sleeve (Lower)',
  right_sleeve: 'Right Sleeve',
  left_chest_upper: 'Left Chest (Upper)',
  left_chest_lower: 'Left Chest (Lower)',
  right_chest_upper: 'Right Chest (Upper)',
  right_chest_lower: 'Right Chest (Lower)',
};

export default function BadgeCriteriaSheet({ badge, child, modules, requirements, reqProgress, awards, badgeProgress, onClose }) {
  const [uniformOpen, setUniformOpen] = useState(false);

  const { data: uniformConfigs = [] } = useQuery({
    queryKey: ['uniform-configs'],
    queryFn: () => base44.entities.UniformConfig.filter({}),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const childSection = sections.find(s => s.id === child?.section_id);
  const uniformConfig = uniformConfigs.find(u => u.section === childSection?.name);

  const badgeModules = modules
    .filter(m => m.badge_id === badge.id)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  const isReqCompleted = (reqId) =>
    reqProgress.some(p => p.requirement_id === reqId && p.completed);

  const isEarned = awards.some(a => a.member_id === child?.id && a.badge_id === badge.id) ||
    badgeProgress.some(p => p.member_id === child?.id && p.badge_id === badge.id && p.status === 'completed');

  // Overall progress
  let total = 0, completed = 0;
  badgeModules.forEach(mod => {
    const modReqs = requirements.filter(r => r.module_id === mod.id);
    total += modReqs.length;
    completed += modReqs.filter(r => isReqCompleted(r.id)).length;
  });
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
        {badge.image_url && (
          <img src={badge.image_url} alt={badge.name} className="w-10 h-10 object-contain rounded-lg flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-gray-900 text-base leading-tight truncate">{badge.name}</h2>
          <p className="text-xs text-gray-400 capitalize">{badge.category} badge</p>
        </div>
        {isEarned && (
          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-1 rounded-full flex-shrink-0">Earned ✓</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Progress bar */}
        {!isEarned && total > 0 && (
          <div className="px-4 py-4 bg-gray-50 border-b border-gray-100">
            <div className="flex justify-between text-xs text-gray-500 mb-1.5">
              <span>Progress</span>
              <span>{completed}/{total} requirements</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7413dc] rounded-full transition-all"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Description */}
        {badge.description && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm text-gray-600 leading-relaxed">{badge.description}</p>
          </div>
        )}

        {/* Requirements by module */}
        <div className="px-4 py-4 space-y-5">
          {badgeModules.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No requirements listed yet.</p>
          )}
          {badgeModules.map(mod => {
            const modReqs = requirements
              .filter(r => r.module_id === mod.id)
              .sort((a, b) => (a.order || 0) - (b.order || 0));
            const modCompleted = modReqs.filter(r => isReqCompleted(r.id)).length;
            return (
              <div key={mod.id}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-gray-900 text-sm">{mod.name}</h3>
                  {mod.completion_rule === 'x_of_n_required' && mod.required_count && (
                    <span className="text-xs text-gray-400">{modCompleted}/{mod.required_count} needed</span>
                  )}
                </div>
                {mod.description && (
                  <p className="text-xs text-gray-500 mb-2 leading-relaxed">{mod.description}</p>
                )}
                <div className="space-y-2">
                  {modReqs.map((req, idx) => {
                    const done = isReqCompleted(req.id);
                    return (
                      <div
                        key={req.id}
                        className={`flex items-start gap-3 p-2.5 rounded-xl ${done ? 'bg-green-50' : 'bg-gray-50'}`}
                      >
                        {done ? (
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={`text-sm leading-snug ${done ? 'text-gray-700' : 'text-gray-600'}`}>
                          <span className="font-medium text-gray-400 mr-1">{idx + 1}.</span>
                          {req.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Uniform Guide dropdown */}
        {badge.uniform_position && (
          <div className="px-4 pb-6">
            <button
              onClick={() => setUniformOpen(!uniformOpen)}
              className="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-200 text-left"
            >
              <Shirt className="w-4 h-4 text-gray-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-gray-700 flex-1">Uniform Position</span>
              {uniformOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {uniformOpen && (
              <div className="mt-3 p-4 bg-white rounded-2xl border border-gray-100">
                <p className="text-sm font-semibold text-gray-700 mb-3">
                  Worn on: <span className="text-[#7413dc]">{POSITION_LABELS[badge.uniform_position] || badge.uniform_position}</span>
                </p>
                {uniformConfig?.image_url && (
                  <div className="relative">
                    <img
                      src={uniformConfig.image_url}
                      alt="Uniform diagram"
                      className="w-full max-w-xs mx-auto rounded-xl"
                    />
                    {uniformConfig.dot_positions?.[badge.uniform_position] && (
                      <div
                        className="absolute w-5 h-5 bg-[#7413dc] rounded-full border-2 border-white shadow-lg"
                        style={{
                          left: `${uniformConfig.dot_positions[badge.uniform_position].x}%`,
                          top: `${uniformConfig.dot_positions[badge.uniform_position].y}%`,
                          transform: 'translate(-50%, -50%)',
                        }}
                      />
                    )}
                  </div>
                )}
                {uniformConfig?.section_example_images?.filter(e => e.position === badge.uniform_position).map((ex, i) => (
                  <div key={i} className="mt-3">
                    {ex.label && <p className="text-xs text-gray-500 mb-1">{ex.label}</p>}
                    <img src={ex.image_url} alt={ex.label} className="w-full rounded-xl" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}