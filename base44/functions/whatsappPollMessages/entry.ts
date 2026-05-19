import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import sodium from 'npm:libsodium-wrappers';
import makeWASocket, { fetchLatestBaileysVersion, Browsers } from 'npm:baileys';
import { createHash } from 'node:crypto';

function parseYesNo(text) {
  const lower = (text || '').toLowerCase().trim();
  const YES = ['yes', 'y', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 'confirm', 'confirmed', 'attending', 'coming', '👍', '✅', 'absolutely', 'definitely'];
  const NO  = ['no', 'n', 'nope', 'nah', "can't", 'cant', 'cannot', 'decline', 'declined', 'not coming', 'not attending', '❌', '👎', 'unable', 'unavailable'];
  if (YES.some(w => lower === w || lower.startsWith(w + ' '))) return 'yes';
  if (NO.some(w => lower === w || lower.startsWith(w + ' '))) return 'no';
  return 'unknown';
}

// Recursively convert { type: 'Buffer', data: [...] } objects back into real Buffers
function restoreBuffers(obj) {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (obj.type === 'Buffer' && Array.isArray(obj.data)) return Buffer.from(obj.data);
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

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  // Allow scheduled calls (no user) or admin user calls
  let isAdmin = false;
  try {
    const user = await base44.auth.me();
    isAdmin = user?.role === 'admin';
  } catch (_) {
    // Called from scheduled automation — allow
    isAdmin = true;
  }
  if (!isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({});
  if (!sessions[0]?.auth_state) {
    return Response.json({ skipped: true, reason: 'No session configured' });
  }

  const session = sessions[0];
  // Ensure sodium WASM is ready before Baileys uses it
  await sodium.ready;
  // libsodium-wrappers (non-sumo) is missing SHA-256 — patch it using Node's built-in crypto
  if (!sodium.crypto_hash_sha256) {
    sodium.crypto_hash_sha256_BYTES = 32;
    sodium.crypto_hash_sha256 = (output, input) => {
      const hash = createHash('sha256').update(Buffer.from(input)).digest();
      output.set(new Uint8Array(hash));
    };
  }

  const stored = JSON.parse(session.auth_state);
  const { state, export: exportState } = buildAuthState(stored);
  const { version } = await fetchLatestBaileysVersion();

  // Get existing message IDs to avoid duplicates
  const recentMessages = await base44.asServiceRole.entities.WhatsAppMessage.filter({ direction: 'inbound' });
  const seenIds = new Set(recentMessages.map(m => m.wa_message_id).filter(Boolean));

  return await new Promise((resolve) => {
    let done = false;
    const collectedMessages = [];

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      connectTimeoutMs: 20000
    });

    const finish = async (error) => {
      if (done) return;
      done = true;
      try { sock.end(); } catch (_) {}

      try {
        // Save collected messages
        for (const msg of collectedMessages) {
          await base44.asServiceRole.entities.WhatsAppMessage.create(msg);
        }

        // Save updated auth state
        await base44.asServiceRole.entities.WhatsAppSession.update(session.id, {
          auth_state: JSON.stringify(exportState()),
          last_poll: new Date().toISOString(),
          status: error ? 'error' : 'connected',
          last_poll_error: error || null
        });

        resolve(Response.json({
          success: !error,
          messages_received: collectedMessages.length,
          error: error || null
        }));
      } catch (saveErr) {
        resolve(Response.json({ error: saveErr.message }, { status: 500 }));
      }
    };

    // Collect messages for 10 seconds then disconnect
    const pollTimeout = setTimeout(() => finish(null), 10000);
    const hardTimeout = setTimeout(() => finish('Timeout'), 30000);

    sock.ev.on('connection.update', async (update) => {
      const { connection } = update;
      if (connection === 'close') {
        clearTimeout(pollTimeout);
        clearTimeout(hardTimeout);
        await finish(null);
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      // Only process new messages (not historical)
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (msg.key.fromMe) continue; // Skip outbound
        const msgId = msg.key.id;
        if (seenIds.has(msgId)) continue;
        seenIds.add(msgId);

        const text = msg.message?.conversation
          || msg.message?.extendedTextMessage?.text
          || '';
        if (!text) continue;

        const isGroup = msg.key.remoteJid?.endsWith('@g.us') || false;
        const from = isGroup
          ? (msg.key.participant || '').replace('@s.whatsapp.net', '')
          : (msg.key.remoteJid || '').replace('@s.whatsapp.net', '');
        const groupId = isGroup ? msg.key.remoteJid : null;

        collectedMessages.push({
          direction: 'inbound',
          from_number: from,
          group_id: groupId,
          is_group: isGroup,
          message_text: text,
          parsed_response: isGroup ? null : parseYesNo(text),
          wa_message_id: msgId,
          timestamp: new Date((msg.messageTimestamp || Date.now() / 1000) * 1000).toISOString()
        });
      }
    });
  });
});