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

  const { member_id } = await req.json();
  if (!member_id) return Response.json({ error: 'member_id required' }, { status: 400 });

  const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
  if (!members.length) return Response.json({ error: 'Member not found' }, { status: 404 });
  const member = members[0];

  // Ensure Stripe customer exists
  const customerRes = await base44.asServiceRole.functions.invoke('createStripeCustomer', { member_id });
  const customer_id = customerRes.customer_id;

  const interval = member.subs_interval || '4_months';
  const intervalConfig = INTERVAL_MAP[interval] || INTERVAL_MAP['4_months'];

  const subscription = await stripe.subscriptions.create({
    customer: customer_id,
    items: [{
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
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
    metadata: { member_id }
  });

  await base44.asServiceRole.entities.Member.update(member.id, {
    stripe_subscription_id: subscription.id
  });

  return Response.json({ subscription_id: subscription.id });
});