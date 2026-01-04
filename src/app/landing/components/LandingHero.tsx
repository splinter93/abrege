'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function LandingHero() {
  return (
    <section className="relative pt-40 pb-24 px-6 overflow-hidden">
      {/* Spotlight Effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-primary/10 via-primary/5 to-transparent blur-[100px] -z-10 pointer-events-none rounded-[100%]"></div>
      
      <div className="max-w-5xl mx-auto text-center space-y-10 relative z-10">
        {/* Tech Badge */}
        <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] backdrop-blur-md hover:border-primary/30 transition-colors cursor-default group">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary group-hover:bg-primaryHover transition-colors"></span>
          </span>
          <span className="text-[11px] font-mono text-textMuted uppercase tracking-wider group-hover:text-gray-300 transition-colors">
            v1.0 • System Online
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-8xl font-bold tracking-tight leading-[0.95] drop-shadow-2xl">
          <span className="text-gradient-silver">
           Supercharge<br/>
            your writing workflow.
          </span>
        </h1>

        {/* Subhead */}
        <p className="text-lg md:text-xl text-textMuted max-w-2xl mx-auto leading-relaxed font-medium tracking-wide pt-4">
          The missing interface between your voice and your documents.<br/>
          <span className="text-gray-400 font-medium">More structure than ChatGPT. Less setup than Notion.</span>
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-6">
          <Link href="/auth" className="btn-primary px-8 py-4 rounded text-sm font-bold uppercase tracking-wider w-full sm:w-auto min-w-[180px]">
            Start Building
          </Link>
          <Link href="#" className="btn-secondary px-8 py-4 rounded text-sm font-bold uppercase tracking-wider w-full sm:w-auto min-w-[180px] flex items-center justify-center gap-2 group">
            <div className="w-2 h-2 rounded-full bg-white/20 group-hover:bg-primary/80 transition-colors"></div>
            Watch Demo
          </Link>
        </div>
        
        <div className="pt-6 flex justify-center items-center gap-6 text-[10px] uppercase tracking-widest text-textMuted opacity-50 font-mono">
          <span>No CC Required</span>
          <span>•</span>
          <span>Cancel Anytime</span>
        </div>
      </div>

      {/* Product Image Mockup Area */}
      <div className="mt-28 max-w-6xl mx-auto relative group">
        {/* CAD Markers */}
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 tech-marker"></div>
        <div className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 tech-marker"></div>
        <div className="absolute bottom-0 left-0 -translate-x-1/2 translate-y-1/2 tech-marker"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 tech-marker"></div>

        {/* Glow subtil derrière l'image */}
        <div className="absolute -inset-[1px] bg-gradient-to-b from-primary/20 to-transparent rounded-xl opacity-20 blur-xl pointer-events-none group-hover:opacity-30 transition-opacity duration-700"></div>
        
        {/* Container Image */}
        <div className="relative bg-[#080808] rounded-xl border border-white/10 shadow-2xl overflow-hidden aspect-[16/10] flex items-center justify-center z-20 animate-float">
          {/* Grille décorative interne */}
          <div className="absolute inset-0 opacity-5 mix-blend-overlay noise-texture"></div>
          <div className="absolute inset-0 opacity-30 grid-pattern"></div>
          
          {/* Screenshot de l'interface */}
          <div className="relative w-full h-full z-10">
            <img
              src="/INTERFACE SCREENSHOT.png"
              alt="Scrivia Interface - Chat et éditeur"
              className="w-full h-full object-cover object-center rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                const currentSrc = target.src;
                // Fallback vers différents noms possibles
                if (currentSrc.includes('INTERFACE%20SCREENSHOT') || currentSrc.includes('INTERFACE SCREENSHOT')) {
                  target.src = '/interface-screenshot.png';
                } else if (currentSrc.includes('interface-screenshot')) {
                  target.src = '/interface_screenshot.png';
                } else if (currentSrc.includes('interface_screenshot')) {
                  target.src = '/screenshot-interface.png';
                } else {
                  // Si aucun fallback ne fonctionne, on affiche un placeholder
                  target.style.display = 'none';
                  if (target.parentElement) {
                    target.parentElement.innerHTML = `
                      <div class="text-center p-12 border border-dashed border-white/10 rounded-lg w-3/4 h-3/4 flex flex-col items-center justify-center gap-6 bg-black/40 backdrop-blur-sm">
                        <div class="p-5 rounded-full bg-white/5 border border-white/5 shadow-inner">
                          <svg class="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                          </svg>
                        </div>
                        <div class="space-y-3">
                          <p class="text-sm font-semibold text-textMain font-mono uppercase tracking-wider">Image non trouvée</p>
                          <p class="text-xs text-textMuted font-mono">Placez "INTERFACE SCREENSHOT.png" dans /public</p>
                        </div>
                      </div>
                    `;
                  }
                }
              }}
            />
          </div>
        </div>
        
        {/* Reflet "sol" */}
        <div className="absolute -bottom-20 left-4 right-4 h-20 bg-gradient-to-b from-primary/10 to-transparent blur-2xl opacity-30 pointer-events-none transform scale-x-90"></div>
      </div>
    </section>
  );
}

