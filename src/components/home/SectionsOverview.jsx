import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { motion } from 'framer-motion';

const sections = [
  {
    name: 'Squirrels',
    ages: '4-6 years',
    color: '#e63329',
    description: 'First steps into scouting adventure',
  },
  {
    name: 'Beavers',
    ages: '6-8 years',
    color: '#006eb6',
    description: 'Fun, friendship and outdoor activities',
  },
  {
    name: 'Cubs',
    ages: '8-10½ years',
    color: '#00a94f',
    description: 'Learning new skills and having adventures',
  },
  {
    name: 'Scouts',
    ages: '10½-14 years',
    color: '#004851',
    description: 'Camping, expeditions and challenges',
  },
  {
    name: 'Explorers',
    ages: '14-18 years',
    color: '#003d4c',
    description: 'Leadership and independence',
  },
];

export default function SectionsOverview() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            Explore Our Age Groups
          </h2>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            From Squirrels to Explorers, we have something for every young person
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {sections.map((section, index) => (
            <motion.div
              key={section.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
            >
              <Link to={createPageUrl('Sections')}>
                <div
                  className="bg-white rounded-xl p-6 text-center hover:shadow-xl transition-all duration-300 border border-gray-100 group cursor-pointer h-full"
                >
                  <div
                    className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: section.color }}
                  >
                    <svg viewBox="0 0 100 100" className="w-8 h-8 text-white fill-current">
                      <path d="M50 10 L60 40 L90 40 L65 60 L75 90 L50 70 L25 90 L35 60 L10 40 L40 40 Z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">{section.name}</h3>
                  <p className="text-[#7413dc] font-medium text-sm mt-1">{section.ages}</p>
                  <p className="text-gray-500 text-xs mt-2 hidden md:block">{section.description}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}