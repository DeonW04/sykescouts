import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all active members with scouting_start_date
    const members = await base44.asServiceRole.entities.Member.filter({ 
      active: true 
    });

    // Get all Joining In badges
    const badges = await base44.asServiceRole.entities.BadgeDefinition.filter({
      special_type: 'joining_in',
      active: true
    });

    // Get all existing awards
    const existingAwards = await base44.asServiceRole.entities.MemberBadgeAward.filter({});

    const today = new Date();
    const awarded = [];

    for (const member of members) {
      if (!member.scouting_start_date) continue;

      const startDate = new Date(member.scouting_start_date);
      const yearsInScouting = (today - startDate) / (1000 * 60 * 60 * 24 * 365.25);

      // Check each badge level
      for (const badge of badges) {
        const levelRequired = badge.stage_number;
        
        // Check if member qualifies and hasn't already been awarded
        if (yearsInScouting >= levelRequired) {
          const alreadyAwarded = existingAwards.some(
            a => a.member_id === member.id && a.badge_id === badge.id
          );

          if (!alreadyAwarded) {
            // Award the badge
            await base44.asServiceRole.entities.MemberBadgeAward.create({
              member_id: member.id,
              badge_id: badge.id,
              completed_date: new Date().toISOString().split('T')[0],
              award_status: 'pending',
            });

            awarded.push({
              member: member.full_name,
              badge: badge.name,
              level: levelRequired
            });
          }
        }
      }
    }

    return Response.json({ 
      success: true, 
      awarded,
      message: `Checked ${members.length} members, awarded ${awarded.length} new badges`
    });
  } catch (error) {
    console.error('Error checking Joining In badges:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});