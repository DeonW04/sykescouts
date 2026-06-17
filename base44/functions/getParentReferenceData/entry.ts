import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Reference data the parent portal needs: programmes, events, badges, terms etc.
// None of this is personal data, but we still require an authenticated user and
// filter events/programmes to the parent's own children's sections so a parent
// can't enumerate other sections' content.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const svc = base44.asServiceRole;
    const email = user.email;

    const [kids1, kids2] = await Promise.all([
      svc.entities.Member.filter({ parent_one_email: email }),
      svc.entities.Member.filter({ parent_two_email: email }),
    ]);
    const childrenRaw = [...kids1, ...kids2];
    const sectionIds = [...new Set(childrenRaw.map(c => c.section_id).filter(Boolean))];

    if (sectionIds.length === 0) {
      return Response.json({
        programmes: [], events: [], terms: [], badges: [], badgeModules: [],
        badgeRequirements: [], badgeCriteria: [], uniformConfigs: [], attendanceActions: [],
      });
    }

    const [
      allProgrammes, allEvents, terms, badges, badgeModules,
      badgeRequirements, badgeCriteria, uniformConfigs, attendanceActions,
    ] = await Promise.all([
      svc.entities.Programme.filter({ published: true }),
      svc.entities.Event.filter({ published: true }),
      svc.entities.Term.filter({ active: true }),
      svc.entities.BadgeDefinition.filter({ active: true }),
      svc.entities.BadgeModule.filter({}),
      svc.entities.BadgeRequirement.filter({}),
      svc.entities.ProgrammeBadgeCriteria.filter({}),
      svc.entities.UniformConfig.filter({}),
      svc.entities.ActionRequired.filter({ action_purpose: 'attendance' }),
    ]);

    // Scope events & programmes to the children's sections only.
    const programmes = allProgrammes.filter(p => sectionIds.includes(p.section_id));
    const events = allEvents.filter(e => e.section_ids?.some(sid => sectionIds.includes(sid)));

    return Response.json({
      programmes, events, terms, badges, badgeModules,
      badgeRequirements, badgeCriteria, uniformConfigs, attendanceActions,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});