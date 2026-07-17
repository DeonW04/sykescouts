import React, { useState, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Upload, Search, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import ReceiptFormFields from '@/components/receipts/ReceiptFormFields';
import { emptyReceiptForm, validateReceiptForm, submitReceipt } from '@/components/receipts/receiptHelpers';

const fmt = n => `£${(Number(n) || 0).toFixed(2)}`;

export default function ReceiptUploader() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [form, setForm] = useState(emptyReceiptForm);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [imagePreview, setImagePreview] = useState(null);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: user } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });

  const { data: leader } = useQuery({
    queryKey: ['currentLeader', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const leaders = await base44.entities.Leader.filter({ user_id: user.id });
      return leaders[0] || null;
    },
    enabled: !!user?.id,
  });

  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: programmes = [] } = useQuery({ queryKey: ['programmes-recent'], queryFn: () => base44.entities.Programme.list('-date', 200) });
  const { data: events = [] } = useQuery({ queryKey: ['events-recent'], queryFn: () => base44.entities.Event.list('-start_date', 50) });

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ['leader-my-allocations', user?.email],
    queryFn: async () => {
      const all = await base44.entities.ReceiptAllocation.filter({ submitted_by: user?.email });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!user?.email,
  });

  const sectionName = (id) => sections.find(s => s.id === id)?.display_name || '';
  const meetingOptions = useMemo(() => programmes.map(p => ({
    value: p.id,
    label: `${sectionName(p.section_id)} · ${p.date ? format(new Date(p.date), 'dd/MM/yy') : ''} · ${p.title}`,
  })), [programmes, sections]);
  const eventOptions = useMemo(() => events.map(e => ({ value: e.id, label: e.title })), [events]);
  const sectionOptions = useMemo(() => sections.map(s => ({ value: s.id, label: s.display_name })), [sections]);

  const handleFileSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };
  const clearFile = () => { setSelectedFile(null); setPreviewUrl(null); };

  const resetForm = () => { setForm(emptyReceiptForm); clearFile(); };

  const handleUpload = async () => {
    const err = validateReceiptForm(form, !!selectedFile);
    if (err) { toast.error(err); return; }
    setUploading(true);
    try {
      await submitReceipt(form, selectedFile, { user, leader });
      queryClient.invalidateQueries({ queryKey: ['leader-my-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-allocations'] });
      toast.success('Receipt submitted to the treasurer');
      setShowUploadDialog(false);
      resetForm();
    } catch (e) {
      toast.error('Failed to upload: ' + (e.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const filteredReceipts = receipts.filter(r => {
    const term = searchTerm.toLowerCase();
    return (r.notes || '').toLowerCase().includes(term) || (r.category || '').toLowerCase().includes(term);
  });

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #f8f7ff 0%, #f0eeff 50%, #f0fdf4 100%)', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      <FloatingNav />
      <NavBarSpacer />

      {/* Hero header */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 16px' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Leader Portal</p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(20px, 4vw, 32px)', color: '#1a1a2e', margin: 0 }}>Receipt Uploader</h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(26,26,46,0.5)', margin: '2px 0 0' }}>Submit your expenses for the treasurer</p>
        </div>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '16px' }}>
        <Button onClick={() => { resetForm(); setShowUploadDialog(true); }} className="w-full mb-5 h-12 text-base bg-[#7413dc] hover:bg-[#5c0fb0] rounded-xl">
          <Upload className="w-5 h-5 mr-2" />
          Upload Receipt
        </Button>

        {/* Search */}
        <div className="mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input placeholder="Search by notes or category..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 bg-white/90 rounded-xl" />
        </div>

        {/* Receipts list */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">Loading...</div>
        ) : (
          <div className="space-y-3">
            {filteredReceipts.map(receipt => (
              <Card key={receipt.id} className="rounded-2xl border-[rgba(116,19,220,0.1)] bg-white/90">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex items-center gap-3">
                    {receipt.receipt_url ? (
                      <button onClick={() => setImagePreview(receipt.receipt_url)} className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        <img src={receipt.receipt_url} alt="Receipt" className="w-full h-full object-cover" />
                      </button>
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Eye className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-gray-900 truncate">{receipt.notes || (receipt.category ? receipt.category.replace(/_/g, ' ') : 'Receipt')}</p>
                      <p className="text-xs text-gray-400 mt-0.5 capitalize">
                        {receipt.expense_scope === 'group' ? 'Whole group' : receipt.expense_scope === 'split' ? 'Split (2 sections)' : 'Single'}
                        {receipt.category ? ` · ${receipt.category.replace(/_/g, ' ')}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="font-bold text-sm">{fmt(receipt.amount)}</span>
                      <Badge variant={receipt.status === 'allocated' ? 'default' : 'secondary'} className="text-xs">
                        {receipt.status === 'allocated' ? 'Allocated' : 'Pending'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredReceipts.length === 0 && (
              <div className="text-center py-10 text-gray-400">No receipts submitted yet.</div>
            )}
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Upload Receipt</DialogTitle></DialogHeader>
          <div className="py-2">
            <ReceiptFormFields
              form={form}
              setField={setField}
              meetingOptions={meetingOptions}
              eventOptions={eventOptions}
              sectionOptions={sectionOptions}
              previewUrl={previewUrl}
              onFileSelected={handleFileSelected}
              onClearFile={clearFile}
              fileInputRef={fileInputRef}
            />
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={handleUpload} disabled={uploading} className="w-full sm:w-auto bg-[#7413dc] hover:bg-[#5c0fb0]">
              {uploading ? 'Uploading...' : 'Submit Receipt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      {imagePreview && (
        <Dialog open={!!imagePreview} onOpenChange={() => setImagePreview(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-3xl max-h-[90vh] overflow-auto">
            <DialogHeader><DialogTitle>Receipt Image</DialogTitle></DialogHeader>
            <div className="py-4">
              <img src={imagePreview} alt="Receipt" className="w-full h-auto max-h-[70vh] object-contain rounded-lg" />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}