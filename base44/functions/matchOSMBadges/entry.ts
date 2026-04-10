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

    // Fetch OSM badges
    console.log('Fetching OSM badges...');
    const osmRes = await fetch('https://www.onlinescoutmanager.co.uk/ext/badges/records/?action=getAvailableBadges', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!osmRes.ok) {
      console.error('OSM fetch failed:', osmRes.status);
      return Response.json({ error: 'Failed to fetch OSM badges' }, { status: 500 });
    }

    const osmText = await osmRes.text();
    let osmData;
    
    // Handle both direct JSON and HTML-embedded data
    try {
      osmData = JSON.parse(osmText);
    } catch (_e) {
      const match = osmText.match(/var data_holder = ({[\s\S]*?});/);
      if (match) {
        osmData = JSON.parse(match[1]);
      } else {
        return Response.json({ error: 'Could not parse OSM response' }, { status: 500 });
      }
    }

    const osmBadges = osmData.badges || [];
    console.log(`Found ${osmBadges.length} OSM badges`);

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