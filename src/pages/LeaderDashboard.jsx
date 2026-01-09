import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Award, CheckSquare, Mail, Settings, ArrowRight, Tent } from 'lucide-react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const UpcomingMeetings = ({ sections }) => {
  const navigate = useNavigate();
  const sectionIds = sections.map(s => s.id);
  
  const { data: programmes = [] } = useQuery({
    queryKey: ['upcoming-programmes', sectionIds],
    queryFn: async () => {
      if (sectionIds.length === 0) return [];
      const allProgrammes = await base44.entities.Programme.filter({});
      return allProgrammes
        .filter(p => sectionIds.includes(p.section_id) && new Date(p.date) >= new Date())
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 5);
    },
    enabled: sectionIds.length > 0,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upcoming Meetings</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('LeaderProgramme'))}>
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {programmes.length === 0 ? (
          <p className="text-gray-500 text-sm">No upcoming meetings scheduled</p>
        ) : (
          <div className="space-y-2">
            {programmes.map(p => {
              const section = sections.find(s => s.id === p.section_id);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => navigate(createPageUrl('MeetingDetail') + `?sectionId=${p.section_id}&date=${p.date}`)}
                >
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-sm text-gray-600">
                      {section?.display_name} • {format(new Date(p.date), 'EEE, MMM d')}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const BadgesDue = ({ sections }) => {
  const navigate = useNavigate();
  const sectionIds = sections.map(s => s.id);

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['awards'],
    queryFn: () => base44.entities.MemberBadgeAward.filter({ award_status: 'pending' }),
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({ active: true }),
  });

  const relevantAwards = awards.filter(a => {
    const member = members.find(m => m.id === a.member_id);
    return member && sectionIds.includes(member.section_id);
  }).slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Badges Due to Award</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('AwardBadges'))}>
            Award <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {relevantAwards.length === 0 ? (
          <p className="text-gray-500 text-sm">No badges due to award</p>
        ) : (
          <div className="space-y-2">
            {relevantAwards.map(award => {
              const member = members.find(m => m.id === award.member_id);
              const badge = badges.find(b => b.id === award.badge_id);
              return (
                <div
                  key={award.id}
                  className="flex items-center justify-between p-3 bg-green-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{member?.full_name}</p>
                    <p className="text-sm text-gray-600">{badge?.name}</p>
                  </div>
                  <Award className="w-5 h-5 text-green-600" />
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

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
    { icon: CheckSquare, label: 'Attendance', count: 0, page: 'LeaderAttendance' },
    { icon: Calendar, label: 'Programme', count: 0, page: 'LeaderProgramme' },
    { icon: Award, label: 'Badges', count: 0, page: 'LeaderBadges' },
    { icon: Tent, label: 'Events', count: 0, page: 'LeaderEvents' },
    { icon: Mail, label: 'Communications', count: 0, page: 'AdminSettings' },
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
              <Link to={createPageUrl('AdminSettings')}>
                <Button className="bg-white text-[#004851] hover:bg-gray-100">
                  <Settings className="w-4 h-4 mr-2" />
                  Admin Settings
                </Button>
              </Link>
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
                </CardContent>
              </Card>
              )}
            </motion.div>
          ))}
        </div>

        {/* Dashboard Content */}
        <div className="grid lg:grid-cols-2 gap-6">
          <UpcomingMeetings sections={sections} />
          <BadgesDue sections={sections} />
        </div>
      </div>
    </div>
  );
}