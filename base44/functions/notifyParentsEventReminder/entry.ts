import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

const VAPID_SUBJECT = 'mailto:deon@sykescouts.org';
const VAPID_PUBLIC_KEY = 'BMxgoAuwVVPfAwIBN1tuQNmlGOUzYPqUQrGNZ1yO-wRMckk5zbJkV1LDRdKE0Z2T4_XnR0LLJg2z0ZQWTk3p644';
const VAPID_PRIVATE_KEY = 'Ul5ZJEMl_8DcNMiB-tNwhDcxEq2Oenf2uX9jFcJm4Pk';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Scheduled daily: checks for events starting tomorrow where member is attending
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const events = await base44.asServiceRole.entities.Event.filter({});
    const tomorrowEvents = events.filter(e => {
      const d = e.start_date?.split('T')[0];
      return d === tomorrowStr;
    });

    if (tomorrowEvents.length === 0) return Response.json({ skipped: true, reason: 'no events tomorrow' });

    const allAttendances = await base44.asServiceRole.entities.EventAttendance.filter({});
    const allMembers = await base44.asServiceRole.entities.Member.filter({ active: true });
    const parentSubs = await base44.asServiceRole.entities.PushSubscription.filter({ user_role: 'parent' });

    let sent = 0;

    for (const event of tomorrowEvents) {
      const attendingMemberIds = allAttendances
        .filter(a => a.event_id === event.id && a.rsvp_status === 'attending')
        .map(a => a.member_id);

      if (attendingMemberIds.length === 0) continue;

      for (const sub of parentSubs) {
        if (sub.preferences?.event_reminder === false) continue;
        if (!sub.subscription?.endpoint) continue;

        // Check if any of their children are attending
        const parentEmail = sub.user_email;
        const childrenAttending = allMembers.filter(m =>
          (m.parent_one_email === parentEmail || m.parent_two_email === parentEmail) &&
          attendingMemberIds.includes(m.id)
        );

        if (childrenAttending.length === 0) continue;

        const childNames = childrenAttending.map(m => m.first_name).join(', ');
        try {
          await webpush.sendNotification(
            { endpoint: sub.subscription.endpoint, keys: sub.subscription.keys },
            JSON.stringify({
              title: `📅 Event Tomorrow: ${event.title}`,
              body: `${childNames} is signed up for tomorrow's event`,
              url: '/app',
            })
          );
          sent++;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await base44.asServiceRole.entities.PushSubscription.delete(sub.id).catch(() => {});
          }
        }
      }
    }

    return Response.json({ sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});