import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

const VAPID_SUBJECT = 'mailto:deon@sykescouts.org';
const VAPID_PUBLIC_KEY = 'BMxgoAuwVVPfAwIBN1tuQNmlGOUzYPqUQrGNZ1yO-wRMckk5zbJkV1LDRdKE0Z2T4_XnR0LLJg2z0ZQWTk3p644';
const VAPID_PRIVATE_KEY = 'Ul5ZJEMl_8DcNMiB-tNwhDcxEq2Oenf2uX9jFcJm4Pk';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

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

// Called by entity automations: join enquiry created, volunteer application created, consent form submitted
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

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