import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const createMeetingReminderTemplate = (childName, meetingTitle, meetingDate, actionText, dashboardLink) => {
  const formattedDate = new Date(meetingDate).toLocaleDateString('en-GB', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

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
        .message { color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #7413dc, #5c0fb0); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
        .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        .urgent-box { background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .meeting-details { background-color: #f0f9ff; border-radius: 8px; padding: 16px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png" alt="40th Rochdale Scouts" class="logo">
        </div>
        <div class="content">
          <h1 class="title">⏰ Action Required Reminder</h1>
          <p class="message">Hello,</p>
          
          <div class="urgent-box">
            <strong style="color: #991b1b;">You haven't responded yet!</strong>
          </div>

          <p class="message">We noticed you haven't responded to the action required for ${childName} regarding the upcoming meeting:</p>
          
          <div class="meeting-details">
            <strong>${meetingTitle}</strong><br>
            ${formattedDate}<br><br>
            <em>${actionText}</em>
          </div>

          <p class="message">The meeting is in 2 days. Please respond as soon as possible so we can plan accordingly.</p>
          <center>
            <a href="${dashboardLink}" class="button">Respond Now</a>
          </center>
        </div>
        <div class="footer">
          <p>40th Rochdale (Syke) Scouts</p>
          <p>This is an automated reminder. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function is called by automation, so we use service role
    // Get all programmes in 2 days
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const targetDate = twoDaysFromNow.toISOString().split('T')[0];

    const programmes = await base44.asServiceRole.entities.Programme.filter({ date: targetDate });

    if (programmes.length === 0) {
      return Response.json({ message: 'No programmes found for 2 days from now' });
    }

    const dashboardLink = `${req.headers.get('origin') || 'https://your-app.base44.io'}/ParentDashboard`;
    let totalEmailsSent = 0;

    // Process each programme
    for (const programme of programmes) {
      // Get action required for this programme
      const actions = await base44.asServiceRole.entities.ActionRequired.filter({ 
        programme_id: programme.id,
        is_open: true 
      });

      if (actions.length === 0) continue;

      // Get all members
      const allMembers = await base44.asServiceRole.entities.Member.filter({ active: true });

      for (const action of actions) {
        // Get existing responses
        const existingResponses = await base44.asServiceRole.entities.ActionResponse.filter({ 
          action_required_id: action.id 
        });

        // Find members who haven't responded
        const respondedMemberIds = new Set(existingResponses.map(r => r.member_id));
        const membersWithoutResponse = allMembers.filter(m => !respondedMemberIds.has(m.id));

        // Send reminder emails
        const sentEmails = new Set();

        for (const member of membersWithoutResponse) {
          // Send to parent one
          if (member.parent_one_email && !sentEmails.has(member.parent_one_email)) {
            sentEmails.add(member.parent_one_email);
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: '40th Rochdale Scouts',
              to: member.parent_one_email,
              subject: `Reminder: Action Required for ${member.full_name}`,
              body: createMeetingReminderTemplate(
                member.full_name,
                programme.title || 'Meeting',
                programme.date,
                action.action_text,
                dashboardLink
              )
            }).catch(err => console.error(`Failed to send to ${member.parent_one_email}:`, err));
          }

          // Send to parent two
          if (member.parent_two_email && !sentEmails.has(member.parent_two_email)) {
            sentEmails.add(member.parent_two_email);
            await base44.asServiceRole.integrations.Core.SendEmail({
              from_name: '40th Rochdale Scouts',
              to: member.parent_two_email,
              subject: `Reminder: Action Required for ${member.full_name}`,
              body: createMeetingReminderTemplate(
                member.full_name,
                programme.title || 'Meeting',
                programme.date,
                action.action_text,
                dashboardLink
              )
            }).catch(err => console.error(`Failed to send to ${member.parent_two_email}:`, err));
          }
        }

        totalEmailsSent += sentEmails.size;
      }
    }

    return Response.json({ 
      success: true,
      emailsSent: totalEmailsSent,
      message: `Sent ${totalEmailsSent} reminder emails for ${programmes.length} programmes`
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});