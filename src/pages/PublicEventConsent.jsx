import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import PublicConsentSigningForm from '@/components/parent/PublicConsentSigningForm';

export default function PublicEventConsent() {
  const [token] = useState(() => window.location.hash.slice(1));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    try {
      if (!token) { setError('Scan the QR code shown by your leader to open your child’s form.'); return; }
      const result = await base44.functions.invoke('eventConsentQr', { operation: 'load', token });
      if (result.data.error) throw new Error(result.data.error);
      setData(result.data);
    } catch (e) { setError(e.response?.data?.error || e.message || 'Unable to open this form.'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [token]);
  return <main className="min-h-screen bg-muted px-4 py-8 sm:py-12"><div className="mx-auto max-w-xl rounded-2xl border bg-card p-5 sm:p-8 space-y-6">
    <header className="space-y-2"><FileText className="h-8 w-8" /><p className="text-sm text-muted-foreground">40th Rochdale (Syke) Scouts</p><h1 className="text-2xl font-bold">{data?.form?.title || 'Event consent form'}</h1><p className="text-sm text-muted-foreground">Complete and sign your child’s consent form. No sign-in needed.</p></header>
    {loading ? <Loader2 className="mx-auto h-8 w-8 animate-spin" aria-label="Loading consent form" />
      : error ? <div className="space-y-3"><p role="alert" className="text-destructive">{error}</p>{token && <Button onClick={load}>Try again</Button>}</div>
      : data?.completed ? <section className="space-y-3 text-center py-6"><CheckCircle2 className="mx-auto h-12 w-12" /><h2 className="text-xl font-semibold">Consent received</h2><p>This consent form has been signed. Thank you, you can close this page.</p></section>
      : data?.form ? <><section className="rounded-xl border bg-muted p-4"><p className="font-semibold">{data.member_name}</p><p className="text-sm text-muted-foreground">{data.event_title}</p></section>{data.form.description && <p className="text-sm whitespace-pre-wrap">{data.form.description}</p>}<PublicConsentSigningForm data={data} token={token} onComplete={() => setData({ completed: true })} /></> : null}
  </div></main>;
}