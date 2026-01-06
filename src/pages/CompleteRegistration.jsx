import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

export default function CompleteRegistration() {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  
  const [user, setUser] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    preferred_name: '',
    date_of_birth: '',
    section_id: '',
    patrol: '',
    address: '',
    medical_info: '',
    allergies: '',
    dietary_requirements: '',
    medications: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    photo_consent: false,
  });

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(`/complete-registration?token=${token}`);
      return;
    }
    const currentUser = await base44.auth.me();
    setUser(currentUser);
  };

  const { data: invitation, isLoading } = useQuery({
    queryKey: ['invitation', token],
    queryFn: async () => {
      const invitations = await base44.entities.MemberInvitation.filter({ invite_token: token });
      return invitations[0];
    },
    enabled: !!token && !!user,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  useEffect(() => {
    if (invitation && user) {
      // Pre-fill form with invitation data
      setFormData(prev => ({
        ...prev,
        full_name: invitation.child_name,
        date_of_birth: invitation.child_dob,
      }));
    }
  }, [invitation, user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Check if parent record exists for this user
      let parentRecords = await base44.entities.Parent.filter({ user_id: user.id });
      let parent;

      if (parentRecords.length === 0) {
        // Create parent record
        parent = await base44.entities.Parent.create({
          user_id: user.id,
          phone: invitation.parent_phone,
          address: formData.address,
        });
      } else {
        parent = parentRecords[0];
      }

      // Create member record
      await base44.entities.Member.create({
        ...formData,
        parent_ids: [parent.id],
        active: true,
        join_date: new Date().toISOString().split('T')[0],
      });

      // Update invitation status
      await base44.entities.MemberInvitation.update(invitation.id, {
        status: 'completed',
      });

      setCompleted(true);
      toast.success('Registration completed successfully!');
    } catch (error) {
      toast.error('Error completing registration: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-[#7413dc] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-gray-600">Invalid or expired invitation link</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitation.status === 'completed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Already Completed</h2>
            <p className="text-gray-600">This invitation has already been completed.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Complete!</h2>
            <p className="text-gray-600 mb-6">
              {formData.full_name}'s registration has been completed successfully. 
              You'll receive confirmation shortly.
            </p>
            <Button onClick={() => window.location.href = '/parent-dashboard'}>
              Go to Parent Portal
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#7413dc] rounded-full flex items-center justify-center">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <CardTitle>Complete Child Registration</CardTitle>
                <p className="text-sm text-gray-500 mt-1">
                  Complete the registration for {invitation.child_name}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Child Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Child's Details</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name *</Label>
                    <Input
                      id="full_name"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="preferred_name">Preferred Name</Label>
                    <Input
                      id="preferred_name"
                      value={formData.preferred_name}
                      onChange={(e) => setFormData({ ...formData, preferred_name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth *</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section_id">Section *</Label>
                    <Select
                      value={formData.section_id}
                      onValueChange={(value) => setFormData({ ...formData, section_id: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select section" />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map(section => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.display_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Home Address *</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              {/* Medical Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Medical Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="medical_info">Medical Conditions</Label>
                  <Textarea
                    id="medical_info"
                    value={formData.medical_info}
                    onChange={(e) => setFormData({ ...formData, medical_info: e.target.value })}
                    placeholder="Any medical conditions we should be aware of"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="Any allergies"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dietary_requirements">Dietary Requirements</Label>
                    <Input
                      id="dietary_requirements"
                      value={formData.dietary_requirements}
                      onChange={(e) => setFormData({ ...formData, dietary_requirements: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medications">Medications</Label>
                    <Input
                      id="medications"
                      value={formData.medications}
                      onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Emergency Contact</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">Name *</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone">Phone *</Label>
                    <Input
                      id="emergency_contact_phone"
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_relationship">Relationship *</Label>
                  <Input
                    id="emergency_contact_relationship"
                    value={formData.emergency_contact_relationship}
                    onChange={(e) => setFormData({ ...formData, emergency_contact_relationship: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Consent */}
              <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                <Checkbox
                  id="photo_consent"
                  checked={formData.photo_consent}
                  onCheckedChange={(checked) => setFormData({ ...formData, photo_consent: checked })}
                />
                <div className="space-y-1">
                  <Label htmlFor="photo_consent" className="text-sm font-medium cursor-pointer">
                    Photo Consent
                  </Label>
                  <p className="text-xs text-gray-500">
                    I give permission for photos of my child to be taken and used on the 
                    group's website and social media.
                  </p>
                </div>
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="w-full bg-[#7413dc] hover:bg-[#5c0fb0]"
              >
                {submitting ? 'Completing Registration...' : 'Complete Registration'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}