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
import { ArrowLeft, User, Heart, Phone, Edit, Save, X, UserCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { toast } from 'sonner';

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
      const members = await base44.entities.Member.filter({ parent_email: user.email });
      return members;
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
      parent_name: child.parent_name || '',
      parent_email: child.parent_email || '',
      parent_phone: child.parent_phone || '',
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

  if (!child) {
    return (
      <div className="min-h-screen bg-gray-50">
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
          
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-[#7413dc] font-bold text-3xl">
                {child.full_name.charAt(0)}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{child.full_name}</h1>
                <div className="flex items-center gap-4 mt-2">
                  <p className="text-white/80">{section?.display_name}</p>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {age.years} years {age.months} months
                  </Badge>
                </div>
              </div>
            </div>
            {!editMode ? (
              <Button 
                onClick={() => handleEdit(child)}
                className="bg-white text-[#7413dc] hover:bg-gray-100"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Details
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={handleSave}
                  disabled={updateMemberMutation.isPending}
                  className="bg-white text-[#7413dc] hover:bg-gray-100"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setEditMode(false)}
                  className="bg-white/10 text-white border-white hover:bg-white/20"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="bg-white border">
            <TabsTrigger value="personal">
              <User className="w-4 h-4 mr-2" />
              Personal Info
            </TabsTrigger>
            <TabsTrigger value="parent">
              <UserCircle className="w-4 h-4 mr-2" />
              Parent Details
            </TabsTrigger>
            <TabsTrigger value="medical">
              <Heart className="w-4 h-4 mr-2" />
              Medical Info
            </TabsTrigger>
            <TabsTrigger value="emergency">
              <Phone className="w-4 h-4 mr-2" />
              Emergency Contact
            </TabsTrigger>
          </TabsList>

          {/* Personal Info Tab */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <p className="mt-1 font-medium">{child.full_name}</p>
                  </div>
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
            <Card>
              <CardHeader>
                <CardTitle>Parent/Guardian Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Parent/Guardian Name</Label>
                  {editMode ? (
                    <Input
                      value={editForm.parent_name}
                      onChange={(e) => setEditForm({ ...editForm, parent_name: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{child.parent_name || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <Label>Email Address</Label>
                  {editMode ? (
                    <Input
                      type="email"
                      value={editForm.parent_email}
                      onChange={(e) => setEditForm({ ...editForm, parent_email: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{child.parent_email || 'Not provided'}</p>
                  )}
                </div>
                <div>
                  <Label>Phone Number</Label>
                  {editMode ? (
                    <Input
                      type="tel"
                      value={editForm.parent_phone}
                      onChange={(e) => setEditForm({ ...editForm, parent_phone: e.target.value })}
                      className="mt-1"
                    />
                  ) : (
                    <p className="mt-1 font-medium">{child.parent_phone || 'Not provided'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Medical Info Tab */}
          <TabsContent value="medical">
            <Card>
              <CardHeader>
                <CardTitle>Medical Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
        </Tabs>
      </div>
    </div>
  );
}