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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CheckCircle, UserCheck, Baby, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createPageUrl } from '../utils';

export default function CompleteRegistration() {
  const [user, setUser] = useState(null);
  const [isLeader, setIsLeader] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [noChildFound, setNoChildFound] = useState(false);
  
  const [userForm, setUserForm] = useState({
    display_name: '',
  });

  const [childForm, setChildForm] = useState({
    first_name: '',
    surname: '',
    full_name: '',
    preferred_name: '',
    date_of_birth: '',
    gender: '',
    section_id: '',
    patrol: '',
    parent_one_first_name: '',
    parent_one_surname: '',
    parent_one_name: '',
    parent_one_email: '',
    parent_one_phone: '',
    parent_two_first_name: '',
    parent_two_surname: '',
    parent_two_name: '',
    parent_two_email: '',
    parent_two_phone: '',
    address: '',
    doctors_surgery: '',
    doctors_surgery_address: '',
    doctors_phone: '',
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
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setUserForm({ display_name: currentUser.display_name || currentUser.full_name || '' });

      // Check if user is a leader
      if (currentUser.role === 'admin') {
        setIsLeader(true);
      } else {
        const leaders = await base44.entities.Leader.filter({ user_id: currentUser.id });
        setIsLeader(leaders.length > 0);
      }
    } catch (error) {
      base44.auth.redirectToLogin();
    }
  };

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => base44.entities.Section.filter({ active: true }),
  });

  const { data: existingChild } = useQuery({
    queryKey: ['child', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const members = await base44.entities.Member.filter({});
      const child = members.find(m => 
        m.parent_one_email === user.email || 
        m.parent_two_email === user.email
      );
      return child || null;
    },
    enabled: !!user && step === 2,
  });

  useEffect(() => {
    if (existingChild && step === 2) {
      setChildForm({
        first_name: existingChild.first_name || '',
        surname: existingChild.surname || '',
        full_name: existingChild.full_name || '',
        preferred_name: existingChild.preferred_name || '',
        date_of_birth: existingChild.date_of_birth || '',
        gender: existingChild.gender || '',
        section_id: existingChild.section_id || '',
        patrol: existingChild.patrol || '',
        parent_one_first_name: existingChild.parent_one_first_name || '',
        parent_one_surname: existingChild.parent_one_surname || '',
        parent_one_name: existingChild.parent_one_name || '',
        parent_one_email: existingChild.parent_one_email || user.email,
        parent_one_phone: existingChild.parent_one_phone || '',
        parent_two_first_name: existingChild.parent_two_first_name || '',
        parent_two_surname: existingChild.parent_two_surname || '',
        parent_two_name: existingChild.parent_two_name || '',
        parent_two_email: existingChild.parent_two_email || '',
        parent_two_phone: existingChild.parent_two_phone || '',
        address: existingChild.address || '',
        doctors_surgery: existingChild.doctors_surgery || '',
        doctors_surgery_address: existingChild.doctors_surgery_address || '',
        doctors_phone: existingChild.doctors_phone || '',
        medical_info: existingChild.medical_info || '',
        allergies: existingChild.allergies || '',
        dietary_requirements: existingChild.dietary_requirements || '',
        medications: existingChild.medications || '',
        emergency_contact_name: existingChild.emergency_contact_name || '',
        emergency_contact_phone: existingChild.emergency_contact_phone || '',
        emergency_contact_relationship: existingChild.emergency_contact_relationship || '',
        photo_consent: existingChild.photo_consent || false,
      });
    } else if (existingChild === null && step === 2) {
      setNoChildFound(true);
    }
  }, [existingChild, step]);

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      // Update user profile
      await base44.auth.updateMe({ display_name: userForm.display_name });
      
      // Optionally, refetch user data here if your API provides a method
      const updatedUser = await base44.auth.me();
      setUser(updatedUser);

      // Check if user is a leader and update Leader entity
      const leaderRecords = await base44.entities.Leader.filter({ user_id: updatedUser.id });
      if (leaderRecords.length > 0) {
        // Update leader display name
        await base44.entities.Leader.update(leaderRecords[0].id, {
          display_name: userForm.display_name
        });
        
        // Complete onboarding and redirect to leader dashboard
        setIsLeader(true);
        await base44.auth.updateMe({ onboarding_complete: true });
        toast.success('Registration completed successfully!');
        window.location.href = createPageUrl('LeaderDashboard');
        return;
      }

      // Check if user is admin
      if (updatedUser.role === 'admin') {
        setIsLeader(true);
        await base44.auth.updateMe({ onboarding_complete: true });
        toast.success('Registration completed successfully!');
        window.location.href = createPageUrl('LeaderDashboard');
        return;
      }

      // Update local user state
      setUser(updatedUser);
      setStep(2);
    } catch (error) {
      toast.error('Error updating your details: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (existingChild) {
        // Update existing child
        await base44.entities.Member.update(existingChild.id, childForm);
      } else {
        // Create new child (shouldn't happen if no child found, but just in case)
        await base44.entities.Member.create({
          ...childForm,
          active: true,
          join_date: new Date().toISOString().split('T')[0],
        });
      }

      // Mark onboarding as complete
      await base44.auth.updateMe({ onboarding_complete: true });

      toast.success('Registration completed successfully!');
      window.location.href = createPageUrl('ParentDashboard');
    } catch (error) {
      toast.error('Error completing registration: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#7413dc]/5 to-[#004851]/5 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-[#7413dc] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#7413dc]/5 to-[#004851]/5 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center gap-4">
            <div className={`flex items-center gap-2 ${step >= 1 ? 'text-[#7413dc]' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 1 ? 'bg-[#7413dc] text-white' : 'bg-gray-200'}`}>
                {step > 1 ? <CheckCircle className="w-5 h-5" /> : '1'}
              </div>
              <span className="font-medium">Your Details</span>
            </div>
            <div className={`w-16 h-1 ${step >= 2 ? 'bg-[#7413dc]' : 'bg-gray-300'}`} />
            <div className={`flex items-center gap-2 ${step >= 2 ? 'text-[#7413dc]' : 'text-gray-400'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${step >= 2 ? 'bg-[#7413dc] text-white' : 'bg-gray-200'}`}>
                2
              </div>
              <span className="font-medium">Child Details</span>
            </div>
          </div>
        </div>

        {/* Step 1: User Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#7413dc] rounded-full flex items-center justify-center">
                  <UserCheck className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Welcome! Let's confirm your details</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">Please confirm your name to continue</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep1Submit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="display_name">Your Name *</Label>
                  <Input
                    id="display_name"
                    value={userForm.display_name}
                    onChange={(e) => setUserForm({ ...userForm, display_name: e.target.value })}
                    placeholder="Enter your name"
                    required
                  />
                  <p className="text-xs text-gray-500">This is how your name will appear in the portal</p>
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#7413dc] hover:bg-[#5c0fb0]"
                >
                  {submitting ? 'Saving...' : 'Continue'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Child Details */}
        {step === 2 && !noChildFound && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#7413dc] rounded-full flex items-center justify-center">
                  <Baby className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>Child's Details</CardTitle>
                  <p className="text-sm text-gray-500 mt-1">
                    {existingChild ? 'Please review and update your child\'s information' : 'Please provide your child\'s details'}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleStep2Submit} className="space-y-6">
                {/* Personal Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Personal Information</h3>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name *</Label>
                      <Input
                        id="first_name"
                        value={childForm.first_name}
                        onChange={(e) => setChildForm({ ...childForm, first_name: e.target.value, full_name: `${e.target.value} ${childForm.surname || ''}`.trim() })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="surname">Surname *</Label>
                      <Input
                        id="surname"
                        value={childForm.surname}
                        onChange={(e) => setChildForm({ ...childForm, surname: e.target.value, full_name: `${childForm.first_name || ''} ${e.target.value}`.trim() })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="preferred_name">Preferred Name</Label>
                      <Input
                        id="preferred_name"
                        value={childForm.preferred_name}
                        onChange={(e) => setChildForm({ ...childForm, preferred_name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select
                        value={childForm.gender}
                        onValueChange={(value) => setChildForm({ ...childForm, gender: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                          <SelectItem value="Prefer not to say">Prefer not to say</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_birth">Date of Birth *</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={childForm.date_of_birth}
                      onChange={(e) => setChildForm({ ...childForm, date_of_birth: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="section_id">Section *</Label>
                    <Select
                      value={childForm.section_id}
                      onValueChange={(value) => setChildForm({ ...childForm, section_id: value })}
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

                  <div className="space-y-2">
                    <Label htmlFor="address">Home Address *</Label>
                    <Textarea
                      id="address"
                      value={childForm.address}
                      onChange={(e) => setChildForm({ ...childForm, address: e.target.value })}
                      required
                      className="min-h-[80px]"
                    />
                  </div>
                </div>

                {/* Parent Details */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Parent One Details</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parent_one_first_name">First Name</Label>
                      <Input
                        id="parent_one_first_name"
                        value={childForm.parent_one_first_name}
                        onChange={(e) => setChildForm({ ...childForm, parent_one_first_name: e.target.value, parent_one_name: `${e.target.value} ${childForm.parent_one_surname || ''}`.trim() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent_one_surname">Surname</Label>
                      <Input
                        id="parent_one_surname"
                        value={childForm.parent_one_surname}
                        onChange={(e) => setChildForm({ ...childForm, parent_one_surname: e.target.value, parent_one_name: `${childForm.parent_one_first_name || ''} ${e.target.value}`.trim() })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent_one_email">Email</Label>
                    <Input
                      id="parent_one_email"
                      type="email"
                      value={childForm.parent_one_email}
                      onChange={(e) => setChildForm({ ...childForm, parent_one_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent_one_phone">Phone</Label>
                    <Input
                      id="parent_one_phone"
                      type="tel"
                      value={childForm.parent_one_phone}
                      onChange={(e) => setChildForm({ ...childForm, parent_one_phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Parent Two Details (Optional)</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="parent_two_first_name">First Name</Label>
                      <Input
                        id="parent_two_first_name"
                        value={childForm.parent_two_first_name}
                        onChange={(e) => setChildForm({ ...childForm, parent_two_first_name: e.target.value, parent_two_name: `${e.target.value} ${childForm.parent_two_surname || ''}`.trim() })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parent_two_surname">Surname</Label>
                      <Input
                        id="parent_two_surname"
                        value={childForm.parent_two_surname}
                        onChange={(e) => setChildForm({ ...childForm, parent_two_surname: e.target.value, parent_two_name: `${childForm.parent_two_first_name || ''} ${e.target.value}`.trim() })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent_two_email">Email</Label>
                    <Input
                      id="parent_two_email"
                      type="email"
                      value={childForm.parent_two_email}
                      onChange={(e) => setChildForm({ ...childForm, parent_two_email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent_two_phone">Phone</Label>
                    <Input
                      id="parent_two_phone"
                      type="tel"
                      value={childForm.parent_two_phone}
                      onChange={(e) => setChildForm({ ...childForm, parent_two_phone: e.target.value })}
                    />
                  </div>
                </div>

                {/* Medical Info */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900 border-b pb-2">Medical Information</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="doctors_surgery">Doctor's Surgery Name</Label>
                    <Input
                      id="doctors_surgery"
                      value={childForm.doctors_surgery}
                      onChange={(e) => setChildForm({ ...childForm, doctors_surgery: e.target.value })}
                      placeholder="Name of doctor's surgery"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doctors_surgery_address">Doctor's Surgery Address</Label>
                    <Textarea
                      id="doctors_surgery_address"
                      value={childForm.doctors_surgery_address}
                      onChange={(e) => setChildForm({ ...childForm, doctors_surgery_address: e.target.value })}
                      placeholder="Surgery address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="doctors_phone">Doctor's Surgery Phone</Label>
                    <Input
                      id="doctors_phone"
                      type="tel"
                      value={childForm.doctors_phone}
                      onChange={(e) => setChildForm({ ...childForm, doctors_phone: e.target.value })}
                      placeholder="Surgery phone number"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medical_info">Medical Conditions</Label>
                    <Textarea
                      id="medical_info"
                      value={childForm.medical_info}
                      onChange={(e) => setChildForm({ ...childForm, medical_info: e.target.value })}
                      placeholder="Any medical conditions we should be aware of"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="allergies">Allergies</Label>
                    <Textarea
                      id="allergies"
                      value={childForm.allergies}
                      onChange={(e) => setChildForm({ ...childForm, allergies: e.target.value })}
                      placeholder="Any allergies"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dietary_requirements">Dietary Requirements</Label>
                      <Input
                        id="dietary_requirements"
                        value={childForm.dietary_requirements}
                        onChange={(e) => setChildForm({ ...childForm, dietary_requirements: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="medications">Medications</Label>
                      <Input
                        id="medications"
                        value={childForm.medications}
                        onChange={(e) => setChildForm({ ...childForm, medications: e.target.value })}
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
                        value={childForm.emergency_contact_name}
                        onChange={(e) => setChildForm({ ...childForm, emergency_contact_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="emergency_contact_phone">Phone *</Label>
                      <Input
                        id="emergency_contact_phone"
                        type="tel"
                        value={childForm.emergency_contact_phone}
                        onChange={(e) => setChildForm({ ...childForm, emergency_contact_phone: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_relationship">Relationship *</Label>
                    <Input
                      id="emergency_contact_relationship"
                      value={childForm.emergency_contact_relationship}
                      onChange={(e) => setChildForm({ ...childForm, emergency_contact_relationship: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Photo Consent */}
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="photo_consent"
                    checked={childForm.photo_consent}
                    onCheckedChange={(checked) => setChildForm({ ...childForm, photo_consent: checked })}
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
        )}
      </div>

      {/* No Child Found Dialog */}
      <Dialog open={noChildFound} onOpenChange={setNoChildFound}>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
              <DialogTitle>No Child Found</DialogTitle>
            </div>
            <DialogDescription className="text-base space-y-3 pt-2">
              <p>
                We couldn't find a child registered with the email address <strong>{user?.email}</strong>.
              </p>
              <p>
                The email address on your account must match the email address that was provided 
                when your child was added to the system by a leader.
              </p>
              <p className="text-sm text-gray-600">
                Please contact your section leader to ensure your child has been added with the correct 
                email address, or check if you've signed in with the correct account.
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => base44.auth.logout()}
              className="flex-1"
            >
              Sign Out
            </Button>
            <Button
              onClick={() => setNoChildFound(false)}
              className="flex-1 bg-[#7413dc] hover:bg-[#5c0fb0]"
            >
              Try Again
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}