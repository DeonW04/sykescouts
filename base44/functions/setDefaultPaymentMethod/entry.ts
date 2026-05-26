import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const { member_id, pm_id } = await req.json();
  if (!member_id || !pm_id) return Response.json({ error: 'member_id and pm_id required' }, { status: 400 });

  const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
  if (!members.length) return Response.json({ error: 'Member not found' }, { status: 404 });
  const member = members[0];

  if (!member.stripe_customer_id) return Response.json({ error: 'No Stripe customer found' }, { status: 400 });

  await stripe.customers.update(member.stripe_customer_id, {
    invoice_settings: { default_payment_method: pm_id }
  });

  const updated = (member.stripe_payment_methods || []).map(pm => ({
    ...pm,
    is_default: pm.pm_id === pm_id
  }));

  await base44.asServiceRole.entities.Member.update(member.id, { stripe_payment_methods: updated });

  return Response.json({ success: true });
});