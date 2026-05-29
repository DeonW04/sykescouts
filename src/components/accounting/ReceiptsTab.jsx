import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const fmt = n => `£${(n || 0).toFixed(2)}`;
const PAGE_SIZE = 20;

function getReceiptStatus(r) {
  if (r.payment_status === 'paid') return 'reimbursed';
  if (r.approval_status === 'approved') return 'awaiting_reimbursement';
  if (r.approval_status === 'rejected') return 'rejected';
  return 'awaiting_approval';
}

const STATUS_CONFIG = {
  awaiting_approval:      { label: 'Awaiting Approval',      color: 'bg-amber-100 text-amber-700' },
  awaiting_reimbursement: { label: 'Awaiting Reimbursement', color: 'bg-blue-100 text-blue-700' },
  reimbursed:             { label: 'Reimbursed',             color: 'bg-green-100 text-green-700' },
  rejected:               { label: 'Rejected',               color: 'bg-red-100 text-red-700' },
};

export default function ReceiptsTab({ selectedSectionId, section }) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [page, setPage] = useState(1);

  const { data: allLeaders = [] } = useQuery({
    queryKey: ['leaders-all'],
    queryFn: () => base44.entities.Leader.filter({}),
  });
  const { data: reimbursements = [], isLoading } = useQuery({
    queryKey: ['reimbursements-all'],
    queryFn: () => base44.entities.Reimbursement.list('-created_date', 500),
  });

  // Build set of section leader user_ids
  const sectionUserIds = useMemo(() => new Set(section?.leader_ids || []), [section]);

  // Build set of Leader entity IDs belonging to this section
  const sectionLeaderEntityIds = useMemo(() => {
    const ids = new Set();
    allLeaders.forEach(l => {
      if (sectionUserIds.has(l.user_id) || sectionUserIds.has(l.id)) ids.add(l.id);
    });
    return ids;
  }, [allLeaders, sectionUserIds]);

  // Leader id → display name map
  const leaderNameMap = useMemo(() => {
    const map = {};
    allLeaders.forEach(l => { map[l.id] = l.display_name || l.full_name || 'Unknown'; });
    return map;
  }, [allLeaders]);

  const sectionReimbursements = useMemo(() =>
    reimbursements.filter(r => sectionLeaderEntityIds.has(r.leader_id)),
    [reimbursements, sectionLeaderEntityIds]
  );

  const withStatus = useMemo(() =>
    sectionReimbursements.map(r => ({ ...r, _status: getReceiptStatus(r) })),
    [sectionReimbursements]
  );

  const counts = useMemo(() => {
    const c = { awaiting_approval: 0, awaiting_reimbursement: 0, reimbursed: 0, rejected: 0 };
    withStatus.forEach(r => { if (c[r._status] !== undefined) c[r._status]++; });
    return c;
  }, [withStatus]);

  const filtered = useMemo(() => {
    const list = filterStatus === 'all' ? withStatus : withStatus.filter(r => r._status === filterStatus);
    return [...list].sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''));
  }, [withStatus, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleFilterChange = (v) => { setFilterStatus(v); setPage(1); };

  if (!selectedSectionId) return <p className="text-center text-gray-400 py-12">Please select a section.</p>;
  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-4 border-slate-200 border-t-[#7413dc] rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-4">
      {/* Status counts */}
      <div className="flex flex-wrap gap-2">
        <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">
          {counts.awaiting_approval} awaiting approval
        </span>
        <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
          {counts.awaiting_reimbursement} awaiting reimbursement
        </span>
        <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">
          {counts.reimbursed} reimbursed
        </span>
        {counts.rejected > 0 && (
          <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">
            {counts.rejected} rejected
          </span>
        )}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-gray-500">Filter by status:</span>
        <Select value={filterStatus} onValueChange={handleFilterChange}>
          <SelectTrigger className="w-52 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
            <SelectItem value="awaiting_reimbursement">Awaiting Reimbursement</SelectItem>
            <SelectItem value="reimbursed">Reimbursed</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <span className="text-xs text-gray-400">{filtered.length} receipt{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {paginated.length === 0 ? (
            <p className="text-center text-gray-400 py-12 text-sm">No receipts found</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Date</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Description</th>
                    <th className="text-right py-3 px-4 text-gray-500 font-medium">Amount</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Submitted By</th>
                    <th className="text-left py-3 px-4 text-gray-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(r => {
                    const conf = STATUS_CONFIG[r._status];
                    return (
                      <tr key={r.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-4 text-gray-500">
                          {r.created_date ? new Date(r.created_date).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <p className="truncate">{r.description || r.category?.replace(/_/g, ' ') || '—'}</p>
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">{fmt(r.amount)}</td>
                        <td className="py-3 px-4 text-gray-500">{leaderNameMap[r.leader_id] || 'Unknown'}</td>
                        <td className="py-3 px-4">
                          <Badge className={`text-xs font-medium ${conf.color}`}>{conf.label}</Badge>
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs text-gray-500 px-2">{page} / {totalPages}</span>
            <Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}