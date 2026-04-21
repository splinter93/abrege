import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClasseurTab, SharedClasseurSource } from "@/components/classeurs/types";

type MergeSnapshot = (payload: {
  classeur: {
    id: string;
    name: string;
    emoji?: string;
    created_at?: string;
  };
  folders: Array<{
    id: string;
    name: string;
    parent_id: string | null;
    classeur_id: string;
    position: number;
    created_at: string;
  }>;
  notes: Array<{
    id: string;
    source_title: string;
    markdown_content: string;
    folder_id: string | null;
    classeur_id: string;
    position: number;
    created_at: string;
    updated_at: string;
    slug: string;
  }>;
}) => void;

/** Liste des classeurs partagés + chargement initial (avant useDossiersPage). */
export function useSharedClasseursList(
  userId: string | undefined,
  refreshKey: number,
  getAccessToken: () => Promise<string | null>
) {
  const [sharedClasseurs, setSharedClasseurs] = useState<SharedClasseurSource[]>([]);
  const [sharedListLoaded, setSharedListLoaded] = useState(false);

  const sharedClasseurIds = useMemo(
    () => sharedClasseurs.map((s) => s.classeurId),
    [sharedClasseurs]
  );

  const loadSharedClasseurs = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch("/api/v2/classeur/shared", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const j = (await res.json()) as {
        success?: boolean;
        items?: Array<{
          shareId: string;
          classeurId: string;
          name: string;
          emoji?: string;
          sharedBy: string;
          permissionLevel: string;
        }>;
      };
      if (!j.success || !j.items) return;
      setSharedClasseurs(
        j.items.map((it) => ({
          shareId: it.shareId,
          classeurId: it.classeurId,
          name: it.name,
          emoji: it.emoji,
          sharedBy: it.sharedBy,
          permissionLevel: it.permissionLevel === "write" ? "write" : "read",
        }))
      );
    } catch (err) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[useSharedClasseursList] loadSharedClasseurs failed", err);
      }
    } finally {
      setSharedListLoaded(true);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (!userId) {
      setSharedListLoaded(false);
      return;
    }
    void loadSharedClasseurs();
  }, [userId, loadSharedClasseurs, refreshKey]);

  return {
    sharedClasseurs,
    setSharedClasseurs,
    sharedListLoaded,
    sharedClasseurIds,
    loadSharedClasseurs,
  };
}

/** Après useDossiersPage : hydrate le store avec l’arbre du classeur partagé actif. */
export function useSharedClasseurTreeSync(params: {
  activeClasseurId: string | undefined;
  sharedClasseurs: SharedClasseurSource[];
  userId: string | undefined;
  refreshKey: number;
  getAccessToken: () => Promise<string | null>;
  mergeSharedClasseurSnapshot: MergeSnapshot;
}) {
  const {
    activeClasseurId,
    sharedClasseurs,
    userId,
    refreshKey,
    getAccessToken,
    mergeSharedClasseurSnapshot,
  } = params;

  useEffect(() => {
    if (!activeClasseurId || !userId) return;
    const sh = sharedClasseurs.find((s) => s.classeurId === activeClasseurId);
    if (!sh) return;
    let cancelled = false;
    void (async () => {
      try {
        const token = await getAccessToken();
        if (!token || cancelled) return;
        const res = await fetch(`/api/v2/classeur/${encodeURIComponent(activeClasseurId)}/tree`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const j = (await res.json()) as {
          success?: boolean;
          classeur?: {
            id: string;
            name: string;
            emoji?: string | null;
            created_at?: string;
          };
          folders?: Array<{
            id: string;
            name: string;
            parent_id?: string | null;
            classeur_id?: string;
            position?: number | null;
            created_at?: string;
          }>;
          notes?: Array<{
            id: string;
            source_title: string;
            folder_id?: string | null;
            classeur_id?: string;
            position?: number | null;
            created_at?: string;
            updated_at?: string;
            slug?: string | null;
          }>;
        };
        if (!j.success || !j.classeur || cancelled) return;
        const cid = j.classeur.id;
        const folders = (j.folders ?? []).map((f) => ({
          id: f.id,
          name: f.name,
          parent_id: f.parent_id ?? null,
          classeur_id: f.classeur_id ?? cid,
          position: f.position ?? 0,
          created_at: f.created_at ?? new Date().toISOString(),
        }));
        const notes = (j.notes ?? []).map((n) => ({
          id: n.id,
          source_title: n.source_title,
          markdown_content: "",
          folder_id: n.folder_id ?? null,
          classeur_id: n.classeur_id ?? cid,
          position: n.position ?? 0,
          created_at: n.created_at ?? new Date().toISOString(),
          updated_at: n.updated_at ?? n.created_at ?? new Date().toISOString(),
          slug: n.slug ?? "",
        }));
        mergeSharedClasseurSnapshot({
          classeur: {
            id: cid,
            name: j.classeur.name,
            emoji: j.classeur.emoji ?? undefined,
            created_at: j.classeur.created_at,
          },
          folders,
          notes,
        });
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[useSharedClasseurTreeSync] shared tree load failed", err);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    activeClasseurId,
    sharedClasseurs,
    userId,
    getAccessToken,
    mergeSharedClasseurSnapshot,
    refreshKey,
  ]);
}

export function useQuitSharedClasseurTab(params: {
  activeClasseurId: string | undefined;
  getAccessToken: () => Promise<string | null>;
  setSharedClasseurs: Dispatch<SetStateAction<SharedClasseurSource[]>>;
  bumpRefreshKey: () => void;
  setActiveClasseurId: (id: string) => void;
  setCurrentFolderId: (id: string | undefined) => void;
  closeAllContextMenus: () => void;
}) {
  const {
    activeClasseurId,
    getAccessToken,
    setSharedClasseurs,
    bumpRefreshKey,
    setActiveClasseurId,
    setCurrentFolderId,
    closeAllContextMenus,
  } = params;

  return useCallback(
    async (tab: ClasseurTab, ownedClasseurs: Array<{ id: string }>) => {
      if (tab.kind !== "shared" || !tab.shareId || !activeClasseurId) return;
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch(
          `/api/v2/classeur/${encodeURIComponent(activeClasseurId)}/share/${encodeURIComponent(tab.shareId)}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          window.alert(j.error ?? "Impossible de quitter ce partage. Réessayez.");
          return;
        }
        setSharedClasseurs((prev) => prev.filter((s) => s.shareId !== tab.shareId));
        bumpRefreshKey();
        if (activeClasseurId === tab.id) {
          const firstOwned = ownedClasseurs[0];
          if (firstOwned) {
            setActiveClasseurId(firstOwned.id);
            setCurrentFolderId(undefined);
          }
        }
        closeAllContextMenus();
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[useQuitSharedClasseurTab] error", err);
        }
        window.alert("Erreur réseau. Réessayez.");
      }
    },
    [
      activeClasseurId,
      getAccessToken,
      setSharedClasseurs,
      bumpRefreshKey,
      setActiveClasseurId,
      setCurrentFolderId,
      closeAllContextMenus,
    ]
  );
}
