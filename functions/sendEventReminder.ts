import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const createReminderEmailTemplate = (childName, eventTitle, eventDate, eventTime, eventLocation, detailsLink) => {
  const formattedDate = new Date(eventDate).toLocaleDateString('en-GB', { 
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
        .logo { max-width: 240px; height: auto; }
        .content { padding: 40px 30px; }
        .title { color: #1a1a1a; font-size: 24px; font-weight: 600; margin: 0 0 20px 0; }
        .message { color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #7413dc, #5c0fb0); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; margin: 20px 0; }
        .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        .event-details { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0; border-radius: 4px; }
        .detail-row { margin: 10px 0; }
        .detail-label { font-weight: 600; color: #92400e; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png" alt="40th Rochdale Scouts" class="logo">
        </div>
        <div class="content">
          <h1 class="title">🔔 Event Reminder: ${eventTitle}</h1>
          <p class="message">Hello,</p>
          <p class="message">This is a friendly reminder that ${childName} is attending the following event:</p>
          
          <div class="event-details">
            <div class="detail-row">
              <span class="detail-label">Event:</span> ${eventTitle}
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span> ${formattedDate}
            </div>
            ${eventTime ? `<div class="detail-row"><span class="detail-label">Time:</span> ${eventTime}</div>` : ''}
            ${eventLocation ? `<div class="detail-row"><span class="detail-label">Location:</span> ${eventLocation}</div>` : ''}
          </div>

          <p class="message">Please ensure ${childName} is ready and has everything they need for the event.</p>
          <center>
            <a href="${detailsLink}" class="button">View Event Details</a>
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
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventId } = await req.json();

    // Get event details
    const events = await base44.asServiceRole.entities.Event.filter({ id: eventId });
    if (events.length === 0) {
      return Response.json({ error: 'Event not found' }, { status: 404 });
    }
    const event = events[0];

    // Get action required for this event
    const actions = await base44.asServiceRole.entities.ActionRequired.filter({ event_id: eventId });
    if (actions.length === 0) {
      return Response.json({ error: 'No action required found for this event' }, { status: 404 });
    }

    // Get all responses for attending members
    const allResponses = await base44.asServiceRole.entities.ActionResponse.filter({ 
      action_required_id: actions[0].id 
    });
    
    // Filter for "attending" responses
    const attendingResponses = allResponses.filter(r => 
      r.response && (r.response.toLowerCase() === 'attending' || r.response.toLowerCase() === 'yes')
    );

    if (attendingResponses.length === 0) {
      return Response.json({ message: 'No attending members found' }, { status: 200 });
    }

    // Get member details
    const memberIds = [...new Set(attendingResponses.map(r => r.member_id))];
    const allMembers = await base44.asServiceRole.entities.Member.filter({});
    const attendingMembers = allMembers.filter(m => memberIds.includes(m.id));

    const detailsLink = `${req.headers.get('origin') || 'https://your-app.base44.io'}/ParentEventDetail?id=${eventId}`;

    // Send emails
    const emailPromises = [];
    const sentEmails = new Set();

    for (const member of attendingMembers) {
      // Send to parent one
      if (member.parent_one_email && !sentEmails.has(member.parent_one_email)) {
        sentEmails.add(member.parent_one_email);
        emailPromises.push(
          base44.asServiceRole.integrations.Core.SendEmail({
            from_name: '40th Rochdale Scouts',
            to: member.parent_one_email,
            subject: `Reminder: ${event.title} - ${member.full_name}`,
            body: createReminderEmailTemplate(
              member.full_name, 
              event.title, 
              event.start_date,
              event.meeting_time,
              event.location,
              detailsLink
            )
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
            subject: `Reminder: ${event.title} - ${member.full_name}`,
            body: createReminderEmailTemplate(
              member.full_name, 
              event.title, 
              event.start_date,
              event.meeting_time,
              event.location,
              detailsLink
            )
          }).catch(err => console.error(`Failed to send to ${member.parent_two_email}:`, err))
        );
      }
    }

    await Promise.all(emailPromises);

    return Response.json({ 
      success: true, 
      emailsSent: sentEmails.size,
      message: `Reminder emails sent to ${sentEmails.size} parents for ${attendingMembers.length} attending members` 
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});