import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, Smartphone, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { Field, TextInput, TextArea, SelectInput, WizardStepHeader } from './WizardFields';

const BLANK = {
  first_name: '', surname: '', date_of_birth: '',
  parent_one_first_name: '', parent_one_surname: '', parent_one_email: '', parent_one_phone: '',
  parent_two_first_name: '', parent_two_surname: '', parent_two_email: '', parent_two_phone: '',
  preferred_name: '', gender: '', section_id: '', patrol: '', address: '',
  doctors_surgery: '', doctors_surgery_address: '', doctors_phone: '',
  medical_info: '', allergies: '', dietary_requirements: '', medications: '',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
  photo_consent: false, notes: '',
};

const DEVICE_STEPS = ['overview', 'parents', 'medical', 'notes', 'inviteSelect'];

export default function NewMemberWizard({ open, onClose, sections, selectedSection, onCreated }) {
  const [form, setForm] = useState({ ...BLANK, section_id: selectedSection || '' });
  const [screen, setScreen] = useState('basic'); // basic | method | emailSelect | overview | parents | medical | notes | inviteSelect | saving | done
  const [inviteEmails, setInviteEmails] = useState([]); // selected parent slots to invite: 'parent_one' | 'parent_two'
  const [saving, setSaving] = useState(false);

  const set = (key) => (val) => setForm(p => ({ ...p, [key]: val }));

  const reset = () => {
    setForm({ ...BLANK, section_id: selectedSection || '' });
    setScreen('basic');
    setInviteEmails([]);
    setSaving(false);
  };

  const close = () => { reset(); onClose(); };

  const availableParentSlots = [
    form.parent_one_email ? { slot: 'parent_one', name: `${form.parent_one_first_name} ${form.parent_one_surname}`.trim() || 'Parent One', email: form.parent_one_email } : null,
    form.parent_two_email ? { slot: 'parent_two', name: `${form.parent_two_first_name} ${form.parent_two_surname}`.trim() || 'Parent Two', email: form.parent_two_email } : null,
  ].filter(Boolean);

  const toggleInvite = (slot) => {
    setInviteEmails(prev => prev.includes(slot) ? prev.filter(s => s !== slot) : [...prev, slot]);
  };

  const buildMemberPayload = (full) => {
    const full_name = `${form.first_name} ${form.surname}`.trim();
    const parent_one_name = `${form.parent_one_first_name} ${form.parent_one_surname}`.trim();
    const parent_two_name = `${form.parent_two_first_name} ${form.parent_two_surname}`.trim();
    const base = {
      first_name: form.first_name, surname: form.surname, full_name,
      date_of_birth: form.date_of_birth,
      parent_one_first_name: form.parent_one_first_name, parent_one_surname: form.parent_one_surname,
      parent_one_name, parent_one_email: form.parent_one_email, parent_one_phone: form.parent_one_phone,
      parent_two_first_name: form.parent_two_first_name, parent_two_surname: form.parent_two_surname,
      parent_two_name, parent_two_email: form.parent_two_email, parent_two_phone: form.parent_two_phone,
      section_id: form.section_id || selectedSection || '',
      active: true,
      join_date: new Date().toISOString().split('T')[0],
    };
    if (!full) return base;
    return {
      ...base,
      preferred_name: form.preferred_name, gender: form.gender, patrol: form.patrol, address: form.address,
      doctors_surgery: form.doctors_surgery, doctors_surgery_address: form.doctors_surgery_address, doctors_phone: form.doctors_phone,
      medical_info: form.medical_info, allergies: form.allergies, dietary_requirements: form.dietary_requirements, medications: form.medications,
      emergency_contact_name: form.emergency_contact_name, emergency_contact_phone: form.emergency_contact_phone,
      emergency_contact_relationship: form.emergency_contact_relationship, photo_consent: form.photo_consent, notes: form.notes,
    };
  };

  const sendInvites = async (memberId, childName) => {
    for (const slot of inviteEmails) {
      const p = availableParentSlots.find(s => s.slot === slot);
      if (!p) continue;
      await base44.functions.invoke('sendParentRegistrationInvite', {
        parentEmail: p.email,
        parentName: p.name,
        childName,
        memberId,
        parentSlot: slot,
      });
    }
  };

  const finishOnDevice = async () => {
    setSaving(true);
    try {
      const payload = buildMemberPayload(true);
      const member = await base44.entities.Member.create(payload);
      if (inviteEmails.length > 0) await sendInvites(member.id, payload.full_name);
      onCreated?.();
      setScreen('done');
    } catch (e) {
      toast.error('Error creating member: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const finishByEmail = async () => {
    setSaving(true);
    try {
      const payload = buildMemberPayload(false);
      const member = await base44.entities.Member.create(payload);
      if (inviteEmails.length > 0) await sendInvites(member.id, payload.full_name);
      onCreated?.();
      setScreen('done');
    } catch (e) {
      toast.error('Error creating member: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const basicValid = form.first_name && form.surname && form.date_of_birth &&
    (form.parent_one_email || form.parent_two_email);

  const deviceStepIndex = DEVICE_STEPS.indexOf(screen);

  const goBack = () => {
    if (screen === 'method') setScreen('basic');
    else if (screen === 'emailSelect') setScreen('method');
    else if (deviceStepIndex > 0) setScreen(DEVICE_STEPS[deviceStepIndex - 1]);
    else if (deviceStepIndex === 0) setScreen('method');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-lg flex flex-col max-h-[90vh]">
        <DialogHeader className="flex-shrink-0 flex-row items-center gap-2">
          {screen !== 'basic' && screen !== 'done' && (
            <button onClick={goBack} className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-200 text-gray-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <DialogTitle>New Member</DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1">
          {screen === 'basic' && (
            <div className="space-y-4 mt-2">
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold">Parent One</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="First Name"><TextInput value={form.parent_one_first_name} onChange={set('parent_one_first_name')} /></Field>
                  <Field label="Surname"><TextInput value={form.parent_one_surname} onChange={set('parent_one_surname')} /></Field>
                </div>
                <Field label="Email"><TextInput type="email" value={form.parent_one_email} onChange={set('parent_one_email')} /></Field>
                <Field label="Phone"><TextInput type="tel" value={form.parent_one_phone} onChange={set('parent_one_phone')} /></Field>
              </div>
              <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-semibold">Parent Two (Optional)</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="First Name"><TextInput value={form.parent_two_first_name} onChange={set('parent_two_first_name')} /></Field>
                  <Field label="Surname"><TextInput value={form.parent_two_surname} onChange={set('parent_two_surname')} /></Field>
                </div>
                <Field label="Email"><TextInput type="email" value={form.parent_two_email} onChange={set('parent_two_email')} /></Field>
                <Field label="Phone"><TextInput type="tel" value={form.parent_two_phone} onChange={set('parent_two_phone')} /></Field>
              </div>
              <div className="space-y-3 p-3 bg-blue-50 rounded-lg border-t-2 border-blue-300">
                <p className="text-sm font-semibold">Child Details</p>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="First Name" required><TextInput value={form.first_name} onChange={set('first_name')} required /></Field>
                  <Field label="Surname" required><TextInput value={form.surname} onChange={set('surname')} required /></Field>
                </div>
                <Field label="Date of Birth" required><TextInput type="date" value={form.date_of_birth} onChange={set('date_of_birth')} required /></Field>
              </div>
              <Button className="w-full bg-[#7413dc] hover:bg-[#5c0fb0]" disabled={!basicValid} onClick={() => setScreen('method')}>
                Next
              </Button>
            </div>
          )}

          {screen === 'method' && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-gray-500">How would you like to finish setting up this member?</p>
              <button
                onClick={() => setScreen('emailSelect')}
                disabled={availableParentSlots.length === 0}
                className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-[#7413dc] text-left flex items-start gap-3 disabled:opacity-40"
              >
                <Mail className="w-6 h-6 text-[#7413dc] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Send Setup Email to Parent</p>
                  <p className="text-xs text-gray-500 mt-0.5">Parent fills in the remaining details themselves and creates their account.</p>
                </div>
              </button>
              <button
                onClick={() => setScreen('overview')}
                className="w-full p-4 rounded-xl border-2 border-gray-200 hover:border-[#7413dc] text-left flex items-start gap-3"
              >
                <Smartphone className="w-6 h-6 text-[#7413dc] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Set Up On This Device</p>
                  <p className="text-xs text-gray-500 mt-0.5">Enter all of the member's details now.</p>
                </div>
              </button>
            </div>
          )}

          {screen === 'emailSelect' && (
            <div className="space-y-4 mt-2">
              <p className="text-sm text-gray-500">Select which parent(s) should receive the setup email.</p>
              {availableParentSlots.map(p => (
                <label key={p.slot} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer">
                  <Checkbox checked={inviteEmails.includes(p.slot)} onCheckedChange={() => toggleInvite(p.slot)} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.email}</p>
                  </div>
                </label>
              ))}
              <Button className="w-full bg-[#7413dc] hover:bg-[#5c0fb0]" disabled={inviteEmails.length === 0 || saving} onClick={finishByEmail}>
                {saving ? 'Sending...' : 'Send Setup Email'}
              </Button>
            </div>
          )}

          {screen === 'overview' && (
            <div className="mt-2">
              <WizardStepHeader title="Overview" subtitle="Basic details about the member" step={1} totalSteps={5} />
              <div className="space-y-3">
                <Field label="Preferred Name"><TextInput value={form.preferred_name} onChange={set('preferred_name')} /></Field>
                <Field label="Gender">
                  <SelectInput value={form.gender} onChange={set('gender')} placeholder="Select gender"
                    options={['Male', 'Female', 'Other', 'Prefer not to say'].map(v => ({ value: v, label: v }))} />
                </Field>
                <Field label="Section">
                  <SelectInput value={form.section_id} onChange={set('section_id')} placeholder="Select section"
                    options={sections.map(s => ({ value: s.id, label: s.display_name }))} />
                </Field>
                <Field label="Patrol/Six"><TextInput value={form.patrol} onChange={set('patrol')} /></Field>
                <Field label="Address"><TextArea value={form.address} onChange={set('address')} /></Field>
              </div>
              <Button className="w-full bg-[#7413dc] hover:bg-[#5c0fb0] mt-4" onClick={() => setScreen('parents')}>Next</Button>
            </div>
          )}

          {screen === 'parents' && (
            <div className="mt-2">
              <WizardStepHeader title="Parents" subtitle="Emergency contact details" step={2} totalSteps={5} />
              <div className="space-y-3">
                <Field label="Emergency Contact Name"><TextInput value={form.emergency_contact_name} onChange={set('emergency_contact_name')} /></Field>
                <Field label="Emergency Contact Phone"><TextInput type="tel" value={form.emergency_contact_phone} onChange={set('emergency_contact_phone')} /></Field>
                <Field label="Relationship"><TextInput value={form.emergency_contact_relationship} onChange={set('emergency_contact_relationship')} /></Field>
                <label className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer">
                  <Checkbox checked={form.photo_consent} onCheckedChange={(c) => set('photo_consent')(!!c)} />
                  <p className="text-sm text-gray-700">Photo consent given</p>
                </label>
              </div>
              <Button className="w-full bg-[#7413dc] hover:bg-[#5c0fb0] mt-4" onClick={() => setScreen('medical')}>Next</Button>
            </div>
          )}

          {screen === 'medical' && (
            <div className="mt-2">
              <WizardStepHeader title="Medical" subtitle="Health information" step={3} totalSteps={5} />
              <div className="space-y-3">
                <Field label="Medical Conditions"><TextArea value={form.medical_info} onChange={set('medical_info')} /></Field>
                <Field label="Allergies"><TextArea value={form.allergies} onChange={set('allergies')} /></Field>
                <Field label="Dietary Requirements"><TextInput value={form.dietary_requirements} onChange={set('dietary_requirements')} /></Field>
                <Field label="Medications"><TextInput value={form.medications} onChange={set('medications')} /></Field>
                <Field label="Doctor's Surgery"><TextInput value={form.doctors_surgery} onChange={set('doctors_surgery')} /></Field>
                <Field label="Surgery Address"><TextArea value={form.doctors_surgery_address} onChange={set('doctors_surgery_address')} rows={2} /></Field>
                <Field label="Doctor's Phone"><TextInput type="tel" value={form.doctors_phone} onChange={set('doctors_phone')} /></Field>
              </div>
              <Button className="w-full bg-[#7413dc] hover:bg-[#5c0fb0] mt-4" onClick={() => setScreen('notes')}>Next</Button>
            </div>
          )}

          {screen === 'notes' && (
            <div className="mt-2">
              <WizardStepHeader title="Notes" subtitle="Private leader notes" step={4} totalSteps={5} />
              <Field label="Leader Notes"><TextArea value={form.notes} onChange={set('notes')} rows={6} /></Field>
              <Button
                className="w-full bg-[#7413dc] hover:bg-[#5c0fb0] mt-4"
                onClick={() => availableParentSlots.length > 0 ? setScreen('inviteSelect') : finishOnDevice()}
              >
                Next
              </Button>
            </div>
          )}

          {screen === 'inviteSelect' && (
            <div className="mt-2">
              <WizardStepHeader title="Parent Portal Invites" subtitle="Send a portal invite to either parent (optional)" step={5} totalSteps={5} />
              <div className="space-y-3">
                {availableParentSlots.map(p => (
                  <label key={p.slot} className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer">
                    <Checkbox checked={inviteEmails.includes(p.slot)} onCheckedChange={() => toggleInvite(p.slot)} />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500">{p.email}</p>
                    </div>
                  </label>
                ))}
              </div>
              <Button className="w-full bg-[#7413dc] hover:bg-[#5c0fb0] mt-4" disabled={saving} onClick={finishOnDevice}>
                {saving ? 'Saving...' : 'Finish'}
              </Button>
            </div>
          )}

          {screen === 'done' && (
            <div className="flex flex-col items-center text-center py-8 gap-3">
              <CheckCircle2 className="w-14 h-14 text-green-500" />
              <p className="font-semibold text-gray-900 text-lg">Member added!</p>
              <p className="text-sm text-gray-500">{inviteEmails.length > 0 ? 'Portal invite email(s) have been sent.' : 'You can invite parents to the portal any time from the member page.'}</p>
              <Button className="w-full bg-[#7413dc] hover:bg-[#5c0fb0] mt-2" onClick={close}>Done</Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}