import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, MapPin, Download, FileText, Award, AlertCircle, Check, X, CheckCircle, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import ParentNav from '../components/parent/ParentNav';
import PhotoGallery from '../components/events/PhotoGallery';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function ParentEventDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const eventId = urlParams.get('id');
  const [user, setUser] = useState(null);
  const [consentDialog, setConsentDialog] = useState(null);
  const [textInputs, setTextInputs] = useState({});
  const [dropdownValues, setDropdownValues] = useState({});

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: event } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => base44.entities.Event.filter({ id: eventId }).then(res => res[0]),
    enabled: !!eventId,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: photos = [] } = useQuery({
    queryKey: ['event-photos', eventId],
    queryFn: () => base44.entities.EventPhoto.filter({ event_id: eventId, visible_to: 'parents' }, '-created_date')
      .then(parentPhotos => 
        base44.entities.EventPhoto.filter({ event_id: eventId, visible_to: 'public' }, '-created_date')
          .then(publicPhotos => [...parentPhotos, ...publicPhotos])
      ),
    enabled: !!eventId,
  });

  const { data: children = [] } = useQuery({
    queryKey: ['children', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const allMembers = await base44.entities.Member.filter({});
      return allMembers.filter(m => 
        m.parent_one_email === user.email || m.parent_two_email === user.email
      );
    },
    enabled: !!user?.email,
  });

  const { data: eventAttendances = [] } = useQuery({
    queryKey: ['event-attendances', eventId, children],
    queryFn: async () => {
      if (!eventId || children.length === 0) return [];
      const attendances = await base44.entities.EventAttendance.filter({ event_id: eventId });
      return attendances.filter(a => children.some(c => c.id === a.member_id));
    },
    enabled: !!eventId && children.length > 0,
  });

  const { data: actionsRequired = [] } = useQuery({
    queryKey: ['actions-required', eventId],
    queryFn: async () => {
      const actions = await base44.entities.ActionRequired.filter({ event_id: eventId });
      return actions.filter(action => action.is_open !== false);
    },
    enabled: !!eventId,
  });

  const { data: actionResponses = [] } = useQuery({
    queryKey: ['action-responses', eventId, user?.email],
    queryFn: () => base44.entities.ActionResponse.filter({ entity_id: eventId, parent_email: user?.email }),
    enabled: !!eventId && !!user?.email,
  });

  const { data: badgeCriteria = [] } = useQuery({
    queryKey: ['badge-criteria', eventId],
    queryFn: async () => {
      if (!eventId) return [];
      const criteria = await base44.entities.ProgrammeBadgeCriteria.filter({});
      return criteria.filter(c => c.event_id === eventId);
    },
    enabled: !!eventId,
  });

  const { data: badges = [] } = useQuery({
    queryKey: ['badges'],
    queryFn: () => base44.entities.BadgeDefinition.filter({}),
  });

  const respondToActionMutation = useMutation({
    mutationFn: async ({ actionId, memberId, response }) => {
      return base44.entities.ActionResponse.create({
        action_required_id: actionId,
        action_id: actionId,
        member_id: memberId,
        child_member_id: memberId,
        entity_id: eventId,
        parent_email: user.email,
        response: response,
        response_value: response,
        status: 'completed',
        response_date: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['action-responses'] });
      toast.success('Response recorded');
      setTextInputs({});
      setDropdownValues({});
    },
  });

  if (!event || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full" />
      </div>
    );
  }

  const eventSections = sections.filter(s => event.section_ids?.includes(s.id));
  const documents = event.documents || [];
  const scheduleByDay = event.schedule_by_day || [];

  const myChildrenInEvent = children.filter(child => 
    eventAttendances.some(a => a.member_id === child.id)
  );

  const unresolvedActions = actionsRequired.filter(action => {
    return myChildrenInEvent.some(child => {
      const hasResponse = actionResponses.some(
        r => r.action_id === action.id && r.child_member_id === child.id && r.status === 'completed'
      );
      return !hasResponse;
    });
  });

  const getBadgeName = (badgeId) => {
    return badges.find(b => b.id === badgeId)?.name || 'Unknown Badge';
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        {/* Hero Header */}
        <div className="relative bg-gradient-to-br from-[#7413dc] via-[#8b32eb] to-[#5c0fb0] text-white overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-pink-400/20 to-purple-400/20 rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-gradient-to-br from-cyan-400/15 to-blue-400/15 rounded-full blur-3xl"></div>
          </div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]"></div>
          
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('ParentEvents'))}
              className="text-white hover:bg-white/20 mb-6 -ml-2"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Events
            </Button>
            
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <Badge className="bg-white/20 backdrop-blur text-white mb-3 border-0">{event.type}</Badge>
                <h1 className="text-5xl font-bold mb-4 drop-shadow-lg">{event.title}</h1>
                <div className="flex flex-wrap items-center gap-6 text-purple-100">
                  <span className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
                    <Calendar className="w-5 h-5" />
                    <span className="font-medium">{format(new Date(event.start_date), 'MMMM d, yyyy')}</span>
                    {event.end_date && event.end_date !== event.start_date && (
                      <span>→ {format(new Date(event.end_date), 'MMM d')}</span>
                    )}
                  </span>
                  {event.meeting_time && (
                    <span className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
                      <Clock className="w-5 h-5" />
                      <span>Meet: {event.meeting_time}</span>
                    </span>
                  )}
                  {event.pickup_time && (
                    <span className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
                      <Clock className="w-5 h-5" />
                      <span>Pickup: {event.pickup_time}</span>
                    </span>
                  )}
                  {event.location && (
                    <span className="flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-2 rounded-full">
                      <MapPin className="w-5 h-5" />
                      <span>{event.location}</span>
                    </span>
                  )}
                </div>
              </div>
              {event.cost > 0 && (
                <div className="bg-white/20 backdrop-blur border border-white/30 rounded-2xl p-6 text-center">
                  <p className="text-purple-100 text-sm mb-1">Cost</p>
                  <p className="text-4xl font-bold">£{event.cost.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Actions Required Section */}
          {unresolvedActions.length > 0 && (
            <div className="mb-6 p-6 bg-gradient-to-br from-orange-50 via-red-50 to-orange-50 border-2 border-orange-200 rounded-2xl shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-400/20 to-transparent rounded-full blur-2xl" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Action Required</h2>
                    <p className="text-gray-600">Please respond to the following for your child</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {unresolvedActions.map(action => (
                    <div key={action.id} className="bg-white/80 backdrop-blur rounded-xl p-5 border border-orange-200 shadow-sm">
                      <p className="font-semibold text-gray-900 mb-4">{action.action_text}</p>
                      
                      {myChildrenInEvent.map(child => {
                        const hasResponse = actionResponses.some(
                          r => r.action_id === action.id && r.child_member_id === child.id && r.status === 'completed'
                        );
                        
                        if (hasResponse) return null;
                        
                        return (
                          <div key={child.id} className="mt-3 pt-3 border-t border-orange-100 first:border-t-0 first:mt-0 first:pt-0">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-medium text-gray-700">{child.full_name}</p>
                            </div>

                            {action.action_purpose === 'attendance' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => respondToActionMutation.mutate({ actionId: action.id, memberId: child.id, response: 'yes' })}
                                  className="bg-green-600 hover:bg-green-700 flex-1"
                                >
                                  <Check className="w-4 h-4 mr-2" />
                                  Attending
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => respondToActionMutation.mutate({ actionId: action.id, memberId: child.id, response: 'no' })}
                                  className="flex-1"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Not Attending
                                </Button>
                              </div>
                            )}

                            {action.action_purpose === 'consent' && (
                              <Button
                                size="sm"
                                onClick={() => setConsentDialog({ action, child })}
                                className="bg-[#7413dc] hover:bg-[#5c0fb0] w-full"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Give Consent
                              </Button>
                            )}

                            {action.action_purpose === 'custom_dropdown' && (
                              <div className="flex gap-2">
                                <Select
                                  value={dropdownValues[`${action.id}-${child.id}`] || ''}
                                  onValueChange={(value) => setDropdownValues({ ...dropdownValues, [`${action.id}-${child.id}`]: value })}
                                >
                                  <SelectTrigger>
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
                                      respondToActionMutation.mutate({ actionId: action.id, memberId: child.id, response: value });
                                    }
                                  }}
                                  disabled={!dropdownValues[`${action.id}-${child.id}`]}
                                >
                                  Submit
                                </Button>
                              </div>
                            )}

                            {action.action_purpose === 'text_input' && (
                              <div className="flex gap-2">
                                <Input
                                  placeholder="Enter your response"
                                  value={textInputs[`${action.id}-${child.id}`] || ''}
                                  onChange={(e) => setTextInputs({ ...textInputs, [`${action.id}-${child.id}`]: e.target.value })}
                                />
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const value = textInputs[`${action.id}-${child.id}`];
                                    if (value) {
                                      respondToActionMutation.mutate({ actionId: action.id, memberId: child.id, response: value });
                                    }
                                  }}
                                  disabled={!textInputs[`${action.id}-${child.id}`]}
                                >
                                  Submit
                                </Button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Main Content - Continuous Flow */}
          <div className="bg-white/90 backdrop-blur rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 lg:p-12 space-y-12">
              {/* Event Description */}
              {event.description && (
                <div>
                  <p className="text-gray-800 text-lg leading-relaxed mb-6 whitespace-pre-wrap">
                    {event.description}
                  </p>
                  
                  {(event.consent_deadline || event.payment_deadline) && (
                    <div className="flex gap-6 pt-6 border-t">
                      {event.consent_deadline && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Consent Deadline</p>
                            <p className="font-bold text-gray-900">{format(new Date(event.consent_deadline), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                      )}
                      {event.payment_deadline && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Clock className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-gray-500">Payment Deadline</p>
                            <p className="font-bold text-gray-900">{format(new Date(event.payment_deadline), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Schedule */}
              {scheduleByDay.length > 0 && (
                <div className="pt-8 border-t">
                  <h2 className="text-3xl font-bold text-[#7413dc] mb-8 flex items-center gap-3">
                    <Calendar className="w-8 h-8" />
                    Event Schedule
                  </h2>
                  <div className="space-y-10">
                    {scheduleByDay.map((day, dayIndex) => (
                      <div key={dayIndex}>
                        <h3 className="font-bold text-2xl mb-6 text-gray-900 flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full bg-[#7413dc]"></span>
                          {day.day_name}
                        </h3>
                        <div className="space-y-3 ml-6 border-l-2 border-purple-200 pl-8">
                          {day.items.map((item, itemIndex) => (
                            <div key={itemIndex} className="relative pb-4">
                              <div className="absolute -left-[2.1rem] top-2 w-4 h-4 rounded-full bg-purple-400 border-2 border-white shadow"></div>
                              <div className="bg-gradient-to-r from-purple-50 to-transparent p-5 rounded-lg">
                                <p className="font-bold text-[#7413dc] mb-2">{item.time}</p>
                                <p className="font-semibold text-gray-900 text-lg">{item.activity}</p>
                                {item.notes && <p className="text-gray-600 mt-2">{item.notes}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              {documents.length > 0 && (
                <div className="pt-8 border-t">
                  <h2 className="text-3xl font-bold text-[#7413dc] mb-8 flex items-center gap-3">
                    <FileText className="w-8 h-8" />
                    Documents & Kit Lists
                  </h2>
                  <div className="grid gap-4">
                    {documents.map((doc, idx) => (
                      <a
                        key={idx}
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 via-cyan-50 to-blue-50 rounded-xl hover:shadow-lg hover:scale-[1.01] transition-all border border-blue-100"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                            <FileText className="w-7 h-7 text-white" />
                          </div>
                          <span className="font-semibold text-gray-900 text-lg">{doc.name}</span>
                        </div>
                        <Download className="w-6 h-6 text-gray-400 group-hover:text-blue-600 group-hover:scale-110 transition-all" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Badge Criteria */}
              {badgeCriteria.length > 0 && (
                <div className="pt-8 border-t">
                  <h2 className="text-3xl font-bold text-[#7413dc] mb-3 flex items-center gap-3">
                    <Award className="w-8 h-8" />
                    Badge Progress
                  </h2>
                  <p className="text-gray-600 mb-8">This event counts towards the following badges</p>
                  <div className="grid gap-5">
                    {badgeCriteria.map((criteria, idx) => (
                      <div key={idx} className="flex items-start gap-5 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl border border-yellow-200">
                        <div className="w-14 h-14 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                          <Award className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-xl">{getBadgeName(criteria.badge_id)}</p>
                          <p className="text-gray-700 mt-2">{criteria.criteria_description || 'Participation in this event'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Photos */}
              {photos.length > 0 && (
                <div className="pt-8 border-t">
                  <h2 className="text-3xl font-bold text-[#7413dc] mb-3">Event Photos</h2>
                  <p className="text-gray-600 mb-8">Memories from this event</p>
                  <PhotoGallery photos={photos} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Consent Dialog */}
      <Dialog open={!!consentDialog} onOpenChange={() => setConsentDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Consent</DialogTitle>
            <DialogDescription>
              {consentDialog?.action.action_text}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm py-4">
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
                });
                setConsentDialog(null);
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Give Consent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}