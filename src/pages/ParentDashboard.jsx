import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Award, AlertCircle, Clock, Check, X, Tent, CheckCircle, AlertTriangle, FileText, HandHeart } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';


// Handle parent volunteer responses
const handleVolunteerResponse = async (actionId, memberId, response, user, queryClient, children) => {
  try {
    const action = await base44.entities.ActionRequired.filter({ id: actionId }).then(r => r[0]);
    
    // Check if parent volunteer record already exists for this action
    const existingVolunteer = await base44.entities.ParentVolunteer.filter({
      parent_email: user.email,
      ...(action.programme_id ? { programme_id: action.programme_id } : { event_id: action.event_id })
    });

    if (existingVolunteer.length === 0) {
      // Create parent volunteer record only once per parent per event/programme
      await base44.entities.ParentVolunteer.create({
        ...(action.programme_id ? { programme_id: action.programme_id } : { event_id: action.event_id }),
        parent_email: user.email,
        parent_name: user.display_name || user.full_name,
        response,
      });
    }

    // Create ActionResponse for this specific child
    await base44.entities.ActionResponse.create({
      action_required_id: actionId,
      action_id: actionId,
      member_id: memberId,
      child_member_id: memberId,
      entity_id: action.programme_id || action.event_id,
      parent_email: user.email,
      response,
      response_value: response,
      status: 'completed',
      response_date: new Date().toISOString(),
    });

    queryClient.invalidateQueries({ queryKey: ['actions-required'] });
    queryClient.invalidateQueries({ queryKey: ['parent-volunteers'] });
    toast.success('Response recorded');
  } catch (error) {
    toast.error('Error recording response');
  }
};

