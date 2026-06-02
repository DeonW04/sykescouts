import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import {
  LayoutDashboard, Users, Settings, Globe, RefreshCw, Zap,
  BarChart2, Bell, Mail, Shield, Award, Calendar, Image, Camera,
  MessageCircle, CreditCard, ChevronRight, ArrowLeft, Layers,
  TestTube, Edit, X, Upload, Play, Send, Activity, TrendingUp, ChevronDown, Archive
} from 'lucide-react';
import {
  ResponsiveContainer, PieChart as RPieChart, Pie, Cell,
  BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip,
} from 'recharts';
import { format, startOfWeek } from 'date-fns';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import BulkBadgeUpdate from '../components/badges/BulkBadgeUpdate';
import UniformPositionEditor from '../components/uniform/UniformPositionEditor';
import PushNotificationsTab from '../components/admin/PushNotificationsTab';
import NotificationLogTab from '../components/admin/NotificationLogTab';
import LeaderManagement from '../components/admin/LeaderManagement';
import OSMSyncPanel from '../components/admin/OSMSyncPanel';
import OSMOverview from '../components/admin/OSMOverview';
import OSMBadgeAwardSync from '../components/admin/OSMBadgeAwardSync';
import SectionSettingsTab from '../components/admin/SectionSettingsTab';
import AdminTermsTab from '../components/admin/AdminTermsTab';
import PublicWebsiteSettings from '../components/admin/PublicWebsiteSettings';
import WhatsAppSetupTab from '../components/whatsapp/WhatsAppSetupTab';
import WhatsAppTestTab from '../components/whatsapp/WhatsAppTestTab';
import SubscriptionPricingTab from '../components/admin/SubscriptionPricingTab';
import OSMBadgeMappingTab from '../components/admin/OSMBadgeMappingTab';
import ParentPortalAnalyticsPanel from '../components/admin/ParentPortalAnalyticsPanel';
import ManageBadgesPanel from '../components/admin/ManageBadgesPanel';
import ArchivedMembersPanel from '../components/admin/ArchivedMembersPanel';

// ── Config ────────────────────────────────────────────────────────────────────
const SECTION_STYLES = {
  dashboard: { bg: 'from-violet-600 to-purple-800',  accent: '#7413dc', light: 'bg-purple-50', lightText: 'text-purple-700', border: 'border-purple-200' },
  people:    { bg: 'from-teal-600 to-cyan-800',      accent: '#004851', light: 'bg-teal-50',   lightText: 'text-teal-700',   border: 'border-teal-200' },
  group:     { bg: 'from-orange-500 to-amber-700',   accent: '#c2410c', light: 'bg-orange-50', lightText: 'text-orange-700', border: 'border-orange-200' },
  website:   { bg: 'from-blue-500 to-indigo-700',    accent: '#1d4ed8', light: 'bg-blue-50',   lightText: 'text-blue-700',   border: 'border-blue-200' },
  osm:       { bg: 'from-emerald-600 to-green-800',  accent: '#15803d', light: 'bg-green-50',  lightText: 'text-green-700',  border: 'border-green-200' },
  future:    { bg: 'from-pink-500 to-rose-700',      accent: '#be123c', light: 'bg-pink-50',   lightText: 'text-pink-700',   border: 'border-pink-200' },
};

const CHART_COLORS = ['#7413dc', '#004851', '#f59e0b', '#3b82f6', '#10b981', '#ec4899'];

const SECTIONS = [
  { key: 'dashboard', label: 'Group Dashboard', icon: LayoutDashboard, description: 'Live overview', isDashboard: true },
  { key: 'people',   label: 'People',           icon: Users,           description: 'Users & leaders',
    pages: [
      { key: 'users',      label: 'User Management',         icon: Users },
      { key: 'leaders',    label: 'Leader Management',       icon: Shield },
      { key: 'analytics',  label: 'Parent Portal Analytics', icon: BarChart2 },
      { key: 'push',       label: 'Push Notifications',      icon: Bell },
      { key: 'notif-log',  label: 'Notification Log',        icon: Mail },
    ]},
  { key: 'group',   label: 'Group Management', icon: Settings, description: 'Sections & badges',
    pages: [
      { key: 'sections',     label: 'Section Settings',     icon: Layers },
      { key: 'terms',        label: 'Terms',                icon: Calendar },
      { key: 'subs',         label: 'Subscription Pricing', icon: CreditCard },
      { key: 'manage-badges',    label: 'Manage Badges',        icon: Award },
      { key: 'badge-bulk-award', label: 'Badge Bulk Award',     icon: Award },
      { key: 'import-badges',    label: 'Import Badges',        icon: Upload, navigate: '/ImportBadges' },
      { key: 'osm-badge-import', label: 'Import from OSM',      icon: Upload, navigate: '/OSMBadgeImport' },
      { key: 'archived-members',  label: 'Archived Members',     icon: Archive },
    ]},
  { key: 'website', label: 'Website Content',  icon: Globe,    description: 'Pages & media',
    pages: [
      { key: 'website', label: 'Public Website', icon: Globe },
      { key: 'gallery', label: 'Gallery Stats',  icon: Camera },
      { key: 'uniform', label: 'Uniform Guide',  icon: Shield },
    ]},
  { key: 'osm',    label: 'OSM Sync',          icon: RefreshCw, description: 'Scout Manager',
    pages: [
      { key: 'osm-overview',  label: 'Overview',         icon: Activity },
      { key: 'osm-members',   label: 'Member Sync',      icon: Users },
      { key: 'osm-programme', label: 'Programme Sync',   icon: Calendar },
      { key: 'osm-badge-ids', label: 'Badge ID Sync',    icon: Award },
      { key: 'osm-awards',    label: 'Badge Award Sync', icon: TrendingUp },
    ]},
  { key: 'future', label: 'Future Testing',    icon: Zap,      description: 'Experiments',
    pages: [
      { key: 'wa-setup',    label: 'WhatsApp Setup',        icon: MessageCircle },
      { key: 'wa-test',     label: 'WhatsApp Test Console', icon: TestTube },
      { key: 'wa-schedule', label: 'WhatsApp Schedule',     icon: Send, navigate: '/WhatsAppSchedules' },
    ]},
];

