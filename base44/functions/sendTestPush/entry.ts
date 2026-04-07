import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

// ✅ VAPID credentials hardcoded directly — replace these values with your actual keys
const VAPID_SUBJECT = 'mailto:deon@sykescouts.org'; // ← replace
const VAPID_PUBLIC_KEY = 'BMxgoAuwVVPfAwIBN1tuQNmlGOUzYPqUQrGNZ1yO-wRMckk5zbJkV1LDRdKE0Z2T4_XnR0LLJg2z0ZQWTk3p644';   // ← replace
const VAPID_PRIVATE_KEY = 'Ul5ZJEMl_8DcNMiB-tNwhDcxEq2Oenf2uX9jFcJm4Pk'; // ← replace

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { subscriptionId } = await req.json();

    // Set VAPID details using hardcoded values above
    webpush.setVapidDetails(
      VAPID_SUBJECT,
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );

    const subs = await base44.asServiceRole.entities.PushSubscription.filter({});
    const target = subscriptionId ? subs.find(s => s.id === subscriptionId) : null;
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

      // ✅ Explicitly reconstruct the subscription object to ensure correct shape.
      // Passing the raw DB object can cause web-push to misread the keys, silently
      // constructing a bad JWT and getting a 403 back from the push service.
      const pushSubscription = {
        endpoint: sub.subscription.endpoint,
        keys: {
          p256dh: sub.subscription.keys.p256dh,
          auth: sub.subscription.keys.auth,
        },
      };

      // ✅ Log the push service being targeted — useful to confirm the aud in the JWT
      // will match (fcm.googleapis.com, web.push.apple.com, etc.)
      let pushServiceHost = 'unknown';
      try { pushServiceHost = new URL(sub.subscription.endpoint).hostname; } catch {}
      console.log(`[Push] Sending to ${sub.user_email} via ${pushServiceHost}`);

      try {
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
        results.push({ email: sub.user_email, status: 'sent', pushService: pushServiceHost });
        console.log(`[Push] ✅ Sent to ${sub.user_email}`);
      } catch (err) {
        failed++;
        const code = err.statusCode;
        console.error(`[Push] ❌ Failed for ${sub.user_email}: HTTP ${code} — ${err.message}`);
        console.error(`[Push] Endpoint: ${sub.subscription.endpoint}`);

        results.push({
          email: sub.user_email,
          status: 'failed',
          reason: err.message,
          statusCode: code,
          pushService: pushServiceHost,
        });

        // ✅ FIXED: Only delete on 410 (Gone) or 404 (Not Found).
        // These mean the subscription has been revoked by the push service and is
        // genuinely invalid. A 403 means our auth/JWT is wrong — the subscription
        // itself is still valid and must NOT be deleted.
        if (code === 410 || code === 404) {
          console.log(`[Push] Subscription gone (${code}), removing from DB...`);
          await base44.asServiceRole.entities.PushSubscription.delete(sub.id).catch(() => {});
        }
      }
    }

    console.log(`[Push] Done. Sent: ${sent}, Failed: ${failed}`);
    return Response.json({ sent, failed, results });
  } catch (error) {
    console.error('[Push] Unexpected error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});