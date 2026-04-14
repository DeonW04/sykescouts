import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Edit, Plus } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function TreasurerBudgets() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [form, setForm] = useState({ section_id: '', term_label: '', budget_amount: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: budgets = [] } = useQuery({ queryKey: ['section-budgets'], queryFn: () => base44.entities.SectionBudget.filter({}) });
  const { data: ledger = [] } = useQuery({ queryKey: ['ledger'], queryFn: () => base44.entities.LedgerEntry.list('-date', 500) });
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-start_date', 100) });

  const getSpend = (sectionId) => {
    return ledger
      .filter(e => e.type === 'expense' && e.section_id === sectionId)
      .reduce((s, e) => s + (e.amount || 0), 0);
  };

  const getProjectedSpend = (sectionId) => {
    return events
      .filter(e => e.section_ids?.includes(sectionId) && e.estimated_cost)
      .reduce((s, e) => s + (e.estimated_cost || 0), 0);
  };

  const openEdit = (budget) => {
    setEditBudget(budget);
    setForm({ section_id: budget.section_id, term_label: budget.term_label || '', budget_amount: String(budget.budget_amount), notes: budget.notes || '' });
    setShowDialog(true);
  };

  const openNew = () => {
    setEditBudget(null);
    setForm({ section_id: '', term_label: '', budget_amount: '', notes: '' });
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
      <div className="flex justify-end mb-4">
        <Button onClick={openNew} className="bg-[#1a472a] hover:bg-[#13381f]">
          <Plus className="w-4 h-4 mr-2" />Set Budget
        </Button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {sections.map(section => {
          const budget = budgets.find(b => b.section_id === section.id);
          const spend = getSpend(section.id);
          const projected = getProjectedSpend(section.id);
          const allocated = budget?.budget_amount || 0;
          const pct = allocated > 0 ? Math.min(100, (spend / allocated) * 100) : 0;
          const projectedPct = allocated > 0 ? Math.min(100, (projected / allocated) * 100) : 0;

          return (
            <Card key={section.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base capitalize">{section.display_name}</CardTitle>
                <Button size="sm" variant="outline" onClick={() => budget ? openEdit(budget) : openNew()}>
                  <Edit className="w-3 h-3 mr-1" />{budget ? 'Edit' : 'Set Budget'}
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                {budget ? (
                  <>
                    {budget.term_label && <p className="text-xs text-gray-500">{budget.term_label}</p>}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Budget</span>
                      <span className="font-bold">{fmt(allocated)}</span>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Actual Spend</span>
                        <span className={`font-semibold ${pct > 90 ? 'text-red-600' : 'text-gray-800'}`}>{fmt(spend)}</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Projected Spend</span>
                        <span className="text-amber-600 font-medium">{fmt(projected)}</span>
                      </div>
                      <Progress value={projectedPct} className="h-1.5 bg-amber-100" />
                    </div>
                    <div className="flex justify-between text-sm border-t pt-2">
                      <span className="text-gray-600">Remaining</span>
                      <span className={`font-bold ${allocated - spend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {fmt(allocated - spend)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 text-center py-4">No budget set for this section</p>
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
              <select
                className="w-full border rounded-md px-3 py-2 text-sm mt-1"
                value={form.section_id}
                onChange={e => setField('section_id', e.target.value)}
              >
                <option value="">Select section...</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.display_name}</option>)}
              </select>
            </div>
            <div>
              <Label>Term / Period Label</Label>
              <Input value={form.term_label} onChange={e => setField('term_label', e.target.value)} placeholder="e.g. Autumn Term 2025" />
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