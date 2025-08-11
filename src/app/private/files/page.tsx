"use client";

import LogoScrivia from "@/components/LogoScrivia";
import PrivateSidebar from "@/components/PrivateSidebar";

export default function FilesPage() {
  return (
    <div className="dossiers-page-wrapper">
      <header className="dossiers-header-fixed">
        <LogoScrivia width={100} />
      </header>

      <aside className="dossiers-sidebar-fixed">
        <PrivateSidebar />
      </aside>

      <main className="dossiers-content-area">
        <div style={{ padding: '24px' }}>
          <h1>Mes Fichiers</h1>
          <p>Page en cours de développement...</p>
        </div>
      </main>
    </div>
  );
} 