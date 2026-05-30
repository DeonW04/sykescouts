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
  const url = `https://www.onlinescoutmanager.co.uk/ext/badges/badgesbyperson/?action=loadBadgesByMember&section=${osm_section || 'scouts'}&sectionid=${osm_section_id}&term_id=${osm_term_id}`;

  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${osm_access_token}` }
  });

  if (!resp.ok) {
    console.warn(`OSM badges API returned ${resp.status} — skipping badge import`);
    return Response.json({ success: true, badges_awarded: 0, skipped: true, reason: `OSM API ${resp.status}` });
  }

  const osmData = await resp.json();

  const allMemberData = Array.isArray(osmData.data) ? osmData.data : [];
  const memberBadgeData = allMemberData.find(m => String(m.scoutid) === String(scoutid));

  if (!memberBadgeData) {
    return Response.json({ success: true, badges_awarded: 0, message: 'No badge data found for this member in OSM' });
  }

  // Only import fully awarded badges
  const completedBadges = (memberBadgeData.badges || []).filter(
    b => String(b.awarded) === '1' || String(b.completed) === '1'
  );

  if (completedBadges.length === 0) {
    return Response.json({ success: true, badges_awarded: 0, message: 'No completed badges in OSM' });
  }

  // Get our OSM→App badge ID mappings
  const osmBadgeMappings = await base44.asServiceRole.entities.OSMBadge.filter({});
  const mappingByOsmId = {};
  for (const m of osmBadgeMappings) {
    if (m.osm_badge_id) mappingByOsmId[String(m.osm_badge_id)] = m.badge_id;
  }

  // Get existing awards so we don't duplicate
  const existingAwards = await base44.asServiceRole.entities.MemberBadgeAward.filter({ member_id });
  const alreadyAwardedIds = new Set(existingAwards.map(a => a.badge_id).filter(Boolean));

  const today = new Date().toISOString().split('T')[0];
  let badgesAwarded = 0;
  let badgesSkipped = 0;

  for (const osmBadge of completedBadges) {
    const appBadgeId = mappingByOsmId[String(osmBadge.badge_id)];
    if (!appBadgeId) {
      badgesSkipped++;
      continue; // No mapping found
    }
    if (alreadyAwardedIds.has(appBadgeId)) {
      badgesSkipped++;
      continue; // Already awarded
    }

    await base44.asServiceRole.entities.MemberBadgeAward.create({
      member_id,
      badge_id:     appBadgeId,
      awarded_date: today,
      awarded_by:   'OSM Import',
    });

    alreadyAwardedIds.add(appBadgeId);
    badgesAwarded++;
  }

  console.log(`Badge import for member ${member_id}: ${badgesAwarded} awarded, ${badgesSkipped} skipped (no mapping or already awarded)`);

  return Response.json({
    success: true,
    badges_awarded: badgesAwarded,
    badges_skipped: badgesSkipped,
    total_osm_completed: completedBadges.length,
  });
});