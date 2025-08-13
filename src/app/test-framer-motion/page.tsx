'use client';

import React from 'react';
import AntiSilenceTest from '@/components/chat/AntiSilenceTest';

export default function TestFramerMotionPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-center text-gray-900 mb-8">
          🧪 Test du Pattern Anti-Silence
        </h1>
        
        <AntiSilenceTest />
      </div>
    </div>
  );
} 