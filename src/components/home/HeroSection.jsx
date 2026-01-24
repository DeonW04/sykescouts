import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../../utils';
import { Button } from '@/components/ui/button';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ImageCarousel = () => {
  const images = [
    'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/2e87b5f25_492395842_2704743879914647_1991593466070344351_n_2704743866581315.jpg',
    'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/b5c4d9296_campfire.jpg',
    'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/69540f3779bf32f5ccc6335b/a7545720b_487691994_10162610204869169_513148409949064129_n_10162610203574169.jpg',
  ];

  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % images.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const goToNext = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const goToPrev = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  return (
    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden border-4 border-white/20">
      <AnimatePresence mode="wait">
        <motion.img
          key={currentIndex}
          src={images[currentIndex]}
          alt="Scout group activities"
          className="w-full h-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      </AnimatePresence>

      <button
        onClick={goToPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button
        onClick={goToNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-all"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {images.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setCurrentIndex(idx)}
            className={`w-2 h-2 rounded-full transition-all ${
              idx === currentIndex ? 'bg-white w-6' : 'bg-white/50'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

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
              We help young people aged 6-14 develop confidence, teamwork, and leadership skills.
            </p>
            <div className="mt-8 flex flex-wrap gap-4 relative z-10">
              <Link to={createPageUrl('Join')} className="inline-block">
                <button className="px-8 py-3 bg-[#7413dc] hover:bg-[#5c0fb0] text-white rounded-lg font-medium transition-colors duration-200 flex items-center gap-2">
                  Join Scouts
                  <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
              <Link to={createPageUrl('About')} className="inline-block">
                <button className="px-8 py-3 border-2 border-white text-white hover:bg-white hover:text-black rounded-lg font-medium transition-colors duration-200">
                  Learn More
                </button>
              </Link>
            </div>
          </motion.div>

          {/* Image Carousel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <ImageCarousel />
            {/* Decorative Elements */}
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-[#ffe627] rounded-lg -z-10" />
            <div className="absolute -top-4 -right-4 w-16 h-16 bg-[#7413dc] rounded-full -z-10" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}