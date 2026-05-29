import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const { member_id, amount, event_id, meeting_id } = await req.json();

  if (!member_id || !amount) return Response.json({ error: 'member_id and amount required' }, { status: 400 });

  // Idempotency: check if already paid
  if (event_id) {
    const existing = await base44.asServiceRole.entities.EventPaymentStatus.filter({ event_id, member_id, status: 'paid' });
    if (existing.length) return Response.json({ error: 'Already paid' }, { status: 400 });
  }
  if (meeting_id) {
    const existing = await base44.asServiceRole.entities.MeetingPaymentStatus.filter({ meeting_id, member_id, status: 'paid' });
    if (existing.length) return Response.json({ error: 'Already paid' }, { status: 400 });
  }

  // Fetch member directly — avoids cross-function auth issue with createStripeCustomer
  const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
  if (!members.length) return Response.json({ error: 'Member not found' }, { status: 404 });
  const member = members[0];

  // Ensure Stripe customer exists on the member
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

  const metadata = { member_id };
  if (event_id) metadata.event_id = event_id;
  if (meeting_id) metadata.meeting_id = meeting_id;

  // customer must always be set so that saved payment methods (which belong to a customer) can be used
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount),
    currency: 'gbp',
    customer: customer_id,
    payment_method_types: ['card'],
    metadata,
  });

  return Response.json({ client_secret: paymentIntent.client_secret, payment_intent_id: paymentIntent.id });
});