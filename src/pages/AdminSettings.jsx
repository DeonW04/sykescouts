import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Settings, Users, Shield, Mail, Edit, Image, Upload, X, Award, Download, Camera, PieChart, Bell, BarChart2, Calendar, Play, MessageCircle, Send, TestTube } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { PieChart as RechartsPieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

const NAV_ITEMS = [
  { key: 'users',          label: 'User Management',    icon: Users,    group: 'People' },
  { key: 'leaders',        label: 'Leader Management',  icon: Shield,   group: 'People' },
  { key: 'sections',       label: 'Section Settings',   icon: Users,    group: 'People' },
  { key: 'terms',          label: 'Terms',              icon: Calendar, group: 'People' },
  { key: 'website',        label: 'Public Website',     icon: Image,    group: 'Content' },
  { key: 'badges',         label: 'Badge System',       icon: Award,    group: 'Content' },
  { key: 'uniform',        label: 'Uniform Guide',      icon: Shield,   group: 'Content' },
  { key: 'gallery',        label: 'Gallery Stats',      icon: Camera,   group: 'Content' },
  { key: 'push',           label: 'Push Notifications', icon: Bell,     group: 'System' },
  { key: 'notif-log',      label: 'Notification Log',   icon: Mail,     group: 'System' },
  { key: 'osm-overview',   label: 'Overview',           icon: Award,    group: 'OSM Sync' },
  { key: 'osm-members',    label: 'Member Sync',        icon: Users,    group: 'OSM Sync' },
  { key: 'osm-programme',  label: 'Programme Sync',     icon: Calendar, group: 'OSM Sync' },
  { key: 'osm-badge-ids',  label: 'Badge ID Sync',      icon: Award,    group: 'OSM Sync' },
  { key: 'osm-awards',     label: 'Badge Award Sync',   icon: Award,    group: 'OSM Sync' },
  { key: 'wa-setup',        label: 'Setup',              icon: MessageCircle, group: 'WhatsApp' },
  { key: 'wa-test',         label: 'Test Console',       icon: TestTube,  group: 'WhatsApp' },
];
const GROUPS = [...new Set(NAV_ITEMS.map(n => n.group))];

export default function AdminSettings() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState(urlParams.get('tab') || 'users');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editForm, setEditForm] = useState({ display_name: '', email: '', user_type: 'parent', section_ids: [], default_section_id: '' });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showGallerySelector, setShowGallerySelector] = useState(false);
  const [currentImagePage, setCurrentImagePage] = useState(null);
  const [gifSize, setGifSize] = useState(60);
  const [gifPreviewOpen, setGifPreviewOpen] = useState(false);
  const [savingGifSize, setSavingGifSize] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [galleryView, setGalleryView] = useState('camps');
  const [galleryFolder, setGalleryFolder] = useState(null);

  const { data: users = [], isLoading } = useQuery({ queryKey: ['all-users'], queryFn: () => base44.entities.User.list() });
  const { data: leaders = [] } = useQuery({ queryKey: ['all-leaders'], queryFn: () => base44.entities.Leader.filter({}) });
  const { data: parents = [] } = useQuery({ queryKey: ['all-parents'], queryFn: () => base44.entities.Parent.filter({}) });
  const { data: members = [] } = useQuery({ queryKey: ['all-members-admin'], queryFn: () => base44.entities.Member.filter({ active: true }) });
  const { data: pageViews = [] } = useQuery({ queryKey: ['page-views-admin'], queryFn: () => base44.entities.PageView.filter({}) });
  const { data: allSections = [] } = useQuery({ queryKey: ['all-sections-admin'], queryFn: () => base44.entities.Section.filter({}) });
  const { data: sections = [] } = useQuery({ queryKey: ['sections'], queryFn: () => base44.entities.Section.filter({ active: true }) });
  const { data: websiteImages = [] } = useQuery({ queryKey: ['website-images'], queryFn: () => base44.entities.WebsiteImage.list() });
  const { data: uniformConfigs = [], refetch: refetchUniforms } = useQuery({ queryKey: ['uniform-configs'], queryFn: () => base44.entities.UniformConfig.filter({}) });
  const { data: galleryPhotos = [] } = useQuery({ queryKey: ['gallery-photos'], queryFn: () => base44.entities.EventPhoto.filter({}) });
  const { data: events = [] } = useQuery({ queryKey: ['events-for-gallery'], queryFn: () => base44.entities.Event.list('-start_date') });
  const { data: programmes = [] } = useQuery({ queryKey: ['programmes-for-gallery'], queryFn: () => base44.entities.Programme.list('-date') });
  const { data: gifConfigs = [] } = useQuery({
    queryKey: ['loading-gif-config'],
    queryFn: () => base44.entities.WebsiteImage.filter({ page: 'loading_gif_config' }),
  });

  // Sync gifSize from loaded config
  useEffect(() => {
    if (gifConfigs[0]) setGifSize(gifConfigs[0].order || 60);
  }, [gifConfigs]);

  const handleSaveGifSize = async (size) => {
    setSavingGifSize(true);
    try {
      const existing = gifConfigs[0];
      if (existing) {
        await base44.entities.WebsiteImage.update(existing.id, { order: size });
      } else {
        await base44.entities.WebsiteImage.create({ page: 'loading_gif_config', image_url: '', order: size });
      }
      queryClient.invalidateQueries({ queryKey: ['loading-gif-config'] });
      toast.success('GIF size saved');
    } catch (e) {
      toast.error('Failed to save size');
    } finally {
      setSavingGifSize(false);
    }
  };

  // ── Gallery groupings ──────────────────────────────────────
  const galleryCamps = [...new Map(galleryPhotos.filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type === 'Camp')).map(p => [p.event_id, events.find(e => e.id === p.event_id)])).values()].filter(Boolean).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  const galleryEvents = [...new Map(galleryPhotos.filter(p => p.event_id && events.find(e => e.id === p.event_id && e.type !== 'Camp')).map(p => [p.event_id, events.find(e => e.id === p.event_id)])).values()].filter(Boolean).sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
  const galleryMeetings = [...new Map(galleryPhotos.filter(p => p.programme_id).map(p => [p.programme_id, programmes.find(pr => pr.id === p.programme_id)])).values()].filter(Boolean).sort((a, b) => new Date(b.date) - new Date(a.date));
  const getGalleryDisplayPhotos = () => galleryFolder ? galleryPhotos.filter(p => p.event_id === galleryFolder.id || p.programme_id === galleryFolder.id) : galleryPhotos;

  // ── Helpers ────────────────────────────────────────────────
  const getUserType = (user) => {
    const userId = typeof user === 'string' ? user : user?.id;
    if (typeof user === 'object' && user?.account_type === 'ipad') return { type: 'iPad', color: 'bg-indigo-100 text-indigo-800' };
    if (leaders.some(l => l.user_id === userId)) return { type: 'Leader', color: 'bg-blue-100 text-blue-800' };
    if (parents.some(p => p.user_id === userId)) return { type: 'Parent', color: 'bg-green-100 text-green-800' };
    return { type: 'User', color: 'bg-gray-100 text-gray-800' };
  };

  const handleSaveUniform = async (section, data) => {
    const existing = uniformConfigs.find(u => u.section === section);
    if (existing) { await base44.entities.UniformConfig.update(existing.id, data); }
    else { await base44.entities.UniformConfig.create({ section, ...data }); }
    refetchUniforms();
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    const userType = getUserType(user);
    const specialRoles2 = ['admin','treasurer','glv','team_leader'];
    let typeValue = user.account_type === 'ipad' ? 'ipad' : specialRoles2.includes(user.role) ? user.role : userType.type === 'Parent' ? 'parent' : userType.type === 'Leader' ? 'leader' : 'user';
    const leaderRecord = leaders.find(l => l.user_id === user.id);
    setEditForm({ display_name: user.display_name || user.full_name, email: user.email, user_type: typeValue, section_ids: leaderRecord?.section_ids || [], default_section_id: user.default_section_id || '' });
    setShowEditDialog(true);
  };

  const handleSaveUser = async () => {
    try {
      const specialRoles = ['admin','treasurer','glv','team_leader']; // team_leader set via Section Settings only
      const role = specialRoles.includes(editForm.user_type) ? editForm.user_type : 'user';
      const account_type = editForm.user_type === 'ipad' ? 'ipad' : null;
      const response = await base44.functions.invoke('updateUser', { userId: selectedUser.id, display_name: editForm.display_name, role, default_section_id: editForm.default_section_id || null });
      await base44.entities.User.update(selectedUser.id, { account_type });
      if (response.data?.error) throw new Error(response.data.error);
      const leaderRecord = leaders.find(l => l.user_id === selectedUser.id);
      const currentType = getUserType(selectedUser).type.toLowerCase();
      if (editForm.user_type === 'ipad') { if (leaderRecord) await base44.entities.Leader.delete(leaderRecord.id); }
      else if (editForm.user_type === 'leader') {
        if (currentType !== 'leader') { await base44.entities.Leader.create({ user_id: selectedUser.id, phone: '', display_name: editForm.display_name, section_ids: editForm.section_ids }); }
        else if (leaderRecord) { await base44.entities.Leader.update(leaderRecord.id, { display_name: editForm.display_name, section_ids: editForm.section_ids }); }
      } else { if (leaderRecord) await base44.entities.Leader.delete(leaderRecord.id); }
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['all-users'] }), queryClient.invalidateQueries({ queryKey: ['all-leaders'] }), queryClient.invalidateQueries({ queryKey: ['all-parents'] })]);
      setShowEditDialog(false);
      toast.success('User updated successfully');
    } catch (error) { toast.error('Error updating user: ' + error.message); }
  };

  const getImagesForPage = (page) => websiteImages.filter(img => img.page === page).sort((a, b) => (a.order || 0) - (b.order || 0));

  const uploadImageMutation = useMutation({
    mutationFn: async ({ page, file, order }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      return base44.entities.WebsiteImage.create({ page, image_url: file_url, order: order || 0 });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['website-images'] }); toast.success('Image uploaded successfully'); },
  });

  const deleteImageMutation = useMutation({
    mutationFn: (imageId) => base44.entities.WebsiteImage.delete(imageId),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['website-images'] }); toast.success('Image deleted'); },
  });

  const selectFromGalleryMutation = useMutation({
    mutationFn: async ({ page, imageUrl, order }) => base44.entities.WebsiteImage.create({ page, image_url: imageUrl, order: order || 0 }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['website-images'] }); setShowGallerySelector(false); toast.success('Image added from gallery'); },
  });

  const sendPasswordResetMutation = useMutation({
    mutationFn: async (email) => base44.integrations.Core.SendEmail({ to: email, subject: 'Password Reset Request', body: 'You have requested a password reset.' }),
    onSuccess: () => toast.success('Password reset email sent'),
    onError: (e) => toast.error('Error: ' + e.message),
  });

  const handleExportData = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke('exportAllData', {});
      const blob = new Blob([new Uint8Array(response.data)], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `scout-data-export-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url); a.remove();
      toast.success('Data exported successfully');
    } catch (error) { toast.error('Export failed: ' + error.message); }
    finally { setExporting(false); }
  };

  const handleFileUpload = async (page, file, order) => {
    setUploadingImage(true);
    try { await uploadImageMutation.mutateAsync({ page, file, order }); }
    finally { setUploadingImage(false); }
  };

  const COLORS = ['#7413dc', '#004851', '#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#14b8a6'];

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '16px' }}>
        <div className="max-w-7xl mx-auto flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Admin</p>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(20px, 3vw, 32px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>Admin Settings</h1>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>Manage system configuration and users</p>
          </div>
          <button onClick={() => navigate(createPageUrl('ParentPortalAnalytics'))} className="flex items-center gap-2 text-xs font-semibold border border-[#7413dc] text-[#7413dc] hover:bg-[#7413dc] hover:text-white px-3 py-2 rounded-lg transition-colors flex-shrink-0">
            <BarChart2 className="w-3.5 h-3.5" /><span className="hidden sm:inline">Parent Portal</span> Analytics
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">

          {/* Sidebar — desktop */}
          <aside className="w-56 flex-shrink-0 hidden md:block">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-4">
              {GROUPS.map(group => (
                <div key={group}>
                  <p className="px-4 pt-4 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{group}</p>
                  {NAV_ITEMS.filter(n => n.group === group).map(item => {
                    const Icon = item.icon;
                    const active = activeTab === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setActiveTab(item.key)}
                        className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors text-left ${active ? 'bg-[#7413dc] text-white font-semibold' : 'text-gray-600 hover:bg-gray-50'}`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </aside>

          {/* Mobile: dropdown nav */}
          <div className="md:hidden w-full mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-white border-gray-200 rounded-xl h-12 text-sm font-semibold">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GROUPS.map(group => (
                  <React.Fragment key={group}>
                    <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{group}</div>
                    {NAV_ITEMS.filter(n => n.group === group).map(item => (
                      <SelectItem key={item.key} value={item.key} className="pl-5">
                        {item.label}
                      </SelectItem>
                    ))}
                  </React.Fragment>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Main content — full width on mobile */}
          <div className="flex-1 min-w-0 w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="hidden"><TabsTrigger value="_" /></TabsList>

              {/* ── Users ── */}
              <TabsContent value="users">
                <Card>
                  <CardHeader><CardTitle className="flex items-center gap-2"><Users className="w-5 h-5" />User Management</CardTitle></CardHeader>
                  <CardContent>
                    {isLoading ? (
                      <div className="text-center py-8"><div className="animate-spin w-8 h-8 border-4 border-[#004851] border-t-transparent rounded-full mx-auto mb-4" /></div>
                    ) : (
                      <div className="space-y-2">
                        {/* Desktop header */}
                        <div className="hidden md:grid grid-cols-4 gap-4 px-4 py-2 bg-gray-50 rounded-lg font-semibold text-sm text-gray-700">
                          <div>Name</div><div>Email</div><div>Type / Info</div><div className="text-right">Actions</div>
                        </div>
                        {users.map(user => {
                          const userType = getUserType(user);
                          const parentRecord = parents.find(p => p.user_id === user.id);
                          const linkedChildren = parentRecord ? members.filter(m => m.parent_ids?.includes(parentRecord.id)) : [];
                          const lastView = pageViews.filter(v => v.user_email === user.email).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0];
                          const lastLogin = lastView ? new Date(lastView.timestamp) : null;
                          const daysAgo = lastLogin ? Math.floor((Date.now() - lastLogin) / (1000*60*60*24)) : null;
                          const lastLoginLabel = daysAgo === null ? 'Never' : daysAgo === 0 ? 'Today' : daysAgo === 1 ? 'Yesterday' : `${daysAgo}d ago`;
                          return (
                            <div key={user.id}>
                              {/* Desktop row */}
                              <div className="hidden md:grid grid-cols-4 gap-4 px-4 py-3 bg-white border rounded-lg items-center">
                                <div className="font-medium">{user.display_name || user.full_name}</div>
                                <div className="text-sm text-gray-600 truncate">{user.email}</div>
                                <div className="space-y-0.5">
                                  <Badge className={userType.color}>{user.role === 'admin' ? 'Admin' : userType.type}</Badge>
                                  {linkedChildren.length > 0 && <p className="text-xs text-gray-500">{linkedChildren.map(c => c.first_name).join(', ')}</p>}
                                  <p className="text-xs text-gray-400">Last login: {lastLoginLabel}</p>
                                </div>
                                <div className="flex justify-end gap-2">
                                  <Button size="sm" variant="outline" onClick={() => handleEditUser(user)}><Edit className="w-3 h-3 mr-1" />Edit</Button>
                                  <Button size="sm" variant="outline" onClick={() => sendPasswordResetMutation.mutate(user.email)} disabled={sendPasswordResetMutation.isPending}><Mail className="w-3 h-3 mr-1" />Reset PW</Button>
                                </div>
                              </div>
                              {/* Mobile card */}
                              <div className="md:hidden bg-white border border-gray-100 rounded-xl p-4 space-y-3">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-sm text-gray-900">{user.display_name || user.full_name}</p>
                                    <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                      <Badge className={`${userType.color} text-xs`}>{user.role === 'admin' ? 'Admin' : userType.type}</Badge>
                                      {linkedChildren.length > 0 && <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">👦 {linkedChildren.map(c => c.first_name).join(', ')}</span>}
                                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">🕐 {lastLoginLabel}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" variant="outline" className="flex-1" onClick={() => handleEditUser(user)}><Edit className="w-3.5 h-3.5 mr-1.5" />Edit User</Button>
                                  <Button size="sm" variant="outline" className="flex-1" onClick={() => sendPasswordResetMutation.mutate(user.email)} disabled={sendPasswordResetMutation.isPending}><Mail className="w-3.5 h-3.5 mr-1.5" />Reset Password</Button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ── Leaders ── */}
              <TabsContent value="leaders"><LeaderManagement /></TabsContent>

              {/* ── Sections ── */}
              <TabsContent value="sections">
                <SectionSettingsTab sections={allSections} leaders={leaders} queryClient={queryClient} />
              </TabsContent>

              {/* ── Terms ── */}
              <TabsContent value="terms">
                <AdminTermsTab />
              </TabsContent>

              {/* ── Public Website Settings (now includes loading GIF) ── */}
              <TabsContent value="website">
                <div className="space-y-6">
                  <PublicWebsiteSettings />
                  {/* Loading Screen GIF */}
                  <Card className="border-purple-200 bg-purple-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-purple-900"><Upload className="w-5 h-5" />Loading Screen GIF</CardTitle>
                      <p className="text-sm text-purple-700">Plays as a loading animation on the Home page, Leader Portal, and Parent Portal on first visit per session.</p>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {getImagesForPage('loading_gif')[0] && (
                        <div className="relative group w-fit">
                          <img src={getImagesForPage('loading_gif')[0].image_url} alt="Loading GIF" className="h-48 rounded-lg border border-purple-200 object-contain bg-white" />
                          <button onClick={() => deleteImageMutation.mutate(getImagesForPage('loading_gif')[0].id)} className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                        </div>
                      )}
                      {!getImagesForPage('loading_gif')[0] && <p className="text-sm text-purple-600 italic">No loading GIF uploaded yet.</p>}
                      {getImagesForPage('loading_gif')[0] && (
                        <div className="space-y-3 p-4 bg-white rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between">
                            <Label className="text-purple-900 font-semibold">Display Size: {gifSize}%</Label>
                            <span className="text-xs text-purple-600">of screen width</span>
                          </div>
                          <Slider min={10} max={100} step={5} value={[gifSize]} onValueChange={([v]) => setGifSize(v)} className="w-full" />
                          <div className="flex items-center justify-between text-xs text-purple-500"><span>Small (10%)</span><span>Full (100%)</span></div>
                          <Button size="sm" disabled={savingGifSize} onClick={() => handleSaveGifSize(gifSize)} className="bg-purple-600 hover:bg-purple-700 text-white">{savingGifSize ? 'Saving...' : 'Save Size'}</Button>
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" variant="outline" disabled={uploadingImage} className="border-purple-300 text-purple-700 hover:bg-purple-100" onClick={() => document.getElementById('loading-gif-upload').click()}>
                          <Upload className="w-4 h-4 mr-2" />{getImagesForPage('loading_gif').length > 0 ? 'Replace GIF' : 'Upload GIF'}
                        </Button>
                        {getImagesForPage('loading_gif')[0] && (
                          <Button type="button" variant="outline" className="border-purple-300 text-purple-700 hover:bg-purple-100" onClick={() => setGifPreviewOpen(true)}>
                            <Play className="w-4 h-4 mr-2" />Preview
                          </Button>
                        )}
                        <input id="loading-gif-upload" type="file" accept="image/gif,image/*" className="hidden" onChange={async (e) => { const f = e.target.files[0]; if (!f) return; const existing = getImagesForPage('loading_gif')[0]; if (existing) await deleteImageMutation.mutateAsync(existing.id); handleFileUpload('loading_gif', f, 0); }} />
                      </div>
                    </CardContent>
                  </Card>
                  {gifPreviewOpen && getImagesForPage('loading_gif')[0] && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white" onClick={() => setGifPreviewOpen(false)}>
                      <img src={getImagesForPage('loading_gif')[0].image_url} alt="Preview" style={{ width: `${gifSize}%`, maxHeight: `${gifSize}vh`, objectFit: 'contain' }} />
                      <button className="absolute top-4 right-4 p-2 bg-gray-900/70 text-white rounded-full" onClick={() => setGifPreviewOpen(false)}><X className="w-5 h-5" /></button>
                      <p className="absolute bottom-6 text-gray-500 text-sm">Click anywhere to close</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* ── Badges ── */}
              <TabsContent value="badges">
                <div className="space-y-6">
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-2"><Award className="w-5 h-5" />Badge System Management</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-600">Manage the badge structure and definitions for your sections.</p>
                      <Button onClick={() => navigate(createPageUrl('ManageBadges'))} className="bg-[#7413dc] hover:bg-[#5c0fb0]"><Award className="w-4 h-4 mr-2" />Manage Badges</Button>
                    </CardContent>
                  </Card>
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-green-900"><Award className="w-5 h-5" />Bulk Badge Completion</CardTitle></CardHeader>
                    <CardContent><p className="text-gray-600 mb-4">Manually complete badges in bulk for members.</p><BulkBadgeUpdate /></CardContent>
                  </Card>
                  <Card className="border-purple-200 bg-purple-50">
                    <CardHeader><CardTitle className="flex items-center gap-2 text-purple-900"><Upload className="w-5 h-5" />Import Badges from CSV</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-gray-600">Import badge definitions, modules, and requirements from CSV files.</p>
                      <Button onClick={() => navigate(createPageUrl('ImportBadges'))} className="bg-purple-600 hover:bg-purple-700"><Upload className="w-4 h-4 mr-2" />Import Badges</Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* ── Uniform ── */}
              <TabsContent value="uniform">
                <Tabs defaultValue="scouts">
                  <TabsList><TabsTrigger value="scouts">Scouts</TabsTrigger><TabsTrigger value="cubs">Cubs</TabsTrigger><TabsTrigger value="beavers">Beavers</TabsTrigger></TabsList>
                  {['scouts', 'cubs', 'beavers'].map(sec => (
                    <TabsContent key={sec} value={sec}>
                      <Card>
                        <CardHeader><CardTitle className="capitalize">{sec} Uniform Diagram</CardTitle></CardHeader>
                        <CardContent><UniformPositionEditor uniformConfig={uniformConfigs.find(u => u.section === sec)} onSave={(data) => handleSaveUniform(sec, data)} /></CardContent>
                      </Card>
                    </TabsContent>
                  ))}
                </Tabs>
              </TabsContent>

              {/* ── Gallery Stats ── */}
              <TabsContent value="gallery">
                {(() => {
                  const totalPhotos = galleryPhotos.length;
                  const sectionCounts = sections.map(s => ({ name: s.display_name, count: galleryPhotos.filter(p => p.section_id === s.id).length })).filter(s => s.count > 0);
                  const groupWide = galleryPhotos.filter(p => p.section_id === 'all').length;
                  if (groupWide > 0) sectionCounts.push({ name: 'Group-wide', count: groupWide });
                  return (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="border-l-4 border-l-[#7413dc]"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600 mb-1">Total Photos</p><p className="text-3xl font-bold text-[#7413dc]">{totalPhotos}</p></div><Camera className="w-8 h-8 text-[#7413dc]" /></div></CardContent></Card>
                        {sectionCounts.map((s, i) => (<Card key={s.name} style={{ borderLeftColor: COLORS[i % COLORS.length] }} className="border-l-4"><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-sm text-gray-600 mb-1">{s.name}</p><p className="text-3xl font-bold">{s.count}</p></div><Camera className="w-8 h-8 text-gray-400" /></div></CardContent></Card>))}
                      </div>
                      {sectionCounts.length > 0 && (
                        <Card>
                          <CardHeader><CardTitle className="flex items-center gap-2"><PieChart className="w-5 h-5" />Photos by Section</CardTitle></CardHeader>
                          <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                              <RechartsPieChart>
                                <Pie data={sectionCounts} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${Math.round(percent * 100)}%`}>
                                  {sectionCounts.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  );
                })()}
              </TabsContent>



              {/* ── Push Notifications ── */}
              <TabsContent value="push"><PushNotificationsTab /></TabsContent>

              {/* ── Notification Log ── */}
              <TabsContent value="notif-log"><NotificationLogTab /></TabsContent>


              {/* ── OSM Overview ── */}
              <TabsContent value="osm-overview"><OSMOverview /></TabsContent>

              {/* ── OSM Member Sync ── */}
              <TabsContent value="osm-members"><OSMSyncPanel defaultTab="member-sync" /></TabsContent>

              {/* ── OSM Programme Sync ── */}
              <TabsContent value="osm-programme"><OSMSyncPanel defaultTab="programme-sync" /></TabsContent>

              {/* ── OSM Badge ID Sync ── */}
              <TabsContent value="osm-badge-ids">
                <OSMSyncPanel defaultTab="badge-sync" />
              </TabsContent>

              {/* ── OSM Badge Award Sync ── */}
              <TabsContent value="osm-awards"><OSMBadgeAwardSync /></TabsContent>

              {/* ── WhatsApp Setup ── */}
              <TabsContent value="wa-setup"><WhatsAppSetupTab /></TabsContent>

              {/* ── WhatsApp Test ── */}
              <TabsContent value="wa-test"><WhatsAppTestTab /></TabsContent>


            </Tabs>
          </div>
        </div>
      </div>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="edit_display_name">Display Name</Label>
              <Input id="edit_display_name" value={editForm.display_name} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_email">Email Address</Label>
              <Input id="edit_email" type="email" value={editForm.email} disabled className="bg-gray-100" />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>
            <div className="space-y-2">
              <Label>User Type</Label>
              <Select value={editForm.user_type} onValueChange={(value) => setEditForm({ ...editForm, user_type: value })}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="parent">Parent</SelectItem>
                  <SelectItem value="leader">Leader</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="treasurer">Treasurer</SelectItem>
                  <SelectItem value="glv">GLV</SelectItem>
                  <SelectItem value="ipad">iPad (Kiosk)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editForm.user_type === 'leader' && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg border">
                <Label>Assigned Sections</Label>
                <div className="space-y-2">
                  {sections.map(section => (
                    <div key={section.id} className="flex items-center space-x-2">
                      <Checkbox id={`section-${section.id}`} checked={editForm.section_ids.includes(section.id)} onCheckedChange={(checked) => setEditForm({ ...editForm, section_ids: checked ? [...editForm.section_ids, section.id] : editForm.section_ids.filter(id => id !== section.id) })} />
                      <Label htmlFor={`section-${section.id}`} className="cursor-pointer">{section.display_name}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(['leader', 'admin', 'treasurer', 'glv', 'team_leader'].includes(editForm.user_type)) && (
              <div className="space-y-2">
                <Label>Default Section</Label>
                <Select value={editForm.default_section_id || '__none__'} onValueChange={(v) => setEditForm({ ...editForm, default_section_id: v === '__none__' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="No default" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No default</SelectItem>
                    {sections.map(s => <SelectItem key={s.id} value={s.id}>{s.display_name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">Which section this user sees first when they log in</p>
              </div>
            )}
            <Button onClick={handleSaveUser} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Gallery Selector Dialog */}
      <Dialog open={showGallerySelector} onOpenChange={(open) => { setShowGallerySelector(open); if (!open) { setGalleryFolder(null); setGalleryView('camps'); } }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Select from Gallery</DialogTitle></DialogHeader>
          <div className="mt-4">
            {!galleryFolder ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  {[['camps', 'Camps', galleryCamps.length], ['events', 'Events', galleryEvents.length], ['meetings', 'Meetings', galleryMeetings.length]].map(([key, label, count]) => (
                    <Button key={key} size="sm" variant={galleryView === key ? 'default' : 'outline'} onClick={() => setGalleryView(key)}>{label} ({count})</Button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                  {(galleryView === 'camps' ? galleryCamps : galleryView === 'events' ? galleryEvents : galleryMeetings).map(item => (
                    <div key={item.id} onClick={() => setGalleryFolder(item)} className="cursor-pointer border rounded-lg p-3 hover:bg-gray-50">
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-gray-500">{galleryPhotos.filter(p => p.event_id === item.id || p.programme_id === item.id).length} photos</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Button size="sm" variant="outline" onClick={() => setGalleryFolder(null)}>← Back to folders</Button>
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