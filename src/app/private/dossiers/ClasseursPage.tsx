"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Folder,
  Search,
  LayoutGrid,
  List,
  Plus,
  BookMarked,
  ChevronDown,
} from "lucide-react";
import { Feather } from "react-feather";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragEndEvent,
  type Modifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";

import { useAuth } from "@/hooks/useAuth";
import { useDossiersPage } from "@/hooks/useDossiersPage";
import { useFolderManagerState } from "@/components/useFolderManagerState";
import { useFolderDragAndDrop } from "@/hooks/useFolderDragAndDrop";
import { useCrossClasseurDrag } from "@/hooks/useCrossClasseurDrag";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import { DossierLoadingState, DossierErrorState } from "@/components/DossierLoadingStates";
import SimpleContextMenu from "@/components/SimpleContextMenu";
import ClasseurEditModal from "@/components/ClasseurEditModal";
import RenameInput from "@/components/RenameInput";
import type { Folder as UIFolder } from "@/components/types";
import type { FileArticle } from "@/components/types";
import { DRAG_SENSOR_CONFIG } from "@/constants/dragAndDropConfig";
import type { Classeur } from "@/store/useFileSystemStore";

import "./ClasseursPage.css";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCreationDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const FOLDER_COLORS: Array<"orange" | "blue" | "emerald" | "violet" | "neutral"> = [
  "orange",
  "blue",
  "emerald",
  "violet",
  "neutral",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ItemType = "folder" | "file";

export interface ClasseurItem {
  id: string;
  type: ItemType;
  name: string;
  subtitle: string;
  iconColor?: "orange" | "blue" | "emerald" | "violet" | "neutral";
  /** For notes: used for navigation */
  slug?: string;
}

interface ClasseurTab {
  id: string;
  name: string;
  emoji?: string;
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
  /** folderId pour le drop : undefined = racine du classeur, string = dossier cible */
  dropFolderId?: string | null;
}

function ClasseursHeader({
  statsLabel,
  onNouveauClick,
  nouveauOpen,
  onNouveauClose,
  onCreateClasseur,
  onCreateFolder,
  onCreateNote,
}: {
  statsLabel: string;
  onNouveauClick: () => void;
  nouveauOpen: boolean;
  onNouveauClose: () => void;
  onCreateClasseur: () => void;
  onCreateFolder: () => void;
  onCreateNote: () => void;
}) {
  return (
    <div className="mb-10 mt-5 sm:mt-8 flex w-full items-center justify-between">
      <div className="flex flex-col items-start font-sans">
        <h1 className="bg-gradient-to-b from-white to-white/50 bg-clip-text text-[36px] font-bold leading-tight tracking-tighter text-transparent">
          Notebooks
        </h1>
        <p className="mt-2 hidden text-sm font-medium tracking-wide text-neutral-500 sm:block">
          Gérez vos méthodologies, notes et documents de réflexion.
        </p>
      </div>
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={onNouveauClick}
          className="flex h-9 items-center gap-1.5 rounded-md bg-white px-4 text-sm font-semibold text-black shadow-[0_0_15px_rgba(255,255,255,0.05)] transition-all hover:bg-neutral-200"
        >
          <span>Nouveau</span>
          <ChevronDown className="h-4 w-4" />
        </button>
        {nouveauOpen && (
          <>
            <div className="fixed inset-0 z-10" aria-hidden onClick={onNouveauClose} />
            <div className="absolute right-0 top-full z-20 mt-2 min-w-[200px] rounded-xl border border-zinc-800/60 bg-zinc-950 p-1.5 shadow-2xl ring-1 ring-white/5">
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
                onClick={() => { onCreateClasseur(); onNouveauClose(); }}
              >
                <BookMarked className="h-4 w-4" />
                Nouveau classeur
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
                onClick={() => { onCreateFolder(); onNouveauClose(); }}
              >
                <Folder className="h-4 w-4" />
                Nouveau dossier
              </button>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
                onClick={() => { onCreateNote(); onNouveauClose(); }}
              >
                <Feather className="h-4 w-4" />
                Nouvelle note
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabs (sortable + drop target for cross-classeur)
// ---------------------------------------------------------------------------

function SortableTab({
  tab,
  isActive,
  onSelect,
  onContextMenu,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragOver,
  isRenaming,
  onRenameSubmit,
  onRenameCancel,
}: {
  tab: ClasseurTab;
  isActive: boolean;
  onSelect: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, tab: ClasseurTab) => void;
  onDragOver?: (e: React.DragEvent, tab: ClasseurTab) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, tab: ClasseurTab) => void;
  isDragOver?: boolean;
  isRenaming?: boolean;
  onRenameSubmit?: (name: string) => void;
  onRenameCancel?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
  });
  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.6 : 1,
    display: "inline-block",
  };

  // Détecte si le drag entrant est un item natif (note/dossier) vs un drag dnd-kit (réordonnancement)
  const isNativeDrag = (e: React.DragEvent) =>
    e.dataTransfer.types.includes("application/json") ||
    e.dataTransfer.types.includes("itemId");

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...(isRenaming ? {} : listeners)}
      onDragOver={(e) => {
        if (!isNativeDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        onDragOver?.(e, tab);
      }}
      onDragLeave={(e) => {
        if (!isNativeDrag(e)) return;
        onDragLeave?.(e);
      }}
      onDrop={(e) => {
        if (!isNativeDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        onDrop?.(e, tab);
      }}
      className={`relative flex-shrink-0 whitespace-nowrap px-3 pb-3 pt-1 text-sm font-medium transition-colors duration-200 cursor-pointer border-b-2 -mb-px ${
        isActive
          ? "border-white text-white"
          : "border-transparent text-zinc-500 hover:text-zinc-300 hover:border-zinc-700"
      } ${isDragOver ? "!border-orange-600 !text-orange-400" : ""}`}
    >
      {isRenaming && onRenameSubmit && onRenameCancel ? (
        <div className="min-w-[120px]" onClick={(e) => e.stopPropagation()}>
          <RenameInput
            initialValue={tab.name}
            onSubmit={onRenameSubmit}
            onCancel={onRenameCancel}
            autoFocus
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(tab.id)}
          onContextMenu={(e) => onContextMenu?.(e, tab)}
          className="flex items-center gap-1.5 w-full text-left"
        >
          {tab.emoji && <span className="text-base leading-none">{tab.emoji}</span>}
          {tab.name}
        </button>
      )}
    </div>
  );
}

