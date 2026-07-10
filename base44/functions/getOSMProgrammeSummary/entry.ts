import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { osm_section_id_override, osm_term_id_override, term_start_date, term_end_date } = body;

    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];
    if (!settings?.osm_access_token) {
      return Response.json({ error: 'OSM not connected' }, { status: 400 });
    }

    const accessToken = settings.osm_access_token;
    const sectionId   = osm_section_id_override || settings.osm_section_id;
    let termId        = osm_term_id_override     || settings.osm_term_id;

    if (!sectionId) {
      return Response.json({ error: 'OSM section not configured' }, { status: 400 });
    }

    // If a term date range is supplied, resolve the OSM term whose dates
    // overlap it. This lets the sync follow whichever app term is open
    // (past, current or future) rather than always the configured term.
    if (term_start_date && term_end_date) {
      const dayOnly = (d) => String(d).split('T')[0];
      const appStart = dayOnly(term_start_date);
      const appEnd = dayOnly(term_end_date);
      try {
        const termsUrl = `https://www.onlinescoutmanager.co.uk/api.php?action=getTerms&sectionid=${sectionId}`;
        const termsRes = await fetch(termsUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        if (termsRes.status === 401 || termsRes.status === 403) {
          return Response.json({ error: 'OSM authorization expired', auth_expired: true }, { status: 401 });
        }
        if (termsRes.ok) {
          const termsData = await termsRes.json();
          const sectionTerms = termsData[sectionId] || termsData[String(sectionId)] || [];
          const termsArray = Array.isArray(sectionTerms) ? sectionTerms : Object.values(sectionTerms);
          // Pick the OSM term whose date range overlaps the app term's range.
          const match = termsArray.find(t => {
            const s = dayOnly(t.startdate);
            const e = dayOnly(t.enddate);
            return s <= appEnd && e >= appStart;
          });
          if (match?.termid) termId = String(match.termid);
        }
      } catch (e) {
        console.error('[getOSMProgrammeSummary] term resolve failed:', e.message);
        // Fall back to the configured/override termId below
      }
    }

    if (!termId) {
      return Response.json({ error: 'OSM section or term not configured' }, { status: 400 });
    }

    const url = `https://www.onlinescoutmanager.co.uk/ext/programme/?action=getProgrammeSummary&sectionid=${sectionId}&termid=${termId}&verbose=1`;
    const res = await fetch(url, { headers: { 'Authorization': `Bearer ${accessToken}` } });

    if (res.status === 401 || res.status === 403) {
      return Response.json({ error: 'OSM authorization expired', auth_expired: true }, { status: 401 });
    }
    if (!res.ok) {
      const rb = await res.text();
      return Response.json({ error: `OSM returned ${res.status}: ${rb.substring(0, 200)}` }, { status: 500 });
    }

    const data = await res.json();
    return Response.json({ items: data.items || [] });
  } catch (error) {
    console.error('[getOSMProgrammeSummary] error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});