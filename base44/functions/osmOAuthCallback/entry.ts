import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const osmError = url.searchParams.get('error');
    const osmErrorDesc = url.searchParams.get('error_description');

    console.log('OSM callback URL params:', { code: !!code, state: !!state, error: osmError, error_description: osmErrorDesc });

    if (osmError) {
      const msg = osmErrorDesc || osmError;
      return Response.redirect(`https://sykescouts.org/AdminSettings?osm_error=${encodeURIComponent('OSM error: ' + msg)}`, 302);
    }

    if (!code) {
      console.error('No code received. Full URL:', req.url);
      return Response.redirect(`https://sykescouts.org/AdminSettings?osm_error=Missing%20authorization%20code`, 302);
    }

    console.log('OSM callback - state received:', state);

    // Extract code_verifier from state
    let codeVerifier;
    try {
      const decoded = JSON.parse(atob(decodeURIComponent(state)));
      codeVerifier = decoded.cv;
    } catch (e) {
      return Response.redirect(`https://sykescouts.org/AdminSettings?tab=osm&osm_error=${encodeURIComponent('Invalid state: ' + e.message)}`, 302);
    }
    if (!codeVerifier) {
      return Response.redirect(`https://sykescouts.org/AdminSettings?tab=osm&osm_error=Missing%20code%20verifier%20in%20state`, 302);
    }

    // Get secrets from environment
    const clientId = Deno.env.get('OSM_CLIENT_ID');
    const clientSecret = Deno.env.get('OSM_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      return Response.redirect(`https://sykescouts.org/AdminSettings?tab=osm&osm_error=Missing%20client%20credentials`, 302);
    }

    const redirectUri = `https://sykescouts.org/functions/osmOAuthCallback`;

    // Build token request

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('redirect_uri', redirectUri);
    params.append('code_verifier', codeVerifier);
    const body = params.toString();

    const tokenResponse = await fetch('https://www.onlinescoutmanager.co.uk/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('OSM token exchange failed:', { status: tokenResponse.status, response: errText });
      return Response.redirect(`https://sykescouts.org/AdminSettings?tab=osm&osm_error=${encodeURIComponent('Token exchange failed: ' + errText)}`, 302);
    }

    const tokenData = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokenData;

    if (!access_token) {
      return Response.redirect(`https://sykescouts.org/AdminSettings?tab=osm&osm_error=No%20access%20token%20returned`, 302);
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

    // Redirect to OSM settings panel with success message
    console.log('OSM OAuth callback complete - tokens saved successfully');
    return Response.redirect(`https://sykescouts.org/AdminSettings?osm_connected=true`, 302);
  } catch (error) {
    console.error('OSM OAuth callback error:', error);
    return Response.redirect(`https://sykescouts.org/AdminSettings?osm_error=${encodeURIComponent(error.message)}`, 302);
  }
});