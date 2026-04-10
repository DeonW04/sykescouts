import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    console.log('[matchOSMBadges] Starting badge match...');
    
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      console.log('[matchOSMBadges] User not admin');
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { osm_badge, app_badges } = body;

    console.log('[matchOSMBadges] Input received:', {
      osm_badge_name: osm_badge?.name,
      osm_badge_id: osm_badge?.id,
      app_badges_count: app_badges?.length
    });

    if (!osm_badge || !app_badges || app_badges.length === 0) {
      console.error('[matchOSMBadges] Missing required inputs');
      return Response.json({ error: 'Missing osm_badge or app_badges' }, { status: 400 });
    }

    // Create formatted list of app badges for AI
    const appBadgesList = app_badges.map(b => `${b.name} (Category: ${b.category}, ID: ${b.id})`).join('\n');

    console.log('[matchOSMBadges] Formatted app badges for AI:', {
      count: app_badges.length,
      sample: appBadgesList.split('\n').slice(0, 3).join('\n')
    });

    // Use AI to match this single OSM badge
    console.log(`[matchOSMBadges] Calling InvokeLLM for badge: ${osm_badge.name}`);
    
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

    console.log('[matchOSMBadges] AI response received:', {
      has_data: !!aiResult.data,
      status: aiResult.status,
      type: typeof aiResult.data
    });

    if (!aiResult.data) {
      console.error('[matchOSMBadges] AI response missing data:', {
        full_response: JSON.stringify(aiResult)
      });
      return Response.json({ error: 'AI matching failed - no data returned' }, { status: 500 });
    }

    console.log('[matchOSMBadges] AI match result:', {
      app_id: aiResult.data.app_id,
      app_name: aiResult.data.app_name,
      confidence: aiResult.data.confidence,
      reason: aiResult.data.reason
    });

    const response = {
      osm_id: osm_badge.id,
      osm_name: osm_badge.name,
      app_id: aiResult.data.app_id,
      app_name: aiResult.data.app_name,
      confidence: aiResult.data.confidence,
      reason: aiResult.data.reason
    };

    console.log('[matchOSMBadges] Returning match result:', response);
    return Response.json(response);
  } catch (error) {
    console.error('[matchOSMBadges] Fatal error:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
    return Response.json({ 
      error: error.message,
      type: error.constructor.name
    }, { status: 500 });
  }
});