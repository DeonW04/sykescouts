import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

// Scheduled job 5 — runs weekly
// Notifies members whose subscription is more than 7 days overdue and Stripe shows past_due/unpaid
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

  const today = new Date();
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(today.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const allMembers = await base44.asServiceRole.entities.Member.filter({});
  const longOverdue = allMembers.filter(m =>
    m.stripe_subscription_id && m.next_subs_due && m.next_subs_due < sevenDaysAgoStr
  );

  let notified = 0;
  for (const member of longOverdue) {
    let subStatus = 'unknown';
    try {
      const sub = await stripe.subscriptions.retrieve(member.stripe_subscription_id);
      subStatus = sub.status;
    } catch { continue; }

    if (!['past_due', 'unpaid'].includes(subStatus)) continue;

    const notifBody = `Reminder: Your Scout subscription is still outstanding. Please update your payment method to avoid your child's membership being affected.`;
    const emailBody = `${notifBody}\n\nPlease log in to the SykeScouts app as soon as possible to resolve this.\n\n40th Rochdale (Syke) Scouts`;

    const emails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
    for (const email of emails) {
      const subs = await base44.asServiceRole.entities.PushSubscription.filter({ user_email: email });
      for (const sub of subs) {
        await base44.asServiceRole.functions.invoke('sendPushNotification', { subscription: sub.subscription_data, title: 'Subscription Still Outstanding', body: notifBody }).catch(() => {});
      }
      await base44.asServiceRole.integrations.Core.SendEmail({ to: email, subject: 'Scout subscription still outstanding', body: emailBody }).catch(() => {});
    }
    notified++;
  }

  return Response.json({ ok: true, notified });
});