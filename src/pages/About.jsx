import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Users, Award, Heart, Target } from 'lucide-react';
import { motion } from 'framer-motion';

export default function About() {
  const values = [
  {
    icon: Heart,
    title: 'Integrity',
    description: 'We act with integrity and do what is right.'
  },
  {
    icon: Users,
    title: 'Respect',
    description: 'We show respect for others and ourselves.'
  },
  {
    icon: Target,
    title: 'Care',
    description: 'We support others and take care of the world around us.'
  },
  {
    icon: Award,
    title: 'Belief',
    description: 'We explore our beliefs, attitudes and spirituality.'
  }];


  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-[#004851] py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl">

            <h1 className="text-4xl md:text-5xl font-bold text-white">
              About Our Scout Group
            </h1>
            <p className="mt-6 text-xl text-gray-200">
              We've been helping young people in our community develop skills for life 
              through adventure, friendship, and fun.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Welcome Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}>

              <h2 className="text-3xl font-bold text-gray-900">
                Welcome to Our Group
              </h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Our scout group is part of The Scout Association, the UK's largest 
                youth organisation. We provide young people aged 6-14 with the opportunity 
                to experience adventure, develop skills, and make lifelong friends.
              </p>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Run entirely by dedicated volunteers, we offer weekly meetings packed with 
                activities, games, badge work, and outdoor adventures. From camping trips 
                to community service, from earning badges to international jamborees - 
                there's always something exciting happening!
              </p>
              <p className="mt-4 text-gray-600 leading-relaxed">Whether your child is looking to try new activities, make new friends, or develop confidence and leadership skills, our scout group provides a supportive and inclusive environment for them to thrive.

Our group is run by volunteers, and we’re always looking for adults who can help, whether regularly or occasionally. No previous experience is needed, and full support and training are provided — just enthusiasm and a willingness to get involved.

              </p>
            </motion.div>

            {/* Image Placeholder */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#7413dc]/20 to-[#004851]/20 flex items-center justify-center border-2 border-dashed border-gray-300">

              <div className="text-center p-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">Group photo placeholder</p>
                <p className="text-gray-400 text-xs mt-1">Upload your images later</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Meeting Info */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold text-gray-900 text-center mb-12">

            When & Where We Meet
          </motion.h2>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-xl p-8 shadow-sm">

              <div className="w-12 h-12 bg-[#7413dc]/10 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="w-6 h-6 text-[#7413dc]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Our Location</h3>
              <p className="mt-2 text-gray-600">
                Syke Methodist Church<br />
                206 Syke Road<br />
                Rochdale, OL12 9TF
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl p-8 shadow-sm">

              <div className="w-12 h-12 bg-[#7413dc]/10 rounded-lg flex items-center justify-center mb-4">
                <Clock className="w-6 h-6 text-[#7413dc]" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Meeting Times</h3>
              <ul className="mt-2 space-y-2 text-gray-600">
                <li><strong>Beavers:</strong> Tuesday 6:15pm - 7:30pm</li>
                <li><strong>Cubs:</strong> Thursday 6:15pm - 7:30pm</li>
                <li><strong>Scouts:</strong> Thursday 7:45pm - 9:15pm</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12">

            <h2 className="text-3xl font-bold text-gray-900">Our Scout Values</h2>
            <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
              These values guide everything we do at Scouts
            </p>
          </motion.div>

          <div className="grid md:grid-cols-4 gap-6">
            {values.map((value, index) =>
            <motion.div
              key={value.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-6">

                <div className="w-16 h-16 mx-auto bg-[#7413dc] rounded-full flex items-center justify-center mb-4">
                  <value.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">{value.title}</h3>
                <p className="mt-2 text-gray-600 text-sm">{value.description}</p>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#7413dc]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to Join the Adventure?</h2>
          <p className="mt-4 text-white/80 text-lg">
            Whether you're looking to sign up your child or volunteer with us, 
            we'd love to hear from you!
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to={createPageUrl('JoinUs')}>
              <Button size="lg" className="bg-white text-[#7413dc] hover:bg-gray-100">
                Join Scouts
              </Button>
            </Link>
            <Link to={createPageUrl('Volunteer')}>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-[#7413dc]">
                Volunteer With Us
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>);

}