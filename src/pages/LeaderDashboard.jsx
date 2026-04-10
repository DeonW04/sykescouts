import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { useSectionContext } from '../components/leader/SectionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Award, Mail, Settings, ArrowRight, Tent, ChevronDown, Image, ShieldAlert, UserCheck, CalendarDays, Receipt, Lightbulb, Package, TrendingUp, FileText } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

const UpcomingMeetings = ({ sections, selectedSection }) => {
  const navigate = useNavigate();
  const filteredSections = selectedSection ? sections.filter(s => s.id === selectedSection) : sections;
  const sectionIds = filteredSections.map(s => s.id);
  
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

const BadgesDue = ({ sections, selectedSection }) => {
  const navigate = useNavigate();
  const filteredSections = selectedSection ? sections.filter(s => s.id === selectedSection) : sections;
  const sectionIds = filteredSections.map(s => s.id);

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: awards = [] } = useQuery({
    queryKey: ['awards'],
    queryFn: () => base44.entities.MemberBadgeAward.filter({ award_status: 'pending' }),
  });

  const relevantAwards = awards.filter(a => {
    const member = members.find(m => m.id === a.member_id);
    return member && sectionIds.includes(member.section_id);
  });

  const uniqueMembers = new Set(relevantAwards.map(a => a.member_id)).size;

  if (relevantAwards.length === 0) return null;

  return (
    <div
      className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-3 cursor-pointer hover:from-green-100 hover:to-emerald-100 transition-colors"
      onClick={() => navigate(createPageUrl('AwardBadges'))}
    >
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Award className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-semibold text-gray-900 text-sm">Badges Ready to Award</p>
          <p className="text-xs text-gray-500">{uniqueMembers} {uniqueMembers === 1 ? 'member' : 'members'} waiting</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold text-green-600">{relevantAwards.length}</span>
        <ArrowRight className="w-4 h-4 text-green-500" />
      </div>
    </div>
  );
};

