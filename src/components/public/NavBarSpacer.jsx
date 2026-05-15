import React from 'react';

/**
 * Spacer component to push content below the fixed FloatingNav.
 * 
 * Usage:
 * - Non-hero pages: render at the top of main content to add padding
 * - Hero pages: skip this and let hero images go behind the fixed nav
 * 
 * Desktop: 136px (pill + portal strip)
 * Mobile: 80px (pill only)
 */
export default function NavBarSpacer() {
  return (
    <>
      {/* Desktop spacer */}
      <div style={{ height: '136px' }} className="hidden md:block" />
      {/* Mobile spacer */}
      <div style={{ height: '80px' }} className="md:hidden" />
    </>
  );
}