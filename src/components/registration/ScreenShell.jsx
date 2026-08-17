import React from 'react';

// Full-bleed on mobile (matches the existing native-app feel), centered card on desktop
// so the wizard doesn't look like a phone screen stretched across a wide viewport.
export default function ScreenShell({ children, gradient = false }) {
  return (
    <div
      className={`min-h-screen w-full flex flex-col ${gradient ? 'bg-gradient-to-br from-[#7413dc] to-[#004851]' : 'bg-gray-50'} md:items-center md:justify-center md:py-10 md:px-4`}
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div
        className={`flex flex-col flex-1 min-h-0 w-full md:flex-none md:w-full md:max-w-md md:h-[85vh] md:rounded-3xl md:shadow-2xl md:overflow-hidden ${
          gradient ? '' : 'md:bg-white md:border md:border-gray-100'
        }`}
      >
        {children}
      </div>
    </div>
  );
}