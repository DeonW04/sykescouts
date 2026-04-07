import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { X, CheckCircle, Circle, ChevronDown, ChevronUp, Shirt } from 'lucide-react';
import UniformDiagram from '../uniform/UniformDiagram';

export default function BadgeCriteriaModal({ badge, child, modules, requirements, reqProgress, awards, badgeProgress, onClose }) {
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
    const completed = reqProgress.filter(p => p.member_id === child?.id && p.module_id === modId && p.completed).length;
    return { total: modReqs.length, completed };
  };

  const earnedBadges = awards.filter(a => a.member_id === child?.id);

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
            <p className="text-xs text-gray-400 capitalize">{badge.category} Badge</p>
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

        {/* Criteria / Modules */}
        {badgeModules.length > 0 ? (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Requirements</h3>
            {badgeModules.map(mod => {
              const modReqs = requirements.filter(r => r.module_id === mod.id).sort((a, b) => (a.order || 0) - (b.order || 0));
              const { total, completed } = getModuleProgress(mod.id);
              return (
                <div key={mod.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-50">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm text-gray-900">{mod.name}</p>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${completed === total && total > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {completed}/{total}
                      </span>
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
                  <div className="divide-y divide-gray-50">
                    {modReqs.map(req => {
                      const done = reqProgress.some(p =>
                        p.member_id === child?.id && p.module_id === mod.id && p.requirement_id === req.id && p.completed
                      );
                      return (
                        <div key={req.id} className="flex items-start gap-3 px-4 py-3">
                          <div className="flex-shrink-0 mt-0.5">
                            {done
                              ? <CheckCircle className="w-4 h-4 text-green-500" />
                              : <Circle className="w-4 h-4 text-gray-300" />
                            }
                          </div>
                          <p className={`text-sm leading-snug flex-1 ${done ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                            {req.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          badge.requirements?.length > 0 && (
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
          )
        )}

        {/* Uniform Guide Dropdown */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <button
            onClick={() => setShowUniform(!showUniform)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left"
          >
            <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <Shirt className="w-4 h-4 text-purple-600" />
            </div>
            <span className="font-semibold text-gray-900 flex-1 text-sm">Uniform Guide</span>
            {showUniform
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />
            }
          </button>
          {showUniform && (
            <div className="px-4 pb-4 pt-0 border-t border-gray-50">
              <div className="pt-3">
                <UniformDiagram
                  uniformConfig={uniformConfig}
                  earnedBadges={earnedBadges}
                  allBadges={[badge]}
                  highlightPosition={badge.uniform_position}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}