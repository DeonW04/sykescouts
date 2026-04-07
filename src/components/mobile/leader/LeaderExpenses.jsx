import React, { useState, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Receipt, Upload, Camera, X, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function LeaderExpenses({ user }) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({ description: '', amount: '', date: new Date().toISOString().split('T')[0], category: '' });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { data: myReceipts = [] } = useQuery({
    queryKey: ['leader-my-receipts', user?.email],
    queryFn: async () => {
      const all = await base44.entities.Receipt.filter({});
      return all.filter(r => r.submitted_by === user?.email || r.submitted_by === user?.id)
        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
        .slice(0, 20);
    },
    enabled: !!user?.email,
  });

  const handleFileSelected = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!selectedFile) { toast.error('Please attach a receipt photo'); return; }
    if (!form.description || !form.amount) { toast.error('Please fill in description and amount'); return; }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: selectedFile });
      await base44.entities.Receipt.create({
        description: form.description,
        amount: parseFloat(form.amount),
        date: form.date,
        category: form.category,
        receipt_url: file_url,
        submitted_by: user?.email,
        submitted_by_name: user?.display_name || user?.full_name,
        status: 'pending',
      });
      toast.success('Receipt submitted!');
      setForm({ description: '', amount: '', date: new Date().toISOString().split('T')[0], category: '' });
      setSelectedFile(null);
      setPreviewUrl(null);
      queryClient.invalidateQueries({ queryKey: ['leader-my-receipts'] });
    } catch (err) {
      toast.error('Failed to submit: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    paid: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-emerald-600 to-[#004851] px-5 pb-6 text-white"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 48px)' }}>
        <h1 className="text-2xl font-bold">Expense Receipts</h1>
        <p className="text-white/70 text-sm mt-1">Submit receipts for reimbursement</p>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Submit form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
          <p className="font-bold text-gray-900 text-sm">New Receipt</p>

          {/* Photo */}
          <input ref={fileInputRef} type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={handleFileSelected} />
          {previewUrl ? (
            <div className="relative">
              <img src={previewUrl} alt="Receipt" className="w-full rounded-xl object-cover max-h-48" />
              <button onClick={() => { setPreviewUrl(null); setSelectedFile(null); }} className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <button onClick={() => fileInputRef.current?.click()} className="w-full border-2 border-dashed border-gray-200 rounded-2xl py-6 flex flex-col items-center gap-2 text-gray-400 active:bg-gray-50">
              <Camera className="w-8 h-8" />
              <p className="text-sm font-medium">Take photo or choose file</p>
            </button>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Description *</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Craft supplies for meeting" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Amount (£) *</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500" />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1">Category</label>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500 bg-white appearance-none">
              <option value="">Select category...</option>
              <option value="Craft supplies">Craft supplies</option>
              <option value="Food & drink">Food & drink</option>
              <option value="Equipment">Equipment</option>
              <option value="Transport">Transport</option>
              <option value="Printing">Printing</option>
              <option value="Other">Other</option>
            </select>
          </div>

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
                  <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-gray-900 truncate">{receipt.description}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{receipt.date ? format(new Date(receipt.date), 'd MMM yyyy') : '—'}{receipt.category ? ` · ${receipt.category}` : ''}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <p className="font-bold text-emerald-600 text-sm">£{Number(receipt.amount || 0).toFixed(2)}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[receipt.status] || 'bg-gray-100 text-gray-500'}`}>
                      {receipt.status || 'pending'}
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