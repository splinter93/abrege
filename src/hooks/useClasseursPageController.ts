"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAuth } from "@/hooks/useAuth";
import { useDossiersPage } from "@/hooks/useDossiersPage";
import { useFolderManagerState } from "@/components/useFolderManagerState";
import { useFolderDragAndDrop } from "@/hooks/useFolderDragAndDrop";
import { useCrossClasseurDrag } from "@/hooks/useCrossClasseurDrag";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import { useNotebookSettingsStore } from "@/store/useNotebookSettingsStore";
import { prefetchNoteForNavigation } from "@/hooks/useOptimizedNoteLoader";
import type { Folder as UIFolder } from "@/components/types";
import type { FileArticle } from "@/components/types";
import type { Classeur } from "@/store/useFileSystemStore";
import type {
  ClasseurItem,
  ClasseurTab,
  BreadcrumbSegment,
  ViewMode,
} from "@/components/classeurs/types";
import {
  formatCreationDate,
  FOLDER_COLORS,
  mergeClasseurTabsOrder,
} from "@/components/classeurs/types";
import { useClasseurTabOrder } from "@/hooks/useClasseurTabOrder";
import {
  useQuitSharedClasseurTab,
  useSharedClasseurTreeSync,
  useSharedClasseursList,
} from "@/hooks/useSharedClasseurs";
import { DRAG_JSON } from "@/components/classeurs/utils";

