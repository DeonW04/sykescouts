import React, { useState, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Receipt, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import ReceiptFormFields from '@/components/receipts/ReceiptFormFields';
import { emptyReceiptForm, validateReceiptForm, submitReceipt } from '@/components/receipts/receiptHelpers';

const fmt = n => `£${(Number(n) || 0).toFixed(2)}`;

export default function LeaderExpenses({ user }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(emptyReceiptForm);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const { data: leader } = useQuery({
    queryKey: ['leader-for-expenses', user?.id],
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

  const { data: myReceipts = [] } = useQuery({
    queryKey: ['leader-my-allocations', user?.email],
    queryFn: async () => {
      const all = await base44.entities.ReceiptAllocation.filter({ submitted_by: user?.email });
      return all.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).slice(0, 20);
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

  const handleSubmit = async () => {
    const err = validateReceiptForm(form, !!selectedFile);
    if (err) { toast.error(err); return; }

    setUploading(true);
    try {
      await submitReceipt(form, selectedFile, { user, leader });
      toast.success('Receipt submitted to the treasurer!');
      setForm(emptyReceiptForm);
      clearFile();
      queryClient.invalidateQueries({ queryKey: ['leader-my-allocations'] });
      queryClient.invalidateQueries({ queryKey: ['receipt-allocations'] });
    } catch (err) {
      toast.error('Failed to submit: ' + (err.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const statusLabel = (r) => r.status === 'allocated' ? 'Allocated' : 'Pending';
  const statusColor = (r) => r.status === 'allocated' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700';

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-emerald-600 to-[#004851] px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Expense Receipts</h1>
        <p className="text-white/70 text-sm mt-1">Submit receipts for the treasurer</p>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Submit form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <p className="font-bold text-gray-900 text-sm">New Receipt</p>

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

          <button onClick={handleSubmit} disabled={uploading} className="w-full py-3.5 bg-emerald-600 text-white rounded-2xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 active:scale-95 transition-transform">
            {uploading ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting…</>
            ) : (
              <><Upload className="w-4 h-4" /> Submit Receipt</>
            )}
          </button>
        </div>

        {/* My submitted receipts */}
        {myReceipts.length > 0 && (
          <div>
            <p className="font-bold text-gray-900 text-sm mb-3">My Submissions</p>
            <div className="space-y-2">
              {myReceipts.map(receipt => (
                <div key={receipt.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-3">
                  {receipt.receipt_url ? (
                    <a href={receipt.receipt_url} target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                      <img src={receipt.receipt_url} alt="Receipt" className="w-full h-full object-cover" />
                    </a>
                  ) : (
                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Receipt className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{receipt.notes || (receipt.category ? receipt.category.replace(/_/g, ' ') : 'Receipt')}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">
                      {receipt.expense_scope === 'group' ? 'Whole group' : receipt.expense_scope === 'split' ? 'Split' : 'Single'}
                      {receipt.category ? ` · ${receipt.category.replace(/_/g, ' ')}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <p className="font-bold text-emerald-600 text-sm">{fmt(receipt.amount)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusColor(receipt)}`}>
                      {statusLabel(receipt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}