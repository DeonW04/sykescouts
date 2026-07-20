import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import TreasurerLayout from '@/components/treasurer/TreasurerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, TrendingUp, TrendingDown, Search, Edit, Trash2, CheckCircle, AlertTriangle, Clock, Download, ChevronUp, ChevronDown, Paperclip, FileText, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { addMonths, format, parseISO, addDays } from 'date-fns';
import SearchableSelect from '@/components/treasurer/SearchableSelect';

const CATEGORIES = ['subs', 'event_payments', 'donations', 'fundraising', 'equipment', 'food', 'transport', 'hall_hire', 'badges', 'reimbursement', 'other'];
const fmt = n => `£${(n || 0).toFixed(2)}`;
const SUBS_DURATIONS = [
  { label: '3 months', months: 3 },
  { label: '6 months', months: 6 },
  { label: '12 months (1 year)', months: 12 },
];
const catLabel = c => {
  if (c === 'subs') return 'Subscriptions';
  if (c === 'event_payments') return 'Event payment';
  return c?.replace(/_/g, ' ') || '';
};
const displayEnteredBy = eb => {
  if (!eb) return '—';
  if (eb.toLowerCase().includes('stripe')) return 'Stripe';
  return eb;
};

const emptyForm = {
  date: new Date().toISOString().split('T')[0],
  type: 'income', amount: '', category: 'other', description: '', reference: '',
  linked_member_id: '', linked_event_id: '', linked_meeting_id: '', linked_fund_id: '',
  linked_term_id: '', receipt_reference: '', section_id: '', budget_allocated: false,
  split_section_id: '', split_amount: '', invoice_url: '',
};

