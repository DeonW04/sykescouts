import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get OSM settings with OAuth token
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

    // Fetch OSM badges from all four types using GET requests
    console.log(`Fetching OSM badges for section ${sectionType} (ID: ${sectionId})...`);
    
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
      if (!res.ok) {
        console.error(`Failed to fetch type ${typeId}:`, res.status);
        return [];
      }
      const data = await res.json();
      return data.data || [];
    };

    const results = await Promise.all(badgeTypes.map(t => fetchBadges(t.id)));
    
    const osmBadges = results.flat();
    badgeTypes.forEach((t, i) => {
      console.log(`Found ${results[i].length} ${t.name} badges`);
    });
    console.log(`Found ${osmBadges.length} total OSM badges`);

    // Fetch app badges
    const appBadges = await base44.asServiceRole.entities.BadgeDefinition.filter({ active: true });
    console.log(`Found ${appBadges.length} app badges`);

    // Create lists for AI matching
    const osmBadgesList = osmBadges.map(b => `${b.name} (Category: ${b.type || 'unknown'}, ID: ${b.id})`).join('\n');
    const appBadgesList = appBadges.map(b => `${b.name} (Category: ${b.category}, ID: ${b.id})`).join('\n');

    // Use AI to match badges
    console.log('Starting AI matching...');
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a badge matching expert. Match badges from Online Scout Manager with badges in our app.

OSM BADGES (from Online Scout Manager):
${osmBadgesList}

APP BADGES (from our system):
${appBadgesList}

For each OSM badge, find the best matching app badge. Consider:
- Badge name similarity
- Category/type similarity
- Badge purpose and theme

Return a JSON array with objects containing:
- osm_id: OSM badge ID
- osm_name: OSM badge name
- app_id: matched app badge ID (or null if no match)
- app_name: matched app badge name (or null if no match)
- confidence: confidence level (0.0-1.0) where 1.0 is certain
- reason: brief reason for the match (or why no match found)

IMPORTANT: If confidence is below 0.8, indicate uncertainty. Return null for app_id if truly unmatched.`,
      response_json_schema: {
        type: 'object',
        properties: {
          matches: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                osm_id: { type: 'string' },
                osm_name: { type: 'string' },
                app_id: { type: ['string', 'null'] },
                app_name: { type: ['string', 'null'] },
                confidence: { type: 'number' },
                reason: { type: 'string' }
              }
            }
          }
        }
      }
    });

    if (!aiResult.data?.matches) {
      return Response.json({ error: 'AI matching failed' }, { status: 500 });
    }

    const matches = aiResult.data.matches;

    // Separate into categories
    const certain = matches.filter(m => m.confidence >= 0.8 && m.app_id);
    const uncertain = matches.filter(m => m.confidence < 0.8 || !m.app_id);

    console.log(`AI matched: ${certain.length} certain, ${uncertain.length} uncertain/unmatched`);

    return Response.json({
      total: matches.length,
      certain: certain.map(m => ({
        osm_id: m.osm_id,
        osm_name: m.osm_name,
        app_id: m.app_id,
        app_name: m.app_name,
        confidence: m.confidence,
        reason: m.reason
      })),
      uncertain: uncertain.map(m => ({
        osm_id: m.osm_id,
        osm_name: m.osm_name,
        app_id: m.app_id,
        app_name: m.app_name,
        confidence: m.confidence,
        reason: m.reason
      })),
      all_osm_badges: osmBadges.map(b => ({ id: b.id, name: b.name }))
    });
  } catch (error) {
    console.error('matchOSMBadges error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});