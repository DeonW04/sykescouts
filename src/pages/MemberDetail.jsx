import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Edit, User, Users, Heart, Award, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react';
import EditMemberDialog from '../components/EditMemberDialog';
import { toast } from 'sonner';

export default function MemberDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const memberId = urlParams.get('id');
  const [showEditDialog, setShowEditDialog] = useState(false);

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

  const { data: parents = [] } = useQuery({
    queryKey: ['parents', member?.parent_ids],
    queryFn: async () => {
      if (!member?.parent_ids?.length) return [];
      const allParents = await base44.entities.Parent.filter({});
      return allParents.filter(p => member.parent_ids.includes(p.id));
    },
    enabled: !!member?.parent_ids?.length,
  });

  const { data: parentUsers = [] } = useQuery({
    queryKey: ['parent-users', parents],
    queryFn: async () => {
      if (!parents.length) return [];
      const allUsers = await base44.entities.User.list();
      return allUsers.filter(u => parents.some(p => p.user_id === u.id));
    },
    enabled: parents.length > 0,
  });

  const { data: badgeProgress = [] } = useQuery({
    queryKey: ['badge-progress', memberId],
    queryFn: () => base44.entities.BadgeProgress.filter({ member_id: memberId }),
    enabled: !!memberId,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: ['attendance', memberId],
    queryFn: async () => {
      const records = await base44.entities.Attendance.filter({ member_id: memberId });
      return records.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
    },
    enabled: !!memberId,
  });

  const { data: parentAccountExists } = useQuery({
    queryKey: ['parent-account', member?.parent_email],
    queryFn: async () => {
      if (!member?.parent_email) return false;
      const users = await base44.entities.User.filter({ email: member.parent_email });
      return users.length > 0;
    },
    enabled: !!member?.parent_email,
  });

  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    return { years, months };
  };

  const handleSaveMember = async (formData) => {
    try {
      await base44.entities.Member.update(memberId, formData);
      queryClient.invalidateQueries({ queryKey: ['member', memberId] });
      setShowEditDialog(false);
      toast.success('Member updated successfully');
    } catch (error) {
      toast.error('Error updating member: ' + error.message);
    }
  };

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
          <Button onClick={() => navigate(-1)} className="mt-4">
            Go Back
          </Button>
        </Card>
      </div>
    );
  }

  const age = calculateAge(member.date_of_birth);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#004851] text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="text-white hover:bg-white/10 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Members
          </Button>
          
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-[#004851] font-bold text-3xl">
                {member.full_name.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{member.full_name}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-white/80">{section?.display_name}</p>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {age.years} years {age.months} months
                  </Badge>
                  {member.patrol && (
                    <Badge variant="secondary" className="bg-white/20 text-white">
                      {member.patrol} Patrol
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button 
              onClick={() => setShowEditDialog(true)}
              className="bg-white text-[#004851] hover:bg-gray-100"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="overview">
              <User className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="parents">
              <Users className="w-4 h-4 mr-2" />
              Parents
            </TabsTrigger>
            <TabsTrigger value="medical">
              <Heart className="w-4 h-4 mr-2" />
              Medical
            </TabsTrigger>
            <TabsTrigger value="badges">
              <Award className="w-4 h-4 mr-2" />
              Badges
            </TabsTrigger>
            <TabsTrigger value="attendance">
              <Calendar className="w-4 h-4 mr-2" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="notes">
              <FileText className="w-4 h-4 mr-2" />
              Notes
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
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Parent/Guardian</span>
                  {member.parent_email && (
                    <Badge variant={parentAccountExists ? "default" : "secondary"} className="flex items-center gap-1">
                      {parentAccountExists ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Account Linked
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          No Account Yet
                        </>
                      )}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Name</p>
                  <p className="font-medium">{member.parent_name || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{member.parent_email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-medium">{member.parent_phone || 'Not provided'}</p>
                </div>
              </CardContent>
            </Card>
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
          <TabsContent value="badges" className="space-y-6">
            {badgeProgress.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center text-gray-500">
                  No badge progress recorded yet
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badgeProgress.map(progress => (
                  <Card key={progress.id}>
                    <CardContent className="p-4">
                      <Badge className="mb-2">{progress.status}</Badge>
                      <p className="text-sm text-gray-600">Badge progress details coming soon</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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