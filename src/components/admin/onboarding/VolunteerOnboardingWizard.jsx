import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, ChevronLeft } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_OPTIONS = [
  { value: 'leader', label: 'Leader' },
  { value: 'team_leader', label: 'Team Leader' },
  { value: 'glv', label: 'Group Lead Volunteer (GLV)' },
  { value: 'treasurer', label: 'Treasurer' },
];

const EMPTY = {
  name: '', email: '', phone: '', address: '', postcode: '', membership_number: '', role: 'leader',
  emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
  medical_info: '', allergies: '', dietary_requirements: '', medications: '',
  dbs_check_date: '', dbs_expiry_date: '', dbs_certificate_number: '',
  first_aid_certified: false, first_aid_expiry: '',
  safeguarding_trained: false, safeguarding_expiry: '',
  gdpr_trained: false,
  permits: [],
};

const EMPTY_PERMIT = { permit_type: '', permit_name: '', issuing_body: '', issued_date: '', expiry_date: '', permit_number: '', notes: '' };

function F({ label, name, type = 'text', form, set, full = false }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <Label className="text-xs text-gray-600 mb-1 block">{label}</Label>
      <Input type={type} value={form[name] || ''} onChange={(e) => set(name, e.target.value)} />
    </div>
  );
}

function B({ label, name, form, set }) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox id={`vb-${name}`} checked={!!form[name]} onCheckedChange={(v) => set(name, v)} />
      <Label htmlFor={`vb-${name}`} className="text-sm cursor-pointer">{label}</Label>
    </div>
  );
}

export default function VolunteerOnboardingWizard({ open, onOpenChange, onDone }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const steps = ['Basic Details', 'Emergency & Medical', 'Compliance & Permits'];

  const canNextStep0 = form.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());

  const addPermit = () => set('permits', [...form.permits, { ...EMPTY_PERMIT }]);
  const updatePermit = (idx, key, val) => set('permits', form.permits.map((p, i) => i === idx ? { ...p, [key]: val } : p));
  const removePermit = (idx) => set('permits', form.permits.filter((_, i) => i !== idx));

  const handleFinish = async () => {
    setSending(true);
    try {
      const { email, role, ...profile } = form;
      const res = await base44.functions.invoke('sendVolunteerOnboardingInvite', { email: email.trim().toLowerCase(), role, ...profile });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(res.data?.message || 'Invitation sent');
      onDone?.();
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="text-gray-400 hover:text-gray-700">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            New Volunteer — {steps[step]}
          </DialogTitle>
        </DialogHeader>

        <div className="flex gap-1.5 mb-2">
          {steps.map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[#004851]' : 'bg-gray-100'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-3">
              <F label="Full Name" name="name" form={form} set={set} full />
              <F label="Email Address" name="email" type="email" form={form} set={set} full />
              <F label="Phone Number" name="phone" form={form} set={set} />
              <F label="Membership Number" name="membership_number" form={form} set={set} />
              <F label="Address" name="address" form={form} set={set} full />
              <F label="Postcode" name="postcode" form={form} set={set} />
              <div>
                <Label className="text-xs text-gray-600 mb-1 block">Role</Label>
                <Select value={form.role} onValueChange={(v) => set('role', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button className="w-full bg-[#004851] hover:bg-[#003840]" disabled={!canNextStep0} onClick={() => setStep(1)}>Next</Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-5 mt-2">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Emergency Contact</p>
              <div className="grid grid-cols-2 gap-3">
                <F label="Name" name="emergency_contact_name" form={form} set={set} />
                <F label="Phone" name="emergency_contact_phone" form={form} set={set} />
                <F label="Relationship" name="emergency_contact_relationship" form={form} set={set} full />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Medical Information</p>
              <div className="grid grid-cols-1 gap-3">
                <F label="Medical Conditions" name="medical_info" form={form} set={set} full />
                <F label="Allergies" name="allergies" form={form} set={set} full />
                <F label="Dietary Requirements" name="dietary_requirements" form={form} set={set} full />
                <F label="Medications" name="medications" form={form} set={set} full />
              </div>
            </div>
            <Button className="w-full bg-[#004851] hover:bg-[#003840]" onClick={() => setStep(2)}>Next</Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5 mt-2">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Disclosure & Compliance</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <F label="DBS Certificate Number" name="dbs_certificate_number" form={form} set={set} full />
                <F label="DBS Check Date" name="dbs_check_date" type="date" form={form} set={set} />
                <F label="DBS Expiry Date" name="dbs_expiry_date" type="date" form={form} set={set} />
              </div>
              <div className="space-y-2">
                <B label="First Aid Certified" name="first_aid_certified" form={form} set={set} />
                {form.first_aid_certified && <F label="First Aid Expiry" name="first_aid_expiry" type="date" form={form} set={set} />}
                <B label="Safeguarding Trained" name="safeguarding_trained" form={form} set={set} />
                {form.safeguarding_trained && <F label="Safeguarding Expiry" name="safeguarding_expiry" type="date" form={form} set={set} />}
                <B label="GDPR Trained" name="gdpr_trained" form={form} set={set} />
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Permits</p>
              <div className="space-y-2 mb-2">
                {form.permits.map((p, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3 border space-y-2 relative">
                    <button onClick={() => removePermit(idx)} className="absolute top-2 right-2 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                    <div className="grid grid-cols-2 gap-2">
                      <Input placeholder="Permit Type" value={p.permit_type} onChange={(e) => updatePermit(idx, 'permit_type', e.target.value)} />
                      <Input placeholder="Permit Name" value={p.permit_name} onChange={(e) => updatePermit(idx, 'permit_name', e.target.value)} />
                      <Input placeholder="Issuing Body" value={p.issuing_body} onChange={(e) => updatePermit(idx, 'issuing_body', e.target.value)} />
                      <Input placeholder="Certificate / Ref No." value={p.permit_number} onChange={(e) => updatePermit(idx, 'permit_number', e.target.value)} />
                      <Input type="date" placeholder="Issued Date" value={p.issued_date} onChange={(e) => updatePermit(idx, 'issued_date', e.target.value)} />
                      <Input type="date" placeholder="Expiry Date" value={p.expiry_date} onChange={(e) => updatePermit(idx, 'expiry_date', e.target.value)} />
                    </div>
                  </div>
                ))}
              </div>
              <Button size="sm" variant="outline" onClick={addPermit}><Plus className="w-3.5 h-3.5 mr-1.5" />Add Permit</Button>
            </div>
            <Button className="w-full bg-[#7413dc] hover:bg-[#5c0fb0]" disabled={sending} onClick={handleFinish}>
              {sending ? 'Sending Invitation…' : 'Save & Send Invitation'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}