import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const NO_MEETING_KEYWORDS = ['no meeting', 'no scout', 'cancelled', 'half term'];

function mapOSMToFields(osmMeeting) {
  const osmTitle = osmMeeting.title || '';
  const isNoMeeting = NO_MEETING_KEYWORDS.some(kw => osmTitle.toLowerCase().includes(kw));
  const fields = {
    title: isNoMeeting ? 'No Meeting' : osmTitle,
    description: osmMeeting.notesforparents || '',
    osm_evening_id: String(osmMeeting.eveningid),
    published: true,
    shown_in_portal: true,
  };
  if (isNoMeeting) {
    fields.no_meeting = true;
    fields.no_meeting_reason = osmTitle;
  } else {
    fields.no_meeting = false;
  }
  if (osmMeeting.starttime?.trim()) fields.optional_start_time = osmMeeting.starttime.trim();
  if (osmMeeting.endtime?.trim()) fields.optional_end_time = osmMeeting.endtime.trim();
  return fields;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { selections, osm_section_id_override, osm_term_id_override } = await req.json();
    if (!Array.isArray(selections)) {
      return Response.json({ error: 'selections must be an array' }, { status: 400 });
    }

    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];
    if (!settings?.osm_access_token) {
      return Response.json({ error: 'OSM not connected' }, { status: 400 });
    }

    const accessToken = settings.osm_access_token;
    const sectionId   = osm_section_id_override || settings.osm_section_id;
    const termId      = osm_term_id_override     || settings.osm_term_id;

    const allSections = await base44.asServiceRole.entities.Section.filter({});

    // Helper: fetch full meeting detail from OSM
    const fetchOSMMeeting = async (eveningid) => {
      const url = `https://www.onlinescoutmanager.co.uk/ext/programme/?action=getProgramme&eveningid=${eveningid}&sectionid=${sectionId}&termid=${termId}`;
      const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });
      if (!res.ok) throw new Error(`OSM returned ${res.status} for eveningid ${eveningid}`);
      const data = await res.json();
      const meeting = Array.isArray(data.items) ? data.items[0] : null;
      if (!meeting) throw new Error(`No meeting found in OSM for eveningid ${eveningid}`);
      return meeting;
    };

    let created = 0, updated = 0, pushed = 0, skipped = 0;
    const failed = [];

    for (const sel of selections) {
      const { action, local_id, osm_evening_id, date, section_id } = sel;

      if (action === 'skip') { skipped++; continue; }

      if (action === 'use_osm') {
        if (!osm_evening_id) {
          failed.push({ date, reason: 'No OSM evening ID available for this meeting — cannot pull from OSM.' });
          continue;
        }
        try {
          // Always fetch full details so we get title, notesforparents, starttime, endtime
          const osmMeeting = await fetchOSMMeeting(osm_evening_id);
          const updateFields = mapOSMToFields(osmMeeting);

          if (local_id) {
            await base44.asServiceRole.entities.Programme.update(local_id, updateFields);
            updated++;
          } else {
            // Create new meeting — needs section_id and date
            const appSectionId = section_id || '';
            await base44.asServiceRole.entities.Programme.create({
              ...updateFields,
              section_id: appSectionId,
              date,
            });
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
            failed.push({ date, reason: 'Cannot push to OSM — no evening ID. Link this meeting to an OSM meeting first.' });
            continue;
          }
          if (!local_id) { failed.push({ date, reason: 'No local meeting to push' }); continue; }

          const programmes = await base44.asServiceRole.entities.Programme.filter({ id: local_id });
          const programme = programmes[0];
          if (!programme) { failed.push({ date, reason: 'Local programme not found' }); continue; }

          const section = allSections.find(s => s.id === programme.section_id);
          const effectiveSectionId = section?.osm_section_id || sectionId;
          const starttime = programme.optional_start_time || section?.meeting_start_time || '';
          const endtime   = programme.optional_end_time   || section?.meeting_end_time   || '';
          const title = programme.no_meeting ? (programme.no_meeting_reason || 'No Meeting') : (programme.title || '');

          const parts = { title, notesforparents: programme.description || '', starttime, endtime };
          const body = new URLSearchParams({ sectionid: effectiveSectionId, eveningid: osm_evening_id, parts: JSON.stringify(parts) });
          const res = await fetch('https://www.onlinescoutmanager.co.uk/ext/programme/?action=editEveningParts', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: body.toString(),
          });

          if (!res.ok) { const rb = await res.text(); throw new Error(`OSM returned ${res.status}: ${rb.substring(0, 100)}`); }

          if (!programme.osm_evening_id) {
            await base44.asServiceRole.entities.Programme.update(local_id, { osm_evening_id: String(osm_evening_id) });
          }
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