export function useClasseursPageController() {
    const router = useRouter();
    const { user, loading: authLoading, getAccessToken } = useAuth();
    const isMobile = useIsMobile();

    const [viewMode, setViewMode] = useState<ViewMode>("grid");
    const effectiveViewMode: ViewMode = isMobile ? "list" : viewMode;
    const [searchQuery, setSearchQuery] = useState("");
    const [nouveauOpen, setNouveauOpen] = useState(false);
    const [contextMenuItem, setContextMenuItem] = useState<{
      x: number;
      y: number;
      item: ClasseurItem;
    } | null>(null);
    const [contextMenuTab, setContextMenuTab] = useState<{
      x: number;
      y: number;
      tab: ClasseurTab;
    } | null>(null);
    const [contextMenuArea, setContextMenuArea] = useState<{ x: number; y: number } | null>(null);
    const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
    const [editModalClasseur, setEditModalClasseur] = useState<Classeur | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [openNoteRef, setOpenNoteRef] = useState<string | null>(null);
    const noteOpeningMode = useNotebookSettingsStore((s) => s.noteOpeningMode);

    const [shareTarget, setShareTarget] = useState<{
      resourceType: "classeur" | "folder" | "note";
      resourceRef: string;
      resourceName: string;
    } | null>(null);

    const {
      sharedClasseurs,
      setSharedClasseurs,
      sharedListLoaded,
      sharedClasseurIds,
      loadSharedClasseurs,
    } = useSharedClasseursList(user?.id, refreshKey, getAccessToken);

    const {
      loading: pageLoading,
      error: pageError,
      classeurs,
      activeClasseurId,
      setActiveClasseurId,
      setCurrentFolderId,
      currentFolderId,
      handleCreateClasseur,
      handleRenameClasseur,
      handleDeleteClasseur,
      handleUpdateClasseur,
      handleUpdateClasseurPositions,
      handleFolderOpen,
      handleGoBack,
      handleGoToRoot,
      handleGoToFolder,
      folderPath,
      refreshData,
      forceReload,
      retryWithBackoff,
      retryCount,
      canRetry,
    } = useDossiersPage(user?.id ?? "", {
      sharedClasseurIds,
      sharedListLoaded,
    });

    const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
    const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);

    const activeClasseur = useMemo(() => {
      const owned = classeurs.find((c) => c.id === activeClasseurId);
      if (owned) return owned;
      const sh = sharedClasseurs.find((s) => s.classeurId === activeClasseurId);
      if (sh) {
        return {
          id: sh.classeurId,
          name: sh.name,
          emoji: sh.emoji,
        } as Classeur;
      }
      return undefined;
    }, [classeurs, activeClasseurId, sharedClasseurs]);

    const folderManager = useFolderManagerState(
      activeClasseurId ?? "",
      user?.id ?? "",
      currentFolderId,
      refreshKey
    );

    const {
      folders: filteredFolders,
      files: filteredFiles,
      createFolder,
      createFile,
      deleteFolder,
      deleteFile,
      submitRename,
      moveItem,
      renamingItemId,
      startRename,
      cancelRename,
    } = folderManager;

    const refreshNow = useCallback(() => setRefreshKey((k) => k + 1), []);

    const {
      handleDropItem,
      handleRootDragOver,
      handleRootDragLeave,
      handleRootDrop,
      isRootDropActive,
    } = useFolderDragAndDrop({
      classeurId: activeClasseurId ?? "",
      parentFolderId: currentFolderId,
      moveItem,
      refreshNow,
      setRefreshKey,
      userId: user?.id ?? "",
    });

    const {
      handleDrop: handleCrossClasseurDrop,
      handleDragOver: handleCrossClasseurDragOver,
      handleDragLeave: handleCrossClasseurDragLeave,
    } = useCrossClasseurDrag({
      classeurId: activeClasseurId ?? "",
      onRefresh: refreshData,
      onSetRefreshKey: () => {},
    });

    const notesMap = useFileSystemStore((s) => s.notes);
    const foldersMap = useFileSystemStore((s) => s.folders);
    const mergeSharedClasseurSnapshot = useFileSystemStore((s) => s.mergeSharedClasseurSnapshot);

    const { classeurTabOrderIds, handleTabsReorder } = useClasseurTabOrder(
      user?.id,
      handleUpdateClasseurPositions
    );

    useSharedClasseurTreeSync({
      activeClasseurId,
      sharedClasseurs,
      userId: user?.id,
      refreshKey,
      getAccessToken,
      mergeSharedClasseurSnapshot,
    });

    const tabs: ClasseurTab[] = useMemo(() => {
      // Les classeurs partagés ont priorité : mergeSharedClasseurSnapshot les injecte
      // aussi dans le store `classeurs` (pour l'arborescence), ce qui crée un doublon
      // si on ne les exclut pas des onglets "owned".
      const sharedIds = new Set(sharedClasseurs.map((s) => s.classeurId));
      const owned: ClasseurTab[] = classeurs
        .filter((c) => !sharedIds.has(c.id))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
        .map((c) => ({
          id: c.id,
          name: c.name,
          emoji: c.emoji,
          kind: "owned" as const,
        }));
      const shared: ClasseurTab[] = sharedClasseurs.map((s) => ({
        id: s.classeurId,
        name: s.name,
        emoji: s.emoji,
        kind: "shared" as const,
        shareId: s.shareId,
        sharedBy: s.sharedBy,
        permissionLevel: s.permissionLevel,
      }));
      return mergeClasseurTabsOrder([...owned, ...shared], classeurTabOrderIds);
    }, [classeurs, sharedClasseurs, classeurTabOrderIds]);

    const breadcrumbSegments = useMemo((): BreadcrumbSegment[] => {
      const segments: BreadcrumbSegment[] = [];
      if (activeClasseur) {
        segments.push({
          label: activeClasseur.name,
          onClick: currentFolderId ? handleGoToRoot : undefined,
          dropFolderId: null, // drop sur Scrivia = racine du classeur
        });
      }
      folderPath.forEach((f, i) => {
        const isLast = i === folderPath.length - 1;
        segments.push({
          label: f.name,
          onClick: isLast ? undefined : () => handleGoToFolder(f.id),
          dropFolderId: f.id,
        });
      });
      return segments;
    }, [activeClasseur, currentFolderId, folderPath, handleGoToRoot, handleGoToFolder]);

    const statsLabel = useMemo(() => {
      const fCount = filteredFolders.length;
      const nCount = filteredFiles.length;
      return `${fCount} dossier${fCount !== 1 ? "s" : ""}, ${nCount} note${nCount !== 1 ? "s" : ""}`;
    }, [filteredFolders.length, filteredFiles.length]);

    const items: ClasseurItem[] = useMemo(() => {
      const folderColorByIndex = (index: number) =>
        FOLDER_COLORS[index % FOLDER_COLORS.length];
      const result: ClasseurItem[] = [];
      filteredFolders.forEach((f: UIFolder, i) => {
        const childFolders = Object.values(foldersMap).filter(
          (x) => x.parent_id === f.id
        ).length;
        const childNotes = Object.values(notesMap).filter(
          (n) => n.folder_id === f.id
        ).length;
        const count = childFolders + childNotes;
        result.push({
          id: f.id,
          type: "folder",
          name: f.name,
          subtitle: `${count} élément${count !== 1 ? "s" : ""}`,
          iconColor: folderColorByIndex(i),
        });
      });
      filteredFiles.forEach((file: FileArticle) => {
        const note = notesMap[file.id];
        const subtitle = note?.created_at
          ? formatCreationDate(note.created_at)
          : "Note";
        result.push({
          id: file.id,
          type: "file",
          name: file.source_title || "Sans titre",
          subtitle,
          slug: note?.slug,
        });
      });
      return result;
    }, [filteredFolders, filteredFiles, notesMap, foldersMap]);

    const handleSelectTab = useCallback(
      (id: string) => {
        setActiveClasseurId(id);
        setCurrentFolderId(undefined);
      },
      [setActiveClasseurId, setCurrentFolderId]
    );

    const handleOpenNote = useCallback(
      (noteRef: string) => {
        if (noteOpeningMode === "normal") {
          router.push(`/private/note/${noteRef}`);
        } else {
          setOpenNoteRef(noteRef);
        }
      },
      [noteOpeningMode, router]
    );

    const handleCloseNotePanel = useCallback(() => setOpenNoteRef(null), []);

    const handleItemOpen = useCallback(
      (item: ClasseurItem) => {
        if (item.type === "folder") {
          handleFolderOpen(item.id);
        } else {
          // En mode normal : URL avec id pour affichage instantané si note déjà en store (prefetch)
          const ref = noteOpeningMode === "normal" ? item.id : (item.slug || item.id);
          handleOpenNote(ref);
        }
      },
      [handleFolderOpen, handleOpenNote, noteOpeningMode]
    );

    const handleItemMouseEnter = useCallback(
      (item: ClasseurItem) => {
        if (noteOpeningMode === "normal" && item.type === "file") {
          prefetchNoteForNavigation(item.id);
        }
      },
      [noteOpeningMode]
    );

    const handleItemContextMenu = useCallback((e: React.MouseEvent, item: ClasseurItem) => {
      e.preventDefault();
      e.stopPropagation();
      setContextMenuItem({ x: e.clientX, y: e.clientY, item });
      setContextMenuTab(null);
      setContextMenuArea(null);
    }, []);

    const handleTabContextMenu = useCallback((e: React.MouseEvent, tab: ClasseurTab) => {
      e.preventDefault();
      setContextMenuTab({ x: e.clientX, y: e.clientY, tab });
      setContextMenuItem(null);
      setContextMenuArea(null);
    }, []);

    const handleCreateClasseurClick = useCallback(async () => {
      try {
        const newClasseur = await handleCreateClasseur("Nouveau classeur", "📁");
        setRefreshKey((k) => k + 1);
        if (newClasseur) {
          setActiveClasseurId(newClasseur.id);
          setTimeout(() => setRenamingTabId(newClasseur.id), 100);
        }
      } catch {
        // error already handled by hook
      }
    }, [handleCreateClasseur, setActiveClasseurId]);

    const handleCreateFolderClick = useCallback(async () => {
      const created = await createFolder("Nouveau dossier");
      if (created) setRefreshKey((k) => k + 1);
    }, [createFolder]);

    const handleCreateNoteClick = useCallback(async () => {
      const defaultName = `Note ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
      const created = await createFile(defaultName, currentFolderId ?? null);
      if (created) {
        setRefreshKey((k) => k + 1);
        const ref = created.slug || created.id;
        handleOpenNote(ref);
      }
    }, [createFile, currentFolderId, handleOpenNote]);

    const closeContextMenus = useCallback(() => {
      setContextMenuItem(null);
      setContextMenuTab(null);
      setContextMenuArea(null);
    }, []);

    const handleQuitShare = useQuitSharedClasseurTab({
      activeClasseurId,
      getAccessToken,
      setSharedClasseurs,
      bumpRefreshKey: refreshNow,
      setActiveClasseurId,
      setCurrentFolderId,
      closeAllContextMenus: closeContextMenus,
    });

    const handleAreaContextMenu = useCallback((e: React.MouseEvent) => {
      e.preventDefault();
      setContextMenuArea({ x: e.clientX, y: e.clientY });
      setContextMenuItem(null);
      setContextMenuTab(null);
    }, []);

    const handleContextMenuRename = useCallback(
      (id: string, type: "folder" | "file") => {
        closeContextMenus();
        startRename(id, type);
      },
      [startRename, closeContextMenus]
    );

    const handleContextMenuDelete = useCallback(
      async (item: ClasseurItem) => {
        if (!window.confirm(`Supprimer « ${item.name } » ?`)) return;
        if (item.type === "folder") {
          await deleteFolder(item.id);
        } else {
          await deleteFile(item.id);
        }
        setRefreshKey((k) => k + 1);
        closeContextMenus();
      },
      [deleteFolder, deleteFile, closeContextMenus]
    );

    const handleTabRename = useCallback(
      (tab: ClasseurTab) => {
        closeContextMenus();
        setRenamingTabId(tab.id);
      },
      [closeContextMenus]
    );

    const handleTabRenameSubmit = useCallback(
      async (tabId: string, newName: string) => {
        setRenamingTabId(null); // Ferme immédiatement (validation optimiste)
        try {
          await handleRenameClasseur(tabId, newName.trim());
        } catch {
          // Rollback déjà fait dans le hook
        }
      },
      [handleRenameClasseur]
    );

    const handleTabDelete = useCallback(
      async (tab: ClasseurTab) => {
        if (!window.confirm(`Supprimer le classeur « ${tab.name } » et tout son contenu ?`)) return;
        try {
          await handleDeleteClasseur(tab.id);
          closeContextMenus();
          if (activeClasseurId === tab.id) {
            setCurrentFolderId(undefined);
            if (classeurs.length > 1) {
              const next = classeurs.find((c) => c.id !== tab.id);
              if (next) setActiveClasseurId(next.id);
            }
          }
        } catch {
          // error handled by hook
        }
      },
      [handleDeleteClasseur, activeClasseurId, setActiveClasseurId, setCurrentFolderId, classeurs, closeContextMenus]
    );

    const handleDropOnFolder = useCallback(
      (e: React.DragEvent, folderId: string | null) => {
        setDropTargetFolderId(null);
        let data: { id: string; type: "folder" | "file" } | null = null;
        try {
          const raw = e.dataTransfer.getData(DRAG_JSON);
          if (raw) data = JSON.parse(raw) as { id: string; type: "folder" | "file" };
        } catch {
          // ignore
        }
        if (data?.id && data?.type) {
          moveItem(data.id, folderId, data.type);
          setRefreshKey((k) => k + 1);
        }
      },
      [moveItem]
    );

    const handleTabDragOver = useCallback(
      (e: React.DragEvent, tab: ClasseurTab) => {
        if (tab.kind === "shared") return;
        handleCrossClasseurDragOver(e, tab.id);
        setDragOverTabId(tab.id);
      },
      [handleCrossClasseurDragOver]
    );

    const handleTabDragLeave = useCallback((e: React.DragEvent) => {
      handleCrossClasseurDragLeave(e);
      setDragOverTabId(null);
    }, [handleCrossClasseurDragLeave]);

    const handleTabDrop = useCallback(
      (e: React.DragEvent, tab: ClasseurTab) => {
        if (tab.kind === "shared") return;
        handleCrossClasseurDrop(e, tab.id);
        setDragOverTabId(null);
        setRefreshKey((k) => k + 1);
      },
      [handleCrossClasseurDrop]
    );

    const activeTab = useMemo(
      () => tabs.find((t) => t.id === activeClasseurId) ?? tabs[0],
      [tabs, activeClasseurId]
    );

    const sharedReadOnly =
      activeTab?.kind === "shared" && activeTab.permissionLevel === "read";

    const isActiveClasseurOwned = useMemo(
      () => !!classeurs.find((c) => c.id === activeClasseurId),
      [classeurs, activeClasseurId]
    );

  return {
    router,
    user,
    authLoading,
    getAccessToken,
    isMobile,
    viewMode,
    setViewMode,
    effectiveViewMode,
    searchQuery,
    setSearchQuery,
    nouveauOpen,
    setNouveauOpen,
    contextMenuItem,
    setContextMenuItem,
    contextMenuTab,
    setContextMenuTab,
    contextMenuArea,
    setContextMenuArea,
    renamingTabId,
    setRenamingTabId,
    editModalClasseur,
    setEditModalClasseur,
    refreshKey,
    setRefreshKey,
    settingsOpen,
    setSettingsOpen,
    openNoteRef,
    noteOpeningMode,
    shareTarget,
    setShareTarget,
    sharedClasseurs,
    setSharedClasseurs,
    sharedListLoaded,
    sharedClasseurIds,
    loadSharedClasseurs,
    pageLoading,
    pageError,
    classeurs,
    activeClasseurId,
    setActiveClasseurId,
    setCurrentFolderId,
    currentFolderId,
    handleCreateClasseur,
    handleRenameClasseur,
    handleDeleteClasseur,
    handleUpdateClasseur,
    handleFolderOpen,
    handleGoBack,
    handleGoToRoot,
    handleGoToFolder,
    folderPath,
    refreshData,
    forceReload,
    retryWithBackoff,
    retryCount,
    canRetry,
    dragOverTabId,
    setDragOverTabId,
    dropTargetFolderId,
    setDropTargetFolderId,
    activeClasseur,
    filteredFolders,
    filteredFiles,
    createFolder,
    createFile,
    deleteFolder,
    deleteFile,
    submitRename,
    moveItem,
    renamingItemId,
    startRename,
    cancelRename,
    refreshNow,
    handleDropItem,
    handleRootDragOver,
    handleRootDragLeave,
    handleRootDrop,
    isRootDropActive,
    handleCrossClasseurDrop,
    handleCrossClasseurDragOver,
    handleCrossClasseurDragLeave,
    notesMap,
    foldersMap,
    classeurTabOrderIds,
    handleTabsReorder,
    tabs,
    breadcrumbSegments,
    statsLabel,
    items,
    handleSelectTab,
    handleOpenNote,
    handleCloseNotePanel,
    handleItemOpen,
    handleItemMouseEnter,
    handleItemContextMenu,
    handleTabContextMenu,
    handleCreateClasseurClick,
    handleCreateFolderClick,
    handleCreateNoteClick,
    closeContextMenus,
    handleQuitShare,
    handleAreaContextMenu,
    handleContextMenuRename,
    handleContextMenuDelete,
    handleTabRename,
    handleTabRenameSubmit,
    handleTabDelete,
    handleDropOnFolder,
    handleTabDragOver,
    handleTabDragLeave,
    handleTabDrop,
    activeTab,
    sharedReadOnly,
    isActiveClasseurOwned,
  };
}
