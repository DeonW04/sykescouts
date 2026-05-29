import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

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
        title: 'Subscription still outstanding',
        body,
      });
    }
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const allMembers = await base44.asServiceRole.entities.Member.filter({});
  const candidateMembers = allMembers.filter(m =>
    m.stripe_subscription_id && m.next_subs_due && m.next_subs_due < cutoffStr
  );

  let sent = 0;
  for (const member of candidateMembers) {
    // Check Stripe subscription status
    let subStatus = '';
    try {
      const sub = await stripe.subscriptions.retrieve(member.stripe_subscription_id);
      subStatus = sub.status;
    } catch (_) {
      continue;
    }

    if (subStatus !== 'past_due' && subStatus !== 'unpaid') continue;

    const name = member.full_name || `${member.first_name} ${member.surname}`;
    const subject = `Reminder: Scout subscription still outstanding for ${name}`;
    const body = `Reminder: Your Scout subscription for ${name} is still outstanding. Please update your payment method in the SykeScouts app as soon as possible to avoid affecting their membership.\n\n40th Rochdale (Syke) Scouts`;
    await sendToParent(base44, member, subject, body);
    sent++;
  }

  return Response.json({ sent });
});