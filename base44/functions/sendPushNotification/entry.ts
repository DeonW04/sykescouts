import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

const VAPID_SUBJECT = 'mailto:deon@sykescouts.org';
const VAPID_PUBLIC_KEY = 'BMxgoAuwVVPfAwIBN1tuQNmlGOUzYPqUQrGNZ1yO-wRMckk5zbJkV1LDRdKE0Z2T4_XnR0LLJg2z0ZQWTk3p644';
const VAPID_PRIVATE_KEY = 'Ul5ZJEMl_8DcNMiB-tNwhDcxEq2Oenf2uX9jFcJm4Pk';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Send a push to specific user IDs or emails, filtered by notification_type preference
// payload: { title, body, url, notification_type }
// targets: array of { user_id } or { user_email }
export async function sendPushToUsers(base44ServiceRole, targets, payload) {
  const allSubs = await base44ServiceRole.entities.PushSubscription.filter({});
  
  const matchingSubs = allSubs.filter(sub => {
    const matchesTarget = targets.some(t =>
      (t.user_id && sub.user_id === t.user_id) ||
      (t.user_email && sub.user_email === t.user_email)
    );
    if (!matchesTarget) return false;
    
    // Check preference
    if (payload.notification_type && sub.preferences) {
      return sub.preferences[payload.notification_type] !== false;
    }
    return true;
  });

  let sent = 0;
  let failed = 0;
  
  for (const sub of matchingSubs) {
    if (!sub.subscription?.endpoint) continue;
    const pushSub = { endpoint: sub.subscription.endpoint, keys: sub.subscription.keys };
    try {
      await webpush.sendNotification(pushSub, JSON.stringify(payload));
      sent++;
    } catch (err) {
      failed++;
      if (err.statusCode === 410 || err.statusCode === 404) {
        await base44ServiceRole.entities.PushSubscription.delete(sub.id).catch(() => {});
      }
    }
  }
  return { sent, failed };
}

// Send to all leaders
export async function sendPushToLeaders(base44ServiceRole, payload) {
  const allSubs = await base44ServiceRole.entities.PushSubscription.filter({ user_role: 'leader' });
  const targets = allSubs.map(s => ({ user_id: s.user_id }));
  return sendPushToUsers(base44ServiceRole, targets, payload);
}

// Send to all parents
export async function sendPushToAllParents(base44ServiceRole, payload) {
  const allSubs = await base44ServiceRole.entities.PushSubscription.filter({ user_role: 'parent' });
  const targets = allSubs.map(s => ({ user_id: s.user_id }));
  return sendPushToUsers(base44ServiceRole, targets, payload);
}

// HTTP handler — used directly from frontend for custom push
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const { title, message, url, target_user_ids, target_user_emails, target_all_parents } = body;

    if (!title || !message) return Response.json({ error: 'title and message required' }, { status: 400 });

    const payload = { title, body: message, url: url || '/app' };

    let targets = [];
    if (target_all_parents) {
      const allSubs = await base44.asServiceRole.entities.PushSubscription.filter({ user_role: 'parent' });
      targets = allSubs.map(s => ({ user_id: s.user_id }));
    } else {
      if (target_user_ids?.length) targets.push(...target_user_ids.map(id => ({ user_id: id })));
      if (target_user_emails?.length) targets.push(...target_user_emails.map(e => ({ user_email: e })));
    }

    const result = await sendPushToUsers(base44.asServiceRole, targets, payload);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});