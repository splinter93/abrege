"use client";

import LogoScrivia from "@/components/LogoScrivia";
import Sidebar from "@/components/Sidebar";

export default function SharedNotesPage() {
  return (
    <div className="dossiers-page-wrapper">
      <header className="dossiers-header-fixed">
        <LogoScrivia width={130} />
      </header>

      <aside className="dossiers-sidebar-fixed">
        <Sidebar />
      </aside>

      <main className="dossiers-content-area">
        <div style={{ padding: '24px' }}>
          <h1>Notes Partagées</h1>
          <p>Page en cours de développement...</p>
        </div>
      </main>
    </div>
  );
} 