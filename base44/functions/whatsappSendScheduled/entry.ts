import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

const sodium = (await import('npm:libsodium-wrappers')).default;
await sodium.ready;
if (!sodium.crypto_hash_sha256) {
  sodium.crypto_hash_sha256_BYTES = 32;
  sodium.crypto_hash_sha256 = (output, input) => {
    const hash = createHash('sha256').update(Buffer.from(input)).digest();
    output.set(new Uint8Array(hash));
  };
}
const { default: makeWASocket, fetchLatestBaileysVersion, Browsers } = await import('npm:baileys');

function restoreBuffers(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj.type === 'Buffer' && Array.isArray(obj.data)) return Buffer.from(obj.data);
  if (obj.type === 'Buffer' && typeof obj.data === 'string') return Buffer.from(obj.data, 'base64');
  if (Array.isArray(obj)) return obj.map(restoreBuffers);
  const result = {};
  for (const [key, val] of Object.entries(obj)) result[key] = restoreBuffers(val);
  return result;
}

function buildAuthState(stored) {
  const creds = restoreBuffers(stored.creds);
  const keyStore = restoreBuffers(stored.keys || {});
  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const result = {};
          for (const id of ids) {
            const v = keyStore[`${type}:${id}`];
            if (v !== undefined) result[id] = v;
          }
          return result;
        },
        set: async (data) => {
          for (const [cat, entries] of Object.entries(data)) {
            for (const [id, val] of Object.entries(entries || {})) {
              if (val !== null && val !== undefined) keyStore[`${cat}:${id}`] = val;
              else delete keyStore[`${cat}:${id}`];
            }
          }
        }
      }
    },
    export: () => ({ creds, keys: keyStore })
  };
}

