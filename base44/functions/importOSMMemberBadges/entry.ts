import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { member_id, scoutid } = body;

  if (!member_id || !scoutid) return Response.json({ error: 'member_id and scoutid required' }, { status: 400 });

  const settingsList = await base44.asServiceRole.entities.OSMSyncSettings.list();
  const settings = settingsList[0];
  if (!settings?.osm_access_token) return Response.json({ error: 'OSM not connected' }, { status: 400 });

  const { osm_access_token, osm_section_id, osm_section, osm_term_id } = settings;

  // Fetch all badges by person for this section/term
  const url = `https://www.onlinescoutmanager.co.uk/ext/badges/badgesbyperson/?action=loadBadgesByMember&section=${osm_section || 'scouts'}&sectionid=${osm_section_id}&term_id=${osm_term_id}&access_token=${osm_access_token}`;

  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${osm_access_token}` }
  });

  if (!resp.ok) {
    const body2 = await resp.text().catch(() => '');
    console.warn(`OSM badges HTTP ${resp.status}:`, body2.slice(0, 200));
    return Response.json({ success: true, badges_awarded: 0, skipped: true, reason: `OSM API ${resp.status}` });
  }

  let osmData;
  try {
    osmData = await resp.json();
  } catch (e) {
    console.warn('OSM badges returned non-JSON — skipping badge import');
    return Response.json({ success: true, badges_awarded: 0, skipped: true, reason: 'non-JSON response' });
  }

  if (osmData.status === false || osmData.ok === false) {
    console.warn('OSM badges returned failure — skipping badge import');
    return Response.json({ success: true, badges_awarded: 0, skipped: true, reason: 'OSM reported failure' });
  }

  const allMemberData = Array.isArray(osmData.data) ? osmData.data : [];
  const memberBadgeData = allMemberData.find(m => String(m.scoutid) === String(scoutid));

  if (!memberBadgeData) {
    console.log(`No badge data found for scoutid ${scoutid} in OSM response`);
    return Response.json({ success: true, badges_awarded: 0, message: 'No badge data found for this member in OSM' });
  }

  // Include ALL badges where awarded > 0
  // For normal badges: awarded=1 means complete
  // For staged badges: awarded=N means stage N has been reached
  const earnedBadges = (memberBadgeData.badges || []).filter(
    b => parseInt(b.awarded) > 0 || String(b.completed) === '1'
  );

  console.log(`Found ${earnedBadges.length} earned badges for scoutid ${scoutid} (from ${(memberBadgeData.badges || []).length} total)`);

  if (earnedBadges.length === 0) {
    return Response.json({ success: true, badges_awarded: 0, message: 'No earned badges in OSM' });
  }

  // Build OSM badge_id (numeric, e.g. "94") → OSMBadge record map
  // FIX: use m.badge_id as key (not m.osm_badge_id which doesn't exist)
  const osmBadgeMappings = await base44.asServiceRole.entities.OSMBadge.filter({});
  const osmBadgeByOsmId = {};
  for (const m of osmBadgeMappings) {
    if (m.badge_id) osmBadgeByOsmId[String(m.badge_id)] = m;
  }

  // Load all app BadgeDefinitions — needed for staged badge family lookups
  const appBadgeDefs = await base44.asServiceRole.entities.BadgeDefinition.filter({ active: true });
  const badgeDefById = {};
  const badgeDefsByFamily = {};
  for (const bd of appBadgeDefs) {
    badgeDefById[bd.id] = bd;
    if (bd.badge_family_id) {
      if (!badgeDefsByFamily[bd.badge_family_id]) badgeDefsByFamily[bd.badge_family_id] = [];
      badgeDefsByFamily[bd.badge_family_id].push(bd);
    }
  }

  // Get existing awards so we don't duplicate
  const existingAwards = await base44.asServiceRole.entities.MemberBadgeAward.filter({ member_id });
  const alreadyAwardedIds = new Set(existingAwards.map(a => a.badge_id).filter(Boolean));

  const today = new Date().toISOString().split('T')[0];
  let badgesAwarded = 0;
  let badgesSkipped = 0;   // no link set up in admin
  let badgesUnmapped = 0;  // OSMBadge record not found at all

  const awardBadge = async (badgeDefId) => {
    if (alreadyAwardedIds.has(badgeDefId)) return;
    await base44.asServiceRole.entities.MemberBadgeAward.create({
      member_id,
      badge_id:        badgeDefId,
      awarded_date:    today,
      completed_date:  today,
      awarded_by:      'OSM Import',
    });
    alreadyAwardedIds.add(badgeDefId);
    badgesAwarded++;
  };

  for (const osmBadge of earnedBadges) {
    const osmRecord = osmBadgeByOsmId[String(osmBadge.badge_id)];

    if (!osmRecord) {
      console.log(`No OSMBadge record for badge_id ${osmBadge.badge_id} (${osmBadge.badge_name || ''})`);
      badgesUnmapped++;
      continue;
    }

    if (!osmRecord.linked_to_app_badge) {
      console.log(`OSMBadge "${osmRecord.name}" (id: ${osmRecord.badge_id}) has no linked app badge — skipping`);
      badgesSkipped++;
      continue;
    }

    // Extract just the ID part — some entries are stored as "id: Badge Name description"
    const linkedAppBadgeId = osmRecord.linked_to_app_badge.split(':')[0].trim();
    const linkedBadgeDef = badgeDefById[linkedAppBadgeId];

    if (!linkedBadgeDef) {
      console.log(`Linked BadgeDefinition "${linkedAppBadgeId}" not found for OSM badge "${osmRecord.name}"`);
      badgesSkipped++;
      continue;
    }

    const awardedStage = parseInt(osmBadge.awarded);
    const isStaged = osmRecord.badge_type === 'Staged' && awardedStage > 0 && linkedBadgeDef.badge_family_id;

    if (isStaged) {
      // Award all stages up to and including the earned stage number
      // e.g. if awarded=3, award Stage 1 + Stage 2 + Stage 3
      const familyBadges = (badgeDefsByFamily[linkedBadgeDef.badge_family_id] || [])
        .filter(bd => bd.stage_number != null && bd.stage_number >= 1)
        .sort((a, b) => a.stage_number - b.stage_number);

      if (familyBadges.length === 0) {
        // No staged children found — fall back to awarding the parent badge
        await awardBadge(linkedAppBadgeId);
      } else {
        for (const stageBadge of familyBadges) {
          if (stageBadge.stage_number <= awardedStage) {
            await awardBadge(stageBadge.id);
          }
        }
      }
    } else {
      // Normal badge — award the linked BadgeDefinition directly
      await awardBadge(linkedAppBadgeId);
    }
  }

  console.log(`Badge import for member ${member_id}: ${badgesAwarded} awarded, ${badgesSkipped} skipped (no link), ${badgesUnmapped} unmapped`);

  return Response.json({
    success: true,
    badges_awarded: badgesAwarded,
    badges_skipped: badgesSkipped,
    badges_unmapped: badgesUnmapped,
    total_osm_earned: earnedBadges.length,
  });
});