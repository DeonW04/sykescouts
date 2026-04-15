import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingDown, TrendingUp, Receipt, QrCode, ExternalLink, Users, CheckCircle, AlertTriangle, XCircle, MinusCircle, Slash } from 'lucide-react';
import { toast } from 'sonner';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function MeetingFinancesTab({ programmeId, sectionId, date, sectionName }) {
  const queryClient = useQueryClient();

  const { data: programme } = useQuery({
    queryKey: ['programme-detail', programmeId],
    queryFn: () => base44.entities.Programme.filter({ id: programmeId }).then(r => r[0]),
    enabled: !!programmeId,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ['receipt-allocations-meeting', programmeId],
    queryFn: () => base44.entities.ReceiptAllocation.filter({}),
    enabled: !!programmeId,
    select: (data) => data.filter(a => a.linked_meeting_id === programmeId),
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
      const allResponses = await base44.entities.ActionResponse.filter({});
      const actionIds = actionsRequired.map(a => a.id);
      return allResponses.filter(r => actionIds.includes(r.action_required_id));
    },
    enabled: actionsRequired.length > 0,
  });

  const { data: memberPayments = [] } = useQuery({
    queryKey: ['member-payments-meeting', programmeId],
    queryFn: () => base44.entities.MemberPayment.filter({ related_event_id: programmeId }),
    enabled: !!programmeId,
  });

  const { data: overrides = [] } = useQuery({
    queryKey: ['payment-overrides', programmeId],
    queryFn: () => base44.entities.MeetingPaymentOverride.filter({ programme_id: programmeId }),
    enabled: !!programmeId,
  });

  const { data: currentUser } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const cost = programme?.cost || 0;

  const attendanceAction = actionsRequired.find(a => a.action_purpose === 'attendance');
  const attendingMemberIds = attendanceAction
    ? actionResponses
        .filter(r => r.action_required_id === attendanceAction.id &&
          (r.response_value === 'Yes, attending' || r.response_value === 'yes'))
        .map(r => r.member_id)
    : members.map(m => m.id);

  const getOverride = (memberId) => overrides.find(o => o.member_id === memberId);

  const handleSetOverride = async (memberId, overrideType) => {
    const existing = overrides.find(o => o.member_id === memberId && o.programme_id === programmeId);
    if (existing) {
      if (existing.override_type === overrideType) {
        // Clear override
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
    queryClient.invalidateQueries({ queryKey: ['payment-overrides', programmeId] });
  };

  const totalExpenses = allocations.reduce((s, a) => s + (a.amount || 0), 0);
  const ledgerExpenses = ledgerEntries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);
  const totalAllExpenses = totalExpenses + ledgerExpenses;
  const ledgerIncome = ledgerEntries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);

  // Adjust expected income for overrides
  const billableMemberIds = attendingMemberIds.filter(id => {
    const ov = getOverride(id);
    return !ov || ov.override_type === 'waived'; // waived: still attending but not counted in outstanding
  });
  const expectedIncome = billableMemberIds.filter(id => !getOverride(id)).length * cost;
  const net = ledgerIncome - totalAllExpenses;

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
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Total Expenses</p>
            <p className="text-xl font-bold text-red-700">{fmt(totalAllExpenses)}</p>
            <p className="text-xs text-gray-400">{allocations.length} receipt{allocations.length !== 1 ? 's' : ''} + ledger</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">{cost > 0 ? 'Expected Income' : 'Ledger Income'}</p>
            <p className="text-xl font-bold text-green-700">{fmt(cost > 0 ? expectedIncome : ledgerIncome)}</p>
            {cost > 0 && <p className="text-xs text-gray-400">{billableMemberIds.filter(id => !getOverride(id)).length} × {fmt(cost)}</p>}
          </CardContent>
        </Card>
        <Card className={`border-2 ${net >= 0 ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'}`}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500">Net</p>
            <p className={`text-xl font-bold ${net >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmt(net)}</p>
            <p className="text-xs text-gray-400">income − expenses</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500">Collected</p>
            <p className="text-xl font-bold text-gray-700">{fmt(ledgerIncome)}</p>
            <p className="text-xs text-gray-400">from ledger entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses breakdown */}
      {(allocations.length > 0 || ledgerExpenses > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Receipt className="w-4 h-4" />
              <CardTitle className="text-base">Expenses Breakdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
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
                    <td colSpan={3} className="py-2 px-2">Total Expenses</td>
                    <td className="py-2 px-2 text-right text-red-700">{fmt(totalAllExpenses)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendee payments with overrides */}
      {cost > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <CardTitle className="text-base">
                {attendanceAction ? `Attendees — Payment Status (${attendingMemberIds.length})` : `All Members — Payment Status (${members.length})`}
              </CardTitle>
            </div>
            {!attendanceAction && <p className="text-xs text-amber-600 mt-0.5">No attendance action found — showing all section members</p>}
            <p className="text-xs text-gray-400 mt-0.5">Use overrides to mark members as Not Attending or Waived — click action buttons on each row.</p>
          </CardHeader>
          <CardContent>
            {attendingMemberIds.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No attending members found yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-2 text-gray-500 font-medium">Member</th>
                      <th className="text-right py-2 px-2 text-gray-500 font-medium">Expected</th>
                      <th className="text-right py-2 px-2 text-gray-500 font-medium">Paid</th>
                      <th className="text-center py-2 px-2 text-gray-500 font-medium">Status</th>
                      <th className="text-center py-2 px-2 text-gray-500 font-medium">Override</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendingMemberIds.map(memberId => {
                      const member = members.find(m => m.id === memberId);
                      const paid = memberPayments.filter(p => p.member_id === memberId).reduce((s, p) => s + (p.amount || 0), 0);
                      const ov = getOverride(memberId);
                      const isNotAttending = ov?.override_type === 'not_attending';
                      const isWaived = ov?.override_type === 'waived';
                      const isPaid = paid >= cost;
                      const isExact = paid === cost;

                      return (
                        <tr key={memberId} className={`border-b hover:bg-gray-50 ${isNotAttending ? 'opacity-50' : ''}`}>
                          <td className="py-2 px-2 font-medium">{member?.full_name || 'Unknown'}</td>
                          <td className="py-2 px-2 text-right text-gray-500">{isNotAttending ? '—' : fmt(cost)}</td>
                          <td className="py-2 px-2 text-right font-medium text-green-700">{fmt(paid)}</td>
                          <td className="py-2 px-2 text-center">
                            {isNotAttending ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full">
                                <MinusCircle className="w-3 h-3" /> Not Attending
                              </span>
                            ) : isWaived ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                <Slash className="w-3 h-3" /> Waived
                              </span>
                            ) : paid === 0 ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                                <XCircle className="w-3 h-3" /> Unpaid
                              </span>
                            ) : isPaid && isExact ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                                <CheckCircle className="w-3 h-3" /> Paid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                <AlertTriangle className="w-3 h-3" /> {paid > cost ? 'Overpaid' : 'Incorrect'}
                              </span>
                            )}
                          </td>
                          <td className="py-2 px-2 text-center">
                            {!isPaid && !isWaived && (
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant={isNotAttending ? 'default' : 'outline'}
                                  className={`text-xs h-6 px-2 ${isNotAttending ? 'bg-gray-500 text-white' : 'border-gray-300 text-gray-600'}`}
                                  onClick={() => handleSetOverride(memberId, 'not_attending')}
                                >
                                  {isNotAttending ? 'Clear' : 'Not Attending'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant={isWaived ? 'default' : 'outline'}
                                  className={`text-xs h-6 px-2 ${isWaived ? 'bg-blue-500 text-white' : 'border-blue-300 text-blue-600'}`}
                                  onClick={() => handleSetOverride(memberId, 'waived')}
                                >
                                  Waive
                                </Button>
                              </div>
                            )}
                            {(isPaid || isWaived) && ov && (
                              <Button size="sm" variant="ghost" className="text-xs h-6 text-gray-400" onClick={() => handleSetOverride(memberId, ov.override_type)}>Clear</Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* QR Receipt Submission */}
      <Card className="border-teal-200 bg-teal-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-teal-700" />
              <CardTitle className="text-sm text-teal-800">QR Receipt Submission</CardTitle>
            </div>
            <Button size="sm" variant="outline" className="border-teal-300 text-teal-700 hover:bg-teal-100 text-xs" onClick={() => window.open(qrUrl, '_blank')}>
              <ExternalLink className="w-3 h-3 mr-1" />Open Link
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <div className="bg-white border border-teal-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 break-all select-all">
            {qrUrl}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}