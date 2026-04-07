import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Heart, Phone, User, Camera, ChevronDown, ChevronUp, Pencil } from 'lucide-react';
import EditChildDialog from './EditChildDialog';

function Section({ title, icon, color, children: content }) {
  const Icon = icon;
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className={`w-9 h-9 ${color} rounded-xl flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="font-semibold text-gray-900 flex-1">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 pt-0 border-t border-gray-50">
          {content}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="py-2 border-b border-gray-50 last:border-0">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className="text-sm text-gray-800 font-medium mt-0.5">{value || 'Not provided'}</p>
    </div>
  );
}

export default function MobileMyChild({ children }) {
  const child = children[0];
  const [editing, setEditing] = useState(false);

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  if (!child) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="text-5xl mb-4">👦</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">No child linked</h2>
        <p className="text-gray-500 text-sm">Contact your section leader to link your child's account.</p>
      </div>
    );
  }

  const section = sections.find(s => s.id === child.section_id);
  const dob = new Date(child.date_of_birth);
  const today = new Date();
  const ageYears = today.getFullYear() - dob.getFullYear() - (today < new Date(today.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);

  return (
    <div className="flex flex-col">
      {editing && <EditChildDialog child={child} onClose={() => setEditing(false)} />}
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-[#7413dc] px-5 pt-12 pb-8 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-2xl font-bold flex-shrink-0 border border-white/30">
            {child.full_name?.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold">{child.full_name}</h1>
            <p className="text-white/80 text-sm">{section?.display_name}</p>
            <p className="text-white/60 text-xs mt-0.5">Age {ageYears}</p>
          </div>
        </div>
        {child.patrol && (
          <div className="mt-3 bg-white/15 rounded-xl px-3 py-1.5 w-fit">
            <p className="text-xs text-white/80">Patrol: <strong className="text-white">{child.patrol}</strong></p>
          </div>
        )}
      </div>

      <div className="px-4 py-5 space-y-3">
        <Section title="Personal Info" icon={User} color="bg-blue-500">
          <div className="pt-2">
            <InfoRow label="First Name" value={child.first_name} />
            <InfoRow label="Surname" value={child.surname} />
            <InfoRow label="Preferred Name" value={child.preferred_name} />
            <InfoRow label="Date of Birth" value={new Date(child.date_of_birth).toLocaleDateString('en-GB')} />
            <InfoRow label="Gender" value={child.gender} />
            <InfoRow label="Address" value={child.address} />
          </div>
        </Section>

        <Section title="Medical Info" icon={Heart} color="bg-red-500">
          <div className="pt-2">
            <InfoRow label="Medical Conditions" value={child.medical_info || 'None reported'} />
            <InfoRow label="Allergies" value={child.allergies || 'None reported'} />
            <InfoRow label="Dietary Requirements" value={child.dietary_requirements || 'None'} />
            <InfoRow label="Regular Medications" value={child.medications || 'None'} />
            <InfoRow label="Doctor's Surgery" value={child.doctors_surgery} />
            <InfoRow label="Doctor's Phone" value={child.doctors_phone} />
          </div>
        </Section>

        <Section title="Emergency Contact" icon={Phone} color="bg-orange-500">
          <div className="pt-2">
            <InfoRow label="Contact Name" value={child.emergency_contact_name} />
            <InfoRow label="Phone Number" value={child.emergency_contact_phone} />
            <InfoRow label="Relationship" value={child.emergency_contact_relationship} />
          </div>
        </Section>

        <Section title="Parents / Guardians" icon={User} color="bg-purple-500">
          <div className="pt-2">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Parent One</p>
            <InfoRow label="Name" value={child.parent_one_name} />
            <InfoRow label="Email" value={child.parent_one_email} />
            <InfoRow label="Phone" value={child.parent_one_phone} />
            {child.parent_two_email && (
              <>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 mt-4">Parent Two</p>
                <InfoRow label="Name" value={child.parent_two_name} />
                <InfoRow label="Email" value={child.parent_two_email} />
                <InfoRow label="Phone" value={child.parent_two_phone} />
              </>
            )}
          </div>
        </Section>

        <Section title="Photo Consent" icon={Camera} color="bg-teal-500">
          <div className="pt-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${child.photo_consent ? 'bg-green-100' : 'bg-red-100'}`}>
              <span className="text-lg">{child.photo_consent ? '✅' : '❌'}</span>
            </div>
            <p className="text-sm text-gray-700">
              {child.photo_consent ? 'Photo consent granted' : 'Photo consent not given'}
            </p>
          </div>
        </Section>

        <button
          onClick={() => setEditing(true)}
          className="w-full flex items-center justify-center gap-2 py-3 border border-[#7413dc] text-[#7413dc] rounded-2xl font-semibold text-sm active:scale-95 transition-transform bg-white"
        >
          <Pencil className="w-4 h-4" />
          Edit Details
        </button>
        <p className="text-xs text-gray-400 text-center pb-2">
          For name or date of birth changes, please contact your section leader.
        </p>
      </div>
    </div>
  );
}