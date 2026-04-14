import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import {
  LayoutDashboard, BookOpen, Users, Calendar, Receipt, RefreshCw,
  Wallet, BarChart3, Repeat, Landmark, Menu, X, ChevronLeft, BookMarked
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/TreasurerDashboard', icon: LayoutDashboard },
  { label: 'Ledger', path: '/TreasurerLedger', icon: BookOpen },
  { label: 'Member Payments', path: '/TreasurerMemberPayments', icon: Users },
  { label: 'Event Finances', path: '/TreasurerEventFinances', icon: Calendar },
  { label: 'Programme Finances', path: '/TreasurerProgrammeFinances', icon: BookMarked },
  { label: 'Receipt Allocation', path: '/TreasurerReceiptAllocation', icon: Receipt },
  { label: 'Reimbursements', path: '/TreasurerReimbursements', icon: RefreshCw },
  { label: 'Budgets', path: '/TreasurerBudgets', icon: Wallet },
  { label: 'Recurring Payments', path: '/TreasurerRecurringPayments', icon: Repeat },
  { label: 'Fund Management', path: '/TreasurerFunds', icon: Landmark },
  { label: 'Reports', path: '/TreasurerReports', icon: BarChart3 },
];

export default function TreasurerNav() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 text-gray-800 min-h-screen fixed left-0 top-0 z-40">
        {/* Logo area matching main site */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/e8eca937a_image.png"
              alt="40th Rochdale Scouts"
              className="h-10 w-auto"
            />
            <div>
              <p className="font-bold text-xs text-[#004851]">Treasurer Portal</p>
              <p className="text-gray-400 text-xs">40th Rochdale Scouts</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-[#004851] text-white'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <Link
            to={createPageUrl('LeaderDashboard')}
            className="flex items-center gap-2 text-gray-500 hover:text-[#004851] text-xs transition-colors font-medium"
          >
            <ChevronLeft className="w-3 h-3" />
            Back to Leader Portal
          </Link>
        </div>
      </div>

      {/* Mobile top bar - matches main site header feel */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-[#004851]" />
          <span className="font-bold text-sm text-[#004851]">Treasurer</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-1">
          {mobileOpen ? <X className="w-5 h-5 text-gray-600" /> : <Menu className="w-5 h-5 text-gray-600" />}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 pb-4 z-40 fixed top-14 left-0 right-0 shadow-lg">
          <nav className="space-y-0.5 pt-2">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    active ? 'bg-[#004851] text-white' : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
            <div className="pt-2 border-t border-gray-100 mt-2">
              <Link
                to={createPageUrl('LeaderDashboard')}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-500"
              >
                <ChevronLeft className="w-3 h-3" />
                Back to Leader Portal
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}