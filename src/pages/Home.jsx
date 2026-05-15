import React from 'react';
import SEO from '../components/SEO';
import FloatingNav from '../components/public/FloatingNav';
import PublicFooter from '../components/public/PublicFooter';
import HeroSection from '../components/home/HeroSection';
import WhatWeDo from '../components/home/WhatWeDo';
import SectionsOverview from '../components/home/SectionsOverview';
import CTASection from '../components/home/CTASection';

export default function Home() {
  return (
    <div style={{ background: '#002a6e', minHeight: '100vh' }}>
      <SEO
        title="40th Rochdale (Syke) Scouts | Adventure, Skills & Fun for Young People"
        description="Join 40th Rochdale (Syke) Scouts for exciting adventures, skill-building activities, and lifelong friendships. Beavers, Cubs, and Scouts sections for ages 6-14 in Rochdale."
        path="/"
      />
      <FloatingNav />
      <HeroSection />
      <WhatWeDo />
      <SectionsOverview />
      <CTASection />
      <PublicFooter />
    </div>
  );
}