import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Banknote, ArrowRightLeft, CheckCircle, User, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function TreasurerCashTaken() {
  const queryClient = useQueryClient();
  const [transferDialog, setTransferDialog] = useState(null);
  const [transferTarget, setTransferTarget] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: payments = [] } = useQuery({
    queryKey: ['cash-payments'],
    queryFn: () => base44.entities.CashPayment.list('-taken_date', 300),
  });
  const { data: leaders = [] } = useQuery({ queryKey: ['leaders'], queryFn: () => base44.entities.Leader.filter({}) });
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const outstanding = payments.filter(p => !p.paid_in);
  const paidIn = payments.filter(p => p.paid_in);
  const outstandingTotal = outstanding.reduce((s, p) => s + (p.amount || 0), 0);

  const holderLabel = (p) => {
    if (p.holder_type === 'treasurer') return 'Treasurer';
    return p.current_holder_name || 'Leader';
  };

  const openTransfer = (p) => {
    setTransferTarget('');
    setTransferDialog(p);
  };

  const handleTransfer = async () => {
    if (!transferDialog || !transferTarget) { toast.error('Choose who to transfer to'); return; }
    setSaving(true);
    try {
      if (transferTarget === 'treasurer') {
        await base44.entities.CashPayment.update(transferDialog.id, {
          holder_type: 'treasurer',
          current_holder_leader_id: '',
          current_holder_name: 'Treasurer',
        });
      } else {
        const leader = leaders.find(l => l.id === transferTarget);
        await base44.entities.CashPayment.update(transferDialog.id, {
          holder_type: 'leader',
          current_holder_leader_id: leader?.id || '',
          current_holder_name: leader?.display_name || 'Leader',
        });
      }
      queryClient.invalidateQueries({ queryKey: ['cash-payments'] });
      toast.success('Cash transferred');
      setTransferDialog(null);
    } catch (e) { toast.error('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleMarkPaidIn = async (p) => {
    try {
      await base44.entities.CashPayment.update(p.id, {
        paid_in: true,
        paid_in_date: new Date().toISOString().split('T')[0],
        paid_in_by: user?.email,
      });
      queryClient.invalidateQueries({ queryKey: ['cash-payments'] });
      queryClient.invalidateQueries({ queryKey: ['cash-payments-dash'] });
      toast.success('Marked as paid into bank');
    } catch (e) { toast.error('Failed: ' + e.message); }
  };

  const Row = ({ p, showPaidIn }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold">{fmt(p.amount)}</span>
          <span className="text-sm text-gray-600">{p.member_name || 'Member'}</span>
          {p.paid_in && <Badge className="bg-green-100 text-green-800 text-xs">Paid in</Badge>}
        </div>
        {p.context_label && <p className="text-xs text-gray-500 mt-0.5">{p.context_label}</p>}
        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
          {p.holder_type === 'treasurer' ? <Landmark className="w-3 h-3" /> : <User className="w-3 h-3" />}
          Held by {holderLabel(p)}
          {p.taken_date && ` · taken ${format(new Date(p.taken_date), 'd MMM yyyy')}`}
          {p.paid_in && p.paid_in_date && ` · paid in ${format(new Date(p.paid_in_date), 'd MMM yyyy')}`}
        </p>
      </div>
      {!p.paid_in && (
        <div className="flex flex-col gap-1.5 flex-shrink-0">
          <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => openTransfer(p)}>
            <ArrowRightLeft className="w-3 h-3" /> Transfer
          </Button>
          <Button size="sm" className="text-xs h-7 gap-1 bg-[#1a472a] hover:bg-[#13381f]" onClick={() => handleMarkPaidIn(p)}>
            <CheckCircle className="w-3 h-3" /> Paid in
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <TreasurerLayout title="Cash Taken">
      <div className="flex items-center gap-2 mb-4">
        <Badge className="bg-amber-100 text-amber-800">{outstanding.length} outstanding · {fmt(outstandingTotal)}</Badge>
        <Badge className="bg-green-100 text-green-800">{paidIn.length} paid in</Badge>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-amber-600">
              <Banknote className="w-4 h-4" /> Outstanding Cash
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {outstanding.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No outstanding cash — everything's been paid in.</p>
            ) : outstanding.map(p => <Row key={p.id} p={p} />)}
          </CardContent>
        </Card>

        {paidIn.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" /> Paid Into Bank
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {paidIn.map(p => <Row key={p.id} p={p} showPaidIn />)}
            </CardContent>
          </Card>
        )}

        {payments.length === 0 && (
          <Card className="flex items-center justify-center h-48">
            <div className="text-center text-gray-400">
              <Banknote className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No cash payments taken yet.</p>
            </div>
          </Card>
        )}
      </div>

      {/* Transfer Dialog */}
      <Dialog open={!!transferDialog} onOpenChange={open => { if (!open) setTransferDialog(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Transfer Cash — {fmt(transferDialog?.amount)}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-500">Currently held by {transferDialog && holderLabel(transferDialog)}. Transfer to:</p>
            <Select value={transferTarget} onValueChange={setTransferTarget}>
              <SelectTrigger><SelectValue placeholder="Choose recipient..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="treasurer">Treasurer (me)</SelectItem>
                {leaders
                  .filter(l => l.id !== transferDialog?.current_holder_leader_id)
                  .map(l => <SelectItem key={l.id} value={l.id}>{l.display_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialog(null)}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">{saving ? 'Transferring...' : 'Transfer'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TreasurerLayout>
  );
}