import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { osm_badge, app_badges } = body;

    if (!osm_badge || !app_badges || app_badges.length === 0) {
      return Response.json({ error: 'Missing osm_badge or app_badges' }, { status: 400 });
    }

    // Create formatted list of app badges for AI
    const appBadgesList = app_badges.map(b => `${b.name} (Category: ${b.category}, ID: ${b.id})`).join('\n');

    // Use AI to match this single OSM badge
    const aiResult = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a badge matching expert. Match a single OSM badge with the best matching badge from our app.

OSM BADGE:
${osm_badge.name} (ID: ${osm_badge.id})

APP BADGES (options to choose from):
${appBadgesList}

Find the best matching app badge for this OSM badge. Consider:
- Badge name similarity
- Category/type similarity
- Badge purpose and theme

Return a JSON object with:
- app_id: matched app badge ID (or null if no good match)
- app_name: matched app badge name (or null if no match)
- confidence: confidence level (0.0-1.0) where 1.0 is certain
- reason: brief reason for the match (or why no match found)

If no badge is a good match, set app_id and app_name to null.`,
      response_json_schema: {
        type: 'object',
        properties: {
          app_id: { type: ['string', 'null'] },
          app_name: { type: ['string', 'null'] },
          confidence: { type: 'number' },
          reason: { type: 'string' }
        }
      }
    });

    if (!aiResult.data) {
      return Response.json({ error: 'AI matching failed' }, { status: 500 });
    }

    return Response.json({
      osm_id: osm_badge.id,
      osm_name: osm_badge.name,
      app_id: aiResult.data.app_id,
      app_name: aiResult.data.app_name,
      confidence: aiResult.data.confidence,
      reason: aiResult.data.reason
    });
  } catch (error) {
    console.error('matchOSMBadges error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});