async function buildMessage(schedule, base44) {
  if (schedule.schedule_type === 'direct_message') {
    return schedule.message_text || '';
  }

  if (schedule.schedule_type === 'risk_assessment_leaders') {
    let title = 'Upcoming Session';
    if (schedule.linked_meeting_id) {
      const [mtg] = await base44.asServiceRole.entities.Programme.filter({ id: schedule.linked_meeting_id });
      if (mtg) title = mtg.title;
    } else if (schedule.linked_event_id) {
      const [evt] = await base44.asServiceRole.entities.Event.filter({ id: schedule.linked_event_id });
      if (evt) title = evt.title;
    }
    return `📋 *Risk Assessments – ${title}*\n\nPlease review before the session:\n🔗 ${schedule.ra_link_url}\n\n_No sign-in required_`;
  }

  if (schedule.schedule_type === 'parent_reminder') {
    const blocks = schedule.message_blocks || [];
    const parts = [];
    let meeting = null;

    if (schedule.linked_meeting_id) {
      const [m] = await base44.asServiceRole.entities.Programme.filter({ id: schedule.linked_meeting_id });
      meeting = m;
    }

    for (const block of blocks) {
      if (block.type === 'text' && block.content?.trim()) {
        parts.push(block.content.trim());

      } else if (block.type === 'volunteers' && schedule.linked_meeting_id) {
        const volunteerNames = [];
        const actions = await base44.asServiceRole.entities.ActionRequired.filter({
          programme_id: schedule.linked_meeting_id,
          action_purpose: 'volunteer'
        });
        for (const action of actions) {
          const assignments = await base44.asServiceRole.entities.ActionAssignment.filter({ action_required_id: action.id });
          for (const assignment of assignments) {
            const responses = await base44.asServiceRole.entities.ActionResponse.filter({
              action_required_id: action.id,
              member_id: assignment.member_id,
              response_value: 'yes'
            });
            if (responses.length > 0) {
              const [member] = await base44.asServiceRole.entities.Member.filter({ id: assignment.member_id });
              if (member) volunteerNames.push(member.parent_one_name || member.parent_two_name || 'A parent');
            }
          }
        }
        if (volunteerNames.length > 0) {
          parts.push(`${block.intro || '🙋 *Parent helpers this week:*'}\n${volunteerNames.map(n => `• ${n}`).join('\n')}`);
        } else if (block.fallback_text?.trim()) {
          parts.push(block.fallback_text.trim());
        }

      } else if (block.type === 'location_time' && meeting) {
        const lines = [];
        if (meeting.optional_location) lines.push(`📌 *Location:* ${meeting.optional_location}`);
        if (meeting.optional_start_time || meeting.optional_end_time) {
          const time = [meeting.optional_start_time, meeting.optional_end_time].filter(Boolean).join(' – ');
          lines.push(`🕐 *Time:* ${time}`);
        }
        if (meeting.no_meeting) lines.push(`❌ *No meeting this week*${meeting.no_meeting_reason ? ` – ${meeting.no_meeting_reason}` : ''}`);
        if (lines.length > 0) parts.push(`⚠️ *Change of Details:*\n${lines.join('\n')}`);
      }
    }

    return parts.join('\n\n');
  }

  return '';
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let isAdmin = false;
    try {
      const user = await base44.auth.me();
      isAdmin = user?.role === 'admin';
    } catch (_) { isAdmin = true; }
    if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const now = new Date().toISOString();
    const allScheduled = await base44.asServiceRole.entities.WhatsAppSchedule.filter({ status: 'scheduled' });
    const due = allScheduled.filter(s => s.send_at && s.send_at <= now);

    if (due.length === 0) return Response.json({ success: true, sent: 0, checked: allScheduled.length });

    const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({});
    if (!sessions[0]?.auth_state) return Response.json({ error: 'No WhatsApp session configured' }, { status: 400 });

    const stored = JSON.parse(sessions[0].auth_state);
    const { state, export: exportState } = buildAuthState(stored);
    const { version } = await fetchLatestBaileysVersion();

    const toSend = [];
    for (const schedule of due) {
      try {
        const message = await buildMessage(schedule, base44);
        if (message.trim()) {
          toSend.push({ schedule, message });
        } else {
          await base44.asServiceRole.entities.WhatsAppSchedule.update(schedule.id, { status: 'cancelled', error: 'Empty message generated' });
        }
      } catch (e) {
        console.error('Build message error:', e.message);
        await base44.asServiceRole.entities.WhatsAppSchedule.update(schedule.id, { status: 'failed', error: e.message });
      }
    }

    if (toSend.length === 0) return Response.json({ success: true, sent: 0 });

    return await new Promise((resolve) => {
      let done = false;
      let sentCount = 0;

      const sock = makeWASocket({
        version, auth: state, printQRInTerminal: false,
        browser: Browsers.ubuntu('Chrome'), syncFullHistory: false, connectTimeoutMs: 20000
      });

      const finish = async () => {
        if (done) return;
        done = true;
        try { sock.end(); } catch (_) {}
        await base44.asServiceRole.entities.WhatsAppSession.update(sessions[0].id, {
          auth_state: JSON.stringify(exportState()),
          last_connected: new Date().toISOString()
        });
        resolve(Response.json({ success: true, sent: sentCount }));
      };

      setTimeout(finish, 35000);

      sock.ev.on('connection.update', async ({ connection }) => {
        if (connection === 'open') {
          for (const { schedule, message } of toSend) {
            try {
              const isDirectMsg = schedule.schedule_type === 'direct_message';
              const phone = schedule.recipient_phone || schedule.target_group_jid;
              const jid = isDirectMsg
                ? (phone.includes('@') ? phone : `${phone}@s.whatsapp.net`)
                : (schedule.target_group_jid.includes('@') ? schedule.target_group_jid : `${schedule.target_group_jid}@g.us`);
              await sock.sendMessage(jid, { text: message });
              await base44.asServiceRole.entities.WhatsAppSchedule.update(schedule.id, {
                status: 'sent',
                sent_at: new Date().toISOString()
              });
              await base44.asServiceRole.entities.WhatsAppMessage.create({
                direction: 'outbound',
                to_number: jid,
                is_group: schedule.schedule_type !== 'direct_message',
                group_id: jid,
                group_name: schedule.target_group_name,
                message_text: message,
                timestamp: new Date().toISOString()
              });
              sentCount++;
            } catch (e) {
              console.error('Send error:', e.message);
              await base44.asServiceRole.entities.WhatsAppSchedule.update(schedule.id, { status: 'failed', error: e.message });
            }
          }
          await finish();
        }
        if (connection === 'close') await finish();
      });
    });
  } catch (err) {
    console.error('whatsappSendScheduled error:', err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
});