import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Scheduled job 3 — runs daily
// Notifies members whose subscription is due in exactly 7 days
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const today = new Date();
  const target = new Date(today);
  target.setDate(today.getDate() + 7);
  const targetStr = target.toISOString().split('T')[0];

  const subsAmountPence = parseInt(Deno.env.get('SUBS_AMOUNT_PENCE') || '0');
  const subsAmountStr = `£${(subsAmountPence / 100).toFixed(2)}`;

  const allMembers = await base44.asServiceRole.entities.Member.filter({});
  const due = allMembers.filter(m => m.stripe_subscription_id && m.next_subs_due === targetStr);

  for (const member of due) {
    const notifBody = `Your Scout subscription of ${subsAmountStr} is due in one week.`;
    const emailBody = `${notifBody}\n\nPayment will be taken automatically. If you need to update your payment method, please log in to the SykeScouts app.\n\n40th Rochdale (Syke) Scouts`;

    const emails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
    for (const email of emails) {
      const subs = await base44.asServiceRole.entities.PushSubscription.filter({ user_email: email });
      for (const sub of subs) {
        await base44.asServiceRole.functions.invoke('sendPushNotification', { subscription: sub.subscription_data, title: 'Subscription Due Soon', body: notifBody }).catch(() => {});
      }
      await base44.asServiceRole.integrations.Core.SendEmail({ to: email, subject: 'Scout subscription due in one week', body: emailBody }).catch(() => {});
    }
  }

  return Response.json({ ok: true, notified: due.length });
});