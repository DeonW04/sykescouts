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
import { Plus, Edit, TrendingUp, TrendingDown, Landmark } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function TreasurerFunds() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editFund, setEditFund] = useState(null);
  const [form, setForm] = useState({ fund_name: '', description: '', starting_balance: '', fund_type: 'unrestricted' });
  const [saving, setSaving] = useState(false);
  const [selectedFund, setSelectedFund] = useState(null);

  const { data: funds = [] } = useQuery({ queryKey: ['funds'], queryFn: () => base44.entities.Fund.filter({ active: true }) });
  const { data: ledger = [] } = useQuery({ queryKey: ['ledger'], queryFn: () => base44.entities.LedgerEntry.list('-date', 500) });

  const getFundStats = (fundId) => {
    const entries = ledger.filter(e => e.linked_fund_id === fundId);
    const income = entries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    const expenses = entries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
    return { income, expenses, entries };
  };

  const openNew = () => { setEditFund(null); setForm({ fund_name: '', description: '', starting_balance: '', fund_type: 'unrestricted' }); setShowDialog(true); };
  const openEdit = (fund) => { setEditFund(fund); setForm({ ...fund, starting_balance: String(fund.starting_balance || 0) }); setShowDialog(true); };

  const handleSave = async () => {
    if (!form.fund_name) { toast.error('Fund name is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, starting_balance: parseFloat(form.starting_balance || 0) };
      if (editFund) {
        await base44.entities.Fund.update(editFund.id, payload);
      } else {
        await base44.entities.Fund.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['funds'] });
      toast.success('Fund saved');
      setShowDialog(false);
    } catch (e) { toast.error('Failed: ' + e.message); }
    finally { setSaving(false); }
  };

  const sf = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <TreasurerLayout title="Fund Management">
      <div className="flex justify-end mb-4">
        <Button onClick={openNew} className="bg-[#1a472a] hover:bg-[#13381f]">
          <Plus className="w-4 h-4 mr-2" />Create Fund
        </Button>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Fund list */}
        <div className="space-y-3">
          {funds.length === 0 && (
            <Card className="flex items-center justify-center h-40">
              <div className="text-center text-gray-400">
                <Landmark className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No funds created yet</p>
              </div>
            </Card>
          )}
          {funds.map(fund => {
            const { income, expenses } = getFundStats(fund.id);
            const balance = (fund.starting_balance || 0) + income - expenses;
            return (
              <Card
                key={fund.id}
                onClick={() => setSelectedFund(fund)}
                className={`cursor-pointer transition-all ${selectedFund?.id === fund.id ? 'border-[#1a472a] border-2' : 'hover:border-gray-300'}`}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{fund.fund_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{fund.description}</p>
                    </div>
                    <Badge variant={fund.fund_type === 'restricted' ? 'default' : 'secondary'} className="text-xs capitalize">
                      {fund.fund_type}
                    </Badge>
                  </div>
                  <p className={`text-2xl font-bold mt-2 ${balance >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmt(balance)}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-500">
                    <span className="text-green-600">+{fmt(income)}</span>
                    <span className="text-red-600">-{fmt(expenses)}</span>
                  </div>
                  <Button size="sm" variant="ghost" className="mt-2 text-xs" onClick={(e) => { e.stopPropagation(); openEdit(fund); }}>
                    <Edit className="w-3 h-3 mr-1" />Edit
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Fund detail */}
        <div className="lg:col-span-2">
          {!selectedFund ? (
            <Card className="flex items-center justify-center h-64">
              <div className="text-center text-gray-400">
                <Landmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>Select a fund to view transactions</p>
              </div>
            </Card>
          ) : (() => {
            const { income, expenses, entries } = getFundStats(selectedFund.id);
            const balance = (selectedFund.starting_balance || 0) + income - expenses;
            return (
              <Card>
                <CardHeader>
                  <CardTitle>{selectedFund.fund_name}</CardTitle>
                  <div className="flex gap-4 text-sm mt-2">
                    <span>Opening: {fmt(selectedFund.starting_balance)}</span>
                    <span className="text-green-600">Income: +{fmt(income)}</span>
                    <span className="text-red-600">Expenses: -{fmt(expenses)}</span>
                    <span className="font-bold">Balance: {fmt(balance)}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {entries.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">No transactions linked to this fund. Link ledger entries to this fund to see them here.</p>
                  ) : (
                    <div className="space-y-2">
                      {entries.map(e => (
                        <div key={e.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${e.type === 'income' ? 'bg-green-100' : 'bg-red-100'}`}>
                              {e.type === 'income' ? <TrendingUp className="w-3 h-3 text-green-600" /> : <TrendingDown className="w-3 h-3 text-red-600" />}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{e.description}</p>
                              <p className="text-xs text-gray-400">{e.date} · {e.category?.replace(/_/g, ' ')}</p>
                            </div>
                          </div>
                          <span className={`font-semibold text-sm ${e.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                            {e.type === 'income' ? '+' : '-'}{fmt(e.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editFund ? 'Edit Fund' : 'Create Fund'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Fund Name</Label>
              <Input value={form.fund_name} onChange={e => sf('fund_name', e.target.value)} placeholder="e.g. Camp Equipment Fund" />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input value={form.description} onChange={e => sf('description', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Opening Balance (£)</Label>
                <Input type="number" step="0.01" min="0" value={form.starting_balance} onChange={e => sf('starting_balance', e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <Label>Fund Type</Label>
                <Select value={form.fund_type} onValueChange={v => sf('fund_type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restricted">Restricted</SelectItem>
                    <SelectItem value="unrestricted">Unrestricted</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">
              {saving ? 'Saving...' : 'Save Fund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TreasurerLayout>
  );
}