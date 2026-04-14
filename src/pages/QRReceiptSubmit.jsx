import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Upload, Receipt, Camera } from 'lucide-react';

const CATEGORIES = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'food', label: 'Food' },
  { value: 'transport', label: 'Transport' },
  { value: 'hall_hire', label: 'Hall Hire' },
  { value: 'badges', label: 'Badges' },
  { value: 'other', label: 'Other' },
];

export default function QRReceiptSubmit() {
  const urlParams = new URLSearchParams(window.location.search);
  const linkedMeetingId = urlParams.get('meeting_id') || '';
  const linkedEventId = urlParams.get('event_id') || '';
  const contextLabel = urlParams.get('label') || '';

  const [file, setFile] = useState(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('leader_paid_personally');
  const [submitterName, setSubmitterName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!file) { setError('Please attach a photo of your receipt.'); return; }
    if (!amount || isNaN(parseFloat(amount))) { setError('Please enter a valid amount.'); return; }
    if (!category) { setError('Please select a category.'); return; }
    if (!submitterName.trim()) { setError('Please enter your name.'); return; }

    setSubmitting(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await base44.entities.ReceiptAllocation.create({
        receipt_url: file_url,
        amount: parseFloat(amount),
        category,
        payment_method: paymentMethod,
        linked_meeting_id: linkedMeetingId || null,
        linked_event_id: linkedEventId || null,
        status: 'unallocated',
        notes: notes ? `Submitted by ${submitterName}. ${notes}` : `Submitted by ${submitterName}`,
        allocation_date: new Date().toISOString().split('T')[0],
      });
      setSubmitted(true);
    } catch (err) {
      setError('Submission failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="max-w-sm w-full shadow-xl text-center">
          <CardContent className="pt-10 pb-8 px-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Receipt Submitted!</h1>
            <p className="text-gray-600 text-sm leading-relaxed">
              Thank you, <strong>{submitterName}</strong>. Your receipt of <strong>£{parseFloat(amount).toFixed(2)}</strong> has been received and will be reviewed by the Treasurer.
            </p>
            {contextLabel && (
              <p className="mt-3 text-xs text-gray-400">Linked to: {contextLabel}</p>
            )}
            <Button className="mt-6 w-full bg-green-600 hover:bg-green-700" onClick={() => {
              setSubmitted(false);
              setFile(null);
              setAmount('');
              setCategory('');
              setNotes('');
              setSubmitterName('');
              setPreview(null);
            }}>
              Submit Another Receipt
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-gray-200 flex items-start justify-center p-4 pt-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#004851] rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Receipt className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Submit a Receipt</h1>
          {contextLabel && (
            <p className="text-sm text-gray-500 mt-1">For: <strong>{contextLabel}</strong></p>
          )}
          <p className="text-xs text-gray-400 mt-1">40th Rochdale (Syke) Scouts</p>
        </div>

        <Card className="shadow-xl">
          <CardContent className="pt-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Photo */}
              <div>
                <Label className="text-sm font-medium">Receipt Photo <span className="text-red-500">*</span></Label>
                <label className={`mt-1.5 flex flex-col items-center justify-center w-full border-2 border-dashed rounded-xl cursor-pointer transition-colors ${preview ? 'border-green-300 bg-green-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'}`} style={{ minHeight: 120 }}>
                  {preview ? (
                    <img src={preview} alt="Receipt preview" className="max-h-48 rounded-lg object-contain p-2" />
                  ) : (
                    <div className="flex flex-col items-center py-6">
                      <Camera className="w-8 h-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">Tap to take a photo or upload</p>
                      <p className="text-xs text-gray-400 mt-1">JPG, PNG supported</p>
                    </div>
                  )}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
                </label>
                {file && <p className="text-xs text-green-600 mt-1">✓ {file.name}</p>}
              </div>

              {/* Your Name */}
              <div>
                <Label className="text-sm font-medium">Your Name <span className="text-red-500">*</span></Label>
                <Input
                  value={submitterName}
                  onChange={e => setSubmitterName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  className="mt-1.5"
                />
              </div>

              {/* Amount */}
              <div>
                <Label className="text-sm font-medium">Amount (£) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="mt-1.5"
                />
              </div>

              {/* Category */}
              <div>
                <Label className="text-sm font-medium">Category <span className="text-red-500">*</span></Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="What was this for?" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Method */}
              <div>
                <Label className="text-sm font-medium">How was it paid?</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="leader_paid_personally">I paid personally (need reimbursement)</SelectItem>
                    <SelectItem value="scout_bank_card">Paid with Scout bank card</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div>
                <Label className="text-sm font-medium">Notes (optional)</Label>
                <Textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any additional details..."
                  className="mt-1.5 min-h-[80px]"
                />
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#004851] hover:bg-[#003840] text-white min-h-[48px] text-base font-semibold mt-2"
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    Submit Receipt
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-gray-400 mt-4 pb-6">
          Receipts are reviewed by the Group Treasurer. No account required.
        </p>
      </div>
    </div>
  );
}