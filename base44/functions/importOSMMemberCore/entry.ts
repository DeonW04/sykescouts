import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Maps (group_id-column_id) → our entity field name
const GROUP_COL_MAP = {
  '1-2':     'parent_one_first_name',
  '1-3':     'parent_one_surname',
  '1-12':    'parent_one_email',
  '1-18':    'parent_one_phone',
  '2-2':     'parent_two_first_name',
  '2-3':     'parent_two_surname',
  '2-12':    'parent_two_email',
  '2-18':    'parent_two_phone',
  '3-2':     'ec_first_name',
  '3-3':     'ec_surname',
  '3-18':    'emergency_contact_phone',
  '4-54':    'doctors_surgery',
  '4-18':    'doctors_phone',
  '5-7547':  'medical_info',
  '7-34':    'gender',
  '9-24253': 'medications',
  '9-24254': 'allergies',
  '9-24255': 'dietary_requirements',
  '10-24261':'photo_consent_raw',
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    scoutid, firstname, lastname, dob, startedsection, started,
    section_id: appSectionId,
    osm_section_id_override,
  } = body;

  if (!scoutid) return Response.json({ error: 'scoutid is required' }, { status: 400 });

  const settingsList = await base44.asServiceRole.entities.OSMSyncSettings.list();
  const settings = settingsList[0];
  if (!settings?.osm_access_token) return Response.json({ error: 'OSM not connected' }, { status: 400 });

  const { osm_access_token } = settings;
  // Use section-specific OSM section ID if provided, fall back to global
  const osm_section_id = osm_section_id_override || settings.osm_section_id;

  const url = `https://www.onlinescoutmanager.co.uk/ext/customdata/?action=getData&section_id=${osm_section_id}&associated_id=${scoutid}&associated_type=member&associated_is_section=null&varname_filter=null&context=members&group_order=section&access_token=${osm_access_token}`;

  const resp = await fetch(url, { headers: { 'Authorization': `Bearer ${osm_access_token}` } });

  if (!resp.ok) {
    const body2 = await resp.text().catch(() => '');
    console.error(`OSM customdata HTTP ${resp.status}:`, body2.slice(0, 200));
    return Response.json({ error: `OSM API error: ${resp.status}` }, { status: 500 });
  }

  let osmData;
  try {
    osmData = await resp.json();
  } catch (e) {
    return Response.json({ error: 'OSM returned non-JSON for member details.' }, { status: 500 });
  }

  console.log('OSM customdata status:', osmData.status, 'data length:', Array.isArray(osmData.data) ? osmData.data.length : typeof osmData.data);

  const mapped = {};
  if (osmData.data && Array.isArray(osmData.data)) {
    for (const group of osmData.data) {
      for (const col of (group.columns || [])) {
        const key = `${group.group_id}-${col.column_id}`;
        const field = GROUP_COL_MAP[key];
        if (field && col.value != null && col.value !== '') {
          mapped[field] = col.value;
        }
      }
    }
  }

  console.log(`Mapped ${Object.keys(mapped).length} fields for scoutid ${scoutid}`);

  const join = (...parts) => parts.filter(Boolean).join(' ').trim() || null;

  const rawPayload = {
    osm_scoutid:             parseInt(scoutid),
    first_name:              firstname || null,
    surname:                 lastname || null,
    full_name:               join(firstname, lastname),
    date_of_birth:           dob || null,
    join_date:               startedsection || null,
    scouting_start_date:     started || null,
    section_id:              appSectionId || null,
    active:                  true,
    gender:                  mapped.gender || null,
    photo_consent:           mapped.photo_consent_raw
                               ? mapped.photo_consent_raw.toLowerCase().includes('yes')
                               : false,
    parent_one_first_name:   mapped.parent_one_first_name || null,
    parent_one_surname:      mapped.parent_one_surname || null,
    parent_one_name:         join(mapped.parent_one_first_name, mapped.parent_one_surname),
    parent_one_email:        mapped.parent_one_email || null,
    parent_one_phone:        mapped.parent_one_phone || null,
    parent_two_first_name:   mapped.parent_two_first_name || null,
    parent_two_surname:      mapped.parent_two_surname || null,
    parent_two_name:         join(mapped.parent_two_first_name, mapped.parent_two_surname),
    parent_two_email:        mapped.parent_two_email || null,
    parent_two_phone:        mapped.parent_two_phone || null,
    emergency_contact_name:  join(mapped.ec_first_name, mapped.ec_surname),
    emergency_contact_phone: mapped.emergency_contact_phone || null,
    doctors_surgery:         mapped.doctors_surgery || null,
    doctors_phone:           mapped.doctors_phone || null,
    medical_info:            mapped.medical_info || null,
    medications:             mapped.medications || null,
    allergies:               mapped.allergies || null,
    dietary_requirements:    mapped.dietary_requirements || null,
  };

  const memberPayload = Object.fromEntries(
    Object.entries(rawPayload).filter(([, v]) => v !== null && v !== undefined && v !== '')
  );
  memberPayload.active = true;
  memberPayload.photo_consent = rawPayload.photo_consent;

  const existing = await base44.asServiceRole.entities.Member.filter({ osm_scoutid: parseInt(scoutid) });
  let member;
  if (existing.length > 0) {
    await base44.asServiceRole.entities.Member.update(existing[0].id, memberPayload);
    member = { ...existing[0], ...memberPayload, id: existing[0].id };
  } else {
    member = await base44.asServiceRole.entities.Member.create(memberPayload);
  }

  console.log(`Imported member ${member.full_name} (OSM ID: ${scoutid}) → App ID: ${member.id}`);
  return Response.json({ success: true, member_id: member.id, member });
});