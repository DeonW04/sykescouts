import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Button } from '@/components/ui/button';
import { ArrowRight, Play } from 'lucide-react';
import { motion } from 'framer-motion';

export default function HeroSection() {
  return (
    <section className="relative bg-[#004851] overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 right-20 w-64 h-64 border-4 border-white rounded-full" />
        <div className="absolute bottom-10 left-10 w-32 h-32 border-2 border-white rounded-full" />
        <div className="absolute top-40 left-1/4 w-16 h-16 bg-yellow-400 rotate-45" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
              Preparing young people with{' '}
              <span className="text-[#ffe627]">skills for life</span>
            </h1>
            <p className="mt-6 text-lg text-gray-200 max-w-xl">
              Join our scout group for adventure, friendship, and personal growth. 
              We help young people aged 4-18 develop confidence, teamwork, and leadership skills.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to={createPageUrl('JoinUs')}>
                <Button size="lg" className="bg-[#7413dc] hover:bg-[#5c0fb0] text-white px-8">
                  Join Scouts
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to={createPageUrl('About')}>
                <Button size="lg" variant="outline" className="border-white text-black hover:bg-white hover:text-[#004851]">
                  Learn More
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Image Placeholder */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-[#7413dc] to-[#004851] flex items-center justify-center border-4 border-white/20">
              <div className="text-center p-8">
                <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
                  <Play className="w-10 h-10 text-white ml-1" />
                </div>
                <p className="text-white/80 text-sm">Your photos will appear here</p>
                <p className="text-white/60 text-xs mt-1">Upload images to customize</p>
              </div>
            </div>
            {/* Decorative Elements */}
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-[#ffe627] rounded-lg -z-10" />
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-[#7413dc] rounded-full -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}