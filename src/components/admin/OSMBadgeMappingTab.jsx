import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, CheckCircle, Link, Unlink } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORY_COLOURS = {
  staged:    'bg-purple-100 text-purple-800',
  activity:  'bg-blue-100 text-blue-800',
  challenge: 'bg-orange-100 text-orange-800',
  core:      'bg-green-100 text-green-800',
  special:   'bg-gray-100 text-gray-800',
};

// A single row for a non-staged badge
function SingleBadgeRow({ badge, osmBadges, onSave, saving }) {
  const currentOsm = osmBadges.find(o => String(o.badge_id) === String(badge.osm_badge_id));
  const [selected, setSelected] = useState(badge.osm_badge_id || '');

  const isDirty = selected !== (badge.osm_badge_id || '');

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-gray-50/50">
      {badge.image_url && (
        <img src={badge.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900">{badge.name}</p>
        <Badge className={`text-xs mt-0.5 ${CATEGORY_COLOURS[badge.category] || 'bg-gray-100 text-gray-700'}`}>
          {badge.category}
        </Badge>
      </div>
      <div className="w-56 flex-shrink-0">
        <Select value={selected || '__none__'} onValueChange={v => setSelected(v === '__none__' ? '' : v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Not linked" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Not linked —</SelectItem>
            {osmBadges.map(o => (
              <SelectItem key={o.id} value={String(o.badge_id)}>
                {o.name} ({o.badge_type})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        size="sm"
        disabled={!isDirty || saving}
        onClick={() => onSave(badge.id, selected)}
        className="h-8 px-3 text-xs bg-[#7413dc] hover:bg-[#5c0fb0] disabled:opacity-40"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save'}
      </Button>
    </div>
  );
}

// A row for a staged badge family — all stages share the same OSM badge_id
function StagedFamilyRow({ family, badges, osmBadges, onSaveFamily, saving }) {
  const firstBadge = badges[0];
  const currentOsmId = firstBadge?.osm_badge_id || '';
  const [selected, setSelected] = useState(currentOsmId);
  const isDirty = selected !== currentOsmId;
  const stageNums = badges.map(b => b.stage_number).filter(Boolean).sort((a, b) => a - b);

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-gray-50/50">
      {firstBadge?.image_url && (
        <img src={firstBadge.image_url} alt="" className="w-8 h-8 rounded object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900">{family}</p>
        <div className="flex flex-wrap gap-1 mt-0.5">
          <Badge className="text-xs bg-purple-100 text-purple-800">staged</Badge>
          {stageNums.length > 0 && (
            <span className="text-xs text-gray-400">Stages {stageNums.join(', ')}</span>
          )}
          <span className="text-xs text-gray-400">· {badges.length} badge{badges.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="w-56 flex-shrink-0">
        <Select value={selected || '__none__'} onValueChange={v => setSelected(v === '__none__' ? '' : v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Not linked" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Not linked —</SelectItem>
            {osmBadges.filter(o => o.badge_type === 'Staged').map(o => (
              <SelectItem key={o.id} value={String(o.badge_id)}>
                {o.name}
              </SelectItem>
            ))}
            {osmBadges.filter(o => o.badge_type !== 'Staged').length > 0 && (
              <>
                <div className="px-2 py-1 text-xs text-gray-400 font-semibold">Other types</div>
                {osmBadges.filter(o => o.badge_type !== 'Staged').map(o => (
                  <SelectItem key={o.id} value={String(o.badge_id)}>
                    {o.name} ({o.badge_type})
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      </div>
      <Button
        size="sm"
        disabled={!isDirty || saving}
        onClick={() => onSaveFamily(badges.map(b => b.id), selected)}
        className="h-8 px-3 text-xs bg-[#7413dc] hover:bg-[#5c0fb0] disabled:opacity-40"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Save All'}
      </Button>
    </div>
  );
}

export default function OSMBadgeMappingTab() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(null); // id or 'family:x'
  const [syncing, setSyncing] = useState(false);

  const { data: appBadges = [], isLoading: loadingBadges } = useQuery({
    queryKey: ['badge-definitions-all'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const { data: osmBadges = [], isLoading: loadingOsm } = useQuery({
    queryKey: ['osm-badges'],
    queryFn: () => base44.entities.OSMBadge.list('-created_date', 300),
  });

  // Build: family name → list of staged BadgeDefinitions
  const { stagedFamilies, nonStagedBadges } = useMemo(() => {
    const families = {};
    const nonStaged = [];
    for (const b of appBadges) {
      if (b.category === 'staged' && b.badge_family_id) {
        const familyName = b.badge_family_id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        if (!families[familyName]) families[familyName] = [];
        families[familyName].push(b);
      } else {
        nonStaged.push(b);
      }
    }
    // Sort stages within each family
    for (const f of Object.values(families)) {
      f.sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0));
    }
    return { stagedFamilies: families, nonStagedBadges: nonStaged.sort((a, b) => a.name.localeCompare(b.name)) };
  }, [appBadges]);

  const linkedCount = appBadges.filter(b => b.osm_badge_id).length;

  const handleSaveSingle = async (badgeDefId, osmBadgeId) => {
    setSaving(badgeDefId);
    try {
      const osmRecord = osmBadgeId ? osmBadges.find(o => String(o.badge_id) === String(osmBadgeId)) : null;
      await base44.entities.BadgeDefinition.update(badgeDefId, {
        osm_badge_id:      osmBadgeId || null,
        osm_badge_version: osmRecord?.badge_version != null ? String(osmRecord.badge_version) : '0',
      });
      queryClient.invalidateQueries({ queryKey: ['badge-definitions-all'] });
      toast.success('Badge linked to OSM');
    } catch (e) {
      toast.error('Save failed: ' + e.message);
    } finally {
      setSaving(null);
    }
  };

  const handleSaveFamily = async (badgeDefIds, osmBadgeId) => {
    setSaving('family');
    try {
      const osmRecord = osmBadgeId ? osmBadges.find(o => String(o.badge_id) === String(osmBadgeId)) : null;
      const version = osmRecord?.badge_version != null ? String(osmRecord.badge_version) : '0';
      await Promise.all(badgeDefIds.map(id =>
        base44.entities.BadgeDefinition.update(id, {
          osm_badge_id:      osmBadgeId || null,
          osm_badge_version: version,
        })
      ));
      queryClient.invalidateQueries({ queryKey: ['badge-definitions-all'] });
      toast.success(`All ${badgeDefIds.length} stages linked to OSM`);
    } catch (e) {
      toast.error('Save failed: ' + e.message);
    } finally {
      setSaving(null);
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
      {/* Header card */}
      <Card className="border-[#7413dc]/20 bg-purple-50">
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h3 className="font-semibold text-purple-900 flex items-center gap-2">
                <Link className="w-4 h-4" /> OSM Badge Mapping
              </h3>
              <p className="text-sm text-purple-700 mt-1">
                Link each badge in this app to its matching badge in Online Scout Manager.
                For staged badges, all stages share one OSM badge — the stage number is used as the level when syncing.
              </p>
              <div className="flex gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1.5 text-green-700">
                  <CheckCircle className="w-4 h-4" /> {linkedCount} linked
                </span>
                <span className="flex items-center gap-1.5 text-gray-500">
                  <Unlink className="w-4 h-4" /> {appBadges.length - linkedCount} unlinked
                </span>
                <span className="text-gray-500">{osmBadges.length} OSM badges loaded</span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={syncing}
              onClick={handleResyncOSMBadges}
              className="flex-shrink-0"
            >
              {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Refresh OSM Badge List
            </Button>
          </div>
        </CardContent>
      </Card>

      {osmBadges.length === 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">
            No OSM badges loaded yet. Click <strong>Refresh OSM Badge List</strong> above to fetch them from OSM.
          </CardContent>
        </Card>
      )}

      {/* Staged badge families */}
      {Object.keys(stagedFamilies).length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Staged Badges</CardTitle>
            <CardDescription>
              Each family maps to one OSM badge. The stage number is used as the completion level when syncing awards.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {Object.entries(stagedFamilies).sort(([a], [b]) => a.localeCompare(b)).map(([family, badges]) => (
              <StagedFamilyRow
                key={family}
                family={family}
                badges={badges}
                osmBadges={osmBadges}
                onSaveFamily={handleSaveFamily}
                saving={saving === 'family'}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Non-staged badges grouped by category */}
      {['challenge', 'activity', 'core', 'special'].map(cat => {
        const catBadges = nonStagedBadges.filter(b => b.category === cat);
        if (catBadges.length === 0) return null;
        return (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base capitalize">{cat} Badges</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {catBadges.map(badge => (
                <SingleBadgeRow
                  key={badge.id}
                  badge={badge}
                  osmBadges={osmBadges}
                  onSave={handleSaveSingle}
                  saving={saving === badge.id}
                />
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}