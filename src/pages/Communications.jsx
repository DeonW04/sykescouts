import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MessageSquare, BookOpen, Users, Plus, TrendingUp, Eye, AlertCircle } from 'lucide-react';
import CustomPushNotification from '../components/admin/CustomPushNotification';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { toast } from 'sonner';

export default function Communications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [timeFilter, setTimeFilter] = useState('month');
  const [sectionFilter, setSectionFilter] = useState('all');

  const { data: pages = [] } = useQuery({
    queryKey: ['communication-pages'],
    queryFn: () => base44.entities.CommunicationPage.filter({}),
  });

  const { data: views = [] } = useQuery({
    queryKey: ['page-views'],
    queryFn: () => base44.entities.PageView.filter({}),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: parents = [] } = useQuery({
    queryKey: ['parents'],
    queryFn: () => base44.entities.Parent.filter({}),
  });

  const { data: enquiries = [] } = useQuery({
    queryKey: ['join-enquiries'],
    queryFn: () => base44.entities.JoinEnquiry.filter({}),
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  // Calculate stats - members with at least one registered parent
  const membersWithRegisteredParents = members.filter(member => {
    // Check by email: parent_one_email or parent_two_email
    const parentEmails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
    if (parentEmails.length === 0) return false;
    
    // Check if any parent email exists in the User entity
    // For now, we check if there are parents linked to this member
    if (!member.parent_ids?.length) return false;
    return member.parent_ids.some(parentId => 
      parents.some(p => p.id === parentId)
    );
  }).length;

  const stats = {
    membersWithParentPortal: membersWithRegisteredParents,
    uncontactedEnquiries: enquiries.filter(e => e.status === 'uncontacted').length,
    totalEnquiries6m: enquiries.filter(e => {
      const createdDate = new Date(e.created_date);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      return createdDate >= sixMonthsAgo;
    }).length,
    publishedPages: pages.filter(p => p.status === 'published').length,
    totalViews: views.length,
  };

  const getPagesByTimeFilter = () => {
    const now = new Date();
    let startDate = new Date();

    switch (timeFilter) {
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3months':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    return pages.filter(p => {
      if (!p.published_date) return false;
      const pubDate = new Date(p.published_date);
      const matchesDate = pubDate >= startDate;
      const matchesSection = sectionFilter === 'all' || p.section_id === sectionFilter;
      return matchesDate && matchesSection;
    });
  };

  const filteredPages = getPagesByTimeFilter();
  const avgOpenRate = filteredPages.length > 0
    ? Math.round((views.filter(v => filteredPages.some(p => p.page_id === v.page_id)).length / (filteredPages.length * 10)) * 100)
    : 0;

  const createPage = async (type) => {
    const pageId = Math.random().toString(36).substring(2, 11);
    await base44.entities.CommunicationPage.create({
      type,
      title: `New ${type.replace('_', ' ')}`,
      page_id: pageId,
      status: 'draft',
      blocks: [],
    });
    queryClient.invalidateQueries({ queryKey: ['communication-pages'] });
    
    const typeMap = {
      'weekly_message': 'WeeklyMessage',
      'monthly_newsletter': 'MonthlyNewsletter',
      'event_update': 'EventUpdate',
    };
    navigate(createPageUrl(typeMap[type]) + `?pageId=${pageId}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
        <div className="max-w-7xl mx-auto">
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Leader Portal</p>
          <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>Communications</h1>
          <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>Manage messages, newsletters, and updates</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Action Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Weekly Message', type: 'weekly_message', page: 'WeeklyMessageList', icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50', count: pages.filter(p => p.type === 'weekly_message').length },
            { label: 'Monthly Newsletter', type: 'monthly_newsletter', page: 'MonthlyNewsletterList', icon: BookOpen, color: 'text-[#7413dc]', bg: 'bg-purple-50', count: pages.filter(p => p.type === 'monthly_newsletter').length },
            { label: 'Event Update', type: 'event_update', page: 'EventUpdateList', icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50', count: pages.filter(p => p.type === 'event_update').length },
            { label: 'Join Enquiries', type: null, page: 'JoinEnquiries', icon: Users, color: 'text-green-600', bg: 'bg-green-50', count: enquiries.length },
          ].map(({ label, page, icon: Icon, color, bg, count }) => (
            <div
              key={label}
              onClick={() => navigate(createPageUrl(page))}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-900">{count}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Uncontacted Enquiries', value: stats.uncontactedEnquiries, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50', sub: 'Require follow-up' },
            { label: 'Published Pages', value: stats.publishedPages, icon: Mail, color: 'text-[#7413dc]', bg: 'bg-purple-50', sub: 'Active communications' },
            { label: 'Total Page Views', value: stats.totalViews, icon: Eye, color: 'text-indigo-600', bg: 'bg-indigo-50', sub: 'Across all pages' },
          ].map(({ label, value, icon: Icon, color, bg, sub }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Push */}
        <div className="mb-6">
          <CustomPushNotification />
        </div>

        {/* Recent Communications */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Recent Communications</h3>
            <Select value={sectionFilter} onValueChange={setSectionFilter}>
              <SelectTrigger className="w-44 bg-gray-50 border-gray-200">
                <SelectValue placeholder="Filter by section" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sections</SelectItem>
                {sections.map(section => (
                  <SelectItem key={section.id} value={section.id}>{section.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="divide-y divide-gray-50">
            {pages.length === 0 ? (
              <div className="p-12 text-center">
                <Mail className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No communications yet</p>
              </div>
            ) : pages.slice(0, 5).map(page => (
              <div
                key={page.id}
                className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => {
                  const typeMap = { 'weekly_message': 'WeeklyMessage', 'monthly_newsletter': 'MonthlyNewsletter', 'event_update': 'EventUpdate' };
                  navigate(createPageUrl(typeMap[page.type]) + `?pageId=${page.page_id}`);
                }}
              >
                <div>
                  <p className="font-medium text-gray-900">{page.title}</p>
                  <p className="text-sm text-gray-500 capitalize">{page.type.replace('_', ' ')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{page.view_count || 0} views</p>
                  <p className={`text-xs font-medium ${page.status === 'published' ? 'text-green-600' : 'text-amber-600'}`}>{page.status}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}