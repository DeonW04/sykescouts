import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, CheckCircle, Circle, ChevronDown, ChevronUp, Shirt } from 'lucide-react';

export default function BadgeCriteriaModal({ badge, child, modules, requirements, reqProgress, awards, badgeProgress, stagedContext, onClose }) {
  const [showUniform, setShowUniform] = useState(false);

  const { data: uniformConfigs = [] } = useQuery({
    queryKey: ['uniform-configs'],
    queryFn: () => base44.entities.UniformConfig.filter({}),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const childSection = sections.find(s => s.id === child?.section_id);
  const uniformConfig = uniformConfigs.find(u => u.section === childSection?.name) || uniformConfigs[0];

  const badgeModules = modules.filter(m => m.badge_id === badge.id).sort((a, b) => (a.order || 0) - (b.order || 0));
  const isEarned = awards.some(a => a.member_id === child?.id && a.badge_id === badge.id)
    || badgeProgress.some(p => p.member_id === child?.id && p.badge_id === badge.id && p.status === 'completed');

  const getModuleProgress = (modId) => {
    const modReqs = requirements.filter(r => r.module_id === modId);
    const reqIds = modReqs.map(r => r.id);
    const completed = reqProgress.filter(p => p.member_id === child?.id && reqIds.includes(p.requirement_id) && p.completed).length;
    return { total: modReqs.length, completed };
  };

  // For a requirement, check completion via requirement_id
  const isReqCompleted = (reqId) =>
    reqProgress.some(p => p.member_id === child?.id && p.requirement_id === reqId && p.completed);

  // Uniform guide: just the image with a single dot for this badge's position + the example image
  const uniformPosition = badge.uniform_position;
  const uniformImageUrl = uniformConfig?.image_url;
  const dotPositions = uniformConfig?.dot_positions || {};
  const dotCoords = uniformPosition ? dotPositions[uniformPosition] : null;
  const exampleImg = uniformPosition
    ? (uniformConfig?.section_example_images || []).find(i => i.position === uniformPosition)
    : null;
  const hasUniformInfo = !!badge.uniform_position && (uniformImageUrl || exampleImg);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 flex-shrink-0">
          <X className="w-4 h-4 text-gray-600" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {badge.image_url && (
            <img src={badge.image_url} alt={badge.name} className="w-10 h-10 object-contain rounded-lg flex-shrink-0" />
          )}
          <div className="min-w-0">
            <h2 className="font-bold text-gray-900 text-sm leading-tight truncate">{badge.name}</h2>
            <p className="text-xs text-gray-400 capitalize">{badge.category?.replace('_', ' ')} Badge</p>
          </div>
        </div>
        {isEarned && (
          <div className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-1 rounded-lg flex-shrink-0">
            <CheckCircle className="w-3.5 h-3.5" />
            <span className="text-xs font-bold">Earned</span>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {/* Badge description */}
        {badge.description && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <p className="text-sm text-gray-600 leading-relaxed">{badge.description}</p>
          </div>
        )}

        {/* Staged badge context banner */}
        {stagedContext && (
          <div className="space-y-2">
            {stagedContext.highestEarned ? (
              <div className="bg-green-50 border border-green-200 rounded-2xl px-4 py-3 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-green-800">Stage {stagedContext.highestEarned.stage_number} achieved!</p>
                  <p className="text-xs text-green-600 mt-0.5">You've completed {stagedContext.highestEarned.name}.</p>
                </div>
              </div>
            ) : null}
            {stagedContext.nextStageBadge && (
              <div className="bg-purple-50 border border-purple-200 rounded-2xl px-4 py-3">
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wide">
                  {stagedContext.highestEarned ? 'Next up' : 'Working towards'}
                </p>
                <p className="text-sm font-semibold text-purple-900 mt-0.5">{stagedContext.nextStageBadge.name}</p>
                <p className="text-xs text-purple-600 mt-0.5">Criteria below ↓</p>
              </div>
            )}
          </div>
        )}

        {/* Criteria — prefer module/requirement structure, fall back to badge.requirements */}
        {badgeModules.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Requirements</h3>
              {badge.completion_rule && (
                <span className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full capitalize">
                  {badge.completion_rule === 'all_modules' ? 'Complete all modules'
                    : badge.completion_rule === 'one_module' ? 'Complete one module'
                    : badge.completion_rule?.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            {badgeModules.map(mod => {
              const modReqs = requirements.filter(r => r.module_id === mod.id).sort((a, b) => (a.order || 0) - (b.order || 0));
              const { total, completed } = getModuleProgress(mod.id);
              const completionLabel = mod.completion_rule === 'x_of_n_required' && mod.required_count
                ? `${mod.required_count} of ${total} required`
                : 'Complete all';
              return (
                <div key={mod.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-gray-900">{mod.name}</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">{completionLabel}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${completed === total && total > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {completed}/{total}
                        </span>
                      </div>
                    </div>
                    {total > 0 && (
                      <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#7413dc] rounded-full transition-all"
                          style={{ width: `${(completed / total) * 100}%` }}
                        />
                      </div>
                    )}
                    {mod.description && (
                      <p className="text-xs text-gray-400 mt-1.5">{mod.description}</p>
                    )}
                  </div>
                  {modReqs.length > 0 && (
                    <div className="divide-y divide-gray-50">
                      {modReqs.map(req => {
                        const done = isReqCompleted(req.id);
                        return (
                          <div key={req.id} className="flex items-start gap-3 px-4 py-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {done
                                ? <CheckCircle className="w-4 h-4 text-green-500" />
                                : <Circle className="w-4 h-4 text-gray-300" />
                              }
                            </div>
                            <p className={`text-sm leading-snug flex-1 ${done ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                              {req.text || req.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : badge.requirements?.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Requirements</h3>
            <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
              {badge.requirements.map((req, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3">
                  <Circle className="w-4 h-4 text-gray-300 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 leading-snug">{req.description || req}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-4">
            <p className="text-sm text-gray-400 text-center">No detailed criteria available for this badge.</p>
          </div>
        )}

        {/* Uniform Guide — only shown if there's a position for this badge */}
        {hasUniformInfo && (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <button
              onClick={() => setShowUniform(!showUniform)}
              className="w-full flex items-center gap-3 px-4 py-3 text-left"
            >
              <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shirt className="w-4 h-4 text-purple-600" />
              </div>
              <span className="font-semibold text-gray-900 flex-1 text-sm">Where to sew this badge</span>
              {showUniform
                ? <ChevronUp className="w-4 h-4 text-gray-400" />
                : <ChevronDown className="w-4 h-4 text-gray-400" />
              }
            </button>
            {showUniform && (
              <div className="px-4 pb-4 pt-0 border-t border-gray-50">
                <div className="pt-3 space-y-3">
                  {/* Uniform diagram with single dot */}
                  {uniformImageUrl && (
                    <div className="relative inline-block w-full">
                      <img
                        src={uniformImageUrl}
                        alt="Uniform"
                        className="w-full rounded-xl"
                        style={{ maxHeight: 320, objectFit: 'contain' }}
                      />
                      {dotCoords && (
                        <div
                          style={{
                            left: `${dotCoords.x}%`,
                            top: `${dotCoords.y}%`,
                            transform: 'translate(-50%, -50%)',
                          }}
                          className="absolute w-5 h-5 rounded-full bg-[#7413dc] border-2 border-white shadow-lg ring-4 ring-[#7413dc]/30"
                        />
                      )}
                    </div>
                  )}
                  {/* Example image */}
                  {exampleImg && (
                    <div>
                      <p className="text-xs text-gray-500 mb-2 font-medium">Example:</p>
                      <img
                        src={exampleImg.image_url}
                        alt="Example placement"
                        className="w-full rounded-xl object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}