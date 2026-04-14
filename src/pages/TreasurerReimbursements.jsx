import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle, XCircle, Clock, Banknote, Plus } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function TreasurerReimbursements() {
  const queryClient = useQueryClient();
  const [payDialog, setPayDialog] = useState(null);
  const [rejectDialog, setRejectDialog] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [newDialog, setNewDialog] = useState(false);
  const [form, setForm] = useState({ leader_id: '', amount: '', description: '', category: 'other', linked_event_id: '' });
  const [saving, setSaving] = useState(false);

  const { data: reimbursements = [] } = useQuery({
    queryKey: ['reimbursements'],
    queryFn: () => base44.entities.Reimbursement.list('-created_date', 200),
  });
  const { data: leaders = [] } = useQuery({ queryKey: ['leaders'], queryFn: () => base44.entities.Leader.filter({}) });
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-start_date', 100) });
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const getLeader = (id) => leaders.find(l => l.id === id);
  const getEvent = (id) => events.find(e => e.id === id);

  const isGLVOrTreasurer = user?.role === 'admin' || user?.role === 'treasurer' || user?.role === 'glv';

  const handleApprove = async (r) => {
    await base44.entities.Reimbursement.update(r.id, {
      approval_status: 'approved',
      approved_by: user?.email,
      approved_date: new Date().toISOString().split('T')[0],
    });
    queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
    toast.success('Reimbursement approved');
  };

  const handleReject = async () => {
    await base44.entities.Reimbursement.update(rejectDialog.id, {
      approval_status: 'rejected',
      rejection_reason: rejectionReason,
    });
    queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
    toast.success('Reimbursement rejected');
    setRejectDialog(null);
    setRejectionReason('');
  };

  const handleMarkPaid = async (r) => {
    await base44.entities.Reimbursement.update(r.id, {
      payment_status: 'paid',
      paid_date: new Date().toISOString().split('T')[0],
    });
    // Add ledger entry
    await base44.entities.LedgerEntry.create({
      date: new Date().toISOString().split('T')[0],
      type: 'expense',
      amount: r.amount,
      category: 'reimbursement',
      description: `Reimbursement - ${getLeader(r.leader_id)?.display_name || 'Leader'}: ${r.description}`,
      entered_by: user?.email,
    });
    queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
    queryClient.invalidateQueries({ queryKey: ['ledger'] });
    toast.success('Marked as paid and ledger updated');
    setPayDialog(null);
  };

  const handleCreate = async () => {
    if (!form.leader_id || !form.amount || !form.description) {
      toast.error('Please fill in required fields');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.Reimbursement.create({
        leader_id: form.leader_id,
        amount: parseFloat(form.amount),
        description: form.description,
        category: form.category,
        linked_event_id: form.linked_event_id || null,
        approval_status: 'pending_approval',
        payment_status: 'unpaid',
      });
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      toast.success('Reimbursement created');
      setNewDialog(false);
      setForm({ leader_id: '', amount: '', description: '', category: 'other', linked_event_id: '' });
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (r) => {
    if (r.approval_status === 'rejected') return <Badge className="bg-red-100 text-red-800 text-xs">Rejected</Badge>;
    if (r.payment_status === 'paid') return <Badge className="bg-green-100 text-green-800 text-xs">Paid</Badge>;
    if (r.approval_status === 'approved') return <Badge className="bg-blue-100 text-blue-800 text-xs">Approved — Unpaid</Badge>;
    return <Badge className="bg-amber-100 text-amber-800 text-xs">Pending Approval</Badge>;
  };

  const groups = {
    pending: reimbursements.filter(r => r.approval_status === 'pending_approval'),
    approved: reimbursements.filter(r => r.approval_status === 'approved' && r.payment_status === 'unpaid'),
    paid: reimbursements.filter(r => r.payment_status === 'paid'),
    rejected: reimbursements.filter(r => r.approval_status === 'rejected'),
  };

  const groupIcons = { pending: Clock, approved: CheckCircle, paid: Banknote, rejected: XCircle };

  const RCard = ({ r }) => {
    const leader = getLeader(r.leader_id);
    const event = getEvent(r.linked_event_id);
    return (
      <div className="border rounded-lg p-4 space-y-2">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <p className="font-semibold">{leader?.display_name || 'Unknown leader'}</p>
            <p className="text-sm text-gray-600">{r.description}</p>
            {event && <p className="text-xs text-gray-400">Event: {event.title}</p>}
            {r.rejection_reason && <p className="text-xs text-red-500 mt-1">Reason: {r.rejection_reason}</p>}
          </div>
          <div className="text-right">
            <p className="text-xl font-bold text-gray-800">{fmt(r.amount)}</p>
            {statusBadge(r)}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {r.approval_status === 'pending_approval' && isGLVOrTreasurer && (
            <>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleApprove(r)}>
                <CheckCircle className="w-3 h-3 mr-1" />Approve
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 border-red-300" onClick={() => setRejectDialog(r)}>
                <XCircle className="w-3 h-3 mr-1" />Reject
              </Button>
            </>
          )}
          {r.approval_status === 'approved' && r.payment_status === 'unpaid' && (
            <Button size="sm" className="bg-[#1a472a] hover:bg-[#13381f]" onClick={() => setPayDialog(r)}>
              <Banknote className="w-3 h-3 mr-1" />Pay Leader
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <TreasurerLayout title="Leader Reimbursements">
      <div className="flex justify-end mb-4">
        <Button onClick={() => setNewDialog(true)} className="bg-[#1a472a] hover:bg-[#13381f]">
          <Plus className="w-4 h-4 mr-2" />New Reimbursement
        </Button>
      </div>

      <div className="space-y-6">
        {[
          { key: 'pending', title: 'Pending Approval', color: 'text-amber-600' },
          { key: 'approved', title: 'Approved — Awaiting Payment', color: 'text-blue-600' },
          { key: 'paid', title: 'Paid', color: 'text-green-600' },
          { key: 'rejected', title: 'Rejected', color: 'text-red-500' },
        ].map(({ key, title, color }) => {
          const Icon = groupIcons[key];
          return groups[key].length > 0 ? (
              <Card key={key}>
              <CardHeader>
                <CardTitle className={`text-base flex items-center gap-2 ${color}`}>
                  <Icon className="w-4 h-4" />{title} ({groups[key].length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {groups[key].map(r => <RCard key={r.id} r={r} />)}
              </CardContent>
            </Card>
          ) : null;
        })}
        {reimbursements.length === 0 && (
          <Card className="flex items-center justify-center h-48">
            <p className="text-gray-400">No reimbursements yet</p>
          </Card>
        )}
      </div>

      {/* Pay Leader Dialog */}
      <Dialog open={!!payDialog} onOpenChange={open => !open && setPayDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pay Leader</DialogTitle></DialogHeader>
          {payDialog && (() => {
            const leader = getLeader(payDialog.leader_id);
            return (
              <div className="space-y-4 py-2">
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between"><span className="text-sm text-gray-500">Leader</span><span className="font-semibold">{leader?.display_name}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-500">Account Name</span><span className="font-semibold">{leader?.bank_account_name || 'Not set'}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-500">Sort Code</span><span className="font-semibold">{leader?.bank_sort_code || 'Not set'}</span></div>
                  <div className="flex justify-between"><span className="text-sm text-gray-500">Account No.</span><span className="font-semibold">{leader?.bank_account_number || 'Not set'}</span></div>
                  <div className="flex justify-between border-t pt-2"><span className="text-sm text-gray-500">Amount Due</span><span className="text-xl font-bold text-green-700">{fmt(payDialog.amount)}</span></div>
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialog(null)}>Cancel</Button>
            <Button onClick={() => handleMarkPaid(payDialog)} className="bg-[#1a472a] hover:bg-[#13381f]">
              <CheckCircle className="w-4 h-4 mr-2" />Mark as Paid
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={open => !open && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject Reimbursement</DialogTitle></DialogHeader>
          <div className="py-2 space-y-3">
            <p className="text-sm text-gray-600">Please provide a reason for rejecting this reimbursement.</p>
            <div>
              <Label>Reason</Label>
              <Input value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} placeholder="Enter reason..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)}>Cancel</Button>
            <Button onClick={handleReject} className="bg-red-600 hover:bg-red-700">Reject</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Reimbursement Dialog */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Reimbursement</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Leader</Label>
              <Select value={form.leader_id} onValueChange={v => setForm(f => ({ ...f, leader_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select leader..." /></SelectTrigger>
                <SelectContent>
                  {leaders.map(l => <SelectItem key={l.id} value={l.id}>{l.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (£)</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {['equipment', 'food', 'transport', 'hall_hire', 'badges', 'other'].map(c => (
                      <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What was the expense for?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">
              {saving ? 'Saving...' : 'Create Reimbursement'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TreasurerLayout>
  );
}