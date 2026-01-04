'use client';

import Link from 'next/link';

export default function LandingPricing() {
  return (
    <section id="pricing" className="py-32 px-6 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">Simple pricing.</h2>
          <p className="text-textMuted text-lg font-light">Invest in your output, not the tool.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="p-12 rounded-2xl border border-white/10 bg-surface/40 backdrop-blur-md hover:border-white/20 transition-all flex flex-col group">
            <div className="mb-10">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-white">Starter</h3>
                <div className="text-2xl font-bold text-white">
                  €0<span className="text-sm font-normal text-textMuted">/mo</span>
                </div>
              </div>
              <p className="text-sm text-textMuted">To test the waters.</p>
            </div>
            <ul className="space-y-5 mb-12 text-sm text-textMuted flex-1 font-medium">
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                Unlimited text chat
              </li>
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                5 Generated docs / mo
              </li>
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-white/30"></span>
                1 Context folder
              </li>
            </ul>
            <Link href="/auth" className="btn-secondary w-full py-4 rounded text-center text-textMain text-sm font-bold uppercase tracking-wider group-hover:bg-white/10 transition-colors">
              Create account
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="p-12 rounded-2xl border border-primary/40 bg-[#0C0C0C]/80 relative group shadow-2xl shadow-primary/10 flex flex-col hover:border-primary/60 transition-all backdrop-blur-xl">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0C0C0C] border border-primary/40 text-primary text-[10px] font-bold uppercase tracking-widest px-4 py-1.5 rounded-full shadow-lg">
              Recommended
            </div>
            
            <div className="mb-10">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xl font-bold text-white">Builder</h3>
                <div className="text-2xl font-bold text-white">
                  €19<span className="text-sm font-normal text-textMuted">/mo</span>
                </div>
              </div>
              <p className="text-sm text-textMuted">To build seriously.</p>
            </div>
            
            <ul className="space-y-5 mb-12 text-sm text-gray-300 flex-1 font-medium">
              <li className="flex items-center gap-3">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span className="text-white">Unlimited Voice (Whisper)</span>
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Unlimited Documents
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Unlimited Contexts & Packs
              </li>
              <li className="flex items-center gap-3">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
                Pro Exports (PDF/Notion)
              </li>
            </ul>
            <Link href="/auth" className="btn-primary w-full py-4 rounded text-center text-white text-sm font-bold uppercase tracking-wider">
              Go Pro
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}