// ── Dashboard sub-components ─────────────────────────────────────────────────
function SectionBar({ name, count, max, color }) {
  const pct = max > 0 ? (count / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-gray-500 w-20 text-right flex-shrink-0 truncate">{name}</span>
      <div className="flex-1 h-7 bg-gray-100 rounded-lg overflow-hidden relative">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          className="h-full rounded-lg flex items-center justify-end pr-2"
          style={{ background: `linear-gradient(90deg, ${color}cc, ${color})` }}>
          {pct > 25 && <span className="text-white text-xs font-bold">{count}</span>}
        </motion.div>
        {pct <= 25 && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-600">{count}</span>}
      </div>
    </div>
  );
}

function AgeBar({ age, total, sections, sectionData, maxTotal }) {
  const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-400 w-6 text-right flex-shrink-0">{age}</span>
      <div className="flex-1 h-5 bg-gray-100 rounded overflow-hidden flex">
        {sections.map((s, i) => {
          const val = sectionData[s.display_name] || 0;
          const segWidth = total > 0 ? (val / total) * pct : 0;
          return segWidth > 0 ? (
            <motion.div key={s.id} initial={{ width: 0 }} animate={{ width: `${segWidth}%` }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.05 * i }}
              className="h-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }}
              title={`${s.display_name}: ${val}`} />
          ) : null;
        })}
      </div>
      <span className="text-xs font-bold text-gray-600 w-6 flex-shrink-0">{total}</span>
    </div>
  );
}

