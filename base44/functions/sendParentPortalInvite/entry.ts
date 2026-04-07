import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const createInviteEmailTemplate = (parentName, childName, parentEmail) => {
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
        .subtitle { color: #1a1a1a; font-size: 18px; font-weight: 600; margin: 25px 0 15px 0; }
        .message { color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0 0 15px 0; }
        .step-box { background-color: #f3f4f6; border-left: 4px solid #7413dc; padding: 15px; margin: 15px 0; border-radius: 4px; }
        .step-number { background-color: #7413dc; color: white; border-radius: 50%; width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 10px; }
        .warning-box { background-color: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 6px; }
        .warning-title { color: #92400e; font-weight: 600; margin: 0 0 8px 0; }
        .warning-text { color: #78350f; margin: 0; font-size: 14px; }
        .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #6b7280; font-size: 14px; }
        .benefit-item { margin: 10px 0; color: #065f46; }
        code { background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png" alt="40th Rochdale Scouts" class="logo">
        </div>
        <div class="content">
          <h1 class="title">Welcome to 40th Rochdale Scouts Parent Portal!</h1>
          <p class="message">Hello ${parentName},</p>
          <p class="message">Great news! You've been invited to join the 40th Rochdale Scouts Parent Portal for <strong>${childName}</strong>. This portal gives you direct access to your child's scouting information, upcoming events, and much more.</p>

          <h2 class="subtitle">How to Get Started</h2>
          
          <div class="step-box">
            <span class="step-number">1</span>
            <strong>Download the PWA App</strong>
            <p class="message" style="margin-top: 8px;">We recommend downloading our app for the best experience:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li><strong>iOS:</strong> Open our website in Safari, tap the Share button, and select "Add to Home Screen"</li>
              <li><strong>Android:</strong> Open our website in Chrome, tap the three-dot menu, and select "Install app" or "Add to Home Screen"</li>
            </ul>
          </div>

          <div class="step-box">
            <span class="step-number">2</span>
            <strong>Create Your Account</strong>
            <p class="message" style="margin-top: 8px;">Visit the login page and click "Create an account". When signing up:</p>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>Use <strong>this email address: <code>${parentEmail}</code></strong></li>
              <li>Create a secure password</li>
              <li>Complete your profile information</li>
            </ul>
          </div>

          <div class="warning-box">
            <div class="warning-title">⚠️ Important: Account Authorization Required</div>
            <div class="warning-text">
              Once you've created your account, your account will be pending approval. <strong>You must contact a leader from 40th Rochdale Scouts to authorize your account</strong> before you can access the parent portal. Please reach out to a leader with your account details.
            </div>
          </div>

          <h2 class="subtitle">What You Can Access</h2>
          <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <ul style="margin: 0; padding-left: 20px;">
              <li class="benefit-item">View upcoming meetings and events</li>
              <li class="benefit-item">RSVP to events and confirm attendance</li>
              <li class="benefit-item">Track ${childName}'s badge progress</li>
              <li class="benefit-item">View photos from scouts activities</li>
              <li class="benefit-item">Receive important updates and announcements</li>
            </ul>
          </div>

          <p class="message" style="color: #6b7280; font-size: 14px; margin-top: 30px;">If you experience any issues or have questions, please don't hesitate to contact a leader at 40th Rochdale Scouts.</p>
        </div>
        <div class="footer">
          <p><strong>40th Rochdale (Syke) Scouts</strong></p>
          <p style="margin-top: 10px; color: #9ca3af; font-size: 12px;">This is an automated message. Please do not reply to this email.</p>
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

    // Send via Outlook using Microsoft Graph API
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');

    const emailBody = {
      message: {
        subject: 'Welcome to 40th Rochdale Scouts Parent Portal - Action Required',
        body: {
          contentType: 'HTML',
          content: createInviteEmailTemplate(parentName, childName, parentEmail)
        },
        toRecipients: [
          {
            emailAddress: {
              address: parentEmail
            }
          }
        ]
      },
      saveToSentItems: true
    };

    const response = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailBody)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Outlook API error: ${response.status} - ${error}`);
    }

    return Response.json({ 
      success: true,
      message: `Invitation sent to ${parentEmail}` 
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});