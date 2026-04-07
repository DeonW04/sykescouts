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
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { actionRequiredId, memberId } = await req.json();

    // Set up VAPID
    webpush.setVapidDetails(
      Deno.env.get('VAPID_SUBJECT'),
      Deno.env.get('VAPID_PUBLIC_KEY'),
      Deno.env.get('VAPID_PRIVATE_KEY')
    );

    // Get action
    const actions = await base44.asServiceRole.entities.ActionRequired.filter({ id: actionRequiredId });
    if (actions.length === 0) return Response.json({ error: 'Action not found' }, { status: 404 });
    const action = actions[0];

    // Get member
    const members = await base44.asServiceRole.entities.Member.filter({ id: memberId });
    if (members.length === 0) return Response.json({ error: 'Member not found' }, { status: 404 });
    const member = members[0];

    // Get entity name
    let entityName = '';
    if (action.programme_id) {
      const progs = await base44.asServiceRole.entities.Programme.filter({ id: action.programme_id });
      if (progs.length > 0) entityName = progs[0].title || 'Meeting';
    } else if (action.event_id) {
      const events = await base44.asServiceRole.entities.Event.filter({ id: action.event_id });
      if (events.length > 0) entityName = events[0].title || 'Event';
    }

    const dashboardLink = `${req.headers.get('origin') || 'https://your-app.base44.io'}/app`;
    const promises = [];

    // Send emails to both parents
    const parentEmails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
    for (const email of parentEmails) {
      promises.push(
        base44.asServiceRole.integrations.Core.SendEmail({
          from_name: '40th Rochdale Scouts',
          to: email,
          subject: `Action Required for ${member.full_name}`,
          body: createEmailTemplate(member.full_name, action.action_text, entityName, dashboardLink)
        }).catch(err => console.error(`Email failed for ${email}:`, err))
      );
    }

    // Send push notifications to all registered users
    const allSubs = await base44.asServiceRole.entities.PushSubscription.filter({});
    const payload = JSON.stringify({
      title: 'Action Required',
      body: action.action_text + (entityName ? ` — ${entityName}` : ''),
      url: '/app'
    });

    for (const sub of allSubs) {
      if (!sub.subscription?.endpoint) continue;
      try {
        await webpush.sendNotification(sub.subscription, payload);
        console.log(`Push sent to ${sub.user_email}`);
      } catch (err) {
        console.error(`Push failed for ${sub.user_email}:`, err.message);
        // Remove stale subscriptions (410 Gone)
        if (err.statusCode === 410 || err.statusCode === 403) {
          await base44.asServiceRole.entities.PushSubscription.delete(sub.id).catch(() => {});
        }
      }
    }

    await Promise.all(promises);

    return Response.json({
      success: true,
      emailsSent: parentEmails.length
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});