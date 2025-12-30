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
import { CheckCircle, ArrowRight, Heart, Award, Users, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function Volunteer() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    occupation: '',
    previous_scouting: false,
    previous_scouting_details: '',
    skills: '',
    availability: '',
    why_volunteer: '',
    section_preference: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const sectionPreferences = [
    { value: 'any', label: 'Any section - I\'m flexible!' },
    { value: 'squirrels', label: 'Squirrels (4-6 years)' },
    { value: 'beavers', label: 'Beavers (6-8 years)' },
    { value: 'cubs', label: 'Cubs (8-10½ years)' },
    { value: 'scouts', label: 'Scouts (10½-14 years)' },
    { value: 'explorers', label: 'Explorers (14-18 years)' },
    { value: 'admin', label: 'Behind the scenes / Admin' },
  ];

  const benefits = [
    {
      icon: Heart,
      title: 'Make a Difference',
      description: 'Help young people develop confidence, skills, and friendships that last a lifetime.',
    },
    {
      icon: Award,
      title: 'Gain Qualifications',
      description: 'Access free training and nationally recognised qualifications in first aid, safeguarding, and leadership.',
    },
    {
      icon: Users,
      title: 'Join a Community',
      description: 'Become part of a friendly team of volunteers who support each other and have fun together.',
    },
    {
      icon: Clock,
      title: 'Flexible Commitment',
      description: 'Give as much or as little time as you can - even a few hours a month makes a difference.',
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    await base44.entities.VolunteerApplication.create({
      ...formData,
      status: 'pending',
    });

    setSubmitting(false);
    setSubmitted(true);
    toast.success('Application submitted successfully!');
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
            Your volunteer application has been submitted. We're excited you want to 
            join our team! We'll be in touch soon to discuss opportunities.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-[#004851] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-white">
              Become a Volunteer
            </h1>
            <p className="mt-6 text-xl text-gray-200">
              You don't need to be Bear Grylls. We provide all the training - 
              you just need enthusiasm and a desire to help young people.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-gray-900 text-center mb-12"
          >
            Why Volunteer With Us?
          </motion.h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-xl p-6 shadow-sm text-center"
              >
                <div className="w-14 h-14 mx-auto bg-[#7413dc]/10 rounded-full flex items-center justify-center mb-4">
                  <benefit.icon className="w-7 h-7 text-[#7413dc]" />
                </div>
                <h3 className="font-bold text-gray-900">{benefit.title}</h3>
                <p className="mt-2 text-gray-600 text-sm">{benefit.description}</p>
              </motion.div>
            ))}
          </div>
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
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Volunteer Application</h2>
                <p className="text-gray-500 text-sm">Tell us about yourself</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Your Details</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    placeholder="Your full name"
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
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Your address"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupation">Current Occupation</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    placeholder="What do you do?"
                  />
                </div>
              </div>

              {/* Experience */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-900 border-b pb-2">Experience & Interests</h3>
                
                <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Checkbox
                    id="previous_scouting"
                    checked={formData.previous_scouting}
                    onCheckedChange={(checked) => setFormData({ ...formData, previous_scouting: checked })}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="previous_scouting" className="text-sm font-medium cursor-pointer">
                      I have previous scouting experience
                    </Label>
                    <p className="text-xs text-gray-500">
                      Either as a young person or adult volunteer
                    </p>
                  </div>
                </div>

                {formData.previous_scouting && (
                  <div className="space-y-2">
                    <Label htmlFor="previous_scouting_details">Tell us about your experience</Label>
                    <Textarea
                      id="previous_scouting_details"
                      value={formData.previous_scouting_details}
                      onChange={(e) => setFormData({ ...formData, previous_scouting_details: e.target.value })}
                      placeholder="Roles, years involved, etc."
                      className="min-h-[80px]"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="skills">Skills & Interests</Label>
                  <Textarea
                    id="skills"
                    value={formData.skills}
                    onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                    placeholder="What skills or hobbies could you bring? (e.g., camping, crafts, first aid, music)"
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="section_preference">Section Preference</Label>
                  <Select
                    value={formData.section_preference}
                    onValueChange={(value) => setFormData({ ...formData, section_preference: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Which section would you prefer?" />
                    </SelectTrigger>
                    <SelectContent>
                      {sectionPreferences.map((section) => (
                        <SelectItem key={section.value} value={section.value}>
                          {section.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Textarea
                    id="availability"
                    value={formData.availability}
                    onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                    placeholder="Which days/times are you typically available?"
                    className="min-h-[80px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="why_volunteer">Why do you want to volunteer? *</Label>
                  <Textarea
                    id="why_volunteer"
                    value={formData.why_volunteer}
                    onChange={(e) => setFormData({ ...formData, why_volunteer: e.target.value })}
                    required
                    placeholder="Tell us what motivates you to volunteer with scouts"
                    className="min-h-[100px]"
                  />
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
                      Submit Application
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </>
                  )}
                </Button>
                <p className="text-xs text-gray-500 text-center mt-4">
                  All volunteers are subject to DBS checks and safeguarding training. 
                  We'll guide you through the process.
                </p>
              </div>
            </form>
          </motion.div>
        </div>
      </section>
    </div>
  );
}