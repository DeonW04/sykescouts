import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { programmeId } = await req.json();

    // Get badge criteria linked to this programme
    const criteria = await base44.entities.ProgrammeBadgeCriteria.filter({ programme_id: programmeId });
    
    if (criteria.length === 0) {
      return Response.json({ message: 'No badge criteria linked to this meeting', awarded: 0 });
    }

    // Get attendance records for this programme
    const programme = await base44.entities.Programme.filter({ id: programmeId }).then(res => res[0]);
    if (!programme) {
      return Response.json({ error: 'Programme not found' }, { status: 404 });
    }

    const attendance = await base44.entities.Attendance.filter({
      section_id: programme.section_id,
      date: programme.date,
      status: 'present',
    });

    const attendingMemberIds = attendance.map(a => a.member_id);
    
    let awardedCount = 0;

    // For each badge criteria
    for (const badgeCriteria of criteria) {
      const requirementIds = badgeCriteria.requirement_ids || [];

      // For each attending member
      for (const memberId of attendingMemberIds) {
        // Award each requirement
        for (const reqId of requirementIds) {
          // Check if already awarded
          const existing = await base44.entities.MemberRequirementProgress.filter({
            member_id: memberId,
            requirement_id: reqId,
          });

          if (existing.length === 0) {
            // Get requirement details for badge_id and module_id
            const requirement = await base44.entities.BadgeRequirement.filter({ id: reqId }).then(res => res[0]);
            
            if (requirement) {
              await base44.entities.MemberRequirementProgress.create({
                member_id: memberId,
                badge_id: requirement.badge_id,
                module_id: requirement.module_id,
                requirement_id: reqId,
                completed: true,
                completed_date: programme.date,
                source: 'programme',
                programme_id: programmeId,
                completed_by: user.id,
              });
              awardedCount++;

              // Check if this counts as hike away
              if (badgeCriteria.counts_as_hike_away) {
                const member = await base44.entities.Member.filter({ id: memberId }).then(res => res[0]);
                if (member) {
                  await base44.entities.Member.update(memberId, {
                    total_hikes_away: (member.total_hikes_away || 0) + 1
                  });
                }
              }

              // Check if we should update/create badge progress
              const allBadgeReqs = await base44.entities.BadgeRequirement.filter({ badge_id: requirement.badge_id });
              const memberReqProgress = await base44.entities.MemberRequirementProgress.filter({
                member_id: memberId,
                badge_id: requirement.badge_id,
                completed: true,
              });

              // Get or create badge progress record
              let badgeProgress = await base44.entities.MemberBadgeProgress.filter({
                member_id: memberId,
                badge_id: requirement.badge_id,
              }).then(res => res[0]);

              if (!badgeProgress) {
                badgeProgress = await base44.entities.MemberBadgeProgress.create({
                  member_id: memberId,
                  badge_id: requirement.badge_id,
                  status: 'in_progress',
                });
              }

              // Check if badge is complete
              if (memberReqProgress.length >= allBadgeReqs.length) {
                await base44.entities.MemberBadgeProgress.update(badgeProgress.id, {
                  status: 'completed',
                  completion_date: programme.date,
                });

                // Create pending award if not already exists
                const existingAward = await base44.entities.MemberBadgeAward.filter({
                  member_id: memberId,
                  badge_id: requirement.badge_id
                });

                if (existingAward.length === 0) {
                  await base44.entities.MemberBadgeAward.create({
                    member_id: memberId,
                    badge_id: requirement.badge_id,
                    awarded_date: programme.date,
                    awarded_by: user.email,
                    award_status: 'pending'
                  });
                }
              } else if (badgeProgress.status === 'not_started') {
                await base44.entities.MemberBadgeProgress.update(badgeProgress.id, {
                  status: 'in_progress',
                });
              } else if (badgeProgress.status === 'completed') {
                // Badge was complete but now incomplete - mark as in progress
                await base44.entities.MemberBadgeProgress.update(badgeProgress.id, {
                  status: 'in_progress',
                  completion_date: null
                });

                // Remove pending award
                const pendingAward = await base44.entities.MemberBadgeAward.filter({
                  member_id: memberId,
                  badge_id: requirement.badge_id,
                  award_status: 'pending'
                });

                for (const award of pendingAward) {
                  await base44.entities.MemberBadgeAward.delete(award.id);
                }
              }
            }
          }
        }
      }
    }

    return Response.json({
      success: true,
      awarded: awardedCount,
      attendees: attendingMemberIds.length,
      message: `Awarded ${awardedCount} badge requirements to ${attendingMemberIds.length} members`,
    });
  } catch (error) {
    console.error('Error awarding badges:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});