import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TrendingDown, TrendingUp, Receipt, QrCode, ExternalLink, Clock, Plus, Trash2 } from 'lucide-react';
import MeetingAttendingMembersStripe from '../leader/MeetingAttendingMembersStripe';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;
const today = new Date().toISOString().split('T')[0];

export default function MeetingFinancesTab({ programmeId, sectionId, date, sectionName }) {
  const queryClient = useQueryClient();
  const [newEstDesc, setNewEstDesc] = useState('');
  const [newEstAmt, setNewEstAmt] = useState('');
  const [savingEst, setSavingEst] = useState(false);

  const { data: programme } = useQuery({
    queryKey: ['programme-detail', programmeId],
    queryFn: () => base44.entities.Programme.filter({ id: programmeId }).then(r => r[0]),
    enabled: !!programmeId,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['receipt-allocations-meeting', programmeId],
    queryFn: () => base44.entities.ReceiptAllocation.filter({ linked_meeting_id: programmeId }),
    enabled: !!programmeId,
  });

  const { data: ledgerEntries = [] } = useQuery({
    queryKey: ['ledger-meeting', programmeId],
    queryFn: () => base44.entities.LedgerEntry.filter({ linked_meeting_id: programmeId }),
    enabled: !!programmeId,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['section-members', sectionId],
    queryFn: () => base44.entities.Member.filter({ section_id: sectionId, active: true }),
    enabled: !!sectionId,
  });

  const { data: actionsRequired = [] } = useQuery({
    queryKey: ['actions-required-finances', programmeId],
    queryFn: () => base44.entities.ActionRequired.filter({ programme_id: programmeId }),
    enabled: !!programmeId,
  });

  const { data: actionResponses = [] } = useQuery({
    queryKey: ['action-responses-finances', programmeId],
    queryFn: async () => {
      const all = await Promise.all(
        actionsRequired.map(a => base44.entities.ActionResponse.filter({ action_required_id: a.id }))
      );
      return all.flat();
    },
    enabled: actionsRequired.length > 0,
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ['payment-overrides', programmeId],
    queryFn: () => base44.entities.MeetingPaymentOverride.filter({ programme_id: programmeId }),
    enabled: !!programmeId,
  });

  const cost = programme?.cost || 0;
  const paymentDeadline = programme?.payment_deadline;
  const isDeadlinePassed = paymentDeadline && today > paymentDeadline;
  const estimatedExpenses = programme?.estimated_expenses || [];
  const totalEstimatedExpenses = estimatedExpenses.reduce((s, e) => s + (e.amount || 0), 0);

  const attendanceAction = actionsRequired.find(a => a.action_purpose === 'attendance');
  const attendingMemberIds = attendanceAction
    ? actionResponses
        .filter(r => r.action_required_id === attendanceAction.id &&
          (r.response_value === 'Yes, attending' || r.response_value === 'yes'))
        .map(r => r.member_id)
    : members.map(m => m.id);

  const getOverride = (memberId) => overrides.find(o => o.member_id === memberId);

  const handleAddEstimate = async () => {
    if (!newEstDesc || !newEstAmt) return;
    setSavingEst(true);
    const updated = [...estimatedExpenses, { description: newEstDesc, amount: parseFloat(newEstAmt) }];
    await base44.entities.Programme.update(programmeId, { estimated_expenses: updated });
    queryClient.invalidateQueries({ queryKey: ['programme-detail', programmeId] });
    setNewEstDesc('');
    setNewEstAmt('');
    setSavingEst(false);
  };

  const handleRemoveEstimate = async (index) => {
    const updated = estimatedExpenses.filter((_, i) => i !== index);
    await base44.entities.Programme.update(programmeId, { estimated_expenses: updated });
    queryClient.invalidateQueries({ queryKey: ['programme-detail', programmeId] });
  };

  const totalActualExpenses = allocations.reduce((s, a) => s + (a.amount || 0), 0)
    + ledgerEntries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
  const ledgerIncome = ledgerEntries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);

  // Expected income excludes not_attending and waived
  const billableMemberIds = attendingMemberIds.filter(id => !getOverride(id));
  const expectedIncome = billableMemberIds.length * cost;
  const netEstimate = expectedIncome - totalEstimatedExpenses;

  const contextLabel = `${sectionName || 'Meeting'} - ${date || ''}`;
  const qrUrl = `${window.location.origin}/receipt-submit?meeting_id=${programmeId}&label=${encodeURIComponent(contextLabel)}`;

  if (!programmeId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Save the meeting plan first to enable finance tracking.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Deadline warning */}
      {isDeadlinePassed && cost > 0 && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <Clock className="w-4 h-4 flex-shrink-0" />
          Payment deadline passed ({paymentDeadline}). Unpaid members are marked as Overdue.
        </div>
      )}

      {/* Planning Summary (Estimated) */}
      {cost > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Planning Estimates</p>
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4 text-center">
                <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Expected Income</p>
                <p className="text-xl font-bold text-green-700">{fmt(expectedIncome)}</p>
                <p className="text-xs text-gray-400">{billableMemberIds.length} × {fmt(cost)}</p>
              </CardContent>
            </Card>
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="p-4 text-center">
                <TrendingDown className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                <p className="text-xs text-gray-500">Estimated Expenses</p>
                <p className="text-xl font-bold text-orange-700">{fmt(totalEstimatedExpenses)}</p>
                <p className="text-xs text-gray-400">{estimatedExpenses.length} item{estimatedExpenses.length !== 1 ? 's' : ''}</p>
              </CardContent>
            </Card>
            <Card className={`border-2 ${netEstimate >= 0 ? 'border-blue-200 bg-blue-50' : 'border-red-200 bg-red-50'}`}>
              <CardContent className="p-4 text-center">
                <p className="text-xs text-gray-500">Net Estimate</p>
                <p className={`text-xl font-bold ${netEstimate >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmt(netEstimate)}</p>
                <p className="text-xs text-gray-400">income − est. expenses</p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Actual Summary */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Actuals (Ledger)</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-gray-500">Actual Expenses</p>
              <p className="text-xl font-bold text-red-700">{fmt(totalActualExpenses)}</p>
              <p className="text-xs text-gray-400">receipts + ledger</p>
            </CardContent>
          </Card>
          <Card className="border-gray-200 bg-gray-50">
            <CardContent className="p-4 text-center">
              <p className="text-xs text-gray-500">Collected</p>
              <p className="text-xl font-bold text-gray-700">{fmt(ledgerIncome)}</p>
              <p className="text-xs text-gray-400">from ledger</p>
            </CardContent>
          </Card>
          <Card className={`border-2 ${ledgerIncome - totalActualExpenses >= 0 ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'}`}>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-gray-500">Actual Net</p>
              <p className={`text-xl font-bold ${ledgerIncome - totalActualExpenses >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmt(ledgerIncome - totalActualExpenses)}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Estimated Expenses Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-orange-600" />
            <CardTitle className="text-base">Planned / Estimated Expenses</CardTitle>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">For planning only — does not affect actual ledger calculations.</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {estimatedExpenses.map((item, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-100 rounded-lg text-sm">
              <span className="flex-1">{item.description}</span>
              <span className="font-medium text-orange-700">{fmt(item.amount)}</span>
              <Button size="sm" variant="ghost" className="text-red-400 h-6 w-6 p-0" onClick={() => handleRemoveEstimate(i)}>
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="Description" value={newEstDesc} onChange={e => setNewEstDesc(e.target.value)} className="flex-1 h-8 text-sm" />
            <Input type="number" step="0.01" min="0" placeholder="£" value={newEstAmt} onChange={e => setNewEstAmt(e.target.value)} className="w-24 h-8 text-sm" />
            <Button size="sm" onClick={handleAddEstimate} disabled={savingEst || !newEstDesc || !newEstAmt} className="h-8 bg-orange-600 hover:bg-orange-700">
              <Plus className="w-3 h-3" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Expenses breakdown */}
      {(allocations.length > 0 || ledgerEntries.filter(e => e.type === 'expense').length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              <CardTitle className="text-base">Actual Expenses Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Source</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Category</th>
                  <th className="text-left py-2 px-2 text-gray-500 font-medium">Notes</th>
                  <th className="text-right py-2 px-2 text-gray-500 font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map(a => (
                  <tr key={a.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <Badge variant="outline" className={`text-xs ${a.payment_method === 'scout_bank_card' ? 'border-blue-300 text-blue-700' : 'border-purple-300 text-purple-700'}`}>
                        {a.payment_method === 'scout_bank_card' ? 'Bank Card' : 'Personal'}
                      </Badge>
                    </td>
                    <td className="py-2 px-2 capitalize">{a.category?.replace(/_/g, ' ')}</td>
                    <td className="py-2 px-2 text-gray-500 text-xs">{a.notes || '—'}</td>
                    <td className="py-2 px-2 text-right font-semibold text-red-700">{fmt(a.amount)}</td>
                  </tr>
                ))}
                {ledgerEntries.filter(e => e.type === 'expense').map(e => (
                  <tr key={e.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2"><Badge variant="outline" className="text-xs border-gray-300 text-gray-600">Ledger</Badge></td>
                    <td className="py-2 px-2 capitalize">{e.category?.replace(/_/g, ' ')}</td>
                    <td className="py-2 px-2 text-gray-500 text-xs">{e.description}</td>
                    <td className="py-2 px-2 text-right font-semibold text-red-700">{fmt(e.amount)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 font-semibold bg-gray-50">
                  <td colSpan={3} className="py-2 px-2">Total Actual Expenses</td>
                  <td className="py-2 px-2 text-right text-red-700">{fmt(totalActualExpenses)}</td>
                </tr>
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Attending Members — Stripe Payments */}
      <MeetingAttendingMembersStripe programmeId={programmeId} programme={programme} />

      {/* QR Receipt Submission */}
      <Card className="border-teal-200 bg-teal-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2"><QrCode className="w-4 h-4 text-teal-700" /><CardTitle className="text-sm text-teal-800">QR Receipt Submission</CardTitle></div>
            <Button size="sm" variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-100 text-xs" onClick={() => window.open(qrUrl, '_blank')}><ExternalLink className="w-3 h-3 mr-1" />Open Link</Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="bg-white border border-teal-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 break-all select-all">{qrUrl}</div>
        </CardContent>
      </Card>
    </div>
  );
}