import React from 'react';
import HeroSection from '../components/home/HeroSection';
import SectionsOverview from '../components/home/SectionsOverview';
import WhatWeDo from '../components/home/WhatWeDo';
import CTASection from '../components/home/CTASection';
import SEO from '../components/SEO';

export default function Home() {
  return (
    <div>
      <SEO 
        title="40th Rochdale (Syke) Scouts | Adventure, Skills & Fun for Young People"
        description="Join 40th Rochdale (Syke) Scouts for exciting adventures, skill-building activities, and lifelong friendships. Beavers, Cubs, and Scouts sections for ages 6-14 in Rochdale."
        path="/"
      />
      <HeroSection />
      <SectionsOverview />
      <WhatWeDo />
      <CTASection />
    </div>
  );
}