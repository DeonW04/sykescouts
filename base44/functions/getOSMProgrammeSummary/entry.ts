import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];

    if (!settings?.osm_access_token) {
      return Response.json({ error: 'OSM not connected' }, { status: 400 });
    }

    const { osm_access_token: accessToken, osm_section_id: sectionId, osm_term_id: termId } = settings;

    if (!sectionId || !termId) {
      return Response.json({ error: 'OSM section or term not configured' }, { status: 400 });
    }

    const url = `https://www.onlinescoutmanager.co.uk/ext/programme/?action=getProgrammeSummary&sectionid=${sectionId}&termid=${termId}&verbose=1`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      return Response.json({ error: `OSM returned ${res.status}: ${body.substring(0, 200)}` }, { status: 500 });
    }

    const data = await res.json();
    const items = data.items || [];

    return Response.json({ items });
  } catch (error) {
    console.error('[getOSMProgrammeSummary] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});