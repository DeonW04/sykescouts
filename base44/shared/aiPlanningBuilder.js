// Shared builder for the AI planning-data snapshot for a single section.
// Used by both aiPlanningData (API-key auth) and getAiPlanningDataAdmin (admin session auth).

const API_VERSION = '1.0';

function calcAge(dobStr, ref) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  let age = ref.getFullYear() - dob.getFullYear();
  const m = ref.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < dob.getDate())) age--;
  return age;
}

function addYears(dobStr, years) {
  if (!dobStr) return null;
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return null;
  const d = new Date(dob);
  d.setFullYear(d.getFullYear() + years);
  return d.toISOString().split('T')[0];
}

function isoDate(d) {
  return d.toISOString().split('T')[0];
}

const BADGE_TYPE_LABEL = {
  challenge: 'Challenge Award',
  activity: 'Activity Badge',
  staged: 'Staged Activity Badge',
  core: 'Core Badge',
  special: 'Special Badge',
  blanket: 'Blanket Badge',
};

// Builds the full planning-data payload for a section.
// `svc` is a base44 service-role client. Returns { status, body }.
export async function buildAiPlanningData(svc, sectionId) {
  if (!sectionId) {
    return { status: 400, body: { error: 'sectionId is required' } };
  }

  const section = await svc.entities.Section.get(sectionId).catch(() => null);
  if (!section) {
    return { status: 404, body: { error: 'Section not found' } };
  }

  const now = new Date();
  const currentDate = isoDate(now);

  // ── Current term ──
  const terms = await svc.entities.Term.list('-start_date', 200);
  const currentTerm = terms.find(t => t.start_date <= currentDate && t.end_date >= currentDate)
    || terms.find(t => t.active)
    || null;

  // ── Members (active, in this section) ──
  const allSectionMembers = await svc.entities.Member.filter({ section_id: sectionId }, '-created_date', 1000);
  const members = allSectionMembers.filter(m => m.active !== false);
  const memberIds = members.map(m => m.id);
  const memberIdSet = new Set(memberIds);

  // ── Badge definitions for this section (section-specific + 'all') ──
  const sectionKey = section.name;
  const allBadges = await svc.entities.BadgeDefinition.filter({ active: true }, 'display_priority', 2000);
  const badges = allBadges.filter(b => b.section === sectionKey || b.section === 'all');
  const badgeIds = badges.map(b => b.id);
  const badgeIdSet = new Set(badgeIds);
  const badgeById = {};
  badges.forEach(b => { badgeById[b.id] = b; });

  // ── Badge requirements (bulk fetch, group in memory) ──
  const allRequirements = await svc.entities.BadgeRequirement.list('order', 20000);
  const requirementsByBadge = {};
  badgeIds.forEach(id => { requirementsByBadge[id] = []; });
  allRequirements.forEach(r => {
    if (badgeIdSet.has(r.badge_id)) requirementsByBadge[r.badge_id].push(r);
  });

  // ── Member badge + requirement progress (bulk fetch, group by member) ──
  const memberBadgeProgress = {};
  const memberReqProgress = {};
  const reqCompletionsByProgramme = {};
  members.forEach(m => { memberBadgeProgress[m.id] = []; memberReqProgress[m.id] = []; });

  const allBadgeProgress = await svc.entities.MemberBadgeProgress.list('-completion_date', 20000);
  allBadgeProgress.forEach(p => {
    if (memberIdSet.has(p.member_id) && p.status === 'completed') {
      memberBadgeProgress[p.member_id].push(p.badge_id);
    }
  });

  const allReqProgress = await svc.entities.MemberRequirementProgress.list('-completed_date', 40000);
  allReqProgress.forEach(r => {
    if (!memberIdSet.has(r.member_id)) return;
    if (r.completed) {
      memberReqProgress[r.member_id].push({
        badge_id: r.badge_id,
        module_id: r.module_id || '',
        requirement_id: r.requirement_id,
      });
    }
    if (r.programme_id) {
      if (!reqCompletionsByProgramme[r.programme_id]) reqCompletionsByProgramme[r.programme_id] = [];
      reqCompletionsByProgramme[r.programme_id].push({
        member_id: r.member_id,
        badge_id: r.badge_id,
        requirement_id: r.requirement_id,
      });
    }
  });

  // ── Assemble member list ──
  const membersOut = members.map(m => {
    const earnedBadgeIds = memberBadgeProgress[m.id] || [];
    const challengeAwardsCompleted = earnedBadgeIds
      .filter(id => badgeById[id]?.category === 'challenge')
      .map(id => ({ badge_id: id, name: badgeById[id]?.name || '' }));
    return {
      id: m.id,
      first_name: m.first_name || '',
      last_name: m.surname || '',
      preferred_name: m.preferred_name || '',
      date_of_birth: m.date_of_birth || null,
      current_age: calcAge(m.date_of_birth, now),
      patrol: m.patrol || '',
      join_date: m.join_date || null,
      estimated_move_up_date: addYears(m.date_of_birth, 14),
      badges_earned: earnedBadgeIds.map(id => ({ badge_id: id, name: badgeById[id]?.name || '' })),
      challenge_awards_completed: challengeAwardsCompleted,
      requirements_completed: memberReqProgress[m.id] || [],
      total_nights_away: m.total_nights_away || 0,
      total_time_on_water: 0,
    };
  });

  // ── Badge definitions output ──
  const badgesOut = badges.map(b => ({
    badge_id: b.id,
    name: b.name || '',
    badge_type: BADGE_TYPE_LABEL[b.category] || b.category || 'Badge',
    description: b.description || '',
    requirements: (requirementsByBadge[b.id] || []).map(r => ({
      requirement_id: r.id,
      osm_requirement_id: r.osm_requirement_id ?? null,
      description: r.text || r.name || '',
    })),
  }));

  // ── Programme (history 24 months + upcoming) ──
  const twoYearsAgo = new Date(now); twoYearsAgo.setMonth(twoYearsAgo.getMonth() - 24);
  const twoYearsAgoStr = isoDate(twoYearsAgo);

  const programmes = await svc.entities.Programme.filter({ section_id: sectionId }, '-date', 2000);

  const programmeHistory = programmes
    .filter(p => p.date >= twoYearsAgoStr && p.date < currentDate)
    .map(p => ({
      id: p.id,
      date: p.date,
      title: p.title || '',
      description: p.description || '',
      badge_requirements_completed: reqCompletionsByProgramme[p.id] || [],
    }));

  const upcomingProgramme = programmes
    .filter(p => p.date >= currentDate)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(p => ({
      id: p.id,
      date: p.date,
      title: p.title || '',
      description: p.description || '',
    }));

  // ── Upcoming events ──
  const nowIso = now.toISOString();
  const allEvents = await svc.entities.Event.list('-start_date', 2000);
  const upcomingEvents = allEvents
    .filter(e => Array.isArray(e.section_ids) && e.section_ids.includes(sectionId))
    .filter(e => (e.end_date || e.start_date) >= nowIso)
    .sort((a, b) => (a.start_date || '').localeCompare(b.start_date || ''))
    .map(e => {
      const badgeOpportunities = [];
      (e.schedule_by_day || []).forEach(day => {
        (day.items || []).forEach(item => {
          if (item.activity) badgeOpportunities.push(item.activity);
        });
      });
      return {
        id: e.id,
        name: e.title || '',
        date: e.start_date || null,
        end_date: e.end_date || null,
        location: e.location || '',
        type: e.type || '',
        nights_away_count: e.nights_away_count || 0,
        badge_opportunities: badgeOpportunities,
      };
    });

  // ── Patrol information ──
  const patrolMap = {};
  members.forEach(m => {
    const name = m.patrol || 'Unassigned';
    if (!patrolMap[name]) patrolMap[name] = [];
    patrolMap[name].push({
      member_id: m.id,
      name: m.preferred_name || `${m.first_name || ''} ${m.surname || ''}`.trim(),
    });
  });
  const patrols = Object.entries(patrolMap).map(([name, patrolMembers]) => ({
    name,
    patrol_leaders: [],
    assistant_patrol_leaders: [],
    members: patrolMembers,
  }));

  // ── Statistics ──
  const ages = membersOut.map(m => m.current_age).filter(a => typeof a === 'number');
  const averageAge = ages.length ? Number((ages.reduce((s, a) => s + a, 0) / ages.length).toFixed(1)) : 0;

  const dueWithin = (monthsAhead) => {
    const limit = new Date(now); limit.setMonth(limit.getMonth() + monthsAhead);
    const limitStr = isoDate(limit);
    return membersOut.filter(m => m.estimated_move_up_date && m.estimated_move_up_date >= currentDate && m.estimated_move_up_date <= limitStr).length;
  };

  const memberCount = members.length;
  const badgeCompletionPercentages = badges.map(b => {
    const completedCount = memberIds.filter(id => (memberBadgeProgress[id] || []).includes(b.id)).length;
    return {
      badge_id: b.id,
      name: b.name || '',
      completion_percentage: memberCount ? Number(((completedCount / memberCount) * 100).toFixed(1)) : 0,
    };
  });

  const statistics = {
    number_of_members: memberCount,
    average_age: averageAge,
    badge_completion_percentages: badgeCompletionPercentages,
    members_due_to_move_up: {
      within_3_months: dueWithin(3),
      within_6_months: dueWithin(6),
      within_12_months: dueWithin(12),
    },
  };

  const body = {
    section_information: {
      section_id: section.id,
      section_name: section.display_name || section.name || '',
      age_range: section.age_range || '',
      meeting_day: section.meeting_day || '',
      meeting_start_time: section.meeting_start_time || section.meeting_time || '',
      meeting_finish_time: section.meeting_end_time || '',
      current_term: currentTerm ? { id: currentTerm.id, title: currentTerm.title, start_date: currentTerm.start_date, end_date: currentTerm.end_date } : null,
      current_date: currentDate,
    },
    members: membersOut,
    badge_definitions: badgesOut,
    programme_history: programmeHistory,
    upcoming_programme: upcomingProgramme,
    upcoming_events: upcomingEvents,
    patrols,
    statistics,
    metadata: {
      api_version: API_VERSION,
      timestamp: now.toISOString(),
      database_version: 'v1',
      total_member_count: memberCount,
    },
  };

  return { status: 200, body };
}