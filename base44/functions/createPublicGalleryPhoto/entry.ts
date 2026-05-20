import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { file_url, meeting_id, event_id, caption } = await req.json();

    if (!file_url) return Response.json({ error: 'Missing file_url' }, { status: 400 });
    if (!meeting_id && !event_id) return Response.json({ error: 'Missing meeting_id or event_id' }, { status: 400 });

    const photoData = {
      file_url,
      caption: caption || '',
      visible_to: 'parents',
      is_public: false,
      ...(meeting_id && { programme_id: meeting_id }),
      ...(event_id && { event_id }),
    };

    const photo = await base44.asServiceRole.entities.EventPhoto.create(photoData);
    return Response.json({ success: true, photo });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
});