import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const apiid = Deno.env.get('OSM_API_ID');
    const token = Deno.env.get('OSM_TOKEN');
    if (!apiid || !token) {
      return Response.json({ error: 'OSM_API_ID and OSM_TOKEN secrets not configured.' }, { status: 500 });
    }

    // Fetch OSM settings (credentials stored in DB)
    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const config = settingsArr[0];
    if (!config || !config.osm_section_id) {
      return Response.json({ error: 'OSM section not configured. Please set OSM Section ID in Admin Settings → OSM Badge Sync.' }, { status: 500 });
    }
    if (!config.osm_userid || !config.osm_secret) {
      return Response.json({ error: 'OSM account not connected. Please connect in Admin Settings → OSM Badge Sync.' }, { status: 500 });
    }

    const sectionId = config.osm_section_id;
    const authBody = `apiid=${encodeURIComponent(apiid)}&token=${encodeURIComponent(token)}&userid=${encodeURIComponent(config.osm_userid)}&secret=${encodeURIComponent(config.osm_secret)}`;

    // Try with termid=0 first
    const tryFetch = async (termid) => {
      const url = `https://www.onlinescoutmanager.co.uk/ext/members/contact/?action=getListOfMembers&sectionid=${sectionId}&termid=${termid}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: authBody,
      });
      if (!res.ok) return null;
      const data = await res.json();
      return data;
    };

    let data = await tryFetch(0);

    // If no items, get current term and retry
    const hasItems = data && Array.isArray(data.items) && data.items.length > 0;
    if (!hasItems) {
      const termsRes = await fetch('https://www.onlinescoutmanager.co.uk/api.php?action=getTerms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: authBody,
      });
      if (termsRes.ok) {
        const termsData = await termsRes.json();
        // termsData is object keyed by sectionid
        const sectionTerms = termsData[String(sectionId)] || [];
        const currentTerm = sectionTerms.find(t => !t.past);
        if (currentTerm) {
          data = await tryFetch(currentTerm.termid);
        }
      }
    }

    if (!data || !Array.isArray(data.items)) {
      return Response.json({ error: 'No members returned from OSM. Check your section ID and credentials.' }, { status: 500 });
    }

    const members = data.items
      .filter(m => m.active)
      .map(m => ({
        scoutid: m.scoutid,
        firstname: m.firstname,
        lastname: m.lastname,
        display: `${m.firstname} ${m.lastname} (${m.scoutid})`,
      }));

    return Response.json({ members });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});