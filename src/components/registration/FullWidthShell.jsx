import React from 'react';

// Full-width page (no phone-card styling) for standalone steps like the
// completion screen, so content can use the available space on desktop.
export default function FullWidthShell({ children, footer }) {
  return (
    <div
      className="min-h-screen w-full flex flex-col bg-white"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-6 md:px-10 py-10 md:py-16">
          {children}
        </div>
      </div>
      {footer && (
        <div
          className="flex-shrink-0 border-t border-gray-100 bg-white px-6 md:px-10 py-4 md:py-6"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 16px)' }}
        >
          <div className="max-w-3xl mx-auto">{footer}</div>
        </div>
      )}
    </div>
  );
}