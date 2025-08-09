"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/supabaseClient";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import { OptimizedApi } from "@/services/optimizedApi";
import FolderManager from "@/components/FolderManager";
import type { Folder } from "@/components/types";
import ClasseurTabs from "@/components/ClasseurTabs";

export default function DossiersPage() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Store slices (stable references)
  const classeursMap = useFileSystemStore(s => s.classeurs);
  const foldersMap = useFileSystemStore(s => s.folders);
  const notesMap = useFileSystemStore(s => s.notes);

  const classeurs = useMemo(() => Object.values(classeursMap), [classeursMap]);
  const folders = useMemo(() => Object.values(foldersMap), [foldersMap]);
  const notes = useMemo(() => Object.values(notesMap), [notesMap]);

  // Simple navigation state to open a folder view per classeur
  const [activeClasseurId, setActiveClasseurId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);

  const handleFolderOpen = useCallback((folder: Folder) => {
    setCurrentFolderId(folder.id);
  }, []);

  const handleGoBack = useCallback(() => {
    setCurrentFolderId(undefined);
  }, []);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setEmail(session?.user?.email ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setEmail(session?.user?.email ?? null);
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const api = OptimizedApi.getInstance();
        await api.loadClasseursWithContent();
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Erreur inconnue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>Dossiers</h1>
      <p style={{ opacity: 0.8, marginBottom: 16 }}>Private area. Auth is required here.</p>
      <div style={{ fontSize: 14, opacity: 0.8, marginBottom: 16 }}>
        {email ? `Signed in as ${email}` : 'Checking session…'}
      </div>

      {/* Classeur tabs */}
      <ClasseurTabs
        classeurs={classeurs.map(c => ({ id: c.id, name: c.name, emoji: (c as any).emoji, color: (c as any).color }))}
        setClasseurs={() => { /* Zustand piloté par API; noop ici */ }}
        activeClasseurId={activeClasseurId}
        onSelectClasseur={(id) => {
          setActiveClasseurId(id);
          setCurrentFolderId(undefined);
        }}
        onCreateClasseur={async () => {
          try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
            const resp = await fetch('/api/v1/classeur/create', { method: 'POST', headers, body: JSON.stringify({ name: 'Nouveau classeur' }) });
            if (!resp.ok) throw new Error(await resp.text());
            await OptimizedApi.getInstance().loadClasseursWithContent();
          } catch (e) { console.error(e); }
        }}
        onRenameClasseur={async (id, name) => {
          try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
            const resp = await fetch(`/api/v2/classeur/${encodeURIComponent(id)}/update`, { method: 'PUT', headers, body: JSON.stringify({ name }) });
            if (!resp.ok) throw new Error(await resp.text());
            await OptimizedApi.getInstance().loadClasseursWithContent();
          } catch (e) { console.error(e); }
        }}
        onDeleteClasseur={async (id) => {
          try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
            const resp = await fetch(`/api/v2/classeur/${encodeURIComponent(id)}/delete`, { method: 'DELETE', headers });
            if (!resp.ok) throw new Error(await resp.text());
            await OptimizedApi.getInstance().loadClasseursWithContent();
          } catch (e) { console.error(e); }
        }}
        onUpdateClasseur={(id, data) => {
          // Optimistic UI: update store directly if needed; fallback to full reload
          void id; void data;
        }}
        onUpdateClasseurPositions={async (positions) => {
          try {
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
            const resp = await fetch('/api/v1/classeur/reorder', { method: 'POST', headers, body: JSON.stringify({ positions }) });
            if (!resp.ok) throw new Error(await resp.text());
            await OptimizedApi.getInstance().loadClasseursWithContent();
          } catch (e) { console.error(e); }
        }}
      />

      {loading && classeurs.length === 0 && (
        <div>Chargement…</div>
      )}
      {error && (
        <div style={{ color: 'salmon', marginBottom: 12 }}>Erreur: {error}</div>
      )}

      {/* Tabs-like list of classeurs with full FolderManager */}
      <div style={{ display: 'grid', gap: 20 }}>
        {classeurs.map(c => {
          const cFolders = folders.filter(f => f.classeur_id === c.id);
          const cFiles = notes
            .filter(n => n.classeur_id === c.id)
            .map(n => ({
              id: n.id,
              source_title: n.source_title,
              source_type: n.source_type,
              folder_id: n.folder_id || null,
              classeur_id: n.classeur_id,
              updated_at: n.updated_at,
            }));

          const shownFolders = currentFolderId ? cFolders.filter(f => f.parent_id === currentFolderId) : cFolders.filter(f => !f.parent_id);
          const shownFiles = currentFolderId ? cFiles.filter(f => f.folder_id === currentFolderId) : cFiles.filter(f => !f.folder_id);

          return (
            <section key={c.id} style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10 }}>
              <div style={{ padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontWeight: 600 }}>{c.name}</div>
                <button
                  onClick={() => setActiveClasseurId(prev => prev === c.id ? null : c.id)}
                  style={{
                    background: 'var(--surface-2, #202124)',
                    color: 'var(--text-1, #eaeaec)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8,
                    padding: '6px 10px'
                  }}
                >
                  {activeClasseurId === c.id ? 'Masquer' : 'Ouvrir'}
                </button>
              </div>

              {activeClasseurId === c.id && (
                <div style={{ padding: 12 }}>
                  <FolderManager
                    classeurId={c.id}
                    classeurName={c.name}
                    classeurIcon={c.emoji}
                    parentFolderId={currentFolderId}
                    filteredFolders={shownFolders}
                    filteredNotes={shownFiles}
                    onFolderOpen={handleFolderOpen}
                    onGoBack={handleGoBack}
                  />
                </div>
              )}
            </section>
          );
        })}
      </div>

      {!loading && classeurs.length === 0 && (
        <div style={{ opacity: 0.8 }}>Aucun classeur trouvé.</div>
      )}
    </main>
  );
} 