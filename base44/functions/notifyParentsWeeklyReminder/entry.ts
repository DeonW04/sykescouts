import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

const VAPID_SUBJECT = 'mailto:deon@sykescouts.org';
const VAPID_PUBLIC_KEY = 'BMxgoAuwVVPfAwIBN1tuQNmlGOUzYPqUQrGNZ1yO-wRMckk5zbJkV1LDRdKE0Z2T4_XnR0LLJg2z0ZQWTk3p644';
const VAPID_PRIVATE_KEY = 'Ul5ZJEMl_8DcNMiB-tNwhDcxEq2Oenf2uX9jFcJm4Pk';

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all open actions
    const openActions = await base44.asServiceRole.entities.ActionRequired.filter({ is_open: true });
    if (openActions.length === 0) return Response.json({ skipped: true, reason: 'no open actions' });

    // Get assignments for open actions
    const allAssignments = await base44.asServiceRole.entities.ActionAssignment.filter({});
    const allResponses = await base44.asServiceRole.entities.ActionResponse.filter({});
    const allMembers = await base44.asServiceRole.entities.Member.filter({ active: true });
    const parentSubs = await base44.asServiceRole.entities.PushSubscription.filter({ user_role: 'parent' });

    let sent = 0;

    for (const sub of parentSubs) {
      if (sub.preferences?.weekly_outstanding_actions === false) continue;
      if (!sub.subscription?.endpoint) continue;

      // Find members whose parent email matches this user
      const parentEmail = sub.user_email;
      const memberIds = allMembers
        .filter(m => m.parent_one_email === parentEmail || m.parent_two_email === parentEmail)
        .map(m => m.id);

      if (memberIds.length === 0) continue;

      // Find outstanding actions for these members
      const outstandingCount = openActions.filter(action => {
        const assigned = allAssignments.some(a => a.action_required_id === action.id && memberIds.includes(a.member_id));
        if (!assigned) return false;
        // Check not already responded
        const responded = memberIds.some(mid => allResponses.some(r => r.action_required_id === action.id && r.member_id === mid));
        return !responded;
      }).length;

      if (outstandingCount === 0) continue;

      try {
        await webpush.sendNotification(
          { endpoint: sub.subscription.endpoint, keys: sub.subscription.keys },
          JSON.stringify({
            title: '⏰ Actions Outstanding',
            body: `You have ${outstandingCount} outstanding action${outstandingCount > 1 ? 's' : ''} to complete`,
            url: '/app',
          })
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