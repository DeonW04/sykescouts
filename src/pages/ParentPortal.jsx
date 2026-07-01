import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, UserCheck, UserX, AlertTriangle, Mail, CheckCircle, RefreshCw, X, Bell, BellOff, Send } from 'lucide-react';
import { toast } from 'sonner';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAppRole } from '@/hooks/useAppRole';
import { Lock } from 'lucide-react';

export default function ParentPortal() {
  const queryClient = useQueryClient();
  const { role, isLoading: roleLoading } = useAppRole();
  const isLeader = role === 'leader';

  // Set noindex without react-helmet (this page renders outside HelmetProvider)
  React.useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    return () => { document.head.removeChild(meta); };
  }, []);
  const [refreshing, setRefreshing] = useState(false);
  const [showMissingDataModal, setShowMissingDataModal] = useState(false);

  const REQUIRED_FIELDS = [
    { key: 'date_of_birth', label: 'Date of birth' },
    { key: 'parent_one_name', label: 'Parent one name' },
    { key: 'parent_one_email', label: 'Parent one email' },
    { key: 'parent_one_phone', label: 'Parent one phone' },
    { key: 'emergency_contact_name', label: 'Emergency contact name' },
    { key: 'emergency_contact_phone', label: 'Emergency contact phone' },
    { key: 'emergency_contact_relationship', label: 'Emergency contact relationship' },
  ];

  const getMissingFields = (member) => {
    return REQUIRED_FIELDS.filter(f => {
      const val = member[f.key];
      return val === null || val === undefined || val === '';
    }).map(f => f.label);
  };

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
    enabled: isLeader,
  });

  const { data: parents = [] } = useQuery({
    queryKey: ['parents'],
    queryFn: () => base44.entities.Parent.filter({}),
    enabled: isLeader,
  });

  const sendInviteMutation = useMutation({
    mutationFn: async ({ parentEmail, parentName, childName }) => {
      return base44.functions.invoke('sendParentPortalInvite', {
        parentEmail,
        parentName,
        childName,
      });
    },
    onSuccess: () => {
      toast.success('Invitation sent successfully!');
      queryClient.invalidateQueries({ queryKey: ['parents'] });
    },
    onError: (error) => {
      toast.error('Failed to send invitation: ' + error.message);
    },
  });

  // Calculate data completion for a member
  const calculateDataCompletion = (member) => {
    const requiredFields = [
      'date_of_birth',
      'first_name',
      'surname',
      'parent_one_name',
      'parent_one_email',
      'parent_one_phone',
      'emergency_contact_name',
      'emergency_contact_phone',
      'emergency_contact_relationship',
    ];


    const completedFields = requiredFields.filter(field => {
      const value = member[field];
      return value !== null && value !== undefined && value !== '';
    }).length;

    return Math.round((completedFields / requiredFields.length) * 100);
  };

  const { data: registrationCache = [] } = useQuery({
    queryKey: ['parent-registration-cache'],
    queryFn: () => base44.entities.ParentRegistrationCache.filter({}),
    enabled: isLeader,
  });

  const { data: pushSubscriptions = [] } = useQuery({
    queryKey: ['push-subscriptions'],
    queryFn: () => base44.entities.PushSubscription.list(),
    enabled: isLeader,
  });

  const [testingPush, setTestingPush] = useState(null);

  const hasPushSubscription = (email) => {
    if (!email) return false;
    return pushSubscriptions.some(s => s.user_email?.toLowerCase() === email.toLowerCase());
  };

  const handleTestPush = async (email) => {
    setTestingPush(email);
    try {
      const sub = pushSubscriptions.find(s => s.user_email?.toLowerCase() === email.toLowerCase());
      if (!sub) { toast.error('No push subscription found for this account'); return; }
      const res = await base44.functions.invoke('sendTestPush', { subscriptionId: sub.id });
      if (res.data?.sent > 0) toast.success('Test notification sent!');
      else toast.error('Failed to send: ' + (res.data?.results?.[0]?.reason || 'Unknown error'));
    } catch (err) {
      toast.error('Error: ' + err.message);
    } finally {
      setTestingPush(null);
    }
  };

  // Check if parent is registered from cache
  const isParentRegistered = (email) => {
    if (!email) return false;
    const cached = registrationCache.find(r => r.email.toLowerCase() === email.toLowerCase());
    return cached?.is_registered === true;
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await base44.functions.invoke('refreshParentRegistration');
      queryClient.invalidateQueries({ queryKey: ['parent-registration-cache'] });
      toast.success('Registration status refreshed');
    } catch (error) {
      toast.error('Failed to refresh: ' + error.message);
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalMembers: members.length,
    parentOneRegistered: members.filter(m => m.parent_one_email && isParentRegistered(m.parent_one_email)).length,
    parentTwoRegistered: members.filter(m => m.parent_two_email && isParentRegistered(m.parent_two_email)).length,
    membersWithNoParent: members.filter(m => 
      (!m.parent_one_email || !isParentRegistered(m.parent_one_email)) &&
      (!m.parent_two_email || !isParentRegistered(m.parent_two_email))
    ).length,
    averageCompletion: members.length > 0 
      ? Math.round(members.reduce((sum, m) => sum + calculateDataCompletion(m), 0) / members.length)
      : 0,
    missingImportantData: members.filter(m => calculateDataCompletion(m) < 100).length,
  };

  const percentRegistered = stats.totalMembers > 0
    ? Math.round(((stats.parentOneRegistered + stats.parentTwoRegistered) / (stats.totalMembers * 2)) * 100)
    : 0;

  // Block access until we know the user is a leader/admin — protects members' personal data
  if (roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLeader) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-500 mb-6">This area is for section leaders only. If you're a parent, please use your Parent Portal instead.</p>
          <Button onClick={() => { window.location.href = '/app'; }} className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white">
            Go to My Portal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Leader Portal</p>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>Parent Portal Management</h1>
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '14px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>Track parent registrations and data completion</p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline" className="border-[#7413dc] text-[#7413dc] hover:bg-[#7413dc] hover:text-white">
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh Status
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Parents Registered', value: `${percentRegistered}%`, sub: `${stats.parentOneRegistered + stats.parentTwoRegistered} of ${stats.totalMembers * 2}`, icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            { label: 'No Parent Registered', value: stats.membersWithNoParent, sub: 'members affected', icon: UserX, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Avg Data Completion', value: `${stats.averageCompletion}%`, sub: 'across all members', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Missing Important Data', value: stats.missingImportantData, sub: 'click to view', icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', onClick: () => setShowMissingDataModal(true) },
          ].map(({ label, value, sub, icon: Icon, color, bg, onClick }) => (
            <div key={label} onClick={onClick} className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-red-200 transition-all' : ''}`}>
              <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Members List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Member Registration Status</h3>
          </div>
          <div className="divide-y divide-gray-50">
              {members
                .sort((a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime())
                .map(member => {
                const completion = calculateDataCompletion(member);
                const parent1Registered = isParentRegistered(member.parent_one_email);
                const parent2Registered = isParentRegistered(member.parent_two_email);
                const hasParent2 = member.parent_two_email && member.parent_two_email.trim() !== '';

                return (
                  <div key={member.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex flex-col lg:flex-row gap-4">
                      {/* Member Info */}
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2">{member.full_name}</h3>
                        <div className="space-y-2">
                          <div>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-gray-600">Data Completion</span>
                              <span className="font-semibold">{completion}%</span>
                            </div>
                            <Progress value={completion} className="h-2" />
                          </div>
                        </div>
                      </div>

                      {/* Parent 1 Status */}
                      <div className="lg:w-72">
                        <p className="text-sm text-gray-600 mb-2">Parent One</p>
                        {member.parent_one_email ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {parent1Registered ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Registered
                                </Badge>
                              ) : (
                                <Badge className="bg-orange-100 text-orange-800">
                                  <UserX className="w-3 h-3 mr-1" />
                                  Not Registered
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{member.parent_one_email}</p>
                            <div className="flex items-center gap-1">
                             {hasPushSubscription(member.parent_one_email) ? (
                               <Badge className="bg-green-100 text-green-700 text-xs">
                                 <Bell className="w-3 h-3 mr-1" />Push On
                               </Badge>
                             ) : (
                               <Badge className="bg-gray-100 text-gray-500 text-xs">
                                 <BellOff className="w-3 h-3 mr-1" />No Push
                               </Badge>
                             )}
                             {hasPushSubscription(member.parent_one_email) && (
                               <Button
                                 size="sm" variant="ghost"
                                 className="h-6 px-2 text-xs text-purple-600"
                                 disabled={testingPush === member.parent_one_email}
                                 onClick={() => handleTestPush(member.parent_one_email)}
                               >
                                 <Send className="w-3 h-3 mr-1" />
                                 {testingPush === member.parent_one_email ? '...' : 'Test'}
                               </Button>
                             )}
                            </div>
                            {!parent1Registered && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => sendInviteMutation.mutate({
                                  parentEmail: member.parent_one_email,
                                  parentName: member.parent_one_name || 'Parent',
                                  childName: member.full_name,
                                })}
                                disabled={sendInviteMutation.isPending}
                              >
                                <Mail className="w-3 h-3 mr-1" />
                                Send Invite
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-gray-500">No email</Badge>
                        )}
                      </div>

                      {/* Parent 2 Status */}
                      <div className="lg:w-72">
                        <p className="text-sm text-gray-600 mb-2">Parent Two</p>
                        {hasParent2 ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {parent2Registered ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Registered
                                </Badge>
                              ) : (
                                <Badge className="bg-orange-100 text-orange-800">
                                  <UserX className="w-3 h-3 mr-1" />
                                  Not Registered
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-gray-500">{member.parent_two_email}</p>
                            <div className="flex items-center gap-1">
                             {hasPushSubscription(member.parent_two_email) ? (
                               <Badge className="bg-green-100 text-green-700 text-xs">
                                 <Bell className="w-3 h-3 mr-1" />Push On
                               </Badge>
                             ) : (
                               <Badge className="bg-gray-100 text-gray-500 text-xs">
                                 <BellOff className="w-3 h-3 mr-1" />No Push
                               </Badge>
                             )}
                             {hasPushSubscription(member.parent_two_email) && (
                               <Button
                                 size="sm" variant="ghost"
                                 className="h-6 px-2 text-xs text-purple-600"
                                 disabled={testingPush === member.parent_two_email}
                                 onClick={() => handleTestPush(member.parent_two_email)}
                               >
                                 <Send className="w-3 h-3 mr-1" />
                                 {testingPush === member.parent_two_email ? '...' : 'Test'}
                               </Button>
                             )}
                            </div>
                            {!parent2Registered && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full"
                                onClick={() => sendInviteMutation.mutate({
                                  parentEmail: member.parent_two_email,
                                  parentName: member.parent_two_name || 'Parent',
                                  childName: member.full_name,
                                })}
                                disabled={sendInviteMutation.isPending}
                              >
                                <Mail className="w-3 h-3 mr-1" />
                                Send Invite
                              </Button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-full">
                            <p className="text-sm text-gray-400">No second parent</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      {/* Missing Data Modal */}
      <Dialog open={showMissingDataModal} onOpenChange={setShowMissingDataModal}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Members with Missing Data
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {members
              .map(m => ({ member: m, missing: getMissingFields(m) }))
              .filter(({ missing }) => missing.length > 0)
              .sort((a, b) => (a.member.full_name || '').localeCompare(b.member.full_name || ''))
              .map(({ member, missing }) => (
                <div key={member.id} className="border rounded-lg p-4">
                  <p className="font-semibold text-gray-800 mb-2">{member.full_name}</p>
                  <ul className="space-y-1">
                    {missing.map(field => (
                      <li key={field} className="flex items-center gap-2 text-sm text-red-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                        {field}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            {members.filter(m => getMissingFields(m).length > 0).length === 0 && (
              <p className="text-center text-gray-500 py-4">All members have complete data! 🎉</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}