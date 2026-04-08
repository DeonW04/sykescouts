import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

const createEmailTemplate = (childName, actionText, entityName, dashboardLink) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #7413dc 0%, #004851 100%); padding: 40px 20px; text-align: center; }
    .logo { max-width: 240px; height: auto; }
    .content { padding: 40px 30px; }
    .title { color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; }
    .message { color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; }
    .action-box { background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .entity-title { color: #6b7280; font-size: 14px; margin-top: 8px; font-style: italic; }
    .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png" alt="40th Rochdale Scouts" class="logo">
    </div>
    <div class="content">
      <h1 class="title">Action Required for ${childName}</h1>
      <p class="message">Hello,</p>
      <p class="message">You have a new action required for ${childName}:</p>
      <div class="action-box">
        <strong>${actionText}</strong>
        ${entityName ? `<div class="entity-title">${entityName}</div>` : ''}
      </div>
      <p class="message">Please log in to your parent portal to respond.</p>
      <center>
        <a href="${dashboardLink}" style="display: inline-block; background-color: #7413dc; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0;">Go to Parent Portal</a>
      </center>
    </div>
    <div class="footer">
      <p>40th Rochdale (Syke) Scouts</p>
      <p>This is an automated message. Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
`;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { actionRequiredId, entityType, sendEmail = true, sendPush = true } = await req.json();

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT'),
    Deno.env.get('VAPID_PUBLIC_KEY'),
    Deno.env.get('VAPID_PRIVATE_KEY')
  );

  const actions = await base44.asServiceRole.entities.ActionRequired.filter({ id: actionRequiredId });
  if (actions.length === 0) return Response.json({ error: 'Action not found' }, { status: 404 });
  const action = actions[0];

  await base44.asServiceRole.entities.ActionRequired.update(actionRequiredId, {
    reminder_sent_at: new Date().toISOString(),
  });

  let entityName = '';
  if (entityType === 'programme' && action.programme_id) {
    const progs = await base44.asServiceRole.entities.Programme.filter({ id: action.programme_id });
    if (progs.length > 0) entityName = progs[0].title || 'Meeting';
  } else if (entityType === 'event' && action.event_id) {
    const events = await base44.asServiceRole.entities.Event.filter({ id: action.event_id });
    if (events.length > 0) entityName = events[0].title || 'Event';
  }

  const existingResponses = await base44.asServiceRole.entities.ActionResponse.filter({ action_required_id: actionRequiredId });

  let outstandingMemberIds = [];

  if (action.action_purpose === 'volunteer') {
    // For volunteer: notify all relevant members who haven't responded yet
    // Event = invited members; Meeting = section members
    if (action.event_id) {
      const attendances = await base44.asServiceRole.entities.EventAttendance.filter({ event_id: action.event_id });
      outstandingMemberIds = attendances.map(a => a.member_id);
    } else if (action.programme_id) {
      const progs = await base44.asServiceRole.entities.Programme.filter({ id: action.programme_id });
      if (progs.length > 0 && progs[0].section_id) {
        const members = await base44.asServiceRole.entities.Member.filter({ section_id: progs[0].section_id, active: true });
        outstandingMemberIds = members.map(m => m.id);
      }
    }
    // Filter out those who already responded
    const respondedMemberIds = new Set(existingResponses.filter(r => r.response_value).map(r => r.member_id));
    outstandingMemberIds = outstandingMemberIds.filter(id => !respondedMemberIds.has(id));
  } else {
    // Only notify members who are ASSIGNED and haven't responded
    const assignments = await base44.asServiceRole.entities.ActionAssignment.filter({ action_required_id: actionRequiredId });
    const assignedMemberIds = assignments.map(a => a.member_id);
    const respondedMemberIds = new Set(existingResponses.filter(r => r.response_value).map(r => r.member_id));
    outstandingMemberIds = assignedMemberIds.filter(id => !respondedMemberIds.has(id));
  }

  const allMembers = await base44.asServiceRole.entities.Member.filter({ active: true });
  const memberMap = Object.fromEntries(allMembers.map(m => [m.id, m]));

  const dashboardLink = `${req.headers.get('origin') || 'https://your-app.base44.io'}/app`;
  const promises = [];
  const parentEmailsSent = new Set();
  const now = new Date().toISOString();

  // Collect all parent emails for push matching
  const parentEmailsForPush = new Set();
  for (const memberId of outstandingMemberIds) {
    const member = memberMap[memberId];
    if (!member) continue;
    if (member.parent_one_email) parentEmailsForPush.add(member.parent_one_email.toLowerCase());
    if (member.parent_two_email) parentEmailsForPush.add(member.parent_two_email.toLowerCase());
  }

  if (sendEmail) {
    for (const memberId of outstandingMemberIds) {
      const member = memberMap[memberId];
      if (!member) continue;
      const emails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
      for (const email of emails) {
        if (parentEmailsSent.has(email)) continue;
        parentEmailsSent.add(email);
        const subject = action.action_purpose === 'volunteer'
          ? `Volunteer Request: ${action.action_text.substring(0, 60)}${entityName ? ' — ' + entityName : ''}`
          : `Action Required for ${member.full_name}`;
        promises.push(
          base44.asServiceRole.integrations.Core.SendEmail({
            from_name: '40th Rochdale Scouts',
            to: email,
            subject,
            body: createEmailTemplate(member.full_name, action.action_text, entityName, dashboardLink),
          })
          .then(() => base44.asServiceRole.entities.NotificationLog.create({
            recipient_name: email === member.parent_one_email ? (member.parent_one_name || '') : (member.parent_two_name || ''),
            recipient_email: email,
            notification_type: 'email',
            subject,
            action_required_id: actionRequiredId,
            entity_type: entityType,
            entity_name: entityName,
            member_name: member.full_name,
            sent_at: now,
          }))
          .catch(err => console.error(`Email failed for ${email}:`, err))
        );
      }
    }
  }

  let pushSent = 0;
  if (sendPush) {
    // Only send push to subscribers whose email matches a parent of an outstanding member
    const allSubs = await base44.asServiceRole.entities.PushSubscription.filter({});
    const targetSubs = allSubs.filter(s => s.user_email && parentEmailsForPush.has(s.user_email.toLowerCase()));

    const payload = JSON.stringify({
      title: 'Action Required',
      body: action.action_text + (entityName ? ` — ${entityName}` : ''),
      url: '/app',
    });

    for (const sub of targetSubs) {
      if (!sub.subscription?.endpoint) continue;
      const pushSubscription = {
        endpoint: sub.subscription.endpoint,
        keys: { p256dh: sub.subscription.keys.p256dh, auth: sub.subscription.keys.auth },
      };
      try {
        await webpush.sendNotification(pushSubscription, payload);
        pushSent++;
        await base44.asServiceRole.entities.NotificationLog.create({
          recipient_name: sub.user_email,
          recipient_email: sub.user_email,
          notification_type: 'push',
          subject: 'Action Required: ' + action.action_text.substring(0, 60),
          action_required_id: actionRequiredId,
          entity_type: entityType,
          entity_name: entityName,
          member_name: '',
          sent_at: now,
        }).catch(() => {});
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await base44.asServiceRole.entities.PushSubscription.delete(sub.id).catch(() => {});
        }
      }
    }
  }

  await Promise.all(promises);

  return Response.json({ success: true, emailsSent: parentEmailsSent.size, pushSent });
});