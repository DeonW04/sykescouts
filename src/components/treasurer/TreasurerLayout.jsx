import React from 'react';
import TreasurerNav from './TreasurerNav';

export default function TreasurerLayout({ children, title }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TreasurerNav />
      <div className="lg:ml-64">
        {title && (
          <div className="bg-[#1a472a] text-white px-6 py-6 hidden lg:block">
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
        )}
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}