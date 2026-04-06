import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { subscriptionId } = await req.json();

    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT'),
      Deno.env.get('VAPID_PUBLIC_KEY'),
      Deno.env.get('VAPID_PRIVATE_KEY')
    );

    const subs = await base44.asServiceRole.entities.PushSubscription.filter({});
    const target = subscriptionId
      ? subs.find(s => s.id === subscriptionId)
      : null;

    const targets = target ? [target] : subs;

    if (targets.length === 0) {
      return Response.json({ error: 'No subscriptions found' }, { status: 404 });
    }

    const payload = JSON.stringify({
      title: 'Test Notification',
      body: '✅ Push notifications are working correctly!',
      url: '/app'
    });

    let sent = 0;
    let failed = 0;
    const results = [];

    for (const sub of targets) {
      if (!sub.subscription?.endpoint) {
        results.push({ email: sub.user_email, status: 'skipped', reason: 'no endpoint' });
        continue;
      }
      try {
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
        results.push({ email: sub.user_email, status: 'sent' });
      } catch (err) {
        failed++;
        results.push({ email: sub.user_email, status: 'failed', reason: err.message, statusCode: err.statusCode });
        // 410 = expired, 403 = key mismatch — both mean stale subscription
        if (err.statusCode === 410 || err.statusCode === 403) {
          await base44.asServiceRole.entities.PushSubscription.delete(sub.id).catch(() => {});
        }
      }
    }

    return Response.json({ sent, failed, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});