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

  // --- Step 1: Get badge summary for this member ---
  const summaryUrl = `https://www.onlinescoutmanager.co.uk/ext/badges/badgesbyperson/?action=loadBadgesByMember&section=${osm_section || 'scouts'}&sectionid=${osm_section_id}&term_id=${osm_term_id}&access_token=${osm_access_token}`;
  const summaryResp = await fetch(summaryUrl, { headers: { 'Authorization': `Bearer ${osm_access_token}` } });

  if (!summaryResp.ok) {
    return Response.json({ success: true, badges_awarded: 0, skipped: true, reason: `OSM summary API ${summaryResp.status}` });
  }

  let summaryData;
  try { summaryData = await summaryResp.json(); } catch (e) {
    return Response.json({ success: true, badges_awarded: 0, skipped: true, reason: 'non-JSON summary response' });
  }

  if (summaryData.status === false || summaryData.ok === false) {
    return Response.json({ success: true, badges_awarded: 0, skipped: true, reason: 'OSM summary reported failure' });
  }

  const allMemberData = Array.isArray(summaryData.data) ? summaryData.data : [];
  const memberBadgeData = allMemberData.find(m => String(m.scoutid) === String(scoutid));

  if (!memberBadgeData) {
    return Response.json({ success: true, badges_awarded: 0, message: 'No badge data found for this member in OSM' });
  }

  const allOsmBadges = memberBadgeData.badges || [];
  // Only process badges that have some progress
  const badgesWithProgress = allOsmBadges.filter(b =>
    parseInt(b.awarded) > 0 || String(b.completed) === '1' || parseInt(b.completed) > 0
  );

  console.log(`Member ${member_id}: ${badgesWithProgress.length} badges with progress (out of ${allOsmBadges.length} total)`);

  if (badgesWithProgress.length === 0) {
    return Response.json({ success: true, badges_awarded: 0, requirements_set: 0, message: 'No badge progress found in OSM' });
  }

  // --- Step 2: Load all app data upfront ---
  const [appBadgeDefs, allBadgeRequirements, existingAwards, existingProgress] = await Promise.all([
    base44.asServiceRole.entities.BadgeDefinition.filter({ active: true }),
    base44.asServiceRole.entities.BadgeRequirement.filter({}),
    base44.asServiceRole.entities.MemberBadgeAward.filter({ member_id }),
    base44.asServiceRole.entities.MemberRequirementProgress.filter({ member_id }),
  ]);

  // Index BadgeDefinitions by osm_badge_id
  const badgeDefsByOsmId = {};
  for (const bd of appBadgeDefs) {
    if (!bd.osm_badge_id) continue;
    const key = String(bd.osm_badge_id);
    if (!badgeDefsByOsmId[key]) badgeDefsByOsmId[key] = [];
    badgeDefsByOsmId[key].push(bd);
  }

  // Index requirements by badge_id + osm_requirement_id (as string)
  const reqByBadgeAndOsmField = {};
  for (const r of allBadgeRequirements) {
    if (!r.osm_requirement_id) continue;
    const key = `${r.badge_id}__${String(r.osm_requirement_id)}`;
    reqByBadgeAndOsmField[key] = r;
  }

  // Index existing awards and progress to avoid duplicates
  const alreadyAwardedIds = new Set(existingAwards.map(a => a.badge_id).filter(Boolean));
  const alreadyProgressIds = new Set(existingProgress.map(p => p.requirement_id).filter(Boolean));

  const today = new Date().toISOString().split('T')[0];
  let badgesAwarded = 0;
  let requirementsSet = 0;
  let badgesUnmapped = 0;

  // --- Step 3: Process each badge ---
  for (const osmBadge of badgesWithProgress) {
    const matchingDefs = badgeDefsByOsmId[String(osmBadge.badge_id)];
    if (!matchingDefs || matchingDefs.length === 0) {
      console.log(`No BadgeDefinition for osm_badge_id=${osmBadge.badge_id} (${osmBadge.badge_name || ''})`);
      badgesUnmapped++;
      continue;
    }

    const awardedStage = parseInt(osmBadge.awarded) || 0;
    const badgeVersion = String(osmBadge.badge_version ?? '0');

    // Fetch per-requirement records for this badge from OSM
    // type_id: 1=Challenge, 2=Activity, 3=Staged, 4=Core — derived from badge category
    const typeId = osmBadge.badge_type_id || (
      osmBadge.badge_type === 'challenge' ? 1 :
      osmBadge.badge_type === 'activity'  ? 2 :
      osmBadge.badge_type === 'staged'    ? 3 :
      osmBadge.badge_type === 'core'      ? 4 : 2
    );
    const recordsUrl = `https://www.onlinescoutmanager.co.uk/ext/badges/records/?action=getBadgeRecords&term_id=${osm_term_id}&section=${osm_section}&badge_id=${osmBadge.badge_id}&section_id=${osm_section_id}&badge_version=${badgeVersion}&payload=1&type_id=${typeId}`;

    let memberRow = null;
    let structureFields = [];

    try {
      const recordsResp = await fetch(recordsUrl, { headers: { 'Authorization': `Bearer ${osm_access_token}` } });
      if (recordsResp.ok) {
        const recordsData = await recordsResp.json();
        const inner = recordsData?.data;

        // Log structure of FIRST badge to diagnose format
        if (badgesWithProgress.indexOf(osmBadge) === 0) {
          console.log(`[FORMAT CHECK badge ${osmBadge.badge_id}] top-level keys:`, Object.keys(recordsData || {}));
          if (inner && !Array.isArray(inner)) {
            console.log(`[FORMAT CHECK] data sub-keys:`, Object.keys(inner).slice(0, 10));
            if (inner.requirements?.length > 0) console.log(`[FORMAT CHECK] sample requirement:`, JSON.stringify(inner.requirements[0]));
            const memberEntry = inner[String(scoutid)];
            console.log(`[FORMAT CHECK] member entry by scoutid key:`, memberEntry ? JSON.stringify(memberEntry).slice(0, 200) : 'NOT FOUND');
          } else if (Array.isArray(inner)) {
            console.log(`[FORMAT CHECK] data is array, length:`, inner.length);
            const found = inner.find(r => String(r.scoutid) === String(scoutid));
            console.log(`[FORMAT CHECK] member found in array:`, found ? 'YES' : 'NO');
            if (recordsData.structure) console.log(`[FORMAT CHECK] structure[0].rows sample:`, JSON.stringify(recordsData.structure[0]?.rows?.slice(0,2)));
          }
        }

        if (inner && !Array.isArray(inner) && inner.requirements) {
          // payload=1 format: { data: { requirements: [{requirement_id, ...}], [scoutid]: {requirement_id: val} } }
          // Member completion data is keyed by requirement_id (same value stored as osm_requirement_id in our DB)
          const requirements = inner.requirements || [];
          memberRow = inner[String(scoutid)] || null;
          // Use requirement_id (the value stored in our osm_requirement_id field) NOT r.field
          structureFields = requirements
            .map(r => String(r.requirement_id ?? r.field ?? ''))
            .filter(f => f && f !== 'undefined' && f !== '' && f !== 'scoutid' && f !== 'completed' && f !== 'awarded' && f !== 'total');
          if (badgesWithProgress.indexOf(osmBadge) === 0) {
            console.log(`[DEBUG] First req object:`, JSON.stringify(requirements[0]));
            console.log(`[DEBUG] structureFields sample:`, structureFields.slice(0, 3));
            console.log(`[DEBUG] memberRow keys:`, memberRow ? Object.keys(memberRow).slice(0, 5) : 'NOT FOUND');
          }
        } else if (Array.isArray(inner)) {
          // array format: data is [{scoutid, field: val}]
          memberRow = inner.find(row => String(row.scoutid) === String(scoutid)) || null;
          for (const section of (recordsData.structure || [])) {
            for (const row of (section.rows || [])) {
              const f = String(row.field || '');
              if (f && f !== 'scoutid' && f !== 'completed' && f !== 'awarded' && f !== 'total') {
                structureFields.push(f);
              }
            }
          }
        }
      } else {
        console.warn(`getBadgeRecords HTTP ${recordsResp.status} for badge ${osmBadge.badge_id}`);
      }
    } catch (e) {
      console.warn(`Failed to fetch records for badge ${osmBadge.badge_id}:`, e.message);
    }

    // Process each matching BadgeDefinition (could be multiple stages)
    for (const badgeDef of matchingDefs) {
      const isStaged = badgeDef.stage_number != null;

      // Determine if this badge/stage should be awarded
      const shouldAward = isStaged
        ? awardedStage >= badgeDef.stage_number
        : awardedStage > 0 || String(osmBadge.completed) === '1';

      if (shouldAward && !alreadyAwardedIds.has(badgeDef.id)) {
        await base44.asServiceRole.entities.MemberBadgeAward.create({
          member_id,
          badge_id:       badgeDef.id,
          awarded_date:   today,
          completed_date: today,
          awarded_by:     'OSM Import',
          award_status:   'awarded',
        });
        alreadyAwardedIds.add(badgeDef.id);
        badgesAwarded++;
      }

      // Set individual requirement progress from OSM records
      if (memberRow && structureFields.length > 0) {
        for (const field of structureFields) {
          const appReq = reqByBadgeAndOsmField[`${badgeDef.id}__${field}`];
          if (!appReq) continue;
          if (alreadyProgressIds.has(appReq.id)) continue;

          const rawVal = memberRow[field];
          // OSM marks completion as "y", a date string, or "1"; blank/"0"/"no" = incomplete
          const isDone = rawVal && rawVal !== '0' && rawVal !== '' && rawVal !== 'no' && rawVal !== 'false';
          if (!isDone) continue;

          // Extract date if OSM stored a date string (YYYY-MM-DD or DD/MM/YYYY)
          let completedDate = today;
          if (typeof rawVal === 'string' && rawVal !== 'y' && rawVal !== '1') {
            const isoMatch = rawVal.match(/^(\d{4}-\d{2}-\d{2})/);
            const ukMatch  = rawVal.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
            if (isoMatch) completedDate = isoMatch[1];
            else if (ukMatch) completedDate = `${ukMatch[3]}-${ukMatch[2]}-${ukMatch[1]}`;
          }

          await base44.asServiceRole.entities.MemberRequirementProgress.create({
            member_id,
            badge_id:        badgeDef.id,
            module_id:       appReq.module_id,
            requirement_id:  appReq.id,
            completion_count: 1,
            completed:       true,
            completed_date:  completedDate,
            source:          'manual',
            completed_by:    'OSM Import',
          });
          alreadyProgressIds.add(appReq.id);
          requirementsSet++;
        }
      }
    }
  }

  console.log(`Badge import for member ${member_id}: ${badgesAwarded} badges awarded, ${requirementsSet} requirements set, ${badgesUnmapped} unmapped`);

  return Response.json({
    success: true,
    badges_awarded:   badgesAwarded,
    requirements_set: requirementsSet,
    badges_unmapped:  badgesUnmapped,
    total_osm_badges_with_progress: badgesWithProgress.length,
  });
});