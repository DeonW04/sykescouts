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
        title: 'Subscription due soon',
        body,
      });
    }
  }
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  const target = new Date();
  target.setDate(target.getDate() + 7);
  const targetStr = target.toISOString().split('T')[0];

  // Find members with subscription due in 7 days
  const allMembers = await base44.asServiceRole.entities.Member.filter({});
  const dueMembers = allMembers.filter(m =>
    m.next_subs_due === targetStr && m.stripe_subscription_id
  );

  let sent = 0;
  const subsAmountPence = parseInt(Deno.env.get('SUBS_AMOUNT_PENCE') || '0');
  const subsAmountDisplay = subsAmountPence ? `£${(subsAmountPence / 100).toFixed(2)}` : 'your subscription';

  for (const member of dueMembers) {
    const name = member.full_name || `${member.first_name} ${member.surname}`;
    const subject = `Scout subscription due in one week for ${name}`;
    const body = `Your Scout subscription of ${subsAmountDisplay} is due in one week for ${name}.\n\nThis will be collected automatically from your saved payment method.\n\n40th Rochdale (Syke) Scouts`;
    await sendToParent(base44, member, subject, body);
    sent++;
  }

  return Response.json({ sent });
});