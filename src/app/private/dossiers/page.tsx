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
import "@/components/editor/editor-header.css";

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
    <main style={{ padding: 0 }}>
      {/* Header (style éditeur) */}
      <header className="editor-header" style={{ position: 'sticky', top: 0 }}>
        <div className="editor-header-toolbar-center" style={{ justifyContent: 'flex-start' }}>
          <button
            aria-label="Accueil"
            title="Accueil"
            onClick={() => router.push('/')}
            className="editor-header-logo"
            style={{ gap: 8 }}
          >
            <Image src="/logo%20scrivia%20white.png" alt="Scrivia" width={20} height={20} priority />
          </button>
        </div>
        <div className="editor-header-right">
          <button className="editor-header-kebab" aria-label="Menu" title="Menu">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="5" r="2" fill="currentColor" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <circle cx="12" cy="19" r="2" fill="currentColor" />
            </svg>
          </button>
        </div>
      </header>
      <div style={{ padding: 24, display: 'grid', gap: 16 }}>

      {/* Classeur tabs */}
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

      {/* Content area */}
      {loading && classeurs.length === 0 && <div>Chargement…</div>}
      {error && <div style={{ color: "salmon" }}>Erreur: {error}</div>}

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
        <div style={{ opacity: 0.8 }}>Aucun classeur trouvé.</div>
      )}
      </div>
    </main>
  );
} 