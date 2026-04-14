import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, Users, Calendar, Receipt, RefreshCw,
  Wallet, BarChart3, Repeat, Landmark, Menu, X, ChevronLeft
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', path: '/TreasurerDashboard', icon: LayoutDashboard },
  { label: 'Ledger', path: '/TreasurerLedger', icon: BookOpen },
  { label: 'Member Payments', path: '/TreasurerMemberPayments', icon: Users },
  { label: 'Event Finances', path: '/TreasurerEventFinances', icon: Calendar },
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
      <div className="hidden lg:flex flex-col w-64 bg-[#1a472a] text-white min-h-screen fixed left-0 top-0 z-40">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
              <Landmark className="w-5 h-5 text-[#1a472a]" />
            </div>
            <div>
              <p className="font-bold text-sm">Treasurer Portal</p>
              <p className="text-white/60 text-xs">40th Rochdale Scouts</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-yellow-400 text-[#1a472a]'
                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <Link
            to="/LeaderDashboard"
            className="flex items-center gap-2 text-white/60 hover:text-white text-xs transition-colors"
          >
            <ChevronLeft className="w-3 h-3" />
            Back to Leader Portal
          </Link>
        </div>
      </div>

      {/* Mobile top bar */}
      <div className="lg:hidden bg-[#1a472a] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-yellow-400" />
          <span className="font-bold text-sm">Treasurer</span>
        </div>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="lg:hidden bg-[#1a472a] text-white px-4 pb-4 z-40 fixed top-12 left-0 right-0">
          <nav className="space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                    active ? 'bg-yellow-400 text-[#1a472a]' : 'text-white/80'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </>
  );
}