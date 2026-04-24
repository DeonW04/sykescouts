import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const NO_MEETING_KEYWORDS = ['no meeting', 'no scout', 'cancelled', 'half term'];

function mapOSMToFields(osmItem) {
  const osmTitle = osmItem.title || '';
  const titleLower = osmTitle.toLowerCase();
  const isNoMeeting = NO_MEETING_KEYWORDS.some(kw => titleLower.includes(kw));
  const fields = {
    title: isNoMeeting ? 'No Meeting' : osmTitle,
    description: osmItem.notesforparents || '',
    osm_evening_id: String(osmItem.eveningid),
    published: false,
    shown_in_portal: false,
  };
  if (isNoMeeting) { fields.no_meeting = true; fields.no_meeting_reason = osmTitle; }
  if (osmItem.starttime?.trim()) fields.optional_start_time = osmItem.starttime.trim();
  if (osmItem.endtime?.trim()) fields.optional_end_time = osmItem.endtime.trim();
  return fields;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { selections } = await req.json();
    if (!Array.isArray(selections)) {
      return Response.json({ error: 'selections must be an array' }, { status: 400 });
    }

    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];

    if (!settings?.osm_access_token) {
      return Response.json({ error: 'OSM not connected' }, { status: 400 });
    }

    const { osm_access_token: accessToken, osm_section_id: sectionId, osm_term_id: termId, linked_app_term_id: appTermId } = settings;

    // Fetch all sections so we can use their default meeting times as fallback
    const allSections = await base44.asServiceRole.entities.Section.filter({});

    let created = 0, updated = 0, pushed = 0, skipped = 0;
    const failed = [];

    for (const sel of selections) {
      const { action, local_id, osm_evening_id, date, osm_item } = sel;

      if (action === 'skip') { skipped++; continue; }

      if (action === 'use_osm') {
        try {
          if (local_id) {
            // Pull OSM data into local
            const osmMeeting = osm_item || null;
            if (!osmMeeting) {
              // Fetch from OSM
              const url = `https://www.onlinescoutmanager.co.uk/ext/programme/?action=getProgramme&eveningid=${osm_evening_id}&sectionid=${sectionId}&termid=${termId}`;
              const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
              if (!res.ok) throw new Error(`OSM returned ${res.status}`);
              const data = await res.json();
              const meeting = Array.isArray(data.items) ? data.items[0] : null;
              if (!meeting) throw new Error('Meeting not found in OSM');
              const updateFields = mapOSMToFields(meeting);
              const programmes = await base44.asServiceRole.entities.Programme.filter({ id: local_id });
              const prog = programmes[0];
              if (prog && !prog.osm_evening_id) updateFields.osm_evening_id = String(meeting.eveningid);
              await base44.asServiceRole.entities.Programme.update(local_id, updateFields);
            } else {
              const updateFields = mapOSMToFields(osmMeeting);
              const programmes = await base44.asServiceRole.entities.Programme.filter({ id: local_id });
              const prog = programmes[0];
              if (prog && !prog.osm_evening_id) updateFields.osm_evening_id = String(osmMeeting.eveningid);
              await base44.asServiceRole.entities.Programme.update(local_id, updateFields);
            }
            updated++;
          } else {
            // Create new local record from OSM
            if (!osm_item) { failed.push({ date, reason: 'Missing OSM item data for creation' }); continue; }
            const createFields = mapOSMToFields(osm_item);
            createFields.section_id = sel.section_id || '';
            createFields.date = date;
            await base44.asServiceRole.entities.Programme.create(createFields);
            created++;
          }
        } catch (e) {
          failed.push({ date, reason: e.message });
        }
        continue;
      }

      if (action === 'use_app') {
        try {
          if (!osm_evening_id) {
            failed.push({ date, reason: 'Cannot push to OSM — no evening ID. Link this meeting to an OSM meeting first using the meeting detail sync.' });
            continue;
          }
          if (!local_id) { failed.push({ date, reason: 'No local meeting to push' }); continue; }

          const programmes = await base44.asServiceRole.entities.Programme.filter({ id: local_id });
          const programme = programmes[0];
          if (!programme) { failed.push({ date, reason: 'Local programme not found' }); continue; }

          // Fall back to section default times if no override is set on the meeting
          const section = allSections.find(s => s.id === programme.section_id);
          const starttime = programme.optional_start_time || section?.meeting_start_time || '';
          const endtime = programme.optional_end_time || section?.meeting_end_time || '';

          let title = programme.no_meeting ? (programme.no_meeting_reason || 'No Meeting') : (programme.title || '');
          const parts = {
            title,
            notesforparents: programme.description || '',
            starttime,
            endtime,
          };

          const body = new URLSearchParams({ sectionid: sectionId, eveningid: osm_evening_id, parts: JSON.stringify(parts) });
          const res = await fetch('https://www.onlinescoutmanager.co.uk/ext/programme/?action=editEveningParts', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
          });

          if (!res.ok) { const rb = await res.text(); throw new Error(`OSM returned ${res.status}: ${rb.substring(0, 100)}`); }
          pushed++;
        } catch (e) {
          failed.push({ date, reason: e.message });
        }
      }
    }

    return Response.json({ created, updated, pushed, skipped, failed });
  } catch (error) {
    console.error('[bulkSyncProgramme] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});