"use client";

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/supabaseClient';
import FolderManager from '@/components/FolderManager';
import type { Folder } from '@/components/types';

const etagCache = new Map<string, { etag: string; data: unknown }>();
async function fetchTree(ref: string) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`;
  const url = `/api/ui/classeur/${encodeURIComponent(ref)}/tree?depth=1`;
  const cached = etagCache.get(url);
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  const res = await fetch(url, { headers });
  const etag = res.headers.get('ETag') || undefined;
  if (res.status === 304 && cached) return { ...cached.data, etag, etagHit: true };
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || `Tree load failed (${res.status})`);
  if (etag) etagCache.set(url, { etag, data: json });
  return { ...json, etag, etagHit: false };
}

export default function FolderDeepLinkPage() {
  const params = useParams();
  const router = useRouter();
  const ref = params?.ref as string;
  const dossierRef = params?.dossierRef as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<{ tree?: unknown[]; notes_at_root?: unknown[]; classeur?: { id: string; name: string; emoji?: string } } | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchTree(ref);
        if (!cancelled) setPayload(data);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (ref) load();
    return () => { cancelled = true; };
  }, [ref]);

  // Resolve dossierRef (id or slug) to id by scanning tree
  useEffect(() => {
    if (!payload) return;
    let targetId: string | undefined = undefined;
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(dossierRef);
    function walk(nodes: unknown[]): string | undefined {
      for (const n of nodes) {
        const node = n as { id: string; slug?: string; children?: unknown[] };
        if ((isUUID && n.id === dossierRef) || (!isUUID && n.slug === dossierRef) || n.id === dossierRef) {
          targetId = n.id; return;
        }
        if (Array.isArray(n.children) && n.children.length > 0) walk(n.children);
        if (targetId) return;
      }
    }
    if (Array.isArray(payload?.tree)) walk(payload.tree);
    setCurrentFolderId(targetId);
  }, [payload, dossierRef]);

  const classeurName = payload?.classeur?.name || 'Classeur';
  const classeurEmoji = payload?.classeur?.emoji || '📁';

  const foldersFlat = useMemo<Folder[]>(() => {
    const result: Folder[] = [];
    function walk(nodes: unknown[]) {
      for (const n of nodes) {
        const node = n as { id: string; name: string; parent_id?: string; children?: unknown[] };
        result.push({ 
          id: n.id, 
          name: n.name, 
          parent_id: n.parent_id ?? null, 
          classeur_id: payload?.classeur?.id,
          user_id: payload?.classeur?.user_id || null,
          created_at: n.created_at || null,
          updated_at: n.updated_at || null,
          position: n.position || null,
          is_in_trash: n.is_in_trash || false,
          trashed_at: n.trashed_at || null
        } as Folder);
        if (Array.isArray(n.children) && n.children.length > 0) walk(n.children);
      }
    }
    if (Array.isArray(payload?.tree)) walk(payload.tree);
    return result;
  }, [payload]);

  const filesAtRoot = useMemo(() => {
    return Array.isArray(payload?.notes_at_root) ? payload.notes_at_root.map((n: unknown) => {
      const note = n as { id: string; source_title?: string; header_image?: string; created_at?: string; title?: string };
      return {
        id: note.id,
        source_title: note.title || note.source_title || '',
        folder_id: null,
        classeur_id: payload?.classeur?.id,
        updated_at: undefined,
      };
    }) : [];
  }, [payload]);

  const shownFolders = useMemo(() => foldersFlat.filter(f => (currentFolderId ? f.parent_id === currentFolderId : f.parent_id == null)), [foldersFlat, currentFolderId]);
  const shownFiles = useMemo(() => (currentFolderId ? [] : filesAtRoot), [filesAtRoot, currentFolderId]);

  const handleFolderOpen = useCallback((folder: Folder) => {
    setCurrentFolderId(folder.id);
    const dlEnabled = process.env.NEXT_PUBLIC_DEEPLINKS === '1';
    if (dlEnabled) {
      const classeurRef = payload?.classeur?.slug || payload?.classeur?.id;
      router.push(`/private/classeur/${classeurRef}/dossier/${folder.id}`);
    }
  }, [router, payload]);

  const handleGoBack = useCallback(() => {
    setCurrentFolderId(undefined);
    const dlEnabled = process.env.NEXT_PUBLIC_DEEPLINKS === '1';
    if (dlEnabled) {
      const classeurRef = payload?.classeur?.slug || payload?.classeur?.id;
      router.push(`/private/classeur/${classeurRef}`);
    }
  }, [router, payload]);

  if (loading) return <div style={{ padding: 24 }}>Chargement du dossier…</div>;
  if (error) return <div style={{ padding: 24, color: 'salmon' }}>Erreur: {error}</div>;
  if (!payload?.success) return <div style={{ padding: 24 }}>Données indisponibles.</div>;

  return (
    <main style={{ padding: 12 }}>
      <div style={{ padding: 12 }}>
        <FolderManager
          classeurId={payload.classeur.id}
          classeurName={classeurName}
          classeurIcon={classeurEmoji}
          parentFolderId={currentFolderId}
          onFolderOpen={handleFolderOpen}
          onGoBack={handleGoBack}
          onGoToRoot={() => {}}
          onGoToFolder={() => {}}
          folderPath={[]}
        />
      </div>
    </main>
  );
} 