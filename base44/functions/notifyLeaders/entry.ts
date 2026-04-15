import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

const VAPID_SUBJECT = 'mailto:deon@sykescouts.org';
const VAPID_PUBLIC_KEY = 'BMxgoAuwVVPfAwIBN1tuQNmlGOUzYPqUQrGNZ1yO-wRMckk5zbJkV1LDRdKE0Z2T4_XnR0LLJg2z0ZQWTk3p644';
const VAPID_PRIVATE_KEY = 'Ul5ZJEMl_8DcNMiB-tNwhDcxEq2Oenf2uX9jFcJm4Pk';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function sendToUser(subscription, payload) {
  if (!subscription?.endpoint) return false;
  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: subscription.keys },
      JSON.stringify(payload)
    );
    return true;
  } catch (err) {
    return false;
  }
}

async function sendToLeaders(base44ServiceRole, payload, notificationType) {
  const allSubs = await base44ServiceRole.entities.PushSubscription.filter({ user_role: 'leader' });
  let sent = 0;
  for (const sub of allSubs) {
    if (!sub.subscription?.endpoint) continue;
    const prefs = sub.preferences || {};
    if (prefs[notificationType] === false) continue;
    try {
      await webpush.sendNotification(
        { endpoint: sub.subscription.endpoint, keys: sub.subscription.keys },
        JSON.stringify(payload)
      );
      sent++;
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await base44ServiceRole.entities.PushSubscription.delete(sub.id).catch(() => {});
      }
    }
  }
  return sent;
}

// Called by entity automations and directly from ledger payment flow
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data, type } = body;

    // ── Direct call: payment_received (from Ledger or MemberPayments page) ──
    if (type === 'payment_received') {
      const { member_id, event_id, meeting_id, amount, member_name, event_title, meeting_title, expected_amount } = body;

      // Determine section & team leader
      let sectionId = null;
      let contextName = event_title || meeting_title || 'Unknown';

      if (event_id) {
        const evList = await base44.asServiceRole.entities.Event.filter({ id: event_id });
        const ev = evList[0];
        if (ev?.section_ids?.length > 0) sectionId = ev.section_ids[0];
        contextName = ev?.title || contextName;
      } else if (meeting_id) {
        const progList = await base44.asServiceRole.entities.Programme.filter({ id: meeting_id });
        const prog = progList[0];
        if (prog?.section_id) sectionId = prog.section_id;
        contextName = prog?.title || contextName;
      }

      let teamLeaderUserId = null;
      if (sectionId) {
        const secList = await base44.asServiceRole.entities.Section.filter({ id: sectionId });
        const sec = secList[0];
        if (sec?.team_leader_id) {
          // team_leader_id is a Leader ID; get its user_id
          const leaderList = await base44.asServiceRole.entities.Leader.filter({ id: sec.team_leader_id });
          teamLeaderUserId = leaderList[0]?.user_id;
        }
      }

      const amountMismatch = expected_amount && Math.abs(amount - expected_amount) > 0.001;
      const warningIcon = amountMismatch ? ' ⚠️' : '';
      const amountStr = `£${Number(amount).toFixed(2)}`;
      const expectedStr = expected_amount ? ` (expected £${Number(expected_amount).toFixed(2)})` : '';

      const payload = {
        title: `💳 Payment Received${warningIcon}`,
        body: `${member_name || 'A member'} paid ${amountStr}${expectedStr} for ${contextName}`,
        url: '/TreasurerMemberPayments',
        notification_type: 'payment_received',
      };

      let sent = 0;
      if (teamLeaderUserId) {
        // Find push subscriptions for this specific user
        const allSubs = await base44.asServiceRole.entities.PushSubscription.filter({});
        const leaderSubs = allSubs.filter(s => s.user_id === teamLeaderUserId || s.leader_user_id === teamLeaderUserId);
        for (const sub of leaderSubs) {
          if (await sendToUser(sub.subscription, payload)) sent++;
        }
        // Fallback: if no specific sub found, broadcast to all leaders
        if (sent === 0) {
          sent = await sendToLeaders(base44.asServiceRole, payload, 'payment_received');
        }
      } else {
        // No team leader found, notify all leaders
        sent = await sendToLeaders(base44.asServiceRole, payload, 'payment_received');
      }

      return Response.json({ sent });
    }

    // ── Entity automation triggers ──
    let payload;
    let notificationType;

    if (event?.entity_name === 'JoinEnquiry') {
      const name = data?.child_name || 'Someone';
      payload = {
        title: '📋 New Join Request',
        body: `${name} has submitted a join enquiry`,
        url: '/JoinEnquiries',
        notification_type: 'new_join_request',
      };
      notificationType = 'new_join_request';
    } else if (event?.entity_name === 'VolunteerApplication') {
      const name = data?.full_name || 'Someone';
      payload = {
        title: '🙋 New Volunteer Application',
        body: `${name} has applied to volunteer`,
        url: '/JoinEnquiries',
        notification_type: 'new_volunteer_request',
      };
      notificationType = 'new_volunteer_request';
    } else if (event?.entity_name === 'ConsentFormSubmission' && event?.type === 'update') {
      const status = data?.status;
      if (status !== 'signed' && status !== 'complete') {
        return Response.json({ skipped: true });
      }
      payload = {
        title: '✅ Consent Form Signed',
        body: `A consent form has been submitted`,
        url: '/ConsentForms',
        notification_type: 'consent_form_submitted',
      };
      notificationType = 'consent_form_submitted';
    } else {
      return Response.json({ skipped: true, reason: 'unknown entity' });
    }

    const sent = await sendToLeaders(base44.asServiceRole, payload, notificationType);
    return Response.json({ sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});