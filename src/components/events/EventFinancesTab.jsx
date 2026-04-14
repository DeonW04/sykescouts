import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Receipt, Users, QrCode, ExternalLink } from 'lucide-react';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function EventFinancesTab({ eventId, event }) {
  const [showQR, setShowQR] = useState(false);

  const { data: allocations = [] } = useQuery({
    queryKey: ['receipt-allocations-event', eventId],
    queryFn: () => base44.entities.ReceiptAllocation.filter({}),
    select: (data) => data.filter(a => a.linked_event_id === eventId),
  });

  const { data: ledgerEntries = [] } = useQuery({
    queryKey: ['ledger-event', eventId],
    queryFn: () => base44.entities.LedgerEntry.filter({ linked_event_id: eventId }),
  });

  const { data: eventAttendance = [] } = useQuery({
    queryKey: ['event-attendances', eventId],
    queryFn: () => base44.entities.EventAttendance.filter({ event_id: eventId }),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: memberPayments = [] } = useQuery({
    queryKey: ['member-payments-event', eventId],
    queryFn: () => base44.entities.MemberPayment.filter({ related_event_id: eventId }),
  });

  const { data: actionsRequired = [] } = useQuery({
    queryKey: ['action-required', eventId],
    queryFn: () => base44.entities.ActionRequired.filter({ event_id: eventId }),
  });

  const { data: actionResponses = [] } = useQuery({
    queryKey: ['action-responses-finances', eventId],
    queryFn: async () => {
      const allResponses = await base44.entities.ActionResponse.filter({});
      const actionIds = actionsRequired.map(a => a.id);
      return allResponses.filter(r => actionIds.includes(r.action_required_id));
    },
    enabled: actionsRequired.length > 0,
  });

  const cost = event?.cost || 0;

  // Determine attending members via the Attendance action response
  const attendanceAction = actionsRequired.find(a => a.action_purpose === 'attendance');
  const attendingMemberIds = attendanceAction
    ? actionResponses
        .filter(r => r.action_required_id === attendanceAction.id &&
          (r.response_value === 'Yes, attending' || r.response_value === 'yes'))
        .map(r => r.member_id)
    : eventAttendance.map(a => a.member_id); // fallback: all invited members

  const attending = attendingMemberIds;
  const totalExpected = attending.length * cost;
  const totalCollected = memberPayments.reduce((s, p) => s + (p.amount || 0), 0);
  const paidCount = memberPayments.reduce((memberSet, p) => {
    // count members who have paid in full
    const memberTotal = memberPayments.filter(mp => mp.member_id === p.member_id).reduce((s, mp) => s + (mp.amount || 0), 0);
    if (memberTotal >= cost && cost > 0) memberSet.add(p.member_id);
    return memberSet;
  }, new Set()).size;
  const totalExpenses = allocations.reduce((s, a) => s + (a.amount || 0), 0);
  const net = totalCollected - totalExpenses;

  const qrUrl = `${window.location.origin}/receipt-submit?event_id=${eventId}&label=${encodeURIComponent(event?.title || 'Event')}`;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Payments Collected</p>
            <p className="text-xl font-bold text-green-700">{fmt(totalCollected)}</p>
            <p className="text-xs text-gray-400">{paidCount}/{attending.length} attending paid</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Receipts / Expenses</p>
            <p className="text-xl font-bold text-red-700">{fmt(totalExpenses)}</p>
            <p className="text-xs text-gray-400">{allocations.length} receipt{allocations.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card className={`border-2 ${net >= 0 ? 'border-blue-200 bg-blue-50' : 'border-orange-200 bg-orange-50'}`}>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500">Net</p>
            <p className={`text-xl font-bold ${net >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{fmt(net)}</p>
            <p className="text-xs text-gray-400">collected − expenses</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500">Expected Income</p>
            <p className="text-xl font-bold text-gray-700">{fmt(totalExpected)}</p>
            <p className="text-xs text-gray-400">{fmt(totalCollected - totalExpected)} outstanding</p>
          </CardContent>
        </Card>
      </div>

      {/* QR Receipt Submission */}
      <Card className="border-teal-200 bg-teal-50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-teal-700" />
              <CardTitle className="text-sm text-teal-800">QR Receipt Submission</CardTitle>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-teal-300 text-teal-700 hover:bg-teal-100 text-xs"
              onClick={() => window.open(qrUrl, '_blank')}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Open Link
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          <p className="text-xs text-teal-700 mb-2">
            Share this link (or print a QR code) so leaders can submit receipts without logging in:
          </p>
          <div className="bg-white border border-teal-200 rounded-lg px-3 py-2 text-xs font-mono text-gray-600 break-all select-all">
            {qrUrl}
          </div>
        </CardContent>
      </Card>

      {/* Receipt Allocations */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4" />
            <CardTitle className="text-base">Receipts & Allocations ({allocations.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No receipts submitted for this event yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Date</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Category</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Paid By</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Notes</th>
                    <th className="text-right py-2 px-2 text-gray-500 font-medium">Amount</th>
                    <th className="text-center py-2 px-2 text-gray-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allocations.map(a => (
                    <tr key={a.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-500 text-xs">{a.allocation_date || '—'}</td>
                      <td className="py-2 px-2 capitalize">{a.category?.replace(/_/g, ' ')}</td>
                      <td className="py-2 px-2">
                        <Badge variant="outline" className={`text-xs ${a.payment_method === 'scout_bank_card' ? 'border-blue-300 text-blue-700' : 'border-purple-300 text-purple-700'}`}>
                          {a.payment_method === 'scout_bank_card' ? 'Bank Card' : 'Personal'}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-gray-500 text-xs max-w-36 truncate">{a.notes || '—'}</td>
                      <td className="py-2 px-2 text-right font-semibold text-red-700">{fmt(a.amount)}</td>
                      <td className="py-2 px-2 text-center">
                        <Badge className={a.status === 'allocated' ? 'bg-green-100 text-green-800 text-xs' : 'bg-amber-100 text-amber-800 text-xs'}>
                          {a.status === 'allocated' ? 'Allocated' : 'Pending'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 font-semibold bg-gray-50">
                    <td colSpan={4} className="py-2 px-2">Total Expenses</td>
                    <td className="py-2 px-2 text-right text-red-700">{fmt(totalExpenses)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participant Payments */}
      {attending.length > 0 && cost > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <CardTitle className="text-base">Attending Members — Payments ({attending.length})</CardTitle>
            </div>
            {attendanceAction && (
              <p className="text-xs text-gray-400 mt-0.5">Based on "{attendanceAction.column_title}" responses</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Member</th>
                    <th className="text-right py-2 px-2 text-gray-500 font-medium">Cost</th>
                    <th className="text-right py-2 px-2 text-gray-500 font-medium">Paid</th>
                    <th className="text-center py-2 px-2 text-gray-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {attending.map(memberId => {
                    const member = members.find(m => m.id === memberId);
                    const paid = memberPayments.filter(p => p.member_id === memberId).reduce((s, p) => s + (p.amount || 0), 0);
                    const status = paid >= cost ? 'paid' : paid > 0 ? 'partial' : 'unpaid';
                    return (
                      <tr key={memberId} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2">{member?.full_name || 'Unknown'}</td>
                        <td className="py-2 px-2 text-right">{fmt(cost)}</td>
                        <td className="py-2 px-2 text-right text-green-700 font-medium">{fmt(paid)}</td>
                        <td className="py-2 px-2 text-center">
                          <Badge className={status === 'paid' ? 'bg-green-100 text-green-800 text-xs' : status === 'partial' ? 'bg-amber-100 text-amber-800 text-xs' : 'bg-red-100 text-red-800 text-xs'}>
                            {status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ledger Entries if any */}
      {ledgerEntries.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Ledger Entries ({ledgerEntries.length})</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Date</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Description</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-medium">Type</th>
                    <th className="text-right py-2 px-2 text-gray-500 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerEntries.map(e => (
                    <tr key={e.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2 text-gray-500">{e.date}</td>
                      <td className="py-2 px-2">{e.description}</td>
                      <td className="py-2 px-2">
                        <Badge className={e.type === 'income' ? 'bg-green-100 text-green-800 text-xs' : 'bg-red-100 text-red-800 text-xs'}>{e.type}</Badge>
                      </td>
                      <td className={`py-2 px-2 text-right font-semibold ${e.type === 'income' ? 'text-green-700' : 'text-red-700'}`}>
                        {e.type === 'expense' ? '-' : ''}{fmt(e.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}