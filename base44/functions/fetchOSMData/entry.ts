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

    // Fetch OSM sections using getSections endpoint with OAuth token
    console.log('Fetching OSM sections with token...');
    const sectionsRes = await fetch('https://www.onlinescoutmanager.co.uk/api.php?action=getSections', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!sectionsRes.ok) {
      const errText = await sectionsRes.text();
      console.error('OSM sections fetch failed:', sectionsRes.status, errText);
      return Response.json({ error: `Failed to fetch sections: ${sectionsRes.status}` }, { status: 500 });
    }

    const sectionsData = await sectionsRes.json();
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