// Contraint le drag à l'axe horizontal uniquement (évite la disparition sur mouvement vertical)
const restrictToHorizontalAxis: Modifier = ({ transform }) => ({
  ...transform,
  y: 0,
});

function ClasseursTabs({
  tabs,
  activeId,
  onSelect,
  onContextMenu,
  onCreateTab,
  onTabDragOver,
  onTabDragLeave,
  onTabDrop,
  dragOverTabId,
  handleUpdateClasseurPositions,
  classeursForReorder,
  renamingTabId,
  onTabRenameSubmit,
  onTabRenameCancel,
}: {
  tabs: ClasseurTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, tab: ClasseurTab) => void;
  onCreateTab?: () => void;
  onTabDragOver?: (e: React.DragEvent, tab: ClasseurTab) => void;
  onTabDragLeave?: (e: React.DragEvent) => void;
  onTabDrop?: (e: React.DragEvent, tab: ClasseurTab) => void;
  dragOverTabId: string | null;
  handleUpdateClasseurPositions: (reordered: Classeur[]) => void;
  classeursForReorder: Classeur[];
  renamingTabId?: string | null;
  onTabRenameSubmit?: (tabId: string, newName: string) => void;
  onTabRenameCancel?: () => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (over && active.id !== over.id && classeursForReorder.length > 0) {
        const oldIndex = tabs.findIndex((t) => t.id === active.id);
        const newIndex = tabs.findIndex((t) => t.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedClasseurs = arrayMove(classeursForReorder, oldIndex, newIndex);
          handleUpdateClasseurPositions(reorderedClasseurs);
        }
      }
    },
    [tabs, classeursForReorder, handleUpdateClasseurPositions]
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToHorizontalAxis]}
      onDragEnd={handleDragEnd}
    >
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex gap-1">
            <AnimatePresence initial={false} mode="popLayout">
              {tabs.map((tab) => (
                <motion.div
                  key={tab.id}
                  initial={{ opacity: 0, scale: 0.9, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: "auto" }}
                  exit={{ opacity: 0, scale: 0.9, width: 0 }}
                  transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                  style={{ overflow: "hidden" }}
                >
                  <SortableTab
                    tab={tab}
                    isActive={tab.id === activeId}
                    onSelect={onSelect}
                    onContextMenu={onContextMenu}
                    onDragOver={onTabDragOver}
                    onDragLeave={onTabDragLeave}
                    onDrop={onTabDrop}
                    isDragOver={dragOverTabId === tab.id}
                    isRenaming={renamingTabId === tab.id}
                    onRenameSubmit={(name) => onTabRenameSubmit?.(tab.id, name)}
                    onRenameCancel={onTabRenameCancel}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </SortableContext>
      </div>
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// Item card & list row
// ---------------------------------------------------------------------------

function getFolderIconClasses(color?: ClasseurItem["iconColor"]) {
  const base = "";
  switch (color) {
    case "orange":
      return base + "text-orange-500/80 fill-orange-500/10";
    case "blue":
      return base + "text-blue-500/80 fill-blue-500/10";
    case "emerald":
      return base + "text-emerald-500/80 fill-emerald-500/10";
    case "violet":
      return base + "text-violet-500/80 fill-violet-500/10";
    default:
      return base + "text-zinc-400 fill-zinc-500/10";
  }
}

function getFolderIconBoxClasses(color?: ClasseurItem["iconColor"]) {
  switch (color) {
    case "orange":
      return "bg-orange-500/10 border-orange-500/20";
    case "blue":
      return "bg-blue-500/10 border-blue-500/20";
    case "emerald":
      return "bg-emerald-500/10 border-emerald-500/20";
    case "violet":
      return "bg-violet-500/10 border-violet-500/20";
    default:
      return "bg-white/[0.05] border-white/[0.1]";
  }
}

const DRAG_JSON = "application/json";

function ItemCard({
  item,
  onOpen,
  onOptions,
  onDragStart,
  onDropOnFolder,
  onFolderDragOver,
  onFolderDragLeave,
  isDropTarget,
  isRenaming,
  onRename,
  onCancelRename,
}: {
  item: ClasseurItem;
  onOpen: () => void;
  onOptions?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent, item: ClasseurItem) => void;
  onDropOnFolder?: (e: React.DragEvent, folderId: string) => void;
  onFolderDragOver?: (folderId: string) => void;
  onFolderDragLeave?: () => void;
  isDropTarget?: boolean;
  isRenaming?: boolean;
  onRename?: (name: string) => void;
  onCancelRename?: () => void;
}) {
  const Icon = item.type === "folder" ? Folder : Feather;
  const iconClasses =
    item.type === "folder"
      ? getFolderIconClasses("orange")
      : "text-zinc-400 fill-zinc-500/10";
  const iconBoxClasses =
    item.type === "folder"
      ? getFolderIconBoxClasses("orange")
      : "bg-white/[0.05] border-white/[0.1]";
  const isFolder = item.type === "folder";
  const [isDragging, setIsDragging] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <div
        role="button"
        tabIndex={0}
        className={`group relative flex min-h-[160px] cursor-pointer flex-col justify-between rounded-xl p-5 shadow-sm transition-all duration-300 h-full ${
          isDropTarget
            ? "border-orange-500/40 bg-orange-500/5 border"
            : "classeurs-block classeurs-card hover:shadow-md hover:shadow-black/10"
        } ${isDragging ? "opacity-40 scale-[0.97]" : ""}`}
        onClick={() => !isRenaming && onOpen()}
        onKeyDown={(e) => e.key === "Enter" && !isRenaming && onOpen()}
        draggable={!!onDragStart && !isRenaming}
        onDragStart={(e) => {
          setIsDragging(true);
          if (onDragStart) {
            e.dataTransfer.setData("itemId", item.id);
            e.dataTransfer.setData("itemType", item.type);
            e.dataTransfer.setData(DRAG_JSON, JSON.stringify({ id: item.id, type: item.type }));
            e.dataTransfer.effectAllowed = "move";
            onDragStart(e, item);
          }
        }}
        onDragEnd={() => setIsDragging(false)}
        onDragOver={isFolder && (onDropOnFolder || onFolderDragOver) ? (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          onFolderDragOver?.(item.id);
        } : undefined}
        onDragLeave={isFolder ? () => onFolderDragLeave?.() : undefined}
        onDrop={isFolder && onDropOnFolder ? (e) => { e.preventDefault(); e.stopPropagation(); onDropOnFolder(e, item.id); } : undefined}
        onContextMenu={(e) => {
          e.preventDefault();
          onOptions?.(e);
        }}
      >
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform duration-300 group-hover:scale-[1.02] ${iconBoxClasses}`}>
          <Icon className={`h-5 w-5 ${iconClasses}`} strokeWidth={1.5} />
        </div>
        <p className="text-[12px] font-medium text-neutral-500 truncate">
          {item.subtitle}
        </p>
      </div>

      <div className="mt-auto flex flex-col">
        {isRenaming && onRename && onCancelRename ? (
          <div className="w-full" onClick={(e) => e.stopPropagation()}>
            <RenameInput
              initialValue={item.name}
              onSubmit={onRename}
              onCancel={onCancelRename}
              autoFocus
            />
          </div>
        ) : (
          <h3 className="truncate text-[15px] font-semibold text-neutral-200 transition-colors group-hover:text-white">
            {item.name}
          </h3>
        )}
      </div>
      </div>
    </motion.div>
  );
}

function ItemListRow({
  item,
  onOpen,
  onOptions,
  onDragStart,
  onDropOnFolder,
  onFolderDragOver,
  onFolderDragLeave,
  isDropTarget,
  isRenaming,
  onRename,
  onCancelRename,
}: {
  item: ClasseurItem;
  onOpen: () => void;
  onOptions?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent, item: ClasseurItem) => void;
  onDropOnFolder?: (e: React.DragEvent, folderId: string) => void;
  onFolderDragOver?: (folderId: string) => void;
  onFolderDragLeave?: () => void;
  isDropTarget?: boolean;
  isRenaming?: boolean;
  onRename?: (name: string) => void;
  onCancelRename?: () => void;
}) {
  const Icon = item.type === "folder" ? Folder : Feather;
  const iconClasses =
    item.type === "folder"
      ? getFolderIconClasses("orange")
      : "text-zinc-400 fill-zinc-500/10";
  const isFolder = item.type === "folder";
  const [isDragging, setIsDragging] = React.useState(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      <div
        role="button"
        tabIndex={0}
        className={`group flex items-center justify-between rounded-md border px-3 py-2 transition-all duration-200 cursor-pointer ${
          isDropTarget ? "border-orange-500/35 bg-orange-500/5" : "border-transparent hover:border-zinc-800/50"
        } ${isDragging ? "opacity-40" : ""}`}
        onClick={() => !isRenaming && onOpen()}
        onKeyDown={(e) => e.key === "Enter" && !isRenaming && onOpen()}
        draggable={!!onDragStart && !isRenaming}
        onDragStart={(e) => {
          setIsDragging(true);
          if (onDragStart) {
            e.dataTransfer.setData("itemId", item.id);
            e.dataTransfer.setData("itemType", item.type);
            e.dataTransfer.setData(DRAG_JSON, JSON.stringify({ id: item.id, type: item.type }));
            e.dataTransfer.effectAllowed = "move";
            onDragStart(e, item);
          }
        }}
        onDragEnd={() => setIsDragging(false)}
        onDragOver={isFolder && (onDropOnFolder || onFolderDragOver) ? (e) => {
          e.preventDefault();
          e.stopPropagation();
          e.dataTransfer.dropEffect = "move";
          onFolderDragOver?.(item.id);
        } : undefined}
        onDragLeave={isFolder ? () => onFolderDragLeave?.() : undefined}
        onDrop={isFolder && onDropOnFolder ? (e) => { e.preventDefault(); e.stopPropagation(); onDropOnFolder(e, item.id); } : undefined}
        onContextMenu={(e) => {
          e.preventDefault();
          onOptions?.(e);
        }}
      >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${iconClasses}`} strokeWidth={1.5} />
        {isRenaming && onRename && onCancelRename ? (
          <div className="min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
            <RenameInput
              initialValue={item.name}
              onSubmit={onRename}
              onCancel={onCancelRename}
              autoFocus
            />
          </div>
        ) : (
          <span className="truncate text-sm text-zinc-100">{item.name}</span>
        )}
      </div>
      <span className="flex-shrink-0 text-xs text-zinc-500 ml-4">{item.subtitle}</span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Content area
// ---------------------------------------------------------------------------

type ViewMode = "grid" | "list";

function ClasseursContent({
  breadcrumbSegments,
  items,
  viewMode,
  onViewModeChange,
  searchQuery,
  onItemOpen,
  onItemContextMenu,
  onDragStartItem,
  onDropOnFolder,
  dropTargetFolderId,
  onRootDragOver,
  onRootDragLeave,
  onRootDrop,
  isRootDropActive,
  onFolderDragOver,
  onFolderDragLeave,
  onSearchChange,
  renamingItemId,
  onItemRename,
  onItemCancelRename,
}: {
  breadcrumbSegments: BreadcrumbSegment[];
  items: ClasseurItem[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onItemOpen: (item: ClasseurItem) => void;
  onItemContextMenu: (e: React.MouseEvent, item: ClasseurItem) => void;
  onDragStartItem?: (e: React.DragEvent, item: ClasseurItem) => void;
  onDropOnFolder?: (e: React.DragEvent, folderId: string | null) => void;
  dropTargetFolderId: string | null;  onRootDragOver?: (e: React.DragEvent) => void;
  onRootDragLeave?: () => void;
  onRootDrop?: (e: React.DragEvent) => void;
  isRootDropActive: boolean;
  onFolderDragOver?: (folderId: string) => void;
  onFolderDragLeave?: () => void;
  onSearchChange?: (q: string) => void;
  renamingItemId?: string | null;
  onItemRename?: (id: string, newName: string, type: "folder" | "file") => void;
  onItemCancelRename?: () => void;
}) {
  const isMobileContent = useIsMobile();
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  /* Fil d'Ariane complet pour la navigation par nesting (tous les niveaux cliquables) */
  const contentBreadcrumb = useMemo(
    () => breadcrumbSegments,
    [breadcrumbSegments]
  );

  const [breadcrumbDragOver, setBreadcrumbDragOver] = React.useState<number | null>(null);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-hidden pt-4 pb-6">
      {/* Breadcrumb à gauche + search + toggle à droite */}
      <div className="flex items-center justify-between gap-4 min-w-0">
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-xs font-medium uppercase tracking-wider text-zinc-500" aria-label="Fil d'Ariane">
          {contentBreadcrumb.length === 0 ? (
            <span className="text-zinc-400">Notebooks</span>
          ) : (
            contentBreadcrumb.map((seg, i) => {
              const isDropTarget = breadcrumbDragOver === i;
              const dropHandlers = seg.dropFolderId !== undefined ? {
                onDragOver: (e: React.DragEvent) => { e.preventDefault(); setBreadcrumbDragOver(i); },
                onDragLeave: () => setBreadcrumbDragOver(null),
                onDrop: (e: React.DragEvent) => {
                  setBreadcrumbDragOver(null);
                  onDropOnFolder?.(e, seg.dropFolderId as string);
                },
              } : {};
              return (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="mx-1 text-zinc-700">/</span>}
                  {seg.onClick ? (
                    <button
                      type="button"
                      onClick={seg.onClick}
                      className={`cursor-pointer rounded-lg px-1.5 py-0.5 transition-colors hover:text-zinc-300 focus:outline-none ${i === 0 ? "uppercase" : ""} ${isDropTarget ? "bg-orange-500/20 text-orange-400 text-[13px]" : ""}`}
                      title={`Aller à ${seg.label}`}
                      {...dropHandlers}
                    >
                      {seg.label}
                    </button>
                  ) : (
                    <span
                      className={`rounded-lg px-1.5 py-0.5 transition-colors ${i === 0 ? "uppercase" : ""} ${isDropTarget ? "bg-orange-500/20 text-orange-400 text-[13px]" : "text-zinc-400"}`}
                      {...dropHandlers}
                    >
                      {seg.label}
                    </span>
                  )}
                </span>
              );
            })
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <div className="relative hidden sm:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500 pointer-events-none" />
            <input
              type="search"
              placeholder="Rechercher…"
              value={searchQuery}
              onChange={(e) => onSearchChange?.(e.target.value)}
              className="h-10 w-72 rounded-xl pl-9 pr-4 text-sm text-neutral-200 placeholder:text-neutral-500 outline-none focus:border-[var(--color-border-block)] transition-colors"
              style={{ backgroundColor: 'var(--color-bg-block)', border: 'var(--border-block)' }}
            />
          </div>
          {!isMobileContent && (
            <div
              className="flex shrink-0 items-center gap-1 rounded-xl p-0.5"
              style={{ backgroundColor: 'var(--color-bg-block)', border: 'var(--border-block)' }}
            >
              <button
                type="button"
                onClick={() => onViewModeChange("grid")}
                className={`rounded-lg p-2 transition-all ${viewMode === "grid" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
                aria-pressed={viewMode === "grid"}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("list")}
                className={`rounded-lg p-2 transition-all ${viewMode === "list" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
                aria-pressed={viewMode === "list"}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {viewMode === "grid" ? (
        <motion.div
          key={contentBreadcrumb.map(s => s.label).join("/")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
          className="grid w-full min-w-0 grid-cols-1 gap-4 rounded-xl transition-colors sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6"
          onDragOver={onRootDragOver}
          onDragLeave={onRootDragLeave}
          onDrop={onRootDrop}
        >
          {filtered.map((item) => (
            <ItemCard
              key={`${item.type}-${item.id}`}
              item={item}
              onOpen={() => onItemOpen(item)}
              onOptions={(e) => onItemContextMenu(e, item)}
              onDragStart={onDragStartItem}
              onDropOnFolder={onDropOnFolder}
              onFolderDragOver={onFolderDragOver}
              onFolderDragLeave={onFolderDragLeave}
              isDropTarget={item.type === "folder" && dropTargetFolderId === item.id}
              isRenaming={renamingItemId === item.id}
              onRename={(name) => onItemRename?.(item.id, name, item.type)}
              onCancelRename={onItemCancelRename}
            />
          ))}
        </motion.div>
      ) : (
        <motion.div
          key={contentBreadcrumb.map(s => s.label).join("/")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.75, ease: [0.4, 0, 0.2, 1] }}
          className="flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/10 overflow-hidden transition-colors"
          onDragOver={onRootDragOver}
          onDragLeave={onRootDragLeave}
          onDrop={onRootDrop}
        >
          {filtered.map((item) => (
            <ItemListRow
              key={`${item.type}-${item.id}`}
              item={item}
              onOpen={() => onItemOpen(item)}
              onOptions={(e) => onItemContextMenu(e, item)}
              onDragStart={onDragStartItem}
              onDropOnFolder={onDropOnFolder}
              onFolderDragOver={onFolderDragOver}
              onFolderDragLeave={onFolderDragLeave}
              isDropTarget={item.type === "folder" && dropTargetFolderId === item.id}
              isRenaming={renamingItemId === item.id}
              onRename={(name) => onItemRename?.(item.id, name, item.type)}
              onCancelRename={onItemCancelRename}
            />
          ))}
        </motion.div>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="rounded-full bg-zinc-900 p-4 border border-zinc-800/60 mb-4">
            <Search className="h-6 w-6 text-zinc-600" />
          </div>
          <p className="text-zinc-400 font-medium">
            {searchQuery.trim() ? "Aucun résultat pour cette recherche." : "Ce dossier est vide."}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page (wired to real data)
// ---------------------------------------------------------------------------

export default function ClasseursPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
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
  } = useDossiersPage(user?.id ?? "");

  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [dropTargetFolderId, setDropTargetFolderId] = useState<string | null>(null);

  const activeClasseur = useMemo(
    () => classeurs.find((c) => c.id === activeClasseurId),
    [classeurs, activeClasseurId]
  );

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

  const tabs: ClasseurTab[] = useMemo(
    () => classeurs.map((c) => ({ id: c.id, name: c.name, emoji: c.emoji })),
    [classeurs]
  );

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

  const handleItemOpen = useCallback(
    (item: ClasseurItem) => {
      if (item.type === "folder") {
        handleFolderOpen(item.id);
      } else {
        const slug = item.slug || item.id;
        router.push(`/private/note/${slug}`);
      }
    },
    [handleFolderOpen, router]
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
    const name = window.prompt("Nom du classeur", "Nouveau classeur");
    if (name?.trim()) {
      try {
        await handleCreateClasseur(name.trim(), "📁");
        setRefreshKey((k) => k + 1);
      } catch {
        // error already handled by hook
      }
    }
  }, [handleCreateClasseur]);

  const handleCreateFolderClick = useCallback(async () => {
    const created = await createFolder("Nouveau dossier");
    if (created) setRefreshKey((k) => k + 1);
  }, [createFolder]);

  const handleCreateNoteClick = useCallback(async () => {
    const defaultName = `Note ${new Date().toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })} ${new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
    const created = await createFile(defaultName, currentFolderId ?? null);
    if (created) {
      setRefreshKey((k) => k + 1);
      router.push(`/private/note/${created.id}`);
    }
  }, [createFile, currentFolderId, router]);

  const closeContextMenus = useCallback(() => {
    setContextMenuItem(null);
    setContextMenuTab(null);
    setContextMenuArea(null);
  }, []);

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
      try {
        await handleRenameClasseur(tabId, newName.trim());
        setRenamingTabId(null);
        setRefreshKey((k) => k + 1);
      } catch {
        // error handled by hook
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

  const handleTabDragOver = useCallback((e: React.DragEvent, tab: ClasseurTab) => {
    handleCrossClasseurDragOver(e, tab.id);
    setDragOverTabId(tab.id);
  }, [handleCrossClasseurDragOver]);

  const handleTabDragLeave = useCallback((e: React.DragEvent) => {
    handleCrossClasseurDragLeave(e);
    setDragOverTabId(null);
  }, [handleCrossClasseurDragLeave]);

  const handleTabDrop = useCallback(
    (e: React.DragEvent, tab: ClasseurTab) => {
      handleCrossClasseurDrop(e, tab.id);
      setDragOverTabId(null);
      setRefreshKey((k) => k + 1);
    },
    [handleCrossClasseurDrop]
  );

  if (authLoading || !user?.id) {
    return <DossierLoadingState type="initial" message="Vérification de l'authentification..." />;
  }

  if (pageLoading && classeurs.length === 0) {
    return <DossierLoadingState type="initial" />;
  }

  if (pageError) {
    return (
      <DossierErrorState
        message={pageError}
        retryCount={retryCount}
        canRetry={canRetry}
        onRetry={retryWithBackoff}
        onRefresh={refreshData}
        onForceReload={forceReload}
      />
    );
  }

  const activeTab = tabs.find((t) => t.id === activeClasseurId) ?? tabs[0];

  return (
    <div className="page-content-inner page-content-inner-classeurs classeurs-page-root flex h-full min-h-full w-full max-w-none mx-0 min-w-0 bg-[var(--color-bg-primary)]">
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        {/* En-tête — même structure que Fichiers (pt-4, max-w-screen-2xl) */}
        <div className="px-4 sm:px-6 lg:px-8 pt-4 sm:pt-4 pb-0">
          <div className="max-w-screen-2xl mx-auto w-full">
          <ClasseursHeader
            statsLabel={statsLabel}
            onNouveauClick={() => setNouveauOpen((o) => !o)}
            nouveauOpen={nouveauOpen}
            onNouveauClose={() => setNouveauOpen(false)}
            onCreateClasseur={handleCreateClasseurClick}
            onCreateFolder={handleCreateFolderClick}
            onCreateNote={handleCreateNoteClick}
          />

          {/* Toolbar : onglets uniquement */}
          <div className="mb-6 flex w-full items-center gap-4 border-b border-white/[0.08]">
            <div className="min-w-0 flex-1 overflow-hidden">
              <ClasseursTabs
                tabs={tabs}
                activeId={activeClasseurId ?? ""}
                onSelect={handleSelectTab}
                onContextMenu={handleTabContextMenu}
                onCreateTab={handleCreateClasseurClick}
                onTabDragOver={handleTabDragOver}
                onTabDragLeave={handleTabDragLeave}
                onTabDrop={handleTabDrop}
                dragOverTabId={dragOverTabId}
                handleUpdateClasseurPositions={handleUpdateClasseurPositions}
                classeursForReorder={classeurs}
                renamingTabId={renamingTabId}
                onTabRenameSubmit={handleTabRenameSubmit}
                onTabRenameCancel={() => setRenamingTabId(null)}
              />
            </div>
          </div>
          </div>
          </div>

        {/* Contenu principal — même structure que Fichiers */}
        <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar pt-0 px-4 pb-4 sm:px-6 sm:pb-6 lg:px-8 lg:pb-8" onContextMenu={handleAreaContextMenu}>
          <div className="max-w-screen-2xl mx-auto w-full">
            {!activeClasseur && tabs.length === 0 && (
              <div className="mt-12 rounded-2xl border border-white/[0.08] bg-[#141414] px-6 py-20 text-center">
                <BookMarked className="mx-auto mb-4 h-12 w-12 text-zinc-700" />
                <p className="font-medium text-zinc-400">Aucun classeur détecté.</p>
                <p className="mt-1 text-sm text-zinc-500">Utilisez le menu <strong className="text-zinc-300">Nouveau</strong> pour commencer à organiser vos notes.</p>
              </div>
            )}
            {activeClasseur && (
              <ClasseursContent
                breadcrumbSegments={breadcrumbSegments}
                items={items}
                viewMode={effectiveViewMode}
                onViewModeChange={setViewMode}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onItemOpen={handleItemOpen}
                onItemContextMenu={handleItemContextMenu}
                onDragStartItem={() => {}}
                onDropOnFolder={handleDropOnFolder}
                dropTargetFolderId={dropTargetFolderId}
                onRootDragOver={handleRootDragOver}
                onRootDragLeave={() => { handleRootDragLeave(); setDropTargetFolderId(null); }}
                onRootDrop={(e) => { handleRootDrop(e); setDropTargetFolderId(null); setRefreshKey((k) => k + 1); }}
                isRootDropActive={isRootDropActive}
                onFolderDragOver={setDropTargetFolderId}
                onFolderDragLeave={() => setDropTargetFolderId(null)}
                renamingItemId={renamingItemId}
                onItemRename={(id, newName, type) => { submitRename(id, newName, type); setRefreshKey((k) => k + 1); }}
                onItemCancelRename={cancelRename}
              />
            )}
          </div>
        </div>
      </main>

      {contextMenuItem && (
        <SimpleContextMenu
          x={contextMenuItem.x}
          y={contextMenuItem.y}
          visible
          options={[
            {
              label: "Ouvrir",
              onClick: () => {
                handleItemOpen(contextMenuItem.item);
                closeContextMenus();
              },
            },
            {
              label: "Renommer",
              onClick: () =>
                handleContextMenuRename(
                  contextMenuItem.item.id,
                  contextMenuItem.item.type
                ),
            },
            {
              label: "Supprimer",
              onClick: () => handleContextMenuDelete(contextMenuItem.item),
            },
          ]}
          onClose={closeContextMenus}
        />
      )}

      {contextMenuTab && (
        <SimpleContextMenu
          x={contextMenuTab.x}
          y={contextMenuTab.y}
          visible
          options={[
            {
              label: "Editer",
              onClick: () => {
                const full = classeurs.find((c) => c.id === contextMenuTab.tab.id) ?? null;
                setEditModalClasseur(full);
                closeContextMenus();
              },
            },
            { label: "Renommer", onClick: () => handleTabRename(contextMenuTab.tab) },
            { label: "Supprimer", onClick: () => handleTabDelete(contextMenuTab.tab) },
          ]}
          onClose={closeContextMenus}
        />
      )}

      {contextMenuArea && (
        <SimpleContextMenu
          x={contextMenuArea.x}
          y={contextMenuArea.y}
          visible
          options={
            activeClasseur
              ? [
                  {
                    label: "Editer le classeur",
                    onClick: () => {
                      const full = classeurs.find((c) => c.id === activeClasseur.id) ?? null;
                      setEditModalClasseur(full);
                      closeContextMenus();
                    },
                  },
                  {
                    label: "Nouveau dossier",
                    onClick: () => {
                      handleCreateFolderClick();
                      closeContextMenus();
                    },
                  },
                  {
                    label: "Nouvelle note",
                    onClick: () => {
                      handleCreateNoteClick();
                      closeContextMenus();
                    },
                  },
                ]
              : [{ label: "Nouveau classeur", onClick: () => { handleCreateClasseurClick(); closeContextMenus(); } }]
          }
          onClose={closeContextMenus}
        />
      )}

      {editModalClasseur && (
        <ClasseurEditModal
          classeur={editModalClasseur}
          onSave={async (updates) => {
            await handleUpdateClasseur(editModalClasseur.id, updates);
          }}
          onClose={() => setEditModalClasseur(null)}
        />
      )}
    </div>
  );
}
