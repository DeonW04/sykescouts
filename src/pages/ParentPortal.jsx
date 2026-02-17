import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, UserCheck, UserX, AlertTriangle, Mail, CheckCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';

export default function ParentPortal() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => base44.entities.Member.filter({ active: true }),
  });

  const { data: parents = [] } = useQuery({
    queryKey: ['parents'],
    queryFn: () => base44.entities.Parent.filter({}),
  });

  const sendInviteMutation = useMutation({
    mutationFn: async ({ parentEmail, parentName, childName }) => {
      return base44.functions.invoke('sendParentPortalInvite', {
        parent_email: parentEmail,
        parent_name: parentName,
        child_name: childName,
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
  });

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

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8" />
              <div>
                <h1 className="text-3xl font-bold">Parent Portal Management</h1>
                <p className="mt-1 text-white/80">Track parent registrations and data completion</p>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              disabled={refreshing}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh Status
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Parents Registered</p>
                  <p className="text-3xl font-bold text-indigo-600">{percentRegistered}%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.parentOneRegistered + stats.parentTwoRegistered} of {stats.totalMembers * 2} possible
                  </p>
                </div>
                <UserCheck className="w-12 h-12 text-indigo-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">No Parent Registered</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.membersWithNoParent}</p>
                  <p className="text-xs text-gray-500 mt-1">members affected</p>
                </div>
                <UserX className="w-12 h-12 text-orange-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Data Completion</p>
                  <p className="text-3xl font-bold text-green-600">{stats.averageCompletion}%</p>
                  <p className="text-xs text-gray-500 mt-1">across all members</p>
                </div>
                <CheckCircle className="w-12 h-12 text-green-500 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Missing Important Data</p>
                  <p className="text-3xl font-bold text-red-600">{stats.missingImportantData}</p>
                  <p className="text-xs text-gray-500 mt-1">members incomplete</p>
                </div>
                <AlertTriangle className="w-12 h-12 text-red-500 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Members List */}
        <Card>
          <CardHeader>
            <CardTitle>Member Registration Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {members
                .sort((a, b) => new Date(a.date_of_birth).getTime() - new Date(b.date_of_birth).getTime())
                .map(member => {
                const completion = calculateDataCompletion(member);
                const parent1Registered = isParentRegistered(member.parent_one_email);
                const parent2Registered = isParentRegistered(member.parent_two_email);
                const hasParent2 = member.parent_two_email && member.parent_two_email.trim() !== '';

                return (
                  <div key={member.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}