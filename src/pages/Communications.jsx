import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Mail, MessageSquare, BookOpen, Users, Plus, TrendingUp, Eye, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import LeaderNav from '../components/leader/LeaderNav';
import { toast } from 'sonner';

export default function Communications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [timeFilter, setTimeFilter] = useState('month');

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
      return pubDate >= startDate;
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
      <LeaderNav />
      
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-500 to-emerald-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Communications</h1>
                <p className="mt-1 text-white/80">Manage messages, newsletters, and updates</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                Uncontacted Enquiries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{stats.uncontactedEnquiries}</p>
              <p className="text-sm text-gray-600 mt-2">Require follow-up</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-500" />
                Published Pages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">{stats.publishedPages}</p>
              <p className="text-sm text-gray-600 mt-2">Active communications</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Eye className="w-5 h-5 text-indigo-500" />
                Total Page Views
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-indigo-600">{stats.totalViews}</p>
              <p className="text-sm text-gray-600 mt-2">Across all pages</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Pages */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Recent Communications</CardTitle>
          </CardHeader>
          <CardContent>
            {pages.length === 0 ? (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-600">No communications yet. Create one using the boxes above!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pages.slice(0, 5).map(page => (
                  <div key={page.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors"
                    onClick={() => {
                      const typeMap = {
                        'weekly_message': 'WeeklyMessage',
                        'monthly_newsletter': 'MonthlyNewsletter',
                        'event_update': 'EventUpdate',
                      };
                      navigate(createPageUrl(typeMap[page.type]) + `?pageId=${page.page_id}`);
                    }}
                  >
                    <div>
                      <p className="font-medium">{page.title}</p>
                      <p className="text-sm text-gray-600 capitalize">{page.type.replace('_', ' ')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{page.view_count || 0} views</p>
                      <p className={`text-xs ${page.status === 'published' ? 'text-green-600' : 'text-yellow-600'}`}>
                        {page.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}