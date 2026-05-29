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

async function getOrCreatePriceId(stripe, base44, sectionId, interval, fallbackAmountPence) {
  const configs = await base44.asServiceRole.entities.SectionSubsConfig.filter({ section_id: sectionId });
  const config = configs[0];
  const priceField = PRICE_ID_FIELD[interval];

  if (config?.[priceField]) {
    return { priceId: config[priceField], amountPence: config.price_pence || fallbackAmountPence };
  }

  const amountPence = config?.price_pence || fallbackAmountPence;
  if (!amountPence) throw new Error('No subscription price configured for this section. Set up SectionSubsConfig in Admin Settings or set SUBS_AMOUNT_PENCE.');

  const displayName = config?.display_name || 'Scout Group Membership Subscription';
  const intervalConfig = INTERVAL_MAP[interval];

  console.log(`Creating new Stripe product/price for section ${sectionId} interval ${interval} at ${amountPence}p`);
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
  console.log(`Stripe price ${price.id} saved to SectionSubsConfig for section ${sectionId} interval ${interval}`);
  return { priceId: price.id, amountPence };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const fallbackAmountPence = parseInt(Deno.env.get('SUBS_AMOUNT_PENCE') || '1500', 10);

  const { member_id } = await req.json();
  if (!member_id) return Response.json({ error: 'member_id required' }, { status: 400 });

  const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
  if (!members.length) return Response.json({ error: 'Member not found' }, { status: 404 });
  const member = members[0];

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

  const interval = member.subs_interval || '4_months';
  const sectionId = member.section_id;

  const { priceId } = await getOrCreatePriceId(stripe, base44, sectionId, interval, fallbackAmountPence);

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