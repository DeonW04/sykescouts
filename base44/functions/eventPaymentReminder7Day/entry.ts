import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Scheduled job 1 — runs daily
// Finds events in exactly 7 days with unpaid attending members and notifies parents
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const today = new Date();
  const target = new Date(today);
  target.setDate(today.getDate() + 7);
  const targetStr = target.toISOString().split('T')[0];

  const allEvents = await base44.asServiceRole.entities.Event.filter({ published: true });
  const targetEvents = allEvents.filter(e =>
    (e.cost || 0) > 0 &&
    e.start_date &&
    new Date(e.start_date).toISOString().split('T')[0] === targetStr
  );

  let sent = 0;
  for (const event of targetEvents) {
    const actions = await base44.asServiceRole.entities.ActionRequired.filter({ event_id: event.id, action_purpose: 'attendance' });
    for (const action of actions) {
      const responses = await base44.asServiceRole.entities.ActionResponse.filter({ action_required_id: action.id });
      const attending = responses.filter(r => ['Yes, attending', 'yes', 'attending'].includes(r.response_value));
      for (const resp of attending) {
        const { member_id } = resp;
        const paid = await base44.asServiceRole.entities.EventPaymentStatus.filter({ event_id: event.id, member_id, status: 'paid' });
        if (paid.length) continue;
        const waived = await base44.asServiceRole.entities.MeetingPaymentOverride.filter({ event_id: event.id, member_id, override_type: 'waived' });
        if (waived.length) continue;

        const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
        if (!members.length) continue;
        const member = members[0];

        const costStr = `£${(event.cost || 0).toFixed(2)}`;
        const notifBody = `Payment reminder: ${event.title} is in one week and payment of ${costStr} is outstanding.`;
        const emailBody = `${notifBody}\n\nPlease log in to the SykeScouts app to complete payment.\n\n40th Rochdale (Syke) Scouts`;

        const emails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
        for (const email of emails) {
          const subs = await base44.asServiceRole.entities.PushSubscription.filter({ user_email: email });
          for (const sub of subs) {
            await base44.asServiceRole.functions.invoke('sendPushNotification', { subscription: sub.subscription_data, title: 'Payment Reminder', body: notifBody }).catch(() => {});
          }
          await base44.asServiceRole.integrations.Core.SendEmail({ to: email, subject: `Payment reminder: ${event.title}`, body: emailBody }).catch(() => {});
        }
        sent++;
      }
    }
  }

  return Response.json({ ok: true, sent });
});