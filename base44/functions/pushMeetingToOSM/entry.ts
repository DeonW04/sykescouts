import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

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

    const { osm_access_token: accessToken, osm_section_id: sectionId } = settings;

    // Fetch the local programme record
    const programmes = await base44.asServiceRole.entities.Programme.filter({ id: programme_id });
    const programme = programmes[0];
    if (!programme) {
      return Response.json({ error: 'Programme not found' }, { status: 404 });
    }

    const osmEveningId = programme.osm_evening_id;
    if (!osmEveningId) {
      return Response.json({ error: 'This meeting has no OSM evening ID. Link it to an OSM meeting first.' }, { status: 400 });
    }

    // Build parts
    let title;
    if (programme.no_meeting) {
      title = programme.no_meeting_reason || 'No Meeting';
    } else {
      title = programme.title || '';
    }

    const parts = {
      title,
      notesforparents: programme.description || '',
      starttime: programme.optional_start_time || '',
      endtime: programme.optional_end_time || '',
    };

    const body = new URLSearchParams({
      sectionid: sectionId,
      eveningid: osmEveningId,
      parts: JSON.stringify(parts),
    });

    const res = await fetch('https://www.onlinescoutmanager.co.uk/ext/programme/?action=editEveningParts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const responseBody = await res.text();
      return Response.json({ error: `OSM returned ${res.status}: ${responseBody.substring(0, 300)}` }, { status: 500 });
    }

    const data = await res.json();
    return Response.json({ success: true, data });
  } catch (error) {
    console.error('[pushMeetingToOSM] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});