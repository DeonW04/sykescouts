import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current tokens from settings
    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];
    if (!settings || !settings.osm_refresh_token) {
      return Response.json({ error: 'No OSM refresh token found' }, { status: 500 });
    }

    // Get secrets
    const clientId = Deno.env.get('OSM_CLIENT_ID');
    const clientSecret = Deno.env.get('OSM_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return Response.json({ error: 'OSM_CLIENT_ID and OSM_CLIENT_SECRET not configured' }, { status: 500 });
    }

    // Request new tokens
    const tokenResponse = await fetch('https://www.onlinescoutmanager.co.uk/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: settings.osm_refresh_token,
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('OSM token refresh failed:', errText);
      return Response.json({ error: 'Failed to refresh OSM tokens' }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token) {
      return Response.json({ error: 'OSM did not return a new access token' }, { status: 500 });
    }

    // Update tokens in database
    const expiryTime = new Date(Date.now() + (expires_in * 1000)).toISOString();
    await base44.asServiceRole.entities.OSMSyncSettings.update(settings.id, {
      osm_access_token: access_token,
      osm_refresh_token: refresh_token || settings.osm_refresh_token,
      osm_token_expiry: expiryTime,
    });

    return Response.json({ success: true, access_token });
  } catch (error) {
    console.error('OSM refresh token error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});