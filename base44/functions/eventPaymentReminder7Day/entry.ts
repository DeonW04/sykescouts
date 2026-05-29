import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

async function sendToParent(base44, member, subject, body) {
  const emails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
  for (const email of emails) {
    await base44.asServiceRole.integrations.Core.SendEmail({ to: email, subject, body });
  }
  const pushEmail = member.parent_one_email;
  if (pushEmail) {
    const subs = await base44.asServiceRole.entities.PushSubscription.filter({ user_email: pushEmail });
    for (const sub of subs) {
      await base44.asServiceRole.functions.invoke('sendPushNotification', {
        subscription: sub.subscription_data,
        title: 'Payment reminder',
        body,
      });
    }
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const today = new Date();
  const target = new Date(today);
  target.setDate(target.getDate() + 7);
  const targetStr = target.toISOString().split('T')[0];

  // Find events on exactly that date with cost > 0
  const allEvents = await base44.asServiceRole.entities.Event.filter({ published: true });
  const targetEvents = allEvents.filter(e => {
    const d = e.start_date?.split('T')[0];
    return d === targetStr && (e.cost ?? 0) > 0;
  });

  if (!targetEvents.length) return Response.json({ sent: 0 });

  let sent = 0;
  for (const event of targetEvents) {
    // Find attendance actions for this event
    const actions = await base44.asServiceRole.entities.ActionRequired.filter({
      event_id: event.id, action_purpose: 'attendance'
    });
    for (const action of actions) {
      // Find attending responses
      const responses = await base44.asServiceRole.entities.ActionResponse.filter({ action_required_id: action.id });
      const attendingMemberIds = responses
        .filter(r => {
          const v = (r.response_value || '').toLowerCase();
          return v === 'yes' || v === 'yes, attending' || v === 'attending';
        })
        .map(r => r.member_id);

      for (const memberId of attendingMemberIds) {
        // Check if already paid or waived
        const paid = await base44.asServiceRole.entities.EventPaymentStatus.filter({
          event_id: event.id, member_id: memberId, status: 'paid'
        });
        if (paid.length) continue;
        const waived = await base44.asServiceRole.entities.MeetingPaymentOverride.filter({
          event_id: event.id, member_id: memberId, override_type: 'waived'
        });
        if (waived.length) continue;

        const members = await base44.asServiceRole.entities.Member.filter({ id: memberId });
        if (!members.length) continue;
        const member = members[0];
        const name = member.full_name || `${member.first_name} ${member.surname}`;

        const subject = `Payment reminder: ${event.title} is in one week`;
        const body = `Payment reminder: ${event.title} is in one week and payment of £${event.cost.toFixed(2)} is outstanding for ${name}.\n\nPlease log in to the SykeScouts app to pay.\n\n40th Rochdale (Syke) Scouts`;

        await sendToParent(base44, member, subject, body);
        sent++;
      }
    }
  }

  return Response.json({ sent });
});