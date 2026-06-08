import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const FROM_ADDRESS = 'deon@sykescouts.org';
const APP_BASE_URL = 'https://sykescouts.org';
const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png';

const buildParentEmail = (childName, link) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin:0; padding:0; font-family:'Segoe UI',Tahoma,sans-serif; background:#f5f5f5; }
  .container { max-width:600px; margin:0 auto; background:#fff; }
  .header { background:linear-gradient(135deg,#7413dc 0%,#004851 100%); padding:40px 20px; text-align:center; }
  .logo { max-width:220px; height:auto; filter:brightness(0) invert(1); }
  .content { padding:40px 30px; }
  .title { color:#1a1a2e; font-size:24px; font-weight:700; margin:0 0 20px; }
  .message { color:#4a5568; font-size:15px; line-height:1.6; margin:0 0 16px; }
  .cta-wrap { text-align:center; margin:32px 0; }
  .cta-button { display:inline-block; background:#7413dc; color:#fff !important; padding:15px 38px; text-decoration:none; border-radius:10px; font-weight:700; font-size:16px; }
  .link-fallback { word-break:break-all; color:#7413dc; font-size:13px; }
  .info-box { background:#f6f0ff; border-left:4px solid #7413dc; padding:16px 18px; margin:24px 0; border-radius:6px; color:#4a3a6b; font-size:14px; line-height:1.6; }
  .footer { background:#f9fafb; padding:28px 30px; text-align:center; color:#6b7280; font-size:13px; }
</style></head>
<body>
  <div class="container">
    <div class="header"><img src="${LOGO_URL}" alt="40th Rochdale (Syke) Scouts" class="logo"></div>
    <div class="content">
      <h1 class="title">Your access has been approved</h1>
      <p class="message">Good news — your request for Parent Portal access for <strong>${childName}</strong> has been approved.</p>
      <p class="message">Click the button below to create your account and choose a password.</p>
      <div class="cta-wrap"><a href="${link}" class="cta-button">Create My Account</a></div>
      <p class="message" style="font-size:13px; color:#94a3b8;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p class="link-fallback">${link}</p>
      <div class="info-box">🔒 This link is unique to you and will expire in 14 days.</div>
    </div>
    <div class="footer"><p><strong>40th Rochdale (Syke) Scouts</strong></p></div>
  </div>
</body></html>
`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();
    if (!token) {
      return Response.json({ error: 'Missing token' }, { status: 400 });
    }

    const requests = await base44.asServiceRole.entities.AccessRequest.filter({ action_token: token });
    const request = requests[0];
    if (!request) {
      return Response.json({ error: 'not_found' }, { status: 404 });
    }
    if (request.status === 'approved') {
      return Response.json({ success: true, alreadyApproved: true, parentEmail: request.parent_email });
    }

    // Create a registration invite (not linked to a member yet — leader links child afterwards)
    const regToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '').slice(0, 8);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    await base44.asServiceRole.entities.RegistrationInvite.create({
      token: regToken,
      member_id: '',
      parent_email: request.parent_email,
      parent_name: 'Parent',
      child_name: request.child_name,
      parent_slot: 'parent_one',
      status: 'pending',
      expires_at: expiresAt,
    });

    const link = `${APP_BASE_URL}/register?token=${regToken}`;
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');

    const graphRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          subject: 'Your 40th Rochdale Scouts Parent Portal invitation',
          body: { contentType: 'HTML', content: buildParentEmail(request.child_name, link) },
          from: { emailAddress: { address: FROM_ADDRESS } },
          toRecipients: [{ emailAddress: { address: request.parent_email } }],
        },
        saveToSentItems: true,
      }),
    });

    if (!graphRes.ok) {
      const errText = await graphRes.text();
      console.error('Graph sendMail error:', graphRes.status, errText);
      return Response.json({ error: `Email send failed: ${errText}` }, { status: graphRes.status });
    }

    await base44.asServiceRole.entities.AccessRequest.update(request.id, {
      status: 'approved',
      approved_at: new Date().toISOString(),
    });

    return Response.json({ success: true, parentEmail: request.parent_email });
  } catch (error) {
    console.error('approveAccessRequest error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});