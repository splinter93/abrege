'use client';

export default function LandingUseCases() {
  return (
    <section id="use-cases" className="py-32 px-6 border-t border-white/[0.05]">
      <div className="max-w-4xl mx-auto text-center mb-24">
        <h2 className="text-3xl font-bold text-white mb-6 tracking-tight">
          Built for those who <span className="text-primary">ship</span>.
        </h2>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-20">
        {/* Use Case 1 */}
        <div className="space-y-8 relative pl-8 border-l border-white/10 hover:border-primary/50 transition-colors duration-300">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-xs font-mono text-primary font-bold">01</span>
            <h3 className="text-2xl font-bold text-white tracking-tight">Solo Founders & Builders</h3>
          </div>
          <p className="text-textMuted leading-loose text-base">
            Brainstorm your roadmap while walking. Return to your desk with a structured PRD, written User Stories, and a task list—all generated from your voice memo.
          </p>
        </div>
        
        {/* Use Case 2 */}
        <div className="space-y-8 relative pl-8 border-l border-white/10 hover:border-primary/50 transition-colors duration-300">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-xs font-mono text-primary font-bold">02</span>
            <h3 className="text-2xl font-bold text-white tracking-tight">Consultants & Experts</h3>
          </div>
          <p className="text-textMuted leading-loose text-base">
            Install a "Workflow Pack" (e.g., SEO Audit). Dictate observations during your analysis. Scrivia generates the final client report, perfectly formatted, without you touching the keyboard.
          </p>
        </div>
      </div>
    </section>
  );
}



