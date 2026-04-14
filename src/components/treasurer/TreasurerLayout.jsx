import React from 'react';
import TreasurerNav from './TreasurerNav';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';

export default function TreasurerLayout({ children, title }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TreasurerNav />
      <div className="lg:ml-64">
        {title && (
          <div className="bg-gradient-to-r from-[#004851] to-[#1a472a] text-white px-6 py-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60 mb-0.5">Treasurer Portal</p>
                <h1 className="text-2xl font-bold">{title}</h1>
              </div>
              <Link
                to={createPageUrl('LeaderDashboard')}
                className="hidden sm:flex items-center gap-2 text-white/70 hover:text-white text-sm transition-colors border border-white/20 px-3 py-1.5 rounded-lg hover:bg-white/10"
              >
                ← Back to Leader Portal
              </Link>
            </div>
          </div>
        )}
        <div className="p-4 lg:p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
}