function GroupDashboard({ members, sections, events, programmes }) {
  const now = new Date();
  const thisWeekMeetings = useMemo(() => {
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
    return programmes.filter(p => { if (!p.date || p.no_meeting) return false; const d = new Date(p.date); return d >= weekStart && d < weekEnd; }).sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [programmes]);
  const upcomingEvents = useMemo(() => events.filter(e => new Date(e.start_date) >= now).slice(0, 6), [events]);
  const sectionSizes   = useMemo(() => sections.map(s => ({ name: s.display_name, members: members.filter(m => m.section_id === s.id).length })).filter(s => s.members > 0), [sections, members]);
  const ageRows = useMemo(() => {
    const byAge = {};
    members.forEach(m => {
      if (!m.date_of_birth) return;
      const age = Math.floor((Date.now() - new Date(m.date_of_birth)) / (365.25 * 24 * 3600 * 1000));
      if (age < 4 || age > 20) return;
      if (!byAge[age]) byAge[age] = { age: String(age), total: 0 };
      const sec = sections.find(s => s.id === m.section_id);
      byAge[age][sec?.display_name || 'Other'] = (byAge[age][sec?.display_name || 'Other'] || 0) + 1;
      byAge[age].total++;
    });
    return Object.values(byAge).sort((a, b) => parseInt(a.age) - parseInt(b.age));
  }, [members, sections]);
  const maxSectionSize = Math.max(...sectionSizes.map(s => s.members), 1);
  const maxAge = Math.max(...ageRows.map(r => r.total), 1);

  return (
    <div className="space-y-6">
      {/* Hero row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="sm:col-span-1 bg-gradient-to-br from-violet-600 to-purple-800 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute -top-6 -right-6 w-28 h-28 bg-white/10 rounded-full" />
          <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full" />
          <p className="text-purple-200 text-xs font-semibold uppercase tracking-wider mb-1">Total Members</p>
          <p className="text-6xl font-black text-white leading-none">{members.length}</p>
          <p className="text-purple-200 text-sm mt-2">across {sections.length} active section{sections.length !== 1 ? 's' : ''}</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col gap-4">
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center"><Calendar className="w-5 h-5 text-amber-500" /></div>
            <div><p className="text-2xl font-black text-gray-900">{upcomingEvents.length}</p><p className="text-xs text-gray-500">Upcoming events</p></div>
          </div>
          <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><Activity className="w-5 h-5 text-emerald-500" /></div>
            <div><p className="text-2xl font-black text-gray-900">{thisWeekMeetings.length}</p><p className="text-xs text-gray-500">Meetings this week</p></div>
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">This Week</p>
          {thisWeekMeetings.length === 0 ? <p className="text-sm text-gray-400 mt-2">No meetings scheduled</p> : (
            <div className="space-y-2">
              {thisWeekMeetings.map(m => {
                const sec = sections.find(s => s.id === m.section_id);
                return (
                  <div key={m.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-[#7413dc]/10 flex items-center justify-center text-[#7413dc] text-[10px] font-black flex-shrink-0">
                      {format(new Date(m.date), 'EEE').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0"><p className="text-xs font-medium text-gray-800 truncate">{m.title}</p><p className="text-[10px] text-gray-400">{sec?.display_name}</p></div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      {/* Section sizes */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900">Section Sizes</h3>
          <span className="text-xs text-gray-400">{members.length} total</span>
        </div>
        <div className="space-y-3">
          {sectionSizes.map((s, i) => <SectionBar key={s.name} name={s.name} count={s.members} max={maxSectionSize} color={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </div>
      </motion.div>

      {/* Events + Age */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="font-bold text-gray-900 mb-4">Upcoming Events</h3>
          {upcomingEvents.length === 0 ? <p className="text-sm text-gray-400">No upcoming events</p> : (
            <div className="space-y-3">
              {upcomingEvents.map(e => {
                const daysAway = Math.ceil((new Date(e.start_date) - now) / (1000 * 60 * 60 * 24));
                return (
                  <div key={e.id} className="flex items-center gap-3">
                    <div className="flex-shrink-0 text-center w-10">
                      <p className="text-xs font-black text-[#7413dc]">{format(new Date(e.start_date), 'd')}</p>
                      <p className="text-[9px] text-gray-400 uppercase">{format(new Date(e.start_date), 'MMM')}</p>
                    </div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-800 truncate">{e.title}</p><p className="text-xs text-gray-400">{e.type} · {daysAway === 0 ? 'Today' : daysAway === 1 ? 'Tomorrow' : `in ${daysAway} days`}</p></div>
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full ${daysAway < 7 ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>

        {ageRows.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">Age Distribution</h3>
              <div className="flex flex-wrap gap-2">
                {sections.map((s, i) => (
                  <span key={s.id} className="flex items-center gap-1 text-[10px] text-gray-500">
                    <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                    {s.display_name}
                  </span>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              {ageRows.map(row => <AgeBar key={row.age} age={row.age} total={row.total} sections={sections} sectionData={row} maxTotal={maxAge} />)}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdminSettings() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  // ── URL-driven state ──────────────────────────────────────────────────────────
  const _p = new URLSearchParams(window.location.search);
  const [selectedSection, setSelectedSection] = useState(_p.get('section') || null);
  const [selectedPage,    setSelectedPage]    = useState(_p.get('tab')     || null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedSection) params.set('section', selectedSection);
    if (selectedPage)    params.set('tab', selectedPage);
    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, '', newUrl);
  }, [selectedSection, selectedPage]);

  // ── Other UI state ────────────────────────────────────────────────────────────
  const [selectedUser,        setSelectedUser]        = useState(null);
  const [showEditDialog,      setShowEditDialog]      = useState(false);
  const [editForm,            setEditForm]            = useState({ display_name: '', email: '', user_type: 'parent', section_ids: [], default_section_id: '' });
  const [expandedUserId,      setExpandedUserId]      = useState(null);
  const [uploadingImage,      setUploadingImage]      = useState(false);
  const [showGallerySelector, setShowGallerySelector] = useState(false);
  const [currentImagePage,    setCurrentImagePage]    = useState(null);
  const [gifSize,             setGifSize]             = useState(60);
  const [gifPreviewOpen,      setGifPreviewOpen]      = useState(false);
  const [savingGifSize,       setSavingGifSize]       = useState(false);
  const [galleryView,         setGalleryView]         = useState('camps');
  const [galleryFolder,       setGalleryFolder]       = useState(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: users = [],   isLoading }   = useQuery({ queryKey: ['all-users'],          queryFn: () => base44.entities.User.list() });
  const { data: leaders = [] }              = useQuery({ queryKey: ['all-leaders'],        queryFn: () => base44.entities.Leader.filter({}) });
  const { data: parents = [] }              = useQuery({ queryKey: ['all-parents'],        queryFn: () => base44.entities.Parent.filter({}) });
  const { data: members = [] }              = useQuery({ queryKey: ['all-members-admin'],  queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: allSections = [] }          = useQuery({ queryKey: ['all-sections-admin'], queryFn: () => base44.entities.Section.filter({}) });
  const { data: sections = [] }             = useQuery({ queryKey: ['sections'],           queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: websiteImages = [] }        = useQuery({ queryKey: ['website-images'],     queryFn: () => base44.entities.WebsiteImage.list() });
  const { data: uniformConfigs = [], refetch: refetchUniforms } = useQuery({ queryKey: ['uniform-configs'], queryFn: () => base44.entities.UniformConfig.filter({}) });
  const { data: galleryPhotos = [] }        = useQuery({ queryKey: ['gallery-photos'],     queryFn: () => base44.entities.EventPhoto.filter({}) });
  const { data: events = [] }               = useQuery({ queryKey: ['events-admin'],       queryFn: () => base44.entities.Event.list('-start_date') });
  const { data: programmes = [] }           = useQuery({ queryKey: ['programmes-admin'],   queryFn: () => base44.entities.Programme.list('-date', 200) });
  const { data: gifConfigs = [] }           = useQuery({ queryKey: ['loading-gif-config'], queryFn: () => base44.entities.WebsiteImage.filter({ page: 'loading_gif_config' }) });
  const { data: pageViews = [] }            = useQuery({ queryKey: ['page-views-admin'],   queryFn: () => base44.entities.PageView.filter({}) });

  useEffect(() => { if (gifConfigs[0]) setGifSize(gifConfigs[0].order || 60); }, [gifConfigs]);

  // ── Gallery helpers ───────────────────────────────────────────────────────────
  const galleryCamps    = [...new Map(galleryPhotos.filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type === 'Camp')).map(p => [p.event_id, events.find(e => e.id === p.event_id)])).values()].filter(Boolean).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  const galleryEventsL  = [...new Map(galleryPhotos.filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type !== 'Camp')).map(p => [p.event_id, events.find(e => e.id === p.event_id)])).values()].filter(Boolean).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  const galleryMeetings = [...new Map(galleryPhotos.filter(p => p.programme_id).map(p => [p.programme_id, programmes.find(pr => pr.id === p.programme_id)])).values()].filter(Boolean).sort((a, b) => new Date(b?.date) - new Date(a?.date));
  const getGalleryDisplayPhotos = () => galleryFolder ? galleryPhotos.filter(p => p.event_id === galleryFolder.id || p.programme_id === galleryFolder.id) : galleryPhotos;
  const getImagesForPage = (page) => websiteImages.filter(img => img.page === page).sort((a, b) => (a.order || 0) - (b.order || 0));

  // ── User helpers ──────────────────────────────────────────────────────────────
  const getUserType = (user) => {
    const userId = typeof user === 'string' ? user : user?.id;
    if (typeof user === 'object' && user?.account_type === 'ipad') return { type: 'iPad',   color: 'bg-indigo-100 text-indigo-800' };
    if (leaders.some(l => l.user_id === userId))                   return { type: 'Leader', color: 'bg-blue-100 text-blue-800' };
    if (parents.some(p => p.user_id === userId))                   return { type: 'Parent', color: 'bg-green-100 text-green-800' };
    return { type: 'User', color: 'bg-gray-100 text-gray-800' };
  };

  const handleSaveUniform = async (section, data) => {
    const existing = uniformConfigs.find(u => u.section === section);
    if (existing) await base44.entities.UniformConfig.update(existing.id, data);
    else await base44.entities.UniformConfig.create({ section, ...data });
    refetchUniforms();
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    const userType = getUserType(user);
    const specialRoles = ['admin','treasurer','glv','team_leader'];
    const typeValue = user.account_type === 'ipad' ? 'ipad' : specialRoles.includes(user.role) ? user.role : userType.type === 'Parent' ? 'parent' : userType.type === 'Leader' ? 'leader' : 'user';
    const leaderRecord = leaders.find(l => l.user_id === user.id);
    setEditForm({ display_name: user.display_name || user.full_name, email: user.email, user_type: typeValue, section_ids: leaderRecord?.section_ids || [], default_section_id: user.default_section_id || '' });
    setShowEditDialog(true);
  };

  const handleSaveUser = async () => {
    try {
      const specialRoles = ['admin','treasurer','glv','team_leader'];
      const role = specialRoles.includes(editForm.user_type) ? editForm.user_type : 'user';
      const account_type = editForm.user_type === 'ipad' ? 'ipad' : null;
      const response = await base44.functions.invoke('updateUser', { userId: selectedUser.id, display_name: editForm.display_name, role, default_section_id: editForm.default_section_id || null });
      await base44.entities.User.update(selectedUser.id, { account_type });
      if (response.data?.error) throw new Error(response.data.error);
      const leaderRecord = leaders.find(l => l.user_id === selectedUser.id);
      const currentType = getUserType(selectedUser).type.toLowerCase();
      if (editForm.user_type === 'ipad') { if (leaderRecord) await base44.entities.Leader.delete(leaderRecord.id); }
      else if (editForm.user_type === 'leader') {
        if (currentType !== 'leader') await base44.entities.Leader.create({ user_id: selectedUser.id, phone: '', display_name: editForm.display_name, section_ids: editForm.section_ids });
        else if (leaderRecord)        await base44.entities.Leader.update(leaderRecord.id, { display_name: editForm.display_name, section_ids: editForm.section_ids });
      } else { if (leaderRecord) await base44.entities.Leader.delete(leaderRecord.id); }
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['all-users'] }), queryClient.invalidateQueries({ queryKey: ['all-leaders'] }), queryClient.invalidateQueries({ queryKey: ['all-parents'] })]);
      setShowEditDialog(false);
      toast.success('User updated');
    } catch (error) { toast.error('Error: ' + error.message); }
  };

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const uploadImageMutation = useMutation({
    mutationFn: async ({ page, file, order }) => { const { file_url } = await base44.integrations.Core.UploadFile({ file }); return base44.entities.WebsiteImage.create({ page, image_url: file_url, order: order || 0 }); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['website-images'] }); toast.success('Image uploaded'); },
  });
  const deleteImageMutation = useMutation({
    mutationFn: (id) => base44.entities.WebsiteImage.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['website-images'] }); toast.success('Deleted'); },
  });
  const selectFromGalleryMutation = useMutation({
    mutationFn: async ({ page, imageUrl, order }) => base44.entities.WebsiteImage.create({ page, image_url: imageUrl, order: order || 0 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['website-images'] }); setShowGallerySelector(false); toast.success('Image added'); },
  });
  const sendPasswordResetMutation = useMutation({
    mutationFn: async (email) => base44.integrations.Core.SendEmail({ to: email, subject: 'Password Reset Request', body: 'You have requested a password reset.' }),
    onSuccess: () => toast.success('Password reset email sent'),
  });
  const handleSaveGifSize = async (size) => {
    setSavingGifSize(true);
    try {
      const existing = gifConfigs[0];
      if (existing) await base44.entities.WebsiteImage.update(existing.id, { order: size });
      else await base44.entities.WebsiteImage.create({ page: 'loading_gif_config', image_url: '', order: size });
      queryClient.invalidateQueries({ queryKey: ['loading-gif-config'] });
      toast.success('GIF size saved');
    } catch { toast.error('Failed to save'); } finally { setSavingGifSize(false); }
  };
  const handleFileUpload = async (page, file, order) => {
    setUploadingImage(true);
    try { await uploadImageMutation.mutateAsync({ page, file, order }); } finally { setUploadingImage(false); }
  };

  // ── Page content renderer ─────────────────────────────────────────────────────
  const renderPageContent = (pageKey) => {
    switch (pageKey) {
      case 'analytics': return <ParentPortalAnalyticsPanel />;
      case 'users': return (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />User Management</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? <div className="py-8 text-center"><div className="animate-spin w-8 h-8 border-4 border-[#004851] border-t-transparent rounded-full mx-auto" /></div> : (
              <div className="space-y-2">
                {/* Desktop header */}
                <div className="hidden md:grid grid-cols-4 gap-4 px-4 py-2 bg-gray-50 rounded-lg font-semibold text-sm text-gray-700">
                  <div>Name</div><div>Email</div><div>Type</div><div className="text-right">Actions</div>
                </div>
                {users.map(user => {
                  const userType = getUserType(user);
                  const parentRecord = parents.find(p => p.user_id === user.id);
                  const linkedChildren = parentRecord ? members.filter(m => m.parent_ids?.includes(parentRecord.id)) : [];
                  const lastView = pageViews.filter(v => v.user_email === user.email).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
                  const daysAgo = lastView ? Math.floor((Date.now() - new Date(lastView.timestamp)) / (1000*60*60*24)) : null;
                  const lastLabel = daysAgo === null ? 'Never' : daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;
                  const isExpanded = expandedUserId === user.id;
                  return (
                    <div key={user.id}>
                      {/* Desktop row */}
                      <div className="hidden md:grid grid-cols-4 gap-4 px-4 py-3 bg-white border rounded-lg items-center">
                        <div className="font-medium">{user.display_name || user.full_name}</div>
                        <div className="text-sm text-gray-600 truncate">{user.email}</div>
                        <div><Badge className={userType.color}>{user.role === 'admin' ? 'Admin' : userType.type}</Badge>{linkedChildren.length > 0 && <p className="text-xs text-gray-500 mt-0.5">{linkedChildren.map(c => c.first_name).join(', ')}</p>}<p className="text-xs text-gray-400">{lastLabel}</p></div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEditUser(user)}><Edit className="w-3 h-3 mr-1" />Edit</Button>
                          <Button size="sm" variant="outline" onClick={() => sendPasswordResetMutation.mutate(user.email)} disabled={sendPasswordResetMutation.isPending}><Mail className="w-3 h-3 mr-1" />Reset PW</Button>
                        </div>
                      </div>
                      {/* Mobile expandable card */}
                      <div className="md:hidden bg-white border border-gray-100 rounded-xl overflow-hidden">
                        <button
                          className="w-full flex items-center justify-between px-4 py-3 text-left"
                          onClick={() => setExpandedUserId(isExpanded ? null : user.id)}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#7413dc]/10 flex items-center justify-center text-[#7413dc] font-bold text-sm flex-shrink-0">
                              {(user.display_name || user.full_name || '?').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-gray-900 truncate">{user.display_name || user.full_name}</p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <Badge className={`${userType.color} text-[10px] px-1.5 py-0`}>{user.role === 'admin' ? 'Admin' : userType.type}</Badge>
                                <span className="text-[10px] text-gray-400">{lastLabel}</span>
                              </div>
                            </div>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="px-4 pb-4 pt-1 border-t border-gray-100 space-y-3">
                                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                {linkedChildren.length > 0 && <p className="text-xs text-gray-500">Children: {linkedChildren.map(c => c.first_name).join(', ')}</p>}
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEditUser(user)}><Edit className="w-3.5 h-3.5 mr-1" />Edit</Button>
                                  <Button size="sm" variant="outline" className="flex-1" onClick={() => sendPasswordResetMutation.mutate(user.email)}><Mail className="w-3.5 h-3.5 mr-1" />Reset PW</Button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      );
      case 'leaders':       return <LeaderManagement />;
      case 'sections':      return <SectionSettingsTab sections={allSections} leaders={leaders} queryClient={queryClient} />;
      case 'terms':         return <AdminTermsTab />;
      case 'subs':          return <SubscriptionPricingTab />;
      case 'push':          return <PushNotificationsTab />;
      case 'notif-log':     return <NotificationLogTab />;
      case 'osm-overview':  return <OSMOverview />;
      case 'osm-members':   return <OSMSyncPanel defaultTab="member-sync" />;
      case 'osm-programme': return <OSMSyncPanel defaultTab="programme-sync" />;
      case 'osm-badge-ids': return <OSMBadgeMappingTab />;
      case 'osm-awards':    return <OSMBadgeAwardSync />;
      case 'wa-setup':      return <WhatsAppSetupTab />;
      case 'wa-test':       return <WhatsAppTestTab />;
      case 'manage-badges': return <ManageBadgesPanel />;
      case 'archived-members': return <ArchivedMembersPanel />;
      case 'badge-bulk-award': return (
        <Card className="border-green-200 bg-green-50">
          <CardHeader><CardTitle className="flex items-center gap-2 text-green-900"><Award className="w-5 h-5" />Badge Bulk Award</CardTitle>
            <p className="text-sm text-green-700">Manually complete or batch-award badges to multiple members at once.</p>
          </CardHeader>
          <CardContent><BulkBadgeUpdate /></CardContent>
        </Card>
      );
      case 'website': return (
        <div className="space-y-6">
          <PublicWebsiteSettings />
          <Card className="border-purple-200 bg-purple-50">
            <CardHeader><CardTitle className="flex items-center gap-2 text-purple-900"><Upload className="w-5 h-5" />Loading Screen GIF</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {getImagesForPage('loading_gif')[0] && (
                <div className="relative group w-fit">
                  <img src={getImagesForPage('loading_gif')[0].image_url} alt="GIF" className="h-40 rounded-lg border border-purple-200 object-contain bg-white" />
                  <button onClick={() => deleteImageMutation.mutate(getImagesForPage('loading_gif')[0].id)} className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5" /></button>
                </div>
              )}
              {!getImagesForPage('loading_gif')[0] && <p className="text-sm text-purple-600 italic">No GIF uploaded yet.</p>}
              {getImagesForPage('loading_gif')[0] && (
                <div className="space-y-2 p-4 bg-white rounded-lg border border-purple-200">
                  <Label className="text-purple-900 font-semibold">Size: {gifSize}%</Label>
                  <Slider min={10} max={100} step={5} value={[gifSize]} onValueChange={([v]) => setGifSize(v)} />
                  <Button size="sm" disabled={savingGifSize} onClick={() => handleSaveGifSize(gifSize)} className="bg-purple-600 hover:bg-purple-700 text-white">{savingGifSize ? 'Saving...' : 'Save Size'}</Button>
                </div>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" disabled={uploadingImage} className="border-purple-300 text-purple-700" onClick={() => document.getElementById('loading-gif-upload').click()}>
                  <Upload className="w-4 h-4 mr-2" />{getImagesForPage('loading_gif').length > 0 ? 'Replace GIF' : 'Upload GIF'}
                </Button>
                {getImagesForPage('loading_gif')[0] && <Button type="button" variant="outline" className="border-purple-300 text-purple-700" onClick={() => setGifPreviewOpen(true)}><Play className="w-4 h-4 mr-2" />Preview</Button>}
                <input id="loading-gif-upload" type="file" accept="image/gif,image/*" className="hidden" onChange={async (e) => { const f = e.target.files[0]; if (!f) return; const existing = getImagesForPage('loading_gif')[0]; if (existing) await deleteImageMutation.mutateAsync(existing.id); handleFileUpload('loading_gif', f, 0); }} />
              </div>
            </CardContent>
          </Card>
          {gifPreviewOpen && getImagesForPage('loading_gif')[0] && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white" onClick={() => setGifPreviewOpen(false)}>
              <img src={getImagesForPage('loading_gif')[0].image_url} alt="Preview" style={{ width: `${gifSize}%`, maxHeight: `${gifSize}vh`, objectFit: 'contain' }} />
              <button className="absolute top-4 right-4 p-2 bg-gray-900/70 text-white rounded-full"><X className="w-5 h-5" /></button>
            </div>
          )}
        </div>
      );
      case 'gallery': {
        const totalPhotos  = galleryPhotos.length;
        const sectionCounts = sections.map(s => ({ name: s.display_name, count: galleryPhotos.filter(p => p.section_id === s.id).length })).filter(s => s.count > 0);
        const groupWide    = galleryPhotos.filter(p => p.section_id === 'all').length;
        if (groupWide > 0) sectionCounts.push({ name: 'Group-wide', count: groupWide });
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Card className="border-l-4 border-l-[#7413dc]"><CardContent className="p-4"><p className="text-sm text-gray-600">Total Photos</p><p className="text-3xl font-bold text-[#7413dc]">{totalPhotos}</p></CardContent></Card>
              {sectionCounts.map((s, i) => (<Card key={s.name} style={{ borderLeftColor: CHART_COLORS[i % CHART_COLORS.length] }} className="border-l-4"><CardContent className="p-4"><p className="text-sm text-gray-600">{s.name}</p><p className="text-3xl font-bold">{s.count}</p></CardContent></Card>))}
            </div>
            {sectionCounts.length > 0 && (
              <Card><CardHeader><CardTitle>Photos by Section</CardTitle></CardHeader>
                <CardContent><ResponsiveContainer width="100%" height={280}><RPieChart><Pie data={sectionCounts} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>{sectionCounts.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}</Pie><Tooltip /></RPieChart></ResponsiveContainer></CardContent></Card>
            )}
          </div>
        );
      }
      case 'uniform': return (
        <div className="space-y-4">
          {['scouts','cubs','beavers'].map(sec => (
            <Card key={sec}><CardHeader><CardTitle className="capitalize">{sec} Uniform Diagram</CardTitle></CardHeader>
              <CardContent><UniformPositionEditor uniformConfig={uniformConfigs.find(u => u.section === sec)} onSave={(data) => handleSaveUniform(sec, data)} /></CardContent></Card>
          ))}
        </div>
      );
      default: return <div className="text-gray-400 py-12 text-center">Content coming soon</div>;
    }
  };

  const currentSection = SECTIONS.find(s => s.key === selectedSection);
  const currentStyles  = selectedSection ? SECTION_STYLES[selectedSection] : null;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f5f5f8]">
      <FloatingNav />
      <NavBarSpacer />

      <AnimatePresence mode="wait">
        {!selectedSection ? (
          /* ─── LANDING GRID ─────────────────────────────────────────────────── */
          <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
            className="min-h-[82vh] flex flex-col items-center justify-center px-4 py-16">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="text-center mb-12">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#7413dc] mb-3 bg-purple-100 px-3 py-1 rounded-full">40th Rochdale (Syke) Scouts</span>
              <h1 className="text-4xl sm:text-5xl font-black text-gray-900 mt-2 mb-2 tracking-tight">Admin Area</h1>
              <p className="text-gray-400 text-base">Choose a section to get started</p>
            </motion.div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-5 w-full max-w-3xl">
              {SECTIONS.map((section, idx) => {
                const Icon = section.icon;
                const styles = SECTION_STYLES[section.key];
                return (
                  <motion.button key={section.key} layoutId={`section-card-${section.key}`}
                    initial={{ opacity: 0, y: 30, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.1 + idx * 0.065, type: 'spring', stiffness: 220, damping: 22 }}
                    onClick={() => { setSelectedSection(section.key); setSelectedPage(null); }}
                    whileHover={{ y: -5, scale: 1.03, transition: { duration: 0.18 } }} whileTap={{ scale: 0.97 }}
                    className="relative overflow-hidden rounded-2xl shadow-md hover:shadow-xl transition-shadow text-left">
                    <div className={`bg-gradient-to-br ${styles.bg} p-6 sm:p-7 flex flex-col gap-4 min-h-[150px] sm:min-h-[165px]`}>
                      <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
                      <div className="absolute -bottom-6 -left-3 w-16 h-16 bg-white/10 rounded-full" />
                      <div className="relative w-11 h-11 bg-white/25 rounded-xl flex items-center justify-center"><Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" /></div>
                      <div className="relative"><p className="font-bold text-white text-sm sm:text-base leading-tight">{section.label}</p><p className="text-white/60 text-xs mt-0.5 hidden sm:block">{section.description}</p></div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        ) : (
          /* ─── SECTION VIEW ─────────────────────────────────────────────────── */
          <motion.div key={`section-${selectedSection}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="flex flex-col md:flex-row min-h-[calc(100vh-120px)]">

            {/* ── Mobile top bar ──────────────────────────────────────────── */}
            <div className="md:hidden bg-white border-b border-gray-100 px-3 py-2 flex items-center gap-2 sticky top-0 z-30">
              <button onClick={() => { setSelectedSection(null); setSelectedPage(null); }}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0">
                <ArrowLeft className="w-3.5 h-3.5" />
              </button>
              <motion.div layoutId={`section-card-${selectedSection}`}
                className={`bg-gradient-to-r ${currentStyles.bg} rounded-lg px-3 py-1.5 text-white text-xs font-bold flex items-center gap-1.5 flex-shrink-0 shadow`}>
                {currentSection && <currentSection.icon className="w-3.5 h-3.5" />}
                <span>{currentSection?.label}</span>
              </motion.div>
              {!currentSection?.isDashboard && (
                <Select value={selectedPage || '__none__'} onValueChange={(v) => setSelectedPage(v === '__none__' ? null : v)}>
                  <SelectTrigger className="flex-1 h-8 text-xs min-w-0">
                    <SelectValue placeholder="Select page..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Select page —</SelectItem>
                    {currentSection?.pages?.map(p => (
                      <SelectItem key={p.key} value={p.key}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* ── Desktop sidebar ─────────────────────────────────────────── */}
            <motion.aside initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              className="hidden md:flex w-56 flex-shrink-0 bg-white border-r border-gray-100 flex-col"
              style={{ position: 'sticky', top: 0, height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              {/* Mini section card */}
              <motion.div layoutId={`section-card-${selectedSection}`}
                className={`bg-gradient-to-br ${currentStyles.bg} m-3 rounded-xl p-4 flex items-center gap-3 text-white shadow relative overflow-hidden`}>
                <div className="absolute -top-2 -right-2 w-10 h-10 bg-white/10 rounded-full" />
                {currentSection && <currentSection.icon className="w-5 h-5 flex-shrink-0 relative z-10" />}
                <span className="font-bold text-sm relative z-10 leading-tight">{currentSection?.label}</span>
              </motion.div>
              {/* Back */}
              <button onClick={() => { setSelectedSection(null); setSelectedPage(null); }}
                className="flex items-center gap-2 mx-3 mb-2 text-xs text-gray-400 hover:text-gray-700 transition-colors py-1.5 px-2 rounded-lg hover:bg-gray-50">
                <ArrowLeft className="w-3.5 h-3.5" /> Back to all sections
              </button>
              <div className="h-px bg-gray-100 mx-3 mb-2" />
              {/* Page nav */}
              <nav className="flex-1 px-2 pb-4">
                {currentSection?.isDashboard ? (
                  <button onClick={() => setSelectedPage(null)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all mb-1 ${selectedPage === null ? `${currentStyles.light} ${currentStyles.lightText}` : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800'}`}>
                    <LayoutDashboard className="w-4 h-4 flex-shrink-0" /> Dashboard Overview
                  </button>
                ) : currentSection?.pages?.map((page, idx) => {
                  const PageIcon = page.icon;
                  const isActive = selectedPage === page.key;
                  return (
                    <motion.button key={page.key} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                      onClick={() => page.navigate ? navigate(page.navigate) : setSelectedPage(page.key)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all mb-1 text-left ${isActive ? `${currentStyles.light} ${currentStyles.lightText} font-semibold` : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium'}`}>
                      <PageIcon className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{page.label}</span>
                      {page.navigate && <ChevronRight className="w-3 h-3 ml-auto flex-shrink-0 opacity-40" />}
                    </motion.button>
                  );
                })}
              </nav>
            </motion.aside>

            {/* ── Main content ─────────────────────────────────────────────── */}
            <main className="flex-1 overflow-auto p-4 md:p-6 min-w-0">
              <AnimatePresence mode="wait">
                {currentSection?.isDashboard ? (
                  <motion.div key="dashboard" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 26 }}>
                    <GroupDashboard members={members} sections={sections} events={events} programmes={programmes} />
                  </motion.div>
                ) : !selectedPage ? (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="flex flex-col items-center justify-center h-full text-center py-16">
                    {currentSection && (<>
                      <div className={`w-16 h-16 rounded-2xl ${currentStyles.light} flex items-center justify-center mb-4`}>
                        <currentSection.icon className={`w-8 h-8 ${currentStyles.lightText}`} />
                      </div>
                      <h2 className="text-xl font-bold text-gray-800 mb-2">{currentSection.label}</h2>
                      <p className="text-gray-400 text-sm">Select a page from the sidebar to get started</p>
                    </>)}
                  </motion.div>
                ) : (
                  <motion.div key={selectedPage} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 220, damping: 26 }}>
                    {renderPageContent(selectedPage)}
                  </motion.div>
                )}
              </AnimatePresence>
            </main>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit User Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2"><Label>Display Name</Label><Input value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={editForm.email} disabled className="bg-gray-100" /><p className="text-xs text-gray-500">Email cannot be changed</p></div>
            <div className="space-y-2"><Label>User Type</Label>
              <Select value={editForm.user_type} onValueChange={(value) => setEditForm({ ...editForm, user_type: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem><SelectItem value="leader">Leader</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem><SelectItem value="treasurer">Treasurer</SelectItem>
                  <SelectItem value="glv">GLV</SelectItem><SelectItem value="ipad">iPad (Kiosk)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editForm.user_type === 'leader' && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border"><Label>Assigned Sections</Label>
                {sections.map(section => (
                  <div key={section.id} className="flex items-center space-x-2">
                    <Checkbox id={`section-${section.id}`} checked={editForm.section_ids.includes(section.id)} onCheckedChange={(checked) => setEditForm({ ...editForm, section_ids: checked ? [...editForm.section_ids, section.id] : editForm.section_ids.filter(id => id !== section.id) })} />
                    <Label htmlFor={`section-${section.id}`} className="cursor-pointer">{section.display_name}</Label>
                  </div>
                ))}
              </div>
            )}
            {(['leader','admin','treasurer','glv','team_leader'].includes(editForm.user_type)) && (
              <div className="space-y-2"><Label>Default Section</Label>
                <Select value={editForm.default_section_id || '__none__'} onValueChange={(v) => setEditForm({ ...editForm, default_section_id: v === '__none__' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="No default" /></SelectTrigger>
                  <SelectContent><SelectItem value="__none__">No default</SelectItem>{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <Button onClick={handleSaveUser} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Gallery Selector ──────────────────────────────────────────────────── */}
      <Dialog open={showGallerySelector} onOpenChange={(open) => { setShowGallerySelector(open); if (!open) { setGalleryFolder(null); setGalleryView('camps'); } }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Select from Gallery</DialogTitle></DialogHeader>
          <div className="mt-4">
            {!galleryFolder ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {[['camps','Camps',galleryCamps.length],['events','Events',galleryEventsL.length],['meetings','Meetings',galleryMeetings.length]].map(([key,label,count]) => (
                    <Button key={key} size="sm" variant={galleryView === key ? 'default' : 'outline'} onClick={() => setGalleryView(key)}>{label} ({count})</Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {(galleryView === 'camps' ? galleryCamps : galleryView === 'events' ? galleryEventsL : galleryMeetings).map(item => (
                    <div key={item.id} onClick={() => setGalleryFolder(item)} className="cursor-pointer border rounded-lg p-3 hover:bg-gray-50">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-gray-500">{galleryPhotos.filter(p => p.event_id === item.id || p.programme_id === item.id).length} photos</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button size="sm" variant="outline" onClick={() => setGalleryFolder(null)}>← Back</Button>
                <div className="grid grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                  {getGalleryDisplayPhotos().map(photo => (
                    <div key={photo.id} className="relative group cursor-pointer" onClick={() => { const order = currentImagePage === 'home' ? getImagesForPage('home').length : 0; selectFromGalleryMutation.mutate({ page: currentImagePage, imageUrl: photo.file_url, order }); }}>
                      <img src={photo.file_url} alt="" className="w-full h-40 object-cover rounded-lg group-hover:opacity-75 transition-opacity" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><div className="bg-white rounded-full p-3"><Image className="w-6 h-6 text-[#7413dc]" /></div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}