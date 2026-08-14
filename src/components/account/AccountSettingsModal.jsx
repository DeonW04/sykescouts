import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAccountSettingsModal } from '@/lib/AccountSettingsModalProvider';
import AccountSettingsContent from './AccountSettingsContent';

export default function AccountSettingsModal() {
  const { isOpen, closeAccountSettingsModal } = useAccountSettingsModal();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeAccountSettingsModal(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle style={{ fontFamily: 'Outfit, sans-serif' }}>Account Settings</DialogTitle>
        </DialogHeader>
        <AccountSettingsContent />
      </DialogContent>
    </Dialog>
  );
}