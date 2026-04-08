import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

const emailTemplate = (parentName, childName, volunteerText, entityName, entityDate, entityLocation, dashboardLink) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #166534 0%, #15803d 100%); padding: 40px 20px; text-align: center; }
    .logo { max-width: 240px; height: auto; }
    .content { padding: 40px 30px; }
    .title { color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; }
    .message { color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
    .highlight-box { background-color: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 20px 0; border-radius: 4px; }
    .detail { display: flex; gap: 8px; margin: 8px 0; font-size: 14px; color: #374151; }
    .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png" alt="40th Rochdale Scouts" class="logo">
    </div>
    <div class="content">
      <h1 class="title">🙋 Volunteer Reminder — Tomorrow!</h1>
      <p class="message">Hi ${parentName || 'there'},</p>
      <p class="message">This is a friendly reminder that you have volunteered to help at a Scout event tomorrow.</p>
      <div class="highlight-box">
        <strong>${volunteerText}</strong>
        <div class="detail">📅 <strong>${entityName}</strong></div>
        ${entityDate ? `<div class="detail">🗓 ${entityDate}</div>` : ''}
        ${entityLocation ? `<div class="detail">📍 ${entityLocation}</div>` : ''}
      </div>
      <p class="message">Thank you so much for supporting ${childName ? childName + ' and' : ''} the group!</p>
      <center>
        <a href="${dashboardLink}" style="display: inline-block; background-color: #166534; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0;">View Details</a>
      </center>
    </div>
    <div class="footer">
      <p>40th Rochdale (Syke) Scouts</p>
    </div>
  </div>
</body>
</html>
`;

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  webpush.setVapidDetails(
    Deno.env.get('VAPID_SUBJECT'),
    Deno.env.get('VAPID_PUBLIC_KEY'),
    Deno.env.get('VAPID_PRIVATE_KEY')
  );

  const now = new Date();
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  // Find all open volunteer actions not yet reminded
  const allActions = await base44.asServiceRole.entities.ActionRequired.filter({});
  const volunteerActions = allActions.filter(a =>
    a.action_purpose === 'volunteer' &&
    a.is_open !== false &&
    !a.day_before_reminder_sent
  );

  if (volunteerActions.length === 0) {
    return Response.json({ success: true, reminded: 0, message: 'No volunteer actions to remind' });
  }

  // Get all events and programmes to match dates
  const [allEvents, allProgrammes] = await Promise.all([
    base44.asServiceRole.entities.Event.filter({}),
    base44.asServiceRole.entities.Programme.filter({}),
  ]);

  const allMembers = await base44.asServiceRole.entities.Member.filter({ active: true });
  const memberMap = Object.fromEntries(allMembers.map(m => [m.id, m]));

  const allSubs = await base44.asServiceRole.entities.PushSubscription.filter({});

  let totalReminded = 0;

  for (const action of volunteerActions) {
    let entityDate = null;
    let entityName = '';
    let entityLocation = '';

    if (action.event_id) {
      const event = allEvents.find(e => e.id === action.event_id);
      if (!event) continue;
      entityDate = new Date(event.start_date);
      entityName = event.title;
      entityLocation = event.location || '';
    } else if (action.programme_id) {
      const prog = allProgrammes.find(p => p.id === action.programme_id);
      if (!prog) continue;
      entityDate = new Date(prog.date);
      entityName = prog.title;
      entityLocation = prog.optional_location || '';
    }

    if (!entityDate) continue;

    // Only remind if the event is tomorrow
    if (entityDate < tomorrowStart || entityDate > tomorrowEnd) continue;

    // Get all positive volunteer responses for this action
    const responses = await base44.asServiceRole.entities.ActionResponse.filter({ action_required_id: action.id });
    const yesResponses = responses.filter(r => r.response_value === 'Yes, I will volunteer');
    if (yesResponses.length === 0) continue;

    const dateStr = entityDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const dashboardLink = 'https://your-app.base44.io/app';

    const sentEmails = new Set();

    for (const resp of yesResponses) {
      const member = memberMap[resp.member_id];
      if (!member) continue;

      const parentEmails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
      for (const email of parentEmails) {
        if (sentEmails.has(email)) continue;
        sentEmails.add(email);

        const isP1 = email === member.parent_one_email;
        const parentName = isP1 ? (member.parent_one_name || '') : (member.parent_two_name || '');

        // Send email
        await base44.asServiceRole.integrations.Core.SendEmail({
          from_name: '40th Rochdale Scouts',
          to: email,
          subject: `Volunteer Reminder: ${entityName} — Tomorrow!`,
          body: emailTemplate(parentName, member.full_name, action.action_text, entityName, dateStr, entityLocation, dashboardLink),
        }).catch(err => console.error('Email error:', err));

        // Send push
        const subForEmail = allSubs.filter(s => s.user_email?.toLowerCase() === email.toLowerCase());
        for (const sub of subForEmail) {
          if (!sub.subscription?.endpoint) continue;
          await webpush.sendNotification(
            { endpoint: sub.subscription.endpoint, keys: { p256dh: sub.subscription.keys.p256dh, auth: sub.subscription.keys.auth } },
            JSON.stringify({
              title: '🙋 Volunteer Reminder',
              body: `You volunteered to help at ${entityName} — tomorrow! ${entityLocation ? '📍 ' + entityLocation : ''}`,
              url: '/app',
            })
          ).catch(() => {});
        }

        totalReminded++;
      }
    }

    // Mark as reminded
    await base44.asServiceRole.entities.ActionRequired.update(action.id, { day_before_reminder_sent: true });
  }

  return Response.json({ success: true, reminded: totalReminded });
});