import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code) {
      return Response.json({ error: 'Missing authorization code from OSM' }, { status: 400 });
    }

    console.log('OSM callback - state received:', state);

    // Extract code_verifier from state parameter
    let codeVerifier;
    if (!state || !state.includes(':')) {
      return Response.json({ error: `Invalid state format: '${state}'. Expected format: randomState:encodedVerifier` }, { status: 400 });
    }
    
    try {
      const [, encodedVerifier] = state.split(':');
      if (!encodedVerifier) {
        return Response.json({ error: 'State parameter missing verifier component' }, { status: 400 });
      }
      codeVerifier = atob(encodedVerifier);
    } catch (e) {
      return Response.json({ error: `Failed to decode state: ${e.message}` }, { status: 400 });
    }

    // Get secrets
    const clientId = 'LkvafKTrBEaPfXZqJw59LpLSyu8kBDOs';
    const clientSecret = 'ZpL4LvHPHPN5uOY2ldszogI1fd6Ks5NFJ54DQlnhhDQVMEczG7KfAMSLeo2S81Dm';
    if (!clientId || !clientSecret) {
      return Response.json({ error: 'OSM_CLIENT_ID and OSM_CLIENT_SECRET must be configured in secrets.' }, { status: 500 });
    }

    // Determine redirect URI - must match the registered endpoint exactly
    const protocol = url.protocol;
    const host = url.host;
    const redirectUri = `https://sykescouts.org/functions/osmOAuthCallback`;

    // Exchange authorization code for tokens (with PKCE code verifier)
    console.log('Token exchange params:', { code: code.slice(0, 10) + '...', client_id: clientId, redirect_uri: redirectUri, code_verifier_length: codeVerifier.length, incoming_url: req.url });
    
    // Build token request manually to avoid double-encoding the code_verifier
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('redirect_uri', redirectUri);
    params.append('code_verifier', codeVerifier);
    const body = params.toString();
    console.log('Token request - redirect_uri:', redirectUri, 'code_verifier length:', codeVerifier.length);

    const tokenResponse = await fetch('https://www.onlinescoutmanager.co.uk/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('OSM token exchange failed:', { status: tokenResponse.status, response: errText });
      return Response.json({ error: `OSM token exchange failed: ${errText}` }, { status: 500 });
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token) {
      return Response.json({ error: 'OSM did not return an access token' }, { status: 500 });
    }

    // Check if user is authenticated (optional, use service role to store tokens)
    let user;
    try {
      user = await base44.auth.me();
    } catch (e) {
      // User may not be authenticated during OAuth callback - this is okay
      user = null;
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
    const origin = new URL(req.url).origin;
    return Response.redirect(`https://sykescouts.org/LeaderDashboard?osm_connected=true`, 302);
  } catch (error) {
    console.error('OSM OAuth callback error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});