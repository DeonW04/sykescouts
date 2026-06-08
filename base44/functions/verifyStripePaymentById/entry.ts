import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Stripe from 'npm:stripe@14.21.0';

// Verifies a Stripe payment by Payment Intent ID and runs a series of checks
// against the member and the expected amount. Instead of failing silently, it
// always returns a structured response describing exactly what was checked,
// what passed, and what failed — so the UI can show the leader why.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ ok: false, error: 'You must be signed in.' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ ok: false, error: 'Only admins can verify payments.' }, { status: 403 });

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // Accept both payment_intent_id and the legacy stripe_payment_intent_id key
    const body = await req.json().catch(() => ({}));
    const paymentIntentId = (body.payment_intent_id || body.stripe_payment_intent_id || '').trim();
    const memberId = body.member_id;
    const expectedAmount = typeof body.expected_amount === 'number' ? body.expected_amount : null; // in pounds
    const expectedEventId = body.event_id || null;
    const expectedMeetingId = body.meeting_id || null;

    if (!paymentIntentId) {
      return Response.json({ ok: false, error: 'Please enter a Stripe Payment ID.' }, { status: 400 });
    }
    if (!memberId) {
      return Response.json({ ok: false, error: 'Member is missing — please try again.' }, { status: 400 });
    }
    if (!paymentIntentId.startsWith('pi_')) {
      return Response.json({
        ok: false,
        error: `That doesn't look like a Payment Intent ID. It should start with "pi_". You entered: "${paymentIntentId}".`,
      }, { status: 400 });
    }

    // Retrieve the payment intent
    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['payment_method', 'latest_charge'] });
    } catch (err) {
      return Response.json({
        ok: false,
        error: `No payment was found with that ID in Stripe. Double-check the ID is correct. (Stripe said: ${err.message})`,
      }, { status: 400 });
    }

    // Look up the member to show who the payment is being matched to
    let member = null;
    try { member = await base44.asServiceRole.entities.Member.get(memberId); } catch { /* non-fatal */ }

    const amountPounds = (pi.amount || 0) / 100;
    const cardBrand = pi.payment_method?.card?.brand || pi.latest_charge?.payment_method_details?.card?.brand || null;
    const cardLast4 = pi.payment_method?.card?.last4 || pi.latest_charge?.payment_method_details?.card?.last4 || null;
    const piMemberId = pi.metadata?.member_id || null;
    const piEventId = pi.metadata?.event_id || null;
    const piMeetingId = pi.metadata?.meeting_id || null;

    // Build a list of checks. Each is { label, passed, detail }
    const checks = [];

    // 1. Status check
    const statusOk = pi.status === 'succeeded';
    checks.push({
      label: 'Payment status',
      passed: statusOk,
      detail: statusOk ? 'Succeeded' : `Status is "${pi.status}" — this payment has not successfully completed.`,
    });

    // 2. Member match check (only if the payment has member metadata)
    if (piMemberId) {
      const memberOk = piMemberId === memberId;
      checks.push({
        label: 'Member match',
        passed: memberOk,
        detail: memberOk
          ? `Matches ${member?.full_name || 'this member'}`
          : `This payment was made for a different member, not ${member?.full_name || 'this member'}.`,
      });
    } else {
      checks.push({
        label: 'Member match',
        passed: true,
        detail: 'No member tag on this payment — will be linked to the selected member.',
        warning: true,
      });
    }

    // 3. Event / meeting match (only when we have both an expected id and metadata to compare)
    if (expectedEventId && piEventId) {
      const evOk = piEventId === expectedEventId;
      checks.push({
        label: 'Event match',
        passed: evOk,
        detail: evOk ? 'Matches this event' : 'This payment was made for a different event.',
      });
    }
    if (expectedMeetingId && piMeetingId) {
      const mtOk = piMeetingId === expectedMeetingId;
      checks.push({
        label: 'Meeting match',
        passed: mtOk,
        detail: mtOk ? 'Matches this meeting' : 'This payment was made for a different meeting.',
      });
    }

    // 4. Amount check (only if we were told the expected amount)
    if (expectedAmount != null) {
      const amountOk = Math.abs(amountPounds - expectedAmount) < 0.005;
      checks.push({
        label: 'Amount',
        passed: amountOk,
        detail: amountOk
          ? `£${amountPounds.toFixed(2)} — matches the expected amount`
          : `Paid £${amountPounds.toFixed(2)}, but the expected amount is £${expectedAmount.toFixed(2)}.`,
        warning: !amountOk, // amount mismatch is a warning, not a hard block
      });
    }

    const hardChecks = checks.filter(c => !c.warning);
    const allPassed = hardChecks.every(c => c.passed);

    return Response.json({
      ok: allPassed,
      checks,
      payment: {
        payment_intent_id: pi.id,
        amount: amountPounds,
        status: pi.status,
        card_brand: cardBrand,
        card_last4: cardLast4,
        paid_at: new Date((pi.created || Date.now() / 1000) * 1000).toISOString().split('T')[0],
        member_name: member?.full_name || null,
        member_id: piMemberId,
        event_id: piEventId,
        meeting_id: piMeetingId,
      },
    });
  } catch (error) {
    return Response.json({ ok: false, error: `Something went wrong while verifying: ${error.message}` }, { status: 500 });
  }
});