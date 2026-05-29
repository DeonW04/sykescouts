import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const { member_id, new_anchor_date } = await req.json();
  if (!member_id || !new_anchor_date) {
    return Response.json({ error: 'member_id and new_anchor_date required' }, { status: 400 });
  }

  const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
  if (!members.length) return Response.json({ error: 'Member not found' }, { status: 404 });
  const member = members[0];

  if (!member.stripe_subscription_id) {
    return Response.json({ error: 'No active subscription found' }, { status: 400 });
  }

  // Convert YYYY-MM-DD to Unix timestamp at start of day UTC
  const anchorTimestamp = Math.floor(new Date(new_anchor_date + 'T00:00:00Z').getTime() / 1000);
  const nowTimestamp = Math.floor(Date.now() / 1000);
  if (anchorTimestamp <= nowTimestamp) {
    return Response.json({ error: 'New payment date must be in the future' }, { status: 400 });
  }

  await stripe.subscriptions.update(member.stripe_subscription_id, {
    billing_cycle_anchor: anchorTimestamp,
    proration_behavior: 'none',
  });

  await base44.asServiceRole.entities.Member.update(member.id, { next_subs_due: new_anchor_date });

  return Response.json({ success: true });
});