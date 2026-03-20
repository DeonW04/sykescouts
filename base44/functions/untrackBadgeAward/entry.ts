import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const award = payload.data;
    const awardId = payload.event?.entity_id;

    if (!awardId) {
      return Response.json({ skipped: 'No award ID' });
    }

    // Find and delete any pending notification for this award
    const existing = await base44.asServiceRole.entities.PendingBadgeNotification.filter({ award_id: awardId });
    for (const record of existing) {
      await base44.asServiceRole.entities.PendingBadgeNotification.delete(record.id);
    }

    return Response.json({ success: true, removed: existing.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});