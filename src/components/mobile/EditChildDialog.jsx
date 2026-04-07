import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { toast } from 'sonner';

const FIELDS = [
  { key: 'medical_info', label: 'Medical Conditions', type: 'textarea' },
  { key: 'allergies', label: 'Allergies', type: 'textarea' },
  { key: 'dietary_requirements', label: 'Dietary Requirements', type: 'text' },
  { key: 'medications', label: 'Regular Medications', type: 'textarea' },
  { key: 'doctors_surgery', label: "Doctor's Surgery", type: 'text' },
  { key: 'doctors_surgery_address', label: "Surgery Address", type: 'text' },
  { key: 'doctors_phone', label: "Doctor's Phone", type: 'tel' },
  { key: 'emergency_contact_name', label: 'Emergency Contact Name', type: 'text' },
  { key: 'emergency_contact_phone', label: 'Emergency Contact Phone', type: 'tel' },
  { key: 'emergency_contact_relationship', label: 'Emergency Contact Relationship', type: 'text' },
  { key: 'address', label: 'Home Address', type: 'textarea' },
  { key: 'parent_one_phone', label: 'Parent One Phone', type: 'tel' },
  { key: 'parent_two_phone', label: 'Parent Two Phone', type: 'tel' },
];

export default function EditChildDialog({ child, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => {
    const vals = {};
    FIELDS.forEach(f => { vals[f.key] = child[f.key] || ''; });
    return vals;
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Member.update(child.id, form);
      queryClient.invalidateQueries({ queryKey: ['mobile-children'] });
      toast.success('Details updated!');
      onClose();
    } catch (err) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 flex items-center gap-3 px-4 py-4 flex-shrink-0"
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 16px)' }}>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100">
          <X className="w-4 h-4 text-gray-600" />
        </button>
        <h2 className="font-bold text-gray-900 flex-1">Edit {child.first_name}'s Details</h2>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-[#7413dc] text-white rounded-xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        <p className="text-xs text-gray-400 bg-white rounded-xl px-4 py-3 border border-gray-100">
          You can update medical information, emergency contacts and contact details here. For name or date of birth changes please contact your section leader.
        </p>
        {FIELDS.map(field => (
          <div key={field.key}>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1.5">{field.label}</label>
            {field.type === 'textarea' ? (
              <textarea
                value={form[field.key]}
                onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#7413dc] bg-white resize-none"
                placeholder={`Enter ${field.label.toLowerCase()}…`}
              />
            ) : (
              <input
                type={field.type}
                value={form[field.key]}
                onChange={e => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#7413dc] bg-white"
                placeholder={`Enter ${field.label.toLowerCase()}…`}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}