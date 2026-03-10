import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const award = payload.data;

    if (!award?.member_id || !award?.badge_id) {
      return Response.json({ skipped: 'Missing award data' });
    }

    const [[member], [badge]] = await Promise.all([
      base44.asServiceRole.entities.Member.filter({ id: award.member_id }),
      base44.asServiceRole.entities.BadgeDefinition.filter({ id: award.badge_id }),
    ]);

    if (!member || !badge) {
      return Response.json({ error: 'Member or badge not found' }, { status: 404 });
    }

    const childName = member.preferred_name || member.first_name;
    const parentFirstName = member.parent_one_first_name || 'there';
    const appBaseUrl = Deno.env.get('APP_BASE_URL') || '';
    const badgesUrl = appBaseUrl ? `${appBaseUrl}/ParentBadges` : null;

    const emailBody = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background: linear-gradient(135deg, #7413dc, #004851); padding: 30px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🏅 Badge Awarded!</h1>
  </div>
  <div style="background: white; padding: 24px; border-radius: 12px; margin-bottom: 20px;">
    <p style="font-size: 16px; color: #333; margin-top: 0;">Hi ${parentFirstName},</p>
    <p style="font-size: 16px; color: #333;">
      Great news! <strong>${childName}</strong> has been awarded a new badge:
    </p>
    <div style="text-align: center; padding: 24px; background: #f9f6ff; border-radius: 12px; margin: 20px 0; border: 2px solid #e9d5ff;">
      <img src="${badge.image_url}" alt="${badge.name}" style="width: 100px; height: 100px; object-fit: contain; display: block; margin: 0 auto 16px auto;" />
      <h2 style="color: #7413dc; margin: 0 0 8px 0; font-size: 22px;">${badge.name}</h2>
      <p style="color: #666; margin: 0; text-transform: capitalize;">${badge.category} Badge</p>
    </div>
    ${badgesUrl ? `<div style="text-align: center; margin: 24px 0 8px 0;">
      <a href="${badgesUrl}" style="background: #7413dc; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
        View All Badges &rarr;
      </a>
    </div>` : '<p style="text-align:center;color:#666;">Log in to the parent portal to view all badges.</p>'}
  </div>
  <p style="font-size: 13px; color: #999; text-align: center;">40th Rochdale (Syke) Scouts</p>
</body>
</html>`;

    const parentEmails = [member.parent_one_email, member.parent_two_email].filter(Boolean);

    for (const email of parentEmails) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: `🏅 ${childName} has been awarded the ${badge.name}!`,
        body: emailBody,
      });
    }

    return Response.json({ success: true, sent_to: parentEmails });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});