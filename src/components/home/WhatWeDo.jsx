import React from 'react';
import { Compass, Users, Tent, Award, Heart, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

const activities = [
  {
    icon: Tent,
    title: 'Camping & Outdoors',
    description: 'Experience the great outdoors with camping trips, hiking expeditions, and nature exploration.',
  },
  {
    icon: Compass,
    title: 'Adventure Activities',
    description: 'From climbing to kayaking, archery to orienteering - adventure awaits at every meeting.',
  },
  {
    icon: Users,
    title: 'Teamwork & Friendship',
    description: 'Build lasting friendships while learning to work together as a team.',
  },
  {
    icon: Award,
    title: 'Badges & Awards',
    description: 'Earn badges and awards that recognise skills and achievements.',
  },
  {
    icon: Heart,
    title: 'Community Service',
    description: 'Give back to the community through volunteering and service projects.',
  },
  {
    icon: Globe,
    title: 'Life Skills',
    description: 'Develop confidence, leadership, and practical skills for life.',
  },
];

export default function WhatWeDo() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-[#7413dc] font-semibold text-sm uppercase tracking-wider">
              What We Do
            </span>
            <h2 className="mt-3 text-3xl md:text-4xl font-bold text-gray-900">
              Skills for life through adventure
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              At Scouts, we believe in preparing young people for life. Through outdoor activities, 
              community projects, and fun challenges, our members develop confidence, resilience, 
              and skills that will stay with them forever.
            </p>
            <p className="mt-4 text-gray-600">
              Each week, our dedicated volunteer leaders run exciting programmes designed to 
              inspire, challenge, and support every young person in their journey.
            </p>
          </motion.div>

          {/* Activities Grid */}
          <div className="grid grid-cols-2 gap-4">
            {activities.map((activity, index) => (
              <motion.div
                key={activity.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-5 rounded-xl bg-gray-50 hover:bg-[#7413dc] group transition-all duration-300 cursor-default"
              >
                <activity.icon className="w-8 h-8 text-[#7413dc] group-hover:text-white transition-colors" />
                <h3 className="mt-3 font-semibold text-gray-900 group-hover:text-white transition-colors">
                  {activity.title}
                </h3>
                <p className="mt-1 text-sm text-gray-500 group-hover:text-white/80 transition-colors">
                  {activity.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}