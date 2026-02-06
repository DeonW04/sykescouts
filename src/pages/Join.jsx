import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle, ArrowRight, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Join() {
  const [formData, setFormData] = useState({
    child_name: '',
    date_of_birth: '',
    parent_name: '',
    email: '',
    phone: '',
    address: '',
    section_interest: '',
    medical_info: '',
    additional_info: '',
    consent_photos: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const sections = [
    { value: 'beavers', label: 'Beavers (6-8 years)' },
    { value: 'cubs', label: 'Cubs (8-10½ years)' },
    { value: 'scouts', label: 'Scouts (10½-14 years)' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const registration = await base44.entities.ChildRegistration.create({
        ...formData,
        status: 'pending',
      });

      // Send email notifications to leaders
      await base44.functions.invoke('sendJoinEnquiryEmail', { 
        registrationId: registration.id 
      });

      setSubmitting(false);
      setSubmitted(true);
      toast.success('Registration submitted successfully!');
    } catch (error) {
      setSubmitting(false);
      toast.error('Error submitting registration: ' + error.message);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 md:p-12 max-w-lg text-center"
        >
          <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Thank You!</h1>
          <p className="mt-4 text-gray-600">
            Your registration has been submitted. We'll review your information and 
            be in touch soon about availability and next steps.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            Please note: Submitting this form registers your interest. 
            A place is not confirmed until you hear from us.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SEO 
        title="Join Scouts | 40th Rochdale (Syke) Scouts"
        description="Join 40th Rochdale (Syke) Scouts today! Register your child for Beavers, Cubs, or Scouts. Fun, adventure, and skills development for ages 6-14 in Rochdale."
        keywords="join scouts rochdale, scout registration, enroll child scouts, beavers registration, cubs registration"
        path="/Join"
      />
      {/* Hero */}
      <section className="bg-[#004851] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Join Scouts
            </h1>
            <p className="mt-6 text-xl text-gray-200">
              Register your child's interest and start their scouting adventure
            </p>
          </motion.div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100"
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-[#7413dc] rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Child Registration</h2>
                <p className="text-gray-500 text-sm">Register your interest in joining</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Child Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Child's Details</h3>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="child_name">Child's Full Name *</Label>
                    <Input
                      id="child_name"
                      value={formData.child_name}
                      onChange={(e) => setFormData({ ...formData, child_name: e.target.value })}
                      required
                      placeholder="Full name"
                    />
                  </div>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section_interest">Section of Interest *</Label>
                  <Select
                    value={formData.section_interest}
                    onValueChange={(value) => setFormData({ ...formData, section_interest: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a section" />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.value} value={section.value}>
                          {section.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Parent Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Parent/Guardian Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="parent_name">Parent/Guardian Name *</Label>
                  <Input
                    id="parent_name"
                    value={formData.parent_name}
                    onChange={(e) => setFormData({ ...formData, parent_name: e.target.value })}
                    required
                    placeholder="Full name"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      required
                      placeholder="email@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      placeholder="07xxx xxxxxx"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Home Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full address including postcode"
                    className="min-h-[80px]"
                  />
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Additional Information</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="medical_info">Medical Conditions / Allergies</Label>
                  <Textarea
                    id="medical_info"
                    value={formData.medical_info}
                    onChange={(e) => setFormData({ ...formData, medical_info: e.target.value })}
                    placeholder="Please list any medical conditions, allergies, or dietary requirements"
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additional_info">Anything Else We Should Know?</Label>
                  <Textarea
                    id="additional_info"
                    value={formData.additional_info}
                    onChange={(e) => setFormData({ ...formData, additional_info: e.target.value })}
                    placeholder="Any other information that might help us"
                    className="min-h-[80px]"
                  />
                </div>

                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="consent_photos"
                    checked={formData.consent_photos}
                    onCheckedChange={(checked) => setFormData({ ...formData, consent_photos: checked })}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="consent_photos" className="text-sm font-medium cursor-pointer">
                      Photo Consent
                    </Label>
                    <p className="text-xs text-gray-500">
                      I give permission for photos of my child to be taken and used on the 
                      group's website and social media channels.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-[#7413dc] hover:bg-[#5c0fb0]"
                >
                  {submitting ? (
                    'Submitting...'
                  ) : (
                    <>
                      Submit Registration
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 text-center mt-4">
                  By submitting this form, you're registering your interest. 
                  We'll be in touch to discuss availability and next steps.
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
}