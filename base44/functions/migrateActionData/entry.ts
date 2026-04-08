import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const log = [];
  const now = new Date().toISOString();

  // STEP 1: Delete pending/empty ActionResponse records
  const allResponses = await base44.asServiceRole.entities.ActionResponse.filter({});
  let deletedCount = 0;
  for (const r of allResponses) {
    const isEmpty = !r.response_value && !r.response;
    const isPending = r.status === 'pending';
    if (isEmpty || isPending) {
      await base44.asServiceRole.entities.ActionResponse.delete(r.id);
      deletedCount++;
    }
  }
  log.push(`Step 1: Deleted ${deletedCount} pending/empty ActionResponse records`);

  // STEP 2 & 3: Migrate field names on surviving responses
  const survivingResponses = await base44.asServiceRole.entities.ActionResponse.filter({});
  let migratedCount = 0;
  for (const r of survivingResponses) {
    const updates = {};
    // Copy child_member_id -> member_id if needed
    if (r.child_member_id && !r.member_id) {
      updates.member_id = r.child_member_id;
    }
    // Copy response -> response_value if needed
    if (r.response && !r.response_value) {
      updates.response_value = r.response;
    }
    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.ActionResponse.update(r.id, updates);
      migratedCount++;
    }
  }
  log.push(`Step 2&3: Migrated ${migratedCount} ActionResponse field names`);

  // STEP 4: Create ActionAssignment records for all existing ActionRequired items
  const allActions = await base44.asServiceRole.entities.ActionRequired.filter({});
  const existingAssignments = await base44.asServiceRole.entities.ActionAssignment.filter({});
  const assignmentKeys = new Set(existingAssignments.map(a => `${a.action_required_id}:${a.member_id}`));

  let assignmentsCreated = 0;
  for (const action of allActions) {
    let memberIds = [];

    if (action.event_id) {
      const attendances = await base44.asServiceRole.entities.EventAttendance.filter({ event_id: action.event_id });
      memberIds = attendances.map(a => a.member_id);
    } else if (action.programme_id) {
      const prog = await base44.asServiceRole.entities.Programme.filter({ id: action.programme_id });
      if (prog.length > 0) {
        const members = await base44.asServiceRole.entities.Member.filter({ section_id: prog[0].section_id, active: true });
        memberIds = members.map(m => m.id);
      }
    }

    for (const memberId of memberIds) {
      const key = `${action.id}:${memberId}`;
      if (!assignmentKeys.has(key)) {
        await base44.asServiceRole.entities.ActionAssignment.create({
          action_required_id: action.id,
          member_id: memberId,
          assigned_at: now,
          assigned_by: user.id,
        });
        assignmentKeys.add(key);
        assignmentsCreated++;
      }
    }
  }
  log.push(`Step 4: Created ${assignmentsCreated} ActionAssignment records`);

  // STEP 5: Ensure no completed response is orphaned (create missing assignment)
  const finalResponses = await base44.asServiceRole.entities.ActionResponse.filter({});
  const finalAssignments = await base44.asServiceRole.entities.ActionAssignment.filter({});
  const finalAssignmentKeys = new Set(finalAssignments.map(a => `${a.action_required_id}:${a.member_id}`));
  let orphanFixed = 0;
  for (const r of finalResponses) {
    if (!r.member_id || !r.action_required_id) continue;
    const key = `${r.action_required_id}:${r.member_id}`;
    if (!finalAssignmentKeys.has(key)) {
      await base44.asServiceRole.entities.ActionAssignment.create({
        action_required_id: r.action_required_id,
        member_id: r.member_id,
        assigned_at: now,
        assigned_by: 'migration',
      });
      orphanFixed++;
    }
  }
  log.push(`Step 5: Fixed ${orphanFixed} orphaned ActionResponse records`);

  return Response.json({ success: true, log });
});