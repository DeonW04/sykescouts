import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle, XCircle, Clock, AlertCircle, Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const SETUP_SCRIPT = `// ─── WhatsApp Session Setup Script ───────────────────────────
// Run this ONCE on your local machine to generate the auth JSON.
// Requirements: Node.js 18+ installed
//
// Steps:
//   1. npm install baileys
//   2. node whatsapp-setup.js
//   3. Scan the QR code with your WhatsApp Business phone
//   4. Copy the printed JSON and paste it into the admin UI
// ─────────────────────────────────────────────────────────────

const makeWASocket = require('baileys').default;
const { useMultiFileAuthState, fetchLatestBaileysVersion } = require('baileys');
const fs = require('fs');

async function main() {
  const { version } = await fetchLatestBaileysVersion();
  const { state, saveCreds } = await useMultiFileAuthState('./wa_auth_files');

  const sock = makeWASocket({ version, auth: state, printQRInTerminal: true });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async ({ connection, qr }) => {
    if (qr) console.log('\\n📱 Scan the QR code above with WhatsApp Business\\n');
    if (connection === 'open') {
      console.log('\\n✅ Connected! Building auth JSON...');
      const dir = './wa_auth_files';
      const authFiles = {};
      for (const f of fs.readdirSync(dir)) {
        authFiles[f] = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf-8'));
      }
      const output = JSON.stringify({ creds: authFiles['creds.json'], keys: authFiles });
      fs.writeFileSync('./whatsapp-auth-export.json', output);
      console.log('\\n📋 Auth JSON saved to whatsapp-auth-export.json');
      console.log('Paste the contents of that file into the admin UI.\\n');
      process.exit(0);
    }
  });
}

main().catch(console.error);
`;

export default function WhatsAppSetupTab() {
  const [status, setStatus] = useState(null);
  const [authJson, setAuthJson] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadStatus = async () => {
    setLoading(true);
    const res = await base44.functions.invoke('whatsappGetStatus', {});
    setStatus(res.data);
    if (res.data?.phone_number) setPhoneNumber(res.data.phone_number);
    setLoading(false);
  };

  useEffect(() => { loadStatus(); }, []);

  const handleSave = async () => {
    if (!authJson.trim()) { toast.error('Paste the auth JSON first'); return; }
    setSaving(true);
    const res = await base44.functions.invoke('whatsappSaveSession', { auth_state: authJson.trim(), phone_number: phoneNumber });
    if (res.data?.success) {
      toast.success('Session saved successfully!');
      setAuthJson('');
      loadStatus();
    } else {
      toast.error(res.data?.error || 'Failed to save session');
    }
    setSaving(false);
  };

  const StatusBadge = () => {
    if (!status?.configured) return <Badge className="bg-gray-100 text-gray-600"><XCircle className="w-3 h-3 mr-1" />Not Configured</Badge>;
    if (status.status === 'connected') return <Badge className="bg-green-100 text-green-700"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
    if (status.status === 'error') return <Badge className="bg-red-100 text-red-700"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>;
    return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3 mr-1" />Disconnected</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Current Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Session Status</CardTitle>
            <Button size="sm" variant="outline" onClick={loadStatus} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-8 w-32 bg-gray-100 rounded animate-pulse" />
          ) : (
            <div className="space-y-2">
              <StatusBadge />
              {status?.phone_number && <p className="text-sm text-gray-600">📱 {status.phone_number}</p>}
              {status?.last_connected && <p className="text-xs text-gray-400">Last connected: {new Date(status.last_connected).toLocaleString()}</p>}
              {status?.last_poll && <p className="text-xs text-gray-400">Last poll: {new Date(status.last_poll).toLocaleString()}</p>}
              {status?.last_poll_error && <p className="text-xs text-red-500">Last error: {status.last_poll_error}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-base text-blue-900">Step 1 — Run the local setup script</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-blue-800">
            Because WhatsApp's pairing requires a persistent connection, you need to run this script <strong>once</strong> on your local machine to generate the auth credentials. You only ever do this once (or if the session expires).
          </p>
          <div className="relative bg-gray-900 rounded-lg p-4 text-xs text-green-300 font-mono overflow-auto max-h-48">
            <pre className="whitespace-pre-wrap">{SETUP_SCRIPT}</pre>
            <button
              className="absolute top-2 right-2 p-1.5 bg-gray-700 hover:bg-gray-600 rounded text-white"
              onClick={() => { navigator.clipboard.writeText(SETUP_SCRIPT); toast.success('Script copied!'); }}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Paste Auth JSON */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 2 — Paste the auth JSON</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600">After the script completes, paste the contents of <code className="bg-gray-100 px-1 rounded">whatsapp-auth-export.json</code> below.</p>
          <div className="space-y-2">
            <Label>WhatsApp Business Number (e.g. 447911123456)</Label>
            <Input placeholder="447911123456" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Auth JSON</Label>
            <Textarea
              placeholder='{"creds": {...}, "keys": {...}}'
              value={authJson}
              onChange={e => setAuthJson(e.target.value)}
              className="font-mono text-xs min-h-32"
            />
          </div>
          <Button onClick={handleSave} disabled={saving || !authJson.trim()} className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white">
            {saving ? 'Saving...' : 'Save Session'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}