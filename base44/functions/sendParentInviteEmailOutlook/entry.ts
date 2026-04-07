import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

const APP_NAME = '40th Rochdale (Syke) Scouts Parent Portal';
const PORTAL_URL = 'https://your-app-url.com'; // Replace with your actual app URL

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { parentEmail, childName } = await req.json();

    if (!parentEmail || !childName) {
      return Response.json({ error: 'Missing parentEmail or childName' }, { status: 400 });
    }

    // Get the Outlook connection
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');

    // Build HTML email body with detailed PWA instructions
    const emailBody = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; }
      .header { background: linear-gradient(135deg, #7413dc 0%, #004851 100%); color: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px; }
      .header h1 { margin: 0; font-size: 24px; }
      .header p { margin: 10px 0 0 0; font-size: 14px; opacity: 0.9; }
      .content { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; }
      .section { margin-bottom: 25px; }
      .section h2 { color: #7413dc; font-size: 18px; margin-top: 0; }
      .section p { margin: 10px 0; }
      .step { background: #f0f0f0; padding: 15px; border-left: 4px solid #7413dc; margin: 12px 0; border-radius: 4px; }
      .step strong { color: #7413dc; }
      .highlight { background: #fff3cd; padding: 15px; border-radius: 4px; border-left: 4px solid #ffc107; margin: 15px 0; }
      .cta-button { display: inline-block; background: #7413dc; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 15px 0; }
      .footer { background: #f9f9f9; padding: 20px; text-align: center; font-size: 12px; color: #666; border-radius: 8px; }
      ul { margin: 10px 0; padding-left: 20px; }
      li { margin: 8px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Welcome to the Parent Portal 👋</h1>
        <p>${APP_NAME}</p>
      </div>

      <div class="content">
        <div class="section">
          <h2>Hello!</h2>
          <p>We're delighted that <strong>${childName}</strong> is part of our scouts community. We've set up a Parent Portal to keep you updated on meetings, events, badges, and more.</p>
        </div>

        <div class="section">
          <h2>Getting Started: Download the App</h2>
          <p>The easiest way to access the Parent Portal is by installing our Progressive Web App (PWA). It works like a mobile app but is accessed directly from your browser—no app store download needed!</p>
          
          <div class="step">
            <strong>Step 1: Open the Login Page</strong>
            <p>Visit the portal at: <a href="${PORTAL_URL}" style="color: #7413dc;">${PORTAL_URL}</a></p>
          </div>

          <div class="step">
            <strong>Step 2: Install the App (iOS & Android)</strong>
            <ul>
              <li><strong>iPhone/iPad:</strong> Tap the Share button (↑) → Scroll down and tap "Add to Home Screen" → Tap Add. The app will appear on your home screen.</li>
              <li><strong>Android:</strong> Tap the menu (⋮) in the top-right corner → Tap "Install app" or "Add to Home screen" → Tap Install. The app will appear on your home screen.</li>
            </ul>
            <p><em>Not seeing the install option? You can still use the web version directly in your browser.</em></p>
          </div>

          <div class="step">
            <strong>Step 3: Create an Account</strong>
            <p>On the login page, click "Sign up" or "Create Account"</p>
          </div>
        </div>

        <div class="highlight">
          <strong>⚠️ Important:</strong> When creating your account, the email address you use <strong>must match the email this message was sent to: <span style="color: #d9534f;">${parentEmail}</span></strong>. Otherwise, your account won't be linked to ${childName}'s profile.
        </div>

        <div class="section">
          <h2>After Creating Your Account</h2>
          <p>Once you've created your account, it won't be immediately active. For security and verification purposes, you'll need to:</p>
          <ol>
            <li><strong>Contact a section leader</strong> to authorize your account</li>
            <li>They'll verify your details and activate your access</li>
            <li>Once activated, you'll have full access to ${childName}'s information, upcoming meetings, events, and badge progress</li>
          </ol>
        </div>

        <div class="section">
          <h2>What Can You Do in the Portal?</h2>
          <ul>
            <li>📋 View your child's section, patrol, and contact details</li>
            <li>📅 See upcoming meetings and events</li>
            <li>🏅 Track badge progress and achievements</li>
            <li>📝 Respond to actions required by leaders</li>
            <li>📸 View photos from camps and events</li>
          </ul>
        </div>

        <div class="section">
          <h2>Need Help?</h2>
          <p>If you have any questions or run into issues:</p>
          <ul>
            <li>Contact a section leader directly</li>
            <li>Check the app for a help or support option</li>
          </ul>
        </div>

        <div style="text-align: center; margin-top: 30px;">
          <a href="${PORTAL_URL}" class="cta-button">Go to Parent Portal</a>
        </div>
      </div>

      <div class="footer">
        <p><strong>${APP_NAME}</strong></p>
        <p>This email was sent to ${parentEmail} because you're listed as a parent/guardian for ${childName}.</p>
      </div>
    </div>
  </body>
</html>
    `;

    // Send email via Microsoft Graph API
    const graphRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject: `${APP_NAME} – Get Started with the Parent Portal`,
          body: {
            contentType: 'HTML',
            content: emailBody,
          },
          toRecipients: [
            {
              emailAddress: {
                address: parentEmail,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
    });

    if (!graphRes.ok) {
      const err = await graphRes.text();
      return Response.json({ error: `Graph API error: ${err}` }, { status: graphRes.status });
    }

    return Response.json({ success: true, message: 'Invitation email sent' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});