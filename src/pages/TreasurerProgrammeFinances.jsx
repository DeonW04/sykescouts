import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Calendar, TrendingUp, TrendingDown } from 'lucide-react';

const fmt = (n) => `£${(n || 0).toFixed(2)}`;

export default function TreasurerProgrammeFinances() {
  const [expandedTerms, setExpandedTerms] = useState({});
  const [expandedMeetings, setExpandedMeetings] = useState({});
  const [selectedSection, setSelectedSection] = useState('all');

  const { data: terms = [] } = useQuery({ queryKey: ['terms'], queryFn: () => base44.entities.Term.list('-start_date', 50) });
  const { data: programmes = [] } = useQuery({ queryKey: ['programmes-all'], queryFn: () => base44.entities.Programme.list('-date', 500) });
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: allocations = [] } = useQuery({ queryKey: ['receipt-allocations'], queryFn: () => base44.entities.ReceiptAllocation.filter({}) });
  const { data: ledgerEntries = [] } = useQuery({ queryKey: ['ledger-entries'], queryFn: () => base44.entities.LedgerEntry.list('-date', 500) });
  const { data: memberPayments = [] } = useQuery({ queryKey: ['member-payments'], queryFn: () => base44.entities.MemberPayment.list('-date', 500) });

  const toggleTerm = (termId) => setExpandedTerms(prev => ({ ...prev, [termId]: !prev[termId] }));
  const toggleMeeting = (meetingId) => setExpandedMeetings(prev => ({ ...prev, [meetingId]: !prev[meetingId] }));

  const getMeetingFinances = (programme) => {
    const meetingAllocations = allocations.filter(a => a.linked_meeting_id === programme.id && a.status === 'allocated');
    const meetingLedger = ledgerEntries.filter(e => e.linked_meeting_id === programme.id);
    const meetingPayments = memberPayments.filter(p => p.related_event_id === programme.id);

    const calcExpenses = meetingAllocations.reduce((s, a) => s + (a.amount || 0), 0);
    const calcIncome = meetingPayments.reduce((s, p) => s + (p.amount || 0), 0);
    const actualIncome = meetingLedger.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
    const actualExpenses = meetingLedger.filter(e => e.type === 'expense').reduce((s, e) => s + (e.amount || 0), 0);

    return { calcExpenses, calcIncome, actualIncome, actualExpenses, meetingAllocations, meetingLedger };
  };

  const getTermMeetings = (term) => {
    const filtered = programmes.filter(p => {
      const inTerm = p.date >= term.start_date && p.date <= term.end_date;
      const matchSection = selectedSection === 'all' || p.section_id === selectedSection;
      return inTerm && matchSection;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));
    return filtered;
  };

  const getTermTotals = (meetings) => {
    return meetings.reduce((totals, m) => {
      const fin = getMeetingFinances(m);
      return {
        calcExpenses: totals.calcExpenses + fin.calcExpenses,
        calcIncome: totals.calcIncome + fin.calcIncome,
        actualIncome: totals.actualIncome + fin.actualIncome,
        actualExpenses: totals.actualExpenses + fin.actualExpenses,
      };
    }, { calcExpenses: 0, calcIncome: 0, actualIncome: 0, actualExpenses: 0 });
  };

  const filteredTerms = terms.filter(t => selectedSection === 'all' || t.section_id === selectedSection || !t.section_id);

  return (
    <TreasurerLayout title="Programme Finances">
      {/* Section filter */}
      <div className="mb-6 flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-gray-600">Section:</span>
        <button
          onClick={() => setSelectedSection('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedSection === 'all' ? 'bg-[#004851] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
        >
          All Sections
        </button>
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedSection === s.id ? 'bg-[#004851] text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {s.display_name}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredTerms.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No terms found</p>
            </CardContent>
          </Card>
        )}

        {filteredTerms.map(term => {
          const meetings = getTermMeetings(term);
          const termTotals = getTermTotals(meetings);
          const isExpanded = expandedTerms[term.id];

          return (
            <Card key={term.id} className="overflow-hidden">
              <CardHeader
                className="cursor-pointer hover:bg-gray-50 transition-colors py-4"
                onClick={() => toggleTerm(term.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                    <div>
                      <CardTitle className="text-base">{term.title || term.name || 'Term'}</CardTitle>
                      <p className="text-xs text-gray-500 mt-0.5">{term.start_date} – {term.end_date} · {meetings.length} meetings</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">Calc. Expenses</p>
                      <p className="font-semibold text-red-600">{fmt(termTotals.calcExpenses)}</p>
                    </div>
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">Calc. Income</p>
                      <p className="font-semibold text-green-600">{fmt(termTotals.calcIncome)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Net</p>
                      <p className={`font-bold ${(termTotals.actualIncome - termTotals.actualExpenses) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {fmt(termTotals.actualIncome - termTotals.actualExpenses)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Term summary bar */}
                <div className="grid grid-cols-4 gap-2 mt-3 pt-3 border-t border-gray-100">
                  <div className="text-center p-2 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-500">Calc Income</p>
                    <p className="font-semibold text-green-700 text-sm">{fmt(termTotals.calcIncome)}</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded-lg">
                    <p className="text-xs text-gray-500">Calc Expenses</p>
                    <p className="font-semibold text-red-700 text-sm">{fmt(termTotals.calcExpenses)}</p>
                  </div>
                  <div className="text-center p-2 bg-blue-50 rounded-lg">
                    <p className="text-xs text-gray-500">Ledger Income</p>
                    <p className="font-semibold text-blue-700 text-sm">{fmt(termTotals.actualIncome)}</p>
                  </div>
                  <div className="text-center p-2 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">Ledger Expenses</p>
                    <p className="font-semibold text-gray-700 text-sm">{fmt(termTotals.actualExpenses)}</p>
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0 pb-2">
                  {meetings.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-4">No meetings in this term</p>
                  ) : (
                    <div className="space-y-1">
                      {meetings.map(meeting => {
                        const sectionName = sections.find(s => s.id === meeting.section_id)?.display_name || '';
                        const fin = getMeetingFinances(meeting);
                        const isMeetingExpanded = expandedMeetings[meeting.id];
                        const hasFinances = fin.calcExpenses > 0 || fin.calcIncome > 0 || fin.actualIncome > 0 || fin.actualExpenses > 0;

                        return (
                          <div key={meeting.id} className="border border-gray-100 rounded-lg overflow-hidden">
                            <div
                              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() => hasFinances && toggleMeeting(meeting.id)}
                            >
                              <div className="flex items-center gap-3">
                                {hasFinances ? (
                                  isMeetingExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
                                ) : (
                                  <div className="w-4 h-4" />
                                )}
                                <div>
                                  <p className="text-sm font-medium">{new Date(meeting.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} — {meeting.title || 'Untitled'}</p>
                                  {sectionName && <p className="text-xs text-gray-400">{sectionName}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                {fin.calcExpenses > 0 && (
                                  <span className="text-red-600 font-medium flex items-center gap-1">
                                    <TrendingDown className="w-3 h-3" />{fmt(fin.calcExpenses)}
                                  </span>
                                )}
                                {fin.calcIncome > 0 && (
                                  <span className="text-green-600 font-medium flex items-center gap-1">
                                    <TrendingUp className="w-3 h-3" />{fmt(fin.calcIncome)}
                                  </span>
                                )}
                                {!hasFinances && <span className="text-gray-300 text-xs">No finances</span>}
                              </div>
                            </div>

                            {isMeetingExpanded && hasFinances && (
                              <div className="px-4 pb-3 bg-gray-50/50 border-t border-gray-100">
                                {/* Allocations (Expenses) */}
                                {fin.meetingAllocations.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-xs font-semibold text-gray-500 mb-1">Receipt Allocations (Expenses)</p>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left py-1 text-gray-400">Category</th>
                                          <th className="text-left py-1 text-gray-400">Method</th>
                                          <th className="text-left py-1 text-gray-400">Notes</th>
                                          <th className="text-right py-1 text-gray-400">Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {fin.meetingAllocations.map(a => (
                                          <tr key={a.id} className="border-b border-gray-50">
                                            <td className="py-1 capitalize">{a.category?.replace(/_/g, ' ')}</td>
                                            <td className="py-1">
                                              <Badge variant="outline" className={`text-xs ${a.payment_method === 'scout_bank_card' ? 'border-blue-200 text-blue-600' : 'border-purple-200 text-purple-600'}`}>
                                                {a.payment_method === 'scout_bank_card' ? 'Bank Card' : 'Personal'}
                                              </Badge>
                                            </td>
                                            <td className="py-1 text-gray-500 max-w-32 truncate">{a.notes || '—'}</td>
                                            <td className="py-1 text-right text-red-600 font-medium">{fmt(a.amount)}</td>
                                          </tr>
                                        ))}
                                        <tr className="font-semibold">
                                          <td colSpan={3} className="py-1">Total expenses</td>
                                          <td className="py-1 text-right text-red-600">{fmt(fin.calcExpenses)}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )}

                                {/* Ledger entries */}
                                {fin.meetingLedger.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-xs font-semibold text-gray-500 mb-1">Ledger Entries</p>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b">
                                          <th className="text-left py-1 text-gray-400">Date</th>
                                          <th className="text-left py-1 text-gray-400">Description</th>
                                          <th className="text-left py-1 text-gray-400">Type</th>
                                          <th className="text-right py-1 text-gray-400">Amount</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {fin.meetingLedger.map(e => (
                                          <tr key={e.id} className="border-b border-gray-50">
                                            <td className="py-1 text-gray-500">{e.date}</td>
                                            <td className="py-1">{e.description}</td>
                                            <td className="py-1">
                                              <Badge className={`text-xs ${e.type === 'income' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {e.type}
                                              </Badge>
                                            </td>
                                            <td className={`py-1 text-right font-medium ${e.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                              {fmt(e.amount)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </TreasurerLayout>
  );
}