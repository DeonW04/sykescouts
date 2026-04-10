import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code || !state) {
      return Response.json({ error: 'Missing authorization code or state from OSM' }, { status: 400 });
    }

    // Extract code_verifier from state parameter
    let codeVerifier;
    try {
      const [, encodedVerifier] = state.split(':');
      codeVerifier = atob(encodedVerifier);
    } catch {
      return Response.json({ error: 'Invalid state parameter format' }, { status: 400 });
    }

    // Get secrets
    const clientId = Deno.env.get('OSM_CLIENT_ID');
    const clientSecret = Deno.env.get('OSM_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return Response.json({ error: 'OSM_CLIENT_ID and OSM_CLIENT_SECRET must be configured in secrets.' }, { status: 500 });
    }

    // Determine redirect URI (must match OSM OAuth app config)
    const protocol = url.protocol;
    const host = url.host;
    const redirectUri = `${protocol}//${host}/api/osm/callback`;

    // Exchange authorization code for tokens (with PKCE code verifier)
    const tokenResponse = await fetch('https://www.onlinescoutmanager.co.uk/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }).toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('OSM token exchange failed:', errText);
      return Response.json({ error: 'Failed to exchange authorization code with OSM' }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token) {
      return Response.json({ error: 'OSM did not return an access token' }, { status: 500 });
    }

    // Get authenticated user
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Calculate token expiry
    const expiryTime = new Date(Date.now() + (expires_in * 1000)).toISOString();

    // Store tokens in OSMSyncSettings
    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    if (settingsArr[0]) {
      await base44.asServiceRole.entities.OSMSyncSettings.update(settingsArr[0].id, {
        osm_access_token: access_token,
        osm_refresh_token: refresh_token,
        osm_token_expiry: expiryTime,
      });
    } else {
      await base44.asServiceRole.entities.OSMSyncSettings.create({
        osm_access_token: access_token,
        osm_refresh_token: refresh_token,
        osm_token_expiry: expiryTime,
      });
    }

    // Redirect to dashboard with success message
    return Response.redirect(`/LeaderDashboard?osm_connected=true`, 302);
  } catch (error) {
    console.error('OSM OAuth callback error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});