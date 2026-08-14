import React, { createContext, useContext, useState, useCallback } from 'react';

const AccountSettingsModalContext = createContext(null);

export function AccountSettingsModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);

  const openAccountSettingsModal = useCallback(() => setIsOpen(true), []);
  const closeAccountSettingsModal = useCallback(() => setIsOpen(false), []);

  return (
    <AccountSettingsModalContext.Provider value={{ isOpen, openAccountSettingsModal, closeAccountSettingsModal }}>
      {children}
    </AccountSettingsModalContext.Provider>
  );
}

export function useAccountSettingsModal() {
  const ctx = useContext(AccountSettingsModalContext);
  if (!ctx) throw new Error('useAccountSettingsModal must be used within AccountSettingsModalProvider');
  return ctx;
}