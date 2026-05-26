import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * checkPaymentOverride
 * Accepts: member_id + (event_id or meeting_id)
 * Returns: { waived: boolean, override: object|null }
 *
 * If a MeetingPaymentOverride record exists for this member/event/meeting
 * with override_type = 'waived', returns { waived: true, override: {...} }.
 * Used in Stage 3 to determine whether to show a Pay button or a Waived badge.
 */
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { member_id, event_id, meeting_id } = await req.json();

  if (!member_id || (!event_id && !meeting_id)) {
    return Response.json({ error: 'member_id and either event_id or meeting_id are required' }, { status: 400 });
  }

  const filter = { member_id, override_type: 'waived' };
  if (event_id) filter.event_id = event_id;
  if (meeting_id) filter.programme_id = meeting_id;

  const overrides = await base44.asServiceRole.entities.MeetingPaymentOverride.filter(filter);

  if (overrides.length > 0) {
    return Response.json({ waived: true, override: overrides[0] });
  }

  return Response.json({ waived: false, override: null });
});