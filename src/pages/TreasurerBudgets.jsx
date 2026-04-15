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
import { Progress } from '@/components/ui/progress';
import { Edit, Plus } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function TreasurerBudgets() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [form, setForm] = useState({ section_id: '', term_id: '', term_label: '', budget_amount: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [selectedTermId, setSelectedTermId] = useState('');

  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: terms = [] } = useQuery({ queryKey: ['terms'], queryFn: () => base44.entities.Term.list('-start_date', 50) });
  const { data: budgets = [] } = useQuery({ queryKey: ['section-budgets'], queryFn: () => base44.entities.SectionBudget.filter({}) });
  const { data: ledger = [] } = useQuery({ queryKey: ['ledger'], queryFn: () => base44.entities.LedgerEntry.list('-date', 500) });
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-start_date', 100) });
  const { data: allocations = [] } = useQuery({ queryKey: ['receipt-allocations-budgets'], queryFn: () => base44.entities.ReceiptAllocation.filter({}) });
  const { data: programmes = [] } = useQuery({ queryKey: ['programmes-budgets'], queryFn: () => base44.entities.Programme.filter({}) });
  const { data: memberPayments = [] } = useQuery({ queryKey: ['member-payments'], queryFn: () => base44.entities.MemberPayment.list('-date', 500) });

  // Auto-select current term on load
  const today = new Date().toISOString().split('T')[0];
  const currentTerm = terms.find(t => today >= t.start_date && today <= t.end_date);
  const activeTerm = selectedTermId ? terms.find(t => t.id === selectedTermId) : (currentTerm || terms[0]);

  const getTermProgrammes = (sectionId) => {
    if (!activeTerm) return [];
    return programmes.filter(p => p.section_id === sectionId && p.date >= activeTerm.start_date && p.date <= activeTerm.end_date);
  };

  const getCalcExpenses = (sectionId) => {
    if (!activeTerm) return 0;
    const termProgs = getTermProgrammes(sectionId);
    const progIds = new Set(termProgs.map(p => p.id));
    // Receipt allocations linked to meetings in this term/section
    const receiptSpend = allocations
      .filter(a => a.linked_meeting_id && progIds.has(a.linked_meeting_id))
      .reduce((s, a) => s + (a.amount || 0), 0);
    // Ledger expense entries linked to meetings in this term
    const meetingLedgerSpend = ledger
      .filter(e => e.type === 'expense' && e.linked_meeting_id && progIds.has(e.linked_meeting_id))
      .reduce((s, e) => s + (e.amount || 0), 0);
    // Budget-allocated general ledger expenses for this section/term (no meeting/event link)
    const budgetAllocSpend = ledger.filter(e =>
      e.type === 'expense' &&
      e.budget_allocated &&
      !e.linked_meeting_id &&
      !e.linked_event_id &&
      (e.section_id === sectionId || e.split_section_id === sectionId) &&
      e.date >= activeTerm.start_date &&
      e.date <= activeTerm.end_date
    ).reduce((s, e) => {
      if (e.split_section_id === sectionId && e.section_id !== sectionId) return s + (e.split_amount || 0);
      if (e.split_section_id && e.section_id === sectionId) return s + ((e.amount || 0) - (e.split_amount || 0));
      return s + (e.amount || 0);
    }, 0);
    return receiptSpend + meetingLedgerSpend + budgetAllocSpend;
  };

  const getCalcIncome = (sectionId) => {
    if (!activeTerm) return 0;
    const termProgs = getTermProgrammes(sectionId);
    const progIds = new Set(termProgs.map(p => p.id));
    // Member payments linked to meetings with a cost in this term
    return memberPayments
      .filter(p => p.related_event_id && progIds.has(p.related_event_id))
      .reduce((s, p) => s + (p.amount || 0), 0);
  };

  const openEdit = (budget) => {
    setEditBudget(budget);
    setForm({ section_id: budget.section_id, term_id: budget.term_id || '', term_label: budget.term_label || '', budget_amount: String(budget.budget_amount), notes: budget.notes || '' });
    setShowDialog(true);
  };

  const openNew = (sectionId = '') => {
    setEditBudget(null);
    setForm({ section_id: sectionId, term_id: activeTerm?.id || '', term_label: activeTerm?.title || activeTerm?.name || '', budget_amount: '', notes: '' });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.section_id || !form.budget_amount) {
      toast.error('Please select a section and enter a budget amount');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form, budget_amount: parseFloat(form.budget_amount) };
      if (editBudget) {
        await base44.entities.SectionBudget.update(editBudget.id, payload);
      } else {
        await base44.entities.SectionBudget.create(payload);
      }
      queryClient.invalidateQueries({ queryKey: ['section-budgets'] });
      toast.success('Budget saved');
      setShowDialog(false);
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <TreasurerLayout title="Section Budgets">
      {/* Term selector */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <Label className="text-sm font-semibold text-gray-700">Term:</Label>
        <Select value={selectedTermId || activeTerm?.id || ''} onValueChange={setSelectedTermId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a term..." />
          </SelectTrigger>
          <SelectContent>
            {terms.map(t => (
              <SelectItem key={t.id} value={t.id}>
                {t.title || t.name} ({t.start_date} – {t.end_date})
                {currentTerm?.id === t.id ? ' ✓ Current' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => openNew()} className="bg-[#1a472a] hover:bg-[#13381f] ml-auto">
          <Plus className="w-4 h-4 mr-2" />Set Budget
        </Button>
      </div>

      {activeTerm && (
        <p className="text-sm text-gray-500 mb-4">
          Showing budgets for <strong>{activeTerm.title || activeTerm.name}</strong> ({activeTerm.start_date} – {activeTerm.end_date})
        </p>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {sections.map(section => {
          const budget = budgets.find(b => b.section_id === section.id && (b.term_id === activeTerm?.id || (!b.term_id && !activeTerm)));
          const calcExpenses = getCalcExpenses(section.id);
          const calcIncome = getCalcIncome(section.id);
          const budgetAmount = budget?.budget_amount || 0;
          const remaining = budgetAmount + calcIncome - calcExpenses;
          const spendPct = budgetAmount > 0 ? Math.min(100, (calcExpenses / budgetAmount) * 100) : 0;

          return (
            <Card key={section.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base">{section.display_name}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => budget ? openEdit(budget) : openNew(section.id)}>
                  <Edit className="w-3 h-3 mr-1" />{budget ? 'Edit' : 'Set Budget'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {budget ? (
                  <>
                    {/* 4 boxes */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-center">
                        <p className="text-xs text-gray-500">Budget</p>
                        <p className="font-bold text-blue-700 text-lg">{fmt(budgetAmount)}</p>
                      </div>
                      <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-center">
                        <p className="text-xs text-gray-500">Calc Expenses</p>
                        <p className="font-bold text-red-700 text-lg">{fmt(calcExpenses)}</p>
                      </div>
                      <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-center">
                        <p className="text-xs text-gray-500">Calc Income</p>
                        <p className="font-bold text-green-700 text-lg">{fmt(calcIncome)}</p>
                      </div>
                      <div className={`p-3 rounded-lg border text-center ${remaining >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
                        <p className="text-xs text-gray-500">Remaining Budget</p>
                        <p className={`font-bold text-lg ${remaining >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>{fmt(remaining)}</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Spend vs Budget</span>
                        <span>{spendPct.toFixed(0)}%</span>
                      </div>
                      <Progress value={spendPct} className="h-2" />
                    </div>
                    {budget.notes && <p className="text-xs text-gray-400 italic">{budget.notes}</p>}
                  </>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No budget set for this section / term</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editBudget ? 'Edit Budget' : 'Set Section Budget'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Section</Label>
              <Select value={form.section_id} onValueChange={v => setField('section_id', v)}>
                <SelectTrigger><SelectValue placeholder="Select section..." /></SelectTrigger>
                <SelectContent>
                  {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Term</Label>
              <Select value={form.term_id} onValueChange={v => {
                const t = terms.find(t => t.id === v);
                setForm(f => ({ ...f, term_id: v, term_label: t?.title || t?.name || '' }));
              }}>
                <SelectTrigger><SelectValue placeholder="Select term..." /></SelectTrigger>
                <SelectContent>
                  {terms.map(t => <SelectItem key={t.id} value={t.id}>{t.title || t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Budget Amount (£)</Label>
              <Input type="number" step="0.01" min="0" value={form.budget_amount} onChange={e => setField('budget_amount', e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Input value={form.notes} onChange={e => setField('notes', e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">
              {saving ? 'Saving...' : 'Save Budget'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TreasurerLayout>
  );
}