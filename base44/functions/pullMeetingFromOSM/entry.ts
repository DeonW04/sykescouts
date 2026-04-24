import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NO_MEETING_KEYWORDS = ['no meeting', 'no scout', 'cancelled', 'half term'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { osm_evening_id, programme_id } = await req.json();
    if (!osm_evening_id || !programme_id) {
      return Response.json({ error: 'osm_evening_id and programme_id are required' }, { status: 400 });
    }

    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];

    if (!settings?.osm_access_token) {
      return Response.json({ error: 'OSM not connected' }, { status: 400 });
    }

    const { osm_access_token: accessToken, osm_section_id: sectionId, osm_term_id: termId } = settings;

    // Fetch OSM single meeting
    const url = `https://www.onlinescoutmanager.co.uk/ext/programme/?action=getProgramme&eveningid=${osm_evening_id}&sectionid=${sectionId}&termid=${termId}`;
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!res.ok) {
      return Response.json({ error: `OSM returned ${res.status}` }, { status: 500 });
    }

    const data = await res.json();
    const osmMeeting = Array.isArray(data.items) ? data.items[0] : null;

    if (!osmMeeting) {
      return Response.json({ error: 'No meeting found in OSM with that evening ID' }, { status: 404 });
    }

    // Build update payload — only allowed fields
    const update = {};
    const osmTitle = osmMeeting.title || '';
    const titleLower = osmTitle.toLowerCase();
    const isNoMeeting = NO_MEETING_KEYWORDS.some(kw => titleLower.includes(kw));

    if (isNoMeeting) {
      update.no_meeting = true;
      update.no_meeting_reason = osmTitle;
      update.title = 'No Meeting';
    } else {
      update.title = osmTitle;
      update.no_meeting = false;
    }

    update.description = osmMeeting.notesforparents || '';

    if (osmMeeting.starttime && osmMeeting.starttime.trim()) {
      update.optional_start_time = osmMeeting.starttime.trim();
    }
    if (osmMeeting.endtime && osmMeeting.endtime.trim()) {
      update.optional_end_time = osmMeeting.endtime.trim();
    }

    // Fetch programme to check if osm_evening_id already set
    const programmes = await base44.asServiceRole.entities.Programme.filter({ id: programme_id });
    const programme = programmes[0];
    if (!programme) {
      return Response.json({ error: 'Local programme not found' }, { status: 404 });
    }

    if (!programme.osm_evening_id) {
      update.osm_evening_id = String(osmMeeting.eveningid);
    }

    await base44.asServiceRole.entities.Programme.update(programme_id, update);

    return Response.json({ success: true, updated_fields: Object.keys(update) });
  } catch (error) {
    console.error('[pullMeetingFromOSM] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});