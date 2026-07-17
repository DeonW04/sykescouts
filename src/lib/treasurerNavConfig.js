/**
 * Canonical treasurer portal navigation groups — single source of truth used by
 * both FloatingNav (treasurer strip) and TreasurerDashboard (quick-action tiles).
 *
 * Editing this file updates both places automatically.
 *
 * Items with a `page` are direct links; items with `links` are dropdown groups.
 */
import {
  BookOpen, Users, Calendar, BookMarked, Receipt, RefreshCw,
  Wallet, BarChart3, Repeat, Landmark, Banknote,
} from 'lucide-react';

export const TREASURER_NAV_GROUPS = [
  {
    label: 'Ledger', icon: BookOpen, accent: '#7413dc',
    page: 'TreasurerLedger',
  },
  {
    label: 'Payments', icon: Users, accent: '#3b82f6',
    links: [
      { label: 'Member Overview',    page: 'TreasurerMemberPayments', icon: Users },
      { label: 'Event Finances',     page: 'TreasurerEventFinances', icon: Calendar },
      { label: 'Programme Finances', page: 'TreasurerProgrammeFinances', icon: BookMarked },
    ],
  },
  {
    label: 'Receipts', icon: Receipt, accent: '#f97316',
    links: [
      { label: 'Receipt Allocation', page: 'TreasurerReceiptAllocation', icon: Receipt },
      { label: 'Reimbursements',     page: 'TreasurerReimbursements', icon: RefreshCw },
      { label: 'Cash Taken',         page: 'TreasurerCashTaken', icon: Banknote },
    ],
  },
  {
    label: 'Budgets', icon: Wallet, accent: '#22c55e',
    page: 'TreasurerBudgets',
  },
  {
    label: 'Group Finances', icon: Landmark, accent: '#14b8a6',
    links: [
      { label: 'Recurring Payments', page: 'TreasurerRecurringPayments', icon: Repeat },
      { label: 'Fund Management',    page: 'TreasurerFunds', icon: Landmark },
    ],
  },
  {
    label: 'Reports', icon: BarChart3, accent: '#ec4899',
    page: 'TreasurerReports',
  },
];