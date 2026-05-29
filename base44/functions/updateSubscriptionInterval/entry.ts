import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

  const body = await req.json();
  const member_id = body.member_id;
  // Accept both param names — frontend sends 'interval', some callers use 'new_interval'
  const new_interval = body.interval || body.new_interval;

  if (!member_id || !new_interval) {
    return Response.json({ error: 'member_id and interval required' }, { status: 400 });
  }

  // Use configured Stripe price IDs for each interval
  const PRICE_IDS = {
    '4_months': Deno.env.get('SUBS_PRICE_ID_4M'),
    '6_months': Deno.env.get('SUBS_PRICE_ID_6M'),
    'yearly':   Deno.env.get('SUBS_PRICE_ID_YEARLY'),
  };

  const newPriceId = PRICE_IDS[new_interval];
  if (!newPriceId) {
    return Response.json({
      error: `Price ID not configured for interval "${new_interval}". Set SUBS_PRICE_ID_4M, SUBS_PRICE_ID_6M, SUBS_PRICE_ID_YEARLY secrets.`
    }, { status: 400 });
  }

  // Look up member directly — do NOT invoke another function
  const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
  if (!members.length) return Response.json({ error: 'Member not found' }, { status: 404 });
  const member = members[0];

  if (!member.stripe_subscription_id) {
    return Response.json({ error: 'No active subscription found' }, { status: 400 });
  }

  const subscription = await stripe.subscriptions.retrieve(member.stripe_subscription_id);
  const itemId = subscription.items.data[0].id;

  // Replace subscription item with new price ID — price_data is not valid for interval changes
  await stripe.subscriptions.update(member.stripe_subscription_id, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: 'none',
  });

  await base44.asServiceRole.entities.Member.update(member.id, { subs_interval: new_interval });

  return Response.json({ success: true });
});