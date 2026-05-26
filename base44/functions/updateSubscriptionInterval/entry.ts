import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const INTERVAL_MAP = {
  '4_months':  { interval: 'month', interval_count: 4 },
  '6_months':  { interval: 'month', interval_count: 6 },
  'yearly':    { interval: 'year',  interval_count: 1 }
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const subsAmountPence = parseInt(Deno.env.get('SUBS_AMOUNT_PENCE') || '1500', 10);

  const { member_id, new_interval } = await req.json();
  if (!member_id || !new_interval) return Response.json({ error: 'member_id and new_interval required' }, { status: 400 });
  if (!INTERVAL_MAP[new_interval]) return Response.json({ error: 'Invalid interval' }, { status: 400 });

  const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
  if (!members.length) return Response.json({ error: 'Member not found' }, { status: 404 });
  const member = members[0];

  if (!member.stripe_subscription_id) return Response.json({ error: 'No active subscription found' }, { status: 400 });

  const intervalConfig = INTERVAL_MAP[new_interval];

  const subscription = await stripe.subscriptions.retrieve(member.stripe_subscription_id);
  const itemId = subscription.items.data[0].id;

  await stripe.subscriptions.update(member.stripe_subscription_id, {
    items: [{
      id: itemId,
      price_data: {
        currency: 'gbp',
        product_data: { name: 'Scout Membership Subscription' },
        unit_amount: subsAmountPence,
        recurring: {
          interval: intervalConfig.interval,
          interval_count: intervalConfig.interval_count
        }
      }
    }],
    proration_behavior: 'none'
  });

  await base44.asServiceRole.entities.Member.update(member.id, { subs_interval: new_interval });

  return Response.json({ success: true });
});