import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const sections = [
  {
    name: 'Beavers',
    ages: '6-8 years',
    color: '#006eb6',
    tagline: 'Fun, friendship and adventure',
    description: 'Beavers is all about fun, friendship and learning through play. Young people make friends, learn new things and take part in a variety of activities in a safe, supportive environment.',
    activities: ['Outdoor activities', 'Badge work', 'Craft activities', 'Games', 'Sleepovers', 'Community projects'],
  },
  {
    name: 'Cubs',
    ages: '8-10½ years',
    color: '#00a94f',
    tagline: 'Learning skills and having adventures',
    description: 'Cubs is a great way for young people to have fun, make friends and try new things. From learning to cook to going on their first camp, Cubs is packed with adventure.',
    activities: ['Camping', 'Badge challenges', 'Cooking', 'Problem solving', 'Team games', 'Outdoor skills'],
  },
  {
    name: 'Scouts',
    ages: '10½-14 years',
    color: '#004851',
    tagline: 'Adventure, challenge and exploration',
    description: 'Scouts offers a broad range of activities designed to develop skills for life. From camping expeditions to community projects, Scouts challenge themselves and make a difference.',
    activities: ['Expeditions', 'Camping', 'Water activities', 'Climbing', 'Pioneering', 'International trips'],
  },
  {
    name: 'Explorers',
    ages: '14-18 years',
    color: '#003d4c',
    tagline: 'Leadership and independence',
    description: 'Explorer Scouts take on more responsibility for their own programme and development. They work towards their Duke of Edinburgh Awards and have opportunities for international adventures.',
    activities: ['DofE Awards', 'Young Leaders', 'International experiences', 'Community action', 'Adventurous activities', 'Leadership development'],
  },
];

export default function Sections() {
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
              Our Sections
            </h1>
            <p className="mt-6 text-xl text-gray-200">
              From ages 4 to 18, we have a section for every young person ready for adventure
            </p>
          </motion.div>
        </div>
      </section>

      {/* Sections Detail */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-20">
            {sections.map((section, index) => (
              <motion.div
                key={section.name}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={`grid lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? 'lg:flex-row-reverse' : ''
                }`}
              >
                {/* Content */}
                <div className={index % 2 === 1 ? 'lg:order-2' : ''}>
                  <div
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium mb-4"
                    style={{ backgroundColor: section.color }}
                  >
                    <svg viewBox="0 0 100 100" className="w-4 h-4 fill-current">
                      <path d="M50 10 L60 40 L90 40 L65 60 L75 90 L50 70 L25 90 L35 60 L10 40 L40 40 Z" />
                    </svg>
                    {section.ages}
                  </div>
                  <h2 className="text-3xl font-bold text-gray-900">{section.name}</h2>
                  <p className="mt-2 text-lg text-[#7413dc] font-medium">{section.tagline}</p>
                  <p className="mt-4 text-gray-600 leading-relaxed">{section.description}</p>
                  
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-900 mb-3">What they do:</h4>
                    <div className="flex flex-wrap gap-2">
                      {section.activities.map((activity) => (
                        <span
                          key={activity}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {activity}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link to={createPageUrl('JoinUs')} className="inline-block mt-6">
                    <Button
                      style={{ backgroundColor: section.color }}
                      className="hover:opacity-90"
                    >
                      Join {section.name}
                      <ArrowRight className="ml-2 w-4 h-4" />
                    </Button>
                  </Link>
                </div>

                {/* Image Placeholder */}
                <div className={index % 2 === 1 ? 'lg:order-1' : ''}>
                  <div
                    className="aspect-[4/3] rounded-2xl flex items-center justify-center border-2 border-dashed"
                    style={{ borderColor: section.color, backgroundColor: `${section.color}10` }}
                  >
                    <div className="text-center p-8">
                      <div
                        className="w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4"
                        style={{ backgroundColor: section.color }}
                      >
                        <svg viewBox="0 0 100 100" className="w-10 h-10 text-white fill-current">
                          <path d="M50 10 L60 40 L90 40 L65 60 L75 90 L50 70 L25 90 L35 60 L10 40 L40 40 Z" />
                        </svg>
                      </div>
                      <p className="text-gray-500 text-sm">{section.name} photo placeholder</p>
                      <p className="text-gray-400 text-xs mt-1">Upload your images later</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#7413dc]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to Start the Adventure?</h2>
          <p className="mt-4 text-white/80 text-lg">
            Register your interest today and we'll be in touch about availability
          </p>
          <Link to={createPageUrl('JoinUs')} className="inline-block mt-8">
            <Button size="lg" className="bg-white text-[#7413dc] hover:bg-gray-100">
              Register Interest
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}