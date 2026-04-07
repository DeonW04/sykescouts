import React, { useState } from 'react';
import { X, CheckCircle, Circle, Trophy, Star, ChevronDown, ChevronUp } from 'lucide-react';

export default function GoldAwardPage({ badge, child, modules, requirements, reqProgress, awards, badgeProgress, onClose }) {
  const [openModules, setOpenModules] = useState({});

  const isEarned = awards.some(a => a.member_id === child?.id && a.badge_id === badge.id)
    || badgeProgress.some(p => p.member_id === child?.id && p.badge_id === badge.id && p.status === 'completed');

  const badgeModules = modules.filter(m => m.badge_id === badge.id).sort((a, b) => (a.order || 0) - (b.order || 0));

  const isReqCompleted = (reqId) =>
    reqProgress.some(p => p.member_id === child?.id && p.requirement_id === reqId && p.completed);

  const getModuleProgress = (modId) => {
    const modReqs = requirements.filter(r => r.module_id === modId);
    const completed = modReqs.filter(r => isReqCompleted(r.id)).length;
    return { total: modReqs.length, completed };
  };

  const toggleModule = (modId) => setOpenModules(prev => ({ ...prev, [modId]: !prev[modId] }));

  const totalReqs = badgeModules.reduce((sum, m) => sum + requirements.filter(r => r.module_id === m.id).length, 0);
  const completedReqs = badgeModules.reduce((sum, m) => {
    const { completed } = getModuleProgress(m.id);
    return sum + completed;
  }, 0);
  const overallPct = totalReqs > 0 ? Math.round((completedReqs / totalReqs) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      {/* Hero Header */}
      <div
        className="flex-shrink-0 relative overflow-hidden"
        style={{
          background: isEarned
            ? 'linear-gradient(135deg, #f59e0b 0%, #ef4444 35%, #8b5cf6 70%, #06b6d4 100%)'
            : 'linear-gradient(135deg, #78350f 0%, #92400e 40%, #b45309 70%, #d97706 100%)',
          paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
        }}
      >
        {/* sparkle overlay */}
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '40px 40px, 60px 60px' }} />

        <div className="relative px-4 pb-6 pt-2">
          <div className="flex items-start justify-between mb-4">
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 flex-shrink-0">
              <X className="w-4 h-4 text-white" />
            </button>
            {isEarned && (
              <span className="bg-white text-yellow-600 text-xs font-extrabold px-3 py-1 rounded-full shadow">
                ⭐ Achieved!
              </span>
            )}
          </div>

          <div className="flex items-center gap-4">
            {badge.image_url ? (
              <img src={badge.image_url} alt={badge.name}
                className={`w-20 h-20 object-contain rounded-2xl shadow-2xl flex-shrink-0 ${!isEarned ? 'grayscale opacity-80' : ''}`} />
            ) : (
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0">🏆</div>
            )}
            <div>
              <p className="text-white/70 text-xs font-bold uppercase tracking-wider mb-1">Chief Scout's Award</p>
              <h1 className="text-xl font-extrabold text-white leading-tight drop-shadow">{badge.name}</h1>
              {badge.description && (
                <p className="text-white/80 text-xs mt-1.5 leading-relaxed">{badge.description}</p>
              )}
            </div>
          </div>

          {/* Overall progress bar */}
          {totalReqs > 0 && !isEarned && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-1.5">
                <p className="text-white/70 text-xs font-medium">Overall Progress</p>
                <p className="text-white text-xs font-bold">{completedReqs}/{totalReqs} requirements</p>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all" style={{ width: `${overallPct}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* How to earn it */}
      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {/* Info card */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <p className="text-sm font-bold text-amber-800">How to earn the {badge.name}</p>
          </div>
          <p className="text-xs text-amber-700 leading-relaxed">
            Complete all the requirements below to earn the highest award available in your section. Each module must be fully completed unless otherwise stated.
          </p>
        </div>

        {/* Modules */}
        {badgeModules.length > 0 ? (
          <div className="space-y-3">
            {badgeModules.map(mod => {
              const modReqs = requirements.filter(r => r.module_id === mod.id).sort((a, b) => (a.order || 0) - (b.order || 0));
              const { total, completed } = getModuleProgress(mod.id);
              const isOpen = openModules[mod.id] ?? true;
              const completionLabel = mod.completion_rule === 'x_of_n_required' && mod.required_count
                ? `Complete ${mod.required_count} of ${total}`
                : 'Complete all';
              const allDone = total > 0 && completed === total;

              return (
                <div key={mod.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="w-full px-4 py-3 flex items-center gap-3 text-left"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${allDone ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {allDone
                        ? <CheckCircle className="w-4 h-4 text-green-500" />
                        : <span className="text-xs font-bold text-gray-500">{completed}/{total}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-gray-900">{mod.name}</p>
                        <span className="text-[10px] bg-purple-100 text-purple-700 font-semibold px-2 py-0.5 rounded-full">{completionLabel}</span>
                      </div>
                      {total > 0 && (
                        <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-[#7413dc] rounded-full" style={{ width: `${(completed / total) * 100}%` }} />
                        </div>
                      )}
                    </div>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                  </button>
                  {isOpen && modReqs.length > 0 && (
                    <div className="border-t border-gray-50 divide-y divide-gray-50">
                      {modReqs.map(req => {
                        const done = isReqCompleted(req.id);
                        return (
                          <div key={req.id} className="flex items-start gap-3 px-4 py-3">
                            <div className="flex-shrink-0 mt-0.5">
                              {done ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-gray-300" />}
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
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 p-4 text-center">
            <p className="text-sm text-gray-400">No detailed criteria available yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}