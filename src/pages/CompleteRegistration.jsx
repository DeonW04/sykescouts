import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle, ChevronRight, ChevronLeft, User, Baby, Heart, Phone, Camera, AlertCircle, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';

// Reusable field components
function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', required }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      required={required}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#7413dc] focus:ring-2 focus:ring-[#7413dc]/20 transition-all"
    />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#7413dc] focus:ring-2 focus:ring-[#7413dc]/20 transition-all resize-none"
    />
  );
}

function SelectInput({ value, onChange, placeholder, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white focus:outline-none focus:border-[#7413dc] focus:ring-2 focus:ring-[#7413dc]/20 transition-all appearance-none"
    >
      <option value="">{placeholder}</option>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function StepHeader({ icon: Icon, iconBg, title, subtitle, step, totalSteps }) {
  return (
    <div className="px-5 pt-6 pb-5">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 ${iconBg} rounded-2xl flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="font-bold text-gray-900 text-base leading-tight">{title}</h2>
          <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>
        </div>
        <span className="text-xs text-gray-400 font-medium">{step}/{totalSteps}</span>
      </div>
      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#7413dc] to-[#004851] rounded-full transition-all duration-500"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function CompleteRegistration() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState(0); // 0 = welcome
  const [submitting, setSubmitting] = useState(false);
  const [noChildFound, setNoChildFound] = useState(false);
  const [existingChildId, setExistingChildId] = useState(null);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState('');

  const [childForm, setChildForm] = useState({
    first_name: '', surname: '', full_name: '', preferred_name: '',
    date_of_birth: '', gender: '', section_id: '', address: '',
    parent_one_first_name: '', parent_one_surname: '', parent_one_name: '',
    parent_one_email: '', parent_one_phone: '',
    parent_two_first_name: '', parent_two_surname: '', parent_two_name: '',
    parent_two_email: '', parent_two_phone: '',
    doctors_surgery: '', doctors_surgery_address: '', doctors_phone: '',
    medical_info: '', allergies: '', dietary_requirements: '', medications: '',
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
    photo_consent: false,
  });

  const setField = (key) => (val) => setChildForm(prev => ({ ...prev, [key]: val }));

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
    enabled: !!user,
  });

  useEffect(() => {
    // If on PWA, redirect to the app where onboarding is handled inline
    const isMobilePWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    if (isMobilePWA) {
      window.location.replace('/app');
      return;
    }

    base44.auth.me()
      .then(async (u) => {
        setUser(u);
        setDisplayName(u.display_name || u.full_name || '');

        // Pre-fill child data if found
        const members = await base44.entities.Member.filter({});
        const child = members.find(m => m.parent_one_email === u.email || m.parent_two_email === u.email);
        if (child) {
          setExistingChildId(child.id);
          setChildForm({
            first_name: child.first_name || '',
            surname: child.surname || '',
            full_name: child.full_name || '',
            preferred_name: child.preferred_name || '',
            date_of_birth: child.date_of_birth || '',
            gender: child.gender || '',
            section_id: child.section_id || '',
            address: child.address || '',
            parent_one_first_name: child.parent_one_first_name || '',
            parent_one_surname: child.parent_one_surname || '',
            parent_one_name: child.parent_one_name || '',
            parent_one_email: child.parent_one_email || u.email,
            parent_one_phone: child.parent_one_phone || '',
            parent_two_first_name: child.parent_two_first_name || '',
            parent_two_surname: child.parent_two_surname || '',
            parent_two_name: child.parent_two_name || '',
            parent_two_email: child.parent_two_email || '',
            parent_two_phone: child.parent_two_phone || '',
            doctors_surgery: child.doctors_surgery || '',
            doctors_surgery_address: child.doctors_surgery_address || '',
            doctors_phone: child.doctors_phone || '',
            medical_info: child.medical_info || '',
            allergies: child.allergies || '',
            dietary_requirements: child.dietary_requirements || '',
            medications: child.medications || '',
            emergency_contact_name: child.emergency_contact_name || '',
            emergency_contact_phone: child.emergency_contact_phone || '',
            emergency_contact_relationship: child.emergency_contact_relationship || '',
            photo_consent: child.photo_consent || false,
          });
        } else {
          setChildForm(prev => ({ ...prev, parent_one_email: u.email }));
        }

        setLoading(false);
      })
      .catch(() => base44.auth.redirectToLogin('/CompleteRegistration'));
  }, []);

  // TOTAL steps: 0=welcome, 1=your name, 2=child basics, 3=parents, 4=medical, 5=emergency, 6=photo, 7=done
  const TOTAL_CONTENT_STEPS = 6;

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      // Update user name
      await base44.auth.updateMe({ display_name: displayName });

      // Check if leader
      const leaderRecords = user.role === 'admin' ? [{ id: null }] : await base44.entities.Leader.filter({ user_id: user.id });
      if (leaderRecords.length > 0 || user.role === 'admin') {
        if (leaderRecords[0]?.id) {
          await base44.entities.Leader.update(leaderRecords[0].id, { display_name: displayName });
        }
        await base44.auth.updateMe({ onboarding_complete: true });
        toast.success('Welcome aboard!');
        window.location.href = createPageUrl('LeaderDashboard');
        return;
      }

      // Parent flow — save child
      if (!existingChildId) {
        setNoChildFound(true);
        setSubmitting(false);
        return;
      }

      const finalForm = {
        ...childForm,
        full_name: `${childForm.first_name} ${childForm.surname}`.trim(),
        parent_one_name: `${childForm.parent_one_first_name} ${childForm.parent_one_surname}`.trim() || childForm.parent_one_name,
        parent_two_name: `${childForm.parent_two_first_name} ${childForm.parent_two_surname}`.trim() || childForm.parent_two_name,
      };
      await base44.entities.Member.update(existingChildId, finalForm);

      const existingParent = await base44.entities.Parent.filter({ user_id: user.id });
      if (existingParent.length === 0) {
        await base44.entities.Parent.create({
          user_id: user.id,
          phone: childForm.parent_one_phone || '',
          emergency_contact_name: childForm.emergency_contact_name,
          emergency_contact_phone: childForm.emergency_contact_phone,
          emergency_contact_relationship: childForm.emergency_contact_relationship,
        });
      }

      await base44.auth.updateMe({ onboarding_complete: true });
      setStep(8); // done
    } catch (err) {
      toast.error('Error: ' + err.message);
      setSubmitting(false);
    }
  };

  const next = () => setStep(s => s + 1);
  const back = () => setStep(s => s - 1);

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#7413dc] rounded-full animate-spin" />
      </div>
    );
  }

  // ── Welcome Screen ──
  if (step === 0) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#7413dc] to-[#004851] flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <img
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png"
            alt="40th Rochdale Scouts"
            className="w-24 h-24 object-contain mb-6 drop-shadow-2xl"
          />
          <h1 className="text-3xl font-extrabold text-white mb-3 leading-tight">
            Welcome to the<br />Scout Portal
          </h1>
          <p className="text-white/75 text-base leading-relaxed mb-2">
            Let's get your profile set up — it only takes a few minutes.
          </p>
          <p className="text-white/50 text-sm">40th Rochdale (Syke) Scouts</p>
        </div>
        <div className="px-6 pb-8 space-y-3">
          <button
            onClick={next}
            className="w-full bg-white text-[#7413dc] font-bold text-base py-4 rounded-2xl active:scale-95 transition-transform shadow-lg"
          >
            Get Started →
          </button>
          <button
            onClick={() => base44.auth.logout()}
            className="w-full text-white/60 text-sm py-2 flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // ── Done Screen ──
  if (step === 8) {
    const isMobilePWA = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-[#7413dc] to-[#004851] flex flex-col items-center justify-center px-8 text-center"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-2xl">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>
        <h1 className="text-3xl font-extrabold text-white mb-3">All done!</h1>
        <p className="text-white/75 text-base mb-8">
          Your profile is set up and ready to go.
        </p>
        <button
          onClick={() => {
            window.location.href = isMobilePWA ? '/app' : createPageUrl('ParentDashboard');
          }}
          className="w-full bg-white text-[#7413dc] font-bold text-base py-4 rounded-2xl active:scale-95 transition-transform shadow-lg"
        >
          Go to my Dashboard →
        </button>
      </div>
    );
  }

  // ── No Child Found Screen ──
  if (noChildFound) {
    return (
      <div className="fixed inset-0 bg-gray-50 flex flex-col"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-3xl flex items-center justify-center mb-5">
            <AlertCircle className="w-8 h-8 text-orange-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-3">No child record found</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-2">
            We couldn't find a child registered with:
          </p>
          <p className="font-semibold text-gray-800 text-sm mb-4 bg-gray-100 px-4 py-2 rounded-xl">{user?.email}</p>
          <p className="text-gray-400 text-xs leading-relaxed">
            Please contact your section leader to ensure your child has been added with this email address, or sign in with the correct account.
          </p>
        </div>
        <div className="px-6 pb-8 space-y-3">
          <button
            onClick={() => { setNoChildFound(false); setStep(1); }}
            className="w-full bg-[#7413dc] text-white font-bold text-base py-4 rounded-2xl active:scale-95 transition-transform"
          >
            Try Again
          </button>
          <button
            onClick={() => base44.auth.logout()}
            className="w-full text-gray-400 text-sm py-2 flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // ── Form Steps ──
  const scrollTop = () => window.scrollTo({ top: 0 });
  const goNext = () => { scrollTop(); next(); };
  const goBack = () => { scrollTop(); back(); };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>

      {/* Back button */}
      <div className="px-4 pt-4 pb-0 flex items-center">
        <button onClick={goBack} className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-500">
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-28">

        {/* ── Step 1: Your Name ── */}
        {step === 1 && (
          <div>
            <StepHeader icon={User} iconBg="bg-[#7413dc]" title="What shall we call you?" subtitle="This will show in the app" step={1} totalSteps={TOTAL_CONTENT_STEPS} />
            <div className="px-5 space-y-4">
              <Field label="Your Name" required>
                <TextInput value={displayName} onChange={setDisplayName} placeholder="e.g. Sarah Smith" required />
                <p className="text-xs text-gray-400 mt-1">This is how your name appears in the parent portal.</p>
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 2: Child Basics ── */}
        {step === 2 && (
          <div>
            <StepHeader icon={Baby} iconBg="bg-blue-500" title="Your child's details" subtitle="Basic information about your scout" step={2} totalSteps={TOTAL_CONTENT_STEPS} />
            <div className="px-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" required>
                  <TextInput value={childForm.first_name} onChange={(v) => setChildForm(p => ({ ...p, first_name: v, full_name: `${v} ${p.surname}`.trim() }))} required />
                </Field>
                <Field label="Surname" required>
                  <TextInput value={childForm.surname} onChange={(v) => setChildForm(p => ({ ...p, surname: v, full_name: `${p.first_name} ${v}`.trim() }))} required />
                </Field>
              </div>
              <Field label="Preferred Name">
                <TextInput value={childForm.preferred_name} onChange={setField('preferred_name')} placeholder="If different from above" />
              </Field>
              <Field label="Date of Birth" required>
                <TextInput value={childForm.date_of_birth} onChange={setField('date_of_birth')} type="date" required />
              </Field>
              <Field label="Gender">
                <SelectInput
                  value={childForm.gender}
                  onChange={setField('gender')}
                  placeholder="Select gender"
                  options={[
                    { value: 'Male', label: 'Male' },
                    { value: 'Female', label: 'Female' },
                    { value: 'Other', label: 'Other' },
                    { value: 'Prefer not to say', label: 'Prefer not to say' },
                  ]}
                />
              </Field>
              <Field label="Section" required>
                <SelectInput
                  value={childForm.section_id}
                  onChange={setField('section_id')}
                  placeholder="Select section"
                  options={sections.map(s => ({ value: s.id, label: s.display_name }))}
                />
              </Field>
              <Field label="Home Address" required>
                <TextArea value={childForm.address} onChange={setField('address')} placeholder="Full address" rows={3} />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 3: Parent Details ── */}
        {step === 3 && (
          <div>
            <StepHeader icon={User} iconBg="bg-purple-500" title="Parent / Guardian" subtitle="Contact information for parents" step={3} totalSteps={TOTAL_CONTENT_STEPS} />
            <div className="px-5 space-y-5">
              <div className="bg-purple-50 rounded-2xl p-4 border border-purple-100">
                <p className="text-xs font-bold text-purple-700 uppercase tracking-wide mb-3">Parent One</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="First Name">
                      <TextInput value={childForm.parent_one_first_name} onChange={(v) => setChildForm(p => ({ ...p, parent_one_first_name: v, parent_one_name: `${v} ${p.parent_one_surname}`.trim() }))} />
                    </Field>
                    <Field label="Surname">
                      <TextInput value={childForm.parent_one_surname} onChange={(v) => setChildForm(p => ({ ...p, parent_one_surname: v, parent_one_name: `${p.parent_one_first_name} ${v}`.trim() }))} />
                    </Field>
                  </div>
                  <Field label="Email">
                    <TextInput value={childForm.parent_one_email} onChange={setField('parent_one_email')} type="email" />
                  </Field>
                  <Field label="Phone">
                    <TextInput value={childForm.parent_one_phone} onChange={setField('parent_one_phone')} type="tel" />
                  </Field>
                </div>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Parent Two (Optional)</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="First Name">
                      <TextInput value={childForm.parent_two_first_name} onChange={(v) => setChildForm(p => ({ ...p, parent_two_first_name: v, parent_two_name: `${v} ${p.parent_two_surname}`.trim() }))} />
                    </Field>
                    <Field label="Surname">
                      <TextInput value={childForm.parent_two_surname} onChange={(v) => setChildForm(p => ({ ...p, parent_two_surname: v, parent_two_name: `${p.parent_two_first_name} ${v}`.trim() }))} />
                    </Field>
                  </div>
                  <Field label="Email">
                    <TextInput value={childForm.parent_two_email} onChange={setField('parent_two_email')} type="email" />
                  </Field>
                  <Field label="Phone">
                    <TextInput value={childForm.parent_two_phone} onChange={setField('parent_two_phone')} type="tel" />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 4: Medical Info ── */}
        {step === 4 && (
          <div>
            <StepHeader icon={Heart} iconBg="bg-red-500" title="Medical information" subtitle="Important health details for your child's safety" step={4} totalSteps={TOTAL_CONTENT_STEPS} />
            <div className="px-5 space-y-4">
              <div className="bg-red-50 rounded-2xl p-3 border border-red-100 mb-2">
                <p className="text-xs text-red-600 leading-relaxed">This information is kept confidential and only shared with leaders when needed for your child's safety.</p>
              </div>
              <Field label="Medical Conditions">
                <TextArea value={childForm.medical_info} onChange={setField('medical_info')} placeholder="Any conditions leaders should know about (or 'None')" />
              </Field>
              <Field label="Allergies">
                <TextArea value={childForm.allergies} onChange={setField('allergies')} placeholder="Any allergies (or 'None')" />
              </Field>
              <Field label="Dietary Requirements">
                <TextInput value={childForm.dietary_requirements} onChange={setField('dietary_requirements')} placeholder="e.g. Vegetarian (or 'None')" />
              </Field>
              <Field label="Regular Medications">
                <TextInput value={childForm.medications} onChange={setField('medications')} placeholder="Any medications taken regularly" />
              </Field>
              <Field label="Doctor's Surgery">
                <TextInput value={childForm.doctors_surgery} onChange={setField('doctors_surgery')} placeholder="Surgery name" />
              </Field>
              <Field label="Surgery Address">
                <TextArea value={childForm.doctors_surgery_address} onChange={setField('doctors_surgery_address')} placeholder="Surgery address" rows={2} />
              </Field>
              <Field label="Doctor's Phone">
                <TextInput value={childForm.doctors_phone} onChange={setField('doctors_phone')} type="tel" placeholder="Surgery phone number" />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 5: Emergency Contact ── */}
        {step === 5 && (
          <div>
            <StepHeader icon={Phone} iconBg="bg-orange-500" title="Emergency contact" subtitle="Someone we can call in an emergency" step={5} totalSteps={TOTAL_CONTENT_STEPS} />
            <div className="px-5 space-y-4">
              <div className="bg-orange-50 rounded-2xl p-3 border border-orange-100 mb-2">
                <p className="text-xs text-orange-600 leading-relaxed">Please provide someone other than yourself who we can contact in an emergency.</p>
              </div>
              <Field label="Full Name" required>
                <TextInput value={childForm.emergency_contact_name} onChange={setField('emergency_contact_name')} placeholder="Contact's full name" required />
              </Field>
              <Field label="Phone Number" required>
                <TextInput value={childForm.emergency_contact_phone} onChange={setField('emergency_contact_phone')} type="tel" required />
              </Field>
              <Field label="Relationship to Child" required>
                <TextInput value={childForm.emergency_contact_relationship} onChange={setField('emergency_contact_relationship')} placeholder="e.g. Grandparent, Aunt" required />
              </Field>
            </div>
          </div>
        )}

        {/* ── Step 6: Photo Consent + Review ── */}
        {step === 6 && (
          <div>
            <StepHeader icon={Camera} iconBg="bg-teal-500" title="Photo consent & review" subtitle="Almost there!" step={6} totalSteps={TOTAL_CONTENT_STEPS} />
            <div className="px-5 space-y-4">
              <button
                type="button"
                onClick={() => setChildForm(p => ({ ...p, photo_consent: !p.photo_consent }))}
                className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                  childForm.photo_consent ? 'bg-teal-50 border-teal-400' : 'bg-white border-gray-200'
                }`}
              >
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border-2 transition-all ${
                  childForm.photo_consent ? 'bg-teal-500 border-teal-500' : 'border-gray-300 bg-white'
                }`}>
                  {childForm.photo_consent && <CheckCircle className="w-4 h-4 text-white" />}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">Photo Consent</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                    I give permission for photos of my child to be taken and used on the group's website and social media.
                  </p>
                </div>
              </button>

              {/* Summary review */}
              <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Summary</p>
                <div className="space-y-2">
                  <SummaryRow label="Child" value={`${childForm.first_name} ${childForm.surname}`.trim() || '—'} />
                  <SummaryRow label="Date of Birth" value={childForm.date_of_birth || '—'} />
                  <SummaryRow label="Your Name" value={displayName || '—'} />
                  <SummaryRow label="Your Phone" value={childForm.parent_one_phone || '—'} />
                  <SummaryRow label="Emergency Contact" value={childForm.emergency_contact_name || '—'} />
                  <SummaryRow label="Medical Info" value={childForm.medical_info || 'None provided'} />
                </div>
              </div>

              <p className="text-xs text-gray-400 text-center leading-relaxed">
                By continuing you confirm all information provided is accurate. You can update this at any time in the app.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Sticky Bottom Button ── */}
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-4 pb-6 bg-gray-50 pt-3 border-t border-gray-100"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 20px)' }}>
        {step < 6 ? (
          <button
            onClick={goNext}
            disabled={
              (step === 1 && !displayName.trim()) ||
              (step === 2 && (!childForm.first_name || !childForm.surname || !childForm.date_of_birth))
            }
            className="w-full bg-[#7413dc] text-white font-bold text-base py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-40 flex items-center justify-center gap-2"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleComplete}
            disabled={submitting}
            className="w-full bg-gradient-to-r from-[#7413dc] to-[#004851] text-white font-bold text-base py-4 rounded-2xl active:scale-95 transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</>
            ) : (
              <><CheckCircle className="w-5 h-5" /> Complete Registration</>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-xs font-semibold text-gray-700 text-right">{value}</span>
    </div>
  );
}