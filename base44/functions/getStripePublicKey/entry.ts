import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  const publishable_key = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
  if (!publishable_key) return Response.json({ error: 'Stripe not configured' }, { status: 500 });
  return Response.json({ publishable_key });
});