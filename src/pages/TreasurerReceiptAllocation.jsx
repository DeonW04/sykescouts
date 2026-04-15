import React, { useState, useMemo } from 'react';
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
import { Receipt, CheckCircle, Upload, Plus, AlertTriangle, ExternalLink, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;
const CATEGORIES = ['equipment', 'food', 'transport', 'hall_hire', 'badges', 'other'];

const emptyForm = {
  amount: '',
  category: 'other',
  payment_method: 'scout_bank_card',
  linked_event_id: '',
  linked_meeting_id: '',
  leader_id: '',
  notes: '',
  receipt_url: '',
  budget_allocated: false,
  section_id: '',
  linked_term_id: '',
};

export default function TreasurerReceiptAllocation() {
  const queryClient = useQueryClient();
  const [allocateDialog, setAllocateDialog] = useState(null);
  const [newDialog, setNewDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedEventOrMeeting, setSelectedEventOrMeeting] = useState('');

  const { data: allocations = [] } = useQuery({
    queryKey: ['receipt-allocations'],
    queryFn: () => base44.entities.ReceiptAllocation.list('-created_date', 200),
  });
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-start_date', 100) });
  const { data: programmes = [] } = useQuery({ queryKey: ['programmes-all'], queryFn: () => base44.entities.Programme.list('-date', 300) });
  const { data: leaders = [] } = useQuery({ queryKey: ['leaders'], queryFn: () => base44.entities.Leader.filter({}) });
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: terms = [] } = useQuery({ queryKey: ['terms'], queryFn: () => base44.entities.Term.list() });
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });

  const unallocated = allocations.filter(r => r.status === 'unallocated');
  const allocated = allocations.filter(r => r.status === 'allocated');

  const today = new Date();
  const oneMonthAgo = addDays(today, -30);
  const currentTerm = terms.find(t => today >= new Date(t.start_date) && today <= new Date(t.end_date));
  const upcomingTerm = !currentTerm ? terms.filter(t => new Date(t.start_date) > today).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0] : null;
  const activeTerm = currentTerm || upcomingTerm;

  // Build event+meeting options for linking
  const linkableOptions = useMemo(() => {
    const results = [];
    events.forEach(ev => {
      const evEnd = ev.end_date ? new Date(ev.end_date) : new Date(ev.start_date);
      if (evEnd < oneMonthAgo && new Date(ev.start_date) < today) return;
      results.push({ type: 'event', id: ev.id, label: `Event: ${ev.title} (${format(new Date(ev.start_date), 'dd/MM/yyyy')})` });
    });
    if (activeTerm) {
      const termStart = new Date(activeTerm.start_date);
      const termEnd = new Date(activeTerm.end_date);
      programmes.forEach(p => {
        const pDate = new Date(p.date);
        if (pDate < termStart || pDate > termEnd) return;
        results.push({ type: 'meeting', id: p.id, label: `Meeting: ${p.title} — ${format(pDate, 'dd/MM/yyyy')}` });
      });
    }
    return results;
  }, [events, programmes, activeTerm]);

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      sf('receipt_url', res.file_url);
      toast.success('Receipt uploaded');
    } catch (err) {
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const resolveLinks = (f, sel) => {
    const linked = { linked_event_id: '', linked_meeting_id: '' };
    if (sel) {
      const [type, id] = sel.split(':');
      if (type === 'event') linked.linked_event_id = id;
      if (type === 'meeting') linked.linked_meeting_id = id;
    }
    return linked;
  };

  const handleAddReceipt = async () => {
    if (!form.amount) { toast.error('Amount is required'); return; }
    setSaving(true);
    try {
      const links = resolveLinks(form, selectedEventOrMeeting);
      const receiptData = {
        ...form,
        ...links,
        amount: parseFloat(form.amount),
        status: 'unallocated',
      };
      // Remove non-entity fields from form spread
      delete receiptData.budget_allocated;
      delete receiptData.section_id;
      delete receiptData.linked_term_id;

      const receipt = await base44.entities.ReceiptAllocation.create({
        ...receiptData,
        budget_allocated: form.budget_allocated,
        section_id: form.budget_allocated ? form.section_id : '',
        linked_term_id: form.budget_allocated ? form.linked_term_id : '',
      });

      queryClient.invalidateQueries({ queryKey: ['receipt-allocations'] });
      toast.success('Receipt added');
      setNewDialog(false);
      setForm(emptyForm);
      setSelectedEventOrMeeting('');
    } catch (e) { toast.error('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const handleAllocate = async () => {
    if (!allocateDialog) return;
    setSaving(true);
    try {
      const links = resolveLinks(form, selectedEventOrMeeting);
      const updates = {
        status: 'allocated',
        category: form.category,
        payment_method: form.payment_method,
        amount: parseFloat(form.amount || allocateDialog.amount),
        ...links,
        leader_id: form.payment_method === 'leader_paid_personally' ? form.leader_id : null,
        notes: form.notes,
        allocated_by: user?.email,
        allocation_date: new Date().toISOString().split('T')[0],
      };

      await base44.entities.ReceiptAllocation.update(allocateDialog.id, updates);

      const ledgerEntry = await base44.entities.LedgerEntry.create({
        date: new Date().toISOString().split('T')[0],
        type: 'expense',
        amount: updates.amount,
        category: updates.category,
        description: `Receipt: ${form.notes || updates.category}`,
        linked_event_id: updates.linked_event_id || null,
        linked_meeting_id: updates.linked_meeting_id || null,
        receipt_reference: allocateDialog.id,
        entered_by: user?.email,
        budget_allocated: allocateDialog.budget_allocated || false,
        section_id: allocateDialog.section_id || '',
        linked_term_id: allocateDialog.linked_term_id || '',
      });

      if (updates.payment_method === 'leader_paid_personally' && updates.leader_id) {
        await base44.entities.Reimbursement.create({
          leader_id: updates.leader_id,
          amount: updates.amount,
          description: form.notes || `Receipt allocation - ${updates.category}`,
          category: updates.category,
          linked_event_id: updates.linked_event_id || null,
          linked_meeting_id: updates.linked_meeting_id || null,
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
      setSelectedEventOrMeeting('');
    } catch (e) { toast.error('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const openAllocate = (r) => {
    setForm({
      amount: String(r.amount),
      category: r.category || 'other',
      payment_method: r.payment_method || 'scout_bank_card',
      linked_event_id: r.linked_event_id || '',
      linked_meeting_id: r.linked_meeting_id || '',
      leader_id: r.leader_id || '',
      notes: r.notes || '',
      receipt_url: r.receipt_url || '',
    });
    setSelectedEventOrMeeting(
      r.linked_event_id ? `event:${r.linked_event_id}` :
      r.linked_meeting_id ? `meeting:${r.linked_meeting_id}` : ''
    );
    setAllocateDialog(r);
  };

  const LinkedEventMeetingSelector = () => (
    <div>
      <Label>Linked Event / Meeting (optional)</Label>
      <Select value={selectedEventOrMeeting} onValueChange={setSelectedEventOrMeeting}>
        <SelectTrigger><SelectValue placeholder="None (general expense)" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">None (general expense)</SelectItem>
          {linkableOptions.map(i => (
            <SelectItem key={`${i.type}:${i.id}`} value={`${i.type}:${i.id}`}>{i.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <TreasurerLayout title="Receipt Allocation">
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          <Badge className="bg-amber-100 text-amber-800">{unallocated.length} awaiting allocation</Badge>
          <Badge className="bg-green-100 text-green-800">{allocated.length} allocated</Badge>
        </div>
        <Button onClick={() => { setForm(emptyForm); setSelectedEventOrMeeting(''); setNewDialog(true); }} className="bg-[#1a472a] hover:bg-[#13381f]">
          <Plus className="w-4 h-4 mr-2" />Add Receipt
        </Button>
      </div>

      <div className="space-y-6">
        {unallocated.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-amber-600">
                <Receipt className="w-4 h-4" />Receipts Awaiting Allocation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {unallocated.map(r => {
                const isAwaitingReimbursement = r.payment_method === 'leader_paid_personally';
                const leader = leaders.find(l => l.id === r.leader_id);
                return (
                  <div key={r.id} className={`p-3 border rounded-lg ${isAwaitingReimbursement ? 'border-red-300 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{fmt(r.amount)}</p>
                          {isAwaitingReimbursement && (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> Awaiting Reimbursement
                            </span>
                          )}
                          {r.category && <span className="text-xs text-gray-500 capitalize">{r.category.replace(/_/g, ' ')}</span>}
                        </div>
                        {r.notes && <p className="text-xs text-gray-500 mt-0.5">{r.notes}</p>}
                        {leader && <p className="text-xs text-red-600 mt-0.5">Leader: {leader.display_name}</p>}
                        {r.receipt_url && (
                          <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">View receipt</a>
                        )}
                      </div>
                      <Button size="sm" onClick={() => openAllocate(r)} className={isAwaitingReimbursement ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1a472a] hover:bg-[#13381f]'}>
                        {isAwaitingReimbursement ? 'Reimburse & Allocate' : 'Allocate'}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {allocated.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-green-600">
                <CheckCircle className="w-4 h-4" />Allocated Receipts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {allocated.map(r => {
                const ev = events.find(e => e.id === r.linked_event_id);
                const mtg = programmes.find(p => p.id === r.linked_meeting_id);
                return (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{fmt(r.amount)}</span>
                        <Badge variant="outline" className="text-xs capitalize">{r.category?.replace(/_/g, ' ')}</Badge>
                        <Badge variant="outline" className="text-xs">{r.payment_method?.replace(/_/g, ' ')}</Badge>
                      </div>
                      {ev && <p className="text-xs text-gray-500 mt-0.5">Event: {ev.title}</p>}
                      {mtg && <p className="text-xs text-gray-500 mt-0.5">Meeting: {mtg.title} ({mtg.date})</p>}
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
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Add Receipt</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Receipt Image</Label>
              <label className="flex items-center gap-2 cursor-pointer border-2 border-dashed rounded-lg p-3 hover:border-gray-400 transition-colors mt-1">
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-500">{uploading ? 'Uploading...' : 'Click to upload receipt image'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
              {form.receipt_url && <p className="text-xs text-green-600 mt-1">✓ Receipt uploaded</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (£)</Label>
                <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => sf('amount', e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => sf('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
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
                  <SelectContent>{leaders.map(l => <SelectItem key={l.id} value={l.id}>{l.display_name}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-amber-600 mt-1">A reimbursement record will be automatically created on allocation.</p>
              </div>
            )}
            <LinkedEventMeetingSelector />
            <div>
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={e => sf('notes', e.target.value)} placeholder="Brief description..." />
            </div>

            {/* Budget allocation */}
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg space-y-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="ra_budget" checked={!!form.budget_allocated} onChange={e => sf('budget_allocated', e.target.checked)} className="w-4 h-4 rounded" />
                <label htmlFor="ra_budget" className="text-sm font-semibold text-indigo-800 cursor-pointer">Allocate to section budget</label>
              </div>
              {form.budget_allocated && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Term</Label>
                    <Select value={form.linked_term_id} onValueChange={v => sf('linked_term_id', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select term..." /></SelectTrigger>
                      <SelectContent>{terms.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Section</Label>
                    <Select value={form.section_id} onValueChange={v => sf('section_id', v)}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select section..." /></SelectTrigger>
                      <SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewDialog(false)}>Cancel</Button>
            <Button onClick={handleAddReceipt} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">{saving ? 'Adding...' : 'Add Receipt'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocate Dialog */}
      <Dialog open={!!allocateDialog} onOpenChange={open => { if (!open) { setAllocateDialog(null); setSelectedEventOrMeeting(''); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Allocate Receipt — {fmt(allocateDialog?.amount)}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {allocateDialog?.receipt_url && (
              <a href={allocateDialog.receipt_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">View receipt image</a>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Amount (£)</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => sf('amount', e.target.value)} />
              </div>
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => sf('category', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}</SelectContent>
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
                  <SelectContent>{leaders.map(l => <SelectItem key={l.id} value={l.id}>{l.display_name}</SelectItem>)}</SelectContent>
                </Select>
                <p className="text-xs text-amber-600 mt-1">A reimbursement record will be automatically created.</p>
              </div>
            )}
            <LinkedEventMeetingSelector />
            <div>
              <Label>Notes</Label>
              <Input value={form.notes} onChange={e => sf('notes', e.target.value)} placeholder="What was this expense for?" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAllocateDialog(null); setSelectedEventOrMeeting(''); }}>Cancel</Button>
            <Button onClick={handleAllocate} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">{saving ? 'Allocating...' : 'Allocate to Ledger'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TreasurerLayout>
  );
}