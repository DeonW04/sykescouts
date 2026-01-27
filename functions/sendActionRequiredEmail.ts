import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const createEmailTemplate = (childName, actionText, entityName, dashboardLink) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
        .header { background: linear-gradient(135deg, #7413dc 0%, #004851 100%); padding: 40px 20px; text-align: center; }
        .logo { max-width: 120px; height: auto; }
        .content { padding: 40px 30px; }
        .title { color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; }
        .message { color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #7413dc, #5c0fb0); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
        .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        .action-box { background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 4px; }
        .entity-title { color: #6b7280; font-size: 14px; margin-top: 8px; font-style: italic; }
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
            <a href="${dashboardLink}" class="button">Go to Parent Portal</a>
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
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { actionRequiredId, entityType } = await req.json();

    // Get action required details
    const actions = await base44.asServiceRole.entities.ActionRequired.filter({ id: actionRequiredId });
    if (actions.length === 0) {
      return Response.json({ error: 'Action required not found' }, { status: 404 });
    }
    const action = actions[0];

    // Get entity (Programme or Event)
    let entityName, entityDate;
    if (entityType === 'programme') {
      const programmes = await base44.asServiceRole.entities.Programme.filter({ id: action.programme_id });
      if (programmes.length > 0) {
        entityName = programmes[0].title || 'Meeting';
        entityDate = programmes[0].date;
      }
    } else if (entityType === 'event') {
      const events = await base44.asServiceRole.entities.Event.filter({ id: action.event_id });
      if (events.length > 0) {
        entityName = events[0].title || 'Event';
        entityDate = events[0].start_date;
      }
    }

    // Get all members for this entity
    const allMembers = await base44.asServiceRole.entities.Member.filter({ active: true });
    
    // Get existing responses to see who hasn't responded
    const existingResponses = await base44.asServiceRole.entities.ActionResponse.filter({ 
      action_required_id: actionRequiredId 
    });

    const dashboardLink = `${req.headers.get('origin') || 'https://your-app.base44.io'}/ParentDashboard`;

    // Send emails to all parents
    const emailPromises = [];
    const sentEmails = new Set();

    for (const member of allMembers) {
      // Check if already responded
      const hasResponded = existingResponses.some(r => r.member_id === member.id);
      if (hasResponded) continue;

      // Send to parent one
      if (member.parent_one_email && !sentEmails.has(member.parent_one_email)) {
        sentEmails.add(member.parent_one_email);
        emailPromises.push(
          base44.asServiceRole.integrations.Core.SendEmail({
            from_name: '40th Rochdale Scouts',
            to: member.parent_one_email,
            subject: `Action Required for ${member.full_name}`,
            body: createEmailTemplate(member.full_name, action.action_text, entityName, dashboardLink)
          }).catch(err => console.error(`Failed to send to ${member.parent_one_email}:`, err))
        );
      }

      // Send to parent two
      if (member.parent_two_email && !sentEmails.has(member.parent_two_email)) {
        sentEmails.add(member.parent_two_email);
        emailPromises.push(
          base44.asServiceRole.integrations.Core.SendEmail({
            from_name: '40th Rochdale Scouts',
            to: member.parent_two_email,
            subject: `Action Required for ${member.full_name}`,
            body: createEmailTemplate(member.full_name, action.action_text, entityName, dashboardLink)
          }).catch(err => console.error(`Failed to send to ${member.parent_two_email}:`, err))
        );
      }
    }

    await Promise.all(emailPromises);

    return Response.json({ 
      success: true, 
      emailsSent: sentEmails.size,
      message: `Action required emails sent to ${sentEmails.size} parents` 
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});