import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Step A — Guard
    const settingsArr = await base44.asServiceRole.entities.OSMSyncSettings.filter({});
    const settings = settingsArr[0];

    const accessToken = settings?.osm_access_token;
    if (!accessToken) {
      return Response.json({ error: 'OSM account not connected. Please connect in Admin Settings → OSM Badge Sync.' }, { status: 500 });
    }

    if (!settings || !settings.is_active) {
      return Response.json({ message: 'Sync is disabled.' });
    }

    const pending = await base44.asServiceRole.entities.PendingBadgeSync.filter({ status: 'pending' });
    const now = new Date().toISOString();
    const todayStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    const sendEmail = async (subject, body) => {
      const emails = (settings.notification_emails || '').split(',').map(e => e.trim()).filter(Boolean);
      for (const email of emails) {
        await base44.asServiceRole.integrations.Core.SendEmail({ to: email, subject, body });
      }
    };

    if (pending.length === 0) {
      await sendEmail(
        `OSM Badge Sync — Nothing to Sync [${todayStr}]`,
        `The scheduled OSM sync ran on ${now} but found no pending badge records.`
      );
      await base44.asServiceRole.entities.OSMSyncSettings.update(settings.id, { last_synced: now });
      return Response.json({ message: 'Nothing to sync.' });
    }

    const synced = [];
    const failed = [];

    // Step B — complete actions
    const completeRecords = pending.filter(r => r.action === 'complete');
    for (const record of completeRecords) {
      const body = JSON.stringify({
        action: 'overrideCompletion',
        badge_id: record.badge_id,
        badge_version: record.badge_version || 0,
        section_id: record.section_id,
        section: record.section,
        level: record.level || 1,
        scoutid: record.scoutid,
        skip_track_changes: false,
      });
      const res = await fetch('https://www.onlinescoutmanager.co.uk/ext/generic/startup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body,
      });
      if (res.ok) {
        await base44.asServiceRole.entities.PendingBadgeSync.update(record.id, { status: 'synced', synced_date: now });
        synced.push(record);
      } else {
        const errText = await res.text();
        await base44.asServiceRole.entities.PendingBadgeSync.update(record.id, { status: 'failed', error_notes: `HTTP ${res.status}: ${errText.slice(0, 500)}` });
        failed.push({ ...record, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` });
      }
    }

    // Step C — award actions, grouped by section_id
    const awardRecords = pending.filter(r => r.action === 'award');
    const bySection = {};
    for (const r of awardRecords) {
      const key = String(r.section_id);
      if (!bySection[key]) bySection[key] = [];
      bySection[key].push(r);
    }

    for (const [sectionId, records] of Object.entries(bySection)) {
      const sectionType = records[0].section;
      const entries = records.map(r => ({ badge_id: r.badge_id, badge_version: r.badge_version || 0, level: 0, member_id: r.scoutid }));
      const body = JSON.stringify({
        action: 'awardBadge',
        section_id: sectionId,
        section: sectionType,
        entries,
        skip_track_changes: true,
      });
      const res = await fetch('https://www.onlinescoutmanager.co.uk/ext/generic/startup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body,
      });
      if (res.ok) {
        for (const r of records) {
          await base44.asServiceRole.entities.PendingBadgeSync.update(r.id, { status: 'synced', synced_date: now });
          synced.push(r);
        }
      } else {
        const errText = await res.text();
        for (const r of records) {
          await base44.asServiceRole.entities.PendingBadgeSync.update(r.id, { status: 'failed', error_notes: `HTTP ${res.status}: ${errText.slice(0, 500)}` });
          failed.push({ ...r, error: `HTTP ${res.status}: ${errText.slice(0, 200)}` });
        }
      }
    }

    // Step D — summary email
    const successRows = synced.map(r => `<tr><td style="padding:6px 12px">${r.firstname} ${r.lastname}</td><td style="padding:6px 12px">${r.badge_id}</td><td style="padding:6px 12px">${r.action}</td></tr>`).join('');
    const failedRows = failed.map(r => `<tr><td style="padding:6px 12px">${r.firstname} ${r.lastname}</td><td style="padding:6px 12px">${r.badge_id}</td><td style="padding:6px 12px;color:#dc2626">${r.error}</td></tr>`).join('');

    const emailHtml = `
<html><body style="font-family:sans-serif;max-width:700px;margin:auto;padding:20px">
<h2 style="color:#004851">OSM Badge Sync Report — ${todayStr}</h2>
<p><strong>Sync ran at:</strong> ${now}</p>
<p><strong>Total attempted:</strong> ${pending.length} | <strong>Synced:</strong> ${synced.length} | <strong>Failed:</strong> ${failed.length}</p>
${synced.length > 0 ? `
<h3 style="color:#16a34a">✅ Successfully Synced (${synced.length})</h3>
<table style="border-collapse:collapse;width:100%;background:#f0fdf4;border-radius:8px">
<tr style="background:#bbf7d0"><th style="padding:8px 12px;text-align:left">Member</th><th style="padding:8px 12px;text-align:left">Badge ID</th><th style="padding:8px 12px;text-align:left">Action</th></tr>
${successRows}
</table>` : ''}
${failed.length > 0 ? `
<h3 style="color:#dc2626">❌ Failed (${failed.length})</h3>
<table style="border-collapse:collapse;width:100%;background:#fef2f2;border-radius:8px">
<tr style="background:#fecaca"><th style="padding:8px 12px;text-align:left">Member</th><th style="padding:8px 12px;text-align:left">Badge ID</th><th style="padding:8px 12px;text-align:left">Error</th></tr>
${failedRows}
</table>` : ''}
${failed.length === 0 ? '<p style="color:#16a34a;font-weight:bold">All badge records synced successfully!</p>' : ''}
</body></html>`;

    await sendEmail(`OSM Badge Sync Report — ${todayStr}`, emailHtml);

    // Step E — update last_synced
    await base44.asServiceRole.entities.OSMSyncSettings.update(settings.id, { last_synced: now });

    return Response.json({ synced: synced.length, failed: failed.length, message: 'Sync complete.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});