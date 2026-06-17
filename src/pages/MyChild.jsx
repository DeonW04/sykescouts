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
import FloatingNav from '../components/public/FloatingNav';
import NavBarSpacer from '../components/public/NavBarSpacer';
import WebSubscriptionSection from '../components/parent/WebSubscriptionSection';

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

  const { data: portal, isLoading } = useQuery({
    queryKey: ['parent-portal', user?.email],
    queryFn: async () => {
      const res = await base44.functions.invoke('getParentPortalData', {});
      return res.data;
    },
    enabled: !!user?.email,
  });

  const children = portal?.children || [];
  const sections = portal?.sections || [];

  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return base44.functions.invoke('updateMyChild', { memberId: id, data });
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
      doctors_surgery: child.doctors_surgery || '',
      doctors_surgery_address: child.doctors_surgery_address || '',
      doctors_phone: child.doctors_phone || '',
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

  const calculateAge = (dob) => {
    const birthDate = new Date(dob);
    const today = new Date();
    let years = today.getFullYear() - birthDate.getFullYear();
    let months = today.getMonth() - birthDate.getMonth();
    if (months < 0) { years--; months += 12; }
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

  if (!child) {
    return (
      <div className="min-h-screen bg-gray-50">
        <FloatingNav />
        <NavBarSpacer />
        <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
          <div className="max-w-7xl mx-auto">
            <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 4px' }}>Parent Portal</p>
            <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(22px, 3vw, 32px)', color: '#1a1a2e', margin: 0 }}>My Child</h1>
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
    <div className="min-h-screen bg-gray-50">
      <FloatingNav />
      <NavBarSpacer />
      <div style={{ background: '#ffffff', borderBottom: '1px solid rgba(116,19,220,0.1)', padding: '20px 24px' }}>
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#7413dc] rounded-xl flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
              {child.full_name.charAt(0)}
            </div>
            <div>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#7413dc', margin: '0 0 2px' }}>Parent Portal</p>
              <h1 style={{ fontFamily: 'Outfit, sans-serif', fontWeight: 700, fontSize: 'clamp(20px, 3vw, 30px)', color: '#1a1a2e', margin: '0 0 2px', lineHeight: 1.2 }}>{child.full_name}</h1>
              <p style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '13px', color: 'rgba(26,26,46,0.45)', margin: 0 }}>{section?.display_name} · {age.years}y {age.months}m</p>
            </div>
          </div>
          {!editMode ? (
            <Button onClick={() => handleEdit(child)} className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white">
              <Edit className="w-4 h-4 mr-2" />Edit Details
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={updateMemberMutation.isPending} className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white">
                <Save className="w-4 h-4 mr-2" />Save
              </Button>
              <Button variant="outline" onClick={() => setEditMode(false)}>
                <X className="w-4 h-4 mr-2" />Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Tabs defaultValue="personal" className="space-y-8">
          <TabsList className="bg-white/80 backdrop-blur-sm border shadow-lg p-1 grid grid-cols-5 md:inline-flex">
            <TabsTrigger value="personal" className="data-[state=active]:bg-[#7413dc] data-[state=active]:text-white flex items-center justify-center md:gap-2 px-2 md:px-4">
              <User className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline text-sm">Personal</span>
            </TabsTrigger>
            <TabsTrigger value="parent" className="data-[state=active]:bg-[#7413dc] data-[state=active]:text-white flex items-center justify-center md:gap-2 px-2 md:px-4">
              <UserCircle className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline text-sm">Parents</span>
            </TabsTrigger>
            <TabsTrigger value="medical" className="data-[state=active]:bg-[#7413dc] data-[state=active]:text-white flex items-center justify-center md:gap-2 px-2 md:px-4">
              <Heart className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline text-sm">Medical</span>
            </TabsTrigger>
            <TabsTrigger value="emergency" className="data-[state=active]:bg-[#7413dc] data-[state=active]:text-white flex items-center justify-center md:gap-2 px-2 md:px-4">
              <Phone className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline text-sm">Emergency</span>
            </TabsTrigger>
            <TabsTrigger value="consent" className="data-[state=active]:bg-[#7413dc] data-[state=active]:text-white flex items-center justify-center md:gap-2 px-2 md:px-4">
              <Camera className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:inline text-sm">Consent</span>
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
                  <CardTitle>Parent One</CardTitle>
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
                  <CardTitle>Parent Two</CardTitle>
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
                {/* Doctor's Surgery — now editable */}
                <div>
                  <Label>Doctor's Surgery</Label>
                  {editMode ? (
                    <Input
                      value={editForm.doctors_surgery}
                      onChange={(e) => setEditForm({ ...editForm, doctors_surgery: e.target.value })}
                      placeholder="Surgery name"
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{child.doctors_surgery || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <Label>Doctor's Surgery Address</Label>
                  {editMode ? (
                    <Textarea
                      value={editForm.doctors_surgery_address}
                      onChange={(e) => setEditForm({ ...editForm, doctors_surgery_address: e.target.value })}
                      placeholder="Surgery address"
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium whitespace-pre-line">{child.doctors_surgery_address || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <Label>Doctor's Phone Number</Label>
                  {editMode ? (
                    <Input
                      type="tel"
                      value={editForm.doctors_phone}
                      onChange={(e) => setEditForm({ ...editForm, doctors_phone: e.target.value })}
                      placeholder="Surgery phone number"
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{child.doctors_phone || 'Not provided'}</p>
                  )}
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
                <CardTitle>Photo &amp; Media Consent</CardTitle>
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

        {/* Subscriptions section */}
        <div className="mt-8">
          <WebSubscriptionSection child={child} />
        </div>
      </div>
    </div>
  );
}