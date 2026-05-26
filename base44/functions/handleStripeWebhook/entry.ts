import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

function addMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().split('T')[0];
}

function nextSubsDue(interval) {
  const today = new Date();
  if (interval === '4_months') return addMonths(today, 4);
  if (interval === '6_months') return addMonths(today, 6);
  if (interval === 'yearly') return addMonths(today, 12);
  return addMonths(today, 4);
}

Deno.serve(async (req) => {
  // Must read raw body BEFORE anything else for signature verification
  const rawBody = await req.text();
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return new Response('Webhook signature verification failed', { status: 400 });
  }

  // Use service-role client — webhooks are not user-authenticated
  const base44 = createClientFromRequest(req);

  if (event.type === 'payment_intent.succeeded') {
    const pi = event.data.object;
    const { member_id, event_id, meeting_id } = pi.metadata || {};

    // Idempotency: check if LedgerEntry already exists for this PI
    const existing = await base44.asServiceRole.entities.LedgerEntry.filter({ reference: pi.id });
    if (existing.length) return new Response('OK', { status: 200 });

    // Retrieve payment method for card details
    let card_last4 = null, card_brand = null;
    if (pi.payment_method) {
      const pm = await stripe.paymentMethods.retrieve(pi.payment_method);
      card_last4 = pm.card?.last4 || null;
      card_brand = pm.card?.brand || null;
    }

    // Build description
    let description = 'Stripe payment';
    let member_name = member_id;
    if (member_id) {
      const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
      if (members.length) member_name = members[0].full_name || `${members[0].first_name} ${members[0].surname}`;
    }

    if (event_id) {
      const events = await base44.asServiceRole.entities.Event.filter({ id: event_id });
      const title = events[0]?.title || 'Event';
      description = `Stripe payment for ${title} — ${member_name}`;
    } else if (meeting_id) {
      const meetings = await base44.asServiceRole.entities.Programme.filter({ id: meeting_id });
      const title = meetings[0]?.title || 'Meeting';
      description = `Stripe payment for ${title} — ${member_name}`;
    } else {
      description = `Stripe subscription payment — ${member_name}`;
    }

    const amountPounds = pi.amount / 100;

    // Create LedgerEntry
    await base44.asServiceRole.entities.LedgerEntry.create({
      date: new Date().toISOString().split('T')[0],
      type: 'income',
      amount: amountPounds,
      category: (event_id || meeting_id) ? 'event_payments' : 'subs',
      description,
      reference: pi.id,
      linked_member_id: member_id || null,
      linked_event_id: event_id || null,
      linked_meeting_id: meeting_id || null,
      entered_by: 'Stripe'
    });

    // Update or create payment status record
    const today = new Date().toISOString().split('T')[0];
    if (event_id) {
      const statusRecords = await base44.asServiceRole.entities.EventPaymentStatus.filter({ event_id, member_id });
      const statusPayload = { status: 'paid', paid_at: today, stripe_payment_intent_id: pi.id, card_last4, card_brand };
      if (statusRecords.length) {
        await base44.asServiceRole.entities.EventPaymentStatus.update(statusRecords[0].id, statusPayload);
      } else {
        await base44.asServiceRole.entities.EventPaymentStatus.create({ event_id, member_id, ...statusPayload });
      }
    } else if (meeting_id) {
      const statusRecords = await base44.asServiceRole.entities.MeetingPaymentStatus.filter({ meeting_id, member_id });
      const statusPayload = { status: 'paid', paid_at: today, stripe_payment_intent_id: pi.id, card_last4, card_brand };
      if (statusRecords.length) {
        await base44.asServiceRole.entities.MeetingPaymentStatus.update(statusRecords[0].id, statusPayload);
      } else {
        await base44.asServiceRole.entities.MeetingPaymentStatus.create({ meeting_id, member_id, ...statusPayload });
      }
    }
  }

  else if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const subscription_id = invoice.subscription;
    if (!subscription_id) return new Response('OK', { status: 200 });

    // Idempotency
    const existing = await base44.asServiceRole.entities.LedgerEntry.filter({ reference: invoice.id });
    if (existing.length) return new Response('OK', { status: 200 });

    const members = await base44.asServiceRole.entities.Member.filter({ stripe_subscription_id: subscription_id });
    if (!members.length) return new Response('OK', { status: 200 });
    const member = members[0];
    const member_name = member.full_name || `${member.first_name} ${member.surname}`;

    await base44.asServiceRole.entities.LedgerEntry.create({
      date: new Date().toISOString().split('T')[0],
      type: 'income',
      amount: invoice.amount_paid / 100,
      category: 'subs',
      description: `Term subscription — ${member_name}`,
      reference: invoice.id,
      linked_member_id: member.id,
      entered_by: 'Stripe'
    });

    const today = new Date().toISOString().split('T')[0];
    await base44.asServiceRole.entities.Member.update(member.id, {
      last_subs_payment_date: today,
      next_subs_due: nextSubsDue(member.subs_interval)
    });
  }

  else if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const subscription_id = invoice.subscription;
    if (!subscription_id) return new Response('OK', { status: 200 });

    const members = await base44.asServiceRole.entities.Member.filter({ stripe_subscription_id: subscription_id });
    if (!members.length) return new Response('OK', { status: 200 });
    const member = members[0];
    const member_name = member.full_name || `${member.first_name} ${member.surname}`;

    // Send email to parent
    if (member.parent_one_email) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: member.parent_one_email,
        subject: `⚠️ Scout subscription payment failed for ${member_name}`,
        body: `Hi,\n\nWe were unable to collect the Scout membership subscription payment for ${member_name}.\n\nPlease log in to your SykeScouts account and update your payment method as soon as possible to avoid any disruption to their membership.\n\nIf you need help, please contact us.\n\nThank you,\n40th Rochdale (Syke) Scouts`
      });
    }

    // Send push notification
    const pushSubs = await base44.asServiceRole.entities.PushSubscription.filter({ user_email: member.parent_one_email });
    for (const sub of pushSubs) {
      await base44.asServiceRole.functions.invoke('sendPushNotification', {
        subscription: sub.subscription_data,
        title: 'Payment Failed',
        body: `Your Scout subscription payment for ${member_name} failed. Please update your payment method.`
      });
    }
  }

  else if (event.type === 'payment_method.attached') {
    const pm = event.data.object;
    const customer_id = pm.customer;
    if (!customer_id) return new Response('OK', { status: 200 });

    const members = await base44.asServiceRole.entities.Member.filter({ stripe_customer_id: customer_id });
    if (!members.length) return new Response('OK', { status: 200 });
    const member = members[0];

    // Refresh payment methods cache
    await base44.asServiceRole.functions.invoke('listPaymentMethods', { member_id: member.id });
  }

  return new Response('OK', { status: 200 });
});