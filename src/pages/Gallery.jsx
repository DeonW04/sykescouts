import React from 'react';
import { motion } from 'framer-motion';
import { Camera, ImageIcon, Upload } from 'lucide-react';

export default function Gallery() {
  // Placeholder gallery categories
  const categories = [
    { name: 'Camps & Adventures', count: 0 },
    { name: 'Weekly Meetings', count: 0 },
    { name: 'Badge Ceremonies', count: 0 },
    { name: 'Community Events', count: 0 },
  ];

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
              Photo Gallery
            </h1>
            <p className="mt-6 text-xl text-gray-200">
              See what our scouts get up to each week!
            </p>
          </motion.div>
        </div>
      </section>

      {/* Gallery Categories */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {categories.map((category, index) => (
              <motion.div
                key={category.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 rounded-xl p-6 text-center hover:shadow-md transition-shadow cursor-pointer"
              >
                <div className="w-12 h-12 mx-auto bg-[#7413dc]/10 rounded-full flex items-center justify-center mb-3">
                  <Camera className="w-6 h-6 text-[#7413dc]" />
                </div>
                <h3 className="font-semibold text-gray-900">{category.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{category.count} photos</p>
              </motion.div>
            ))}
          </div>

          {/* Empty State */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center py-20"
          >
            <div className="w-24 h-24 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-6">
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Gallery Coming Soon</h2>
            <p className="mt-4 text-gray-600 max-w-md mx-auto">
              We're preparing our photo gallery. Check back soon to see pictures of 
              our adventures, camps, and activities!
            </p>
            <div className="mt-8 p-6 bg-gray-50 rounded-xl max-w-md mx-auto">
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-500">
                Photos will be uploaded here by group leaders
              </p>
            </div>
          </motion.div>

          {/* Placeholder Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-12">
            {[...Array(8)].map((_, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center"
              >
                <Camera className="w-8 h-8 text-gray-300" />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Info Note */}
      <section className="py-12 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h3 className="font-semibold text-gray-900">Photo Policy</h3>
            <p className="mt-2 text-gray-600 text-sm">
              We only publish photos of young people whose parents have given photo consent. 
              If you'd like to opt out of photographs, please speak to a leader. 
              Photos are used to celebrate our activities and may appear on our website 
              and social media channels.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}