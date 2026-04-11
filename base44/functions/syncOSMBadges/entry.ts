import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    console.log('[syncOSMBadges] Starting OSM badge sync...');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      console.log('[syncOSMBadges] User not admin');
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Use SSO access token (OSM is the SSO provider)
    const accessToken = await base44.asServiceRole.sso.getAccessToken(user.id);
    if (!accessToken) {
      return Response.json({ error: 'No OSM SSO token available. Please sign in via OSM.' }, { status: 401 });
    }

    // Get OSM settings for section config
    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];

    const sectionId = settings?.osm_section_id;
    const sectionType = settings?.osm_section;
    const termId = settings?.osm_term_id || '0';

    if (!sectionId || !sectionType) {
      console.error('[syncOSMBadges] Missing section config');
      return Response.json({ error: 'OSM section not configured' }, { status: 400 });
    }

    console.log('[syncOSMBadges] Fetching badges for section:', { sectionId, sectionType });

    // Fetch OSM badges from all four types
    const badgeTypes = [
      { id: 1, name: 'Challenge' },
      { id: 2, name: 'Activity' },
      { id: 3, name: 'Staged' },
      { id: 4, name: 'Core' }
    ];

    const fetchBadges = async (typeId, typeName) => {
      const url = `https://www.onlinescoutmanager.co.uk/ext/badges/records/?action=getAvailableBadges&section=${encodeURIComponent(sectionType)}&section_id=${sectionId}&term_id=${termId}&type_id=${typeId}`;
      
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        if (!res.ok) {
          console.error(`[syncOSMBadges] ${typeName} fetch failed: ${res.status}`);
          return [];
        }

        const data = await res.json();
        
        // Handle OSM response format: items is an object with badge objects as values
        let badges = [];
        if (data.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
          badges = Object.values(data.items);
        }
        
        console.log(`[syncOSMBadges] Fetched ${badges.length} ${typeName} badges`);
        return badges.map(b => ({
          osm_id: b.badge_identifier,
          name: b.name,
          badge_type: typeName,
          shortname: b.shortname,
          description: b.description,
          picture_url: b.picture,
          badge_id: b.badge_id,
          badge_version: b.badge_version
        }));
      } catch (e) {
        console.error(`[syncOSMBadges] ${typeName} exception:`, e.message);
        return [];
      }
    };

    const results = await Promise.all(badgeTypes.map(t => fetchBadges(t.id, t.name)));
    const osmBadges = results.flat();

    console.log(`[syncOSMBadges] Total badges to store: ${osmBadges.length}`);

    // Clear existing badges and insert new ones
    const existingBadges = await base44.asServiceRole.entities.OSMBadge.filter({});
    for (const badge of existingBadges) {
      await base44.asServiceRole.entities.OSMBadge.delete(badge.id);
    }
    console.log('[syncOSMBadges] Cleared existing OSM badges');

    // Insert new badges in batches
    const batchSize = 50;
    for (let i = 0; i < osmBadges.length; i += batchSize) {
      const batch = osmBadges.slice(i, i + batchSize);
      await base44.asServiceRole.entities.OSMBadge.bulkCreate(batch);
      console.log(`[syncOSMBadges] Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(osmBadges.length / batchSize)}`);
    }

    console.log(`[syncOSMBadges] Sync complete: ${osmBadges.length} badges stored`);
    return Response.json({
      success: true,
      badges_synced: osmBadges.length
    });
  } catch (error) {
    console.error('[syncOSMBadges] Fatal error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});