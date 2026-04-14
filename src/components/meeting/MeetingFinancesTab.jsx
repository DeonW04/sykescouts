import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingDown, Receipt, QrCode, ExternalLink } from 'lucide-react';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function MeetingFinancesTab({ programmeId, sectionId, date, sectionName }) {
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

  const totalExpenses = allocations.reduce((s, a) => s + (a.amount || 0), 0);
  const ledgerIncome = ledgerEntries.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
  const ledgerExpenses = ledgerEntries.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);

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
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <TrendingDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
            <p className="text-xs text-gray-500">Receipts / Expenses</p>
            <p className="text-xl font-bold text-red-700">{fmt(totalExpenses)}</p>
            <p className="text-xs text-gray-400">{allocations.length} receipt{allocations.length !== 1 ? 's' : ''}</p>
          </CardContent>
        </Card>
        <Card className="border-gray-200 bg-gray-50">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-gray-500">Ledger Income</p>
            <p className="text-xl font-bold text-green-700">{fmt(ledgerIncome)}</p>
            <p className="text-xs text-gray-400">{ledgerEntries.filter(e => e.type === 'income').length} entries</p>
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
            Share this link so leaders can submit receipts for this meeting without logging in:
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
            <CardTitle className="text-base">Receipts ({allocations.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {allocations.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No receipts submitted for this meeting yet.</p>
              <p className="text-xs text-gray-400 mt-1">Use the QR link above for quick submission, or upload via the Receipt Uploader.</p>
            </div>
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
                    <td colSpan={4} className="py-2 px-2">Total</td>
                    <td className="py-2 px-2 text-right text-red-700">{fmt(totalExpenses)}</td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

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