import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const pending = await base44.asServiceRole.entities.PendingBadgeNotification.list();
    if (pending.length === 0) return Response.json({ success: true, sent: 0 });

    const allMembers = await base44.asServiceRole.entities.Member.list();
    const allBadges = await base44.asServiceRole.entities.BadgeDefinition.list();

    // Group notifications by member
    const byMember = {};
    for (const notif of pending) {
      if (!byMember[notif.member_id]) byMember[notif.member_id] = [];
      byMember[notif.member_id].push(notif);
    }

    let emailsSent = 0;

    for (const [memberId, notifs] of Object.entries(byMember)) {
      const member = allMembers.find(m => m.id === memberId);
      if (!member) continue;

      const parentEmails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
      if (parentEmails.length === 0) continue;

      const childName = member.preferred_name || member.first_name;
      const parentFirstName = member.parent_one_first_name || 'there';

      const awardedBadges = notifs
        .map(n => allBadges.find(b => b.id === n.badge_id))
        .filter(Boolean);

      const badgeCount = awardedBadges.length;
      const heading = badgeCount === 1
        ? `${childName} has been awarded a new badge!`
        : `${childName} has been awarded ${badgeCount} new badges!`;

      const badgeIconsHtml = awardedBadges.map(badge => `
        <div style="display:inline-block;text-align:center;margin:8px;width:90px;vertical-align:top;">
          <img src="${badge.image_url}" alt="${badge.name}" style="width:80px;height:80px;object-fit:contain;display:block;margin:0 auto 6px auto;border-radius:8px;" />
          <span style="font-size:12px;color:#555;line-height:1.3;">${badge.name}</span>
        </div>
      `).join('');

      const emailBody = `<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
  <div style="background: linear-gradient(135deg, #7413dc, #004851); padding: 30px; border-radius: 12px; margin-bottom: 24px; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🏅 ${badgeCount === 1 ? 'Badge' : 'Badges'} Awarded!</h1>
  </div>
  <div style="background: white; padding: 24px; border-radius: 12px; margin-bottom: 20px;">
    <p style="font-size: 16px; color: #333; margin-top: 0;">Hi ${parentFirstName},</p>
    <p style="font-size: 16px; color: #333;">${heading}</p>
    <div style="text-align: center; padding: 20px; background: #f9f6ff; border-radius: 12px; margin: 20px 0; border: 2px solid #e9d5ff;">
      ${badgeIconsHtml}
    </div>
    <div style="text-align: center; margin: 24px 0 8px 0;">
      <a href="https://sykescouts.org/ParentBadges" style="background: #7413dc; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
        View All Badges &rarr;
      </a>
    </div>
  </div>
  <p style="font-size: 13px; color: #999; text-align: center;">40th Rochdale (Syke) Scouts</p>
</body>
</html>`;

      const subject = badgeCount === 1
        ? `🏅 ${childName} has been awarded the ${awardedBadges[0].name}!`
        : `🏅 ${childName} has been awarded ${badgeCount} new badges!`;

      for (const email of parentEmails) {
        await base44.asServiceRole.integrations.Core.SendEmail({ to: email, subject, body: emailBody });
        emailsSent++;
      }
    }

    // Clear all pending notifications
    for (const notif of pending) {
      await base44.asServiceRole.entities.PendingBadgeNotification.delete(notif.id);
    }

    return Response.json({ success: true, sent: emailsSent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});