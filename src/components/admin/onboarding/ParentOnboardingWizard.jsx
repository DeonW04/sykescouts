import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, ChevronLeft, Edit, Mail } from 'lucide-react';
import { toast } from 'sonner';

export default function ParentOnboardingWizard({ open, onOpenChange, onDone }) {
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [email, setEmail] = useState('');
  const [editingEmail, setEditingEmail] = useState(false);
  const [sending, setSending] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ['members-for-onboarding'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
    enabled: open,
  });

  const filtered = search.trim()
    ? members.filter(m => (m.full_name || `${m.first_name} ${m.surname}`).toLowerCase().includes(search.toLowerCase())).slice(0, 20)
    : [];

  const pickSlot = (slot) => {
    setSelectedSlot(slot);
    const emailField = slot === 'parent_one' ? selectedMember.parent_one_email : selectedMember.parent_two_email;
    setEmail(emailField || '');
    setStep(2);
  };

  const handleFinish = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { toast.error('Please enter a valid email address'); return; }
    setSending(true);
    try {
      // Correct the stored email on the member if the admin edited it
      const storedEmail = selectedSlot === 'parent_one' ? selectedMember.parent_one_email : selectedMember.parent_two_email;
      if (storedEmail?.toLowerCase() !== trimmedEmail) {
        const field = selectedSlot === 'parent_one' ? 'parent_one_email' : 'parent_two_email';
        await base44.entities.Member.update(selectedMember.id, { [field]: trimmedEmail });
      }
      const parentName = selectedSlot === 'parent_one'
        ? (selectedMember.parent_one_name || selectedMember.parent_one_first_name || 'Parent')
        : (selectedMember.parent_two_name || selectedMember.parent_two_first_name || 'Parent');
      const res = await base44.functions.invoke('sendParentRegistrationInvite', {
        parentEmail: trimmedEmail,
        parentName,
        childName: selectedMember.full_name || `${selectedMember.first_name} ${selectedMember.surname}`,
        memberId: selectedMember.id,
        parentSlot: selectedSlot,
      });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success(res.data?.message || 'Invitation sent');
      onDone?.();
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setSending(false);
    }
  };

  const titles = ['Find the Child', 'Choose Parent', 'Confirm Email'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step > 0 && (
              <button onClick={() => setStep(step - 1)} className="text-gray-400 hover:text-gray-700">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            New Parent — {titles[step]}
          </DialogTitle>
        </DialogHeader>

        {step === 0 && (
          <div className="space-y-3 mt-2">
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input className="pl-9" placeholder="Search for a child by name..." value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
            </div>
            <div className="max-h-72 overflow-y-auto space-y-1.5">
              {filtered.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setSelectedMember(m); setStep(1); }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border hover:border-[#7413dc] hover:bg-purple-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 bg-[#7413dc] rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {(m.first_name || '?').charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{m.full_name || `${m.first_name} ${m.surname}`}</p>
                  </div>
                </button>
              ))}
              {search.trim() && filtered.length === 0 && <p className="text-sm text-gray-400 text-center py-4">No matching children found</p>}
            </div>
          </div>
        )}

        {step === 1 && selectedMember && (
          <div className="space-y-3 mt-2">
            <p className="text-sm text-gray-500">Which parent/guardian for <strong>{selectedMember.full_name || selectedMember.first_name}</strong> are you setting up?</p>
            {[
              { slot: 'parent_one', name: selectedMember.parent_one_name || selectedMember.parent_one_first_name, email: selectedMember.parent_one_email },
              { slot: 'parent_two', name: selectedMember.parent_two_name || selectedMember.parent_two_first_name, email: selectedMember.parent_two_email },
            ].map(p => (
              <button
                key={p.slot}
                onClick={() => pickSlot(p.slot)}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 hover:border-[#7413dc] hover:bg-purple-50 transition-colors text-left"
              >
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold">{p.slot === 'parent_one' ? 'Parent 1' : 'Parent 2'}</p>
                  <p className="font-semibold text-gray-900">{p.name || 'Not named'}</p>
                  <p className="text-sm text-gray-500">{p.email || 'No email on file'}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === 2 && selectedMember && (
          <div className="space-y-4 mt-2">
            <p className="text-sm text-gray-500">Confirm the email address to send the invitation to.</p>
            {!editingEmail ? (
              <div className="flex items-center justify-between p-4 rounded-xl border bg-gray-50">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-900 truncate">{email || 'No email set'}</span>
                </div>
                <Button size="sm" variant="outline" onClick={() => setEditingEmail(true)}><Edit className="w-3.5 h-3.5 mr-1" />Edit</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs text-gray-600">Email Address</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
              </div>
            )}
            <Button className="w-full bg-[#7413dc] hover:bg-[#5c0fb0]" disabled={sending} onClick={handleFinish}>
              {sending ? 'Sending Invitation…' : 'Confirm & Send Invitation'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}