import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

// ── Helpers ──────────────────────────────────────────────────────────────────

function groupSameas(reqs) {
  const grouped = [];
  const processed = new Set();
  for (const req of reqs) {
    const id = String(req.requirement_id);
    if (processed.has(id)) continue;
    const sameas = req.sameas ? String(req.sameas) : '0';
    if (sameas !== '0') { processed.add(id); continue; }
    const copies = reqs.filter(r => r.sameas && String(r.sameas) === id);
    grouped.push({
      requirement_id: req.requirement_id,
      name: req.name || '',
      tooltip: req.tooltip || '',
      required_completions: 1 + copies.length,
      order: req.order != null ? Number(req.order) : grouped.length,
    });
    processed.add(id);
    copies.forEach(c => processed.add(String(c.requirement_id)));
  }
  return grouped;
}

function translateCompletionRule(config = {}, description = '') {
  if (!config || !Object.keys(config).length) return { rule: 'manual', description };
  if (config.minModules || config.minRequirementsCompleted) {
    const parts = [];
    if (config.minModules) parts.push(`at least ${config.minModules} modules`);
    if (config.minRequirementsCompleted) parts.push(`${config.minRequirementsCompleted} requirements total`);
    const note = `(Completion rule: complete ${parts.join(' and ')}.)`;
    return { rule: 'custom', description: description ? `${description}\n${note}` : note };
  }
  const numMods = config.numModulesRequired != null ? parseInt(config.numModulesRequired) : null;
  if (numMods === 1) return { rule: 'one_module', description };
  if (numMods > 1) {
    const note = `(Completion rule: complete at least ${numMods} modules.)`;
    return { rule: 'custom', description: description ? `${description}\n${note}` : note };
  }
  return { rule: 'all_modules', description };
}

function parseOSMResponse(rawData) {
  // Normalise — OSM wraps the useful data under various keys
  const details = rawData.details || rawData.badge || {};
  const modules = rawData.modules || {};
  const config = rawData.config || {};
  const moduleLetters = Object.keys(modules).sort();

  // Find requirements — check config[letter] arrays first, then structure, then flat array
  let reqsByModule = {};
  for (const letter of moduleLetters) {
    if (Array.isArray(config[letter])) {
      reqsByModule[letter] = config[letter];
    }
  }
  if (!Object.keys(reqsByModule).length && rawData.structure) {
    for (const [l, v] of Object.entries(rawData.structure)) {
      if (Array.isArray(v)) reqsByModule[l] = v;
    }
  }
  if (!Object.keys(reqsByModule).length) {
    const flat = rawData.requirements || rawData.badge_requirements || [];
    for (const r of flat) {
      const m = r.module || 'a';
      if (!reqsByModule[m]) reqsByModule[m] = [];
      reqsByModule[m].push(r);
    }
  }

  const parsedModules = {};
  for (const letter of moduleLetters) {
    const reqs = reqsByModule[letter] || [];
    const modInfo = modules[letter] || {};
    const grouped = groupSameas(reqs);
    parsedModules[letter] = {
      name: modInfo.name || `Module ${letter.toUpperCase()}`,
      required: parseInt(modInfo.required) || grouped.length,
      requirements: grouped,
    };
  }
  // Fallback — if no module keys from OSM, create a single module 'a' from any flat reqs
  if (!moduleLetters.length) {
    const flat = reqsByModule['a'] || rawData.requirements || [];
    const grouped = groupSameas(flat);
    if (grouped.length) {
      parsedModules['a'] = { name: 'Module A', required: grouped.length, requirements: grouped };
    }
  }

  return { details, config, parsedModules };
}

function completionRuleLabel(rule) {
  if (rule === 'all_modules') return 'All modules — complete all requirements in every module.';
  if (rule === 'one_module') return 'One module — complete all requirements in any one module.';
  if (rule === 'custom') return 'Custom — see description note below.';
  return 'Manual — completion is tracked manually by a leader.';
}

// ── Module requirements editor ────────────────────────────────────────────────

