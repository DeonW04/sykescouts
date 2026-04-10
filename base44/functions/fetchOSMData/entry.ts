import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user;
    try {
      user = await base44.auth.me();
    } catch (e) {
      console.error('Auth error:', e);
      return Response.json({ error: 'Failed to authenticate: ' + e.message }, { status: 401 });
    }

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch OSM settings with tokens
    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];

    if (!settings || !settings.osm_access_token) {
      return Response.json({ error: 'OSM not connected' }, { status: 400 });
    }

    // Check if token is expired and refresh if needed
    let accessToken = settings.osm_access_token;
    if (settings.osm_token_expiry && new Date(settings.osm_token_expiry) < new Date()) {
      const clientId = 'LkvafKTrBEaPfXZqJw59LpLSyu8kBDOs';
      const clientSecret = 'ZpL4LvHPHPN5uOY2ldszogI1fd6Ks5NFJ54DQlnhhDQVMEczG7KfAMSLeo2S81Dm';

      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('refresh_token', settings.osm_refresh_token);
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);

      const tokenRes = await fetch('https://www.onlinescoutmanager.co.uk/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString(),
      });

      if (tokenRes.ok) {
        const tokenData = await tokenRes.json();
        accessToken = tokenData.access_token;
        const expiryTime = new Date(Date.now() + (tokenData.expires_in * 1000)).toISOString();
        await base44.asServiceRole.entities.OSMSyncSettings.update(settings.id, {
          osm_access_token: accessToken,
          osm_refresh_token: tokenData.refresh_token,
          osm_token_expiry: expiryTime,
        });
      }
    }

    // Fetch OSM sections - try OAuth Bearer format first
    console.log('Fetching OSM sections with OAuth token...');
    console.log('Token (first 20 chars):', accessToken.substring(0, 20) + '...');
    
    const sectionsRes = await fetch('https://www.onlinescoutmanager.co.uk/api.php?action=getSections', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('Response status:', sectionsRes.status);
    console.log('Response headers:', {
      contentType: sectionsRes.headers.get('content-type'),
      contentLength: sectionsRes.headers.get('content-length'),
    });

    if (!sectionsRes.ok) {
      const errText = await sectionsRes.text();
      console.error('OSM sections fetch failed:', sectionsRes.status, errText);
      return Response.json({ error: `Failed to fetch sections: ${sectionsRes.status} - ${errText}` }, { status: 500 });
    }

    const responseText = await sectionsRes.text();
    console.log('OSM response text length:', responseText.length);
    console.log('First 300 chars:', responseText.substring(0, 300));
    
    if (!responseText || responseText.trim() === '') {
      console.error('OSM returned empty response. Token might be invalid or API rejected Bearer auth.');
      return Response.json({ 
        error: 'Empty response from OSM. The OAuth token may be invalid or OSM API may not support Bearer token authentication.' 
      }, { status: 500 });
    }

    let sectionsData;
    try {
      sectionsData = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse OSM response as JSON:', e.message);
      console.error('Response was:', responseText);
      return Response.json({ error: 'Invalid JSON from OSM: ' + e.message }, { status: 500 });
    }
    console.log('OSM sections data received:', typeof sectionsData, Object.keys(sectionsData || {}).length);

    // Format sections with names and IDs for dropdown
    const formattedSections = [];
    if (sectionsData && typeof sectionsData === 'object') {
      for (const [sectionId, sectionInfo] of Object.entries(sectionsData)) {
        if (sectionInfo && typeof sectionInfo === 'object' && sectionInfo.name) {
          formattedSections.push({
            id: sectionId,
            name: sectionInfo.name,
            type: sectionInfo.type || 'unknown',
          });
        }
      }
    }

    return Response.json({
      sections: formattedSections,
      connectedSectionId: settings.osm_section_id,
      connectedSectionType: settings.osm_section,
    });
  } catch (error) {
    console.error('fetchOSMData error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});