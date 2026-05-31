import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { sectionId, sectionType } = body;
  if (!sectionId || !sectionType) return Response.json({ error: 'sectionId and sectionType required' }, { status: 400 });

  const settingsList = await base44.asServiceRole.entities.OSMSyncSettings.list();
  const settings = settingsList[0];
  if (!settings?.osm_access_token) return Response.json({ error: 'OSM not connected' }, { status: 400 });

  const token = settings.osm_access_token;
  const base = 'https://www.onlinescoutmanager.co.uk/ext/badges/records/';

  const fetchType = async (typeId) => {
    const url = `${base}?action=getAvailableBadges&section=${encodeURIComponent(sectionType)}&sectionid=${sectionId}&type_id=${typeId}&payload=1&context=none&member_id=0`;
    try {
      const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
      if (!resp.ok) {
        console.warn(`[getOSMBadgeList] type_id=${typeId} returned ${resp.status}`);
        return [];
      }
      const data = await resp.json();
      let items = [];
      if (data.items && typeof data.items === 'object' && !Array.isArray(data.items)) {
        items = Object.values(data.items);
      } else if (Array.isArray(data.items)) {
        items = data.items;
      }
      return items.map(b => ({ ...b, type_id: typeId }));
    } catch (e) {
      console.error(`[getOSMBadgeList] type_id=${typeId} error:`, e.message);
      return [];
    }
  };

  const [activity, challenge] = await Promise.all([fetchType(2), fetchType(1)]);
  const badges = [...activity, ...challenge];
  console.log(`[getOSMBadgeList] total badges: ${badges.length}`);
  return Response.json({ success: true, badges });
});