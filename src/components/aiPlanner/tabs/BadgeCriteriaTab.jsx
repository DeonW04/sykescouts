import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronRight, Check, X, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

export default function BadgeCriteriaTab({ sectionId, section, selectedCriteria, onChange }) {
  const [expanded, setExpanded] = useState({});
  const [expandedModules, setExpandedModules] = useState({});
  const [search, setSearch] = useState('');

  const sectionName = section?.name;

  const { data: badges = [] } = useQuery({
    queryKey: ['badges', sectionName],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['modules-all'],
    queryFn: () => base44.entities.BadgeModule.filter({}),
  });

  const { data: requirements = [] } = useQuery({
    queryKey: ['requirements-all'],
    queryFn: () => base44.entities.BadgeRequirement.filter({}),
  });

  const filteredBadges = badges.filter(b =>
    (b.section === sectionName || b.section === 'all') &&
    !b.is_chief_scout_award &&
    b.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleBadge = (badgeId) => {
    setExpanded(prev => ({ ...prev, [badgeId]: !prev[badgeId] }));
  };

  const toggleModule = (moduleId) => {
    setExpandedModules(prev => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const isCriterionSelected = (reqId) => selectedCriteria.some(c => c.reqId === reqId);

  const toggleCriterion = (req, module, badge) => {
    if (isCriterionSelected(req.id)) {
      onChange(selectedCriteria.filter(c => c.reqId !== req.id));
    } else {
      onChange([...selectedCriteria, {
        reqId: req.id,
        text: req.text,
        moduleName: module.name,
        badgeName: badge.name,
        badgeId: badge.id,
      }]);
    }
  };

  const removeCriterion = (reqId) => onChange(selectedCriteria.filter(c => c.reqId !== reqId));

  const CATEGORY_COLORS = {
    challenge: 'bg-red-100 text-red-700',
    activity: 'bg-blue-100 text-blue-700',
    staged: 'bg-green-100 text-green-700',
    core: 'bg-purple-100 text-purple-700',
    special: 'bg-amber-100 text-amber-700',
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-[500px]">
      {/* Left: Tree */}
      <div className="flex-1 p-5 overflow-y-auto border-r border-gray-100">
        <div className="mb-4">
          <Input
            placeholder="Search badges..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <p className="text-xs text-gray-500 mt-2">Expand badges to select individual criteria</p>
        </div>

        <div className="space-y-2">
          {filteredBadges.map(badge => {
            const badgeModules = modules.filter(m => m.badge_id === badge.id);
            const badgeReqs = requirements.filter(r => badgeModules.some(m => m.id === r.module_id));
            const selectedCount = selectedCriteria.filter(c => c.badgeId === badge.id).length;

            return (
              <div key={badge.id} className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => toggleBadge(badge.id)}
                  className="w-full flex items-center gap-3 p-3 bg-white hover:bg-gray-50 transition-colors text-left"
                >
                  <img src={badge.image_url} alt={badge.name} className="w-8 h-8 rounded object-contain flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-gray-900 truncate">{badge.name}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${CATEGORY_COLORS[badge.category] || 'bg-gray-100 text-gray-600'}`}>
                        {badge.category}
                      </span>
                    </div>
                    {selectedCount > 0 && (
                      <span className="text-xs text-[#7413dc] font-medium">{selectedCount} criteria selected</span>
                    )}
                  </div>
                  {badgeReqs.length > 0 ? (
                    expanded[badge.id] ? <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  ) : null}
                </button>

                <AnimatePresence>
                  {expanded[badge.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-gray-100 bg-gray-50/50 p-3 space-y-2">
                        {badgeModules.length === 0 ? (
                          <p className="text-xs text-gray-400 italic">No individual criteria found for this badge</p>
                        ) : badgeModules.map(module => {
                          const moduleReqs = requirements.filter(r => r.module_id === module.id);
                          return (
                            <div key={module.id}>
                              <button
                                onClick={() => toggleModule(module.id)}
                                className="flex items-center gap-2 text-xs font-bold text-gray-700 w-full text-left mb-1"
                              >
                                {expandedModules[module.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                {module.name}
                                <span className="text-gray-400 font-normal">({moduleReqs.length} items)</span>
                              </button>
                              <AnimatePresence>
                                {expandedModules[module.id] && (
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: 'auto' }}
                                    exit={{ height: 0 }}
                                    className="overflow-hidden pl-4 space-y-1"
                                  >
                                    {moduleReqs.map((req, idx) => {
                                      const sel = isCriterionSelected(req.id);
                                      return (
                                        <button
                                          key={req.id}
                                          onClick={() => toggleCriterion(req, module, badge)}
                                          className={`w-full text-left flex items-start gap-2 p-2 rounded-lg text-xs transition-all ${
                                            sel ? 'bg-purple-100 border border-purple-300' : 'hover:bg-gray-100 border border-transparent'
                                          }`}
                                        >
                                          <div className={`w-4 h-4 rounded flex-shrink-0 mt-0.5 border flex items-center justify-center transition-all ${
                                            sel ? 'bg-[#7413dc] border-[#7413dc]' : 'border-gray-300'
                                          }`}>
                                            {sel && <Check className="w-2.5 h-2.5 text-white" />}
                                          </div>
                                          <span className="text-gray-700 flex-1">{idx + 1}. {req.text}</span>
                                        </button>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Selected Panel */}
      <div className="lg:w-72 p-5 bg-gray-50 overflow-y-auto">
        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Award className="w-4 h-4" />
          Selected Criteria
          {selectedCriteria.length > 0 && (
            <Badge className="bg-green-600 text-white ml-auto">{selectedCriteria.length}</Badge>
          )}
        </h3>

        {selectedCriteria.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">
            <p className="text-3xl mb-2">🏅</p>
            <p>Tick criteria from the badge tree</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {selectedCriteria.map((c) => (
                <motion.div
                  key={c.reqId}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-xl border border-green-200 p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-[#7413dc] mb-0.5">{c.badgeName}</p>
                      <p className="text-xs text-gray-600 mb-0.5">{c.moduleName}</p>
                      <p className="text-xs text-gray-800 line-clamp-2">{c.text}</p>
                    </div>
                    <button onClick={() => removeCriterion(c.reqId)} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}