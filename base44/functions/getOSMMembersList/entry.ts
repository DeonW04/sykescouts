import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const settingsList = await base44.asServiceRole.entities.OSMSyncSettings.list();
  const settings = settingsList[0];
  if (!settings?.osm_access_token) {
    return Response.json({ error: 'OSM is not connected. Please connect OSM in Admin Settings first.' }, { status: 400 });
  }

  const { osm_access_token, osm_section_id, osm_section, osm_term_id } = settings;
  if (!osm_section_id || !osm_term_id) {
    return Response.json({ error: 'OSM section or term not configured. Please set up OSM sync in Admin Settings.' }, { status: 400 });
  }

  const url = `https://www.onlinescoutmanager.co.uk/ext/members/contact/?action=getListOfMembers&sort=dob&sectionid=${osm_section_id}&termid=${osm_term_id}&section=${osm_section || 'scouts'}&access_token=${osm_access_token}`;

  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${osm_access_token}` }
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    console.error(`OSM getListOfMembers HTTP ${resp.status}:`, body);
    return Response.json({ error: `OSM API returned ${resp.status}. Your token may have expired — reconnect OSM in Admin Settings.` }, { status: 500 });
  }

  let osmData;
  try {
    osmData = await resp.json();
  } catch (e) {
    return Response.json({ error: 'OSM returned non-JSON response. Try reconnecting OSM in Admin Settings.' }, { status: 500 });
  }

  console.log('OSM getListOfMembers raw keys:', Object.keys(osmData));
  console.log('OSM ok:', osmData.ok, 'status:', osmData.status, 'data type:', typeof osmData.data);

  // Only treat as error if OSM explicitly signals failure
  if (osmData.ok === false || osmData.status === false) {
    console.error('OSM returned failure response:', JSON.stringify(osmData).slice(0, 300));
    return Response.json({ error: 'OSM returned an error. Check your connection in Admin Settings.' }, { status: 500 });
  }

  // Normalise member list — OSM can return: array, { "0": {...}, "1": {...} }, or a single member object
  let osmMembers = [];
  if (Array.isArray(osmData.data)) {
    osmMembers = osmData.data;
  } else if (osmData.data && typeof osmData.data === 'object') {
    const vals = Object.values(osmData.data);
    // If every value is an object with a scoutid it's a member map; if vals[0] has scoutid treat as list
    if (vals.length > 0 && typeof vals[0] === 'object' && vals[0] !== null && (vals[0].scoutid || vals[0].firstname)) {
      osmMembers = vals;
    } else if (osmData.data.scoutid) {
      // Single member returned directly in data
      osmMembers = [osmData.data];
    }
  }

  console.log(`OSM members found: ${osmMembers.length}`);

  // Filter out members already in our system (matched by osm_scoutid)
  const existing = await base44.asServiceRole.entities.Member.filter({ active: true });
  const existingOsmIds = new Set(existing.map(m => m.osm_scoutid).filter(Boolean).map(String));

  const newMembers = osmMembers.filter(m => m && m.scoutid && !existingOsmIds.has(String(m.scoutid)));

  return Response.json({
    success: true,
    members: newMembers,
    section: osm_section,
    section_id: osm_section_id,
    term_id: osm_term_id,
    total_osm: osmMembers.length,
    already_imported: osmMembers.length - newMembers.length,
  });
});