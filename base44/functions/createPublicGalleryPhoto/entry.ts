import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized — please sign in to upload photos' }, { status: 401 });

    const { file_url, meeting_id, event_id, caption } = await req.json();

    if (!file_url) return Response.json({ error: 'Missing file_url' }, { status: 400 });
    if (!meeting_id && !event_id) return Response.json({ error: 'Missing meeting_id or event_id' }, { status: 400 });

    // Look up the section_id from the meeting or event
    let section_id = 'all';
    if (meeting_id) {
      const meetings = await base44.asServiceRole.entities.Programme.filter({ id: meeting_id });
      if (meetings[0]?.section_id) section_id = meetings[0].section_id;
    } else if (event_id) {
      const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
      if (events[0]?.section_ids?.[0]) section_id = events[0].section_ids[0];
    }

    const photo = await base44.asServiceRole.entities.EventPhoto.create({
      file_url,
      caption: caption || '',
      visible_to: 'parents',
      is_public: false,
      approval_status: 'pending',
      uploaded_by: user.id,
      section_id,
      ...(meeting_id && { programme_id: meeting_id }),
      ...(event_id && { event_id }),
    });

    return Response.json({ success: true, photo });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});