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

    // Fetch OSM sections with raw response handling
    console.log('Fetching OSM sections...');
    
    const sectionsRes = await fetch('https://www.onlinescoutmanager.co.uk/api.php?action=getSections', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    console.log('Response status:', sectionsRes.status);
    
    // Read response as array buffer first to see raw bytes
    const arrayBuffer = await sectionsRes.arrayBuffer();
    const byteLength = arrayBuffer.byteLength;
    console.log('Response byte length:', byteLength);
    
    if (byteLength === 0) {
      console.error('OSM returned completely empty response body');
      return Response.json({ 
        error: 'OSM returned empty response. Bearer token authentication may not be supported. Try re-connecting to OSM.' 
      }, { status: 500 });
    }

    // Convert to text
    const decoder = new TextDecoder();
    const responseText = decoder.decode(arrayBuffer);
    
    console.log('Response text length:', responseText.length);
    console.log('First 500 chars:', responseText.substring(0, 500));

    if (!responseText.trim()) {
      return Response.json({ 
        error: 'OSM returned whitespace-only response'
      }, { status: 500 });
    }

    // Try to parse as JSON
    let sectionsData;
    try {
      sectionsData = JSON.parse(responseText);
      console.log('Successfully parsed JSON. Keys:', Object.keys(sectionsData || {}).slice(0, 5));
    } catch (e) {
      console.error('JSON parse failed:', e.message);
      console.error('Full response:', responseText);
      return Response.json({ 
        error: `Invalid JSON from OSM: ${e.message}. Response: ${responseText.substring(0, 200)}`
      }, { status: 500 });
    }

    // Format sections
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