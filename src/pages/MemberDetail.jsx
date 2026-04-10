import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Edit, User, Users, Heart, Award, Calendar, FileText, CheckCircle, XCircle, AlertCircle, Star, Loader2 } from 'lucide-react';
import EditMemberDialog from '../components/EditMemberDialog';
import BadgesTab from '../components/member/BadgesTab';
import { toast } from 'sonner';
import LeaderNav from '../components/leader/LeaderNav';
import { createPageUrl } from '../utils';

// Badge IDs to auto-tick all requirements for on investment
const INVESTMENT_BADGE_IDS = [
  '6974158e478e055ffb2477ca',
  '69a019485d963fb039dd3c52',
  '69a01930136941e6329f31d4',
  '69a0197f06ed6d5a44a21573',
];

export default function MemberDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const memberId = urlParams.get('id');
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isInvesting, setIsInvesting] = useState(false);

  const { data: member, isLoading } = useQuery({
    queryKey: ['member', memberId],
    queryFn: async () => {
      const members = await base44.entities.Member.filter({ id: memberId });
      return members[0];
    },
    enabled: !!memberId,
  });

  const { data: section } = useQuery({
    queryKey: ['section', member?.section_id],
    queryFn: async () => {
      const sections = await base44.entities.Section.filter({ id: member.section_id });
      return sections[0];
    },
    enabled: !!member?.section_id,
  });

  const { data: parentRegistration = {} } = useQuery({
    queryKey: ['parent-registration', member?.parent_one_email, member?.parent_two_email],
    queryFn: async () => {
      if (!member) return {};
      const emails = [member.parent_one_email, member.parent_two_email].filter(Boolean);
      if (emails.length === 0) return {};
      const response = await base44.functions.invoke('checkParentRegistration', { emails });
      return response.data.results || {};
    },
    enabled: !!member,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', memberId],
    queryFn: async () => {
      const records = await base44.entities.Attendance.filter({ member_id: memberId });
      return records.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    },
    enabled: !!memberId,
  });

  const parentAccountExists = member && (
    (member.parent_one_email && parentRegistration[member.parent_one_email]) ||
    (member.parent_two_email && parentRegistration[member.parent_two_email])
  );

  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0) { years--; months += 12; }
    return { years, months };
  };

  // Core investment logic — ticks all requirements for each badge and creates
  // a pending MemberBadgeAward. Does NOT mark anything as already awarded.
  const performInvestment = async () => {
    setIsInvesting(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // 1. Mark the member as invested
      await base44.entities.Member.update(memberId, { invested: true });

      // 2. For each investment badge, tick all its requirements and queue the award
      for (const badgeId of INVESTMENT_BADGE_IDS) {
        // Fetch requirements for this badge
        const requirements = await base44.entities.BadgeRequirement.filter({ badge_id: badgeId });

        // Fetch existing progress so we don't double-create
        const existingProgress = await base44.entities.MemberRequirementProgress.filter({
          member_id: memberId,
          badge_id: badgeId,
        });

        // Tick every requirement
        for (const req of requirements) {
          const alreadyDone = existingProgress.find(p => p.requirement_id === req.id && p.completed);
          if (alreadyDone) continue;

          const existing = existingProgress.find(p => p.requirement_id === req.id);
          const requiredCount = req.required_completions || 1;

          if (existing) {
            await base44.entities.MemberRequirementProgress.update(existing.id, {
              completion_count: requiredCount,
              completed: true,
              completed_date: today,
              source: 'manual',
            });
          } else {
            await base44.entities.MemberRequirementProgress.create({
              member_id: memberId,
              badge_id: badgeId,
              module_id: req.module_id,
              requirement_id: req.id,
              completion_count: requiredCount,
              completed: true,
              completed_date: today,
              source: 'manual',
            });
          }
        }

        // Update or create MemberBadgeProgress to 'completed'
        const existingBadgeProgress = await base44.entities.MemberBadgeProgress.filter({
          member_id: memberId,
          badge_id: badgeId,
        });
        if (existingBadgeProgress.length > 0) {
          await base44.entities.MemberBadgeProgress.update(existingBadgeProgress[0].id, {
            status: 'completed',
            completion_date: today,
          });
        } else {
          await base44.entities.MemberBadgeProgress.create({
            member_id: memberId,
            badge_id: badgeId,
            status: 'completed',
            completion_date: today,
          });
        }

        // Create MemberBadgeAward as 'pending' (due but not yet physically awarded)
        const existingAward = await base44.entities.MemberBadgeAward.filter({
          member_id: memberId,
          badge_id: badgeId,
        });
        if (existingAward.length === 0) {
          await base44.entities.MemberBadgeAward.create({
            member_id: memberId,
            badge_id: badgeId,
            completed_date: today,
            award_status: 'pending',
          });
        }
      }

      // 3. Also award the World Membership badge if it exists (original behaviour)
      const membershipBadges = await base44.entities.BadgeDefinition.filter({
        special_type: 'membership',
        active: true,
      });
      if (membershipBadges[0]) {
        const existingAward = await base44.entities.MemberBadgeAward.filter({
          member_id: memberId,
          badge_id: membershipBadges[0].id,
        });
        if (existingAward.length === 0) {
          await base44.entities.MemberBadgeAward.create({
            member_id: memberId,
            badge_id: membershipBadges[0].id,
            completed_date: today,
            award_status: 'pending',
          });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      queryClient.invalidateQueries({ queryKey: ['badge-progress'] });
      queryClient.invalidateQueries({ queryKey: ['awards'] });
      toast.success('Member invested! All investment badges marked as due.');
    } catch (error) {
      toast.error('Error investing member: ' + error.message);
    } finally {
      setIsInvesting(false);
    }
  };

  const handleSaveMember = async (formData) => {
    try {
      const investedChanged = !member.invested && formData.invested;
      await base44.entities.Member.update(memberId, formData);

      if (investedChanged) {
        // Trigger full investment logic (badges etc.) when checkbox is ticked via edit dialog
        await performInvestment();
        return; // performInvestment already shows toast and invalidates queries
      }

      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      setShowEditDialog(false);
      toast.success('Member updated successfully');
    } catch (error) {
      toast.error('Error updating member: ' + error.message);
    }
  };

  const [sendingInvite, setSendingInvite] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#004851] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading member details...</p>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-gray-600">Member not found</p>
          <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
        </Card>
      </div>
    );
  }

  const age = calculateAge(member.date_of_birth);

  return (
    <div className="min-h-screen bg-gray-50">
      <LeaderNav />
      {/* Header */}
      <div className="bg-[#004851] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start gap-4">
            <div className="flex items-center gap-4 md:gap-6 flex-1">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-white rounded-full flex items-center justify-center text-[#004851] font-bold text-2xl md:text-3xl flex-shrink-0">
                {member.full_name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl md:text-3xl font-bold truncate">{member.full_name}</h1>
                <div className="flex items-center gap-2 md:gap-4 mt-2 flex-wrap">
                  <p className="text-white/80 text-sm md:text-base">{section?.display_name}</p>
                  <Badge variant="secondary" className="bg-white/20 text-white text-xs md:text-sm">
                    {age.years}y {age.months}m
                  </Badge>
                  {member.patrol && (
                    <Badge variant="secondary" className="bg-white/20 text-white text-xs md:text-sm">
                      {member.patrol}
                    </Badge>
                  )}
                  {member.invested && (
                    <Badge variant="secondary" className="bg-yellow-400/90 text-yellow-900 text-xs md:text-sm">
                      <Star className="w-3 h-3 mr-1" />
                      Invested
                    </Badge>
                  )}
                  <div className={`flex items-center gap-1 md:gap-2 px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium ${
                    parentAccountExists ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                  }`}>
                    {parentAccountExists ? (
                      <>
                        <CheckCircle className="w-3 h-3 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Parent Portal Registered</span>
                        <span className="sm:hidden">Registered</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3 md:w-4 md:h-4" />
                        <span className="hidden sm:inline">Not Registered</span>
                        <span className="sm:hidden">No Account</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto flex-wrap">
              {/* Invest Member button — only shows when not yet invested */}
              {!member.invested && (
                <Button
                  onClick={performInvestment}
                  disabled={isInvesting}
                  className="bg-yellow-500 hover:bg-yellow-400 text-yellow-900 font-semibold flex-1 md:flex-none"
                >
                  {isInvesting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      <span className="hidden sm:inline">Investing...</span>
                    </>
                  ) : (
                    <>
                      <Star className="w-4 h-4 md:mr-2" />
                      <span className="hidden sm:inline">Invest Member</span>
                      <span className="sm:hidden">Invest</span>
                    </>
                  )}
                </Button>
              )}
              <Button
                onClick={() => setShowEditDialog(true)}
                className="bg-white text-[#004851] hover:bg-gray-100 flex-1 md:flex-none"
              >
                <Edit className="w-4 h-4 md:mr-2" />
                <span className="hidden sm:inline">Edit</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (confirm('Are you sure you want to archive this member? They will be hidden from the main list but their data will be kept.')) {
                    base44.entities.Member.update(memberId, { active: false }).then(() => {
                      toast.success('Member archived');
                      navigate(createPageUrl('LeaderMembers'));
                    });
                  }
                }}
                className="bg-white border-orange-300 text-orange-600 hover:bg-orange-50 flex-1 md:flex-none"
              >
                <span className="hidden sm:inline">Archive Member</span>
                <span className="sm:hidden">Archive</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border grid grid-cols-6 md:inline-flex">
            <TabsTrigger value="overview" className="flex items-center justify-center md:gap-2 px-2 md:px-4">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline text-sm">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="parents" className="flex items-center justify-center md:gap-2 px-2 md:px-4">
              <Users className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline text-sm">Parents</span>
            </TabsTrigger>
            <TabsTrigger value="medical" className="flex items-center justify-center md:gap-2 px-2 md:px-4">
              <Heart className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline text-sm">Medical</span>
            </TabsTrigger>
            <TabsTrigger value="badges" className="flex items-center justify-center md:gap-2 px-2 md:px-4">
              <Award className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline text-sm">Badges</span>
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center justify-center md:gap-2 px-2 md:px-4">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline text-sm">Attendance</span>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex items-center justify-center md:gap-2 px-2 md:px-4">
              <FileText className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline text-sm">Notes</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Full Name</p>
                    <p className="font-medium">{member.full_name}</p>
                  </div>
                  {member.preferred_name && (
                    <div>
                      <p className="text-sm text-gray-600">Preferred Name</p>
                      <p className="font-medium">{member.preferred_name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Date of Birth</p>
                    <p className="font-medium">
                      {new Date(member.date_of_birth).toLocaleDateString()} ({age.years} years, {age.months} months)
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Section</p>
                    <p className="font-medium">{section?.display_name}</p>
                  </div>
                  {member.patrol && (
                    <div>
                      <p className="text-sm text-gray-600">Patrol</p>
                      <p className="font-medium">{member.patrol}</p>
                    </div>
                  )}
                  {member.join_date && (
                    <div>
                      <p className="text-sm text-gray-600">Join Date</p>
                      <p className="font-medium">{new Date(member.join_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  {member.scouting_start_date && (
                    <div>
                      <p className="text-sm text-gray-600">Scouting Movement Start Date</p>
                      <p className="font-medium">{new Date(member.scouting_start_date).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Invested</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{member.invested ? 'Yes' : 'No'}</p>
                      {member.invested && <Star className="w-4 h-4 text-yellow-500" />}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {member.address && (
                    <div>
                      <p className="text-sm text-gray-600">Address</p>
                      <p className="font-medium whitespace-pre-line">{member.address}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Emergency Contact</p>
                    <p className="font-medium">{member.emergency_contact_name || 'Not provided'}</p>
                    {member.emergency_contact_phone && (
                      <p className="text-sm text-gray-500">{member.emergency_contact_phone}</p>
                    )}
                    {member.emergency_contact_relationship && (
                      <p className="text-sm text-gray-500">({member.emergency_contact_relationship})</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Parents Tab */}
          <TabsContent value="parents" className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>Parent One</CardTitle>
                  {member.parent_one_email && (
                    parentRegistration[member.parent_one_email] ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Account Registered
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        <XCircle className="w-3 h-3" />
                        No Account
                      </div>
                    )
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{member.parent_one_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{member.parent_one_email || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{member.parent_one_phone || 'Not provided'}</p>
                  </div>
                  {member.parent_one_email && !parentRegistration[member.parent_one_email] && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        setSendingInvite(true);
                        try {
                          await base44.functions.invoke('sendParentPortalInvite', {
                            parentEmail: member.parent_one_email,
                            parentName: member.parent_one_name || 'Parent',
                            childName: member.full_name
                          });
                          toast.success('Invitation sent');
                          queryClient.invalidateQueries({ queryKey: ['parent-registration'] });
                        } catch (error) {
                          toast.error('Failed to send invitation: ' + (error.message || 'Unknown error'));
                        } finally {
                          setSendingInvite(false);
                        }
                      }}
                      disabled={sendingInvite}
                      className="bg-[#7413dc] hover:bg-[#5c0fb0]"
                    >
                      Invite to Parent Portal
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle>Parent Two</CardTitle>
                  {member.parent_two_email && (
                    parentRegistration[member.parent_two_email] ? (
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Registered
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                        <XCircle className="w-3 h-3" />
                        No Account
                      </div>
                    )
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium">{member.parent_two_name || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{member.parent_two_email || 'Not provided'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Phone</p>
                    <p className="font-medium">{member.parent_two_phone || 'Not provided'}</p>
                  </div>
                  {member.parent_two_email && !parentRegistration[member.parent_two_email] && (
                    <Button
                      size="sm"
                      onClick={async () => {
                        setSendingInvite(true);
                        try {
                          await base44.functions.invoke('sendParentPortalInvite', {
                            parentEmail: member.parent_two_email,
                            parentName: member.parent_two_name || 'Parent',
                            childName: member.full_name
                          });
                          toast.success('Invitation sent');
                          queryClient.invalidateQueries({ queryKey: ['parent-registration'] });
                        } catch (error) {
                          toast.error('Failed to send invitation: ' + (error.message || 'Unknown error'));
                        } finally {
                          setSendingInvite(false);
                        }
                      }}
                      disabled={sendingInvite}
                      className="bg-[#7413dc] hover:bg-[#5c0fb0]"
                    >
                      Invite to Parent Portal
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Medical Tab */}
          <TabsContent value="medical" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Medical Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Medical Conditions</p>
                  <p className="font-medium">{member.medical_info || 'None reported'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Allergies</p>
                  <p className="font-medium">{member.allergies || 'None reported'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Dietary Requirements</p>
                  <p className="font-medium">{member.dietary_requirements || 'None'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">Medications</p>
                  <p className="font-medium">{member.medications || 'None'}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Badges Tab */}
          <TabsContent value="badges">
            <BadgesTab memberId={memberId} />
          </TabsContent>

          {/* Attendance Tab */}
          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                {attendance.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No attendance records</p>
                ) : (
                  <div className="space-y-2">
                    {attendance.map(record => (
                      <div key={record.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{new Date(record.date).toLocaleDateString()}</p>
                          {record.notes && <p className="text-sm text-gray-500">{record.notes}</p>}
                        </div>
                        <Badge variant={
                          record.status === 'present' ? 'default' :
                          record.status === 'absent' ? 'destructive' :
                          'secondary'
                        }>
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notes Tab */}
          <TabsContent value="notes" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Leader Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{member.notes || 'No notes recorded'}</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <EditMemberDialog
        member={member}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={handleSaveMember}
      />
    </div>
  );
}