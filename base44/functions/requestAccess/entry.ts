import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const FROM_ADDRESS = 'deon@sykescouts.org';
const APP_BASE_URL = 'https://sykescouts.org';
const LOGO_URL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png';

const buildLeaderEmail = (childName, parentEmail, sectionName, approveLink) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
  body { margin:0; padding:0; font-family:'Segoe UI',Tahoma,sans-serif; background:#f5f5f5; }
  .container { max-width:600px; margin:0 auto; background:#fff; }
  .header { background:linear-gradient(135deg,#7413dc 0%,#004851 100%); padding:36px 20px; text-align:center; }
  .logo { max-width:200px; height:auto; filter:brightness(0) invert(1); }
  .content { padding:36px 30px; }
  .title { color:#1a1a2e; font-size:22px; font-weight:700; margin:0 0 18px; }
  .message { color:#4a5568; font-size:15px; line-height:1.6; margin:0 0 14px; }
  .detail-box { background:#f6f0ff; border-left:4px solid #7413dc; padding:16px 18px; margin:22px 0; border-radius:6px; color:#4a3a6b; font-size:14px; line-height:1.8; }
  .cta-wrap { text-align:center; margin:30px 0; }
  .cta-button { display:inline-block; background:#7413dc; color:#fff !important; padding:15px 38px; text-decoration:none; border-radius:10px; font-weight:700; font-size:16px; }
  .footer { background:#f9fafb; padding:24px 30px; text-align:center; color:#6b7280; font-size:13px; }
</style></head>
<body>
  <div class="container">
    <div class="header"><img src="${LOGO_URL}" alt="40th Rochdale (Syke) Scouts" class="logo"></div>
    <div class="content">
      <h1 class="title">New Parent Portal access request</h1>
      <p class="message">A parent has requested access to the Parent Portal.</p>
      <div class="detail-box">
        <strong>Child:</strong> ${childName}<br>
        <strong>Section:</strong> ${sectionName || 'Not specified'}<br>
        <strong>Parent email:</strong> ${parentEmail}
      </div>
      <p class="message">If you're happy to grant access, press the button below. We'll email <strong>${parentEmail}</strong> a secure registration link so they can set up their account.</p>
      <div class="cta-wrap">
        <a href="${approveLink}" class="cta-button">Approve &amp; Send Registration Link</a>
      </div>
      <p class="message" style="font-size:13px; color:#94a3b8;">If you don't recognise this request, you can simply ignore this email.</p>
    </div>
    <div class="footer"><p><strong>40th Rochdale (Syke) Scouts</strong></p></div>
  </div>
</body></html>
`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { sectionId, childName, parentEmail } = await req.json();

    if (!childName || !parentEmail) {
      return Response.json({ error: 'Missing child name or email' }, { status: 400 });
    }

    let sectionName = '';
    let teamLeaderEmail = null;

    // Resolve section + team leader
    if (sectionId) {
      const sections = await base44.asServiceRole.entities.Section.filter({ id: sectionId });
      const section = sections[0];
      if (section) {
        sectionName = section.display_name || section.name || '';
        if (section.team_leader_id) {
          const leaders = await base44.asServiceRole.entities.Leader.filter({ id: section.team_leader_id });
          const tl = leaders[0];
          if (tl?.user_id) {
            const users = await base44.asServiceRole.entities.User.filter({ id: tl.user_id });
            teamLeaderEmail = users[0]?.email || null;
          }
        }
      }
    }

    const actionToken = crypto.randomUUID().replace(/-/g, '');

    await base44.asServiceRole.entities.AccessRequest.create({
      section_id: sectionId || '',
      section_name: sectionName,
      child_name: childName,
      parent_email: parentEmail,
      action_token: actionToken,
      status: 'pending',
    });

    const approveLink = `${APP_BASE_URL}/approve-access?token=${actionToken}`;

    // Fall back to all leaders if no team leader email resolved
    let recipients = [];
    if (teamLeaderEmail) {
      recipients = [teamLeaderEmail];
    } else {
      const leaders = await base44.asServiceRole.entities.Leader.filter({});
      const users = await base44.asServiceRole.entities.User.list();
      recipients = leaders
        .map(l => users.find(u => u.id === l.user_id)?.email)
        .filter(Boolean);
    }

    if (recipients.length === 0) {
      return Response.json({ error: 'No leader could be found to notify.' }, { status: 400 });
    }

    const html = buildLeaderEmail(childName, parentEmail, sectionName, approveLink);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');

    for (const email of recipients) {
      const graphRes = await fetch('https://graph.microsoft.com/v1.0/me/sendMail', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            subject: `Parent Portal access request — ${childName}`,
            body: { contentType: 'HTML', content: html },
            from: { emailAddress: { address: FROM_ADDRESS } },
            toRecipients: [{ emailAddress: { address: email } }],
          },
          saveToSentItems: true,
        }),
      });
      if (!graphRes.ok) {
        console.error('Graph sendMail error:', graphRes.status, await graphRes.text());
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('requestAccess error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});