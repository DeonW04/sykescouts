import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { eveningid } = await req.json();
    if (!eveningid) {
      return Response.json({ error: 'eveningid is required' }, { status: 400 });
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

    const url = `https://www.onlinescoutmanager.co.uk/ext/programme/?action=getProgramme&eveningid=${eveningid}&sectionid=${sectionId}&termid=${termId}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      const body = await res.text();
      return Response.json({ meeting: null, error: `OSM returned ${res.status}: ${body.substring(0, 200)}` }, { status: 500 });
    }

    const data = await res.json();
    const meeting = Array.isArray(data.items) ? data.items[0] : null;

    return Response.json({ meeting });
  } catch (error) {
    console.error('[getOSMSingleMeeting] error:', error.message);
    return Response.json({ meeting: null, error: error.message }, { status: 500 });
  }
});