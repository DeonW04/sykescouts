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

    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];

    if (!settings || !settings.osm_access_token) {
      return Response.json({ error: 'OSM not connected' }, { status: 400 });
    }

    const accessToken = settings.osm_access_token;
    console.log('Using OAuth token, length:', accessToken.length);

    console.log('Fetching OSM startup data...');

    const sectionsRes = await fetch('https://www.onlinescoutmanager.co.uk/ext/generic/startup/?action=getData', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    console.log('Response status:', sectionsRes.status);

    const text = await sectionsRes.text();
    console.log('Actual response length:', text.length);
    console.log('First 300 chars:', text.substring(0, 300));

    if (!text.trim()) {
      console.error('OSM returned empty response');
      return Response.json({
        error: 'OSM returned empty response. Token may be invalid or expired.'
      }, { status: 500 });
    }

    let responseData;

    // Try to parse as direct JSON first
    try {
      responseData = JSON.parse(text);
      console.log('Successfully parsed response as direct JSON');
    } catch (_directJsonError) {
      console.log('Not direct JSON, attempting JS variable extraction...');

      const prefix = 'var data_holder = ';
      const idx = text.indexOf(prefix);

      if (idx === -1) {
        console.error('Could not find data_holder in response');
        console.error('First 500 chars:', text.substring(0, 500));
        return Response.json({
          error: 'Could not extract data from OSM response'
        }, { status: 500 });
      }

      let jsonStr = text.slice(idx + prefix.length).trimEnd();
      if (jsonStr.endsWith(';')) {
        jsonStr = jsonStr.slice(0, -1);
      }

      try {
        responseData = JSON.parse(jsonStr);
        console.log('Successfully parsed JS-embedded JSON');
      } catch (e) {
        console.error('JSON parse failed:', e.message);
        console.error('Extracted JSON length:', jsonStr.length);
        console.error('Extracted JSON last 200 chars:', jsonStr.substring(Math.max(0, jsonStr.length - 200)));
        return Response.json({
          error: `Failed to parse data: ${e.message}`
        }, { status: 500 });
      }
    }

    // Extract sections from globals.roles
    const formattedSections = [];
    if (responseData && responseData.globals && Array.isArray(responseData.globals.roles)) {
      const roles = responseData.globals.roles;
      console.log('Found', roles.length, 'roles');

      for (const role of roles) {
        if (role.sectionid && role.sectionname) {
          formattedSections.push({
            id: role.sectionid.toString(),
            name: role.sectionname,
            type: role.section || role.sectionType || 'unknown',
          });
        }
      }
    } else {
      console.error('Response structure unexpected:', Object.keys(responseData || {}));
      return Response.json({
        error: 'Unexpected response structure from OSM'
      }, { status: 500 });
    }

    console.log('Returning', formattedSections.length, 'sections');
    return Response.json({
      sections: formattedSections,
      connectedSectionId: settings.osm_section_id,
      connectedSectionType: settings.osm_section,
    });
  } catch (error) {
    console.error('fetchOSMData error:', error.message);
    console.error('Stack:', error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});