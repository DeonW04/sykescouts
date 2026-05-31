import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Called by the "Track Badge Award Created" entity automation when a MemberBadgeAward is created.
// Queues the correct OSM sync records into PendingBadgeSync.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const award = payload.data;

    if (!award?.member_id || !award?.badge_id || !award?.id) {
      return Response.json({ skipped: 'Missing award data' });
    }

    // Fetch the member to get their OSM scout ID
    const members = await base44.asServiceRole.entities.Member.filter({ id: award.member_id });
    const member = members[0];
    if (!member) return Response.json({ skipped: 'Member not found' });
    if (!member.osm_scoutid) return Response.json({ skipped: 'Member has no OSM Scout ID — skipping sync queue' });

    // Fetch OSM settings for section info
    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];
    if (!settings?.osm_section_id || !settings?.osm_section) {
      return Response.json({ skipped: 'OSM settings not configured' });
    }

    // Fetch the app badge definition
    const badgeDefs = await base44.asServiceRole.entities.BadgeDefinition.filter({ id: award.badge_id });
    const badgeDef = badgeDefs[0];
    if (!badgeDef) return Response.json({ skipped: 'Badge definition not found' });

    // Use osm_badge_id directly from the BadgeDefinition (set in Admin → OSM Badge Mapping)
    if (!badgeDef.osm_badge_id) {
      return Response.json({ skipped: `Badge "${badgeDef.name}" has no OSM badge ID linked — set it in Admin → OSM → Badge ID Mapping` });
    }

    const osmBadgeId      = parseInt(badgeDef.osm_badge_id, 10);
    const osmBadgeVersion = badgeDef.osm_badge_version != null ? parseInt(badgeDef.osm_badge_version, 10) : 0;

    if (isNaN(osmBadgeId)) {
      return Response.json({ skipped: `Could not parse OSM badge ID "${badgeDef.osm_badge_id}"` });
    }

    const osmSectionId = parseInt(settings.osm_section_id, 10);
    const osmSection   = settings.osm_section;
    const now          = new Date().toISOString();

    // Use stage_number as the OSM level — works for staged badges AND non-staged badges
    // that are mapped to a staged OSM badge (e.g. Joining In core badge → Staged OSM badge at level N).
    const stageLevel = badgeDef.stage_number || 1;

    // Check for existing pending records for this member + OSM badge + level to avoid duplicates
    const existingPending = await base44.asServiceRole.entities.PendingBadgeSync.filter({});
    const alreadyQueued = existingPending.some(r =>
      r.scoutid === member.osm_scoutid &&
      r.badge_id === osmBadgeId &&
      r.level === stageLevel &&
      (r.status === 'pending' || r.status === 'failed')
    );

    if (alreadyQueued) {
      return Response.json({ skipped: 'Duplicate — already in pending sync queue' });
    }

    // Queue 1: awardBadge (registers the badge in OSM at level 0)
    await base44.asServiceRole.entities.PendingBadgeSync.create({
      scoutid:       member.osm_scoutid,
      firstname:     member.first_name,
      lastname:      member.surname,
      badge_id:      osmBadgeId,
      badge_version: osmBadgeVersion,
      level:         stageLevel,
      section_id:    osmSectionId,
      section:       osmSection,
      action:        'award',
      status:        'pending',
      added_date:    now,
    });

    // Queue 2: overrideCompletion (sets the correct stage level)
    await base44.asServiceRole.entities.PendingBadgeSync.create({
      scoutid:       member.osm_scoutid,
      firstname:     member.first_name,
      lastname:      member.surname,
      badge_id:      osmBadgeId,
      badge_version: osmBadgeVersion,
      level:         stageLevel,
      section_id:    osmSectionId,
      section:       osmSection,
      action:        'complete',
      status:        'pending',
      added_date:    now,
    });

    return Response.json({ success: true, queued: 2, badge: badgeDef.name, osm_badge_id: osmBadgeId, level: stageLevel });
  } catch (error) {
    console.error('[trackBadgeAward] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});