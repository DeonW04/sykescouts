import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const { member_id } = await req.json();
  if (!member_id) return Response.json({ error: 'member_id required' }, { status: 400 });

  const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
  if (!members.length) return Response.json({ error: 'Member not found' }, { status: 404 });
  const member = members[0];

  if (!member.stripe_subscription_id) return Response.json({ error: 'No active subscription found' }, { status: 400 });

  await stripe.subscriptions.update(member.stripe_subscription_id, {
    cancel_at_period_end: true
  });

  await base44.asServiceRole.entities.Member.update(member.id, {
    stripe_subscription_id: null
  });

  return Response.json({ success: true });
});