import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Receipt, TrendingUp, TrendingDown, Upload, Users, Plus, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import LeaderNav from '../components/leader/LeaderNav';
import { useSectionContext } from '../components/leader/SectionContext';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

const CATEGORIES = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'food', label: 'Food' },
  { value: 'transport', label: 'Transport' },
  { value: 'hall_hire', label: 'Hall Hire' },
  { value: 'badges', label: 'Badges' },
  { value: 'other', label: 'Other' },
];

export default function SectionAccounting() {
  const queryClient = useQueryClient();
  const { selectedSectionId } = useSectionContext();

  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptForm, setReceiptForm] = useState({ amount: '', category: '', notes: '', linked_event_id: '', linked_meeting_id: '', payment_method: 'leader_paid_personally' });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: leader } = useQuery({
    queryKey: ['leader', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const leaders = await base44.entities.Leader.filter({ user_id: user.id });
      return leaders[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes', selectedSectionId],
    queryFn: () => selectedSectionId ? base44.entities.Programme.filter({ section_id: selectedSectionId }) : [],
    enabled: !!selectedSectionId,
  });
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-start_date', 50) });
  const { data: allocations = [] } = useQuery({ queryKey: ['receipt-allocations'], queryFn: () => base44.entities.ReceiptAllocation.filter({}) });
  const { data: ledgerEntries = [] } = useQuery({ queryKey: ['ledger-entries'], queryFn: () => base44.entities.LedgerEntry.list('-date', 200) });
  const { data: memberPayments = [] } = useQuery({ queryKey: ['member-payments'], queryFn: () => base44.entities.MemberPayment.list('-date', 200) });

  const sectionSection = sections.find(s => s.id === selectedSectionId);
  const sectionAllocations = allocations.filter(a => {
    const prog = programmes.find(p => p.id === a.linked_meeting_id);
    const evt = events.find(e => e.id === a.linked_event_id && e.section_ids?.includes(selectedSectionId));
    return prog || evt;
  });
  const sectionLedger = ledgerEntries.filter(e => e.section_id === selectedSectionId);
  const sectionPayments = memberPayments.filter(p => {
    const evt = events.find(e => e.id === p.related_event_id && e.section_ids?.includes(selectedSectionId));
    return !!evt;
  });

  const totalExpenses = sectionAllocations.reduce((s, a) => s + (a.amount || 0), 0);
  const totalIncome = sectionPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const ledgerIncome = sectionLedger.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
  const ledgerExpenses = sectionLedger.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);

  const handleSubmitReceipt = async () => {
    if (!receiptForm.amount || !receiptForm.category) {
      toast.error('Please fill in amount and category');
      return;
    }
    if (!uploadFile) {
      toast.error('Please attach a receipt image');
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadFile });
      await base44.entities.ReceiptAllocation.create({
        receipt_url: file_url,
        amount: parseFloat(receiptForm.amount),
        category: receiptForm.category,
        payment_method: receiptForm.payment_method,
        linked_event_id: receiptForm.linked_event_id || null,
        linked_meeting_id: receiptForm.linked_meeting_id || null,
        leader_id: leader?.id || null,
        allocated_by: user?.email,
        allocation_date: new Date().toISOString().split('T')[0],
        status: 'unallocated',
        notes: receiptForm.notes,
      });
      queryClient.invalidateQueries({ queryKey: ['receipt-allocations'] });
      toast.success('Receipt submitted for treasurer review');
      setShowReceiptDialog(false);
      setReceiptForm({ amount: '', category: '', notes: '', linked_event_id: '', linked_meeting_id: '', payment_method: 'leader_paid_personally' });
      setUploadFile(null);
    } catch (e) {
      toast.error('Failed to submit: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const myAllocations = allocations.filter(a => a.leader_id === leader?.id || a.allocated_by === user?.email);

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />

      <div className="bg-gradient-to-r from-[#004851] to-[#006b7a] text-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold">Section Accounting</h1>
          <p className="text-white/70 text-sm mt-1">{sectionSection?.display_name || 'All Sections'} — Financial Overview</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
                <p className="text-xs text-gray-500">Calc. Income</p>
              </div>
              <p className="text-2xl font-bold text-green-700">{fmt(totalIncome)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-400">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <p className="text-xs text-gray-500">Calc. Expenses</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{fmt(totalExpenses)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-blue-400">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <p className="text-xs text-gray-500">Ledger Income</p>
              </div>
              <p className="text-2xl font-bold text-blue-700">{fmt(ledgerIncome)}</p>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-gray-400">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-gray-500" />
                <p className="text-xs text-gray-500">Ledger Expenses</p>
              </div>
              <p className="text-2xl font-bold text-gray-700">{fmt(ledgerExpenses)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Submit Receipt Button */}
        <div className="mb-6">
          <Button onClick={() => setShowReceiptDialog(true)} className="bg-[#004851] hover:bg-[#003840] gap-2">
            <Receipt className="w-4 h-4" />
            Submit a Receipt
          </Button>
          <p className="text-xs text-gray-500 mt-1">Submit receipts for equipment, food, transport etc. for treasurer processing.</p>
        </div>

        <Tabs defaultValue="receipts">
          <TabsList>
            <TabsTrigger value="receipts">My Receipts</TabsTrigger>
            <TabsTrigger value="ledger">Section Ledger</TabsTrigger>
            <TabsTrigger value="payments">Event Payments</TabsTrigger>
          </TabsList>

          <TabsContent value="receipts" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Receipt className="w-4 h-4" />My Submitted Receipts</CardTitle></CardHeader>
              <CardContent>
                {myAllocations.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No receipts submitted yet</p>
                ) : (
                  <div className="space-y-2">
                    {myAllocations.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          {a.receipt_url && (
                            <button onClick={() => setImagePreview(a.receipt_url)} className="p-1 hover:bg-gray-100 rounded">
                              <Eye className="w-4 h-4 text-gray-400" />
                            </button>
                          )}
                          <div>
                            <p className="text-sm font-medium capitalize">{a.category?.replace(/_/g, ' ')}</p>
                            {a.notes && <p className="text-xs text-gray-500">{a.notes}</p>}
                            <p className="text-xs text-gray-400">{a.allocation_date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${a.payment_method === 'leader_paid_personally' ? 'border-purple-200 text-purple-600' : 'border-blue-200 text-blue-600'}`}>
                            {a.payment_method === 'leader_paid_personally' ? 'Personal' : 'Bank Card'}
                          </Badge>
                          <Badge className={`text-xs ${a.status === 'allocated' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                            {a.status === 'allocated' ? 'Processed' : 'Pending'}
                          </Badge>
                          <span className="font-semibold text-sm">{fmt(a.amount)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ledger" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Section Ledger Entries</CardTitle></CardHeader>
              <CardContent>
                {sectionLedger.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No ledger entries for this section</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-2 px-2 text-gray-500">Date</th>
                          <th className="text-left py-2 px-2 text-gray-500">Description</th>
                          <th className="text-left py-2 px-2 text-gray-500">Category</th>
                          <th className="text-left py-2 px-2 text-gray-500">Type</th>
                          <th className="text-right py-2 px-2 text-gray-500">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionLedger.map(e => (
                          <tr key={e.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-2 text-gray-500">{e.date}</td>
                            <td className="py-2 px-2">{e.description}</td>
                            <td className="py-2 px-2 capitalize">{e.category?.replace(/_/g, ' ')}</td>
                            <td className="py-2 px-2">
                              <Badge className={`text-xs ${e.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{e.type}</Badge>
                            </td>
                            <td className={`py-2 px-2 text-right font-medium ${e.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>{fmt(e.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments" className="mt-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4" />Event Member Payments</CardTitle></CardHeader>
              <CardContent>
                {sectionPayments.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">No payments for section events</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-2 px-2 text-gray-500">Date</th>
                          <th className="text-left py-2 px-2 text-gray-500">Type</th>
                          <th className="text-left py-2 px-2 text-gray-500">Notes</th>
                          <th className="text-right py-2 px-2 text-gray-500">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sectionPayments.map(p => (
                          <tr key={p.id} className="border-b hover:bg-gray-50">
                            <td className="py-2 px-2 text-gray-500">{p.date}</td>
                            <td className="py-2 px-2 capitalize">{p.payment_type}</td>
                            <td className="py-2 px-2 text-gray-500 text-xs">{p.notes || '—'}</td>
                            <td className="py-2 px-2 text-right font-medium text-green-600">{fmt(p.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Receipt Upload Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={setShowReceiptDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Submit Receipt</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Receipt Image <span className="text-red-500">*</span></Label>
              <Input type="file" accept="image/*" className="mt-1" onChange={e => setUploadFile(e.target.files[0])} />
              {uploadFile && <p className="text-xs text-green-600 mt-1">✓ {uploadFile.name}</p>}
            </div>
            <div>
              <Label>Amount (£) <span className="text-red-500">*</span></Label>
              <Input type="number" step="0.01" min="0" placeholder="0.00" className="mt-1" value={receiptForm.amount} onChange={e => setReceiptForm({ ...receiptForm, amount: e.target.value })} />
            </div>
            <div>
              <Label>Category <span className="text-red-500">*</span></Label>
              <Select value={receiptForm.category} onValueChange={v => setReceiptForm({ ...receiptForm, category: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select category..." /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Payment Method <span className="text-red-500">*</span></Label>
              <Select value={receiptForm.payment_method} onValueChange={v => setReceiptForm({ ...receiptForm, payment_method: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="leader_paid_personally">I paid personally (need reimbursement)</SelectItem>
                  <SelectItem value="scout_bank_card">Paid with Scout bank card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link to Meeting (optional)</Label>
              <Select value={receiptForm.linked_meeting_id} onValueChange={v => setReceiptForm({ ...receiptForm, linked_meeting_id: v, linked_event_id: '' })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select meeting..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {programmes.slice(0, 20).map(p => (
                    <SelectItem key={p.id} value={p.id}>{new Date(p.date).toLocaleDateString('en-GB')} — {p.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Link to Event (optional)</Label>
              <Select value={receiptForm.linked_event_id} onValueChange={v => setReceiptForm({ ...receiptForm, linked_event_id: v, linked_meeting_id: '' })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select event..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={null}>None</SelectItem>
                  {events.slice(0, 20).map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1" placeholder="What was this for?" value={receiptForm.notes} onChange={e => setReceiptForm({ ...receiptForm, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiptDialog(false)}>Cancel</Button>
            <Button onClick={handleSubmitReceipt} disabled={uploading} className="bg-[#004851] hover:bg-[#003840]">
              {uploading ? 'Submitting...' : <><Upload className="w-4 h-4 mr-2" />Submit Receipt</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview */}
      {imagePreview && (
        <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
            <DialogHeader><DialogTitle>Receipt Image</DialogTitle></DialogHeader>
            <img src={imagePreview} alt="Receipt" className="w-full h-auto max-h-[70vh] object-contain rounded-lg" />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}