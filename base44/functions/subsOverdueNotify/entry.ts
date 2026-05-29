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
        title: 'Subscription payment overdue',
        body,
      });
    }
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const todayStr = new Date().toISOString().split('T')[0];
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

  // Members whose subscription was due today or in the past
  const allMembers = await base44.asServiceRole.entities.Member.filter({});
  const overdueMembers = allMembers.filter(m =>
    m.stripe_subscription_id && m.next_subs_due && m.next_subs_due <= todayStr
  );

  let sent = 0;
  for (const member of overdueMembers) {
    // Check if a subs LedgerEntry exists within the last 2 days for this member
    const recentEntries = await base44.asServiceRole.entities.LedgerEntry.filter({
      linked_member_id: member.id, category: 'subs'
    });
    const hasRecentPayment = recentEntries.some(e => e.date >= twoDaysAgoStr);
    if (hasRecentPayment) continue;

    const name = member.full_name || `${member.first_name} ${member.surname}`;
    const subject = `Scout subscription payment overdue for ${name}`;
    const body = `Your Scout subscription payment for ${name} is overdue. Please check your payment method in the SykeScouts app to avoid any disruption to their membership.\n\n40th Rochdale (Syke) Scouts`;
    await sendToParent(base44, member, subject, body);
    sent++;
  }

  return Response.json({ sent });
});