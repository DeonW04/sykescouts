import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const INTERVAL_LABELS = { 'monthly': 'Monthly', '4_months': 'Every 4 months', '6_months': 'Every 6 months', 'yearly': 'Yearly' };

function getSubsStatus(member) {
  const today = new Date().toISOString().split('T')[0];
  const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  if (member.stripe_subscription_id) {
    if (!member.next_subs_due || member.next_subs_due > in7) return 'active';
    if (member.next_subs_due >= today) return 'due_soon';
    return 'overdue';
  }
  if (member.legacy_subs_expiry) return 'legacy';
  if (member.next_subs_due) {
    if (member.next_subs_due < today) return 'overdue';
    if (member.next_subs_due <= in7) return 'due_soon';
    return 'active';
  }
  return 'not_set_up';
}

const STATUS_CONFIG = {
  active:       { label: 'Active',                 color: 'bg-green-100 text-green-700',  order: 2 },
  due_soon:     { label: 'Due Soon',               color: 'bg-amber-100 text-amber-700',  order: 1 },
  overdue:      { label: 'Overdue',                color: 'bg-red-100 text-red-700',      order: 0 },
  legacy:       { label: 'Legacy',                 color: 'bg-blue-100 text-blue-700',    order: 3 },
  not_set_up:   { label: 'Not Set Up',             color: 'bg-gray-100 text-gray-600',    order: 4 },
};

export default function SubscriptionsTab({ selectedSectionId }) {
  const [sortBy, setSortBy] = useState('status');
  const [filterStatus, setFilterStatus] = useState('all');

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['members-subs', selectedSectionId],
    queryFn: () => selectedSectionId ? base44.entities.Member.filter({ section_id: selectedSectionId, active: true }) : [],
    enabled: !!selectedSectionId,
  });

  const membersWithStatus = useMemo(() => members.map(m => ({ ...m, _status: getSubsStatus(m) })), [members]);

  const counts = useMemo(() => {
    const c = { total: membersWithStatus.length, active: 0, due_soon: 0, overdue: 0, legacy: 0, not_set_up: 0 };
    membersWithStatus.forEach(m => { if (c[m._status] !== undefined) c[m._status]++; });
    return c;
  }, [membersWithStatus]);

  const displayed = useMemo(() => {
    let list = filterStatus === 'all' ? membersWithStatus : membersWithStatus.filter(m => m._status === filterStatus);
    return [...list].sort((a, b) => {
      if (sortBy === 'status') return (STATUS_CONFIG[a._status]?.order ?? 9) - (STATUS_CONFIG[b._status]?.order ?? 9);
      if (sortBy === 'next_due') {
        if (!a.next_subs_due && !b.next_subs_due) return 0;
        if (!a.next_subs_due) return 1;
        if (!b.next_subs_due) return -1;
        return a.next_subs_due.localeCompare(b.next_subs_due);
      }
      return 0;
    });
  }, [membersWithStatus, sortBy, filterStatus]);

  if (!selectedSectionId) return <p className="text-center text-gray-400 py-12">Please select a section.</p>;
  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#7413dc] rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full font-medium">{counts.total} total</span>
        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">{counts.active} active</span>
        <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">{counts.due_soon} due soon</span>
        <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">{counts.overdue} overdue</span>
        <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">{counts.legacy} legacy</span>
        <span className="text-xs bg-gray-100 text-gray-500 px-3 py-1 rounded-full font-medium">{counts.not_set_up} not set up</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Filter:</span>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v)}>
            <SelectTrigger className="w-40 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="due_soon">Due Soon</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="legacy">Legacy</SelectItem>
              <SelectItem value="not_set_up">Not Set Up</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Sort:</span>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="status">By Status</SelectItem>
              <SelectItem value="next_due">By Next Due</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-gray-400">{displayed.length} members</span>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {displayed.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No members found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Member</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Last Payment</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Next Due</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Interval</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Payment Method</th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.map(member => {
                    const conf = STATUS_CONFIG[member._status];
                    const defaultCard = member.stripe_payment_methods?.find(pm => pm.is_default) || member.stripe_payment_methods?.[0];
                    const cardLabel = defaultCard ? `${defaultCard.brand} ···· ${defaultCard.last4}` : 'No card';
                    const statusLabel = member._status === 'legacy'
                      ? `Legacy — expires ${member.legacy_subs_expiry}`
                      : conf.label;
                    const nextDueDisplay = member.next_subs_due || (member.legacy_subs_expiry ? `Expires ${member.legacy_subs_expiry}` : '—');
                    return (
                      <tr key={member.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium">{member.full_name}</td>
                        <td className="py-3 px-4">
                          <Badge className={`text-xs font-medium ${conf.color}`}>{statusLabel}</Badge>
                        </td>
                        <td className="py-3 px-4 text-gray-500">{member.last_subs_payment_date || '—'}</td>
                        <td className="py-3 px-4 text-gray-700">{nextDueDisplay}</td>
                        <td className="py-3 px-4 text-gray-500">{INTERVAL_LABELS[member.subs_interval] || '—'}</td>
                        <td className="py-3 px-4 text-gray-500">{cardLabel}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}