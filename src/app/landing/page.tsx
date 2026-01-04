'use client';

import React from 'react';
import LandingNavigation from './components/LandingNavigation';
import LandingHero from './components/LandingHero';
import LandingSocialProof from './components/LandingSocialProof';
import LandingFeatures from './components/LandingFeatures';
import LandingUseCases from './components/LandingUseCases';
import LandingPricing from './components/LandingPricing';
import LandingFooter from './components/LandingFooter';
import './landing.css';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-textMain scroll-smooth selection:bg-primary/30 selection:text-white">
      {/* Tech Grid Background */}
      <div className="fixed inset-0 pointer-events-none z-0 tech-grid"></div>

      <LandingNavigation />
      <LandingHero />
      <LandingSocialProof />
      <LandingFeatures />
      <LandingUseCases />
      <LandingPricing />
      <LandingFooter />
    </div>
  );
}
