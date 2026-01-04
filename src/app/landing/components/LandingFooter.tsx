'use client';

export default function LandingFooter() {
  return (
    <footer className="py-20 px-6 border-t border-white/[0.05] text-center md:text-left bg-black relative z-10">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 opacity-80 hover:opacity-100 transition-opacity justify-center md:justify-start">
            <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center border border-primary/20">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5zM16 8L2 22" stroke="#FF5722" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">Scrivia</span>
          </div>
          <p className="text-xs text-textMuted max-w-xs text-center md:text-left">
            The operating system for your ideas. Stop losing your best thoughts to the chat history.
          </p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-10">
          <div className="flex gap-8 text-xs font-bold uppercase tracking-widest text-textMuted">
            <a href="#" className="hover:text-white transition-colors">Twitter</a>
            <a href="#" className="hover:text-white transition-colors">Manifesto</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto mt-12 pt-8 border-t border-white/5 text-[10px] text-textMuted opacity-40 font-mono flex justify-between">
        <span>© 2025 SCRIVIA INC.</span>
        <span>SYSTEM STATUS: OPERATIONAL</span>
      </div>
    </footer>
  );
}

