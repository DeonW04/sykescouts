import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const award = payload.data;

    if (!award?.member_id || !award?.badge_id || !award?.id) {
      return Response.json({ skipped: 'Missing award data' });
    }

    await base44.asServiceRole.entities.PendingBadgeNotification.create({
      member_id: award.member_id,
      badge_id: award.badge_id,
      award_id: award.id,
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});