import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Receipt, Trash2, ExternalLink, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';
import { format } from 'date-fns';

export default function ReceiptManagement() {
  const queryClient = useQueryClient();
  const [sectionFilter, setSectionFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const { data: receipts = [] } = useQuery({
    queryKey: ['receipts'],
    queryFn: () => base44.entities.Receipt.list('-created_date'),
  });

  const { data: programmes = [] } = useQuery({
    queryKey: ['programmes'],
    queryFn: () => base44.entities.Programme.list(),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.list(),
  });

  const deleteReceiptMutation = useMutation({
    mutationFn: (id) => base44.entities.Receipt.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Receipt deleted');
      setSelectedReceipt(null);
    },
  });

  const getProgrammeTitle = (programmeId) => {
    if (!programmes || !programmeId) return 'Unknown';
    const programme = programmes.find(p => p.id === programmeId);
    return programme ? programme.title : 'Unknown';
  };

  const getSectionName = (sectionId) => {
    if (!sections || !sectionId) return '';
    const section = sections.find(s => s.id === sectionId);
    return section ? section.display_name : '';
  };

  const filteredReceipts = (receipts || []).filter(receipt => {
    if (sectionFilter !== 'all' && receipt.section_id !== sectionFilter) return false;
    if (typeFilter === 'generic' && !receipt.is_generic_expense) return false;
    if (typeFilter === 'meeting' && receipt.is_generic_expense) return false;
    return true;
  });

  const totalAmount = filteredReceipts.reduce((sum, r) => sum + (r.amount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      
      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Receipt className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Receipt Management</h1>
                <p className="mt-1 text-white/80">View and manage all uploaded receipts</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-white/80">Total</p>
              <p className="text-3xl font-bold">£{totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <Filter className="w-4 h-4 text-gray-500" />
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {(sections || []).map(section => (
                    <SelectItem key={section.id} value={section.id}>
                      {section.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="meeting">Meeting Expenses</SelectItem>
                  <SelectItem value="generic">Generic Expenses</SelectItem>
                </SelectContent>
              </Select>

              <div className="ml-auto text-sm text-gray-600">
                {filteredReceipts.length} receipt(s)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Receipts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReceipts.map(receipt => (
            <Card key={receipt.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setSelectedReceipt(receipt)}>
              <div className="aspect-video bg-gray-100 relative">
                <img
                  src={receipt.file_url}
                  alt="Receipt"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-2 right-2">
                  {receipt.is_generic_expense ? (
                    <Badge className="bg-purple-600">Generic</Badge>
                  ) : (
                    <Badge className="bg-blue-600">Meeting</Badge>
                  )}
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-2xl font-bold text-green-600">£{receipt.amount.toFixed(2)}</p>
                    <p className="text-xs text-gray-500">
                      {format(new Date(receipt.created_date), 'dd MMM yyyy')}
                    </p>
                  </div>
                </div>
                {!receipt.is_generic_expense && receipt.programme_id && (
                  <p className="text-sm text-gray-700 font-medium mb-2">
                    {getProgrammeTitle(receipt.programme_id)}
                  </p>
                )}
                {receipt.section_id && (
                  <Badge variant="outline" className="mb-2">
                    {getSectionName(receipt.section_id)}
                  </Badge>
                )}
                {receipt.notes && (
                  <p className="text-xs text-gray-600 line-clamp-2">{receipt.notes}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredReceipts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Receipt className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg">No receipts found</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Receipt Detail Dialog */}
      <Dialog open={!!selectedReceipt} onOpenChange={() => setSelectedReceipt(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Receipt Details</DialogTitle>
          </DialogHeader>
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={selectedReceipt.file_url}
                  alt="Receipt"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Amount</p>
                  <p className="text-2xl font-bold text-green-600">£{selectedReceipt.amount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-medium">{format(new Date(selectedReceipt.created_date), 'dd MMMM yyyy')}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <Badge className={selectedReceipt.is_generic_expense ? 'bg-purple-600' : 'bg-blue-600'}>
                    {selectedReceipt.is_generic_expense ? 'Generic Expense' : 'Meeting Expense'}
                  </Badge>
                </div>
                {!selectedReceipt.is_generic_expense && selectedReceipt.programme_id && (
                  <div>
                    <p className="text-sm text-gray-600">Meeting</p>
                    <p className="font-medium">{getProgrammeTitle(selectedReceipt.programme_id)}</p>
                  </div>
                )}
              </div>
              {selectedReceipt.notes && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Notes</p>
                  <p className="text-gray-800">{selectedReceipt.notes}</p>
                </div>
              )}
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(selectedReceipt.file_url, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Full Size
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => deleteReceiptMutation.mutate(selectedReceipt.id)}
                  disabled={deleteReceiptMutation.isPending}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}