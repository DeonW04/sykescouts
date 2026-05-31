import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { sectionId, sectionType, termId, badgeId, badgeVersion, typeId } = body;
  if (!sectionId || !sectionType || !badgeId) {
    return Response.json({ error: 'sectionId, sectionType, badgeId required' }, { status: 400 });
  }

  const settingsList = await base44.asServiceRole.entities.OSMSyncSettings.list();
  const settings = settingsList[0];
  if (!settings?.osm_access_token) return Response.json({ error: 'OSM not connected' }, { status: 400 });

  const url = `https://www.onlinescoutmanager.co.uk/ext/badges/records/?action=getBadgeStructure&term_id=${termId || 0}&section=${encodeURIComponent(sectionType)}&badge_id=${badgeId}&section_id=${sectionId}&badge_version=${badgeVersion || 0}&type_id=${typeId || 2}`;

  console.log('[getOSMBadgeDetails] fetching:', url);
  const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${settings.osm_access_token}` } });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    console.error('[getOSMBadgeDetails] error:', resp.status, errText.slice(0, 200));
    return Response.json({ error: `OSM returned ${resp.status}` }, { status: 500 });
  }

  const data = await resp.json();
  console.log('[getOSMBadgeDetails] response keys:', Object.keys(data || {}));
  // Log structure of key fields so we can see where requirements live
  if (data.modules) console.log('[getOSMBadgeDetails] modules keys:', Object.keys(data.modules));
  if (data.config) console.log('[getOSMBadgeDetails] config keys:', Object.keys(data.config));
  if (data.structure) console.log('[getOSMBadgeDetails] structure keys:', Object.keys(data.structure));
  // Log first module sample so we can see req shape
  const firstModKey = data.modules && Object.keys(data.modules)[0];
  if (firstModKey) {
    console.log('[getOSMBadgeDetails] modules[' + firstModKey + ']:', JSON.stringify(data.modules[firstModKey]).slice(0, 500));
    if (data.config?.[firstModKey]) console.log('[getOSMBadgeDetails] config[' + firstModKey + '] sample:', JSON.stringify(data.config[firstModKey]).slice(0, 500));
    if (data.structure?.[firstModKey]) console.log('[getOSMBadgeDetails] structure[' + firstModKey + '] sample:', JSON.stringify(data.structure[firstModKey]).slice(0, 500));
  }
  return Response.json({ success: true, data });
});