const UpcomingEvents = ({ sections, selectedSection }) => {
  const navigate = useNavigate();
  const filteredSections = selectedSection ? sections.filter(s => s.id === selectedSection) : sections;
  const sectionIds = filteredSections.map(s => s.id);

  const { data: events = [] } = useQuery({
    queryKey: ['upcoming-events-dashboard', sectionIds],
    queryFn: async () => {
      if (sectionIds.length === 0) return [];
      const allEvents = await base44.entities.Event.filter({});
      return allEvents
        .filter(e => e.section_ids?.some(sid => sectionIds.includes(sid)) && new Date(e.start_date) >= new Date())
        .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
        .slice(0, 4);
    },
    enabled: sectionIds.length > 0,
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upcoming Events</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl('LeaderEvents'))}>
            View All <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-gray-500 text-sm">No upcoming events</p>
        ) : (
          <div className="space-y-2">
            {events.map(e => (
              <div
                key={e.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                onClick={() => navigate(createPageUrl('EventDetail') + `?id=${e.id}`)}
              >
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Tent className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{e.title}</p>
                  <p className="text-xs text-gray-500">{format(new Date(e.start_date), 'EEE, d MMM yyyy')} · {e.type}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ActionsStatus = ({ sections, selectedSection }) => {
  const filteredSections = selectedSection ? sections.filter(s => s.id === selectedSection) : sections;
  const sectionIds = filteredSections.map(s => s.id);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['actions-status-dashboard', sectionIds],
    queryFn: async () => {
      if (sectionIds.length === 0) return null;
      const now = new Date();
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const [allActions, allAssignments, allResponses, allEvents, allProgrammes] = await Promise.all([
        base44.entities.ActionRequired.filter({}),
        base44.entities.ActionAssignment.filter({}),
        base44.entities.ActionResponse.filter({}),
        base44.entities.Event.filter({}),
        base44.entities.Programme.filter({}),
      ]);

      // Filter to actions for our sections that are not past
      const relevantActions = allActions.filter(a => {
        if (!a.is_open) return false;
        if (a.event_id) {
          const ev = allEvents.find(e => e.id === a.event_id);
          if (!ev) return false;
          if (new Date(ev.start_date) < now) return false;
          return ev.section_ids?.some(sid => sectionIds.includes(sid));
        }
        if (a.programme_id) {
          const prog = allProgrammes.find(p => p.id === a.programme_id);
          if (!prog) return false;
          if (new Date(prog.date) < now) return false;
          return sectionIds.includes(prog.section_id);
        }
        return false;
      });

      const actionIds = relevantActions.map(a => a.id);
      const relevantAssignments = allAssignments.filter(a => actionIds.includes(a.action_required_id));
      const relevantResponses = allResponses.filter(r => actionIds.includes(r.action_required_id) && r.response_value);

      const respondedPairs = new Set(relevantResponses.map(r => `${r.action_required_id}:${r.member_id}`));
      const unrespondedAssignments = relevantAssignments.filter(
        a => !respondedPairs.has(`${a.action_required_id}:${a.member_id}`)
      );

      // Unique parents with outstanding items
      const unrespondedMemberIds = new Set(unrespondedAssignments.map(a => a.member_id));

      // Actions closing within 7 days
      const closingSoon = relevantActions.filter(a => a.deadline && new Date(a.deadline) <= sevenDays && new Date(a.deadline) >= now);

      // Response rate
      const responseRate = relevantAssignments.length > 0
        ? Math.round((relevantResponses.length / relevantAssignments.length) * 100)
        : 100;

      // Count by action type
      const attendanceActions = relevantActions.filter(a => a.action_purpose === 'attendance').length;
      const consentActions = relevantActions.filter(a => a.action_purpose === 'consent' || a.action_purpose === 'consent_form').length;
      const volunteerActions = relevantActions.filter(a => a.action_purpose === 'volunteer').length;

      return {
        totalActions: relevantActions.length,
        totalAssignments: relevantAssignments.length,
        responded: relevantResponses.length,
        unresponded: unrespondedAssignments.length,
        unrespondedMembers: unrespondedMemberIds.size,
        closingSoon: closingSoon.length,
        responseRate,
        attendanceActions,
        consentActions,
        volunteerActions,
      };
    },
    enabled: sectionIds.length > 0,
  });

  if (isLoading || !stats) return null;

  const statCards = [
    { label: 'Active Actions', value: stats.totalActions, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { label: 'Response Rate', value: `${stats.responseRate}%`, color: stats.responseRate >= 75 ? 'text-green-600' : stats.responseRate >= 50 ? 'text-orange-500' : 'text-red-500', bg: stats.responseRate >= 75 ? 'bg-green-50' : stats.responseRate >= 50 ? 'bg-orange-50' : 'bg-red-50', border: stats.responseRate >= 75 ? 'border-green-200' : stats.responseRate >= 50 ? 'border-orange-200' : 'border-red-200' },
    { label: 'Awaiting Response', value: stats.unresponded, color: stats.unresponded === 0 ? 'text-green-600' : 'text-orange-500', bg: stats.unresponded === 0 ? 'bg-green-50' : 'bg-orange-50', border: stats.unresponded === 0 ? 'border-green-200' : 'border-orange-200' },
    { label: 'Members Outstanding', value: stats.unrespondedMembers, color: stats.unrespondedMembers === 0 ? 'text-green-600' : 'text-red-500', bg: stats.unrespondedMembers === 0 ? 'bg-green-50' : 'bg-red-50', border: stats.unrespondedMembers === 0 ? 'border-green-200' : 'border-red-200' },
    { label: 'Closing Within 7 Days', value: stats.closingSoon, color: stats.closingSoon > 0 ? 'text-amber-600' : 'text-gray-500', bg: stats.closingSoon > 0 ? 'bg-amber-50' : 'bg-gray-50', border: stats.closingSoon > 0 ? 'border-amber-200' : 'border-gray-200' },
    { label: 'Attendance Actions', value: stats.attendanceActions, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    { label: 'Consent Actions', value: stats.consentActions, color: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-200' },
    { label: 'Volunteer Requests', value: stats.volunteerActions, color: 'text-pink-600', bg: 'bg-pink-50', border: 'border-pink-200' },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
            <Mail className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <CardTitle>Actions Required — Status</CardTitle>
            <p className="text-xs text-gray-400 mt-0.5">Active actions for upcoming meetings & events only</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {stats.totalActions === 0 ? (
          <p className="text-gray-500 text-sm">No active actions for upcoming sessions</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {statCards.map(stat => (
              <div key={stat.label} className={`${stat.bg} border ${stat.border} rounded-xl p-3 text-center`}>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500 mt-1 leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default function LeaderDashboard() {
  const [user, setUser] = useState(null);
  const [leader, setLeader] = useState(null);
  const { selectedSection } = useSectionContext();

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
        { label: 'Events', page: 'LeaderEvents', icon: CalendarDays },
        { label: 'Ideas Board', page: 'IdeasBoard', icon: Lightbulb }
      ]
    },
    { 
      icon: ShieldAlert, 
      label: 'Safety', 
      gradient: 'from-orange-500 to-orange-600',
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      dropdown: [
        { label: 'Risk Assessments', page: 'RiskAssessments', icon: ShieldAlert },
        { label: 'Consent Forms', page: 'ConsentForms', icon: FileText },
      ]
    },
    { 
      icon: Award, 
      label: 'Badges', 
      gradient: 'from-green-500 to-green-600',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      dropdown: [
        { label: 'Badge Tracking', page: 'LeaderBadges', icon: Award },
        { label: 'Due Badges', page: 'AwardBadges', icon: TrendingUp },
        { label: 'Badge Stock', page: 'BadgeStockManagement', icon: Package },
        ...(user?.role === 'admin' ? [{ label: 'Manage Badges', page: 'ManageBadges', icon: Settings, separator: true }] : []),
      ]
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
                      <React.Fragment key={subItem.page}>
                        {subItem.separator && <DropdownMenuSeparator />}
                        <DropdownMenuItem asChild>
                          <Link to={createPageUrl(subItem.page)} className="flex items-center gap-2 cursor-pointer">
                            <subItem.icon className="w-4 h-4" />
                            {subItem.label}
                          </Link>
                        </DropdownMenuItem>
                      </React.Fragment>
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
          <UpcomingMeetings sections={sections} selectedSection={selectedSection} />
          <div className="flex flex-col gap-4">
            <BadgesDue sections={sections} selectedSection={selectedSection} />
            <UpcomingEvents sections={sections} selectedSection={selectedSection} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mb-6"
        >
          <ActionsStatus sections={sections} selectedSection={selectedSection} />
        </motion.div>

        {/* Receipt Upload Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Card className="bg-gradient-to-r from-emerald-500 to-emerald-600 border-0 shadow-lg">
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 md:gap-4">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Receipt className="w-5 h-5 md:w-6 md:h-6 text-white" />
                  </div>
                  <div className="text-white">
                    <h3 className="text-base md:text-lg font-semibold">Upload Receipts</h3>
                    <p className="text-white/90 text-xs md:text-sm">Submit your expenses for reimbursement</p>
                  </div>
                </div>
                <Link to={createPageUrl('ReceiptUploader')} className="w-full sm:w-auto">
                  <Button className="bg-white text-emerald-600 hover:bg-white/90 w-full sm:w-auto">
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