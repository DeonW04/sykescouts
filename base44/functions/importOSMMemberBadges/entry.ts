import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { member_id, scoutid, osm_section_id_override, osm_section_type_override, osm_term_id_override } = body;

  if (!member_id || !scoutid) return Response.json({ error: 'member_id and scoutid required' }, { status: 400 });

  const settingsList = await base44.asServiceRole.entities.OSMSyncSettings.list();
  const settings = settingsList[0];
  if (!settings?.osm_access_token) return Response.json({ error: 'OSM not connected' }, { status: 400 });

  const { osm_access_token } = settings;
  const osm_section_id = osm_section_id_override || settings.osm_section_id;
  const osm_section   = osm_section_type_override || settings.osm_section;
  const osm_term_id   = osm_term_id_override       || settings.osm_term_id;

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
    return Response.json({ success: true, badges_awarded: 0, skipped: true, reason: 'non-JSON response' });
  }

  if (osmData.status === false || osmData.ok === false) {
    return Response.json({ success: true, badges_awarded: 0, skipped: true, reason: 'OSM reported failure' });
  }

  const allMemberData = Array.isArray(osmData.data) ? osmData.data : [];
  const memberBadgeData = allMemberData.find(m => String(m.scoutid) === String(scoutid));

  if (!memberBadgeData) {
    return Response.json({ success: true, badges_awarded: 0, message: 'No badge data found for this member in OSM' });
  }

  // awarded > 0: for normal badges means complete (awarded=1), for staged means stage N reached
  const earnedBadges = (memberBadgeData.badges || []).filter(
    b => parseInt(b.awarded) > 0 || String(b.completed) === '1'
  );

  console.log(`Found ${earnedBadges.length} earned badges for scoutid ${scoutid} (from ${(memberBadgeData.badges || []).length} total)`);

  if (earnedBadges.length === 0) {
    return Response.json({ success: true, badges_awarded: 0, message: 'No earned badges in OSM' });
  }

  // Load all app BadgeDefinitions indexed by osm_badge_id
  // For each OSM badge_id, there may be multiple BadgeDefinitions (one per stage for staged badges)
  const appBadgeDefs = await base44.asServiceRole.entities.BadgeDefinition.filter({ active: true });
  const badgeDefsByOsmId = {};
  for (const bd of appBadgeDefs) {
    if (!bd.osm_badge_id) continue;
    const key = String(bd.osm_badge_id);
    if (!badgeDefsByOsmId[key]) badgeDefsByOsmId[key] = [];
    badgeDefsByOsmId[key].push(bd);
  }

  // Get existing awards to avoid duplicates
  const existingAwards = await base44.asServiceRole.entities.MemberBadgeAward.filter({ member_id });
  const alreadyAwardedIds = new Set(existingAwards.map(a => a.badge_id).filter(Boolean));

  const today = new Date().toISOString().split('T')[0];
  let badgesAwarded = 0;
  let badgesSkipped = 0;   // no app badge linked
  let badgesUnmapped = 0;  // no BadgeDefinition found for this OSM badge_id

  const awardBadge = async (badgeDefId) => {
    if (alreadyAwardedIds.has(badgeDefId)) return;
    await base44.asServiceRole.entities.MemberBadgeAward.create({
      member_id,
      badge_id:       badgeDefId,
      awarded_date:   today,
      completed_date: today,
      awarded_by:     'OSM Import',
    });
    alreadyAwardedIds.add(badgeDefId);
    badgesAwarded++;
  };

  for (const osmBadge of earnedBadges) {
    const matchingDefs = badgeDefsByOsmId[String(osmBadge.badge_id)];

    if (!matchingDefs || matchingDefs.length === 0) {
      console.log(`No BadgeDefinition with osm_badge_id=${osmBadge.badge_id} (${osmBadge.badge_name || ''})`);
      badgesUnmapped++;
      continue;
    }

    const awardedStage = parseInt(osmBadge.awarded);
    const isStaged = matchingDefs.some(d => d.stage_number != null) && awardedStage > 1;

    if (isStaged) {
      // Award all stages up to and including the earned stage number
      const stageDefs = matchingDefs
        .filter(d => d.stage_number != null && d.stage_number >= 1 && d.stage_number <= awardedStage)
        .sort((a, b) => a.stage_number - b.stage_number);

      if (stageDefs.length === 0) {
        // Stage badges exist but none match — award whatever is available
        for (const d of matchingDefs) await awardBadge(d.id);
      } else {
        for (const d of stageDefs) await awardBadge(d.id);
      }
    } else {
      // Normal badge or stage 1 — award all matching defs (usually just one)
      for (const d of matchingDefs) {
        if (!d.stage_number || d.stage_number <= awardedStage) {
          await awardBadge(d.id);
        }
      }
    }
  }

  console.log(`Badge import for member ${member_id}: ${badgesAwarded} awarded, ${badgesSkipped} skipped, ${badgesUnmapped} unmapped (no osm_badge_id set)`);

  return Response.json({
    success: true,
    badges_awarded: badgesAwarded,
    badges_skipped: badgesSkipped,
    badges_unmapped: badgesUnmapped,
    total_osm_earned: earnedBadges.length,
  });
});