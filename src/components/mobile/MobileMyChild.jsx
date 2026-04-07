import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { ChevronDown, ChevronUp, Pencil, User, Phone, HeartPulse, ShieldAlert, Camera } from 'lucide-react';
import EditChildDialog from './EditChildDialog';

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="py-2 border-b border-gray-50 last:border-0">
      <p className="text-xs text-gray-400">{label}</p>
      <p className="text-sm text-gray-800 font-medium mt-0.5">{value}</p>
    </div>
  );
}

function Section({ title, icon: Icon, iconColor, children: content, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
      >
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-semibold text-gray-900 text-sm flex-1">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="px-4 pb-4 space-y-0">{content}</div>}
    </div>
  );
}

function ChildCard({ child }) {
  const [editing, setEditing] = useState(false);

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const section = sections.find(s => s.id === child.section_id);

  const age = child.date_of_birth
    ? Math.floor((new Date() - new Date(child.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
    : null;

  if (editing) {
    return <EditChildDialog child={child} onClose={() => setEditing(false)} />;
  }

  return (
    <div className="space-y-3">
      {/* Child name bar */}
      <div className="bg-gradient-to-r from-[#7413dc] to-[#5c0fb0] rounded-2xl px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-base">{child.first_name} {child.surname}</p>
          {section && <p className="text-white/70 text-xs capitalize">{section.display_name || section.name}</p>}
          {age && <p className="text-white/60 text-xs mt-0.5">Age {age}</p>}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center"
        >
          <Pencil className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Child Info */}
      <Section title="Child Information" icon={User} iconColor="bg-purple-100 text-purple-600" defaultOpen={true}>
        <InfoRow label="Full Name" value={`${child.first_name} ${child.surname}`} />
        <InfoRow label="Preferred Name" value={child.preferred_name} />
        <InfoRow label="Date of Birth" value={child.date_of_birth ? new Date(child.date_of_birth).toLocaleDateString('en-GB') : null} />
        <InfoRow label="Gender" value={child.gender} />
        <InfoRow label="Section" value={section?.display_name || section?.name} />
        <InfoRow label="Patrol" value={child.patrol} />
        <InfoRow label="Address" value={child.address} />
      </Section>

      {/* Parents */}
      <Section title="Parent / Guardian" icon={Phone} iconColor="bg-blue-100 text-blue-600">
        {child.parent_one_name && <InfoRow label="Parent One" value={`${child.parent_one_name}`} />}
        {child.parent_one_email && <InfoRow label="Email" value={child.parent_one_email} />}
        {child.parent_one_phone && <InfoRow label="Phone" value={child.parent_one_phone} />}
        {child.parent_two_name && (
          <>
            <div className="my-2 border-t border-gray-100" />
            <InfoRow label="Parent Two" value={child.parent_two_name} />
            {child.parent_two_email && <InfoRow label="Email" value={child.parent_two_email} />}
            {child.parent_two_phone && <InfoRow label="Phone" value={child.parent_two_phone} />}
          </>
        )}
      </Section>

      {/* Emergency Contact */}
      <Section title="Emergency Contact" icon={ShieldAlert} iconColor="bg-red-100 text-red-500">
        <InfoRow label="Name" value={child.emergency_contact_name} />
        <InfoRow label="Phone" value={child.emergency_contact_phone} />
        <InfoRow label="Relationship" value={child.emergency_contact_relationship} />
      </Section>

      {/* Medical */}
      <Section title="Medical Information" icon={HeartPulse} iconColor="bg-rose-100 text-rose-500">
        <InfoRow label="Medical Conditions" value={child.medical_info || 'None recorded'} />
        <InfoRow label="Allergies" value={child.allergies || 'None recorded'} />
        <InfoRow label="Dietary Requirements" value={child.dietary_requirements} />
        <InfoRow label="Medications" value={child.medications} />
        <InfoRow label="Doctor's Surgery" value={child.doctors_surgery} />
        <InfoRow label="Surgery Address" value={child.doctors_surgery_address} />
        <InfoRow label="Doctor's Phone" value={child.doctors_phone} />
      </Section>

      {/* Photo Consent */}
      <Section title="Photo Consent" icon={Camera} iconColor="bg-amber-100 text-amber-500">
        <div className="py-2">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold ${
            child.photo_consent ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
          }`}>
            {child.photo_consent ? '✓ Consent Given' : '✗ No Consent'}
          </div>
          <p className="text-xs text-gray-400 mt-2">To change photo consent, please contact your section leader.</p>
        </div>
      </Section>
    </div>
  );
}

export default function MobileMyChild({ user, children }) {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!children || children.length === 0) {
    return (
      <div className="flex flex-col">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 px-5 pt-16 pb-8 text-white">
          <h1 className="text-2xl font-bold">My Child</h1>
        </div>
        <div className="px-4 py-8 text-center text-gray-400">
          <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-600">No children linked</p>
          <p className="text-sm mt-1">Contact your section leader to link your account.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 px-5 pt-16 pb-4 text-white">
        <h1 className="text-2xl font-bold">My Child</h1>
        {children.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
            {children.map((child, idx) => (
              <button
                key={child.id}
                onClick={() => setSelectedIdx(idx)}
                className={`px-3 py-1.5 rounded-full text-sm font-semibold flex-shrink-0 transition-colors ${
                  selectedIdx === idx ? 'bg-white text-gray-900' : 'bg-white/20 text-white'
                }`}
              >
                {child.preferred_name || child.first_name}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="px-4 py-4 space-y-3">
        <ChildCard child={children[selectedIdx]} />
      </div>
    </div>
  );
}