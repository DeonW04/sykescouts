import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get OSM settings
    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];
    
    if (!settings?.osm_access_token) {
      return Response.json({ error: 'OSM not connected' }, { status: 400 });
    }

    const accessToken = settings.osm_access_token;
    const sectionId = settings.osm_section_id;
    const sectionType = settings.osm_section;
    const termId = settings.osm_term_id || '0';

    if (!sectionId || !sectionType) {
      return Response.json({ error: 'OSM section not configured' }, { status: 400 });
    }

    // Fetch OSM badges from all four types
    const badgeTypes = [
      { id: 1, name: 'Challenge' },
      { id: 2, name: 'Activity' },
      { id: 3, name: 'Staged' },
      { id: 4, name: 'Core' }
    ];

    const fetchBadges = async (typeId) => {
      const url = `https://www.onlinescoutmanager.co.uk/ext/badges/records/?action=getAvailableBadges&section=${encodeURIComponent(sectionType)}&section_id=${sectionId}&term_id=${termId}&type_id=${typeId}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.data || [];
    };

    const results = await Promise.all(badgeTypes.map(t => fetchBadges(t.id)));
    const osmBadges = results.flat();

    // Fetch app badges
    const appBadges = await base44.asServiceRole.entities.BadgeDefinition.filter({ active: true });

    console.log(`Fetched ${osmBadges.length} OSM badges and ${appBadges.length} app badges`);

    return Response.json({
      osm_badges: osmBadges.map(b => ({ id: b.id, name: b.name })),
      app_badges: appBadges.map(b => ({ id: b.id, name: b.name, category: b.category }))
    });
  } catch (error) {
    console.error('getOSMBadgesForMatching error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});