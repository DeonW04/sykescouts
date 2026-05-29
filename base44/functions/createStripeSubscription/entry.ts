import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const INTERVAL_MAP = {
  '4_months': { interval: 'month', interval_count: 4 },
  '6_months': { interval: 'month', interval_count: 6 },
  'yearly':   { interval: 'year',  interval_count: 1 },
};

// Per-interval env var names — add these to platform secrets after first run to avoid
// creating duplicate Stripe products/prices on every activation.
// e.g. SUBS_PRICE_ID_4M=price_xxx, SUBS_PRICE_ID_6M=price_xxx, SUBS_PRICE_ID_YEARLY=price_xxx
const PRICE_ID_ENV = {
  '4_months': 'SUBS_PRICE_ID_4M',
  '6_months': 'SUBS_PRICE_ID_6M',
  'yearly':   'SUBS_PRICE_ID_YEARLY',
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

  // Ensure Stripe customer exists (inline — avoids cross-function auth issue)
  let customer_id = member.stripe_customer_id;
  if (!customer_id) {
    const customer = await stripe.customers.create({
      name: member.full_name || `${member.first_name} ${member.surname}`,
      email: member.parent_one_email || undefined,
      metadata: { member_id: member.id },
    });
    customer_id = customer.id;
    await base44.asServiceRole.entities.Member.update(member.id, { stripe_customer_id: customer_id });
  }

  if (!customer_id) {
    return Response.json({ error: 'Could not create or retrieve Stripe customer' }, { status: 500 });
  }

  const intervalKey = member.subs_interval || '4_months';
  const intervalConfig = INTERVAL_MAP[intervalKey] || INTERVAL_MAP['4_months'];

  // Use a pre-created price ID if available (avoids duplicates across activations)
  let priceId = Deno.env.get(PRICE_ID_ENV[intervalKey]);

  if (!priceId) {
    // First time for this interval — create product + price once.
    // IMPORTANT: After this runs, copy the logged price ID into platform secrets as
    // SUBS_PRICE_ID_4M / SUBS_PRICE_ID_6M / SUBS_PRICE_ID_YEARLY so it is reused in future.
    const product = await stripe.products.create({
      name: 'Scout Group Membership Subscription',
    });
    const price = await stripe.prices.create({
      unit_amount: subsAmountPence,
      currency: 'gbp',
      recurring: {
        interval: intervalConfig.interval,
        interval_count: intervalConfig.interval_count,
      },
      product: product.id,
    });
    priceId = price.id;
    console.log(`[createStripeSubscription] Created Stripe price for ${intervalKey}: ${priceId}. Save as ${PRICE_ID_ENV[intervalKey]} in platform secrets.`);
  }

  const subscription = await stripe.subscriptions.create({
    customer: customer_id,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    expand: ['latest_invoice.payment_intent'],
    metadata: { member_id },
  });

  await base44.asServiceRole.entities.Member.update(member.id, {
    stripe_subscription_id: subscription.id,
  });

  return Response.json({ subscription_id: subscription.id });
});