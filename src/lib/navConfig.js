/**
 * Canonical portal navigation groups — single source of truth used by both
 * FloatingNav (nav bar) and LeaderDashboard (quick-action tiles).
 *
 * Editing this file updates both places automatically so they can never drift apart.
 *
 * Link flags:
 *   separator : boolean  — render a divider above this item in the dropdown
 *   adminOnly : boolean  — only show when user.role === 'admin'
 */
import {
  Users, Calendar, Award, Mail, Image, ShieldAlert,
  CalendarDays, Lightbulb, Package, TrendingUp, FileText,
  Landmark, BookOpen, UserCheck,
} from 'lucide-react';

export const PORTAL_NAV_GROUPS = [
  {
    label: 'Members', icon: Users, accent: '#3b82f6',
    links: [
      { label: 'Member Details', page: 'LeaderMembers', icon: Users },
      { label: 'Attendance',     page: 'LeaderAttendance', icon: UserCheck },
      { label: 'Parent Portal',  page: 'ParentPortal', icon: Users },
    ],
  },
  {
    label: 'Programme', icon: Calendar, accent: '#7413dc',
    links: [
      { label: 'Weekly Meetings', page: 'LeaderProgramme', icon: Calendar },
      { label: 'Events',          page: 'LeaderEvents', icon: CalendarDays },
      { label: 'Ideas Board',     page: 'IdeasBoard', icon: Lightbulb },
    ],
  },
  {
    label: 'Safety', icon: ShieldAlert, accent: '#f97316',
    links: [
      { label: 'Risk Assessments', page: 'RiskAssessments', icon: ShieldAlert },
      { label: 'Consent Forms',    page: 'ConsentForms', icon: FileText },
      { label: 'POR Helper',       page: 'PORHelper', icon: BookOpen },
    ],
  },
  {
    label: 'Badges', icon: Award, accent: '#22c55e',
    links: [
      { label: 'Badge Tracking',   page: 'LeaderBadges', icon: Award },
      { label: 'Due Badges',       page: 'AwardBadges', icon: TrendingUp },
      { label: 'Badge Stock',      page: 'BadgeStockManagement', icon: Package },
    ],
  },
  {
    label: 'Section Admin', icon: BookOpen, accent: '#14b8a6',
    links: [
      { label: 'Communications',    page: 'Communications', icon: Mail },
      { label: 'Section Accounting', page: 'SectionAccounting', icon: Landmark },
      { label: 'Gallery',           page: 'LeaderGallery', icon: Image },
      { label: 'Treasurer Portal',  page: 'TreasurerDashboard', icon: Landmark, separator: true },
    ],
  },
];