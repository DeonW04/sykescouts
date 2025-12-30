import React from 'react';
import HeroSection from '../components/home/HeroSection';
import SectionsOverview from '../components/home/SectionsOverview';
import WhatWeDo from '../components/home/WhatWeDo';
import CTASection from '../components/home/CTASection';

export default function Home() {
  return (
    <div>
      <HeroSection />
      <SectionsOverview />
      <WhatWeDo />
      <CTASection />
    </div>
  );
}