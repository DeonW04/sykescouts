import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const { member_id } = await req.json();
  if (!member_id) return Response.json({ error: 'member_id required' }, { status: 400 });

  // Ensure customer exists
  const customerRes = await base44.asServiceRole.functions.invoke('createStripeCustomer', { member_id });
  const customer_id = customerRes.customer_id;

  const setupIntent = await stripe.setupIntents.create({
    customer: customer_id,
    automatic_payment_methods: { enabled: true },
  });

  return Response.json({ client_secret: setupIntent.client_secret });
});