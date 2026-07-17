import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import SearchableSelect from '@/components/treasurer/SearchableSelect';
import { Camera, X } from 'lucide-react';

export const RECEIPT_CATEGORIES = [
  { value: 'equipment', label: 'Equipment' },
  { value: 'food', label: 'Food' },
  { value: 'transport', label: 'Transport' },
  { value: 'hall_hire', label: 'Hall Hire' },
  { value: 'badges', label: 'Badges' },
  { value: 'other', label: 'Other' },
];

/**
 * Shared receipt fields for both the desktop and mobile leader uploaders.
 * `form` shape:
 *   { amount, category, payment_method, notes, expense_scope,
 *     linked_meeting_id, linked_event_id, section_id,
 *     split_section_id, split_amount, split_meeting_id }
 * setField(key, value) updates a single field.
 * meetingOptions / eventOptions / sectionOptions: [{ value, label }]
 */
export default function ReceiptFormFields({
  form,
  setField,
  meetingOptions = [],
  eventOptions = [],
  sectionOptions = [],
  previewUrl,
  onFileSelected,
  onClearFile,
  fileInputRef,
}) {
  const scope = form.expense_scope || 'single';

  return (
    <div className="space-y-4">
      {/* Photo */}
      <div>
        <Label className="text-sm font-medium">Receipt Image <span className="text-red-500">*</span></Label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={onFileSelected}
        />
        {previewUrl ? (
          <div className="relative mt-1.5">
            <img src={previewUrl} alt="Receipt" className="w-full rounded-xl object-contain max-h-48 border border-gray-200" />
            <button
              type="button"
              onClick={onClearFile}
              className="absolute top-2 right-2 w-7 h-7 bg-red-500 rounded-full flex items-center justify-center"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full mt-1.5 border-2 border-dashed border-gray-200 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:bg-gray-50 active:bg-gray-50"
          >
            <Camera className="w-8 h-8" />
            <p className="text-sm font-medium">Take photo or choose file</p>
          </button>
        )}
      </div>

      {/* Amount + Category */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-sm font-medium">Amount (£) <span className="text-red-500">*</span></Label>
          <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setField('amount', e.target.value)} placeholder="0.00" className="mt-1.5" />
        </div>
        <div>
          <Label className="text-sm font-medium">Category <span className="text-red-500">*</span></Label>
          <Select value={form.category} onValueChange={v => setField('category', v)}>
            <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select..." /></SelectTrigger>
            <SelectContent>
              {RECEIPT_CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payment Method */}
      <div>
        <Label className="text-sm font-medium">Payment Method <span className="text-red-500">*</span></Label>
        <Select value={form.payment_method} onValueChange={v => setField('payment_method', v)}>
          <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="leader_paid_personally">I paid personally (need reimbursement)</SelectItem>
            <SelectItem value="scout_bank_card">Paid with Scout bank card</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expense scope */}
      <div>
        <Label className="text-sm font-medium">Who is this expense for?</Label>
        <div className="grid grid-cols-3 gap-2 mt-1.5">
          {[
            { value: 'single', label: 'One section' },
            { value: 'group', label: 'Whole group' },
            { value: 'split', label: 'Split (2 sections)' },
          ].map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setField('expense_scope', opt.value)}
              className={`py-2 px-1 rounded-xl text-xs font-semibold border transition-colors ${
                scope === opt.value
                  ? 'bg-[#004851] text-white border-[#004851]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* SINGLE: one section (optionally linked to a meeting/event) */}
      {scope === 'single' && (
        <>
          <div>
            <Label className="text-sm font-medium">Section</Label>
            <Select value={form.section_id || '_none'} onValueChange={v => setField('section_id', v === '_none' ? '' : v)}>
              <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select section..." /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Not section-specific</SelectItem>
                {sectionOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Link to Meeting (optional)</Label>
            <SearchableSelect
              value={form.linked_meeting_id || '_none'}
              onChange={v => { setField('linked_meeting_id', v === '_none' ? '' : v); if (v !== '_none') setField('linked_event_id', ''); }}
              options={[{ value: '_none', label: 'None' }, ...meetingOptions]}
              placeholder="None"
              emptyText="No meetings found"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label className="text-sm font-medium">OR Link to Event (optional)</Label>
            <SearchableSelect
              value={form.linked_event_id || '_none'}
              onChange={v => { setField('linked_event_id', v === '_none' ? '' : v); if (v !== '_none') setField('linked_meeting_id', ''); }}
              options={[{ value: '_none', label: 'None' }, ...eventOptions]}
              placeholder="None"
              emptyText="No events found"
              className="mt-1.5"
            />
          </div>
        </>
      )}

      {/* SPLIT: between two sections, optionally per meeting */}
      {scope === 'split' && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-3">
          <p className="text-xs text-indigo-800">
            Split this receipt between two sections. Enter how much goes to the second section — the rest stays with the first.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Section 1</Label>
              <Select value={form.section_id || ''} onValueChange={v => setField('section_id', v)}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{sectionOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-semibold">Section 2</Label>
              <Select value={form.split_section_id || ''} onValueChange={v => setField('split_section_id', v)}>
                <SelectTrigger className="mt-1 h-9 text-sm"><SelectValue placeholder="Select..." /></SelectTrigger>
                <SelectContent>{sectionOptions.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs font-semibold">Amount to Section 2 (£)</Label>
            <Input type="number" step="0.01" min="0" value={form.split_amount} onChange={e => setField('split_amount', e.target.value)} placeholder="0.00" className="mt-1 h-9 text-sm" />
            {form.amount && form.split_amount && (
              <p className="text-xs text-gray-500 mt-1">
                Section 1 keeps £{Math.max(0, (parseFloat(form.amount) || 0) - (parseFloat(form.split_amount) || 0)).toFixed(2)}
              </p>
            )}
          </div>
          <div>
            <Label className="text-xs font-semibold">Link to Meeting (optional)</Label>
            <SearchableSelect
              value={form.linked_meeting_id || '_none'}
              onChange={v => setField('linked_meeting_id', v === '_none' ? '' : v)}
              options={[{ value: '_none', label: 'None (term budget)' }, ...meetingOptions]}
              placeholder="None (term budget)"
              emptyText="No meetings found"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">Leave blank if this is a general term-budget expense (not for a meeting).</p>
          </div>
        </div>
      )}

      {/* GROUP: nothing extra needed */}
      {scope === 'group' && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800">
          This will be recorded as a whole-group expense, not tied to a single section.
        </div>
      )}

      {/* Notes */}
      <div>
        <Label className="text-sm font-medium">Notes</Label>
        <Textarea value={form.notes} onChange={e => setField('notes', e.target.value)} placeholder="What was this expense for?" className="mt-1.5 min-h-20" />
      </div>
    </div>
  );
}