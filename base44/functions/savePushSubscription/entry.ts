import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { subscription } = await req.json();
    if (!subscription?.endpoint) return Response.json({ error: 'Invalid subscription' }, { status: 400 });

    // Upsert: delete old subscription for this user, save new one
    const existing = await base44.asServiceRole.entities.PushSubscription.filter({ user_id: user.id });
    for (const sub of existing) {
      await base44.asServiceRole.entities.PushSubscription.delete(sub.id);
    }

    await base44.asServiceRole.entities.PushSubscription.create({
      user_id: user.id,
      user_email: user.email,
      subscription
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});