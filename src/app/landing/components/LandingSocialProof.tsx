'use client';

export default function LandingSocialProof() {
  return (
    <section className="py-16 border-y border-white/[0.05] bg-white/[0.01]">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-textMuted opacity-60 mb-12 font-mono">
          Engineered for teams at
        </p>
        <div className="flex flex-wrap justify-center gap-20 opacity-40 grayscale transition-opacity duration-500 hover:opacity-70">
          <div className="flex items-center gap-2 group">
            <div className="w-6 h-6 bg-white rounded-full group-hover:scale-110 transition-transform"></div>
            <span className="font-bold text-lg tracking-tight text-white">Acme</span>
          </div>
          <div className="flex items-center gap-2 group">
            <div className="w-6 h-6 bg-white rounded-sm group-hover:rotate-12 transition-transform"></div>
            <span className="font-bold text-lg tracking-tight text-white">Nebula</span>
          </div>
          <div className="flex items-center gap-2 group">
            <div className="w-6 h-6 border-2 border-white rounded-full group-hover:border-primary transition-colors"></div>
            <span className="font-bold text-lg tracking-tight text-white">Orbit</span>
          </div>
          <div className="flex items-center gap-2 group">
            <div className="w-6 h-6 bg-white rotate-45 group-hover:scale-90 transition-transform"></div>
            <span className="font-bold text-lg tracking-tight text-white">Vertex</span>
          </div>
        </div>
      </div>
    </section>
  );
}

