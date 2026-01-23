import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, Award, AlertCircle, Clock, Check, X, Tent } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

export default function ParentDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [consentDialog, setConsentDialog] = useState(null);
  const [textInputs, setTextInputs] = useState({});
  const [dropdownValues, setDropdownValues] = useState({});

  useEffect(() => {
    loadUserData();
  }, []);

  const respondToActionMutation = useMutation({
    mutationFn: async ({ actionId, memberId, response }) => {
      return base44.entities.ActionResponse.create({
        action_required_id: actionId,
        member_id: memberId,
        parent_email: user.email,
        response,
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
    setUser(currentUser);
  };

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

  const { data: upcomingEvents = [] } = useQuery({
    queryKey: ['upcoming-events', children],
    queryFn: async () => {
      if (children.length === 0) return [];
      const sectionIds = [...new Set(children.map(c => c.section_id))];
      const events = await base44.entities.Event.filter({ published: true });
      const upcoming = events.filter(e => 
        e.section_ids?.some(sid => sectionIds.includes(sid)) &&
        new Date(e.start_date) > new Date()
      ).sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
      return upcoming;
    },
    enabled: children.length > 0,
  });

  const { data: nextMeeting } = useQuery({
    queryKey: ['next-meeting', children],
    queryFn: async () => {
      if (children.length === 0) return null;
      const sectionIds = [...new Set(children.map(c => c.section_id))];
      const programmes = await base44.entities.Programme.filter({ shown_in_portal: true });
      const upcoming = programmes.filter(p => 
        sectionIds.includes(p.section_id) &&
        new Date(p.date) > new Date()
      ).sort((a, b) => new Date(a.date) - new Date(b.date));
      return upcoming[0] || null;
    },
    enabled: children.length > 0,
  });

  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['badge-progress', children],
    queryFn: async () => {
      if (children.length === 0) return [];
      const allProgress = await base44.entities.BadgeProgress.filter({});
      return allProgress.filter(p => children.some(c => c.id === p.member_id));
    },
    enabled: children.length > 0,
  });

  const { data: actionsRequired = [] } = useQuery({
    queryKey: ['actions-required', children],
    queryFn: async () => {
      if (children.length === 0) return [];
      const sectionIds = [...new Set(children.map(c => c.section_id))];
      
      // Get all programmes for these sections
      const programmes = await base44.entities.Programme.filter({});
      const relevantProgrammes = programmes.filter(p => sectionIds.includes(p.section_id));
      const relevantProgrammeIds = relevantProgrammes.map(p => p.id);
      
      // Get all actions for these programmes
      const allActions = await base44.entities.ActionRequired.filter({});
      const relevantActions = allActions.filter(a => relevantProgrammeIds.includes(a.programme_id));
      
      // Get all responses from this parent
      const responses = await base44.entities.ActionResponse.filter({ parent_email: user?.email });
      
      // Add programme details to each action
      const actionsWithProgrammes = relevantActions.map(action => ({
        ...action,
        programme: relevantProgrammes.find(p => p.id === action.programme_id)
      }));
      
      // Filter out actions that have been completed for all children
      return actionsWithProgrammes.filter(action => {
        // Check if all children have responded to this action
        const allChildrenResponded = children.every(child => 
          responses.some(r => r.action_required_id === action.id && r.member_id === child.id)
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
    { icon: Users, label: 'My Child', color: 'bg-blue-500', onClick: () => navigate(createPageUrl('MyChild')) },
    { icon: Calendar, label: 'Programme', color: 'bg-green-500', onClick: () => navigate(createPageUrl('ParentProgramme')) },
    { icon: Tent, label: 'Events/Camps', color: 'bg-purple-500', onClick: () => navigate(createPageUrl('ParentEvents')) },
    { icon: Award, label: 'Badges', color: 'bg-yellow-500', onClick: () => navigate(createPageUrl('ParentBadges')) },
  ];

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#7413dc] to-[#5c0fb0] text-white py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-2xl">
            <div className="inline-block px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-4">
              <p className="text-sm font-semibold">Parent Portal</p>
            </div>
            <h1 className="text-5xl font-bold mb-3">Welcome back, {user.display_name || user.full_name}!</h1>
            <p className="text-purple-100 text-xl">Manage your child's scouting journey all in one place</p>
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
                className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-l-4 border-l-transparent hover:border-l-[#7413dc] bg-white/80 backdrop-blur-sm"
                onClick={stat.onClick}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col items-center text-center">
                    <div className={`w-16 h-16 ${stat.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
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
            <Card className="h-full border-l-4 border-l-orange-400 bg-gradient-to-br from-orange-50/50 to-white shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <AlertCircle className="w-6 h-6 text-orange-500" />
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
                          <p className="text-xs text-orange-600 mt-1">
                            {action.programme.title} - {new Date(action.programme.date).toLocaleDateString('en-GB', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </p>
                        )}

                        {children.map(child => (
                          <div key={child.id} className="mt-3 pt-3 border-t border-orange-200">
                            <p className="text-xs text-orange-700 font-medium mb-2">{child.full_name}</p>

                            {action.action_purpose === 'attendance' && (
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => respondToActionMutation.mutate({ actionId: action.id, memberId: child.id, response: 'Yes' })}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="w-3 h-3 mr-1" />
                                  Yes
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => respondToActionMutation.mutate({ actionId: action.id, memberId: child.id, response: 'No' })}
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
                                      respondToActionMutation.mutate({ actionId: action.id, memberId: child.id, response: value });
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
                                      respondToActionMutation.mutate({ actionId: action.id, memberId: child.id, response: value });
                                    }
                                  }}
                                >
                                  Submit
                                </Button>
                              </div>
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
            <Card className="border-l-4 border-l-green-500 shadow-xl bg-gradient-to-br from-green-50/50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Clock className="w-6 h-6 text-green-500" />
                  Next Meeting
                </CardTitle>
              </CardHeader>
              <CardContent>
                {nextMeeting ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 bg-white border-2 border-green-200 rounded-xl hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-bold text-gray-900 text-lg mb-2">{nextMeeting.title}</h3>
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
            <Card className="border-l-4 border-l-purple-500 shadow-xl bg-gradient-to-br from-purple-50/50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Tent className="w-6 h-6 text-purple-500" />
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
                        className="p-4 bg-white border border-purple-100 rounded-xl hover:shadow-lg hover:border-purple-300 transition-all cursor-pointer"
                        onClick={() => navigate(createPageUrl('ParentEvents'))}
                      >
                        <p className="font-bold text-gray-900 mb-1">{event.title}</p>
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
                response: `Yes - ${new Date().toLocaleString()}`,
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