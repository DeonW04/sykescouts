/**
 * Canonical admin navigation groups — single source of truth used by the
 * FloatingNav admin strip (dropdown menus). Each link points at either the
 * AdminSettings page with ?section=&tab= query params, or a standalone route.
 */
import {
  Users, Shield, BarChart2, Bell, Mail, Image, Layers, Calendar,
  CreditCard, Award, Upload, Archive, Globe, Camera, RefreshCw,
  Activity, TrendingUp, MessageCircle, TestTube, Send, Sparkles,
} from 'lucide-react';

export const ADMIN_NAV_GROUPS = [
  {
    label: 'People', icon: Users, key: 'people',
    links: [
      { label: 'User Management',         to: '/AdminSettings?section=people&tab=users', icon: Users },
      { label: 'Volunteer Management',    to: '/AdminSettings?section=people&tab=leaders', icon: Shield },
      { label: 'Parent Portal Analytics', to: '/AdminSettings?section=people&tab=analytics', icon: BarChart2 },
      { label: 'Push Notifications',      to: '/AdminSettings?section=people&tab=push', icon: Bell },
      { label: 'Notification Log',        to: '/AdminSettings?section=people&tab=notif-log', icon: Mail },
      { label: 'Parent Portal Banners',   to: '/AdminSettings?section=people&tab=banners', icon: Image },
    ],
  },
  {
    label: 'Group Management', icon: Layers, key: 'group',
    links: [
      { label: 'Section Settings',     to: '/AdminSettings?section=group&tab=sections', icon: Layers },
      { label: 'Terms',                to: '/AdminSettings?section=group&tab=terms', icon: Calendar },
      { label: 'Subscription Pricing', to: '/AdminSettings?section=group&tab=subs', icon: CreditCard },
      { label: 'Manage Badges',        to: '/AdminSettings?section=group&tab=manage-badges', icon: Award },
      { label: 'Badge Bulk Award',     to: '/AdminSettings?section=group&tab=badge-bulk-award', icon: Award },
      { label: 'Import Badges',        to: '/ImportBadges', icon: Upload },
      { label: 'Import from OSM',      to: '/OSMBadgeImport', icon: Upload },
      { label: 'Archived Members',     to: '/AdminSettings?section=group&tab=archived-members', icon: Archive },
    ],
  },
  {
    label: 'Website Content', icon: Globe, key: 'website',
    links: [
      { label: 'Public Website', to: '/AdminSettings?section=website&tab=website', icon: Globe },
      { label: 'Gallery Stats',  to: '/AdminSettings?section=website&tab=gallery', icon: Camera },
      { label: 'Uniform Guide',  to: '/AdminSettings?section=website&tab=uniform', icon: Shield },
    ],
  },
  {
    label: 'OSM Sync', icon: RefreshCw, key: 'osm',
    links: [
      { label: 'Overview',         to: '/AdminSettings?section=osm&tab=osm-overview', icon: Activity },
      { label: 'Member Sync',      to: '/AdminSettings?section=osm&tab=osm-members', icon: Users },
      { label: 'Programme Sync',   to: '/AdminSettings?section=osm&tab=osm-programme', icon: Calendar },
      { label: 'Badge ID Sync',    to: '/AdminSettings?section=osm&tab=osm-badge-ids', icon: Award },
      { label: 'Badge Award Sync', to: '/AdminSettings?section=osm&tab=osm-awards', icon: TrendingUp },
    ],
  },
  {
    label: 'Future Testing', icon: Sparkles, key: 'future',
    links: [
      { label: 'WhatsApp Setup',        to: '/AdminSettings?section=future&tab=wa-setup', icon: MessageCircle },
      { label: 'WhatsApp Test Console', to: '/AdminSettings?section=future&tab=wa-test', icon: TestTube },
      { label: 'WhatsApp Schedule',     to: '/WhatsAppSchedules', icon: Send },
      { label: 'AI Planning Data',      to: '/AdminSettings?section=future&tab=ai-planning', icon: Sparkles },
    ],
  },
];