export default function TreasurerLedger() {
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterSection, setFilterSection] = useState('all');
  const [filterMember, setFilterMember] = useState('');
  const [sortField, setSortField] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [saving, setSaving] = useState(false);
  const [subsDuration, setSubsDuration] = useState(3);
  const [selectedEventOrMeeting, setSelectedEventOrMeeting] = useState('');
  const [showSplit, setShowSplit] = useState(false);
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: ledger = [] } = useQuery({ queryKey: ['ledger'], queryFn: () => base44.entities.LedgerEntry.list('-date', 1000) });
  const { data: user } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: members = [] } = useQuery({ queryKey: ['members-active'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: () => base44.entities.Event.list('-start_date', 100) });
  const { data: terms = [] } = useQuery({ queryKey: ['terms'], queryFn: () => base44.entities.Term.list() });
  const { data: programmes = [] } = useQuery({ queryKey: ['programmes-all'], queryFn: () => base44.entities.Programme.list('-date', 300) });
  const { data: eventAttendances = [] } = useQuery({ queryKey: ['event-attendances-all'], queryFn: () => base44.entities.EventAttendance.filter({}) });
  const { data: unallocatedReceipts = [] } = useQuery({ queryKey: ['unallocated-receipts'], queryFn: () => base44.entities.ReceiptAllocation.filter({ status: 'unallocated' }) });
  const { data: allocatedReceipts = [] } = useQuery({ queryKey: ['allocated-receipts'], queryFn: () => base44.entities.ReceiptAllocation.filter({ status: 'allocated' }) });
  const { data: actionsRequired = [] } = useQuery({ queryKey: ['actions-required-all'], queryFn: () => base44.entities.ActionRequired.filter({}) });
  const { data: actionResponses = [] } = useQuery({ queryKey: ['action-responses-all'], queryFn: () => base44.entities.ActionResponse.filter({}) });

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const currentTerm = terms.find(t => t.start_date <= todayStr && t.end_date >= todayStr);
  const upcomingTerm = !currentTerm ? terms.filter(t => new Date(t.start_date) > today).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0] : null;
  const activeTerm = currentTerm || upcomingTerm;

  const memberSectionMap = useMemo(() => {
    const map = {};
    members.forEach(m => { map[m.id] = m.section_id; });
    return map;
  }, [members]);

  // Map ledger entry ID -> the receipt URL of the ReceiptAllocation that created it
  const receiptByLedgerId = useMemo(() => {
    const map = {};
    allocatedReceipts.forEach(r => {
      if (r.ledger_entry_id && r.receipt_url) map[r.ledger_entry_id] = r.receipt_url;
    });
    return map;
  }, [allocatedReceipts]);

  const handleInvoiceUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingInvoice(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setField('invoice_url', file_url);
      toast.success('Invoice attached');
    } catch (err) {
      toast.error('Failed to upload invoice');
    } finally {
      setUploadingInvoice(false);
    }
  };

  const filtered = useMemo(() => {
    let result = ledger.filter(e => {
      const matchSearch = !search || e.description?.toLowerCase().includes(search.toLowerCase()) || e.reference?.toLowerCase().includes(search.toLowerCase());
      const matchType = filterType === 'all' || e.type === filterType;
      const matchCat = filterCategory === 'all' || e.category === filterCategory;
      const matchFrom = !filterDateFrom || e.date >= filterDateFrom;
      const matchTo = !filterDateTo || e.date <= filterDateTo;
      const matchSection = filterSection === 'all' || (e.linked_member_id && memberSectionMap[e.linked_member_id] === filterSection);
      const matchMember = !filterMember || e.linked_member_id === filterMember;
      return matchSearch && matchType && matchCat && matchFrom && matchTo && matchSection && matchMember;
    });

    result.sort((a, b) => {
      let av = sortField === 'date' ? a.date : sortField === 'amount' ? (a.amount || 0) : (a.category || '');
      let bv = sortField === 'date' ? b.date : sortField === 'amount' ? (b.amount || 0) : (b.category || '');
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [ledger, search, filterType, filterCategory, filterDateFrom, filterDateTo, filterSection, filterMember, sortField, sortDir, memberSectionMap]);

  const filteredIncome = filtered.filter(e => e.type === 'income').reduce((s, e) => s + (e.amount || 0), 0);
  const filteredTotal = filtered.reduce((s, e) => s + (e.type === 'income' ? (e.amount || 0) : -(e.amount || 0)), 0);

  const eligibleEventMeetings = useMemo(() => {
    if (!form.linked_member_id || form.category !== 'event_payments') return [];
    const memberId = form.linked_member_id;
    const oneMonthAgo = addDays(today, -30);
    const results = [];
    events.forEach(ev => {
      const evEnd = ev.end_date ? new Date(ev.end_date) : new Date(ev.start_date);
      if (evEnd < oneMonthAgo) return;
      const evActions = actionsRequired.filter(a => a.event_id === ev.id && a.action_purpose === 'attendance');
      const isAttending = evActions.some(a => {
        const resp = actionResponses.find(r => r.action_required_id === a.id && r.member_id === memberId);
        return resp && (resp.response_value === 'Yes, attending' || resp.response_value === 'yes');
      });
      if (!isAttending) {
        const ea = eventAttendances.find(a => a.event_id === ev.id && a.member_id === memberId);
        if (!ea) return;
      }
      if (ev.cost > 0) {
        results.push({ type: 'event', id: ev.id, label: `${ev.title} (${format(new Date(ev.start_date), 'dd/MM/yyyy')})`, cost: ev.cost });
      }
    });
    if (activeTerm) {
      programmes.forEach(p => {
        if (!p.cost || p.cost <= 0) return;
        const pDate = new Date(p.date);
        if (pDate < new Date(activeTerm.start_date) || pDate > new Date(activeTerm.end_date)) return;
        results.push({ type: 'meeting', id: p.id, label: `${p.title} — ${format(pDate, 'dd/MM/yyyy')} (${fmt(p.cost)})`, cost: p.cost });
      });
    }
    return results;
  }, [form.linked_member_id, form.category, events, programmes, eventAttendances, actionsRequired, actionResponses, activeTerm, today]);

  const selectedItem = selectedEventOrMeeting ? eligibleEventMeetings.find(i => `${i.type}:${i.id}` === selectedEventOrMeeting) : null;
  const amountMismatch = selectedItem && form.amount && parseFloat(form.amount) !== selectedItem.cost;
  const amountMatch = selectedItem && form.amount && parseFloat(form.amount) === selectedItem.cost;
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openNew = () => { setForm(emptyForm); setEditEntry(null); setSubsDuration(3); setSelectedEventOrMeeting(''); setShowSplit(false); setShowDialog(true); };
  const openEdit = (entry) => {
    setForm({ ...entry, amount: String(entry.amount), split_amount: entry.split_amount ? String(entry.split_amount) : '' });
    setEditEntry(entry);
    setSubsDuration(3);
    setSelectedEventOrMeeting(entry.linked_event_id ? `event:${entry.linked_event_id}` : entry.linked_meeting_id ? `meeting:${entry.linked_meeting_id}` : '');
    setShowSplit(!!(entry.split_section_id));
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!form.description || !form.amount || !form.date) { toast.error('Please fill in date, amount and description'); return; }
    setSaving(true);
    try {
      const payload = { ...form, amount: parseFloat(form.amount), entered_by: user?.email, split_amount: showSplit && form.split_amount ? parseFloat(form.split_amount) : null, split_section_id: showSplit && form.split_section_id ? form.split_section_id : '' };
      if (showSplit && form.budget_allocated && form.split_section_id) {
        const primaryAmt = parseFloat(form.amount) - (parseFloat(form.split_amount) || 0);
        if (primaryAmt < 0) { toast.error('Split amount cannot exceed total'); setSaving(false); return; }
      }
      if (selectedEventOrMeeting && selectedEventOrMeeting !== '_none') {
        const [type, id] = selectedEventOrMeeting.split(':');
        payload.linked_event_id = type === 'event' ? id : '';
        payload.linked_meeting_id = type === 'meeting' ? id : '';
      }
      if (editEntry) {
        await base44.entities.LedgerEntry.update(editEntry.id, payload);
        toast.success('Entry updated');
      } else {
        await base44.entities.LedgerEntry.create(payload);
        if (form.category === 'subs' && form.linked_member_id) {
          const member = members.find(m => m.id === form.linked_member_id);
          if (member) {
            const baseDate = member.next_subs_due ? parseISO(member.next_subs_due) : new Date();
            const newDue = addMonths(baseDate < today ? today : baseDate, subsDuration);
            await base44.entities.Member.update(form.linked_member_id, { next_subs_due: format(newDue, 'yyyy-MM-dd'), last_subs_payment_date: form.date, last_subs_months_paid: subsDuration });
          }
        }
        if (form.category === 'event_payments' && selectedItem) {
          const member = members.find(m => m.id === form.linked_member_id);
          base44.functions.invoke('notifyLeaders', { type: 'payment_received', event_id: selectedItem.type === 'event' ? selectedItem.id : null, meeting_id: selectedItem.type === 'meeting' ? selectedItem.id : null, member_id: form.linked_member_id, member_name: member?.full_name, amount: parseFloat(form.amount), expected_amount: selectedItem.cost }).catch(() => {});
        }
        toast.success('Entry added to ledger');
      }
      queryClient.invalidateQueries({ queryKey: ['ledger'] });
      queryClient.invalidateQueries({ queryKey: ['members-active'] });
      setShowDialog(false);
    } catch (e) { toast.error('Failed to save: ' + e.message); } finally { setSaving(false); }
  };

  const handleDelete = async id => {
    if (!confirm('Delete this ledger entry?')) return;
    await base44.entities.LedgerEntry.delete(id);
    queryClient.invalidateQueries({ queryKey: ['ledger'] });
    toast.success('Entry deleted');
  };

  const toggleSort = field => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 inline ml-1" /> : <ChevronDown className="w-3 h-3 inline ml-1" />;
  };

  const exportCSV = () => {
    const rows = [
      ['Date', 'Description', 'Category', 'Type', 'Amount', 'Member', 'Event / Meeting', 'Reference', 'Entered By'],
      ...filtered.map(e => {
        const memberName = members.find(m => m.id === e.linked_member_id)?.full_name || '';
        const eventMeeting = e.linked_event_id ? (events.find(ev => ev.id === e.linked_event_id)?.title || '') : e.linked_meeting_id ? (programmes.find(p => p.id === e.linked_meeting_id)?.title || '') : '';
        return [e.date, e.description || '', catLabel(e.category), e.type, `£${(e.amount || 0).toFixed(2)}`, memberName, eventMeeting, e.reference || '', displayEnteredBy(e.entered_by)];
      })
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `ledger-${todayStr}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <TreasurerLayout title="Master Ledger">
      {/* Unallocated receipts banner */}
      {unallocatedReceipts.length > 0 && (
        <Card className="border-red-300 bg-red-50 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800 text-sm">{unallocatedReceipts.length} Receipt{unallocatedReceipts.length > 1 ? 's' : ''} Awaiting Reimbursement</p>
                  <p className="text-xs text-red-600 mt-0.5">Total: {fmt(unallocatedReceipts.reduce((s, r) => s + (r.amount || 0), 0))}</p>
                </div>
              </div>
              <Link to={createPageUrl('TreasurerReceiptAllocation')}><Button size="sm" variant="outline" className="border-red-400 text-red-700 hover:bg-red-100">Receipt Allocation →</Button></Link>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Ledger Entries</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportCSV} className="gap-2"><Download className="w-4 h-4" />Export CSV</Button>
              <Button onClick={openNew} className="bg-[#1a472a] hover:bg-[#13381f]"><Plus className="w-4 h-4 mr-2" />Add Entry</Button>
            </div>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-3 gap-y-3 mt-4">
            <div className="col-span-2 sm:col-span-3 lg:col-span-2">
              <Label className="text-xs text-gray-500 mb-1 block">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input className="pl-9" placeholder="Search description or reference..." value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Date from</Label>
              <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Date to</Label>
              <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="text-sm" />
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Category</Label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{catLabel(c)}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Section</Label>
              <Select value={filterSection} onValueChange={setFilterSection}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sections</SelectItem>
                  {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-gray-500 mb-1 block">Member</Label>
              <SearchableSelect
                value={filterMember}
                onChange={v => setFilterMember(v === '_all' ? '' : v)}
                options={[{ value: '_all', label: 'All members' }, ...members.map(m => ({ value: m.id, label: m.full_name }))]}
                placeholder="All members"
                emptyText="No members found"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No entries found</p>
          ) : (
            <div className="w-full">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[8%]" />
                  <col className="w-[19%]" />
                  <col className="w-[10%]" />
                  <col className="w-[9%]" />
                  <col className="w-[13%]" />
                  <col className="w-[14%]" />
                  <col className="w-[7%]" />
                  <col className="w-[6%]" />
                  <col className="w-[10%]" />
                  <col className="w-[4%]" />
                </colgroup>
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-2 px-2 font-semibold text-gray-600 cursor-pointer" onClick={() => toggleSort('date')}>Date<SortIcon field="date" /></th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Description</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600 cursor-pointer" onClick={() => toggleSort('category')}>Category<SortIcon field="category" /></th>
                    <th className="text-right py-2 px-2 font-semibold text-gray-600 cursor-pointer" onClick={() => toggleSort('amount')}>Amount<SortIcon field="amount" /></th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Member</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Event / Meeting</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Reference</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Entered by</th>
                    <th className="text-left py-2 px-2 font-semibold text-gray-600">Invoice</th>
                    <th className="py-2 px-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(entry => {
                    const memberName = members.find(m => m.id === entry.linked_member_id)?.full_name || '';
                    const evName = entry.linked_event_id ? (events.find(ev => ev.id === entry.linked_event_id)?.title || '') : entry.linked_meeting_id ? (programmes.find(p => p.id === entry.linked_meeting_id)?.title || '') : '';
                    const receiptUrl = receiptByLedgerId[entry.id];
                    return (
                      <tr key={entry.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-2 text-gray-600 truncate" title={entry.date}>{entry.date}</td>
                        <td className="py-2 px-2 truncate" title={entry.description}>{entry.description}</td>
                        <td className="py-2 px-2"><Badge variant="outline" className="text-xs whitespace-nowrap">{catLabel(entry.category)}</Badge></td>
                        <td className={`py-2 px-2 text-right font-semibold whitespace-nowrap ${entry.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                          {entry.type === 'income' ? '+' : '-'}{fmt(entry.amount)}
                        </td>
                        <td className="py-2 px-2 text-gray-700 truncate" title={memberName}>{memberName}</td>
                        <td className="py-2 px-2 text-gray-500 truncate" title={evName}>{evName}</td>
                        <td className="py-2 px-2 text-gray-400 text-xs font-mono truncate" title={entry.reference}>{entry.reference}</td>
                        <td className="py-2 px-2 text-gray-500 text-xs truncate" title={displayEnteredBy(entry.entered_by)}>{displayEnteredBy(entry.entered_by)}</td>
                        <td className="py-2 px-2">
                          {receiptUrl ? (
                            <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" className="h-7 px-2 text-xs bg-slate-800 hover:bg-slate-900 text-white gap-1"><FileText className="w-3 h-3" />View Receipt</Button>
                            </a>
                          ) : entry.invoice_url ? (
                            <a href={entry.invoice_url} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" className="h-7 px-2 text-xs bg-slate-800 hover:bg-slate-900 text-white gap-1"><FileText className="w-3 h-3" />View Invoice</Button>
                            </a>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-gray-500 gap-1" onClick={() => openEdit(entry)}><Paperclip className="w-3 h-3" />Attach</Button>
                          )}
                        </td>
                        <td className="py-2 px-1">
                          <div className="flex gap-0.5">
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(entry)}><Edit className="w-3 h-3" /></Button>
                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500" onClick={() => handleDelete(entry.id)}><Trash2 className="w-3 h-3" /></Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm">
            <span className="text-gray-500">Showing {filtered.length} records</span>
            <span className={`font-semibold ${filteredTotal >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              Net total: {filteredTotal >= 0 ? '+' : ''}{fmt(filteredTotal)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog - full existing form preserved */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editEntry ? 'Edit Ledger Entry' : 'New Ledger Entry'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Date</Label><Input type="date" value={form.date} onChange={e => setField('date', e.target.value)} /></div>
              <div><Label>Type</Label>
                <Select value={form.type} onValueChange={v => setField('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="income">Income</SelectItem><SelectItem value="expense">Expense</SelectItem></SelectContent>
                </Select>
              </div>
              <div><Label>Category</Label>
                <Select value={form.category} onValueChange={v => { setField('category', v); setSelectedEventOrMeeting(''); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{catLabel(c)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>Amount (£)</Label><Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="0.00" /></div>
            </div>

            {form.category === 'subs' && (
              <div className="space-y-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-800">Subscription Payment</p>
                <div><Label>Member</Label>
                  <SearchableSelect
                    value={form.linked_member_id}
                    onChange={v => setField('linked_member_id', v)}
                    options={members.map(m => ({ value: m.id, label: m.full_name }))}
                    placeholder="Select member..."
                    emptyText="No members found"
                  />
                </div>
                <div><Label>Duration</Label>
                  <Select value={String(subsDuration)} onValueChange={v => setSubsDuration(parseInt(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{SUBS_DURATIONS.map(d => <SelectItem key={d.months} value={String(d.months)}>{d.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {form.linked_member_id && <p className="text-xs text-blue-600">This will update the member's next subs due date by {subsDuration} months.</p>}
              </div>
            )}

            {form.category === 'event_payments' && (
              <div className="space-y-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm font-semibold text-green-800">Event / Meeting Payment</p>
                <div><Label>Member</Label>
                  <SearchableSelect
                    value={form.linked_member_id}
                    onChange={v => { setField('linked_member_id', v); setSelectedEventOrMeeting(''); }}
                    options={members.map(m => ({ value: m.id, label: m.full_name }))}
                    placeholder="Select member..."
                    emptyText="No members found"
                  />
                </div>
                {form.linked_member_id && (
                  <div><Label>Event / Meeting</Label>
                    {eligibleEventMeetings.length === 0 ? (
                      <p className="text-xs text-gray-500 mt-1">No eligible events/meetings found</p>
                    ) : (
                      <SearchableSelect
                        value={selectedEventOrMeeting}
                        onChange={v => { setSelectedEventOrMeeting(v); const item = eligibleEventMeetings.find(i => `${i.type}:${i.id}` === v); if (item && !form.amount) setField('amount', String(item.cost)); }}
                        options={eligibleEventMeetings.map(i => ({ value: `${i.type}:${i.id}`, label: i.label }))}
                        placeholder="Select event or meeting..."
                        emptyText="No events/meetings found"
                      />
                    )}
                  </div>
                )}
                {selectedItem && (
                  <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${amountMatch ? 'bg-green-100 text-green-800' : amountMismatch ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>
                    {amountMatch && <CheckCircle className="w-4 h-4 flex-shrink-0" />}
                    {amountMismatch && <AlertTriangle className="w-4 h-4 flex-shrink-0" />}
                    <span>Expected: <strong>{fmt(selectedItem.cost)}</strong>{amountMatch ? ' — Correct ✓' : amountMismatch ? ` — Entered ${fmt(parseFloat(form.amount || 0))}` : ''}</span>
                  </div>
                )}
              </div>
            )}

            {form.type === 'expense' && form.category !== 'event_payments' && form.category !== 'subs' && (
              <div className="space-y-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <Label className="text-xs font-semibold text-gray-700">Link to Meeting / Event (optional)</Label>
                <SearchableSelect
                  value={selectedEventOrMeeting || '_none'}
                  onChange={v => {
                    setSelectedEventOrMeeting(v === '_none' ? '' : v);
                    if (v && v !== '_none') {
                      const [type, id] = v.split(':');
                      if (type === 'meeting') { const mtg = programmes.find(p => p.id === id); if (mtg) { const matchingTerm = terms.find(t => mtg.date >= t.start_date && mtg.date <= t.end_date); if (matchingTerm) setField('linked_term_id', matchingTerm.id); } }
                      else if (type === 'event') { const ev = events.find(e => e.id === id); if (ev && ev.term_id) setField('linked_term_id', ev.term_id); }
                    }
                  }}
                  options={[
                    { value: '_none', label: 'None (general expense)' },
                    ...programmes.filter(p => { const term = activeTerm; if (!term) return false; return p.date >= term.start_date && p.date <= term.end_date; }).map(p => ({ value: `meeting:${p.id}`, label: `Meeting: ${p.title} (${p.date})` })),
                    ...events.slice(0, 30).map(ev => ({ value: `event:${ev.id}`, label: `Event: ${ev.title}` })),
                  ]}
                  placeholder="None (general expense)"
                  emptyText="No events/meetings found"
                  className="text-sm"
                />
              </div>
            )}

            {form.type === 'expense' && form.category !== 'event_payments' && form.category !== 'subs' && (
              <div className="space-y-3 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <input type="checkbox" id="budget_allocated" checked={!!form.budget_allocated} onChange={e => setField('budget_allocated', e.target.checked)} className="w-4 h-4 rounded" />
                  <label htmlFor="budget_allocated" className="text-sm font-semibold text-indigo-800 cursor-pointer">Allocate expense to section budget</label>
                </div>
                {form.budget_allocated && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Term</Label>
                        <Select value={form.linked_term_id} onValueChange={v => setField('linked_term_id', v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select term..." /></SelectTrigger>
                          <SelectContent>{terms.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">Section</Label>
                        <Select value={form.section_id} onValueChange={v => setField('section_id', v)}>
                          <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select section..." /></SelectTrigger>
                          <SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    {!showSplit ? (
                      <Button type="button" size="sm" variant="outline" className="border-indigo-300 text-indigo-700" onClick={() => setShowSplit(true)}>Split Budget between 2 sections</Button>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-indigo-700">Split Expense</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div><Label className="text-xs">Section 1 (above)</Label><p className="text-sm font-medium text-indigo-700 mt-1">{form.amount && form.split_amount ? fmt(parseFloat(form.amount) - parseFloat(form.split_amount || 0)) : form.amount ? fmt(parseFloat(form.amount)) : '—'}</p></div>
                          <div><Label className="text-xs">Section 2 Amount (£)</Label><Input type="number" step="0.01" min="0" max={form.amount} value={form.split_amount} onChange={e => setField('split_amount', e.target.value)} placeholder="0.00" className="h-8 text-sm" /></div>
                        </div>
                        <div><Label className="text-xs">Section 2</Label>
                          <Select value={form.split_section_id} onValueChange={v => setField('split_section_id', v)}>
                            <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select section 2..." /></SelectTrigger>
                            <SelectContent>{sections.filter(s => s.id !== form.section_id).map(s => <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>)}</SelectContent>
                          </Select>
                        </div>
                        <Button type="button" size="sm" variant="ghost" className="text-xs text-gray-500" onClick={() => { setShowSplit(false); setField('split_section_id', ''); setField('split_amount', ''); }}>Remove split</Button>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <div><Label>Description</Label><Input value={form.description} onChange={e => setField('description', e.target.value)} placeholder="Enter description..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Reference (optional)</Label><Input value={form.reference} onChange={e => setField('reference', e.target.value)} placeholder="REF001" /></div>
              <div><Label>Receipt Reference (optional)</Label><Input value={form.receipt_reference} onChange={e => setField('receipt_reference', e.target.value)} placeholder="REC-001" /></div>
            </div>

            <div>
              <Label>Invoice (optional)</Label>
              {form.invoice_url ? (
                <div className="flex items-center gap-2 mt-1">
                  <a href={form.invoice_url} target="_blank" rel="noopener noreferrer" className="flex-1">
                    <Button type="button" size="sm" className="w-full h-9 text-xs bg-slate-800 hover:bg-slate-900 text-white gap-1"><FileText className="w-3.5 h-3.5" />View Invoice</Button>
                  </a>
                  <Button type="button" size="sm" variant="ghost" className="text-xs text-red-500" onClick={() => setField('invoice_url', '')}>Remove</Button>
                </div>
              ) : (
                <div className="mt-1">
                  <input type="file" id="invoice-upload" className="hidden" accept="image/*,application/pdf" onChange={handleInvoiceUpload} disabled={uploadingInvoice} />
                  <label htmlFor="invoice-upload">
                    <Button type="button" size="sm" variant="outline" className="w-full text-gray-600 gap-1 cursor-pointer" disabled={uploadingInvoice} asChild>
                      <span>{uploadingInvoice ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Uploading…</> : <><Paperclip className="w-3.5 h-3.5" />Attach Invoice</>}</span>
                    </Button>
                  </label>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-[#1a472a] hover:bg-[#13381f]">{saving ? 'Saving...' : 'Save Entry'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TreasurerLayout>
  );
}