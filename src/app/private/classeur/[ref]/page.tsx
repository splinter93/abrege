"use client";

import { useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import useSWR from 'swr';
import { supabase } from '@/supabaseClient';
import { fetchJsonV1 } from '@/lib/fetcherV1';
import FolderManager from '@/components/FolderManager';
import ErrorBoundary from '@/components/ErrorBoundary';
import AuthGuard from '@/components/AuthGuard';
import type { Folder } from '@/components/types';

export default function ClasseurDeepLinkPage() {
  return (
    <ErrorBoundary>
      <AuthGuard>
        <ClasseurDeepLinkPageContent />
      </AuthGuard>
    </ErrorBoundary>
  );
}

function ClasseurDeepLinkPageContent() {
  const params = useParams();
  const router = useRouter();
  const ref = params?.ref as string;
  const etagRef = useRef<string | undefined>(undefined);

  const key = useMemo(() => ref ? [`/api/ui/classeur/${encodeURIComponent(ref)}/tree?depth=1`] as const : null, [ref]);

  const fetcher = async ([url]: readonly string[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    const bearer = session?.access_token;
    const res = await fetchJsonV1<{ dossiers?: unknown[]; notes_at_root?: unknown[] }>(url, { bearer, etag: etagRef.current });
    etagRef.current = res.etag;
    return res.data;
  };

  const { data: payload, isLoading, error } = useSWR(key, fetcher, { revalidateOnFocus: false });

  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);

  const classeurName = payload?.classeur?.name || 'Classeur';
  const classeurEmoji = payload?.classeur?.emoji || '📁';

  const foldersFlat = useMemo<Folder[]>(() => {
    const result: Folder[] = [];
    function walk(nodes: unknown[]) {
      for (const n of nodes) {
        result.push({ 
          id: n.id, 
          name: n.name, 
          parent_id: n.parent_id ?? null, 
          classeur_id: payload?.classeur?.id || '',
          user_id: payload?.classeur?.user_id || '',
          created_at: n.created_at || new Date().toISOString(),
          updated_at: n.updated_at || new Date().toISOString(),
          position: n.position || 0
        });
        if (Array.isArray(n.children) && n.children.length > 0) walk(n.children);
      }
    }
    if (Array.isArray(payload?.tree)) walk(payload.tree);
    return result;
  }, [payload]);

  const filesAtRoot = useMemo(() => {
    return Array.isArray(payload?.notes_at_root) ? payload.notes_at_root.map((n: unknown) => {
      const note = n as { 
        id: string; 
        source_title?: string; 
        title?: string;
        header_image?: string;
        created_at?: string;
        updated_at?: string;
        position?: number;
      };
      return {
        id: note.id,
        source_title: note.title || note.source_title || '',
        folder_id: null,
        classeur_id: payload?.classeur?.id || '',
        user_id: payload?.classeur?.user_id || '',
        created_at: note.created_at || new Date().toISOString(),
        updated_at: note.updated_at || new Date().toISOString(),
        position: note.position || 0
      };
    }) : [];
  }, [payload]);

  const shownFolders = useMemo(() => foldersFlat.filter(f => (currentFolderId ? f.parent_id === currentFolderId : f.parent_id == null)), [foldersFlat, currentFolderId]);
  const shownFiles = useMemo(() => (!currentFolderId ? filesAtRoot : []), [filesAtRoot, currentFolderId]);

  const handleFolderOpen = useCallback((folder: Folder) => {
    const dlEnabled = process.env.NEXT_PUBLIC_DEEPLINKS === '1';
    setCurrentFolderId(folder.id);
    if (dlEnabled) {
      const classeurRef = payload?.classeur?.slug || payload?.classeur?.id;
      router.prefetch(`/private/classeur/${classeurRef}/dossier/${folder.id}`);
      router.push(`/private/classeur/${classeurRef}/dossier/${folder.id}`);
    }
  }, [router, payload]);

  const handleGoBack = useCallback(() => {
    setCurrentFolderId(undefined);
    const dlEnabled = process.env.NEXT_PUBLIC_DEEPLINKS === '1';
    if (dlEnabled) {
      const classeurRef = payload?.classeur?.slug || payload?.classeur?.id;
      router.prefetch(`/private/classeur/${classeurRef}`);
      router.push(`/private/classeur/${classeurRef}`);
    }
  }, [router, payload]);

  if (isLoading) return <div style={{ padding: 24 }}>Chargement du classeur…</div>;
  if (error) return <div style={{ padding: 24, color: 'salmon' }}>Erreur: {error instanceof Error ? error.message : String(error)}</div>;
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
          onGoToRoot={() => setCurrentFolderId(undefined)}
          onGoToFolder={(folderId) => setCurrentFolderId(folderId)}
          folderPath={[]}
        />
      </div>
    </main>
  );
} 