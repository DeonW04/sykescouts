import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Users, Shield } from 'lucide-react';
import VolunteerOnboardingWizard from './VolunteerOnboardingWizard';
import ParentOnboardingWizard from './ParentOnboardingWizard';

export default function AddUserTypeDialog({ open, onOpenChange, onDone }) {
  const [mode, setMode] = useState(null); // null | 'volunteer' | 'parent'

  const close = () => { setMode(null); onOpenChange(false); };
  const finish = () => { setMode(null); onOpenChange(false); onDone?.(); };

  if (mode === 'volunteer') return <VolunteerOnboardingWizard open={open} onOpenChange={close} onDone={finish} />;
  if (mode === 'parent') return <ParentOnboardingWizard open={open} onOpenChange={close} onDone={finish} />;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add a New User</DialogTitle></DialogHeader>
        <p className="text-sm text-gray-500 -mt-2">Choose the type of account to set up. You'll pre-fill their details and we'll send a branded invitation email.</p>
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={() => setMode('parent')}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-100 hover:border-[#7413dc] hover:bg-purple-50 transition-colors"
          >
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-[#7413dc]" />
            </div>
            <span className="font-semibold text-gray-900">Parent</span>
          </button>
          <button
            onClick={() => setMode('volunteer')}
            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-gray-100 hover:border-[#004851] hover:bg-teal-50 transition-colors"
          >
            <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-[#004851]" />
            </div>
            <span className="font-semibold text-gray-900">Volunteer</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}