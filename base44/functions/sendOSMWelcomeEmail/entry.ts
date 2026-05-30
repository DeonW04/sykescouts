import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { member_id } = body;

  if (!member_id) return Response.json({ error: 'member_id required' }, { status: 400 });

  const members = await base44.asServiceRole.entities.Member.filter({ id: member_id });
  if (!members.length) return Response.json({ error: 'Member not found' }, { status: 404 });
  const member = members[0];

  const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');

  const parentEmails = [
    { name: member.parent_one_name, email: member.parent_one_email },
    { name: member.parent_two_name, email: member.parent_two_email },
  ].filter(p => p.email);

  if (parentEmails.length === 0) {
    return Response.json({ error: 'No parent email addresses found on this member.' }, { status: 400 });
  }

  const memberFirstName = member.first_name || member.full_name?.split(' ')[0] || 'your child';
  const allParentNames  = parentEmails.map(p => p.name || p.email).join(' and ');
  const allEmails       = parentEmails.map(p => p.email).join(' and ');
  const emailHasTwo     = parentEmails.length > 1;

  const appUrl = 'https://sykescouts.base44.app/app';

  const htmlBody = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><style>
  body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #1a1a2e; margin:0; padding:0; background:#f5f5f5; }
  .wrapper { max-width: 600px; margin: 32px auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
  .header { background: linear-gradient(135deg, #7413dc, #004851); padding: 36px 32px; text-align: center; }
  .header h1 { color: #fff; margin: 0; font-size: 24px; font-weight: 700; }
  .header p { color: rgba(255,255,255,0.75); margin: 8px 0 0; font-size: 15px; }
  .body { padding: 32px; }
  .body p { font-size: 15px; line-height: 1.65; color: #444; margin: 0 0 16px; }
  .highlight { background: #f0e8ff; border-left: 4px solid #7413dc; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
  .highlight p { margin: 0; color: #5c0fb0; font-weight: 600; }
  .btn-wrap { text-align: center; margin: 28px 0; }
  .btn { display: inline-block; background: #7413dc; color: #ffffff !important; text-decoration: none; padding: 14px 36px; border-radius: 50px; font-size: 16px; font-weight: 700; }
  .footer { background: #f9f9f9; padding: 20px 32px; text-align: center; }
  .footer p { font-size: 12px; color: #888; margin: 0; }
  .warning { background: #fff8e1; border: 1px solid #ffc107; border-radius: 8px; padding: 14px 18px; margin: 20px 0; }
  .warning p { color: #7a5800; margin: 0; font-size: 14px; }
</style></head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>🏕️ Welcome to the Parent Portal!</h1>
    <p>40th Rochdale (Syke) Scouts</p>
  </div>
  <div class="body">
    <p>Dear ${allParentNames},</p>
    <p>We're thrilled to welcome <strong>${member.full_name}</strong> to 40th Rochdale (Syke) Scouts! We've set up a Parent Portal account so you can stay connected with everything that's happening.</p>
    <p>Through the portal you can:</p>
    <ul style="font-size:15px;line-height:1.8;color:#444;">
      <li>📅 View the weekly programme and upcoming events</li>
      <li>🏕️ Respond to event attendance and consent forms</li>
      <li>🏅 Track ${memberFirstName}'s badge progress</li>
      <li>💳 Manage subscription payments</li>
    </ul>

    <div class="btn-wrap">
      <a href="${appUrl}" class="btn">Open the Parent Portal →</a>
    </div>

    <div class="warning">
      <p>⚠️ <strong>Important — Registered email ${emailHasTwo ? 'addresses' : 'address'}:</strong><br>
      Only the following email ${emailHasTwo ? 'addresses' : 'address'} will work to access the Parent Portal:<br>
      <strong>${allEmails}</strong><br><br>
      If you need to update or change a registered email address, please contact your section leader directly — we'll be happy to help.</p>
    </div>

    <p>You should also receive a separate invitation email shortly — please follow the link in that email to complete your registration and set up your account.</p>
    <p>If you have any questions, don't hesitate to get in touch. We can't wait to see ${memberFirstName} at Scouts!</p>
    <p style="margin-top:24px;">Warm regards,<br><strong>The Leaders at 40th Rochdale (Syke) Scouts</strong></p>
  </div>
  <div class="footer">
    <p>40th Rochdale (Syke) Scouts · Part of The Scout Association (Charity No. 306101)</p>
  </div>
</div>
</body>
</html>`;

  const results = [];
  for (const parent of parentEmails) {
    const msgPayload = {
      message: {
        subject: `Welcome to the 40th Rochdale Scouts Parent Portal – ${member.full_name}`,
        body: { contentType: 'HTML', content: htmlBody },
        toRecipients: [{ emailAddress: { address: parent.email, name: parent.name || '' } }],
      },
      saveToSentItems: true,
    };

    const sendResp = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(msgPayload),
    });

    results.push({ email: parent.email, ok: sendResp.ok, status: sendResp.status });
    if (!sendResp.ok) {
      const err = await sendResp.text();
      console.error(`Failed to send to ${parent.email}:`, err);
    }
  }

  const allOk = results.every(r => r.ok);
  return Response.json({
    success: allOk,
    results,
    emails_sent: results.filter(r => r.ok).length,
  });
});