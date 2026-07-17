import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ChevronRight } from 'lucide-react';

const fmt = (n) => `${n < 0 ? '-' : ''}£${Math.abs(n || 0).toFixed(2)}`;

/**
 * Shows every meeting/event for a section within the active term, each with its
 * net income (income − expenses). Green if ≥ 0, red if negative. Clicking a row
 * navigates to that item in Programme Finances or Event Finances.
 */
export default function BudgetBreakdownDialog({
  open,
  onOpenChange,
  section,
  activeTerm,
  programmes,
  events,
  ledger,
  allocations,
  memberPayments,
}) {
  const navigate = useNavigate();

  if (!section || !activeTerm) return null;

  const sectionId = section.id;
  const inTerm = (dateStr) => dateStr && dateStr >= activeTerm.start_date && dateStr <= activeTerm.end_date;

  // --- Per-meeting net ---
  const termProgs = programmes.filter(p => p.section_id === sectionId && inTerm(p.date));
  const meetingRows = termProgs.map(p => {
    const income = ledger
      .filter(e => e.type === 'income' && e.linked_meeting_id === p.id)
      .reduce((s, e) => s + (e.amount || 0), 0)
      + memberPayments
        .filter(mp => mp.related_event_id === p.id)
        .reduce((s, mp) => s + (mp.amount || 0), 0);
    const receiptSpend = allocations
      .filter(a => a.linked_meeting_id === p.id)
      .reduce((s, a) => s + (a.amount || 0), 0);
    const ledgerSpend = ledger
      .filter(e => e.type === 'expense' && e.linked_meeting_id === p.id)
      .reduce((s, e) => s + (e.amount || 0), 0);
    return {
      id: p.id,
      type: 'meeting',
      title: p.title || 'Meeting',
      date: p.date,
      net: income - receiptSpend - ledgerSpend,
    };
  });

  // --- Per-event net (events assigned to this section, or with no section) ---
  const termEvents = events.filter(ev => {
    const d = ev.start_date;
    if (!inTerm(d)) return false;
    return ev.section_id === sectionId || (Array.isArray(ev.section_ids) && ev.section_ids.includes(sectionId));
  });
  const eventRows = termEvents.map(ev => {
    const income = ledger
      .filter(e => e.type === 'income' && e.linked_event_id === ev.id)
      .reduce((s, e) => s + (e.amount || 0), 0);
    const receiptSpend = allocations
      .filter(a => a.linked_event_id === ev.id)
      .reduce((s, a) => s + (a.amount || 0), 0);
    const ledgerSpend = ledger
      .filter(e => e.type === 'expense' && e.linked_event_id === ev.id)
      .reduce((s, e) => s + (e.amount || 0), 0);
    return {
      id: ev.id,
      type: 'event',
      title: ev.title || 'Event',
      date: ev.start_date,
      net: income - receiptSpend - ledgerSpend,
    };
  });

  const rows = [...meetingRows, ...eventRows].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  const total = rows.reduce((s, r) => s + r.net, 0);

  const goTo = (row) => {
    if (row.type === 'meeting') {
      navigate(`/treasurer/payments/programme?meeting=${row.id}`);
    } else {
      navigate(`/treasurer/payments/events?event=${row.id}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {section.display_name} — Breakdown
            <span className="block text-xs font-normal text-gray-500 mt-1">
              {activeTerm.title || activeTerm.name} ({activeTerm.start_date} – {activeTerm.end_date})
            </span>
          </DialogTitle>
        </DialogHeader>

        {rows.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No meetings or events with finances this term.</p>
        ) : (
          <div className="divide-y max-h-[60vh] overflow-y-auto">
            {rows.map(row => (
              <button
                key={`${row.type}-${row.id}`}
                onClick={() => goTo(row)}
                className="w-full flex items-center gap-3 py-3 text-left hover:bg-gray-50 transition-colors px-1 rounded"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{row.title}</p>
                  <p className="text-xs text-gray-400">
                    {row.type === 'event' ? 'Event' : 'Meeting'} · {row.date}
                  </p>
                </div>
                <span className={`text-sm font-semibold ${row.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {row.net >= 0 ? '+' : ''}{fmt(row.net)}
                </span>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-3 mt-1">
          <span className="text-sm font-semibold text-gray-700">Total net</span>
          <span className={`text-base font-bold ${total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {total >= 0 ? '+' : ''}{fmt(total)}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}