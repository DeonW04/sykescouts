import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, CheckCircle, Link, Unlink, Sparkles, Save } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_COLOURS = {
  staged:    'bg-purple-100 text-purple-800',
  activity:  'bg-blue-100 text-blue-800',
  challenge: 'bg-orange-100 text-orange-800',
  core:      'bg-green-100 text-green-800',
  special:   'bg-gray-100 text-gray-800',
};

const delay = ms => new Promise(r => setTimeout(r, ms));

function BadgeRow({ label, subLabel, imageUrl, category, currentValue, currentLevel, uniqueOsmBadges, saving, suggesting, onSelect, onLevelChange, onSave, onSuggest, isDirty }) {
  const linkedOsm = uniqueOsmBadges.find(o => String(o.badge_id) === String(currentValue));
  const isLinkedToStaged = linkedOsm?.badge_type === 'Staged';

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-gray-50/50">
      {imageUrl ? (
        <img src={imageUrl} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
      ) : (
        <div className="w-8 h-8 rounded bg-gray-100 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900">{label}</p>
        <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
          <Badge className={`text-xs ${CATEGORY_COLOURS[category] || 'bg-gray-100 text-gray-700'}`}>{category}</Badge>
          {subLabel && <span className="text-xs text-gray-400">{subLabel}</span>}
          {currentValue && !isDirty && (
            <span className="text-xs text-green-600 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Linked
            </span>
          )}
        </div>
      </div>

      <Button
        size="sm" variant="ghost"
        disabled={suggesting || uniqueOsmBadges.length === 0}
        onClick={onSuggest}
        className="h-8 px-2 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 flex-shrink-0"
        title="AI: suggest best match"
      >
        {suggesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      </Button>

      <div className="w-52 flex-shrink-0">
        <Select value={currentValue || '__none__'} onValueChange={v => onSelect(v === '__none__' ? '' : v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Not linked" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Not linked —</SelectItem>
            {uniqueOsmBadges.map(o => (
              <SelectItem key={o.badge_id} value={String(o.badge_id)}>
                {o.name} <span className="text-gray-400">({o.badge_type})</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLinkedToStaged && (
        <div className="flex-shrink-0">
          <Select value={String(currentLevel || 1)} onValueChange={v => onLevelChange(parseInt(v))}>
            <SelectTrigger className="h-8 text-xs w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1,2,3,4,5,6,7,8].map(n => (
                <SelectItem key={n} value={String(n)}>Level {n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <Button
        size="sm"
        disabled={!isDirty || saving}
        onClick={onSave}
        className="h-8 px-3 text-xs bg-[#7413dc] hover:bg-[#5c0fb0] disabled:opacity-40 flex-shrink-0"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Save className="w-3 h-3 mr-1" />Save</>}
      </Button>
    </div>
  );
}

export default function OSMBadgeMappingTab() {
  const queryClient = useQueryClient();
  const [pendingChanges, setPendingChanges] = useState({});
  const [saving, setSaving] = useState(null);
  const [suggesting, setSuggesting] = useState(null);
  const [matchingAll, setMatchingAll] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const { data: appBadges = [], isLoading: loadingBadges } = useQuery({
    queryKey: ['badge-definitions-all'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: osmBadges = [], isLoading: loadingOsm } = useQuery({
    queryKey: ['osm-badges'],
    queryFn: () => base44.entities.OSMBadge.list('-created_date', 300),
  });

  const uniqueOsmBadges = useMemo(() => {
    const seen = new Set();
    return osmBadges.filter(o => {
      const key = String(o.badge_id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [osmBadges]);

  const oldLinkByBadgeId = useMemo(() => {
    const map = {};
    for (const o of osmBadges) {
      if (o.linked_to_app_badge && o.badge_id) map[o.linked_to_app_badge] = String(o.badge_id);
    }
    return map;
  }, [osmBadges]);

  // Group badges with badge_family_id + stage_number as families (regardless of category).
  // This correctly handles Joining In Award (core + badge_family_id + stage_number 1-8)
  // as well as true staged badge families.
  const { stagedFamilies, nonStagedBadges } = useMemo(() => {
    const families = {};
    const nonStaged = [];
    for (const b of appBadges) {
      if (b.badge_family_id && b.stage_number != null) {
        if (!families[b.badge_family_id]) families[b.badge_family_id] = [];
        families[b.badge_family_id].push(b);
      } else {
        nonStaged.push(b);
      }
    }
    for (const f of Object.values(families)) {
      f.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
    }
    return { stagedFamilies: families, nonStagedBadges: nonStaged.sort((a, b) => a.name.localeCompare(b.name)) };
  }, [appBadges]);

  const linkedCount = useMemo(() =>
    appBadges.filter(b => b.osm_badge_id || oldLinkByBadgeId[b.id]).length,
  [appBadges, oldLinkByBadgeId]);

  const getOsmRecord = (osmBadgeId) => uniqueOsmBadges.find(o => String(o.badge_id) === String(osmBadgeId));

  const getValueForBadge = (badge) => {
    const p = pendingChanges[badge.id];
    if (p !== undefined) return { osmBadgeId: p.osmBadgeId, level: p.level ?? badge.stage_number ?? 1 };
    if (badge.osm_badge_id) return { osmBadgeId: String(badge.osm_badge_id), level: badge.stage_number ?? 1 };
    if (oldLinkByBadgeId[badge.id]) return { osmBadgeId: oldLinkByBadgeId[badge.id], level: badge.stage_number ?? 1 };
    return { osmBadgeId: '', level: 1 };
  };

  const getValueForFamily = (familyKey, badges) => {
    const p = pendingChanges[familyKey];
    if (p !== undefined) return { osmBadgeId: p.osmBadgeId, level: p.level ?? 1 };
    for (const b of badges) {
      if (b.osm_badge_id) return { osmBadgeId: String(b.osm_badge_id), level: b.stage_number ?? 1 };
    }
    for (const b of badges) {
      if (oldLinkByBadgeId[b.id]) return { osmBadgeId: oldLinkByBadgeId[b.id], level: 1 };
    }
    return { osmBadgeId: '', level: 1 };
  };

  const isBadgeDirty = (badge) => {
    const p = pendingChanges[badge.id];
    if (p === undefined) return false;
    const savedId = badge.osm_badge_id || oldLinkByBadgeId[badge.id] || '';
    const savedLevel = badge.stage_number ?? 1;
    return p.osmBadgeId !== savedId || (p.level !== undefined && p.level !== savedLevel);
  };

  const isFamilyDirty = (familyKey, badges) => {
    const p = pendingChanges[familyKey];
    if (p === undefined) return false;
    const savedId = badges[0]?.osm_badge_id || oldLinkByBadgeId[badges[0]?.id] || '';
    return p.osmBadgeId !== savedId;
  };

  const setPending = (key, osmBadgeId, level) =>
    setPendingChanges(p => ({ ...p, [key]: { osmBadgeId, level } }));

  const saveSingle = async (badge) => {
    const { osmBadgeId, level } = getValueForBadge(badge);
    const osmRecord = osmBadgeId ? getOsmRecord(osmBadgeId) : null;
    await base44.entities.BadgeDefinition.update(badge.id, {
      osm_badge_id:      osmBadgeId || null,
      osm_badge_version: osmRecord?.badge_version != null ? String(osmRecord.badge_version) : '0',
      stage_number:      osmRecord?.badge_type === 'Staged' ? (level || 1) : badge.stage_number,
    });
    setPendingChanges(p => { const n = { ...p }; delete n[badge.id]; return n; });
  };

  const saveFamily = async (familyKey, badges) => {
    const { osmBadgeId } = getValueForFamily(familyKey, badges);
    const osmRecord = osmBadgeId ? getOsmRecord(osmBadgeId) : null;
    const version = osmRecord?.badge_version != null ? String(osmRecord.badge_version) : '0';
    await Promise.all(badges.map(b =>
      base44.entities.BadgeDefinition.update(b.id, {
        osm_badge_id:      osmBadgeId || null,
        osm_badge_version: version,
      })
    ));
    setPendingChanges(p => { const n = { ...p }; delete n[familyKey]; return n; });
  };

  const handleSaveSingle = async (badge) => {
    setSaving(badge.id);
    try {
      await saveSingle(badge);
      queryClient.invalidateQueries({ queryKey: ['badge-definitions-all'] });
      toast.success('Badge linked to OSM');
    } catch (e) { toast.error('Save failed: ' + e.message); }
    finally { setSaving(null); }
  };

  const handleSaveFamily = async (familyKey, badges) => {
    setSaving(familyKey);
    try {
      await saveFamily(familyKey, badges);
      queryClient.invalidateQueries({ queryKey: ['badge-definitions-all'] });
      toast.success(`All ${badges.length} stages linked to OSM`);
    } catch (e) { toast.error('Save failed: ' + e.message); }
    finally { setSaving(null); }
  };

  const handleSaveAll = async () => {
    if (Object.keys(pendingChanges).length === 0) { toast.info('No unsaved changes'); return; }
    setSavingAll(true);
    try {
      for (const badge of nonStagedBadges) {
        if (isBadgeDirty(badge)) await saveSingle(badge);
      }
      for (const [familyKey, badges] of Object.entries(stagedFamilies)) {
        if (isFamilyDirty(familyKey, badges)) await saveFamily(familyKey, badges);
      }
      queryClient.invalidateQueries({ queryKey: ['badge-definitions-all'] });
      toast.success('Saved all changes');
    } catch (e) { toast.error('Save all failed: ' + e.message); }
    finally { setSavingAll(false); }
  };

  const runAISuggest = async (label) => {
    const osmList = uniqueOsmBadges.map(o => `${o.badge_id}: ${o.name} (${o.badge_type})`).join('\n');
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Match Scout badge to OSM badge.\nApp badge: "${label}"\nOSM badges (id: name):\n${osmList}\nReturn ONLY the numeric badge_id of the best matching OSM badge, or "none" if no confident match.`,
      response_json_schema: { type: 'object', properties: { badge_id: { type: 'string' } } }
    });
    const suggested = result?.badge_id;
    if (suggested && suggested !== 'none' && uniqueOsmBadges.find(o => String(o.badge_id) === String(suggested))) {
      return suggested;
    }
    return null;
  };

  const handleAISuggest = async (label, key, existingLevel) => {
    if (uniqueOsmBadges.length === 0) return;
    setSuggesting(key);
    try {
      const suggested = await runAISuggest(label);
      if (suggested) {
        setPending(key, suggested, existingLevel || 1);
        const match = uniqueOsmBadges.find(o => String(o.badge_id) === String(suggested));
        toast.success(`AI suggests: ${match?.name}`);
      } else {
        toast.info('AI could not find a confident match');
      }
    } catch (e) { toast.error('AI suggestion failed'); }
    finally { setSuggesting(null); }
  };

  const handleMatchAll = async (categoryKey, items) => {
    setMatchingAll(p => ({ ...p, [categoryKey]: true }));
    let matched = 0;
    try {
      for (const item of items) {
        setSuggesting(item.key);
        try {
          const suggested = await runAISuggest(item.label);
          if (suggested) {
            setPending(item.key, suggested, item.level || 1);
            matched++;
          }
        } catch { /* continue on individual failure */ }
        setSuggesting(null);
        await delay(300);
      }
      toast.success(`AI matched ${matched} of ${items.length} badges — review and Save All`);
    } finally {
      setSuggesting(null);
      setMatchingAll(p => ({ ...p, [categoryKey]: false }));
    }
  };

  const handleResyncOSMBadges = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncOSMBadges', {});
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ['osm-badges'] });
      toast.success(`Refreshed ${res.data?.badges_synced ?? 0} OSM badges`);
    } catch (e) { toast.error('Sync failed: ' + e.message); }
    finally { setSyncing(false); }
  };

  if (loadingBadges || loadingOsm) {
    return <div className="flex items-center justify-center py-24"><Loader2 className="w-8 h-8 animate-spin text-[#7413dc]" /></div>;
  }

  const pendingCount = Object.keys(pendingChanges).length;

  const renderCategoryCard = (cat, catBadges, catKey) => {
    if (catBadges.length === 0) return null;
    const isMatchingThis = matchingAll[catKey];
    const matchAllItems = catBadges.map(b => ({ key: b.id, label: b.name, level: getValueForBadge(b).level }));
    return (
      <Card key={cat}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base capitalize">{cat} Badges</CardTitle>
            <Button
              size="sm" variant="outline"
              disabled={isMatchingThis || uniqueOsmBadges.length === 0}
              onClick={() => handleMatchAll(catKey, matchAllItems)}
              className="text-xs h-8 text-purple-600 border-purple-200 hover:bg-purple-50"
            >
              {isMatchingThis
                ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Matching...</>
                : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Match All with AI</>}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {catBadges.map(badge => {
            const { osmBadgeId, level } = getValueForBadge(badge);
            const dirty = isBadgeDirty(badge);
            return (
              <BadgeRow
                key={badge.id}
                label={badge.name}
                imageUrl={badge.image_url}
                category={badge.category}
                currentValue={osmBadgeId}
                currentLevel={level}
                uniqueOsmBadges={uniqueOsmBadges}
                saving={saving === badge.id}
                suggesting={suggesting === badge.id}
                isDirty={dirty}
                onSelect={v => setPending(badge.id, v, level)}
                onLevelChange={lv => setPending(badge.id, osmBadgeId, lv)}
                onSave={() => handleSaveSingle(badge)}
                onSuggest={() => handleAISuggest(badge.name, badge.id, level)}
              />
            );
          })}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-[#7413dc]/20 bg-purple-50">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                <Link className="w-4 h-4" /> OSM Badge Mapping
              </h3>
              <p className="text-sm text-purple-700 mt-1">
                Link each app badge to its OSM equivalent. Use <Sparkles className="w-3.5 h-3.5 inline text-purple-500" /> for AI suggestions,
                or <strong>Match All with AI</strong> per category.
                Badges linked to a Staged OSM badge show a Level picker (e.g. Joining In Award).
              </p>
              <div className="flex gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1.5 text-green-700"><CheckCircle className="w-4 h-4" /> {linkedCount} linked</span>
                <span className="flex items-center gap-1.5 text-gray-500"><Unlink className="w-4 h-4" /> {appBadges.length - linkedCount} unlinked</span>
                <span className="text-gray-500">{uniqueOsmBadges.length} unique OSM badges</span>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled={syncing} onClick={handleResyncOSMBadges} className="flex-shrink-0">
              {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh OSM Badge List
            </Button>
          </div>
        </CardContent>
      </Card>

      {osmBadges.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">
            No OSM badges loaded yet. Click <strong>Refresh OSM Badge List</strong> above to fetch them from OSM first.
          </CardContent>
        </Card>
      )}

      {/* Badge families (staged + cross-category families like Joining In) */}
      {Object.keys(stagedFamilies).length > 0 && (() => {
        const catKey = 'staged-families';
        const isMatchingThis = matchingAll[catKey];
        const matchAllItems = Object.entries(stagedFamilies).map(([fk, bs]) => ({
          key: fk,
          label: fk.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          level: 1,
        }));
        return (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Badge Families</CardTitle>
                  <CardDescription>
                    Grouped badges (staged + families like Joining In). Each family maps to one OSM badge;
                    each badge's stage number = its completion level in OSM.
                  </CardDescription>
                </div>
                <Button
                  size="sm" variant="outline"
                  disabled={isMatchingThis || uniqueOsmBadges.length === 0}
                  onClick={() => handleMatchAll(catKey, matchAllItems)}
                  className="text-xs h-8 text-purple-600 border-purple-200 hover:bg-purple-50"
                >
                  {isMatchingThis
                    ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Matching...</>
                    : <><Sparkles className="w-3.5 h-3.5 mr-1.5" />Match All with AI</>}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {Object.entries(stagedFamilies).sort(([a], [b]) => a.localeCompare(b)).map(([familyKey, badges]) => {
                const familyLabel = familyKey.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
                const stageNums = badges.map(b => b.stage_number).filter(Boolean).sort((a, b) => a - b);
                const { osmBadgeId } = getValueForFamily(familyKey, badges);
                const dirty = isFamilyDirty(familyKey, badges);
                const familyCat = badges[0]?.category || 'staged';
                return (
                  <BadgeRow
                    key={familyKey}
                    label={familyLabel}
                    subLabel={stageNums.length > 0 ? `Levels ${stageNums.join(', ')} · ${badges.length} badges` : `${badges.length} badges`}
                    imageUrl={badges[0]?.image_url}
                    category={familyCat}
                    currentValue={osmBadgeId}
                    currentLevel={null}
                    uniqueOsmBadges={uniqueOsmBadges}
                    saving={saving === familyKey}
                    suggesting={suggesting === familyKey}
                    isDirty={dirty}
                    onSelect={v => setPending(familyKey, v, null)}
                    onLevelChange={() => {}}
                    onSave={() => handleSaveFamily(familyKey, badges)}
                    onSuggest={() => handleAISuggest(familyLabel, familyKey, null)}
                  />
                );
              })}
            </CardContent>
          </Card>
        );
      })()}

      {renderCategoryCard('challenge', nonStagedBadges.filter(b => b.category === 'challenge'), 'challenge')}
      {renderCategoryCard('activity',  nonStagedBadges.filter(b => b.category === 'activity'),  'activity')}
      {renderCategoryCard('core',      nonStagedBadges.filter(b => b.category === 'core'),      'core')}
      {renderCategoryCard('special',   nonStagedBadges.filter(b => b.category === 'special'),   'special')}

      {pendingCount > 0 && (
        <div className="sticky bottom-4">
          <Card className="border-[#7413dc] shadow-lg bg-white">
            <CardContent className="p-4 flex items-center justify-between gap-4">
              <p className="text-sm text-gray-700">
                <strong>{pendingCount}</strong> unsaved change{pendingCount !== 1 ? 's' : ''} — review above then save all at once.
              </p>
              <Button disabled={savingAll} onClick={handleSaveAll} className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white">
                {savingAll
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                  : <><Save className="w-4 h-4 mr-2" />Save All Changes</>}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}