export default function ParentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [consentDialog, setConsentDialog] = useState(null);
  const [textInputs, setTextInputs] = useState({});
  const [dropdownValues, setDropdownValues] = useState({});
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const respondToActionMutation = useMutation({
    mutationFn: async ({ actionId, memberId, response, entityId, isVolunteer }) => {
      if (isVolunteer) {
        return handleVolunteerResponse(actionId, memberId, response, user, queryClient, children);
      }
      
      return base44.entities.ActionResponse.create({
        action_required_id: actionId,
        action_id: actionId,
        member_id: memberId,
        child_member_id: memberId,
        entity_id: entityId,
        parent_email: user.email,
        response,
        response_value: response,
        status: 'completed',
        response_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions-required'] });
      toast.success('Response recorded');
    },
  });

  const loadUserData = async () => {
    const currentUser = await base44.auth.me();
    if (!currentUser.onboarding_complete) {
      window.location.href = createPageUrl('CompleteRegistration');
      return;
    }
    setUser(currentUser);
  };

  const { data: portal } = useQuery({
    queryKey: ['parent-portal', user?.email],
    queryFn: async () => (await base44.functions.invoke('getParentPortalData', {})).data,
    enabled: !!user?.email,
  });

  const { data: reference } = useQuery({
    queryKey: ['parent-reference', user?.email],
    queryFn: async () => (await base44.functions.invoke('getParentReferenceData', {})).data,
    enabled: !!user?.email,
  });

  const children = portal?.children || [];
  const childIds = children.map(c => c.id);

  const upcomingEvents = (reference?.events || [])
    .filter(e => new Date(e.start_date) > new Date())
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));

  const nextMeeting = (() => {
    const progs = (reference?.programmes || [])
      .filter(p => p.shown_in_portal && new Date(p.date) > new Date())
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    return progs[0] || null;
  })();

  const eventPaymentStatuses = portal?.eventPaymentStatuses || [];

  const meetingPaymentStatus = (nextMeeting
    ? (portal?.meetingPaymentStatuses || []).find(ps => ps.meeting_id === nextMeeting.id && childIds.includes(ps.member_id))
    : null) || null;

  const dashAttendanceActions = (reference?.attendanceActions || [])
    .filter(a => a.event_id && upcomingEvents.some(e => e.id === a.event_id));

  const dashAttendanceResponses = portal?.actionResponses || [];

  const isAttendingEvent = (eventId) => {
    const action = dashAttendanceActions.find(a => a.event_id === eventId);
    if (!action) return false;
    const resp = dashAttendanceResponses.find(r =>
      r.action_required_id === action.id &&
      (childIds.includes(r.member_id) || childIds.includes(r.child_member_id))
    );
    return !!(resp && ['yes', 'yes, attending', 'attending'].includes((resp.response_value || resp.response || '').toLowerCase()));
  };

  const getEventPayStatus = (eventId) => eventPaymentStatuses.find(ps => ps.event_id === eventId && childIds.includes(ps.member_id));

  // Banner items
  const now_b = new Date();
  const in7Days = new Date(now_b.getTime() + 7 * 24 * 60 * 60 * 1000);
  const outstandingItems = [];
  for (const event of upcomingEvents) {
    if (!(event.cost > 0)) continue;
    const start = new Date(event.start_date);
    if (start > in7Days) continue;
    if (!isAttendingEvent(event.id)) continue;
    if (getEventPayStatus(event.id)?.status === 'paid') continue;
    const daysLeft = Math.ceil((start - now_b) / (1000 * 60 * 60 * 24));
    outstandingItems.push(`Payment due: ${event.title} — £${event.cost.toFixed(2)}${daysLeft <= 0 ? ' (today)' : daysLeft === 1 ? ' (tomorrow)' : ` (${daysLeft} days)`}`);
  }
  const child0 = children[0];
  if (child0?.next_subs_due) {
    const subsDue = new Date(child0.next_subs_due);
    if (subsDue <= in7Days && subsDue >= now_b) {
      const d = Math.ceil((subsDue - now_b) / (1000 * 60 * 60 * 24));
      outstandingItems.push(`Subscription due${d === 0 ? ' today' : d === 1 ? ' tomorrow' : ` in ${d} days`}`);
    }
  }
  if (child0?.legacy_subs_expiry && !child0?.stripe_subscription_id) {
    const legacyExpiry = new Date(child0.legacy_subs_expiry);
    const in30Days = new Date(now_b.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (legacyExpiry <= in30Days && legacyExpiry >= now_b) {
      outstandingItems.push(`Subscription due by ${legacyExpiry.toLocaleDateString('en-GB')} — set up now`);
    }
  }

  const badgeProgress = portal?.badgeProgress || [];

  const { data: actionsRequired = [] } = useQuery({
    queryKey: ['actions-required', children, reference?.programmes, portal?.actionResponses],
    queryFn: async () => {
      if (children.length === 0 || !reference || !portal) return [];
      const childIds = children.map(c => c.id);

      // Programmes/events are already scoped to the children's sections server-side.
      const relevantProgrammes = reference.programmes || [];
      const relevantProgrammeIds = relevantProgrammes.map(p => p.id);
      const relevantEvents = reference.events || [];
      const relevantEventIds = relevantEvents.map(e => e.id);

      // All actions for these programmes/events
      const allActions = await base44.entities.ActionRequired.filter({});
      const programmeActions = allActions.filter(a => relevantProgrammeIds.includes(a.programme_id));
      const eventActions = allActions.filter(a => a.event_id && relevantEventIds.includes(a.event_id));
      const relevantActions = [...programmeActions, ...eventActions];

      // Responses are already scoped to this parent's children (server-side).
      const childResponses = portal.actionResponses || [];

      // Add programme/event details to each action
      const actionsWithDetails = relevantActions.map(action => ({
        ...action,
        programme: relevantProgrammes.find(p => p.id === action.programme_id),
        event: relevantEvents.find(e => e.id === action.event_id),
      }));
      
      // Filter out actions that are closed or have been completed for all children
      return actionsWithDetails.filter(action => {
        // Don't show closed actions
        if (action.is_open === false) return false;
        // Don't show actions for past programmes
        if (action.programme && action.programme.date) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (new Date(action.programme.date) < today) return false;
        }
        // Don't show actions for past events
        if (action.event && (action.event.end_date || action.event.start_date)) {
          if (new Date(action.event.end_date || action.event.start_date) < new Date()) return false;
        }
        
        // Check if ALL children have a completed response for this action —
        // regardless of whether it was entered by the parent or a leader manually
        const allChildrenResponded = children.every(child =>
          childResponses.some(r =>
            (r.action_required_id === action.id || r.action_id === action.id) &&
            (r.member_id === child.id || r.child_member_id === child.id) &&
            (r.response_value || r.response) // count any non-empty response value
          )
        );
        return !allChildrenResponded;
      });
    },
    enabled: children.length > 0 && !!user,
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

  const quickStats = [
    { icon: Users, label: 'My Child', gradient: 'from-blue-500 to-cyan-500', onClick: () => navigate(createPageUrl('MyChild')) },
    { icon: Calendar, label: 'Programme', gradient: 'from-green-500 to-emerald-500', onClick: () => navigate(createPageUrl('ParentProgramme')) },
    { icon: Tent, label: 'Events/Camps', gradient: 'from-purple-500 to-pink-500', onClick: () => navigate(createPageUrl('ParentEvents')) },
    { icon: Award, label: 'Badges', gradient: 'from-yellow-500 to-orange-500', onClick: () => navigate(createPageUrl('ParentBadges')) },
  ];

  return (
    <>
    <FloatingNav />
    <NavBarSpacer />
    {/* Outstanding payments banner */}
    {outstandingItems.length > 0 && !bannerDismissed && (
      <div className="bg-red-600 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            {outstandingItems.map((item, i) => <p key={i} className="text-sm text-white font-medium">{item}</p>)}
          </div>
          <button onClick={() => setBannerDismissed(true)} className="text-white/70 hover:text-white flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    )}
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#7413dc] via-[#8b32eb] to-[#5c0fb0] text-white py-20 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-gradient-to-br from-cyan-400/15 to-blue-400/15 rounded-full blur-3xl"></div>
        </div>
        {/* Overlay pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.08),transparent_50%)]"></div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-4 border border-white/30">
              <Users className="w-4 h-4" />
              <p className="text-sm font-semibold">Parent Portal</p>
            </div>
            <h1 className="text-5xl font-bold mb-3 drop-shadow-lg">Welcome back, {user.display_name || user.full_name}!</h1>
            <p className="text-purple-100 text-xl drop-shadow">Manage your child's scouting journey all in one place</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
          {quickStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
            >
              <Card 
                className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-0 bg-gradient-to-br from-white to-gray-50 overflow-hidden relative"
                onClick={stat.onClick}
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-300" style={{
                  background: `linear-gradient(135deg, var(--tw-gradient-stops))`
                }} />
                <CardContent className="p-6 relative">
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-16 h-16 bg-gradient-to-br ${stat.gradient} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                      <stat.icon className="w-8 h-8 text-white" />
                    </div>
                    <p className="font-semibold text-gray-900">{stat.label}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Main Dashboard Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Side - Actions Required */}
          <div className="lg:col-span-1">
            <Card className="h-full border-0 bg-gradient-to-br from-orange-50 via-white to-orange-50/30 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/10 to-transparent rounded-full blur-2xl" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-white" />
                  </div>
                  Actions Required
                </CardTitle>
              </CardHeader>
              <CardContent>
                {actionsRequired.length === 0 ? (
                  <div className="text-center py-8">
                    <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                    <p className="text-gray-600">All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {actionsRequired.map(action => (
                      <div key={action.id} className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <p className="font-medium text-sm text-orange-900">{action.action_text}</p>
                        {action.programme && (
                          <p className="text-xs text-[#7413dc] mt-1 font-medium">
                            {action.programme.title} · {new Date(action.programme.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}
                        {action.event && (
                          <p className="text-xs text-[#7413dc] mt-1 font-medium">
                            {action.event.title} · {new Date(action.event.start_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        )}

                        {children.map(child => (
                         <div key={child.id} className="mt-3 pt-3 border-t border-orange-200">
                           <button
                             onClick={() => navigate(createPageUrl('MemberDetail') + `?id=${child.id}`)}
                             className="text-xs text-orange-700 font-medium mb-2 hover:text-orange-900 hover:underline transition-colors"
                           >
                             {child.full_name}
                           </button>

                            {action.action_purpose === 'attendance' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => respondToActionMutation.mutate({ 
                                    actionId: action.id, 
                                    memberId: child.id, 
                                    response: 'yes',
                                    entityId: action.programme_id || action.event_id,
                                    isVolunteer: action.action_text?.includes('volunteer')
                                  })}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Yes
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => respondToActionMutation.mutate({ 
                                    actionId: action.id, 
                                    memberId: child.id, 
                                    response: 'no',
                                    entityId: action.programme_id || action.event_id,
                                    isVolunteer: action.action_text?.includes('volunteer')
                                  })}
                                >
                                  <X className="w-3 h-3 mr-1" />
                                  No
                                </Button>
                              </div>
                            )}

                            {action.action_purpose === 'consent' && (
                              <Button
                                size="sm"
                                onClick={() => setConsentDialog({ action, child })}
                                className="bg-[#7413dc] hover:bg-[#5c0fb0]"
                              >
                                Give Consent
                              </Button>
                            )}

                            {action.action_purpose === 'custom_dropdown' && (
                              <div className="flex gap-2">
                                <Select
                                  value={dropdownValues[`${action.id}-${child.id}`] || ''}
                                  onValueChange={(value) => setDropdownValues({ ...dropdownValues, [`${action.id}-${child.id}`]: value })}
                                >
                                  <SelectTrigger className="text-sm">
                                    <SelectValue placeholder="Select option" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {action.dropdown_options?.map((option, idx) => (
                                      <SelectItem key={idx} value={option}>{option}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const value = dropdownValues[`${action.id}-${child.id}`];
                                    if (value) {
                                      respondToActionMutation.mutate({ 
                                        actionId: action.id, 
                                        memberId: child.id, 
                                        response: value,
                                        entityId: action.programme_id || action.event_id 
                                      });
                                    }
                                  }}
                                >
                                  Submit
                                </Button>
                              </div>
                            )}

                            {action.action_purpose === 'text_input' && (
                              <div className="flex gap-2">
                                <Input
                                  size="sm"
                                  placeholder="Enter response"
                                  value={textInputs[`${action.id}-${child.id}`] || ''}
                                  onChange={(e) => setTextInputs({ ...textInputs, [`${action.id}-${child.id}`]: e.target.value })}
                                  className="text-sm"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const value = textInputs[`${action.id}-${child.id}`];
                                    if (value) {
                                      respondToActionMutation.mutate({ 
                                        actionId: action.id, 
                                        memberId: child.id, 
                                        response: value,
                                        entityId: action.programme_id || action.event_id 
                                      });
                                    }
                                  }}
                                >
                                  Submit
                                </Button>
                              </div>
                            )}

                            {action.action_purpose === 'volunteer' && (
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  size="sm"
                                  onClick={() => respondToActionMutation.mutate({
                                    actionId: action.id,
                                    memberId: child.id,
                                    response: 'Yes, I will volunteer',
                                    entityId: action.programme_id || action.event_id,
                                    isVolunteer: true,
                                  })}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <HandHeart className="w-3 h-3 mr-1" />
                                  Yes, I'll help!
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => respondToActionMutation.mutate({
                                    actionId: action.id,
                                    memberId: child.id,
                                    response: 'No, not this time',
                                    entityId: action.programme_id || action.event_id,
                                    isVolunteer: true,
                                  })}
                                >
                                  Not this time
                                </Button>
                              </div>
                            )}

                            {action.action_purpose === 'consent_form' && (
                              <Button
                                size="sm"
                                onClick={async () => {
                                  const subs = await base44.entities.ConsentFormSubmission.filter({ form_id: action.consent_form_id, member_id: child.id });
                                  let sub = subs.find(s => action.event_id ? s.event_id === action.event_id : s.programme_id === action.programme_id) || subs[0];
                                  if (!sub) {
                                    const token = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                                    sub = await base44.entities.ConsentFormSubmission.create({
                                      form_id: action.consent_form_id,
                                      member_id: child.id,
                                      event_id: action.event_id || null,
                                      programme_id: action.programme_id || null,
                                      sign_token: token,
                                      status: 'pending',
                                    });
                                  } else if (!sub.sign_token) {
                                    const token = Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
                                    await base44.entities.ConsentFormSubmission.update(sub.id, { sign_token: token });
                                    sub = { ...sub, sign_token: token };
                                  }
                                  window.open(`/sign?token=${sub.sign_token}`, '_blank');
                                }}
                                className="bg-[#7413dc] hover:bg-[#5c0fb0]"
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                Sign Consent Form
                              </Button>
                            )}
                            </div>
                            ))}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Side - Meetings and Events */}
          <div className="lg:col-span-2 space-y-6">
            {/* Next Weekly Meeting */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 via-white to-emerald-50/30 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-green-400/10 to-transparent rounded-full blur-2xl" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-white" />
                  </div>
                  Next Meeting
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextMeeting ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-gradient-to-br from-white to-green-50/30 border-2 border-green-200 rounded-xl hover:shadow-lg hover:border-green-300 transition-all"
                  >
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <h3 className="font-bold text-gray-900 text-lg">{nextMeeting.title}</h3>
                      {nextMeeting.has_cost && nextMeeting.cost > 0 && (
                        meetingPaymentStatus?.status === 'paid'
                          ? <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" />Paid</span>
                          : <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Not paid</span>
                      )}
                    </div>
                    <p className="text-gray-700 font-medium mb-2">
                      {new Date(nextMeeting.date).toLocaleDateString('en-GB', { 
                        weekday: 'long', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    {nextMeeting.description && (
                      <p className="text-gray-600 text-sm">{nextMeeting.description}</p>
                    )}
                  </motion.div>
                ) : (
                  <div className="text-center py-6">
                    <Calendar className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No meetings scheduled</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events and Camps */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 via-white to-pink-50/30 relative overflow-hidden">
              <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-400/10 to-transparent rounded-full blur-2xl" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center gap-2 text-xl">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Tent className="w-5 h-5 text-white" />
                  </div>
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length === 0 ? (
                  <div className="text-center py-6">
                    <Tent className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No upcoming events</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingEvents.slice(0, 3).map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="p-4 bg-gradient-to-br from-white to-purple-50/30 border border-purple-100 rounded-xl hover:shadow-xl hover:border-purple-300 transition-all cursor-pointer"
                        onClick={() => navigate(createPageUrl('ParentEvents'))}
                      >
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-bold text-gray-900">{event.title}</p>
                          {event.cost > 0 && isAttendingEvent(event.id) && (
                            getEventPayStatus(event.id)?.status === 'paid'
                              ? <span className="text-xs font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1"><CheckCircle className="w-3 h-3" />Paid</span>
                              : <span className="text-xs font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Not paid</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 font-medium">
                          {new Date(event.start_date).toLocaleDateString('en-GB', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                        {event.location && (
                          <p className="text-xs text-gray-500 mt-1">{event.location}</p>
                        )}
                      </motion.div>
                    ))}
                    {upcomingEvents.length > 3 && (
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate(createPageUrl('ParentEvents'))}
                      >
                        View All Events ({upcomingEvents.length})
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
        </div>
        </div>

        <Dialog open={!!consentDialog} onOpenChange={() => setConsentDialog(null)}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Consent</DialogTitle>
          <DialogDescription>
            {consentDialog?.action.action_text}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm">
          Are you giving consent for <strong>{consentDialog?.child.full_name}</strong>?
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConsentDialog(null)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              respondToActionMutation.mutate({
                actionId: consentDialog.action.id,
                memberId: consentDialog.child.id,
                response: 'yes',
                entityId: consentDialog.action.programme_id || consentDialog.action.event_id,
              });
              setConsentDialog(null);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            Give Consent
          </Button>
        </DialogFooter>
        </DialogContent>
        </Dialog>
        </>
        );
        }