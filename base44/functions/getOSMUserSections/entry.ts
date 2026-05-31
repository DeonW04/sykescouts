import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const settingsList = await base44.asServiceRole.entities.OSMSyncSettings.list();
  const settings = settingsList[0];
  if (!settings?.osm_access_token) {
    return Response.json({ error: 'OSM not connected. Please connect OSM in Admin Settings first.' }, { status: 400 });
  }

  // Try to get user roles / sections from OSM
  const url = 'https://www.onlinescoutmanager.co.uk/api.php?action=getUserRoles';
  const resp = await fetch(url, {
    headers: { 'Authorization': `Bearer ${settings.osm_access_token}` }
  });

  if (!resp.ok) {
    return Response.json({ error: `OSM returned ${resp.status}. Your token may have expired.` }, { status: 500 });
  }

  const data = await resp.json();
  console.log('[getOSMUserSections] raw response keys:', Object.keys(data || {}));

  // OSM returns either an array or an object keyed by sectionid
  let rawSections = [];
  if (Array.isArray(data)) {
    rawSections = data;
  } else if (data && typeof data === 'object') {
    rawSections = Object.values(data).filter(s => s && (s.sectionid || s.section_id));
  }

  const sections = rawSections.map(s => ({
    sectionid: String(s.sectionid || s.section_id || ''),
    sectionname: s.sectionname || s.section_name || s.name || 'Unknown',
    sectionType: s.section || s.sectionType || s.section_type || 'scouts',
    groupname: s.groupname || s.group_name || '',
  })).filter(s => s.sectionid);

  console.log(`[getOSMUserSections] found ${sections.length} sections`);
  return Response.json({ success: true, sections });
});