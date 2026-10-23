import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2 } from 'lucide-react';
import ConsentLinkCopy from '@/components/meeting/ConsentLinkCopy';

export default function EventConsentQrDialog({ target, eventId, onClose }) {
  const client = useQueryClient();
  const { data, error, isFetching, refetch } = useQuery({
    queryKey: ['event-consent-qr', eventId, target.form.id, target.member.id],
    queryFn: async () => (await base44.functions.invoke('eventConsentQr', { operation: 'create', event_id: eventId, form_id: target.form.id, member_id: target.member.id })).data,
    staleTime: Infinity, gcTime: 0, retry: false,
  });
  const { data: status, error: statusError } = useQuery({
    queryKey: ['event-consent-qr-status', data?.token],
    queryFn: async () => (await base44.functions.invoke('eventConsentQr', { operation: 'status', token: data.token })).data,
    enabled: !!data?.token, refetchInterval: query => query.state.data?.completed ? false : 3000, retry: false,
  });
  const complete = data?.completed || status?.completed;
  useEffect(() => { if (data || complete) client.invalidateQueries({ queryKey: ['consent-submissions', eventId, 'event'] }); }, [data, complete, eventId, client]);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}><DialogContent className="max-w-sm"><DialogHeader>
    <DialogTitle>Consent for {target.member.full_name}</DialogTitle><DialogDescription>{target.form.title}</DialogDescription>
    </DialogHeader><div className="space-y-4 text-center">
    {isFetching ? <Loader2 className="mx-auto h-8 w-8 animate-spin" aria-label="Creating QR code" />
      : error || statusError ? <><p role="alert" className="text-sm text-destructive">{(error || statusError).response?.data?.error || (error || statusError).message}</p><Button onClick={() => refetch()}>Create a new QR code</Button></>
      : complete ? <><CheckCircle2 className="mx-auto h-12 w-12" /><p className="font-semibold">Consent received</p><p className="text-sm text-muted-foreground">The member’s consent status has been updated.</p></>
      : data?.svg ? <><img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(data.svg)}`} alt="Scan to complete and sign this member’s consent form" className="mx-auto w-full max-w-[280px]" /><ConsentLinkCopy key={data.url} url={data.url} /><p className="text-sm">Ask the parent to scan with their phone camera. No sign-in needed.</p><p className="text-xs text-muted-foreground">Private link for this member only. Expires in 24 hours. Keep it with the parent or guardian.</p><a href={data.url} target="_blank" rel="noopener noreferrer" className="block text-sm underline">Open consent form</a></> : null}
    </div></DialogContent></Dialog>;
}