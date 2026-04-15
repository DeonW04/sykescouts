import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ChevronDown, ChevronRight, Calendar, CheckCircle, AlertTriangle, XCircle, MinusCircle, Slash, Lock, Clock } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;
const today = new Date().toISOString().split('T')[0];

export default function TreasurerProgrammeFinances() {
  const queryClient = useQueryClient();
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedTermId, setSelectedTermId] = useState('');
  const [expandedMeetings, setExpandedMeetings] = useState({});
  const [closeTermDialog, setCloseTermDialog] = useState(false);
  const [closingTerm, setClosingTerm] = useState(false);
  const [outstandingBlockDialog, setOutstandingBlockDialog] = useState(false);
  const [outstandingList, setOutstandingList] = useState([]);

  const { data: terms = [] } = useQuery({ queryKey: ['terms'], queryFn: () => base44.entities.Term.list('-start_date', 50) });
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: programmes = [] } = useQuery({ queryKey: ['programmes-all'], queryFn: () => base44.entities.Programme.list('-date', 500) });
  const { data: allocations = [] } = useQuery({ queryKey: ['receipt-allocations'], queryFn: () => base44.entities.ReceiptAllocation.filter({}) });
  const { data: ledgerEntries = [] } = useQuery({ queryKey: ['ledger-entries'], queryFn: () => base44.entities.LedgerEntry.list('-date', 500) });
  const { data: memberPayments = [] } = useQuery({ queryKey: ['member-payments'], queryFn: () => base44.entities.MemberPayment.list('-date', 500) });
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: budgets = [] } = useQuery({ queryKey: ['section-budgets'], queryFn: () => base44.entities.SectionBudget.filter({}) });
  const { data: actionsRequired = [] } = useQuery({ queryKey: ['actions-required-all'], queryFn: () => base44.entities.ActionRequired.filter({}) });
  const { data: actionResponses = [] } = useQuery({ queryKey: ['action-responses-all'], queryFn: () => base44.entities.ActionResponse.filter({}) });
  const { data: overrides = [] } = useQuery({ queryKey: ['payment-overrides-all'], queryFn: () => base44.entities.MeetingPaymentOverride.filter({}) });
  const { data: currentUser } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const currentTerm = terms.find(t => today >= t.start_date && today <= t.end_date);
  const activeTerm = selectedTermId ? terms.find(t => t.id === selectedTermId) : (currentTerm || terms[0]);
  const activeSection = selectedSectionId ? sections.find(s => s.id === selectedSectionId) : sections[0];

  const termFinanceClosed = activeTerm?.finance_closed;

  const sectionMembers = useMemo(() =>
    members.filter(m => m.section_id === activeSection?.id && m.active),
    [members, activeSection]
  );

  const termMeetings = useMemo(() => {
    if (!activeTerm || !activeSection) return [];
    return programmes.filter(p =>
      p.section_id === activeSection.id &&
      p.date >= activeTerm.start_date &&
      p.date <= activeTerm.end_date
    ).sort((a, b) => a.date.localeCompare(b.date));
  }, [programmes, activeTerm, activeSection]);

  const budget = budgets.find(b => b.section_id === activeSection?.id && b.term_id === activeTerm?.id);
  const budgetAmount = budget?.budget_amount || 0;

  // Budget-allocated general expenses (section_id match + budget_allocated flag)
  const budgetAllocatedExpenses = useMemo(() => {
    if (!activeSection || !activeTerm) return 0;
    return ledgerEntries.filter(e =>
      e.type === 'expense' &&
      e.budget_allocated &&
      !e.linked_meeting_id &&
      !e.linked_event_id &&
      (
        e.section_id === activeSection.id ||
        e.split_section_id === activeSection.id
      ) &&
      e.date >= activeTerm.start_date &&
      e.date <= activeTerm.end_date
    ).reduce((s, e) => {
      // If split: use the relevant portion
      if (e.split_section_id === activeSection.id && e.section_id !== activeSection.id) {
        return s + (e.split_amount || 0);
      }
      if (e.split_section_id && e.section_id === activeSection.id) {
        return s + ((e.amount || 0) - (e.split_amount || 0));
      }
      return s + (e.amount || 0);
    }, 0);
  }, [ledgerEntries, activeSection, activeTerm]);

  // Receipt allocations for meetings in this term
  const receiptAllocExpenses = useMemo(() => {
    const progIds = new Set(termMeetings.map(p => p.id));
    return allocations.filter(a => a.linked_meeting_id && progIds.has(a.linked_meeting_id))
      .reduce((s, a) => s + (a.amount || 0), 0);
  }, [termMeetings, allocations]);

  // Ledger expenses linked to meetings in this term
  const meetingLedgerExpenses = useMemo(() => {
    const progIds = new Set(termMeetings.map(p => p.id));
    return ledgerEntries.filter(e => e.type === 'expense' && e.linked_meeting_id && progIds.has(e.linked_meeting_id))
      .reduce((s, e) => s + (e.amount || 0), 0);
  }, [termMeetings, ledgerEntries]);

  // Calc income: cost × attending (non-overridden) members
  const calcIncome = useMemo(() => {
    return termMeetings.reduce((total, mtg) => {
      if (!mtg.cost) return total;
      const mtgOverrides = overrides.filter(o => o.programme_id === mtg.id);
      const attendanceAction = actionsRequired.find(a => a.programme_id === mtg.id && a.action_purpose === 'attendance');
      let memberIds;
      if (attendanceAction) {
        memberIds = actionResponses.filter(r =>
          r.action_required_id === attendanceAction.id &&
          (r.response_value === 'Yes, attending' || r.response_value === 'yes')
        ).map(r => r.member_id);
      } else {
        memberIds = sectionMembers.map(m => m.id);
      }
      const billable = memberIds.filter(id => {
        const ov = mtgOverrides.find(o => o.member_id === id);
        return !ov; // not_attending and waived both excluded from expected income
      });
      return total + billable.length * mtg.cost;
    }, 0);
  }, [termMeetings, actionsRequired, actionResponses, sectionMembers, overrides]);

  const calcExpenses = receiptAllocExpenses + meetingLedgerExpenses + budgetAllocatedExpenses;
  const remainingBudget = budgetAmount + calcIncome - calcExpenses;

  const getMeetingMemberData = (mtg) => {
    if (!mtg.cost) return [];
    const attendanceAction = actionsRequired.find(a => a.programme_id === mtg.id && a.action_purpose === 'attendance');
    const mtgPayments = memberPayments.filter(p => p.related_event_id === mtg.id);
    const mtgOverrides = overrides.filter(o => o.programme_id === mtg.id);

    return sectionMembers.map(member => {
      const paid = mtgPayments.filter(p => p.member_id === member.id).reduce((s, p) => s + (p.amount || 0), 0);
      const ov = mtgOverrides.find(o => o.member_id === member.id);
      let attendingStatus = 'unknown';
      if (attendanceAction) {
        const resp = actionResponses.find(r => r.action_required_id === attendanceAction.id && r.member_id === member.id);
        if (resp) attendingStatus = (resp.response_value === 'Yes, attending' || resp.response_value === 'yes') ? 'attending' : 'not_attending';
      }
      return { member, paid, attendingStatus, cost: mtg.cost, override: ov };
    });
  };

  const handleSetOverride = async (programmeId, memberId, overrideType) => {
    const existing = overrides.find(o => o.programme_id === programmeId && o.member_id === memberId);
    if (existing) {
      if (existing.override_type === overrideType) {
        await base44.entities.MeetingPaymentOverride.delete(existing.id);
        toast.success('Override cleared');
      } else {
        await base44.entities.MeetingPaymentOverride.update(existing.id, { override_type: overrideType, set_by: currentUser?.email });
        toast.success('Override updated');
      }
    } else {
      await base44.entities.MeetingPaymentOverride.create({
        programme_id: programmeId,
        member_id: memberId,
        override_type: overrideType,
        set_by: currentUser?.email,
      });
      toast.success(overrideType === 'not_attending' ? 'Marked as Not Attending' : 'Payment Waived');
    }
    queryClient.invalidateQueries({ queryKey: ['payment-overrides-all'] });
  };

  // Term close checks
  const getOutstandingBalances = () => {
    const outstanding = [];
    termMeetings.forEach(mtg => {
      if (!mtg.cost) return;
      const memberData = getMeetingMemberData(mtg);
      memberData.forEach(({ member, paid, override, attendingStatus, cost }) => {
        if (override) return; // waived or not_attending — both excluded
        if (attendingStatus === 'not_attending') return;
        if (paid < cost) {
          outstanding.push({
            memberName: member.full_name,
            meetingTitle: mtg.title,
            meetingDate: mtg.date,
            owed: cost - paid,
          });
        }
      });
    });
    return outstanding;
  };

  const handleCloseTerm = async () => {
    const outstanding = getOutstandingBalances();
    if (outstanding.length > 0) {
      setOutstandingList(outstanding);
      setOutstandingBlockDialog(true);
      return;
    }
    setCloseTermDialog(true);
  };

  const confirmCloseTerm = async () => {
    setClosingTerm(true);
    try {
      await base44.entities.Term.update(activeTerm.id, {
        finance_closed: true,
        finance_closed_date: today,
        finance_closed_by: currentUser?.email,
      });
      queryClient.invalidateQueries({ queryKey: ['terms'] });
      toast.success('Term finances closed and locked');
      setCloseTermDialog(false);
    } catch (e) {
      toast.error('Failed: ' + e.message);
    } finally {
      setClosingTerm(false);
    }
  };

  const StatusPill = ({ cost, paid, override, attendingStatus, deadline }) => {
    if (override?.override_type === 'not_attending' || attendingStatus === 'not_attending') return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
        <MinusCircle className="w-3 h-3" /> Not Attending
      </span>
    );
    if (override?.override_type === 'waived') return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
        <Slash className="w-3 h-3" /> Waived
      </span>
    );
    if (paid >= cost && cost > 0) return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
        <CheckCircle className="w-3 h-3" /> Paid
      </span>
    );
    if (paid > 0) return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
        <AlertTriangle className="w-3 h-3" /> Incorrect
      </span>
    );
    if (deadline && today > deadline) return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-100 border border-red-300 px-2 py-0.5 rounded-full">
        <Clock className="w-3 h-3" /> Overdue
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
        <XCircle className="w-3 h-3" /> Unpaid
      </span>
    );
  };

  const outstandingForCheck = getOutstandingBalances();

  return (
    <TreasurerLayout title="Programme Finances">
      {/* Selectors */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Section:</Label>
          <Select value={selectedSectionId || activeSection?.id || ''} onValueChange={setSelectedSectionId}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Select section..." /></SelectTrigger>
            <SelectContent>
              {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm font-semibold text-gray-700 whitespace-nowrap">Term:</Label>
          <Select value={selectedTermId || activeTerm?.id || ''} onValueChange={setSelectedTermId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select term..." /></SelectTrigger>
            <SelectContent>
              {terms.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  {t.title || t.name}{currentTerm?.id === t.id ? ' ✓ Current' : ''}{t.finance_closed ? ' 🔒' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Term close button */}
        {activeTerm && !termFinanceClosed && (
          <Button
            size="sm"
            variant="outline"
            className="ml-auto border-red-300 text-red-700 hover:bg-red-50"
            onClick={handleCloseTerm}
          >
            <Lock className="w-3 h-3 mr-1" /> Close Term Finances
          </Button>
        )}
        {termFinanceClosed && (
          <div className="ml-auto flex items-center gap-2 px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-600">
            <Lock className="w-3 h-3" /> Term Finances Locked
          </div>
        )}
      </div>

      {/* Locked warning */}
      {termFinanceClosed && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-300 rounded-lg flex items-center gap-2 text-sm text-gray-600">
          <Lock className="w-4 h-4 flex-shrink-0" />
          Term finances are locked. Closed on {activeTerm.finance_closed_date || '—'} by {activeTerm.finance_closed_by || 'unknown'}.
        </div>
      )}

      {/* Budget Summary 4 boxes */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500">Budget</p>
            <p className="text-xl font-bold text-blue-700">{fmt(budgetAmount)}</p>
            {!budget && <p className="text-xs text-amber-600 mt-1">Not set</p>}
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500">Calc Expenses</p>
            <p className="text-xl font-bold text-red-700">{fmt(calcExpenses)}</p>
            <p className="text-xs text-gray-400">receipts + ledger + allocations</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500">Calc Income</p>
            <p className="text-xl font-bold text-green-700">{fmt(calcIncome)}</p>
            <p className="text-xs text-gray-400">meetings with costs</p>
          </CardContent>
        </Card>
        <Card className={`border-2 ${remainingBudget >= 0 ? 'border-emerald-200 bg-emerald-50' : 'border-orange-200 bg-orange-50'}`}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500">Remaining Budget</p>
            <p className={`text-xl font-bold ${remainingBudget >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>{fmt(remainingBudget)}</p>
            <p className="text-xs text-gray-400">budget + income − expenses</p>
          </CardContent>
        </Card>
      </div>

      {/* Meetings list */}
      {termMeetings.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>No meetings found for this section and term</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {termMeetings.map(mtg => {
            const isExpanded = expandedMeetings[mtg.id];
            const mtgAllocations = allocations.filter(a => a.linked_meeting_id === mtg.id);
            const mtgLedger = ledgerEntries.filter(e => e.linked_meeting_id === mtg.id);
            const hasCost = !!mtg.cost;
            const memberData = hasCost ? getMeetingMemberData(mtg) : [];
            const totalExpenses = mtgAllocations.reduce((s, a) => s + (a.amount || 0), 0) + mtgLedger.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
            const totalCollected = memberPayments.filter(p => p.related_event_id === mtg.id).reduce((s, p) => s + (p.amount || 0), 0);
            const hasData = hasCost || totalExpenses > 0;

            return (
              <Card key={mtg.id} className="overflow-hidden">
                <div
                  className={`flex items-center justify-between px-4 py-3 ${hasData ? 'cursor-pointer hover:bg-gray-50' : ''} transition-colors`}
                  onClick={() => hasData && setExpandedMeetings(prev => ({ ...prev, [mtg.id]: !prev[mtg.id] }))}
                >
                  <div className="flex items-center gap-3">
                    {hasData ? (
                      isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
                    ) : <div className="w-4 h-4" />}
                    <div>
                      <p className="text-sm font-medium">
                        {new Date(mtg.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} — {mtg.title || 'Untitled'}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {hasCost && <span className="text-xs text-blue-600 font-medium">{fmt(mtg.cost)}/member</span>}
                        {mtg.payment_deadline && <span className="text-xs text-gray-400">Due: {mtg.payment_deadline}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {totalExpenses > 0 && <span className="text-red-600 font-medium">Exp: {fmt(totalExpenses)}</span>}
                    {hasCost && <span className="text-green-600 font-medium">Coll: {fmt(totalCollected)}</span>}
                    {!hasData && <span className="text-gray-300">No finances</span>}
                  </div>
                </div>

                {isExpanded && hasData && (
                  <div className="border-t bg-gray-50/50 px-4 pb-4">
                    {/* Member payment status with overrides */}
                    {hasCost && memberData.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Member Payment Status</p>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left py-1.5 text-gray-400 font-medium">Member</th>
                                <th className="text-right py-1.5 text-gray-400 font-medium">Expected</th>
                                <th className="text-right py-1.5 text-gray-400 font-medium">Paid</th>
                                <th className="text-center py-1.5 text-gray-400 font-medium">Status</th>
                                {!termFinanceClosed && <th className="text-center py-1.5 text-gray-400 font-medium">Override</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {memberData.map(({ member, paid, attendingStatus, cost, override }) => {
                                const isPaid = paid >= cost;
                                const isNA = override?.override_type === 'not_attending' || attendingStatus === 'not_attending';
                                const isWaived = override?.override_type === 'waived';
                                return (
                                  <tr key={member.id} className={`border-b border-gray-100 ${isNA ? 'opacity-50' : ''}`}>
                                    <td className="py-1.5 font-medium">{member.full_name}</td>
                                    <td className="py-1.5 text-right">{isNA ? '—' : fmt(cost)}</td>
                                    <td className="py-1.5 text-right text-green-600">{fmt(paid)}</td>
                                    <td className="py-1.5 text-center">
                                      <StatusPill cost={cost} paid={paid} override={override} attendingStatus={attendingStatus} deadline={mtg.payment_deadline} />
                                    </td>
                                    {!termFinanceClosed && (
                                      <td className="py-1.5 text-center">
                                        {!isPaid && !isWaived && (
                                          <div className="flex items-center justify-center gap-1 flex-wrap">
                                            <Button
                                              size="sm"
                                              variant={isNA ? 'default' : 'outline'}
                                              className={`text-xs h-6 px-2 ${isNA ? 'bg-gray-500 text-white' : 'border-gray-300 text-gray-600'}`}
                                              onClick={() => handleSetOverride(mtg.id, member.id, 'not_attending')}
                                            >
                                              {isNA ? 'Clear' : 'Not Attending'}
                                            </Button>
                                            {!isNA && (
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-xs h-6 px-2 border-blue-300 text-blue-600"
                                                onClick={() => handleSetOverride(mtg.id, member.id, 'waived')}
                                              >
                                                Waive
                                              </Button>
                                            )}
                                          </div>
                                        )}
                                        {(isPaid || isWaived) && override && (
                                          <Button size="sm" variant="ghost" className="text-xs h-6 text-gray-400" onClick={() => handleSetOverride(mtg.id, member.id, override.override_type)}>Clear</Button>
                                        )}
                                      </td>
                                    )}
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Expenses */}
                    {(mtgAllocations.length > 0 || mtgLedger.length > 0) && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2">Expenses</p>
                        <table className="w-full text-xs">
                          <tbody>
                            {mtgAllocations.map(a => (
                              <tr key={a.id} className="border-b border-gray-100">
                                <td className="py-1 capitalize">{a.category?.replace(/_/g, ' ')}</td>
                                <td className="py-1 text-gray-500">{a.notes || '—'}</td>
                                <td className="py-1 text-right text-red-600 font-medium">{fmt(a.amount)}</td>
                              </tr>
                            ))}
                            {mtgLedger.filter(e => e.type === 'expense').map(e => (
                              <tr key={e.id} className="border-b border-gray-100">
                                <td className="py-1 capitalize">{e.category?.replace(/_/g, ' ')}</td>
                                <td className="py-1 text-gray-500">{e.description}</td>
                                <td className="py-1 text-right text-red-600 font-medium">{fmt(e.amount)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Close Term Dialog */}
      <Dialog open={closeTermDialog} onOpenChange={setCloseTermDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-red-600" />
              Close Term Finances — {activeTerm?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-gray-600">
              This will lock all financial records for this term. No further changes can be made to meetings or events within this term.
            </p>
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-semibold text-green-800 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" /> All balances are resolved
              </p>
              <p className="text-xs text-green-600 mt-1">No outstanding payments found — term is ready to close.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-xs text-gray-500">Budget</p>
                <p className="font-bold text-blue-700">{fmt(budgetAmount)}</p>
              </div>
              <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
                <p className="text-xs text-gray-500">Expenses</p>
                <p className="font-bold text-red-700">{fmt(calcExpenses)}</p>
              </div>
              <div className={`p-3 rounded-lg border ${remainingBudget >= 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50 border-orange-100'}`}>
                <p className="text-xs text-gray-500">Remaining</p>
                <p className={`font-bold ${remainingBudget >= 0 ? 'text-emerald-700' : 'text-orange-700'}`}>{fmt(remainingBudget)}</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseTermDialog(false)}>Cancel</Button>
            <Button onClick={confirmCloseTerm} disabled={closingTerm} className="bg-red-600 hover:bg-red-700">
              <Lock className="w-4 h-4 mr-2" />{closingTerm ? 'Closing...' : 'Confirm Close Term'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Outstanding balances — blocks term close */}
      <Dialog open={outstandingBlockDialog} onOpenChange={setOutstandingBlockDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" /> Cannot Close Term
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-gray-600">
              The following members have outstanding unpaid balances that are not marked as Waived or Not Attending. Resolve these before closing the term.
            </p>
            <div className="space-y-1.5">
              {outstandingList.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2 bg-red-50 border border-red-100 rounded-lg text-sm">
                  <div>
                    <p className="font-medium text-red-800">{item.memberName}</p>
                    <p className="text-xs text-red-500">{item.meetingTitle} — {item.meetingDate}</p>
                  </div>
                  <span className="font-bold text-red-700">{fmt(item.owed)}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setOutstandingBlockDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TreasurerLayout>
  );
}