import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Award, CheckSquare, Mail, Settings, ArrowRight, Tent, ChevronDown, Image, ShieldAlert, UserCheck, CalendarDays, Receipt } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
    { 
      icon: Users, 
      label: 'Members',
      gradient: 'from-blue-500 to-blue-600',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      dropdown: [
        { label: 'Member Details', page: 'LeaderMembers', icon: Users },
        { label: 'Attendance', page: 'LeaderAttendance', icon: UserCheck },
        { label: 'Parent Portal', page: 'ParentPortal', icon: Users }
      ]
    },
    { 
      icon: Calendar, 
      label: 'Programme',
      gradient: 'from-purple-500 to-purple-600',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      dropdown: [
        { label: 'Weekly Meetings', page: 'LeaderProgramme', icon: Calendar },
        { label: 'Events', page: 'LeaderEvents', icon: CalendarDays }
      ]
    },
    { 
      icon: ShieldAlert, 
      label: 'Risk', 
      page: 'RiskAssessments',
      gradient: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600'
    },
    { 
      icon: Award, 
      label: 'Badges', 
      page: 'LeaderBadges',
      gradient: 'from-green-500 to-green-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600'
    },
    { 
      icon: Mail, 
      label: 'Communications', 
      page: 'Communications',
      gradient: 'from-teal-500 to-teal-600',
      iconBg: 'bg-teal-100',
      iconColor: 'text-teal-600'
    },
    { 
      icon: Image, 
      label: 'Gallery', 
      page: 'LeaderGallery',
      gradient: 'from-pink-500 to-pink-600',
      iconBg: 'bg-pink-100',
      iconColor: 'text-pink-600'
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#004851] to-[#006b7a] text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center"
          >
            <div>
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl font-bold mb-2"
              >
                Leader Portal
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-xl text-white/90"
              >
                Welcome back, {user.display_name || user.full_name}
                {user.role === 'admin' && (
                  <span className="ml-2 px-3 py-1 bg-white/20 rounded-full text-sm">Administrator</span>
                )}
              </motion.p>
            </div>
            {user.role === 'admin' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <Link to={createPageUrl('AdminSettings')}>
                  <Button className="bg-white text-[#004851] hover:bg-gray-100">
                    <Settings className="w-4 h-4 mr-2" />
                    Admin Settings
                  </Button>
                </Link>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {quickActions.map((action, index) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ 
                delay: index * 0.1,
                type: "spring",
                stiffness: 260,
                damping: 20
              }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
            >
              {action.dropdown ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Card className={`cursor-pointer bg-gradient-to-br ${action.gradient} border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden relative group`}>
                      <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                      <CardContent className="p-6 text-center relative z-10">
                        <motion.div 
                          className={`w-14 h-14 mx-auto ${action.iconBg} rounded-2xl flex items-center justify-center mb-3 shadow-md`}
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.6 }}
                        >
                          <action.icon className={`w-7 h-7 ${action.iconColor}`} />
                        </motion.div>
                        <div className="flex items-center justify-center gap-1">
                          <h3 className="text-sm font-semibold text-white">{action.label}</h3>
                          <ChevronDown className="w-3 h-3 text-white" />
                        </div>
                      </CardContent>
                    </Card>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center">
                    {action.dropdown.map((subItem) => (
                      <DropdownMenuItem key={subItem.page} asChild>
                        <Link to={createPageUrl(subItem.page)} className="flex items-center gap-2 cursor-pointer">
                          <subItem.icon className="w-4 h-4" />
                          {subItem.label}
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link to={createPageUrl(action.page)}>
                  <Card className={`cursor-pointer bg-gradient-to-br ${action.gradient} border-0 shadow-lg hover:shadow-xl transition-all overflow-hidden relative group`}>
                    <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                    <CardContent className="p-6 text-center relative z-10">
                      <motion.div 
                        className={`w-14 h-14 mx-auto ${action.iconBg} rounded-2xl flex items-center justify-center mb-3 shadow-md`}
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <action.icon className={`w-7 h-7 ${action.iconColor}`} />
                      </motion.div>
                      <h3 className="text-sm font-semibold text-white">{action.label}</h3>
                    </CardContent>
                  </Card>
                </Link>
              )}
            </motion.div>
          ))}
        </div>

        {/* Dashboard Content */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="grid lg:grid-cols-2 gap-6 mb-6"
        >
          <UpcomingMeetings sections={sections} />
          <BadgesDue sections={sections} />
        </motion.div>

        {/* Receipt Upload Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Receipt className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="text-lg font-semibold">Upload Receipts</h3>
                    <p className="text-white/90 text-sm">Submit your expenses for reimbursement</p>
                  </div>
                </div>
                <Link to={createPageUrl('ReceiptUploader')}>
                  <Button className="bg-white text-emerald-600 hover:bg-white/90">
                    <Receipt className="w-4 h-4 mr-2" />
                    Upload Receipt
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}