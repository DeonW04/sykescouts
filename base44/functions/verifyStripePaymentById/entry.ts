import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const { stripe_payment_intent_id, member_id } = await req.json();

  if (!stripe_payment_intent_id || !member_id) {
    return Response.json({ error: 'stripe_payment_intent_id and member_id required' }, { status: 400 });
  }

  const pi = await stripe.paymentIntents.retrieve(stripe_payment_intent_id, {
    expand: ['payment_method']
  });

  if (pi.status !== 'succeeded') {
    return Response.json({ error: `Payment not succeeded — status is: ${pi.status}` }, { status: 400 });
  }

  if (pi.metadata?.member_id !== member_id) {
    return Response.json({ error: 'member_id does not match payment intent metadata' }, { status: 400 });
  }

  return Response.json({
    amount: pi.amount / 100,
    paid_at: new Date(pi.created * 1000).toISOString().split('T')[0],
    card_brand: pi.payment_method?.card?.brand || null,
    card_last4: pi.payment_method?.card?.last4 || null,
    member_id: pi.metadata.member_id,
    event_id: pi.metadata.event_id || null,
    meeting_id: pi.metadata.meeting_id || null
  });
});