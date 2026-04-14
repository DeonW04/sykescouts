import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, TrendingUp, TrendingDown, Search, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const CATEGORIES = ['subs', 'event_payments', 'donations', 'fundraising', 'equipment', 'food', 'transport', 'hall_hire', 'badges', 'reimbursement', 'other'];
const fmt = (n) => `£${(n || 0).toFixed(2)}`;

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  type: 'income',
  amount: '',
  category: 'other',
  description: '',
  reference: '',
  linked_member_id: '',
  linked_event_id: '',
  linked_fund_id: '',
  receipt_reference: '',
  section_id: '',
};

export default function TreasurerLedger() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [saving, setSaving] = useState(false);

  const { data: ledger = [] } = useQuery({
    queryKey: ['ledger'],
    queryFn: () => base44.entities.LedgerEntry.list('-date', 500),
  });

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const filtered = ledger.filter(e => {
    const matchSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase()) || e.reference?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'all' || e.type === filterType;
    const matchCat = filterCategory === 'all' || e.category === filterCategory;
    return matchSearch && matchType && matchCat;
  });

  const totalIncome = filtered.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpenses = filtered.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);

  const openNew = () => { setForm(emptyForm); setEditEntry(null); setShowDialog(true); };
  const openEdit = (entry) => {
    setForm({ ...entry, amount: String(entry.amount) });
    setEditEntry(entry);
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount || !form.date) {
      toast.error('Please fill in date, amount and description');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount), entered_by: user?.email };
      if (editEntry) {
        await base44.entities.LedgerEntry.update(editEntry.id, payload);
        toast.success('Entry updated');
      } else {
        await base44.entities.LedgerEntry.create(payload);
        toast.success('Entry added to ledger');
      }
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      setShowDialog(false);
    } catch (e) {
      toast.error('Failed to save: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this ledger entry?')) return;
    await base44.entities.LedgerEntry.delete(id);
    queryClient.invalidateQueries({ queryKey: ['ledger'] });
    toast.success('Entry deleted');
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <TreasurerLayout title="Master Ledger">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="bg-green-50 border-0">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500">Income</p>
            <p className="text-xl font-bold text-green-700">{fmt(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-0">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500">Expenses</p>
            <p className="text-xl font-bold text-red-700">{fmt(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card className={`border-0 ${totalIncome - totalExpenses >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500">Net</p>
            <p className={`text-xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmt(totalIncome - totalExpenses)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Ledger Entries</CardTitle>
            <Button onClick={openNew} className="bg-[#1a472a] hover:bg-[#13381f]">
              <Plus className="w-4 h-4 mr-2" />Add Entry
            </Button>
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            <div className="flex-1 min-w-48 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input className="pl-9" placeholder="Search description or reference..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No entries found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Date</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Type</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Category</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Description</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Reference</th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600">Amount</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(entry => (
                    <tr key={entry.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-600">{entry.date}</td>
                      <td className="py-2 px-2">
                        <div className={`flex items-center gap-1 ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.type === 'income' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {entry.type}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className="text-xs capitalize">{entry.category?.replace(/_/g, ' ')}</Badge>
                      </td>
                      <td className="py-2 px-2">{entry.description}</td>
                      <td className="py-2 px-2 text-gray-500">{entry.reference}</td>
                      <td className={`py-2 px-2 text-right font-semibold ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.type === 'income' ? '+' : '-'}{fmt(entry.amount)}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(entry)}><Edit className="w-3 h-3" /></Button>
                          <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDelete(entry.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editEntry ? 'Edit Ledger Entry' : 'New Ledger Entry'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div>
              <Label>Date</Label>
              <Input type="date" value={form.date} onChange={e => setField('date', e.target.value)} />
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setField('type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Amount (£)</Label>
              <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={v => setField('category', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.replace(/_/g, ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Description</Label>
              <Input value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Enter description..." />
            </div>
            <div>
              <Label>Reference (optional)</Label>
              <Input value={form.reference} onChange={e => setField('reference', e.target.value)} placeholder="REF001" />
            </div>
            <div>
              <Label>Receipt Reference (optional)</Label>
              <Input value={form.receipt_reference} onChange={e => setField('receipt_reference', e.target.value)} placeholder="REC-001" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">
              {saving ? 'Saving...' : 'Save Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TreasurerLayout>
  );
}