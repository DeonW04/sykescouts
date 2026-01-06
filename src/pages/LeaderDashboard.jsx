import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Award, CheckSquare, Mail, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LeaderDashboard() {
  const [user, setUser] = useState(null);
  const [leader, setLeader] = useState(null);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);

    if (currentUser.role !== 'admin') {
      const leaders = await base44.entities.Leader.filter({ user_id: currentUser.id });
      if (leaders.length > 0) {
        setLeader(leaders[0]);
      }
    }
  };

  const { data: sections = [] } = useQuery({
    queryKey: ['sections', leader],
    queryFn: async () => {
      const allSections = await base44.entities.Section.filter({ active: true });
      if (user?.role === 'admin') return allSections;
      if (!leader) return [];
      return allSections.filter(s => leader.section_ids?.includes(s.id));
    },
    enabled: !!user,
  });

  const { data: totalMembers = 0 } = useQuery({
    queryKey: ['total-members', sections],
    queryFn: async () => {
      if (sections.length === 0) return 0;
      const sectionIds = sections.map(s => s.id);
      const members = await base44.entities.Member.filter({ active: true });
      return members.filter(m => sectionIds.includes(m.section_id)).length;
    },
    enabled: sections.length > 0,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const quickActions = [
    { icon: Users, label: 'Members', count: totalMembers, page: 'LeaderMembers' },
    { icon: CheckSquare, label: 'Attendance', count: 0 },
    { icon: Calendar, label: 'Programme', count: 0 },
    { icon: Award, label: 'Badges', count: 0 },
    { icon: Calendar, label: 'Events', count: 0 },
    { icon: Mail, label: 'Communications', count: 0 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#004851] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Leader Portal</h1>
              <p className="mt-2 text-white/80">
                Welcome back, {user.full_name}
                {user.role === 'admin' && ' (Administrator)'}
              </p>
            </div>
            {user.role === 'admin' && (
              <Button className="bg-white text-[#004851] hover:bg-gray-100">
                <Settings className="w-4 h-4 mr-2" />
                Admin Settings
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              {action.page ? (
                <Link to={createPageUrl(action.page)}>
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="p-4 text-center">
                      <div className="w-12 h-12 mx-auto bg-[#004851]/10 rounded-full flex items-center justify-center mb-3">
                        <action.icon className="w-6 h-6 text-[#004851]" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900">{action.label}</h3>
                      {action.count > 0 && (
                        <p className="text-xs text-gray-500 mt-1">{action.count} total</p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ) : (
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 text-center">
                  <div className="w-12 h-12 mx-auto bg-[#004851]/10 rounded-full flex items-center justify-center mb-3">
                    <action.icon className="w-6 h-6 text-[#004851]" />
                  </div>
                  <h3 className="text-sm font-medium text-gray-900">{action.label}</h3>
                  {action.count > 0 && (
                    <p className="text-xs text-gray-500 mt-1">{action.count} total</p>
                  )}
                </CardContent>
              </Card>
              )}
            </motion.div>
          ))}
        </div>

        {/* Sections Overview */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>My Sections</CardTitle>
            </CardHeader>
            <CardContent>
              {sections.length === 0 ? (
                <p className="text-gray-500">No sections assigned.</p>
              ) : (
                <div className="space-y-3">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{section.display_name}</p>
                        <p className="text-sm text-gray-500">
                          {section.meeting_day} {section.meeting_time}
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500">No recent activity.</p>
            </CardContent>
          </Card>
        </div>

        {/* Coming Soon */}
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-green-900 mb-2">Full Management System Coming Soon!</h3>
            <p className="text-green-700 text-sm">
              We're building out complete member management, attendance tracking, badge progress, 
              programme planning, events, and communications. The core database is ready!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}