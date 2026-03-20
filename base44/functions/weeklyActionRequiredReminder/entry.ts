import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const createReminderTemplate = (parentName, childrenWithActions, dashboardLink) => {
  const totalActions = childrenWithActions.reduce((sum, child) => sum + child.actionCount, 0);

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
        .logo { max-width: 240px; height: auto; }
        .content { padding: 40px 30px; }
        .title { color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; }
        .message { color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
        .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        .urgent-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .child-item { background-color: #f9fafb; padding: 12px; margin: 10px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png" alt="40th Rochdale Scouts" class="logo">
        </div>
        <div class="content">
          <h1 class="title">⏰ Weekly Action Required Reminder</h1>
          <p class="message">Hello ${parentName},</p>
          
          <div class="urgent-box">
            <strong style="color: #991b1b;">You have ${totalActions} unresponded action${totalActions === 1 ? '' : 's'} required</strong>
          </div>

          <p class="message">The following items need your response:</p>
          
          ${childrenWithActions.map(child => `
            <div class="child-item">
              <strong>${child.childName}</strong> - ${child.actionCount} pending response${child.actionCount === 1 ? '' : 's'}
            </div>
          `).join('')}

          <p class="message">Please log in to your parent portal to respond to these items.</p>
          <center>
            <a href="${dashboardLink}" style="display: inline-block; background-color: #7413dc; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0;">Go to Parent Portal</a>
          </center>
        </div>
        <div class="footer">
          <p>40th Rochdale (Syke) Scouts</p>
          <p>This is an automated weekly reminder. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all open action requireds
    const allActions = await base44.asServiceRole.entities.ActionRequired.filter({ is_open: true });

    if (allActions.length === 0) {
      return Response.json({ message: 'No open actions found' });
    }

    // Get all responses
    const allResponses = await base44.asServiceRole.entities.ActionResponse.filter({});
    
    // Get all members
    const allMembers = await base44.asServiceRole.entities.Member.filter({ active: true });

    const dashboardLink = `${req.headers.get('origin') || 'https://your-app.base44.io'}/ParentDashboard`;
    
    // Track emails per parent
    const parentEmails = new Map();

    // Check each member for unresponded actions
    for (const member of allMembers) {
      const memberActions = allActions.filter(action => 
        (action.programme_id && !action.event_id) || 
        (action.event_id && !action.programme_id)
      );

      const unrespondedActions = memberActions.filter(action => {
        const hasResponse = allResponses.some(r => 
          r.action_required_id === action.id && r.member_id === member.id
        );
        return !hasResponse;
      });

      if (unrespondedActions.length > 0) {
        // Add to parent one's list
        if (member.parent_one_email) {
          if (!parentEmails.has(member.parent_one_email)) {
            parentEmails.set(member.parent_one_email, {
              parentName: member.parent_one_name || 'Parent',
              children: []
            });
          }
          parentEmails.get(member.parent_one_email).children.push({
            childName: member.full_name,
            actionCount: unrespondedActions.length
          });
        }

        // Add to parent two's list
        if (member.parent_two_email) {
          if (!parentEmails.has(member.parent_two_email)) {
            parentEmails.set(member.parent_two_email, {
              parentName: member.parent_two_name || 'Parent',
              children: []
            });
          }
          parentEmails.get(member.parent_two_email).children.push({
            childName: member.full_name,
            actionCount: unrespondedActions.length
          });
        }
      }
    }

    // Send emails
    const emailPromises = [];
    for (const [email, data] of parentEmails) {
      emailPromises.push(
        base44.asServiceRole.integrations.Core.SendEmail({
          from_name: '40th Rochdale Scouts',
          to: email,
          subject: 'Weekly Reminder: Action Required Responses Needed',
          body: createReminderTemplate(data.parentName, data.children, dashboardLink)
        }).catch(err => console.error(`Failed to send to ${email}:`, err))
      );
    }

    await Promise.all(emailPromises);

    return Response.json({ 
      success: true,
      emailsSent: parentEmails.size,
      message: `Sent weekly reminders to ${parentEmails.size} parents`
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});