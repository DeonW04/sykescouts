import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const apiid = Deno.env.get('OSM_API_ID');
    const token = Deno.env.get('OSM_TOKEN');
    if (!apiid || !token) {
      return Response.json({ error: 'OSM_API_ID and OSM_TOKEN must be set in secrets.' }, { status: 500 });
    }

    const { email, password } = await req.json();
    if (!email || !password) {
      return Response.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const body = new URLSearchParams({ apiid, token, email, password }).toString();
    const res = await fetch('https://www.onlinescoutmanager.co.uk/users.php?action=authorise', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { 
      return Response.json({ error: 'Unexpected response from OSM. Check your credentials.' }, { status: 400 });
    }

    if (!data.userid || !data.secret) {
      return Response.json({ error: data.message || data.error || 'OSM authorisation failed. Check your email and password.' }, { status: 400 });
    }

    // Store userid + secret in OSMSyncSettings
    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    if (settingsArr[0]) {
      await base44.asServiceRole.entities.OSMSyncSettings.update(settingsArr[0].id, {
        osm_userid: String(data.userid),
        osm_secret: String(data.secret),
      });
    } else {
      await base44.asServiceRole.entities.OSMSyncSettings.create({
        osm_userid: String(data.userid),
        osm_secret: String(data.secret),
        is_active: false,
      });
    }

    return Response.json({ success: true, userid: String(data.userid) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});