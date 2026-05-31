import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { osm_section_id_override, osm_term_id_override } = body;

    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];
    if (!settings?.osm_access_token) {
      return Response.json({ error: 'OSM not connected' }, { status: 400 });
    }

    const accessToken = settings.osm_access_token;
    const sectionId   = osm_section_id_override || settings.osm_section_id;
    const termId      = osm_term_id_override     || settings.osm_term_id;

    if (!sectionId || !termId) {
      return Response.json({ error: 'OSM section or term not configured' }, { status: 400 });
    }

    const url = `https://www.onlinescoutmanager.co.uk/ext/programme/?action=getProgrammeSummary&sectionid=${sectionId}&termid=${termId}&verbose=1`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });

    if (!res.ok) {
      const rb = await res.text();
      return Response.json({ error: `OSM returned ${res.status}: ${rb.substring(0, 200)}` }, { status: 500 });
    }

    const data = await res.json();
    return Response.json({ items: data.items || [] });
  } catch (error) {
    console.error('[getOSMProgrammeSummary] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});