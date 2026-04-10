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

    const accessToken = settings.osm_access_token;
    console.log('Using OAuth token, length:', accessToken.length);

    // Fetch OSM startup data - includes all section info in globals.roles
    console.log('Fetching OSM startup data...');
    
    const sectionsRes = await fetch(`https://www.onlinescoutmanager.co.uk/ext/generic/startup/?action=getData&oauth_token=${encodeURIComponent(accessToken)}`, {
      method: 'POST',
    });

    console.log('Response status:', sectionsRes.status);
    
    // Parse response
    const text = await sectionsRes.text();
    
    if (!text.trim()) {
      console.error('OSM returned empty response');
      return Response.json({ 
        error: 'OSM returned empty response. Token may be invalid or expired.' 
      }, { status: 500 });
    }

    let responseData;
    try {
      responseData = JSON.parse(text);
    } catch (e) {
      console.error('JSON parse failed:', e.message);
      console.error('Response:', text.substring(0, 300));
      return Response.json({ 
        error: `Failed to parse OSM response: ${e.message}`
      }, { status: 500 });
    }

    // Extract sections from globals.roles
    const formattedSections = [];
    if (responseData && responseData.data_holder && responseData.data_holder.globals && Array.isArray(responseData.data_holder.globals.roles)) {
      const roles = responseData.data_holder.globals.roles;
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