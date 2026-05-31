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

  const body = await req.json().catch(() => ({}));
  const { osm_section_id_override, osm_section_type_override, osm_term_id_override } = body;
  const { osm_access_token } = settings;
  const osm_section_id = osm_section_id_override || settings.osm_section_id;
  const osm_section   = osm_section_type_override || settings.osm_section;
  const osm_term_id   = osm_term_id_override       || settings.osm_term_id;
  if (!osm_section_id || !osm_term_id) {
    return Response.json({ error: 'OSM section or term not configured. Please set up OSM sync in Admin Settings.' }, { status: 400 });
  }

  const url = `https://www.onlinescoutmanager.co.uk/ext/members/contact/?action=getListOfMembers&sort=dob&sectionid=${osm_section_id}&termid=${osm_term_id}&section=${osm_section || 'scouts'}`;

  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${osm_access_token}` }
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => '');
    console.error(`OSM getListOfMembers HTTP ${resp.status}:`, body.slice(0, 300));
    return Response.json({ error: `OSM API returned ${resp.status}. Your token may have expired — reconnect OSM in Admin Settings.` }, { status: 500 });
  }

  let osmData;
  try {
    osmData = await resp.json();
  } catch (e) {
    return Response.json({ error: 'OSM returned non-JSON response.' }, { status: 500 });
  }

  console.log('OSM response keys:', Object.keys(osmData));

  // OSM getListOfMembers returns { identifier, photos, items: [...] }
  // Normalise: try items first, then data (array/map), then data.items
  let osmMembers = [];
  if (Array.isArray(osmData.items)) {
    osmMembers = osmData.items;
  } else if (Array.isArray(osmData.data)) {
    osmMembers = osmData.data;
  } else if (osmData.data && typeof osmData.data === 'object') {
    if (Array.isArray(osmData.data.items)) {
      osmMembers = osmData.data.items;
    } else if (osmData.data.scoutid) {
      osmMembers = [osmData.data];
    } else {
      const vals = Object.values(osmData.data).filter(v => v && typeof v === 'object' && (v.scoutid || v.firstname));
      if (vals.length > 0) osmMembers = vals;
    }
  }

  console.log(`OSM members found: ${osmMembers.length}`);

  // Filter out members already in our system (matched by osm_scoutid)
  const existing = await base44.asServiceRole.entities.Member.filter({ active: true });
  const existingOsmIds = new Set(existing.map(m => m.osm_scoutid).filter(Boolean).map(String));

  const newMembers = osmMembers.filter(m => m && m.scoutid && !existingOsmIds.has(String(m.scoutid)));

  console.log(`New members to import: ${newMembers.length}, already imported: ${osmMembers.length - newMembers.length}`);

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