import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

const VAPID_SUBJECT = 'mailto:deon@sykescouts.org';
const VAPID_PUBLIC_KEY = 'BMxgoAuwVVPfAwIBN1tuQNmlGOUzYPqUQrGNZ1yO-wRMckk5zbJkV1LDRdKE0Z2T4_XnR0LLJg2z0ZQWTk3p644';
const VAPID_PRIVATE_KEY = 'Ul5ZJEMl_8DcNMiB-tNwhDcxEq2Oenf2uX9jFcJm4Pk';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Called by ActionAssignment create automation
// Finds parent push subscriptions for the member and notifies them
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event, data } = body;

    if (event?.type !== 'create' || event?.entity_name !== 'ActionAssignment') {
      return Response.json({ skipped: true });
    }

    const memberId = data?.member_id;
    const actionId = data?.action_required_id;
    if (!memberId || !actionId) return Response.json({ skipped: true });

    const [members, actions] = await Promise.all([
      base44.asServiceRole.entities.Member.filter({}),
      base44.asServiceRole.entities.ActionRequired.filter({}),
    ]);

    const member = members.find(m => m.id === memberId);
    const action = actions.find(a => a.id === actionId);
    if (!member || !action) return Response.json({ skipped: true });

    const isConsentForm = action.action_purpose === 'consent_form';
    const notificationType = isConsentForm ? 'new_consent_form' : 'new_action_required';
    
    const title = isConsentForm ? '📋 Consent Form Required' : '🔔 Action Required';
    const body2 = `${action.column_title} for ${member.first_name}`;
    const url = '/app';

    // Find parent emails for this member
    const parentEmails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
    if (parentEmails.length === 0) return Response.json({ skipped: true, reason: 'no parent emails' });

    const parentSubs = await base44.asServiceRole.entities.PushSubscription.filter({ user_role: 'parent' });
    const targets = parentSubs.filter(s => parentEmails.includes(s.user_email));

    let sent = 0;
    for (const sub of targets) {
      if (sub.preferences?.[notificationType] === false) continue;
      if (!sub.subscription?.endpoint) continue;
      try {
        await webpush.sendNotification(
          { endpoint: sub.subscription.endpoint, keys: sub.subscription.keys },
          JSON.stringify({ title, body: body2, url })
        );
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await base44.asServiceRole.entities.PushSubscription.delete(sub.id).catch(() => {});
        }
      }
    }

    return Response.json({ sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});