function ModuleEditor({ letter, module: mod, onChange }) {
  const [expanded, setExpanded] = useState(true);
  const total = mod.requirements.length;
  const reqLabel = mod.required >= total ? 'complete all' : `complete ${mod.required} of ${total}`;

  const updateReq = (i, field, val) => {
    const next = mod.requirements.map((r, idx) => idx === i ? { ...r, [field]: val } : r);
    onChange({ ...mod, requirements: next });
  };

  const addReq = () => {
    onChange({ ...mod, requirements: [...mod.requirements, { requirement_id: null, name: '', tooltip: '', required_completions: 1, order: mod.requirements.length }] });
  };

  const removeReq = (i) => {
    if (mod.requirements.length <= 1) { toast.error("A module must have at least one requirement."); return; }
    onChange({ ...mod, requirements: mod.requirements.filter((_, idx) => idx !== i) });
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700"
        onClick={() => setExpanded(e => !e)}
        type="button"
      >
        <span>Module {letter.toUpperCase()} — {mod.name} <span className="font-normal text-gray-500">({reqLabel})</span></span>
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>
      {expanded && (
        <div className="p-4 space-y-4 bg-white">
          {mod.requirements.map((req, i) => (
            <div key={i} className="p-3 border rounded-lg bg-gray-50 space-y-2">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div>
                    <Label className="text-xs text-gray-500">Requirement name</Label>
                    <Input value={req.name} onChange={e => updateReq(i, 'name', e.target.value)} className="h-7 text-sm" placeholder="Short name…" />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-500">Description (tooltip)</Label>
                    <Textarea value={req.tooltip} onChange={e => updateReq(i, 'tooltip', e.target.value)} className="text-sm min-h-[60px]" placeholder="Full requirement description…" />
                  </div>
                  {req.required_completions > 1 && (
                    <p className="text-xs text-[#7413dc] font-medium">Requires {req.required_completions} completions</p>
                  )}
                </div>
                <Button type="button" variant="ghost" size="icon" className="mt-5 text-gray-400 hover:text-red-500" onClick={() => removeReq(i)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addReq} className="w-full">
            <Plus className="w-3 h-3 mr-1" />Add requirement
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ImportStep3({ section, term, badges, onComplete }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ saved: 0, skipped: 0, alreadyExisted: 0 });
  const [form, setForm] = useState(null);   // { name, description, badge_group, image_url, badge_image_local, modules, meta }

  const total = badges.length;
  const badge = badges[currentIndex];

  const loadBadge = useCallback(async (b) => {
    setLoading(true);
    setForm(null);
    try {
      // Duplicate guard
      const existing = await base44.entities.BadgeDefinition.filter({});
      const key = `${b.badge_id}_${b.badge_version || '0'}`;
      const dup = existing.find(bd => `${bd.osm_badge_id}_${bd.osm_badge_version || '0'}` === key);
      if (dup) {
        setStats(s => ({ ...s, alreadyExisted: s.alreadyExisted + 1 }));
        advance(badges, currentIndex, stats);
        return;
      }

      // Fetch full badge details
      const detailsRes = await base44.functions.invoke('getOSMBadgeDetails', {
        sectionId: section.osm_section_id,
        sectionType: section.osm_section_type || section.name,
        termId: term?.termid,
        badgeId: b.badge_id,
        badgeVersion: b.badge_version || '0',
        typeId: b.type_id || 2,
      });
      const rawData = detailsRes?.data?.data || {};
      const { details, config, parsedModules } = parseOSMResponse(rawData);

      // Determine category
      const typeId = b.type_id || parseInt(b.badge_type_id) || 2;
      const category = typeId === 1 ? 'challenge' : 'activity';

      // Translate completion rule
      const { rule, description: desc } = translateCompletionRule(config, details.description || b.description || '');

      // Download image
      let imageUrl = '';
      const pictureField = details.picture || b.picture || '';
      if (pictureField) {
        try {
          const imgRes = await base44.functions.invoke('downloadOSMBadgeImage', { pictureUrl: pictureField });
          imageUrl = imgRes?.data?.file_url || '';
        } catch { /* silent fallback */ }
      }

      // Determine section type from app section
      const sectionName = section.osm_section_type || section.name || 'scouts';

      setForm({
        name: details.name || b.name || '',
        description: desc,
        badge_group: details.group_name || b.group_name || '',
        image_url: imageUrl,
        badge_image_local: imageUrl,
        completion_rule: rule,
        at_home: String(details.at_home || b.at_home || '0') === '1',
        is_latest_version: String(details.latest || b.latest || '1') === '1',
        osm_badge_type_id: typeId,
        category,
        section: sectionName,
        osm_badge_id: String(details.badge_id || b.badge_id || ''),
        osm_badge_version: String(details.badge_version || b.badge_version || '0'),
        modules: parsedModules,
      });
    } catch (e) {
      toast.error('Failed to load badge: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [section, term, badges, currentIndex]);

  useEffect(() => {
    if (badge) loadBadge(badge);
  }, [currentIndex]);

  function advance(badgesArr, idx, currentStats) {
    if (idx + 1 >= badgesArr.length) {
      onComplete(currentStats);
    } else {
      setCurrentIndex(idx + 1);
    }
  }

  const handleSkip = () => {
    const next = { ...stats, skipped: stats.skipped + 1 };
    setStats(next);
    if (currentIndex + 1 >= total) { onComplete(next); return; }
    setCurrentIndex(i => i + 1);
  };

  const doSave = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const badgeDef = await base44.entities.BadgeDefinition.create({
        name: form.name,
        section: form.section,
        category: form.category,
        osm_badge_id: form.osm_badge_id,
        osm_badge_version: form.osm_badge_version,
        osm_badge_type_id: form.osm_badge_type_id,
        image_url: form.image_url,
        badge_image_local: form.badge_image_local,
        description: form.description,
        completion_rule: form.completion_rule,
        badge_group: form.badge_group,
        at_home: form.at_home,
        is_latest_version: form.is_latest_version,
        active: true,
      });

      const moduleLetters = Object.keys(form.modules).sort();
      for (let li = 0; li < moduleLetters.length; li++) {
        const letter = moduleLetters[li];
        const mod = form.modules[letter];
        const totalReqs = mod.requirements.length;
        const reqCount = mod.required;
        const completionRule = reqCount < totalReqs ? 'x_of_n_required' : 'all_required';

        const badgeModule = await base44.entities.BadgeModule.create({
          badge_id: badgeDef.id,
          name: mod.name || `Module ${letter.toUpperCase()}`,
          required_count: reqCount,
          completion_rule: completionRule,
          order: li + 1,
        });

        for (let ri = 0; ri < mod.requirements.length; ri++) {
          const req = mod.requirements[ri];
          await base44.entities.BadgeRequirement.create({
            badge_id: badgeDef.id,
            module_id: badgeModule.id,
            name: req.name || '',
            text: req.tooltip || req.name || '',
            required_completions: req.required_completions || 1,
            osm_requirement_id: req.requirement_id ? Number(req.requirement_id) : undefined,
            order: ri,
            notes: '',
          });
        }
      }
      return true;
    } catch (e) {
      toast.error('Save failed: ' + e.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAndNext = async () => {
    const ok = await doSave();
    if (!ok) return;
    const next = { ...stats, saved: stats.saved + 1 };
    setStats(next);
    if (currentIndex + 1 >= total) { onComplete(next); return; }
    setCurrentIndex(i => i + 1);
  };

  const handleSaveAndStop = async () => {
    const ok = await doSave();
    if (!ok) return;
    const next = { ...stats, saved: stats.saved + 1 };
    onComplete(next);
  };

  const updateModule = (letter, updated) => {
    setForm(f => ({ ...f, modules: { ...f.modules, [letter]: updated } }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 flex items-center justify-center gap-3 text-gray-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading badge {currentIndex + 1} of {total}…</span>
        </CardContent>
      </Card>
    );
  }

  if (!form) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle>Step 3 — Badge {currentIndex + 1} of {total}</CardTitle>
          <span className="text-sm text-gray-500">{form.name}</span>
        </div>
        {/* Progress bar */}
        <div className="w-full bg-gray-100 rounded-full h-2 mt-2">
          <div className="bg-[#7413dc] h-2 rounded-full transition-all" style={{ width: `${((currentIndex) / total) * 100}%` }} />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Image */}
        <div className="flex items-start gap-4">
          {form.image_url ? (
            <img src={form.image_url} alt={form.name} className="w-20 h-20 rounded-lg border object-contain bg-gray-50" />
          ) : (
            <div className="w-20 h-20 rounded-lg border bg-gray-50 flex items-center justify-center text-xs text-gray-400">No image</div>
          )}
          <div className="flex-1">
            <Label className="text-xs text-gray-500">Replace image</Label>
            <Input type="file" accept="image/*" className="h-8 text-sm" onChange={async e => {
              const file = e.target.files[0];
              if (!file) return;
              const { file_url } = await base44.integrations.Core.UploadFile({ file });
              setForm(f => ({ ...f, image_url: file_url, badge_image_local: file_url }));
            }} />
          </div>
        </div>

        {/* Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Badge name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <Label>Badge group</Label>
            <Input value={form.badge_group} onChange={e => setForm(f => ({ ...f, badge_group: e.target.value }))} placeholder="e.g. Events" />
          </div>
          <div>
            <Label className="text-xs text-gray-500 block mb-1">Section</Label>
            <p className="text-sm capitalize bg-gray-50 border rounded px-3 py-1.5">{form.section}</p>
          </div>
          <div>
            <Label className="text-xs text-gray-500 block mb-1">Category</Label>
            <p className="text-sm capitalize bg-gray-50 border rounded px-3 py-1.5">{form.category}</p>
          </div>
        </div>

        <div>
          <Label>Description</Label>
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Badge description…" className="min-h-[80px]" />
        </div>

        <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
          <p className="text-xs font-semibold text-purple-700 mb-0.5">Completion rule: <span className="font-normal capitalize">{form.completion_rule.replace('_', ' ')}</span></p>
          <p className="text-xs text-purple-600">{completionRuleLabel(form.completion_rule)}</p>
        </div>

        {/* Requirements */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm">Requirements</h3>
          {Object.keys(form.modules).sort().map(letter => (
            <ModuleEditor
              key={letter}
              letter={letter}
              module={form.modules[letter]}
              onChange={updated => updateModule(letter, updated)}
            />
          ))}
          {Object.keys(form.modules).length === 0 && (
            <p className="text-sm text-gray-400 italic">No requirements found for this badge in OSM.</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t gap-3 flex-wrap">
          <Button type="button" variant="outline" onClick={handleSkip} disabled={saving}>Skip badge</Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={handleSaveAndStop} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}Save and stop
            </Button>
            <Button type="button" onClick={handleSaveAndNext} disabled={saving} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              {currentIndex + 1 >= total ? 'Save and finish' : 'Save and next'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}