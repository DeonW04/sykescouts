import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Award, AlertCircle, Clock, Check, X, Tent, CheckCircle, AlertTriangle, FileText, HandHeart, CreditCard } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useSelectedChildId } from '@/hooks/useSelectedChild';
import DashboardHero from '@/components/parent/dashboard/DashboardHero';
import AwardJourneySection from '@/components/parent/dashboard/AwardJourneySection';
import ScoutingJourneyBar from '@/components/parent/dashboard/ScoutingJourneyBar';
import BannerPickerDialog from '@/components/banner/BannerPickerDialog';
import ConsentFormDialog from '@/components/parent/ConsentFormDialog';
import PaymentActionDialog from '@/components/parent/dashboard/PaymentActionDialog';


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
  const [consentFormDialog, setConsentFormDialog] = useState(null);
  const [paymentDialogAction, setPaymentDialogAction] = useState(null);
  const [textInputs, setTextInputs] = useState({});
  const [dropdownValues, setDropdownValues] = useState({});
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [bannerPickerOpen, setBannerPickerOpen] = useState(false);

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
      // Response is stored server-side inside getParentPortalData's actionResponses —
      // without refreshing it the actions-required refetch above still sees stale
      // data and the action appears to not react until a full page reload.
      queryClient.invalidateQueries({ queryKey: ['parent-portal'] });
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
  const [selectedChildId, setSelectedChildId] = useSelectedChildId(children);
  const selectedChild = children.find(c => c.id === selectedChildId) || children[0];
  const childIds = selectedChild ? [selectedChild.id] : [];

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({}),
    staleTime: 30 * 60 * 1000,
  });
  const childSection = sections.find(s => s.id === selectedChild?.section_id);

  const { data: dashHeroImages = [] } = useQuery({
    queryKey: ['parent-dashboard-hero-images'],
    queryFn: () => base44.entities.WebsiteImage.filter({ page: 'parent_dashboard' }),
    staleTime: 30 * 60 * 1000,
  });
  const defaultHero = dashHeroImages.find(i => i.label === childSection?.name);
  const heroImage = selectedChild?.custom_banner_url || defaultHero?.image_url || null;
  const heroPosition = (selectedChild?.custom_banner_url ? selectedChild?.custom_banner_position : defaultHero?.position) || '50% 50%';

  const saveCustomBanner = async (url, position) => {
    if (!selectedChild) return;
    await base44.entities.Member.update(selectedChild.id, { custom_banner_url: url, custom_banner_position: position });
    queryClient.invalidateQueries({ queryKey: ['parent-portal'] });
    toast.success('Banner updated');
  };

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
  const child0 = selectedChild;
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
    queryKey: ['actions-required', selectedChild?.id, reference?.programmes, portal?.actionResponses],
    queryFn: async () => {
      if (children.length === 0 || !reference || !portal || !selectedChild) return [];

      // Scope to the SELECTED child's own section only — reference.programmes/events
      // covers every section across all of this parent's children, so without this a
      // parent with kids in two different sections would see one child's actions
      // (e.g. a Scout meeting) while viewing the other (e.g. a Cub) child.
      const relevantProgrammes = (reference.programmes || []).filter(p => p.section_id === selectedChild.section_id);
      const relevantProgrammeIds = relevantProgrammes.map(p => p.id);
      const relevantEvents = (reference.events || []).filter(e => e.section_ids?.includes(selectedChild.section_id));
      const relevantEventIds = relevantEvents.map(e => e.id);

      // All actions for these programmes/events
      const allActions = await base44.entities.ActionRequired.filter({});
      const programmeActions = allActions.filter(a => relevantProgrammeIds.includes(a.programme_id));
      const eventActions = allActions.filter(a => a.event_id && relevantEventIds.includes(a.event_id));
      const relevantActions = [...programmeActions, ...eventActions];

      // Responses are already scoped to this parent's children (server-side).
      const childResponses = portal.actionResponses || [];
      const isAttendingResponse = (val) => ['yes', 'yes, attending', 'attending'].includes((val || '').toLowerCase());

      // Add programme/event details to each action
      const actionsWithDetails = relevantActions.map(action => ({
        ...action,
        programme: relevantProgrammes.find(p => p.id === action.programme_id),
        event: relevantEvents.find(e => e.id === action.event_id),
      }));

      // Filter out actions that are closed or have been completed for all children
      const pendingActions = actionsWithDetails.filter(action => {
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

        // Check if the selected child has a completed response for this action —
        // regardless of whether it was entered by the parent or a leader manually
        const responded = childResponses.some(r =>
          (r.action_required_id === action.id || r.action_id === action.id) &&
          (r.member_id === selectedChild.id || r.child_member_id === selectedChild.id) &&
          (r.response_value || r.response) // count any non-empty response value
        );
        return !responded;
      });

      // Once the parent confirms attendance for a meeting/event with a cost,
      // surface a payment action until it's paid (mirrors the mobile app).
      const paymentActions = actionsWithDetails
        .filter(a => a.action_purpose === 'attendance')
        .map(action => {
          const entity = action.programme?.has_cost && action.programme.cost > 0
            ? { kind: 'meeting', record: action.programme }
            : action.event?.cost > 0
            ? { kind: 'event', record: action.event }
            : null;
          if (!entity) return null;
          const attended = childResponses.some(r =>
            (r.action_required_id === action.id || r.action_id === action.id) &&
            (r.member_id === selectedChild.id || r.child_member_id === selectedChild.id) &&
            isAttendingResponse(r.response_value || r.response)
          );
          if (!attended) return null;
          const paid = entity.kind === 'meeting'
            ? (portal.meetingPaymentStatuses || []).some(ps => ps.meeting_id === entity.record.id && ps.member_id === selectedChild.id && ps.status === 'paid')
            : (portal.eventPaymentStatuses || []).some(ps => ps.event_id === entity.record.id && ps.member_id === selectedChild.id && ps.status === 'paid');
          if (paid) return null;
          return {
            id: `pay_${action.id}`,
            action_purpose: 'payment',
            action_text: `Payment required — £${entity.record.cost.toFixed(2)} for ${entity.record.title}`,
            isPayment: true,
            entity,
          };
        })
        .filter(Boolean);

      return [...pendingActions, ...paymentActions];
    },
    enabled: children.length > 0 && !!user && !!selectedChild,
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
    { icon: Users, label: 'My Child', accent: '#3b82f6', onClick: () => navigate(createPageUrl('MyChild')) },
    { icon: Calendar, label: 'Programme', accent: '#22c55e', onClick: () => navigate(createPageUrl('ParentProgramme')) },
    { icon: Tent, label: 'Events/Camps', accent: '#a855f7', onClick: () => navigate(createPageUrl('ParentEvents')) },
    { icon: Award, label: 'Badges', accent: '#f59e0b', onClick: () => navigate(createPageUrl('ParentBadges')) },
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
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #f8f7ff 0%, #f0eeff 50%, #f0fdf4 100%)', fontFamily: 'DM Sans, sans-serif' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');`}</style>
      {/* Hero — section-based configurable image */}
      <DashboardHero
        user={user}
        children={children}
        selectedChild={selectedChild}
        onSelectChild={setSelectedChildId}
        heroImage={heroImage}
        heroPosition={heroPosition}
        sectionName={childSection?.name}
        sectionDisplayName={childSection?.display_name}
        onChangeImage={() => setBannerPickerOpen(true)}
      />
      <BannerPickerDialog
        open={bannerPickerOpen}
        onOpenChange={setBannerPickerOpen}
        onComplete={saveCustomBanner}
        sectionId={selectedChild?.section_id}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {quickStats.map((stat) => (
            <button
              key={stat.label}
              onClick={stat.onClick}
              className="bg-white/90 backdrop-blur-xl rounded-[18px] p-5 flex flex-col items-center gap-3 transition-all hover:-translate-y-1 hover:shadow-lg"
              style={{ border: `1px solid ${stat.accent}20`, boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${stat.accent}18` }}>
                <stat.icon className="w-5 h-5" style={{ color: stat.accent }} />
              </div>
              <p className="font-semibold text-sm" style={{ color: '#1a1a2e' }}>{stat.label}</p>
            </button>
          ))}
        </div>

        {/* Main Dashboard Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Side - Actions Required */}
          <div className="lg:col-span-1">
            <Card className="h-full border border-[#7413dc]/10 bg-white/90 backdrop-blur-xl rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg" style={{ fontFamily: 'Outfit, sans-serif', color: '#1a1a2e' }}>
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <AlertCircle className="w-5 h-5 text-orange-500" />
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
                    {actionsRequired.map(action => action.isPayment ? (
                      <div key={action.id} className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <CreditCard className="w-4 h-4 text-amber-600 flex-shrink-0" />
                          <p className="font-medium text-sm text-amber-900 truncate">{action.action_text}</p>
                        </div>
                        <Button
                          size="sm"
                          className="bg-amber-500 hover:bg-amber-600 text-white flex-shrink-0"
                          onClick={() => setPaymentDialogAction(action)}
                        >
                          Pay Now
                        </Button>
                      </div>
                    ) : (
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

                        {children.filter(c => c.id === selectedChild?.id).map(child => (
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
                                onClick={() => setConsentFormDialog({ action, child })}
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
            <Card className="border border-[#7413dc]/10 bg-white/90 backdrop-blur-xl rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg" style={{ fontFamily: 'Outfit, sans-serif', color: '#1a1a2e' }}>
                  <div className="w-9 h-9 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-green-600" />
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
            <Card className="border border-[#7413dc]/10 bg-white/90 backdrop-blur-xl rounded-[20px] shadow-[0_4px_20px_rgba(0,0,0,0.05)]">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg" style={{ fontFamily: 'Outfit, sans-serif', color: '#1a1a2e' }}>
                  <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center">
                    <Tent className="w-5 h-5 text-[#7413dc]" />
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

        {/* Award progress diagram + badge stats */}
        {selectedChild && (
          <div className="mt-10">
            <AwardJourneySection child={selectedChild} sectionName={childSection?.name} />
          </div>
        )}

        {/* Scouting journey progress */}
        {selectedChild && (
          <div className="mt-6">
            <ScoutingJourneyBar child={selectedChild} />
          </div>
        )}
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

        <ConsentFormDialog
          open={!!consentFormDialog}
          onOpenChange={(v) => !v && setConsentFormDialog(null)}
          action={consentFormDialog?.action}
          child={consentFormDialog?.child}
          user={user}
          onSigned={() => {
            queryClient.invalidateQueries({ queryKey: ['parent-portal'] });
            queryClient.invalidateQueries({ queryKey: ['actions-required'] });
          }}
        />

        <PaymentActionDialog
          open={!!paymentDialogAction}
          onOpenChange={(v) => !v && setPaymentDialogAction(null)}
          entity={paymentDialogAction?.entity}
          child={selectedChild}
          onPaid={() => {
            queryClient.invalidateQueries({ queryKey: ['parent-portal'] });
            queryClient.invalidateQueries({ queryKey: ['actions-required'] });
            setPaymentDialogAction(null);
          }}
        />
        </>
        );
        }