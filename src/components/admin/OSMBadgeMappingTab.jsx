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

function BadgeRow({ label, subLabel, imageUrl, category, currentValue, uniqueOsmBadges, saving, suggesting, onSelect, onSave, onSuggest, isDirty }) {
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

      {/* AI Suggest button */}
      <Button
        size="sm"
        variant="ghost"
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
  // pendingChanges: { key → osmBadgeId string }  (key = badgeDefId for singles, familyKey for families)
  const [pendingChanges, setPendingChanges] = useState({});
  const [saving, setSaving] = useState(null);
  const [suggesting, setSuggesting] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const { data: appBadges = [], isLoading: loadingBadges } = useQuery({
    queryKey: ['badge-definitions-all'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: osmBadges = [], isLoading: loadingOsm } = useQuery({
    queryKey: ['osm-badges'],
    queryFn: () => base44.entities.OSMBadge.list('-created_date', 300),
  });

  // Deduplicate OSM badges by badge_id for the dropdown — keep the first occurrence per badge_id
  const uniqueOsmBadges = useMemo(() => {
    const seen = new Set();
    return osmBadges.filter(o => {
      const key = String(o.badge_id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [osmBadges]);

  // Build old linked_to_app_badge lookup: badgeDefId → OSM badge_id
  const oldLinkByBadgeId = useMemo(() => {
    const map = {};
    for (const o of osmBadges) {
      if (o.linked_to_app_badge && o.badge_id) {
        map[o.linked_to_app_badge] = String(o.badge_id);
      }
    }
    return map;
  }, [osmBadges]);

  // Get the resolved current value for a badgeDef (pending > saved > old link)
  const getValueForBadge = (badge, changeKey) => {
    if (pendingChanges[changeKey] !== undefined) return pendingChanges[changeKey];
    if (badge.osm_badge_id) return String(badge.osm_badge_id);
    // Fallback: old linked_to_app_badge system
    if (oldLinkByBadgeId[badge.id]) return oldLinkByBadgeId[badge.id];
    return '';
  };

  // For a staged family: use value from first badge, falling back to any badge in family with a link
  const getValueForFamily = (familyKey, badges) => {
    if (pendingChanges[familyKey] !== undefined) return pendingChanges[familyKey];
    for (const b of badges) {
      if (b.osm_badge_id) return String(b.osm_badge_id);
    }
    // Fallback: old link on any badge in this family
    for (const b of badges) {
      if (oldLinkByBadgeId[b.id]) return oldLinkByBadgeId[b.id];
    }
    return '';
  };

  // Build families
  const { stagedFamilies, nonStagedBadges } = useMemo(() => {
    const families = {};
    const nonStaged = [];
    for (const b of appBadges) {
      if (b.category === 'staged' && b.badge_family_id) {
        if (!families[b.badge_family_id]) families[b.badge_family_id] = [];
        families[b.badge_family_id].push(b);
      } else {
        nonStaged.push(b);
      }
    }
    for (const f of Object.values(families)) f.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
    return { stagedFamilies: families, nonStagedBadges: nonStaged.sort((a, b) => a.name.localeCompare(b.name)) };
  }, [appBadges]);

  const linkedCount = useMemo(() => {
    return appBadges.filter(b => b.osm_badge_id || oldLinkByBadgeId[b.id]).length;
  }, [appBadges, oldLinkByBadgeId]);

  const getOsmRecord = (osmBadgeId) => uniqueOsmBadges.find(o => String(o.badge_id) === String(osmBadgeId));

  const handleSaveSingle = async (badge, changeKey) => {
    const osmBadgeId = getValueForBadge(badge, changeKey);
    setSaving(changeKey);
    try {
      const osmRecord = osmBadgeId ? getOsmRecord(osmBadgeId) : null;
      await base44.entities.BadgeDefinition.update(badge.id, {
        osm_badge_id:      osmBadgeId || null,
        osm_badge_version: osmRecord?.badge_version != null ? String(osmRecord.badge_version) : '0',
      });
      // Clear pending after save
      setPendingChanges(p => { const n = { ...p }; delete n[changeKey]; return n; });
      queryClient.invalidateQueries({ queryKey: ['badge-definitions-all'] });
      toast.success('Badge linked to OSM');
    } catch (e) {
      toast.error('Save failed: ' + e.message);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveFamily = async (familyKey, badges) => {
    const osmBadgeId = getValueForFamily(familyKey, badges);
    setSaving(familyKey);
    try {
      const osmRecord = osmBadgeId ? getOsmRecord(osmBadgeId) : null;
      const version = osmRecord?.badge_version != null ? String(osmRecord.badge_version) : '0';
      await Promise.all(badges.map(b =>
        base44.entities.BadgeDefinition.update(b.id, {
          osm_badge_id:      osmBadgeId || null,
          osm_badge_version: version,
        })
      ));
      setPendingChanges(p => { const n = { ...p }; delete n[familyKey]; return n; });
      queryClient.invalidateQueries({ queryKey: ['badge-definitions-all'] });
      toast.success(`All ${badges.length} stages linked to OSM`);
    } catch (e) {
      toast.error('Save failed: ' + e.message);
    } finally {
      setSaving(null);
    }
  };

  const handleAISuggest = async (label, changeKey, setFn) => {
    setSuggesting(changeKey);
    try {
      const osmList = uniqueOsmBadges.map(o => `${o.badge_id}: ${o.name} (${o.badge_type})`).join('\n');
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are helping match Scout badges between systems. 
        
App badge: "${label}"

OSM badges available (id: name):
${osmList}

Return ONLY the numeric badge_id of the best matching OSM badge, or "none" if there is no good match. No explanation, just the number or "none".`,
        response_json_schema: {
          type: 'object',
          properties: {
            badge_id: { type: 'string', description: 'The OSM badge_id number, or "none"' }
          }
        }
      });
      const suggested = result?.badge_id;
      if (suggested && suggested !== 'none' && uniqueOsmBadges.find(o => String(o.badge_id) === String(suggested))) {
        setFn(suggested);
        const match = uniqueOsmBadges.find(o => String(o.badge_id) === String(suggested));
        toast.success(`AI suggests: ${match?.name}`);
      } else {
        toast.info('AI could not find a confident match — please select manually');
      }
    } catch (e) {
      toast.error('AI suggestion failed: ' + e.message);
    } finally {
      setSuggesting(null);
    }
  };

  const handleResyncOSMBadges = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncOSMBadges', {});
      if (res.data?.error) throw new Error(res.data.error);
      queryClient.invalidateQueries({ queryKey: ['osm-badges'] });
      toast.success(`Refreshed ${res.data?.badges_synced ?? 0} OSM badges`);
    } catch (e) {
      toast.error('Sync failed: ' + e.message);
    } finally {
      setSyncing(false);
    }
  };

  if (loadingBadges || loadingOsm) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-[#7413dc]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-[#7413dc]/20 bg-purple-50">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                <Link className="w-4 h-4" /> OSM Badge Mapping
              </h3>
              <p className="text-sm text-purple-700 mt-1">
                Link each app badge to its matching OSM badge. For staged badges, all stages share one OSM badge — 
                the stage number becomes the completion level when syncing.
                Use <Sparkles className="w-3.5 h-3.5 inline text-purple-500" /> to get an AI suggestion.
              </p>
              <div className="flex gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1.5 text-green-700">
                  <CheckCircle className="w-4 h-4" /> {linkedCount} linked
                </span>
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Unlink className="w-4 h-4" /> {appBadges.length - linkedCount} unlinked
                </span>
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

      {/* Staged badge families */}
      {Object.keys(stagedFamilies).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Staged Badges</CardTitle>
            <CardDescription>
              Each family maps to one OSM badge. The stage number is used as the completion level.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {Object.entries(stagedFamilies).sort(([a], [b]) => a.localeCompare(b)).map(([familyKey, badges]) => {
              const familyLabel = familyKey.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
              const stageNums = badges.map(b => b.stage_number).filter(Boolean).sort((a, b) => a - b);
              const currentValue = getValueForFamily(familyKey, badges);
              const savedValue = badges[0]?.osm_badge_id || oldLinkByBadgeId[badges[0]?.id] || '';
              const isDirty = pendingChanges[familyKey] !== undefined && pendingChanges[familyKey] !== savedValue;

              return (
                <BadgeRow
                  key={familyKey}
                  label={familyLabel}
                  subLabel={stageNums.length > 0 ? `Stages ${stageNums.join(', ')} · ${badges.length} badges` : `${badges.length} badges`}
                  imageUrl={badges[0]?.image_url}
                  category="staged"
                  currentValue={currentValue}
                  uniqueOsmBadges={uniqueOsmBadges}
                  saving={saving === familyKey}
                  suggesting={suggesting === familyKey}
                  isDirty={isDirty}
                  onSelect={v => setPendingChanges(p => ({ ...p, [familyKey]: v }))}
                  onSave={() => handleSaveFamily(familyKey, badges)}
                  onSuggest={() => handleAISuggest(familyLabel, familyKey, v => setPendingChanges(p => ({ ...p, [familyKey]: v })))}
                />
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Non-staged badges by category */}
      {['challenge', 'activity', 'core', 'special'].map(cat => {
        const catBadges = nonStagedBadges.filter(b => b.category === cat);
        if (catBadges.length === 0) return null;
        return (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base capitalize">{cat} Badges</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {catBadges.map(badge => {
                const currentValue = getValueForBadge(badge, badge.id);
                const savedValue = badge.osm_badge_id || oldLinkByBadgeId[badge.id] || '';
                const isDirty = pendingChanges[badge.id] !== undefined && pendingChanges[badge.id] !== savedValue;
                return (
                  <BadgeRow
                    key={badge.id}
                    label={badge.name}
                    imageUrl={badge.image_url}
                    category={badge.category}
                    currentValue={currentValue}
                    uniqueOsmBadges={uniqueOsmBadges}
                    saving={saving === badge.id}
                    suggesting={suggesting === badge.id}
                    isDirty={isDirty}
                    onSelect={v => setPendingChanges(p => ({ ...p, [badge.id]: v }))}
                    onSave={() => handleSaveSingle(badge, badge.id)}
                    onSuggest={() => handleAISuggest(badge.name, badge.id, v => setPendingChanges(p => ({ ...p, [badge.id]: v })))}
                  />
                );
              })}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}