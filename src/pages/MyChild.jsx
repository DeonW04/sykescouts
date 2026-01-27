import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, User, Heart, Phone, Edit, Save, X, UserCircle, Camera, CheckCircle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';
import ParentNav from '../components/parent/ParentNav';

export default function MyChild() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: children = [], isLoading } = useQuery({
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

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.entities.Member.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['children'] });
      setEditMode(false);
      toast.success('Child details updated successfully');
    },
    onError: (error) => {
      toast.error('Error updating details: ' + error.message);
    },
  });

  const handleEdit = (child) => {
    setEditForm({
      id: child.id,
      preferred_name: child.preferred_name || '',
      address: child.address || '',
      medical_info: child.medical_info || '',
      allergies: child.allergies || '',
      dietary_requirements: child.dietary_requirements || '',
      medications: child.medications || '',
      emergency_contact_name: child.emergency_contact_name || '',
      emergency_contact_phone: child.emergency_contact_phone || '',
      emergency_contact_relationship: child.emergency_contact_relationship || '',
      parent_one_name: child.parent_one_name || '',
      parent_one_phone: child.parent_one_phone || '',
      parent_two_name: child.parent_two_name || '',
      parent_two_phone: child.parent_two_phone || '',
      photo_consent: child.photo_consent || false,
    });
    setEditMode(true);
  };

  const handleSave = () => {
    const { id, ...data } = editForm;
    updateMemberMutation.mutate({ id, data });
  };

  const { data: allUsers = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user,
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const child = children[0];

  const parent1HasAccount = child && child.parent_one_email && allUsers.some(u => u.email === child.parent_one_email);
  const parent2HasAccount = child && child.parent_two_email && allUsers.some(u => u.email === child.parent_two_email);
  const registeredCount = (parent1HasAccount ? 1 : 0) + (parent2HasAccount ? 1 : 0);

  if (!child) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ParentNav />
        <div className="bg-[#7413dc] text-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              onClick={() => navigate(createPageUrl('ParentDashboard'))}
              className="text-white hover:bg-white/10 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <h1 className="text-3xl font-bold">My Child</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-600">No child registered yet.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const age = calculateAge(child.date_of_birth);
  const section = sections.find(s => s.id === child.section_id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <ParentNav />
      {/* Header */}
      <div className="relative bg-gradient-to-br from-blue-600 to-[#7413dc] text-white py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <Button
            variant="ghost"
            onClick={() => navigate(createPageUrl('ParentDashboard'))}
            className="text-white hover:bg-white/20 mb-6 -ml-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white rounded-2xl flex items-center justify-center text-[#7413dc] font-bold text-4xl shadow-2xl">
                {child.full_name.charAt(0)}
              </div>
              <div>
                <h1 className="text-4xl font-bold mb-2">{child.full_name}</h1>
                <div className="flex items-center gap-4 flex-wrap">
                  <p className="text-blue-100 text-lg font-medium">{section?.display_name}</p>
                  <Badge variant="secondary" className="bg-white/20 text-white text-sm">
                    {age.years} years {age.months} months
                  </Badge>
                </div>
              </div>
            </div>
            {!editMode ? (
              <Button 
                onClick={() => handleEdit(child)}
                size="lg"
                className="bg-white text-[#7413dc] hover:bg-blue-50 font-semibold shadow-xl"
              >
                <Edit className="w-5 h-5 mr-2" />
                Edit Details
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button 
                  onClick={handleSave}
                  disabled={updateMemberMutation.isPending}
                  size="lg"
                  className="bg-white text-[#7413dc] hover:bg-blue-50 font-semibold shadow-xl"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Save
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setEditMode(false)}
                  size="lg"
                  className="bg-white/10 text-white border-white/30 hover:bg-white/20"
                >
                  <X className="w-5 h-5 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Tabs defaultValue="personal" className="space-y-8">
          <TabsList className="bg-white/80 backdrop-blur-sm border shadow-lg p-1">
            <TabsTrigger value="personal" className="data-[state=active]:bg-[#7413dc] data-[state=active]:text-white">
              <User className="w-4 h-4 mr-2" />
              Personal
            </TabsTrigger>
            <TabsTrigger value="parent" className="data-[state=active]:bg-[#7413dc] data-[state=active]:text-white">
              <UserCircle className="w-4 h-4 mr-2" />
              Parents
            </TabsTrigger>
            <TabsTrigger value="medical" className="data-[state=active]:bg-[#7413dc] data-[state=active]:text-white">
              <Heart className="w-4 h-4 mr-2" />
              Medical
            </TabsTrigger>
            <TabsTrigger value="emergency" className="data-[state=active]:bg-[#7413dc] data-[state=active]:text-white">
              <Phone className="w-4 h-4 mr-2" />
              Emergency
            </TabsTrigger>
            <TabsTrigger value="consent" className="data-[state=active]:bg-[#7413dc] data-[state=active]:text-white">
              <Camera className="w-4 h-4 mr-2" />
              Consent
            </TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal">
            <Card className="shadow-xl bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-2xl">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>First Name</Label>
                    <p className="mt-1 font-medium">{child.first_name}</p>
                  </div>
                  <div>
                    <Label>Surname</Label>
                    <p className="mt-1 font-medium">{child.surname}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Preferred Name</Label>
                    {editMode ? (
                      <Input
                        value={editForm.preferred_name}
                        onChange={(e) => setEditForm({ ...editForm, preferred_name: e.target.value })}
                      />
                    ) : (
                      <p className="mt-1 font-medium">{child.preferred_name || 'Not set'}</p>
                    )}
                  </div>
                  <div>
                    <Label>Gender</Label>
                    <p className="mt-1 font-medium">{child.gender || 'Not provided'}</p>
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Date of Birth</Label>
                    <p className="mt-1 font-medium">
                      {new Date(child.date_of_birth).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <Label>Section</Label>
                    <p className="mt-1 font-medium">{section?.display_name}</p>
                  </div>
                </div>
                <div>
                  <Label>Home Address</Label>
                  {editMode ? (
                    <Textarea
                      value={editForm.address}
                      onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium whitespace-pre-line">{child.address || 'Not provided'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Parent Details Tab */}
          <TabsContent value="parent">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Parent One</CardTitle>
                    {!editMode && child.parent_one_email && (
                      parent1HasAccount ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Account Registered
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600">
                          <X className="w-3 h-3 mr-1" />
                          No Account
                        </Badge>
                      )
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <p className="mt-1 font-medium">{child.parent_one_first_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label>Surname</Label>
                      <p className="mt-1 font-medium">{child.parent_one_surname || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <p className="mt-1 font-medium">{child.parent_one_email || 'Not provided'}</p>
                    {!editMode && (
                      <p className="text-xs text-gray-500 mt-1">Email addresses can only be edited by leaders</p>
                    )}
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    {editMode ? (
                      <Input
                        type="tel"
                        value={editForm.parent_one_phone}
                        onChange={(e) => setEditForm({ ...editForm, parent_one_phone: e.target.value })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 font-medium">{child.parent_one_phone || 'Not provided'}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Parent Two</CardTitle>
                    {!editMode && child.parent_two_email && (
                      parent2HasAccount ? (
                        <Badge className="bg-green-100 text-green-800 border-green-300">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Account Registered
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-600">
                          <X className="w-3 h-3 mr-1" />
                          No Account
                        </Badge>
                      )
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <Label>First Name</Label>
                      <p className="mt-1 font-medium">{child.parent_two_first_name || 'Not provided'}</p>
                    </div>
                    <div>
                      <Label>Surname</Label>
                      <p className="mt-1 font-medium">{child.parent_two_surname || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <Label>Email Address</Label>
                    <p className="mt-1 font-medium">{child.parent_two_email || 'Not provided'}</p>
                    {!editMode && (
                      <p className="text-xs text-gray-500 mt-1">Email addresses can only be edited by leaders</p>
                    )}
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    {editMode ? (
                      <Input
                        type="tel"
                        value={editForm.parent_two_phone}
                        onChange={(e) => setEditForm({ ...editForm, parent_two_phone: e.target.value })}
                        className="mt-1"
                      />
                    ) : (
                      <p className="mt-1 font-medium">{child.parent_two_phone || 'Not provided'}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Medical Info Tab */}
          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <CardTitle>Medical Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Doctor's Surgery</Label>
                  <p className="mt-1 font-medium">{child.doctors_surgery || 'Not provided'}</p>
                </div>
                <div>
                  <Label>Doctor's Surgery Address</Label>
                  <p className="mt-1 font-medium whitespace-pre-line">{child.doctors_surgery_address || 'Not provided'}</p>
                </div>
                <div>
                  <Label>Doctor's Phone Number</Label>
                  <p className="mt-1 font-medium">{child.doctors_phone || 'Not provided'}</p>
                </div>
                <div>
                  <Label>Medical Conditions</Label>
                  {editMode ? (
                    <Textarea
                      value={editForm.medical_info}
                      onChange={(e) => setEditForm({ ...editForm, medical_info: e.target.value })}
                      placeholder="List any medical conditions"
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{child.medical_info || 'None reported'}</p>
                  )}
                </div>
                <div>
                  <Label>Allergies</Label>
                  {editMode ? (
                    <Textarea
                      value={editForm.allergies}
                      onChange={(e) => setEditForm({ ...editForm, allergies: e.target.value })}
                      placeholder="List any allergies"
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{child.allergies || 'None reported'}</p>
                  )}
                </div>
                <div>
                  <Label>Dietary Requirements</Label>
                  {editMode ? (
                    <Textarea
                      value={editForm.dietary_requirements}
                      onChange={(e) => setEditForm({ ...editForm, dietary_requirements: e.target.value })}
                      placeholder="List any dietary requirements"
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{child.dietary_requirements || 'None'}</p>
                  )}
                </div>
                <div>
                  <Label>Regular Medications</Label>
                  {editMode ? (
                    <Textarea
                      value={editForm.medications}
                      onChange={(e) => setEditForm({ ...editForm, medications: e.target.value })}
                      placeholder="List any regular medications"
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{child.medications || 'None'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Emergency Contact Tab */}
          <TabsContent value="emergency">
            <Card>
              <CardHeader>
                <CardTitle>Emergency Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Contact Name</Label>
                  {editMode ? (
                    <Input
                      value={editForm.emergency_contact_name}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_name: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{child.emergency_contact_name || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <Label>Contact Phone</Label>
                  {editMode ? (
                    <Input
                      value={editForm.emergency_contact_phone}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_phone: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{child.emergency_contact_phone || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <Label>Relationship</Label>
                  {editMode ? (
                    <Input
                      value={editForm.emergency_contact_relationship}
                      onChange={(e) => setEditForm({ ...editForm, emergency_contact_relationship: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{child.emergency_contact_relationship || 'Not provided'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Consent Tab */}
          <TabsContent value="consent">
            <Card>
              <CardHeader>
                <CardTitle>Photo & Media Consent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start justify-between p-4 bg-blue-50 rounded-lg">
                  <div className="flex-1">
                    <Label className="text-base font-semibold">Photo Consent</Label>
                    <p className="text-sm text-gray-600 mt-2">
                      I give permission for photos and videos of my child to be taken during scout activities and used for promotional purposes.
                    </p>
                  </div>
                  <div className="ml-4">
                    {editMode ? (
                      <Switch
                        checked={editForm.photo_consent}
                        onCheckedChange={(checked) => setEditForm({ ...editForm, photo_consent: checked })}
                      />
                    ) : (
                      <Badge variant={child.photo_consent ? "default" : "secondary"} className={child.photo_consent ? "bg-green-600" : ""}>
                        {child.photo_consent ? 'Granted' : 'Not Granted'}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}