import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';

// First: ESM import sodium and patch it
const { default: sodiumESM } = await import('npm:libsodium-wrappers');
await sodiumESM.ready;
sodiumESM.crypto_hash_sha256_BYTES = 32;
sodiumESM.crypto_hash_sha256 = (output, input) => {
  const hash = createHash('sha256').update(Buffer.from(input)).digest();
  output.set(new Uint8Array(hash));
};

// Second: load baileys (hopefully it sees the patched sodium from ESM cache)
const { default: makeWASocket, fetchLatestBaileysVersion, Browsers, initAuthCreds } = await import('npm:baileys');

// Third: try CJS require to see if same instance as what baileys got
const _require = createRequire(import.meta.url);

Deno.serve(async (_req) => {
  const result = {};

  // Check if CJS require now works (since ESM already loaded sodium into cache)
  try {
    const s = _require('libsodium-wrappers');
    result.cjs_sha256_bytes = s?.crypto_hash_sha256_BYTES;
    result.cjs_sha256_fn = typeof s?.crypto_hash_sha256;
    result.cjs_same_as_esm = s === sodiumESM;
  } catch (e) {
    result.cjs_error = e.message;
  }

  // Try to actually run makeWASocket with fresh creds to see if NaN error is gone
  try {
    const { version } = await fetchLatestBaileysVersion();
    const creds = initAuthCreds();
    const keyStore = {};
    const state = {
      creds,
      keys: {
        get: async (type, ids) => {
          const r = {};
          for (const id of ids) { const v = keyStore[`${type}:${id}`]; if (v !== undefined) r[id] = v; }
          return r;
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
    };

    const sock = makeWASocket({ version, auth: state, printQRInTerminal: false, browser: Browsers.ubuntu('Chrome'), connectTimeoutMs: 2000 });
    await new Promise(resolve => setTimeout(resolve, 1500));
    try { sock.end(); } catch (_) {}
    result.makeWASocket_success = true;
  } catch (e) {
    result.makeWASocket_error = e.message;
  }

  return Response.json(result);
});