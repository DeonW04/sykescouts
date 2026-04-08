import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

const createEmailTemplate = (childName, actionCount, actionSummary, entityName, dashboardLink) => `
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
    .message { color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
    .action-box { background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .action-item { margin: 8px 0; color: #1a1a1a; }
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
      <h1 class="title">${actionCount > 1 ? `${actionCount} Actions Required` : 'Action Required'} for ${childName}</h1>
      <p class="message">Hello,</p>
      <p class="message">${childName} has been added to <strong>${entityName}</strong> and there ${actionCount > 1 ? 'are actions' : 'is an action'} that need your response:</p>
      <div class="action-box">
        ${actionSummary}
        <div class="entity-title">${entityName}</div>
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

  // memberId: the newly added member
  // eventId: the event they were added to
  const { memberId, eventId } = await req.json();

  if (!memberId || !eventId) {
    return Response.json({ error: 'memberId and eventId are required' }, { status: 400 });
  }

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT'),
    Deno.env.get('VAPID_PUBLIC_KEY'),
    Deno.env.get('VAPID_PRIVATE_KEY')
  );

  // Get member
  const members = await base44.asServiceRole.entities.Member.filter({ id: memberId, active: true });
  if (members.length === 0) return Response.json({ error: 'Member not found' }, { status: 404 });
  const member = members[0];

  // Get open actions for this event
  const allActions = await base44.asServiceRole.entities.ActionRequired.filter({ event_id: eventId });
  const openActions = allActions.filter(a => a.is_open !== false && a.action_purpose !== 'volunteer');

  if (openActions.length === 0) {
    return Response.json({ success: true, message: 'No open actions for this event', emailsSent: 0, pushSent: 0 });
  }

  // Get event name
  const events = await base44.asServiceRole.entities.Event.filter({ id: eventId });
  const entityName = events.length > 0 ? (events[0].title || 'Event') : 'Event';

  const dashboardLink = `${req.headers.get('origin') || 'https://your-app.base44.io'}/app`;
  const now = new Date().toISOString();

  // Build action summary HTML
  const actionSummaryHtml = openActions.length === 1
    ? `<strong>${openActions[0].action_text}</strong>`
    : openActions.map(a => `<div class="action-item">• ${a.action_text}</div>`).join('');

  const subject = openActions.length > 1
    ? `${openActions.length} Actions Required for ${member.full_name} — ${entityName}`
    : `Action Required for ${member.full_name} — ${entityName}`;

  const pushBody = openActions.length > 1
    ? `${openActions.length} actions require your response for ${entityName}`
    : `${openActions[0].action_text} — ${entityName}`;

  const parentEmails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
  const emailPromises = [];
  const sentEmails = new Set();

  for (const email of parentEmails) {
    if (sentEmails.has(email)) continue;
    sentEmails.add(email);
    const isParentOne = email === member.parent_one_email;
    emailPromises.push(
      base44.asServiceRole.integrations.Core.SendEmail({
        from_name: '40th Rochdale Scouts',
        to: email,
        subject,
        body: createEmailTemplate(member.full_name, openActions.length, actionSummaryHtml, entityName, dashboardLink),
      })
      .then(() => base44.asServiceRole.entities.NotificationLog.create({
        recipient_name: isParentOne ? (member.parent_one_name || '') : (member.parent_two_name || ''),
        recipient_email: email,
        notification_type: 'email',
        subject,
        entity_type: 'event',
        entity_name: entityName,
        member_name: member.full_name,
        sent_at: now,
      }))
      .catch(err => console.error(`Email failed for ${email}:`, err))
    );
  }

  // Push: only send to subscribers matching parent emails
  let pushSent = 0;
  const allSubs = await base44.asServiceRole.entities.PushSubscription.filter({});
  const parentEmailSet = new Set(parentEmails.map(e => e.toLowerCase()));
  const targetSubs = allSubs.filter(s => s.user_email && parentEmailSet.has(s.user_email.toLowerCase()));

  const payload = JSON.stringify({ title: 'Action Required', body: pushBody, url: '/app' });

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
        subject: 'Action Required: ' + pushBody.substring(0, 80),
        entity_type: 'event',
        entity_name: entityName,
        member_name: member.full_name,
        sent_at: now,
      }).catch(() => {});
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await base44.asServiceRole.entities.PushSubscription.delete(sub.id).catch(() => {});
      }
    }
  }

  await Promise.all(emailPromises);

  return Response.json({ success: true, emailsSent: sentEmails.size, pushSent });
});