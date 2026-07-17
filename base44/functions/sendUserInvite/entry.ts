import { createClientFromRequest } from 'npm:@base44/sdk@0.8.39';

const FROM_ADDRESS = 'info@sykescouts.org';
const APP_BASE_URL = 'https://sykescouts.org';
const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png';

const ROLE_LABELS = {
  user: 'Parent',
  parent: 'Parent',
  leader: 'Leader',
  admin: 'Administrator',
  treasurer: 'Treasurer',
  glv: 'Group Lead Volunteer',
  team_leader: 'Team Leader',
};

const buildEmail = (roleLabel, link) => `
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
    .footer { background-color: #f9fafb; padding: 28px 30px; text-align: center; color: #6b7280; font-size: 13px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="40th Rochdale (Syke) Scouts" class="logo">
    </div>
    <div class="content">
      <h1 class="title">You've been invited to join</h1>
      <p class="message">Hello,</p>
      <p class="message">You've been invited to create an account for the <strong>40th Rochdale (Syke) Scouts</strong> portal as a <strong>${roleLabel}</strong>.</p>
      <p class="message">Click the button below to set up your account. Just choose a password to get started.</p>

      <div class="cta-wrap">
        <a href="${link}" class="cta-button">Create My Account</a>
      </div>

      <p class="message" style="font-size: 13px; color: #94a3b8;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p class="link-fallback">${link}</p>

      <div class="info-box">
        🔒 This link is unique to you and will expire in 14 days.
      </div>

      <p class="message" style="color: #6b7280; font-size: 14px;">If you have any questions, just reply to a section leader and we'll be happy to help.</p>
    </div>
    <div class="footer">
      <p><strong>40th Rochdale (Syke) Scouts</strong></p>
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
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { email, userType } = await req.json();
    if (!email || !userType) {
      return Response.json({ error: 'Missing email or userType' }, { status: 400 });
    }

    const normalisedEmail = String(email).trim().toLowerCase();

    // Map the selected user type to a role + account_type + leader flag
    const specialRoles = ['admin', 'treasurer', 'glv', 'team_leader'];
    const role = specialRoles.includes(userType) ? userType : 'user';
    const account_type = userType === 'ipad' ? 'ipad' : userType === 'leader' ? 'leader' : userType === 'parent' ? 'parent' : null;
    const make_leader = userType === 'leader';

    // Reject if a user with this email already exists
    const existingUsers = await base44.asServiceRole.entities.User.filter({ email: normalisedEmail });
    if (existingUsers.length > 0) {
      return Response.json({ error: 'A user with this email already exists.' }, { status: 409 });
    }

    // Expire any previous pending invites for this email
    const existing = await base44.asServiceRole.entities.UserInvite.filter({ email: normalisedEmail, status: 'pending' });
    for (const inv of existing) {
      await base44.asServiceRole.entities.UserInvite.update(inv.id, { status: 'expired' });
    }

    const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.UserInvite.create({
      token,
      email: normalisedEmail,
      role,
      account_type,
      make_leader,
      status: 'pending',
      expires_at: expiresAt,
      sent_by: user.id,
    });

    const link = `${APP_BASE_URL}/register-user?token=${token}`;
    const roleLabel = ROLE_LABELS[userType] || 'member';

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');

    const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/sendMail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject: 'Your 40th Rochdale Scouts account invitation',
          body: { contentType: 'HTML', content: buildEmail(roleLabel, link) },
          from: { emailAddress: { address: FROM_ADDRESS } },
          toRecipients: [{ emailAddress: { address: normalisedEmail } }],
        },
        saveToSentItems: true,
      }),
    });

    if (!graphRes.ok) {
      const errText = await graphRes.text();
      console.error('Graph sendMail error:', graphRes.status, errText);
      return Response.json({ error: `Email send failed: ${errText}` }, { status: graphRes.status });
    }

    return Response.json({ success: true, message: `Invitation sent to ${normalisedEmail}` });
  } catch (error) {
    console.error('sendUserInvite error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});