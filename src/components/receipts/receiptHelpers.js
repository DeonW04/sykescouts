import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

export const emptyReceiptForm = {
  amount: '',
  category: '',
  payment_method: 'leader_paid_personally',
  notes: '',
  expense_scope: 'single',
  linked_meeting_id: '',
  linked_event_id: '',
  section_id: '',
  split_section_id: '',
  split_amount: '',
  split_meeting_id: '',
};

// Validate the shared receipt form. Returns an error string, or null if valid.
export function validateReceiptForm(form, hasFile) {
  if (!hasFile) return 'Please attach a receipt image';
  if (!form.amount || isNaN(parseFloat(form.amount))) return 'Please enter a valid amount';
  if (!form.category) return 'Please select a category';
  if (form.expense_scope === 'split') {
    if (!form.section_id || !form.split_section_id) return 'Please select both sections to split between';
    if (form.section_id === form.split_section_id) return 'The two split sections must be different';
    if (!form.split_amount || isNaN(parseFloat(form.split_amount))) return 'Please enter the amount for the second section';
    if (parseFloat(form.split_amount) > parseFloat(form.amount)) return "Split amount can't exceed the total";
  }
  return null;
}

// Build the ReceiptAllocation payload from the shared form + uploaded file URL + user.
export function buildReceiptAllocation(form, fileUrl, { user, leader } = {}) {
  return {
    receipt_url: fileUrl,
    amount: parseFloat(form.amount),
    category: form.category,
    payment_method: form.payment_method,
    expense_scope: form.expense_scope || 'single',
    linked_meeting_id: form.linked_meeting_id || null,
    linked_event_id: form.linked_event_id || null,
    section_id: form.section_id || '',
    split_section_id: form.expense_scope === 'split' ? (form.split_section_id || '') : '',
    split_amount: form.expense_scope === 'split' && form.split_amount ? parseFloat(form.split_amount) : null,
    leader_id: leader?.id || '',
    leader_name: leader?.display_name || user?.full_name || '',
    submitted_by: user?.email || '',
    status: 'unallocated',
    allocation_date: format(new Date(), 'yyyy-MM-dd'),
    notes: form.notes || '',
  };
}

// Upload the file then create the ReceiptAllocation. Returns the created record.
export async function submitReceipt(form, file, ctx) {
  const { file_url } = await base44.integrations.Core.UploadFile({ file });
  const payload = buildReceiptAllocation(form, file_url, ctx);
  return base44.entities.ReceiptAllocation.create(payload);
}