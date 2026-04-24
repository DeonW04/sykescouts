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

    const accessToken = settings.osm_access_token;
    const sectionId = settings.osm_section_id;

    if (!sectionId) {
      return Response.json({ error: 'OSM section not configured' }, { status: 400 });
    }

    const url = `https://www.onlinescoutmanager.co.uk/api.php?action=getTerms&sectionid=${sectionId}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      return Response.json({ error: `OSM returned ${res.status}` }, { status: 500 });
    }

    const data = await res.json();

    // Response is an object keyed by sectionid
    const sectionTerms = data[sectionId] || data[String(sectionId)] || [];
    const termsArray = Array.isArray(sectionTerms) ? sectionTerms : Object.values(sectionTerms);

    // Filter out past terms, sort by startdate descending
    const filtered = termsArray
      .filter(t => !t.past)
      .sort((a, b) => new Date(b.startdate) - new Date(a.startdate))
      .map(t => ({
        termid: String(t.termid),
        name: t.name,
        startdate: t.startdate,
        enddate: t.enddate,
      }));

    return Response.json({ terms: filtered });
  } catch (error) {
    console.error('[getOSMTerms] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});