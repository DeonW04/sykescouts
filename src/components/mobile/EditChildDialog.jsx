import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';

const SECTIONS = [
  {
    title: 'Medical Information',
    color: 'bg-red-500',
    fields: [
      { key: 'medical_info', label: 'Medical Conditions', type: 'textarea' },
      { key: 'allergies', label: 'Allergies', type: 'textarea' },
      { key: 'dietary_requirements', label: 'Dietary Requirements', type: 'text' },
      { key: 'medications', label: 'Regular Medications', type: 'textarea' },
      { key: 'doctors_surgery', label: "Doctor's Surgery", type: 'text' },
      { key: 'doctors_surgery_address', label: "Surgery Address", type: 'text' },
      { key: 'doctors_phone', label: "Doctor's Phone", type: 'tel' },
    ],
  },
  {
    title: 'Emergency Contact',
    color: 'bg-orange-500',
    fields: [
      { key: 'emergency_contact_name', label: 'Contact Name', type: 'text' },
      { key: 'emergency_contact_phone', label: 'Contact Phone', type: 'tel' },
      { key: 'emergency_contact_relationship', label: 'Relationship', type: 'text' },
    ],
  },
  {
    title: 'Contact Details',
    color: 'bg-purple-500',
    fields: [
      { key: 'address', label: 'Home Address', type: 'textarea' },
      { key: 'parent_one_phone', label: 'Parent One Phone', type: 'tel' },
      { key: 'parent_two_phone', label: 'Parent Two Phone', type: 'tel' },
    ],
  },
];

const ALL_FIELDS = SECTIONS.flatMap(s => s.fields);

function EditSection({ section, form, setForm }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        <div className={`w-2 h-2 rounded-full ${section.color} flex-shrink-0`} />
        <span className="font-semibold text-gray-900 flex-1 text-sm">{section.title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-gray-50 space-y-3">
          {section.fields.map(field => (
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
      )}
    </div>
  );
}

export default function EditChildDialog({ child, onClose }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(() => {
    const vals = {};
    ALL_FIELDS.forEach(f => { vals[f.key] = child[f.key] || ''; });
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
        {SECTIONS.map(section => (
          <EditSection key={section.title} section={section} form={form} setForm={setForm} />
        ))}
      </div>
    </div>
  );
}