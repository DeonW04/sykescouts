import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    console.log('[getOSMBadgesForMatching] Starting badge fetch...');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      console.log('[getOSMBadgesForMatching] User not admin, rejecting');
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get OSM settings
    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];
    
    console.log('[getOSMBadgesForMatching] Settings retrieved:', {
      has_token: !!settings?.osm_access_token,
      section_id: settings?.osm_section_id,
      section_type: settings?.osm_section
    });

    if (!settings?.osm_access_token) {
      console.error('[getOSMBadgesForMatching] No OSM access token found');
      return Response.json({ error: 'OSM not connected' }, { status: 400 });
    }

    const accessToken = settings.osm_access_token;
    const sectionId = settings.osm_section_id;
    const sectionType = settings.osm_section;
    const termId = settings.osm_term_id || '0';

    if (!sectionId || !sectionType) {
      console.error('[getOSMBadgesForMatching] Missing section config');
      return Response.json({ error: 'OSM section not configured' }, { status: 400 });
    }

    console.log('[getOSMBadgesForMatching] Using config:', { sectionId, sectionType, termId });

    // Fetch OSM badges from all four types
    const badgeTypes = [
      { id: 1, name: 'Challenge' },
      { id: 2, name: 'Activity' },
      { id: 3, name: 'Staged' },
      { id: 4, name: 'Core' }
    ];

    const fetchBadges = async (typeId, typeName) => {
      const url = `https://www.onlinescoutmanager.co.uk/ext/badges/records/?action=getAvailableBadges&section=${encodeURIComponent(sectionType)}&section_id=${sectionId}&term_id=${termId}&type_id=${typeId}`;
      
      console.log(`[getOSMBadgesForMatching] Fetching ${typeName} badges (type_id=${typeId})`);
      console.log(`[getOSMBadgesForMatching] URL: ${url}`);
      console.log(`[getOSMBadgesForMatching] Auth header: Bearer ${accessToken.substring(0, 20)}...`);

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });

        console.log(`[getOSMBadgesForMatching] ${typeName} response status: ${res.status}`);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error(`[getOSMBadgesForMatching] ${typeName} fetch failed:`, {
            status: res.status,
            statusText: res.statusText,
            body: errorText.substring(0, 500)
          });
          return [];
        }

        const data = await res.json();
        console.log(`[getOSMBadgesForMatching] ${typeName} response data:`, {
          type: typeof data,
          has_data: 'data' in data,
          has_items: 'items' in data,
          has_identifier: 'identifier' in data,
          has_label: 'label' in data,
          data_keys: Object.keys(data)
        });

        // Handle OSM response format: items is an object with badge objects as values
        let badges = [];
        if (data.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
          // Convert object values to array
          badges = Object.values(data.items);
          console.log(`[getOSMBadgesForMatching] ${typeName} extracted from items object: ${badges.length} badges`);
        } else if (Array.isArray(data?.data)) {
          badges = data.data;
          console.log(`[getOSMBadgesForMatching] ${typeName} extracted from data array: ${badges.length} badges`);
        } else if (Array.isArray(data)) {
          badges = data;
          console.log(`[getOSMBadgesForMatching] ${typeName} extracted from direct array: ${badges.length} badges`);
        }
        
        if (badges.length > 0) {
          console.log(`[getOSMBadgesForMatching] ${typeName} sample badge:`, JSON.stringify(badges[0]));
        }

        return badges;
      } catch (e) {
        console.error(`[getOSMBadgesForMatching] ${typeName} exception:`, e.message);
        return [];
      }
    };

    const results = await Promise.all(badgeTypes.map(t => fetchBadges(t.id, t.name)));
    const osmBadges = results.flat();

    console.log(`[getOSMBadgesForMatching] Total OSM badges from all types: ${osmBadges.length}`);

    // Fetch app badges
    const appBadges = await base44.asServiceRole.entities.BadgeDefinition.filter({ active: true });
    console.log(`[getOSMBadgesForMatching] App badges found: ${appBadges.length}`);
    
    if (appBadges.length > 0) {
      console.log('[getOSMBadgesForMatching] Sample app badge:', {
        id: appBadges[0].id,
        name: appBadges[0].name,
        category: appBadges[0].category
      });
    }

    const response = {
      osm_badges: osmBadges.map(b => ({ id: b.id, name: b.name })),
      app_badges: appBadges.map(b => ({ id: b.id, name: b.name, category: b.category }))
    };

    console.log('[getOSMBadgesForMatching] Final response:', {
      osm_count: response.osm_badges.length,
      app_count: response.app_badges.length
    });

    return Response.json(response);
  } catch (error) {
    console.error('[getOSMBadgesForMatching] Fatal error:', error.message);
    console.error('[getOSMBadgesForMatching] Stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});