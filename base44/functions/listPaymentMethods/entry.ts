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

  if (!member.stripe_customer_id) return Response.json({ payment_methods: [] });

  const customer = await stripe.customers.retrieve(member.stripe_customer_id);
  const defaultPmId = customer.invoice_settings?.default_payment_method;

  const pmList = await stripe.paymentMethods.list({ customer: member.stripe_customer_id, type: 'card' });

  const payment_methods = pmList.data.map(pm => ({
    pm_id: pm.id,
    brand: pm.card.brand,
    last4: pm.card.last4,
    exp_month: pm.card.exp_month,
    exp_year: pm.card.exp_year,
    is_default: pm.id === defaultPmId
  }));

  await base44.asServiceRole.entities.Member.update(member.id, { stripe_payment_methods: payment_methods });

  return Response.json({ payment_methods });
});