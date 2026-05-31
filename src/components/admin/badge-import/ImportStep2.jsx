import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronRight, ChevronDown, Loader2, ArrowLeft } from 'lucide-react';

function BadgeRow({ badge, status }) {
  const imgSrc = badge.picture
    ? (badge.picture.startsWith('http') ? badge.picture : `https://oymcdn.co.uk/${badge.picture.replace(/^\/+/, '')}`)
    : null;

  return (
    <div className="flex items-center gap-3 py-2 px-1 border-b border-gray-50 last:border-0">
      {imgSrc ? (
        <img src={imgSrc} alt={badge.name} className="w-10 h-10 rounded object-contain bg-gray-50 flex-shrink-0" />
      ) : (
        <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{badge.name}</p>
        <p className="text-xs text-gray-500">{badge.type_id === 1 ? 'Challenge' : 'Activity'}</p>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status === 'already' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'}`}>
        {status === 'already' ? 'Already imported' : 'Ready to import'}
      </span>
    </div>
  );
}

function BadgeGroup({ groupName, badges, existingMap }) {
  const [expanded, setExpanded] = useState(true);
  return (
    <div className="border rounded-lg overflow-hidden mb-3">
      <button
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700"
        onClick={() => setExpanded(e => !e)}
      >
        <span>{groupName} <span className="font-normal text-gray-400">({badges.length})</span></span>
        <ChevronDown className={`w-4 h-4 transition-transform ${expanded ? '' : '-rotate-90'}`} />
      </button>
      {expanded && (
        <div className="px-4 bg-white">
          {badges.map(b => (
            <BadgeRow
              key={`${b.badge_id}_${b.badge_version}`}
              badge={b}
              status={existingMap.has(`${b.badge_id}_${b.badge_version}`) ? 'already' : 'ready'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ImportStep2({ section, term, onNext, onBack }) {
  const [badges, setBadges] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { data: existingBadges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({}),
  });

  const existingMap = new Set(existingBadges.filter(b => b.osm_badge_id).map(b => `${b.osm_badge_id}_${b.osm_badge_version || '0'}`));

  const fetchBadges = async () => {
    setLoading(true);
    setError(null);
    const res = await base44.functions.invoke('getOSMBadgeList', {
      sectionId: section.osm_section_id,
      sectionType: section.osm_section_type || section.name,
      termId: term?.termid || 0,
    });
    if (!res?.data?.success) {
      setError(res?.data?.error || 'Failed to fetch badges from OSM.');
      setLoading(false);
      return;
    }
    setBadges(res.data.badges || []);
    setLoading(false);
  };

  // Group by badge_group (null/empty → "General" shown first)
  const grouped = {};
  if (badges) {
    for (const b of badges) {
      const g = b.group_name || '';
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(b);
    }
  }
  const groupKeys = Object.keys(grouped).sort((a, b) => {
    if (!a) return -1;
    if (!b) return 1;
    return a.localeCompare(b);
  });

  const readyBadges = badges ? badges.filter(b => !existingMap.has(`${b.badge_id}_${b.badge_version}`)) : [];
  const alreadyCount = badges ? badges.length - readyBadges.length : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2 — Available Badges</CardTitle>
        <p className="text-sm text-gray-500">
          Section: <strong>{section.display_name}</strong> · Term: <strong>{term?.name}</strong>
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!badges && !loading && (
          <div className="flex gap-3">
            <Button onClick={fetchBadges} className="bg-[#7413dc] hover:bg-[#5c0fb0]">
              Fetch badges from OSM
            </Button>
            <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
            <Loader2 className="w-5 h-5 animate-spin" />Fetching badges from OSM…
          </div>
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        {badges && (
          <>
            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700 flex gap-4 flex-wrap">
              <span><strong>{badges.length}</strong> badges found</span>
              <span className="text-gray-400">·</span>
              <span className="text-gray-500"><strong>{alreadyCount}</strong> already imported</span>
              <span className="text-gray-400">·</span>
              <span className="text-green-700"><strong>{readyBadges.length}</strong> ready to import</span>
            </div>

            <div>
              {groupKeys.map(g => (
                <BadgeGroup
                  key={g}
                  groupName={g || 'General'}
                  badges={grouped[g]}
                  existingMap={existingMap}
                />
              ))}
            </div>

            <div className="flex justify-between pt-2">
              <Button variant="outline" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" />Back</Button>
              <Button
                disabled={readyBadges.length === 0}
                onClick={() => onNext(readyBadges)}
                className="bg-[#7413dc] hover:bg-[#5c0fb0]"
              >
                Proceed to import ({readyBadges.length} badges) <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}