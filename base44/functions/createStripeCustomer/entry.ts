import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { member_id } = await req.json();
  if (!member_id) return Response.json({ error: 'member_id required' }, { status: 400 });

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

  const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
  if (!members.length) return Response.json({ error: 'Member not found' }, { status: 404 });
  const member = members[0];

  // Return existing customer ID if already set — no duplicates
  if (member.stripe_customer_id) {
    return Response.json({ customer_id: member.stripe_customer_id });
  }

  const customer = await stripe.customers.create({
    name: member.full_name || `${member.first_name} ${member.surname}`,
    email: member.parent_one_email || undefined,
    metadata: { member_id: member.id }
  });

  await base44.asServiceRole.entities.Member.update(member.id, {
    stripe_customer_id: customer.id
  });

  return Response.json({ customer_id: customer.id });
});