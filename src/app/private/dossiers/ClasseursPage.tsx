"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useIsMobile } from "@/hooks/useIsMobile";
import {
  Folder,
  FileText,
  Search,
  LayoutGrid,
  List,
  MoreHorizontal,
  Plus,
  BookMarked,
  ChevronDown,
} from "lucide-react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
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
import type { Folder as UIFolder } from "@/components/types";
import type { FileArticle } from "@/components/types";
import { DRAG_SENSOR_CONFIG } from "@/constants/dragAndDropConfig";
import type { Classeur } from "@/store/useFileSystemStore";

import "./ClasseursPage.css";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffM < 1) return "À l'instant";
  if (diffM < 60) return `Modifié il y a ${diffM} min`;
  if (diffH < 24) return `Modifié il y a ${diffH} h`;
  if (diffD === 1) return "Modifié hier";
  if (diffD < 7) return `Modifié il y a ${diffD} j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
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
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

interface BreadcrumbSegment {
  label: string;
  onClick?: () => void;
}

function ClasseursHeader({
  statsLabel,
  searchQuery,
  onSearch,
  onNouveauClick,
  nouveauOpen,
  onNouveauClose,
  onCreateClasseur,
  onCreateFolder,
  onCreateNote,
}: {
  statsLabel: string;
  searchQuery: string;
  onSearch: (q: string) => void;
  onNouveauClick: () => void;
  nouveauOpen: boolean;
  onNouveauClose: () => void;
  onCreateClasseur: () => void;
  onCreateFolder: () => void;
  onCreateNote: () => void;
}) {
  return (
    <header className="flex w-full flex-col gap-4 border-b border-zinc-800/60 py-4 px-4 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight">My Notebooks</h1>
          <span className="rounded-full border border-zinc-800/60 bg-zinc-900/50 px-2.5 py-0.5 text-xs font-medium text-zinc-500 whitespace-nowrap">
            {statsLabel}
          </span>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative group flex-1 sm:flex-none">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500 transition-colors group-focus-within:text-zinc-300" />
            <input
              type="search"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="h-9 w-full sm:w-64 rounded-lg border border-zinc-800/60 bg-zinc-900/50 pl-10 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 transition-all focus:border-zinc-600 focus:bg-zinc-900 focus:outline-none focus:ring-0"
            />
          </div>
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={onNouveauClick}
              className="flex items-center gap-2 rounded-lg bg-zinc-100 px-3 py-2 sm:px-4 text-sm font-semibold text-zinc-950 transition-all hover:bg-white active:scale-95 whitespace-nowrap"
            >
              <Plus className="h-4 w-4" strokeWidth={2.5} />
              <span>Nouveau</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </button>
            {nouveauOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  aria-hidden
                  onClick={onNouveauClose}
                />
                <div className="absolute right-0 top-full z-20 mt-2 min-w-[200px] rounded-xl border border-zinc-800/60 bg-zinc-950 p-1.5 shadow-2xl ring-1 ring-white/5">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
                    onClick={() => {
                      onCreateClasseur();
                      onNouveauClose();
                    }}
                  >
                    <BookMarked className="h-4 w-4" />
                    Nouveau classeur
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
                    onClick={() => {
                      onCreateFolder();
                      onNouveauClose();
                    }}
                  >
                    <Folder className="h-4 w-4" />
                    Nouveau dossier
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-800/50 hover:text-white"
                    onClick={() => {
                      onCreateNote();
                      onNouveauClose();
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    Nouvelle note
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
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
}: {
  tab: ClasseurTab;
  isActive: boolean;
  onSelect: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, tab: ClasseurTab) => void;
  onDragOver?: (e: React.DragEvent, tab: ClasseurTab) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent, tab: ClasseurTab) => void;
  isDragOver?: boolean;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onDragOver={(e) => { e.preventDefault(); onDragOver?.(e, tab); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop?.(e, tab); }}
      className={`relative flex-shrink-0 whitespace-nowrap py-3 px-1 text-sm transition-colors duration-200 hover:text-zinc-200 rounded ${isDragOver ? "bg-zinc-800/50 ring-1 ring-zinc-600" : ""}`}
    >
      <button
        type="button"
        onClick={() => onSelect(tab.id)}
        onContextMenu={(e) => onContextMenu?.(e, tab)}
        className="block w-full text-left"
      >
        {isActive ? (
          <span className="text-white">{tab.name}</span>
        ) : (
          <span className="text-zinc-400">{tab.name}</span>
        )}
        {isActive && (
          <span className="absolute bottom-0 left-0 h-px w-full bg-white" aria-hidden />
        )}
      </button>
    </div>
  );
}

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
}) {
  const [draggedTab, setDraggedTab] = useState<ClasseurTab | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: DRAG_SENSOR_CONFIG.classeurs })
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    const tab = tabs.find((t) => t.id === e.active.id);
    if (tab) setDraggedTab(tab);
  }, [tabs]);

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      setDraggedTab(null);
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
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex w-full items-center gap-2 overflow-x-auto no-scrollbar border-b border-zinc-800/60 px-4 sm:px-6 lg:px-8">
        <SortableContext items={tabs.map((t) => t.id)} strategy={horizontalListSortingStrategy}>
          <div className="flex min-w-0 flex-1 gap-8">
            {tabs.map((tab) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeId}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
                onDragOver={onTabDragOver}
                onDragLeave={onTabDragLeave}
                onDrop={onTabDrop}
                isDragOver={dragOverTabId === tab.id}
              />
            ))}
          </div>
        </SortableContext>
      </div>
      <DragOverlay>
        {draggedTab ? (
          <div className="relative flex-shrink-0 whitespace-nowrap rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-2 text-sm font-medium text-white shadow-2xl ring-1 ring-white/10">
            {draggedTab.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ---------------------------------------------------------------------------
// Item card & list row
// ---------------------------------------------------------------------------

function getFolderIconClasses(color?: ClasseurItem["iconColor"]) {
  const base = "transition-transform duration-200 group-hover:scale-105 ";
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
}: {
  item: ClasseurItem;
  onOpen: () => void;
  onOptions?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent, item: ClasseurItem) => void;
  onDropOnFolder?: (e: React.DragEvent, folderId: string) => void;
  onFolderDragOver?: (folderId: string) => void;
  onFolderDragLeave?: () => void;
  isDropTarget?: boolean;
}) {
  const Icon = item.type === "folder" ? Folder : FileText;
  const iconClasses =
    item.type === "folder"
      ? getFolderIconClasses(item.iconColor)
      : "text-zinc-400 fill-zinc-500/10 transition-transform duration-200 group-hover:scale-105";
  const isFolder = item.type === "folder";

  return (
    <div
      className={`group relative flex aspect-square flex-col items-center justify-end rounded-xl border bg-zinc-900/10 p-4 transition-all duration-200 cursor-pointer ${
        isDropTarget ? "border-zinc-600 bg-zinc-800/30 ring-1 ring-zinc-500" : "border-zinc-800/40 hover:border-zinc-700/60 hover:bg-zinc-900/20"
      }`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      draggable={!!onDragStart}
      onDragStart={(e) => {
        if (onDragStart) {
          e.dataTransfer.setData("itemId", item.id);
          e.dataTransfer.setData("itemType", item.type);
          e.dataTransfer.setData(DRAG_JSON, JSON.stringify({ id: item.id, type: item.type }));
          e.dataTransfer.effectAllowed = "move";
          onDragStart(e, item);
        }
      }}
      onDragOver={isFolder && (onDropOnFolder || onFolderDragOver) ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        onFolderDragOver?.(item.id);
      } : undefined}
      onDragLeave={isFolder ? () => onFolderDragLeave?.() : undefined}
      onDrop={isFolder && onDropOnFolder ? (e) => { e.preventDefault(); e.stopPropagation(); onDropOnFolder(e, item.id); } : undefined}
    >
      <button
        type="button"
        className="absolute right-2 top-2 rounded p-1 opacity-0 transition-opacity duration-200 hover:bg-zinc-800/50 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onOptions?.(e);
        }}
        aria-label="Options"
      >
        <MoreHorizontal className="h-4 w-4 text-zinc-400" />
      </button>
      <div className="absolute inset-0 flex flex-col items-center justify-center pb-12">
        <Icon className={`h-12 w-12 ${iconClasses}`} strokeWidth={1.5} />
      </div>
      <div className="w-full min-w-0 text-center">
        <p className="truncate text-sm font-medium text-zinc-100">{item.name}</p>
        <p className="truncate text-xs text-zinc-500">{item.subtitle}</p>
      </div>
    </div>
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
}: {
  item: ClasseurItem;
  onOpen: () => void;
  onOptions?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent, item: ClasseurItem) => void;
  onDropOnFolder?: (e: React.DragEvent, folderId: string) => void;
  onFolderDragOver?: (folderId: string) => void;
  onFolderDragLeave?: () => void;
  isDropTarget?: boolean;
}) {
  const Icon = item.type === "folder" ? Folder : FileText;
  const iconClasses =
    item.type === "folder"
      ? getFolderIconClasses(item.iconColor)
      : "text-zinc-400 fill-zinc-500/10";
  const isFolder = item.type === "folder";

  return (
    <div
      className={`group flex items-center justify-between rounded-md border px-3 py-2 transition-all duration-200 cursor-pointer ${
        isDropTarget ? "border-zinc-600 bg-zinc-800/30" : "border-transparent hover:border-zinc-800/60"
      }`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
      draggable={!!onDragStart}
      onDragStart={(e) => {
        if (onDragStart) {
          e.dataTransfer.setData("itemId", item.id);
          e.dataTransfer.setData("itemType", item.type);
          e.dataTransfer.setData(DRAG_JSON, JSON.stringify({ id: item.id, type: item.type }));
          e.dataTransfer.effectAllowed = "move";
          onDragStart(e, item);
        }
      }}
      onDragOver={isFolder && (onDropOnFolder || onFolderDragOver) ? (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        onFolderDragOver?.(item.id);
      } : undefined}
      onDragLeave={isFolder ? () => onFolderDragLeave?.() : undefined}
      onDrop={isFolder && onDropOnFolder ? (e) => { e.preventDefault(); e.stopPropagation(); onDropOnFolder(e, item.id); } : undefined}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${iconClasses}`} strokeWidth={1.5} />
        <span className="truncate text-sm text-zinc-100">{item.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500">{item.subtitle}</span>
        <button
          type="button"
          className="rounded p-1 opacity-0 transition-opacity duration-200 hover:bg-zinc-800/50 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onOptions?.(e);
          }}
          aria-label="Options"
        >
          <MoreHorizontal className="h-4 w-4 text-zinc-400" />
        </button>
      </div>
    </div>
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
}: {
  breadcrumbSegments: BreadcrumbSegment[];
  items: ClasseurItem[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onItemOpen: (item: ClasseurItem) => void;
  onItemContextMenu: (e: React.MouseEvent, item: ClasseurItem) => void;
  onDragStartItem?: (e: React.DragEvent, item: ClasseurItem) => void;
  onDropOnFolder?: (e: React.DragEvent, folderId: string) => void;
  dropTargetFolderId: string | null;
  onRootDragOver?: (e: React.DragEvent) => void;
  onRootDragLeave?: () => void;
  onRootDrop?: (e: React.DragEvent) => void;
  isRootDropActive: boolean;
  onFolderDragOver?: (folderId: string) => void;
  onFolderDragLeave?: () => void;
}) {
  const isMobileContent = useIsMobile();
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (i) => i.name.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  /* Fil d'Ariane à partir du classeur uniquement (sans Workspace / Mes Classeurs) */
  const contentBreadcrumb = useMemo(
    () => breadcrumbSegments.slice(2),
    [breadcrumbSegments]
  );

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-hidden px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex min-w-0 items-center justify-between gap-4">
        <nav className="flex min-w-0 flex-wrap items-center gap-1 text-xs uppercase tracking-wider text-zinc-500 font-medium" aria-label="Fil d'Ariane">
          {contentBreadcrumb.length === 0 ? (
            <span className="text-zinc-400">My Notebooks</span>
          ) : (
            contentBreadcrumb.map((seg, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-zinc-700 mx-1">/</span>}
                {seg.onClick ? (
                  <button
                    type="button"
                    onClick={seg.onClick}
                    className={`transition-colors hover:text-zinc-300 focus:outline-none ${i === 0 ? "uppercase" : ""}`}
                  >
                    {seg.label}
                  </button>
                ) : (
                  <span className={`text-zinc-400 ${i === 0 ? "uppercase" : ""}`}>
                    {seg.label}
                  </span>
                )}
              </span>
            ))
          )}
        </nav>
        {!isMobileContent && (
        <div className="flex rounded-lg border border-zinc-800/60 p-1 bg-zinc-900/30">
          <button
            type="button"
            onClick={() => onViewModeChange("grid")}
            className={`rounded-md p-1.5 transition-all ${
              viewMode === "grid" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            }`}
            aria-pressed={viewMode === "grid"}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange("list")}
            className={`rounded-md p-1.5 transition-all ${
              viewMode === "list" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-500 hover:text-zinc-300"
            }`}
            aria-pressed={viewMode === "list"}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
        )}
      </div>

      {viewMode === "grid" ? (
        <div
          className={`grid w-full min-w-0 grid-cols-2 gap-6 rounded-xl min-h-[200px] transition-colors sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 ${
            isRootDropActive ? "ring-2 ring-zinc-500/50 bg-zinc-800/10" : ""
          }`}
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
            />
          ))}
        </div>
      ) : (
        <div
          className={`flex flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/10 overflow-hidden transition-colors ${
            isRootDropActive ? "ring-2 ring-zinc-500/50 bg-zinc-800/20" : ""
          }`}
          onDragOver={onRootDragOver}
          onDragLeave={onRootDragLeave}
          onDrop={onRootDrop}
        >
          {filtered.map((item, idx) => (
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
            />
          ))}
        </div>
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
    () => classeurs.map((c) => ({ id: c.id, name: c.name })),
    [classeurs]
  );

  const breadcrumbSegments = useMemo((): BreadcrumbSegment[] => {
    const segments: BreadcrumbSegment[] = [
      { label: "Workspace", onClick: handleGoToRoot },
      { label: "My Notebooks", onClick: handleGoToRoot },
    ];
    if (activeClasseur) {
      segments.push({
        label: activeClasseur.name,
        onClick: folderPath.length === 0 ? undefined : handleGoToRoot,
      });
    }
    folderPath.forEach((f, i) => {
      const isLast = i === folderPath.length - 1;
      segments.push({
        label: f.name,
        onClick: isLast ? undefined : () => handleGoToFolder(f.id),
      });
    });
    return segments;
  }, [activeClasseur, folderPath, handleGoToRoot, handleGoToFolder]);

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
        subtitle: count > 0 ? `${count} élément${count !== 1 ? "s" : ""}` : "Dossier",
        iconColor: folderColorByIndex(i),
      });
    });
    filteredFiles.forEach((file: FileArticle) => {
      const note = notesMap[file.id];
      const subtitle = note?.updated_at
        ? formatRelativeTime(note.updated_at)
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
    setContextMenuItem({ x: e.clientX, y: e.clientY, item });
    setContextMenuTab(null);
  }, []);

  const handleTabContextMenu = useCallback((e: React.MouseEvent, tab: ClasseurTab) => {
    e.preventDefault();
    setContextMenuTab({ x: e.clientX, y: e.clientY, tab });
    setContextMenuItem(null);
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
    const name = window.prompt("Nom du dossier", "Nouveau dossier");
    if (name?.trim()) {
      const created = await createFolder(name.trim());
      if (created) setRefreshKey((k) => k + 1);
    }
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
  }, []);

  const handleContextMenuRename = useCallback(
    (id: string, type: "folder" | "file", currentName: string) => {
      const newName = window.prompt("Nouveau nom", currentName);
      if (newName?.trim()) {
        submitRename(id, newName.trim(), type);
        closeContextMenus();
      }
    },
    [submitRename, closeContextMenus]
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
    async (tab: ClasseurTab) => {
      const newName = window.prompt("Nouveau nom du classeur", tab.name);
      if (newName?.trim()) {
        try {
          await handleRenameClasseur(tab.id, newName.trim());
          closeContextMenus();
        } catch {
          // error handled by hook
        }
      }
    },
    [handleRenameClasseur, closeContextMenus]
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
    (e: React.DragEvent, folderId: string) => {
      setDropTargetFolderId(null);
      let data: { id: string; type: "folder" | "file" } | null = null;
      try {
        const raw = e.dataTransfer.getData(DRAG_JSON);
        if (raw) data = JSON.parse(raw) as { id: string; type: "folder" | "file" };
      } catch {
        // ignore
      }
      if (data?.id && data?.type) {
        handleDropItem(data.id, data.type, folderId);
        setRefreshKey((k) => k + 1);
      }
    },
    [handleDropItem]
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
    <div className="classeurs-page-root flex h-full min-h-full w-full min-w-0">
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <ClasseursHeader
          statsLabel={statsLabel}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onNouveauClick={() => setNouveauOpen((o) => !o)}
          nouveauOpen={nouveauOpen}
          onNouveauClose={() => setNouveauOpen(false)}
          onCreateClasseur={handleCreateClasseurClick}
          onCreateFolder={handleCreateFolderClick}
          onCreateNote={handleCreateNoteClick}
        />
        <div className="flex w-full min-w-0 flex-1 flex-col overflow-hidden">
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
          />
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {!activeClasseur && tabs.length === 0 && (
              <div className="mx-4 sm:mx-6 lg:mx-8 mt-12 rounded-2xl border border-zinc-800/60 bg-zinc-900/20 px-6 py-20 text-center backdrop-blur-sm">
                <BookMarked className="mx-auto h-12 w-12 text-zinc-700 mb-4" />
                <p className="text-zinc-400 font-medium">Aucun classeur détecté.</p>
                <p className="text-zinc-500 text-sm mt-1">Utilisez le menu <strong className="text-zinc-300">Nouveau</strong> pour commencer à organiser vos notes.</p>
              </div>
            )}
            {activeClasseur && (
              <ClasseursContent
                breadcrumbSegments={breadcrumbSegments}
                items={items}
                viewMode={effectiveViewMode}
                onViewModeChange={setViewMode}
                searchQuery={searchQuery}
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
                  contextMenuItem.item.type,
                  contextMenuItem.item.name
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
            { label: "Renommer", onClick: () => handleTabRename(contextMenuTab.tab) },
            { label: "Supprimer", onClick: () => handleTabDelete(contextMenuTab.tab) },
          ]}
          onClose={closeContextMenus}
        />
      )}
    </div>
  );
}
