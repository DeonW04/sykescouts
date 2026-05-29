import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Scheduled job 4 — runs daily
// Notifies members whose subscription is overdue and no payment received in last 2 days
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(today.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

  const allMembers = await base44.asServiceRole.entities.Member.filter({});
  const overdue = allMembers.filter(m =>
    m.stripe_subscription_id && m.next_subs_due && m.next_subs_due <= todayStr
  );

  let notified = 0;
  for (const member of overdue) {
    // Check no subs payment in last 2 days
    const entries = await base44.asServiceRole.entities.LedgerEntry.filter({ linked_member_id: member.id, category: 'subs' });
    const recentPayment = entries.some(e => e.date && e.date >= twoDaysAgoStr);
    if (recentPayment) continue;

    const notifBody = `Your Scout subscription payment is overdue. Please check your payment method.`;
    const emailBody = `${notifBody}\n\nPlease log in to the SykeScouts app and update your payment method to avoid any disruption.\n\n40th Rochdale (Syke) Scouts`;

    const emails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
    for (const email of emails) {
      const subs = await base44.asServiceRole.entities.PushSubscription.filter({ user_email: email });
      for (const sub of subs) {
        await base44.asServiceRole.functions.invoke('sendPushNotification', { subscription: sub.subscription_data, title: 'Subscription Overdue', body: notifBody }).catch(() => {});
      }
      await base44.asServiceRole.integrations.Core.SendEmail({ to: email, subject: 'Scout subscription payment overdue', body: emailBody }).catch(() => {});
    }
    notified++;
  }

  return Response.json({ ok: true, notified });
});