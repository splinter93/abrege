'use client';

export default function LandingFeatures() {
  return (
    <section id="how-it-works" className="py-32 px-6 relative z-10">
      <div className="max-w-7xl mx-auto">
        <div className="mb-24 max-w-3xl">
          <div className="flex items-center gap-4 mb-4">
            <span className="text-primary text-xs font-bold uppercase tracking-widest">Core Architecture</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">An OS for your ideas.</h2>
          <p className="text-xl text-textMuted leading-relaxed font-light">
            Stop struggling with passive tools. Scrivia structures the chaos of your mind in real-time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[minmax(320px,auto)]">
          {/* Card 1: Large (Voice) */}
          <div className="col-span-1 md:col-span-2 bento-card rounded-2xl p-10 flex flex-col justify-between group">
            <div className="absolute top-4 right-4 w-2 h-2 border-t border-r border-white/20"></div>
            <div className="absolute bottom-4 left-4 w-2 h-2 border-b border-l border-white/20"></div>
            
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/10 to-transparent border border-white/5 flex items-center justify-center mb-8 text-primary group-hover:scale-110 transition-transform duration-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"></path>
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 tracking-tight group-hover:text-primary transition-colors">
                Talk, don't type.
              </h3>
              <p className="text-textMuted max-w-md text-lg leading-relaxed">
                Whisper Turbo captures your raw thoughts. Scrivia removes the "ums" and "ahs" and transforms your voice into clear structure.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 w-3/4 h-full opacity-[0.05] bg-gradient-to-l from-primary to-transparent pointer-events-none group-hover:opacity-[0.1] transition-opacity duration-500"></div>
          </div>

          {/* Card 2: Small (Structure) */}
          <div className="col-span-1 bento-card rounded-2xl p-10 flex flex-col justify-between group">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/10 to-transparent border border-white/5 flex items-center justify-center mb-8 text-blue-400 group-hover:scale-110 transition-transform duration-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Liquid Structure</h3>
              <p className="text-textMuted text-sm leading-relaxed">
                Chat on the left. Final doc on the right. No copy-pasting, just pure output.
              </p>
            </div>
          </div>

          {/* Card 3: Small (Context) */}
          <div className="col-span-1 bento-card rounded-2xl p-10 flex flex-col justify-between group">
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/10 to-transparent border border-white/5 flex items-center justify-center mb-8 text-purple-400 group-hover:scale-110 transition-transform duration-500">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path>
              </svg>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">Context Packs</h3>
              <p className="text-textMuted text-sm leading-relaxed">
                Activate workflow "Packs". Scrivia instantly loads the rules and tone adapted to your project.
              </p>
            </div>
          </div>

          {/* Card 4: Large (Export) */}
          <div className="col-span-1 md:col-span-2 bento-card rounded-2xl p-10 flex flex-col md:flex-row items-center gap-10 group">
            <div className="flex-1">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/10 to-transparent border border-white/5 flex items-center justify-center mb-8 text-green-400 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"></path>
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">Instant Sharing</h3>
              <p className="text-textMuted text-lg leading-relaxed">
                PDF, Markdown, Public Link. Your documents are ready to send, not just "copied to clipboard".
              </p>
            </div>
            {/* Mini Preview UI */}
            <div className="w-full md:w-1/2 h-40 bg-black/40 border border-white/10 rounded-lg flex flex-col relative overflow-hidden shadow-2xl group-hover:border-white/20 transition-colors">
              <div className="h-6 border-b border-white/10 bg-white/5 flex items-center px-3 gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500/50"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500/50"></div>
                <div className="w-2 h-2 rounded-full bg-green-500/50"></div>
              </div>
              <div className="p-4 space-y-2">
                <div className="h-2 w-3/4 bg-white/10 rounded"></div>
                <div className="h-2 w-1/2 bg-white/10 rounded"></div>
                <div className="h-2 w-5/6 bg-white/5 rounded"></div>
              </div>
              <div className="absolute inset-0 bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                <span className="text-xs font-mono uppercase tracking-widest text-white">Export Ready</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

