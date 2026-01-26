import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const createInviteEmailTemplate = (parentName, childName, inviteLink) => {
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
        .benefits { background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .benefits ul { margin: 10px 0; padding-left: 20px; }
        .benefits li { margin: 8px 0; color: #065f46; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png" alt="40th Rochdale Scouts" class="logo">
        </div>
        <div class="content">
          <h1 class="title">You're Invited to the Parent Portal</h1>
          <p class="message">Hello ${parentName},</p>
          <p class="message">You've been invited to access the 40th Rochdale Scouts Parent Portal for ${childName}. Our parent portal makes it easy to stay connected with your child's scouting journey.</p>
          
          <div class="benefits">
            <strong style="color: #065f46; font-size: 18px;">With the Parent Portal you can:</strong>
            <ul>
              <li>View upcoming meetings and events</li>
              <li>Respond to attendance requests</li>
              <li>Track your child's badge progress</li>
              <li>Access important information and updates</li>
              <li>View photos from events and activities</li>
            </ul>
          </div>

          <p class="message">Click the button below to create your account and get started:</p>
          <center>
            <a href="${inviteLink}" class="button">Create Your Account</a>
          </center>
          <p class="message" style="font-size: 14px; color: #6b7280;">If you have any questions, please don't hesitate to contact us.</p>
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

    const { parentEmail, parentName, childName } = await req.json();

    if (!parentEmail || !parentName || !childName) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const inviteLink = `${req.headers.get('origin') || 'https://your-app.base44.io'}/`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      from_name: '40th Rochdale Scouts',
      to: parentEmail,
      subject: 'Invitation to 40th Rochdale Scouts Parent Portal',
      body: createInviteEmailTemplate(parentName, childName, inviteLink)
    });

    return Response.json({ 
      success: true,
      message: `Invitation sent to ${parentEmail}` 
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});