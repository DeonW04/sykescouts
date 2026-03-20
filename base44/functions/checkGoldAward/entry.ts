import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get Gold Award badge definition
    const goldAwardBadges = await base44.asServiceRole.entities.BadgeDefinition.filter({
      is_chief_scout_award: true,
      section: 'scouts',
      active: true
    });

    if (goldAwardBadges.length === 0) {
      return Response.json({ message: 'Gold Award badge not found' }, { status: 404 });
    }

    const goldAwardBadge = goldAwardBadges[0];

    // Get all challenge badges (excluding Gold Award itself)
    const allChallengeBadges = await base44.asServiceRole.entities.BadgeDefinition.filter({
      category: 'challenge',
      section: 'scouts',
      active: true
    });
    const challengeBadges = allChallengeBadges.filter(b => !b.is_chief_scout_award);

    if (challengeBadges.length === 0) {
      return Response.json({ message: 'No challenge badges found' }, { status: 200 });
    }

    // Get all scout section members
    const sections = await base44.asServiceRole.entities.Section.filter({ 
      name: 'scouts', 
      active: true 
    });

    if (sections.length === 0) {
      return Response.json({ message: 'Scouts section not found' }, { status: 200 });
    }

    const scoutMembers = await base44.asServiceRole.entities.Member.filter({
      section_id: sections[0].id,
      active: true
    });

    // Get all badge awards
    const allAwards = await base44.asServiceRole.entities.MemberBadgeAward.filter({});

    let goldAwardsCreated = 0;

    // Check each scout member
    for (const member of scoutMembers) {
      const memberAwards = allAwards.filter(a => a.member_id === member.id);

      // Check if they already have the Gold Award
      const hasGoldAward = memberAwards.some(a => 
        a.badge_id === goldAwardBadge.id
      );

      if (hasGoldAward) continue;

      // Check if they have completed all challenge badges
      const completedChallenges = challengeBadges.filter(badge =>
        memberAwards.some(award => 
          award.badge_id === badge.id && 
          award.award_status === 'awarded'
        )
      );

      // If all 9 challenge badges are complete, award Gold Award
      if (completedChallenges.length === challengeBadges.length) {
        await base44.asServiceRole.entities.MemberBadgeAward.create({
          member_id: member.id,
          badge_id: goldAwardBadge.id,
          completed_date: new Date().toISOString().split('T')[0],
          award_status: 'pending',
        });
        goldAwardsCreated++;
      }
    }

    return Response.json({
      success: true,
      goldAwardsCreated,
      totalScouts: scoutMembers.length,
      challengeBadgesRequired: challengeBadges.length
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});