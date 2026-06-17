import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Fields on a Member that are safe to expose to a parent for THEIR OWN child.
// Everything is the child's own record, so all member fields are appropriate here,
// but we whitelist explicitly so we never accidentally leak internal-only fields.
const MEMBER_FIELDS = [
  'id', 'first_name', 'surname', 'full_name', 'preferred_name', 'date_of_birth',
  'gender', 'section_id', 'patrol', 'address',
  'parent_one_first_name', 'parent_one_surname', 'parent_one_name', 'parent_one_email', 'parent_one_phone',
  'parent_two_first_name', 'parent_two_surname', 'parent_two_name', 'parent_two_email', 'parent_two_phone',
  'doctors_surgery', 'doctors_surgery_address', 'doctors_phone',
  'medical_info', 'allergies', 'dietary_requirements', 'medications',
  'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
  'photo_consent', 'invested', 'active', 'join_date', 'scouting_start_date',
  'total_nights_away', 'total_hikes_away',
  'gift_aid_eligible', 'gift_aid_declaration_date',
  'next_subs_due', 'last_subs_payment_date', 'last_subs_months_paid',
  'stripe_customer_id', 'stripe_payment_methods', 'stripe_subscription_id',
  'subs_interval', 'legacy_subs_expiry',
];

const pickMember = (m) => {
  const out = {};
  for (const f of MEMBER_FIELDS) out[f] = m[f];
  return out;
};

// Only return rows whose member_id belongs to this parent's children.
const scopeByMember = (rows, childIds) =>
  rows.filter(r => childIds.includes(r.member_id) || childIds.includes(r.child_member_id));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = base44.asServiceRole;
    const email = user.email;

    // 1. Resolve this parent's children — server-side, by their email only.
    const [kids1, kids2] = await Promise.all([
      svc.entities.Member.filter({ parent_one_email: email }),
      svc.entities.Member.filter({ parent_two_email: email }),
    ]);
    const seen = new Set();
    const childrenRaw = [...kids1, ...kids2].filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    if (childrenRaw.length === 0) {
      return Response.json({ children: [], sections: [] });
    }

    const childIds = childrenRaw.map(c => c.id);
    const sectionIds = [...new Set(childrenRaw.map(c => c.section_id).filter(Boolean))];

    // 2. Fetch all related portal data in parallel, then scope to these children.
    const [
      sections, allEventPayStatuses, allMeetingPayStatuses, allOverrides,
      allActionResponses, allBadgeProgress, allReqProgress, allAwards, allNightsLogs,
    ] = await Promise.all([
      svc.entities.Section.filter({ active: true }),
      svc.entities.EventPaymentStatus.filter({}),
      svc.entities.MeetingPaymentStatus.filter({}),
      svc.entities.MeetingPaymentOverride.filter({}),
      svc.entities.ActionResponse.filter({}),
      svc.entities.MemberBadgeProgress.filter({}),
      svc.entities.MemberRequirementProgress.filter({}),
      svc.entities.MemberBadgeAward.filter({}),
      svc.entities.NightsAwayLog.filter({}),
    ]);

    // Sections are not sensitive but we only need the children's sections details.
    const safeSections = sections.map(s => ({
      id: s.id, name: s.name, display_name: s.display_name,
      meeting_start_time: s.meeting_start_time, meeting_end_time: s.meeting_end_time,
    }));

    return Response.json({
      children: childrenRaw.map(pickMember),
      childIds,
      sectionIds,
      sections: safeSections,
      eventPaymentStatuses: allEventPayStatuses.filter(p => childIds.includes(p.member_id)),
      meetingPaymentStatuses: allMeetingPayStatuses.filter(p => childIds.includes(p.member_id)),
      paymentOverrides: allOverrides.filter(o => childIds.includes(o.member_id)),
      actionResponses: scopeByMember(allActionResponses, childIds),
      badgeProgress: allBadgeProgress.filter(p => childIds.includes(p.member_id)),
      requirementProgress: allReqProgress.filter(p => childIds.includes(p.member_id)),
      awards: allAwards.filter(a => childIds.includes(a.member_id)),
      nightsAwayLogs: allNightsLogs.filter(l => childIds.includes(l.member_id)),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});