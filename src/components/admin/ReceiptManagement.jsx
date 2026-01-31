import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function ReceiptManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLeader, setSelectedLeader] = useState('all');
  const [statusDialog, setStatusDialog] = useState(null);
  const [editReceipt, setEditReceipt] = useState(null);

  const queryClient = useQueryClient();

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['allReceipts'],
    queryFn: () => base44.entities.Receipt.filter({}),
  });

  const { data: leaders = [] } = useQuery({
    queryKey: ['leaders'],
    queryFn: () => base44.entities.Leader.filter({}),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Receipt.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries(['allReceipts']);
      toast.success('Status updated');
      setStatusDialog(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Receipt.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['allReceipts']);
      toast.success('Receipt updated');
      setEditReceipt(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Receipt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['allReceipts']);
      toast.success('Receipt deleted');
    },
  });

  const filteredReceipts = receipts.filter((r) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      r.receipt_id?.toLowerCase().includes(term) || r.notes?.toLowerCase().includes(term);
    const matchesLeader = selectedLeader === 'all' || r.leader_id === selectedLeader;
    return matchesSearch && matchesLeader;
  });

  const sortedReceipts = [...filteredReceipts].sort(
    (a, b) => new Date(b.created_date) - new Date(a.created_date)
  );

  const handleStatusToggle = () => {
    const newStatus = statusDialog.status === 'pending' ? 'reimbursed' : 'pending';
    updateStatusMutation.mutate({ id: statusDialog.id, status: newStatus });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Receipt Management</h2>

      {/* Filters */}
      <div className="flex gap-3 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search by ID or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedLeader} onValueChange={setSelectedLeader}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by leader" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Leaders</SelectItem>
            {leaders.map((leader) => (
              <SelectItem key={leader.id} value={leader.id}>
                {leader.display_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Receipts List */}
      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="space-y-3">
          {sortedReceipts.map((receipt) => (
            <Card key={receipt.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                    <Badge variant="outline" className="font-mono">
                      {receipt.receipt_id}
                    </Badge>
                    <span className="font-semibold">£{receipt.value.toFixed(2)}</span>
                    <span className="text-sm text-gray-600">{receipt.leader_name}</span>
                    <Badge
                      variant={receipt.status === 'reimbursed' ? 'default' : 'secondary'}
                      className="cursor-pointer"
                      onClick={() => setStatusDialog(receipt)}
                    >
                      {receipt.status === 'reimbursed' ? 'Reimbursed' : 'Pending'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditReceipt({ ...receipt })}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Delete this receipt?')) {
                          deleteMutation.mutate(receipt.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                </div>
                {receipt.notes && (
                  <p className="text-sm text-gray-600 mt-2">{receipt.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
          {sortedReceipts.length === 0 && (
            <div className="text-center py-8 text-gray-500">No receipts found</div>
          )}
        </div>
      )}

      {/* Status Toggle Dialog */}
      {statusDialog && (
        <Dialog open={!!statusDialog} onOpenChange={() => setStatusDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change Status</DialogTitle>
            </DialogHeader>
            <p>
              Mark receipt <span className="font-mono font-bold">{statusDialog.receipt_id}</span> as{' '}
              <strong>{statusDialog.status === 'pending' ? 'reimbursed' : 'pending'}</strong>?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStatusDialog(null)}>
                Cancel
              </Button>
              <Button onClick={handleStatusToggle}>Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {editReceipt && (
        <Dialog open={!!editReceipt} onOpenChange={() => setEditReceipt(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Receipt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Receipt ID</Label>
                <Input
                  value={editReceipt.receipt_id}
                  onChange={(e) =>
                    setEditReceipt({ ...editReceipt, receipt_id: e.target.value.slice(0, 4) })
                  }
                  maxLength={4}
                />
              </div>
              <div>
                <Label>Value (£)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={editReceipt.value}
                  onChange={(e) => setEditReceipt({ ...editReceipt, value: e.target.value })}
                />
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  value={editReceipt.notes || ''}
                  onChange={(e) => setEditReceipt({ ...editReceipt, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditReceipt(null)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  updateMutation.mutate({
                    id: editReceipt.id,
                    data: {
                      receipt_id: editReceipt.receipt_id,
                      value: parseFloat(editReceipt.value),
                      notes: editReceipt.notes,
                    },
                  })
                }
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}