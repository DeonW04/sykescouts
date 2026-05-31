import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { programme_id } = await req.json();
    if (!programme_id) {
      return Response.json({ error: 'programme_id is required' }, { status: 400 });
    }

    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];
    if (!settings?.osm_access_token) {
      return Response.json({ error: 'OSM not connected' }, { status: 400 });
    }
    const accessToken = settings.osm_access_token;

    const programmes = await base44.asServiceRole.entities.Programme.filter({ id: programme_id });
    const programme = programmes[0];
    if (!programme) {
      return Response.json({ error: 'Programme not found' }, { status: 404 });
    }

    const osmEveningId = programme.osm_evening_id;
    if (!osmEveningId) {
      return Response.json({ error: 'This meeting has no OSM evening ID. Link it to an OSM meeting first.' }, { status: 400 });
    }

    // Look up the programme's section to get its specific osm_section_id
    const sections = await base44.asServiceRole.entities.Section.filter({ id: programme.section_id });
    const section = sections[0];

    // Prefer the section's own osm_section_id, fall back to global settings
    const sectionId = section?.osm_section_id || settings.osm_section_id;
    if (!sectionId) {
      return Response.json({ error: 'No OSM section ID configured for this section' }, { status: 400 });
    }

    const starttime = programme.optional_start_time || section?.meeting_start_time || '';
    const endtime   = programme.optional_end_time   || section?.meeting_end_time   || '';
    const title = programme.no_meeting
      ? (programme.no_meeting_reason || 'No Meeting')
      : (programme.title || '');

    const parts = { title, notesforparents: programme.description || '', starttime, endtime };

    const body = new URLSearchParams({
      sectionid: sectionId,
      eveningid: osmEveningId,
      parts: JSON.stringify(parts),
    });

    const res = await fetch('https://www.onlinescoutmanager.co.uk/ext/programme/?action=editEveningParts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      const rb = await res.text();
      return Response.json({ error: `OSM returned ${res.status}: ${rb.substring(0, 300)}` }, { status: 500 });
    }

    const data = await res.json();
    return Response.json({ success: true, data });
  } catch (error) {
    console.error('[pushMeetingToOSM] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});