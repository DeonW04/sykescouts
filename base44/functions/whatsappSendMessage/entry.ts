import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import makeWASocket, { fetchLatestBaileysVersion, Browsers } from 'npm:baileys';

function buildAuthState(stored) {
  const creds = stored.creds;
  const keyStore = stored.keys || {};

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
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { to, message, is_group } = await req.json();
  if (!to || !message) return Response.json({ error: 'to and message are required' }, { status: 400 });

  const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({});
  if (!sessions[0]?.auth_state) return Response.json({ error: 'No WhatsApp session configured. Please set up the session first.' }, { status: 400 });

  const stored = JSON.parse(sessions[0].auth_state);
  const { state, export: exportState } = buildAuthState(stored);

  const { version } = await fetchLatestBaileysVersion();

  return new Promise((resolve) => {
    let done = false;

    const sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      connectTimeoutMs: 20000
    });

    const finish = async (result) => {
      if (done) return;
      done = true;
      try { sock.end(); } catch (_) {}
      resolve(result);
    };

    const timeout = setTimeout(() => finish(Response.json({ error: 'Connection timed out' }, { status: 500 })), 25000);

    sock.ev.on('connection.update', async (update) => {
      const { connection } = update;

      if (connection === 'open') {
        try {
          const jid = is_group ? `${to}@g.us` : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
          await sock.sendMessage(jid, { text: message });

          // Save updated creds
          const newState = exportState();
          await base44.asServiceRole.entities.WhatsAppSession.update(sessions[0].id, {
            auth_state: JSON.stringify(newState),
            last_connected: new Date().toISOString(),
            status: 'connected'
          });

          // Log outbound
          await base44.asServiceRole.entities.WhatsAppMessage.create({
            direction: 'outbound',
            to_number: to,
            message_text: message,
            is_group: is_group || false,
            timestamp: new Date().toISOString()
          });

          clearTimeout(timeout);
          await finish(Response.json({ success: true }));
        } catch (err) {
          clearTimeout(timeout);
          await finish(Response.json({ error: err.message }, { status: 500 }));
        }
      }

      if (connection === 'close') {
        clearTimeout(timeout);
        await finish(Response.json({ error: 'Connection closed unexpectedly' }, { status: 500 }));
      }
    });
  });
});