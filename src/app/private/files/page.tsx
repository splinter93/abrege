"use client";

import LogoHeader from "@/components/LogoHeader";
import Sidebar from "@/components/Sidebar";

export default function FilesPage() {
  return (
    <div className="dossiers-page-wrapper">
      <header className="dossiers-header-fixed">
        <LogoHeader size="medium" position="left" />
      </header>

      <aside className="dossiers-sidebar-fixed">
        <Sidebar />
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