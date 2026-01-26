import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { programmeId, eventId, entityType } = await req.json();
    const id = entityType === 'event' ? eventId : programmeId;

    if (!id || !entityType) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Fetch attendance records based on entity type
    let attendanceRecords = [];
    if (entityType === 'event') {
      const eventAttendance = await base44.asServiceRole.entities.EventAttendance.filter({ event_id: id });
      attendanceRecords = eventAttendance.filter(a => a.attended === true);
    } else {
      const programmeData = await base44.asServiceRole.entities.Programme.filter({ id });
      if (programmeData.length === 0) {
        return Response.json({ error: 'Programme not found' }, { status: 404 });
      }
      const programme = programmeData[0];
      const attendance = await base44.asServiceRole.entities.Attendance.filter({
        section_id: programme.section_id,
        date: programme.date
      });
      attendanceRecords = attendance.filter(a => a.status === 'present');
    }

    if (attendanceRecords.length === 0) {
      return Response.json({ message: 'No attendees found' }, { status: 200 });
    }

    // Get badge criteria for this programme/event
    const allCriteria = await base44.asServiceRole.entities.ProgrammeBadgeCriteria.filter({});
    const linkedCriteria = allCriteria.filter(c =>
      entityType === 'event' ? c.event_id === id : c.programme_id === id
    );

    if (linkedCriteria.length === 0) {
      return Response.json({ message: 'No badge criteria linked' }, { status: 200 });
    }

    let progressUpdated = 0;
    let hikesAwarded = 0;
    let nightsAwarded = 0;

    // Get event details if this is an event
    let event = null;
    if (entityType === 'event') {
      const events = await base44.asServiceRole.entities.Event.filter({ id });
      event = events[0];
    }

    // Process each attendee
    for (const attendanceRecord of attendanceRecords) {
      const memberId = attendanceRecord.member_id;

      // Process each criteria
      for (const criteria of linkedCriteria) {
        // Handle hikes away
        if (criteria.counts_as_hike_away) {
          const members = await base44.asServiceRole.entities.Member.filter({ id: memberId });
          const member = members[0];
          if (member) {
            const newHikesCount = (member.total_hikes_away || 0) + 1;
            await base44.asServiceRole.entities.Member.update(memberId, {
              total_hikes_away: newHikesCount
            });
            hikesAwarded++;
          }
        }

        // Handle nights away (only for events)
        if (entityType === 'event' && event?.nights_away_count > 0) {
          const members = await base44.asServiceRole.entities.Member.filter({ id: memberId });
          const member = members[0];
          if (member) {
            const newNightsCount = (member.total_nights_away || 0) + event.nights_away_count;
            await base44.asServiceRole.entities.Member.update(memberId, {
              total_nights_away: newNightsCount
            });
            
            // Create NightsAwayLog entry
            await base44.asServiceRole.entities.NightsAwayLog.create({
              member_id: memberId,
              event_id: id,
              nights_count: event.nights_away_count,
              start_date: event.start_date.split('T')[0],
              end_date: event.end_date ? event.end_date.split('T')[0] : event.start_date.split('T')[0],
              location: event.location || '',
              verified: true,
              verified_by: user.id
            });
            nightsAwarded++;
          }
        }

        // Process badge requirements
        if (criteria.requirement_ids && criteria.requirement_ids.length > 0) {
          for (const reqId of criteria.requirement_ids) {
            // Get requirement details
            const requirements = await base44.asServiceRole.entities.BadgeRequirement.filter({ id: reqId });
            const requirement = requirements[0];
            if (!requirement) continue;

            // Check if requirement has nights away requirement
            if (requirement.nights_away_required) {
              const members = await base44.asServiceRole.entities.Member.filter({ id: memberId });
              const member = members[0];
              if (!member || (member.total_nights_away || 0) < requirement.nights_away_required) {
                continue; // Skip this requirement if not enough nights away
              }
            }

            // Check existing progress
            const existingProgress = await base44.asServiceRole.entities.MemberRequirementProgress.filter({
              member_id: memberId,
              requirement_id: reqId
            });

            if (existingProgress.length > 0) {
              // Update existing progress
              const progress = existingProgress[0];
              const newCount = (progress.completion_count || 0) + 1;
              const isCompleted = newCount >= (requirement.required_completions || 1);

              await base44.asServiceRole.entities.MemberRequirementProgress.update(progress.id, {
                completion_count: newCount,
                completed: isCompleted,
                completed_date: isCompleted ? new Date().toISOString().split('T')[0] : progress.completed_date,
                source: 'programme',
                programme_id: entityType === 'programme' ? id : null,
                event_id: entityType === 'event' ? id : null,
                completed_by: user.id
              });
            } else {
              // Create new progress
              const isCompleted = (requirement.required_completions || 1) === 1;
              await base44.asServiceRole.entities.MemberRequirementProgress.create({
                member_id: memberId,
                badge_id: requirement.badge_id,
                module_id: requirement.module_id,
                requirement_id: reqId,
                completion_count: 1,
                completed: isCompleted,
                completed_date: isCompleted ? new Date().toISOString().split('T')[0] : null,
                source: 'programme',
                programme_id: entityType === 'programme' ? id : null,
                event_id: entityType === 'event' ? id : null,
                completed_by: user.id
              });
            }
            progressUpdated++;
          }
        }
      }
    }

    // Check for Joining In badges for all attendees
    await base44.asServiceRole.functions.invoke('checkJoiningInBadges', {});

    // Check for Gold Award eligibility
    await base44.asServiceRole.functions.invoke('checkGoldAward', {});

    return Response.json({
      success: true,
      attendees: attendanceRecords.length,
      progressUpdated,
      hikesAwarded,
      nightsAwarded
    });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});