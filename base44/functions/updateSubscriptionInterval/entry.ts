import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

const INTERVAL_MAP = {
  '4_months': { interval: 'month', interval_count: 4 },
  '6_months': { interval: 'month', interval_count: 6 },
  'yearly':   { interval: 'year',  interval_count: 1 },
};
const PRICE_ID_FIELD = {
  '4_months': 'stripe_price_id_4m',
  '6_months': 'stripe_price_id_6m',
  'yearly':   'stripe_price_id_yearly',
};

async function getOrCreatePriceId(stripe, base44, sectionId, interval) {
  const fallbackAmountPence = parseInt(Deno.env.get('SUBS_AMOUNT_PENCE') || '1500', 10);
  const configs = await base44.asServiceRole.entities.SectionSubsConfig.filter({ section_id: sectionId });
  const config = configs[0];
  const priceField = PRICE_ID_FIELD[interval];

  if (config?.[priceField]) return config[priceField];

  const amountPence = config?.price_pence || fallbackAmountPence;
  if (!amountPence) throw new Error('No subscription price configured for this section.');

  const displayName = config?.display_name || 'Scout Group Membership Subscription';
  const intervalConfig = INTERVAL_MAP[interval];

  console.log(`Creating Stripe product/price for section ${sectionId} interval ${interval}`);
  const product = await stripe.products.create({ name: displayName });
  const price = await stripe.prices.create({
    unit_amount: amountPence,
    currency: 'gbp',
    recurring: { interval: intervalConfig.interval, interval_count: intervalConfig.interval_count },
    product: product.id,
  });

  const updateData = { [priceField]: price.id };
  if (config) {
    await base44.asServiceRole.entities.SectionSubsConfig.update(config.id, updateData);
  } else {
    await base44.asServiceRole.entities.SectionSubsConfig.create({
      section_id: sectionId,
      price_pence: amountPence,
      display_name: displayName,
      ...updateData,
    });
  }
  console.log(`Stripe price ${price.id} saved to SectionSubsConfig for interval ${interval}`);
  return price.id;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const body = await req.json();
  const member_id = body.member_id;
  const new_interval = body.interval || body.new_interval;

  if (!member_id || !new_interval) {
    return Response.json({ error: 'member_id and interval required' }, { status: 400 });
  }
  if (!INTERVAL_MAP[new_interval]) {
    return Response.json({ error: `Invalid interval "${new_interval}". Must be 4_months, 6_months, or yearly.` }, { status: 400 });
  }

  const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
  if (!members.length) return Response.json({ error: 'Member not found' }, { status: 404 });
  const member = members[0];

  if (!member.stripe_subscription_id) {
    return Response.json({ error: 'No active subscription found' }, { status: 400 });
  }

  const newPriceId = await getOrCreatePriceId(stripe, base44, member.section_id, new_interval);

  const subscription = await stripe.subscriptions.retrieve(member.stripe_subscription_id);
  const itemId = subscription.items.data[0].id;

  await stripe.subscriptions.update(member.stripe_subscription_id, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: 'none',
  });

  await base44.asServiceRole.entities.Member.update(member.id, { subs_interval: new_interval });

  return Response.json({ success: true });
});