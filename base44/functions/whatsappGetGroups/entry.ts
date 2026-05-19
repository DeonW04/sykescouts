import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import makeWASocket, { fetchLatestBaileysVersion, Browsers } from 'npm:baileys';
import sodium from 'npm:libsodium-wrappers';

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
  if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

  const sessions = await base44.asServiceRole.entities.WhatsAppSession.filter({});
  if (!sessions[0]?.auth_state) return Response.json({ error: 'No session configured' }, { status: 400 });

  const stored = JSON.parse(sessions[0].auth_state);
  const { state, export: exportState } = buildAuthState(stored);
  await sodium.ready;
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

      // Save updated auth
      await base44.asServiceRole.entities.WhatsAppSession.update(sessions[0].id, {
        auth_state: JSON.stringify(exportState()),
        last_connected: new Date().toISOString()
      });

      resolve(result);
    };

    setTimeout(() => finish(Response.json({ error: 'Timeout fetching groups' }, { status: 500 })), 25000);

    sock.ev.on('connection.update', async (update) => {
      if (update.connection === 'open') {
        try {
          const groups = await sock.groupFetchAllParticipating();
          const list = Object.values(groups).map(g => ({
            id: g.id,
            name: g.subject,
            participant_count: g.participants?.length || 0
          }));
          await finish(Response.json({ groups: list }));
        } catch (err) {
          await finish(Response.json({ error: err.message }, { status: 500 }));
        }
      }
      if (update.connection === 'close') {
        await finish(Response.json({ error: 'Connection closed' }, { status: 500 }));
      }
    });
  });
});