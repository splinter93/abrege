"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import { OptimizedApi } from "@/services/optimizedApi";
import FolderManager from "@/components/FolderManager";
import type { Folder } from "@/components/types";
import ClasseurTabs from "@/components/ClasseurTabs";

export default function DossiersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Store slices
  const classeursMap = useFileSystemStore((s) => s.classeurs);
  const foldersMap = useFileSystemStore((s) => s.folders);
  const notesMap = useFileSystemStore((s) => s.notes);

  const classeurs = useMemo(() => Object.values(classeursMap), [classeursMap]);
  const folders = useMemo(() => Object.values(foldersMap), [foldersMap]);
  const notes = useMemo(() => Object.values(notesMap), [notesMap]);

  // Page-level selection state
  const [activeClasseurId, setActiveClasseurId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);

  const activeClasseur = useMemo(
    () => (activeClasseurId ? classeurs.find((c: any) => c.id === activeClasseurId) : null),
    [classeurs, activeClasseurId]
  );

  const handleFolderOpen = useCallback((folder: Folder) => {
    setCurrentFolderId(folder.id);
  }, []);

  const handleGoBack = useCallback(() => {
    setCurrentFolderId(undefined);
  }, []);

  // Initial data load
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const api = OptimizedApi.getInstance();
        await api.loadClasseursWithContent();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erreur inconnue");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-select the first classeur when available
  useEffect(() => {
    if (!activeClasseurId && classeurs.length > 0) {
      setActiveClasseurId(classeurs[0].id);
      setCurrentFolderId(undefined);
    }
  }, [classeurs, activeClasseurId]);

  // Derived data for the active classeur
  const shownFolders = useMemo(() => {
    if (!activeClasseur) return [] as any[];
    const cFolders = folders.filter((f: any) => f.classeur_id === activeClasseur.id);
    return currentFolderId ? cFolders.filter((f: any) => f.parent_id === currentFolderId) : cFolders.filter((f: any) => !f.parent_id);
  }, [folders, activeClasseur, currentFolderId]);

  const shownFiles = useMemo(() => {
    if (!activeClasseur) return [] as any[];
    const cFiles = notes
      .filter((n: any) => n.classeur_id === activeClasseur.id)
      .map((n: any) => ({
        id: n.id,
        source_title: n.source_title,
        source_type: n.source_type,
        folder_id: n.folder_id || null,
        classeur_id: n.classeur_id,
        updated_at: n.updated_at,
      }));
    return currentFolderId ? cFiles.filter((f: any) => f.folder_id === currentFolderId) : cFiles.filter((f: any) => !f.folder_id);
  }, [notes, activeClasseur, currentFolderId]);

  return (
    <div className="dossiers-page">
      {/* Nouveau Header moderne */}
      <header className="dossiers-header">
        <div className="dossiers-header-content">
          {/* Logo et navigation */}
          <div className="dossiers-header-left">
            <button
              onClick={() => router.push('/')}
              className="dossiers-logo-btn"
              aria-label="Retour à l'accueil"
            >
              <Image 
                src="/logo scrivia white.png" 
                alt="Scrivia" 
                width={24} 
                height={24} 
                priority 
                className="dossiers-logo"
              />
              <span className="dossiers-logo-text">Scrivia</span>
            </button>
            
            <div className="dossiers-breadcrumb">
              <span className="dossiers-breadcrumb-label">Dossiers</span>
              {activeClasseur && (
                <>
                  <span className="dossiers-breadcrumb-separator">/</span>
                  <span className="dossiers-breadcrumb-current">
                    {activeClasseur.emoji} {activeClasseur.name}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Actions et menu */}
          <div className="dossiers-header-right">
            <button 
              className="dossiers-action-btn"
              onClick={() => router.push('/private/chat')}
              aria-label="Ouvrir le chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
            
            <button 
              className="dossiers-action-btn"
              onClick={() => router.push('/agents')}
              aria-label="Gérer les agents"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </button>

            <div className="dossiers-user-menu">
              <button className="dossiers-user-btn" aria-label="Menu utilisateur">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="19" cy="12" r="1"/>
                  <circle cx="5" cy="12" r="1"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Contenu principal */}
      <main className="dossiers-main">
        {/* Classeur tabs */}
        <div className="dossiers-tabs-container">
          <ClasseurTabs
            classeurs={classeurs.map((c: any) => ({ id: c.id, name: c.name, emoji: c.emoji, color: c.color }))}
            setClasseurs={() => {}}
            activeClasseurId={activeClasseurId}
            onSelectClasseur={(id) => {
              setActiveClasseurId(id);
              setCurrentFolderId(undefined);
            }}
            onCreateClasseur={async () => {
              try {
                const headers: HeadersInit = { "Content-Type": "application/json" };
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
                const resp = await fetch("/api/v1/classeur/create", { method: "POST", headers, body: JSON.stringify({ name: "Nouveau classeur" }) });
                if (!resp.ok) throw new Error(await resp.text());
                await OptimizedApi.getInstance().loadClasseursWithContent();
              } catch (e) {
                console.error(e);
              }
            }}
            onRenameClasseur={async (id, name) => {
              try {
                const headers: HeadersInit = { "Content-Type": "application/json" };
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
                const resp = await fetch(`/api/v2/classeur/${encodeURIComponent(id)}/update`, { method: "PUT", headers, body: JSON.stringify({ name }) });
                if (!resp.ok) throw new Error(await resp.text());
                await OptimizedApi.getInstance().loadClasseursWithContent();
              } catch (e) {
                console.error(e);
              }
            }}
            onDeleteClasseur={async (id) => {
              try {
                const headers: HeadersInit = { "Content-Type": "application/json" };
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
                const resp = await fetch(`/api/v2/classeur/${encodeURIComponent(id)}/delete`, { method: "DELETE", headers });
                if (!resp.ok) throw new Error(await resp.text());
                await OptimizedApi.getInstance().loadClasseursWithContent();
              } catch (e) {
                console.error(e);
              }
            }}
            onUpdateClasseur={() => {}}
            onUpdateClasseurPositions={async (positions) => {
              try {
                const headers: HeadersInit = { "Content-Type": "application/json" };
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
                const resp = await fetch("/api/v1/classeur/reorder", { method: "POST", headers, body: JSON.stringify({ positions }) });
                if (!resp.ok) throw new Error(await resp.text());
                await OptimizedApi.getInstance().loadClasseursWithContent();
              } catch (e) {
                console.error(e);
              }
            }}
          />
        </div>

        {/* Content area */}
        <div className="dossiers-content">
          {loading && classeurs.length === 0 && (
            <div className="dossiers-loading">
              <div className="dossiers-loading-spinner"></div>
              <span>Chargement…</span>
            </div>
          )}
          
          {error && (
            <div className="dossiers-error">
              <span className="dossiers-error-icon">⚠️</span>
              <span>Erreur: {error}</span>
            </div>
          )}

          {!loading && activeClasseur && (
            <FolderManager
              classeurId={activeClasseur.id}
              classeurName={activeClasseur.name}
              classeurIcon={(activeClasseur as any).emoji}
              parentFolderId={currentFolderId}
              onFolderOpen={handleFolderOpen}
              onGoBack={handleGoBack}
            />
          )}

          {!loading && !activeClasseur && (
            <div className="dossiers-empty">
              <div className="dossiers-empty-icon">📁</div>
              <div className="dossiers-empty-title">Aucun classeur trouvé</div>
              <div className="dossiers-empty-subtitle">Créez votre premier classeur pour commencer</div>
            </div>
          )}
        </div>
      </main>

      {/* Styles CSS inline pour le nouveau header */}
      <style jsx>{`
        .dossiers-page {
          min-height: 100vh;
          background: var(--surface-1);
        }

        .dossiers-header {
          background: var(--surface-2);
          border-bottom: 1px solid var(--border);
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(10px);
          background: rgba(var(--surface-2-rgb), 0.95);
        }

        .dossiers-header-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 24px;
          height: 64px;
          max-width: 1400px;
          margin: 0 auto;
        }

        .dossiers-header-left {
          display: flex;
          align-items: center;
          gap: 24px;
        }

        .dossiers-logo-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: none;
          color: var(--text-1);
          cursor: pointer;
          padding: 8px 12px;
          border-radius: 8px;
          transition: all 0.2s ease;
          font-weight: 600;
          font-size: 16px;
        }

        .dossiers-logo-btn:hover {
          background: var(--surface-hover);
          transform: translateY(-1px);
        }

        .dossiers-logo {
          filter: brightness(0) invert(1);
        }

        .dossiers-logo-text {
          color: var(--text-1);
          font-weight: 700;
        }

        .dossiers-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-2);
          font-size: 14px;
        }

        .dossiers-breadcrumb-separator {
          color: var(--text-3);
        }

        .dossiers-breadcrumb-current {
          color: var(--text-1);
          font-weight: 500;
        }

        .dossiers-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dossiers-action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: none;
          border: none;
          color: var(--text-2);
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .dossiers-action-btn:hover {
          background: var(--surface-hover);
          color: var(--text-1);
          transform: translateY(-1px);
        }

        .dossiers-user-menu {
          margin-left: 8px;
        }

        .dossiers-user-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: var(--surface-3);
          border: none;
          color: var(--text-2);
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .dossiers-user-btn:hover {
          background: var(--surface-hover);
          color: var(--text-1);
          transform: translateY(-1px);
        }

        .dossiers-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px;
        }

        .dossiers-tabs-container {
          margin-bottom: 24px;
        }

        .dossiers-content {
          min-height: 400px;
        }

        .dossiers-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: var(--text-2);
          gap: 16px;
        }

        .dossiers-loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid var(--border);
          border-top: 3px solid var(--accent-primary);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .dossiers-error {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          color: var(--text-error);
          gap: 12px;
          background: var(--surface-error);
          border-radius: 12px;
          margin: 20px 0;
        }

        .dossiers-error-icon {
          font-size: 20px;
        }

        .dossiers-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 20px;
          color: var(--text-2);
          text-align: center;
          gap: 16px;
        }

        .dossiers-empty-icon {
          font-size: 48px;
          opacity: 0.6;
        }

        .dossiers-empty-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-1);
        }

        .dossiers-empty-subtitle {
          font-size: 14px;
          color: var(--text-3);
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .dossiers-header-content {
            padding: 0 16px;
            height: 56px;
          }

          .dossiers-header-left {
            gap: 16px;
          }

          .dossiers-breadcrumb {
            display: none;
          }

          .dossiers-main {
            padding: 16px;
          }

          .dossiers-action-btn {
            width: 36px;
            height: 36px;
          }

          .dossiers-user-btn {
            width: 36px;
            height: 36px;
          }
        }
      `}</style>
    </div>
  );
} 