import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const { member_id } = await req.json();
  if (!member_id) return Response.json({ error: 'member_id required' }, { status: 400 });

  // Look up member directly — do NOT invoke createStripeCustomer via service role,
  // as that call arrives without a user token and fails auth inside the target function.
  const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
  if (!members.length) return Response.json({ error: 'Member not found' }, { status: 404 });
  const member = members[0];

  // Ensure a Stripe customer exists for this member
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

  const setupIntent = await stripe.setupIntents.create({
    customer: customer_id,
    payment_method_types: ['card'],
    usage: 'off_session',
  });

  return Response.json({ client_secret: setupIntent.client_secret });
});