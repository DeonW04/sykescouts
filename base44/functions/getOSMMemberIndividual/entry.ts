import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { scoutid } = body;
  if (!scoutid) return Response.json({ error: 'scoutid is required' }, { status: 400 });

  const settingsList = await base44.asServiceRole.entities.OSMSyncSettings.list();
  const settings = settingsList[0];
  if (!settings?.osm_access_token) {
    return Response.json({ error: 'OSM not connected' }, { status: 400 });
  }

  const { osm_access_token, osm_section_id, osm_term_id } = settings;

  const url = `https://www.onlinescoutmanager.co.uk/ext/members/contact/?action=getIndividual&sectionid=${osm_section_id}&scoutid=${scoutid}&termid=${osm_term_id}&context=members`;

  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${osm_access_token}` }
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    console.error(`OSM getIndividual HTTP ${resp.status}:`, text.slice(0, 200));
    return Response.json({ error: `OSM API error: ${resp.status}` }, { status: 500 });
  }

  let osmData;
  try {
    osmData = await resp.json();
  } catch (e) {
    return Response.json({ error: 'OSM returned non-JSON for individual member.' }, { status: 500 });
  }

  if (!osmData.ok || !osmData.data) {
    console.error('OSM getIndividual unexpected response:', JSON.stringify(osmData).slice(0, 200));
    return Response.json({ error: 'OSM getIndividual returned unexpected response.' }, { status: 500 });
  }

  const d = osmData.data;
  console.log(`getIndividual for scoutid ${scoutid}: dob=${d.dob}, startedsection=${d.startedsection}, started=${d.started}`);

  return Response.json({
    success: true,
    scoutid:        d.scoutid,
    dob:            d.dob            || null,
    started:        d.started        || null,
    startedsection: d.startedsection || null,
    firstname:      d.firstname      || null,
    lastname:       d.lastname       || null,
  });
});