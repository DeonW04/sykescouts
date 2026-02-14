import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import HeroSection from '../components/home/HeroSection';
import SectionsOverview from '../components/home/SectionsOverview';
import WhatWeDo from '../components/home/WhatWeDo';
import CTASection from '../components/home/CTASection';
import SEO from '../components/SEO';
import { ArrowRight, Heart } from 'lucide-react';

export default function Home() {
  return (
    <div>
      <SEO 
        title="40th Rochdale (Syke) Scouts | Adventure, Skills & Fun for Young People"
        description="Join 40th Rochdale (Syke) Scouts for exciting adventures, skill-building activities, and lifelong friendships. Beavers, Cubs, and Scouts sections for ages 6-14 in Rochdale."
        path="/"
      />
      
      {/* Volunteer Banner */}
      <div className="bg-gradient-to-r from-[#7413dc] to-[#5c0fb0] text-white py-4 px-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Heart className="w-6 h-6 text-[#ffe627] animate-pulse" />
            <p className="text-base sm:text-lg font-semibold">
              We're looking for volunteers! Help shape young lives in your community.
            </p>
          </div>
          <Link to={createPageUrl('Volunteer')}>
            <button className="px-6 py-2 bg-[#ffe627] hover:bg-yellow-400 text-[#7413dc] rounded-lg font-bold transition-colors duration-200 flex items-center gap-2 whitespace-nowrap">
              Volunteer Now
              <ArrowRight className="w-4 h-4" />
            </button>
          </Link>
        </div>
      </div>

      <HeroSection />
      <SectionsOverview />
      <WhatWeDo />
      <CTASection />
    </div>
  );
}