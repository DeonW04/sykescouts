import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { message, sectionId, eventId } = await req.json();
  if (!message) return Response.json({ error: 'Message required' }, { status: 400 });

  // Get all push subscriptions for parents in this section
  const allSubscriptions = await base44.asServiceRole.entities.PushSubscription.filter({});
  const parentSubs = allSubscriptions.filter(s => s.user_role === 'parent' || !s.user_role);

  let memberSectionIds = [];
  if (sectionId) {
    memberSectionIds = [sectionId];
  } else if (eventId) {
    const events = await base44.asServiceRole.entities.Event.filter({ id: eventId });
    memberSectionIds = events[0]?.section_ids || [];
  }

  // Get members in these sections and their parent emails
  const members = await base44.asServiceRole.entities.Member.filter({ active: true });
  const sectionMembers = members.filter(m => memberSectionIds.includes(m.section_id));
  const parentEmails = new Set();
  sectionMembers.forEach(m => {
    if (m.parent_one_email) parentEmails.add(m.parent_one_email.toLowerCase());
    if (m.parent_two_email) parentEmails.add(m.parent_two_email.toLowerCase());
  });

  // Filter subscriptions to relevant parents
  const targetSubs = parentSubs.filter(s => parentEmails.has((s.user_email || '').toLowerCase()));

  const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY');
  const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT');
  const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY');

  if (!VAPID_PRIVATE_KEY || !VAPID_PUBLIC_KEY) {
    return Response.json({ error: 'VAPID keys not configured' }, { status: 500 });
  }

  const { default: webpush } = await import('npm:web-push@3.6.7');
  webpush.setVapidDetails(VAPID_SUBJECT || 'mailto:admin@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

  const payload = JSON.stringify({
    title: '📢 Meeting Update',
    body: message,
    icon: '/pwa-192x192.png',
  });

  let sent = 0;
  await Promise.allSettled(
    targetSubs.map(async (sub) => {
      try {
        await webpush.sendNotification(sub.subscription, payload);
        sent++;
      } catch (e) {
        // stale subscription, ignore
      }
    })
  );

  return Response.json({ success: true, sent, total: targetSubs.length });
});