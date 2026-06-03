import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const FROM_ADDRESS = 'deon@sykescouts.org';
const APP_BASE_URL = 'https://sykescouts.org';
const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png';

const buildEmail = (parentName, childName, link) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; }
    .header { background: linear-gradient(135deg, #7413dc 0%, #004851 100%); padding: 40px 20px; text-align: center; }
    .logo { max-width: 220px; height: auto; filter: brightness(0) invert(1); }
    .content { padding: 40px 30px; }
    .title { color: #1a1a2e; font-size: 24px; font-weight: 700; margin: 0 0 20px 0; }
    .message { color: #4a5568; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; }
    .cta-wrap { text-align: center; margin: 32px 0; }
    .cta-button { display: inline-block; background: #7413dc; color: #ffffff !important; padding: 15px 38px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; }
    .link-fallback { word-break: break-all; color: #7413dc; font-size: 13px; }
    .info-box { background-color: #f6f0ff; border-left: 4px solid #7413dc; padding: 16px 18px; margin: 24px 0; border-radius: 6px; color: #4a3a6b; font-size: 14px; line-height: 1.6; }
    .benefits { background-color: #f0fdf4; border-radius: 10px; padding: 18px 22px; margin: 24px 0; }
    .benefits li { color: #065f46; margin: 8px 0; }
    .footer { background-color: #f9fafb; padding: 28px 30px; text-align: center; color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="40th Rochdale (Syke) Scouts" class="logo">
    </div>
    <div class="content">
      <h1 class="title">You're invited to the Parent Portal</h1>
      <p class="message">Hello ${parentName},</p>
      <p class="message">We've set up a Parent Portal account for you to keep up with everything <strong>${childName}</strong> gets up to at 40th Rochdale (Syke) Scouts — meetings, events, badge progress, payments and more.</p>
      <p class="message">Click the button below to create your account. It's all set up for you — just choose a password.</p>

      <div class="cta-wrap">
        <a href="${link}" class="cta-button">Create My Account</a>
      </div>

      <p class="message" style="font-size: 13px; color: #94a3b8;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p class="link-fallback">${link}</p>

      <div class="info-box">
        🔒 This link is unique to you and will expire in 14 days. It automatically connects your account to ${childName}'s profile, so there's nothing else to set up.
      </div>

      <div class="benefits">
        <strong style="color:#065f46;">What you'll be able to do:</strong>
        <ul style="margin: 10px 0 0; padding-left: 20px;">
          <li>📅 See upcoming meetings and events</li>
          <li>🏅 Track ${childName}'s badge progress</li>
          <li>📝 Respond to consent forms and actions</li>
          <li>📸 View photos from camps and events</li>
          <li>💳 Manage subscriptions and payments</li>
        </ul>
      </div>

      <p class="message" style="color: #6b7280; font-size: 14px;">If you have any questions, just reply to a section leader and we'll be happy to help.</p>
    </div>
    <div class="footer">
      <p><strong>40th Rochdale (Syke) Scouts</strong></p>
      <p style="margin-top: 8px; color: #9ca3af; font-size: 12px;">This invitation was sent to you because you're listed as a parent/guardian for ${childName}.</p>
    </div>
  </div>
</body>
</html>
`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { parentEmail, parentName, childName, memberId, parentSlot } = await req.json();
    if (!parentEmail || !memberId) {
      return Response.json({ error: 'Missing parentEmail or memberId' }, { status: 400 });
    }

    // Generate a unique token
    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    // Expire any previous pending invites for this email + member
    const existing = await base44.asServiceRole.entities.RegistrationInvite.filter({
      parent_email: parentEmail,
      member_id: memberId,
      status: 'pending',
    });
    for (const inv of existing) {
      await base44.asServiceRole.entities.RegistrationInvite.update(inv.id, { status: 'expired' });
    }

    await base44.asServiceRole.entities.RegistrationInvite.create({
      token,
      member_id: memberId,
      parent_email: parentEmail,
      parent_name: parentName || 'Parent',
      child_name: childName || '',
      parent_slot: parentSlot || 'parent_one',
      status: 'pending',
      expires_at: expiresAt,
      sent_by: user.id,
    });

    const link = `${APP_BASE_URL}/register?token=${token}`;

    // Send from noreply@sykescouts.org via the connected Outlook mailbox.
    // Requires the connected account to have Send-As / shared mailbox rights for this address.
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');

    const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/sendMail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject: 'Your 40th Rochdale Scouts Parent Portal invitation',
          body: { contentType: 'HTML', content: buildEmail(parentName || 'there', childName || 'your child', link) },
          from: { emailAddress: { address: FROM_ADDRESS } },
          toRecipients: [{ emailAddress: { address: parentEmail } }],
        },
        saveToSentItems: true,
      }),
    });

    if (!graphRes.ok) {
      const errText = await graphRes.text();
      console.error('Graph sendMail error:', graphRes.status, errText);
      return Response.json({ error: `Email send failed: ${errText}` }, { status: graphRes.status });
    }

    return Response.json({ success: true, message: `Invitation sent to ${parentEmail}` });
  } catch (error) {
    console.error('sendParentRegistrationInvite error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});