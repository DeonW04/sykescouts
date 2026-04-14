import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Receipt, CheckCircle, Upload, Plus } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;
const CATEGORIES = ['equipment', 'food', 'transport', 'hall_hire', 'badges', 'other'];

export default function TreasurerReceiptAllocation() {
  const queryClient = useQueryClient();
  const [allocateDialog, setAllocateDialog] = useState(null);
  const [newDialog, setNewDialog] = useState(false);
  const [form, setForm] = useState({ amount: '', category: 'other', payment_method: 'scout_bank_card', linked_event_id: '', linked_meeting_id: '', leader_id: '', notes: '', receipt_url: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const { data: allocations = [], refetch } = useQuery({
    queryKey: ['receipt-allocations'],
    queryFn: () => base44.entities.ReceiptAllocation.list('-created_date', 200),
  });
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-start_date', 100) });
  const { data: leaders = [] } = useQuery({ queryKey: ['leaders'], queryFn: () => base44.entities.Leader.filter({}) });
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const unallocated = allocations.filter(r => r.status === 'unallocated');
  const allocated = allocations.filter(r => r.status === 'allocated');

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, receipt_url: res.file_url }));
      toast.success('Receipt uploaded');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleAddReceipt = async () => {
    if (!form.amount) { toast.error('Amount is required'); return; }
    setSaving(true);
    try {
      await base44.entities.ReceiptAllocation.create({
        ...form,
        amount: parseFloat(form.amount),
        status: 'unallocated',
      });
      queryClient.invalidateQueries({ queryKey: ['receipt-allocations'] });
      toast.success('Receipt added');
      setNewDialog(false);
      setForm({ amount: '', category: 'other', payment_method: 'scout_bank_card', linked_event_id: '', linked_meeting_id: '', leader_id: '', notes: '', receipt_url: '' });
    } catch (e) { toast.error('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleAllocate = async () => {
    if (!allocateDialog) return;
    setSaving(true);
    try {
      const updates = {
        status: 'allocated',
        category: form.category,
        payment_method: form.payment_method,
        amount: parseFloat(form.amount || allocateDialog.amount),
        linked_event_id: form.linked_event_id || null,
        leader_id: form.payment_method === 'leader_paid_personally' ? form.leader_id : null,
        notes: form.notes,
        allocated_by: user?.email,
        allocation_date: new Date().toISOString().split('T')[0],
      };

      await base44.entities.ReceiptAllocation.update(allocateDialog.id, updates);

      // Create ledger entry
      const ledgerEntry = await base44.entities.LedgerEntry.create({
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        amount: updates.amount,
        category: updates.category,
        description: `Receipt: ${form.notes || updates.category}`,
        linked_event_id: updates.linked_event_id,
        receipt_reference: allocateDialog.id,
        entered_by: user?.email,
      });

      // Auto-create reimbursement if paid personally
      if (updates.payment_method === 'leader_paid_personally' && updates.leader_id) {
        await base44.entities.Reimbursement.create({
          leader_id: updates.leader_id,
          amount: updates.amount,
          description: form.notes || `Receipt allocation - ${updates.category}`,
          category: updates.category,
          linked_event_id: updates.linked_event_id || null,
          linked_receipt_id: allocateDialog.id,
          approval_status: 'pending_approval',
          payment_status: 'unpaid',
          ledger_entry_id: ledgerEntry.id,
        });
        toast.success('Allocated and reimbursement created for leader');
      } else {
        toast.success('Receipt allocated to ledger');
      }

      queryClient.invalidateQueries({ queryKey: ['receipt-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      setAllocateDialog(null);
    } catch (e) { toast.error('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const openAllocate = (r) => {
    setForm({ amount: String(r.amount), category: r.category || 'other', payment_method: r.payment_method || 'scout_bank_card', linked_event_id: r.linked_event_id || '', leader_id: r.leader_id || '', notes: r.notes || '' });
    setAllocateDialog(r);
  };

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <TreasurerLayout title="Receipt Allocation">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Badge className="bg-amber-100 text-amber-800">{unallocated.length} awaiting allocation</Badge>
          <Badge className="bg-green-100 text-green-800">{allocated.length} allocated</Badge>
        </div>
        <Button onClick={() => setNewDialog(true)} className="bg-[#1a472a] hover:bg-[#13381f]">
          <Plus className="w-4 h-4 mr-2" />Add Receipt
        </Button>
      </div>

      <div className="space-y-6">
        {/* Unallocated */}
        {unallocated.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                <Receipt className="w-4 h-4" />Receipts Awaiting Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {unallocated.map(r => (
                <div key={r.id} className="flex items-center justify-between p-3 border border-amber-200 rounded-lg bg-amber-50">
                  <div>
                    <p className="font-semibold">{fmt(r.amount)}</p>
                    {r.notes && <p className="text-xs text-gray-500">{r.notes}</p>}
                    {r.receipt_url && (
                      <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">View receipt</a>
                    )}
                  </div>
                  <Button size="sm" onClick={() => openAllocate(r)} className="bg-[#1a472a] hover:bg-[#13381f]">
                    Allocate
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Allocated */}
        {allocated.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />Allocated Receipts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allocated.map(r => {
                const event = events.find(e => e.id === r.linked_event_id);
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{fmt(r.amount)}</span>
                        <Badge variant="outline" className="text-xs capitalize">{r.category?.replace(/_/g, ' ')}</Badge>
                        <Badge variant="outline" className="text-xs">{r.payment_method?.replace(/_/g, ' ')}</Badge>
                      </div>
                      {event && <p className="text-xs text-gray-500 mt-0.5">Event: {event.title}</p>}
                      {r.notes && <p className="text-xs text-gray-400">{r.notes}</p>}
                    </div>
                    <p className="text-xs text-gray-400">{r.allocation_date}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {allocations.length === 0 && (
          <Card className="flex items-center justify-center h-48">
            <div className="text-center text-gray-400">
              <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No receipts yet. Add one to get started.</p>
            </div>
          </Card>
        )}
      </div>

      {/* Add Receipt Dialog */}
      <Dialog open={newDialog} onOpenChange={setNewDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Receipt</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Receipt Image</Label>
              <div className="mt-1">
                <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-lg p-3 hover:border-gray-400 transition-colors">
                  <Upload className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-500">{uploading ? 'Uploading...' : 'Click to upload receipt image'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
                {form.receipt_url && <p className="text-xs text-green-600 mt-1">✓ Receipt uploaded</p>}
              </div>
            </div>
            <div>
              <Label>Amount (£)</Label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => sf('amount', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={e => sf('notes', e.target.value)} placeholder="Brief description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancel</Button>
            <Button onClick={handleAddReceipt} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">
              {saving ? 'Adding...' : 'Add Receipt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocate Dialog */}
      <Dialog open={!!allocateDialog} onOpenChange={open => !open && setAllocateDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Allocate Receipt — {fmt(allocateDialog?.amount)}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (£)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => sf('amount', e.target.value)} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => sf('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={v => sf('payment_method', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="scout_bank_card">Scout Bank Card</SelectItem>
                  <SelectItem value="leader_paid_personally">Leader Paid Personally</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.payment_method === 'leader_paid_personally' && (
              <div>
                <Label>Leader</Label>
                <Select value={form.leader_id} onValueChange={v => sf('leader_id', v)}>
                  <SelectTrigger><SelectValue placeholder="Select leader..." /></SelectTrigger>
                  <SelectContent>
                    {leaders.map(l => <SelectItem key={l.id} value={l.id}>{l.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-amber-600 mt-1">A reimbursement record will be automatically created.</p>
              </div>
            )}
            <div>
              <Label>Linked Event (optional)</Label>
              <Select value={form.linked_event_id} onValueChange={v => sf('linked_event_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select event..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>No event</SelectItem>
                  {events.map(e => <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => sf('notes', e.target.value)} placeholder="What was this expense for?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAllocateDialog(null)}>Cancel</Button>
            <Button onClick={handleAllocate} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">
              {saving ? 'Allocating...' : 'Allocate to Ledger'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TreasurerLayout>
  );
}