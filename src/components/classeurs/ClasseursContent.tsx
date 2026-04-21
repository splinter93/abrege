"use client";

import React, { useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { motion } from "framer-motion";
import { Search, LayoutGrid, List } from "lucide-react";
import { useIsMobile } from "@/hooks/useIsMobile";
import type {
  BreadcrumbSegment,
  ClasseurItem,
  ViewMode,
} from "@/components/classeurs/types";
import { ItemCard } from "@/components/classeurs/ClasseursItemCard";
import { ItemListRow } from "@/components/classeurs/ClasseursItemListRow";

export interface ClasseursContentProps {
  breadcrumbSegments: BreadcrumbSegment[];
  items: ClasseurItem[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  searchQuery: string;
  onItemOpen: (item: ClasseurItem) => void;
  onItemMouseEnter?: (item: ClasseurItem) => void;
  onItemContextMenu: (e: React.MouseEvent, item: ClasseurItem) => void;
  onDragStartItem?: (e: React.DragEvent, item: ClasseurItem) => void;
  onDropOnFolder?: (e: React.DragEvent, folderId: string | null) => void;
  dropTargetFolderId: string | null;
  onRootDragOver?: (e: React.DragEvent) => void;
  onRootDragLeave?: () => void;
  onRootDrop?: (e: React.DragEvent) => void;
  isRootDropActive: boolean;
  onFolderDragOver?: (folderId: string) => void;
  onFolderDragLeave?: () => void;
  onSearchChange?: (q: string) => void;
  renamingItemId?: string | null;
  onItemRename?: (id: string, newName: string, type: "folder" | "file") => void;
  onItemCancelRename?: () => void;
}

export function ClasseursContent({
  breadcrumbSegments,
  items,
  viewMode,
  onViewModeChange,
  searchQuery,
  onItemOpen,
  onItemMouseEnter,
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
}: ClasseursContentProps) {
  void isRootDropActive;

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

  const [breadcrumbDragOver, setBreadcrumbDragOver] = useState<number | null>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const shouldVirtualizeList = viewMode === "list" && filtered.length > 50;
  const rowVirtualizer = useVirtualizer({
    count: shouldVirtualizeList ? filtered.length : 0,
    getScrollElement: () => listScrollRef.current,
    estimateSize: () => 52,
    overscan: 8,
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-hidden pt-2 pb-6">
      {/* Breadcrumb à gauche + search + toggle à droite */}
      <div className="flex items-end justify-between gap-4 min-w-0">
        <nav className="flex min-w-0 flex-wrap items-end gap-0" aria-label="Fil d'Ariane">
          {contentBreadcrumb.length === 0 ? (
            <span className="text-zinc-400">Notebooks</span>
          ) : (
            contentBreadcrumb.map((seg, i) => {
              const isDropTarget = breadcrumbDragOver === i;
              const isRoot = i === 0;
              /* Tout le fil d’Ariane : même échelle que .settings-v-title ; couleur seule varie (racine vs piste). */
              const crumbTypo =
                "text-xl font-medium normal-case tracking-normal mb-0 font-sans";
              const rootCrumb = `${crumbTypo} text-[var(--color-text-primary,#ededed)]`;
              const trailCrumbBtn = `${crumbTypo} text-zinc-400 hover:text-zinc-200`;
              const trailCrumbSpan = `${crumbTypo} text-zinc-400`;
              const dropTypo = isDropTarget ? "bg-orange-500/20 text-orange-400" : "";
              const dropHandlers = seg.dropFolderId !== undefined ? {
                onDragOver: (e: React.DragEvent) => { e.preventDefault(); setBreadcrumbDragOver(i); },
                onDragLeave: () => setBreadcrumbDragOver(null),
                onDrop: (e: React.DragEvent) => {
                  setBreadcrumbDragOver(null);
                  onDropOnFolder?.(e, seg.dropFolderId as string);
                },
              } : {};
              return (
                <span key={i} className="flex items-center gap-0">
                  {i > 0 && (
                    <span
                      className="shrink-0 select-none px-1 font-sans text-xl font-extralight leading-none text-zinc-700"
                      aria-hidden
                    >
                      /
                    </span>
                  )}
                  {seg.onClick ? (
                    <button
                      type="button"
                      onClick={seg.onClick}
                      className={`rounded-lg px-1.5 py-0.5 transition-colors focus:outline-none ${isRoot ? `${rootCrumb} cursor-pointer hover:text-zinc-300` : `${trailCrumbBtn} cursor-pointer hover:text-zinc-200`} ${dropTypo}`}
                      title={`Aller à ${seg.label}`}
                      {...dropHandlers}
                    >
                      {seg.label}
                    </button>
                  ) : (
                    <span
                      className={`rounded-lg px-1.5 py-0.5 transition-colors ${isRoot ? rootCrumb : trailCrumbSpan} ${dropTypo}`}
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
              onMouseEnter={() => onItemMouseEnter?.(item)}
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
          className="flex min-h-0 flex-1 flex-col rounded-xl border border-zinc-800/60 bg-zinc-900/10 overflow-hidden transition-colors"
          onDragOver={onRootDragOver}
          onDragLeave={onRootDragLeave}
          onDrop={onRootDrop}
        >
          <div
            ref={listScrollRef}
            className="min-h-0 max-h-[min(75vh,800px)] flex-1 overflow-y-auto"
          >
            {shouldVirtualizeList ? (
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const item = filtered[virtualRow.index];
                  return (
                    <div
                      key={`${item.type}-${item.id}`}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      <ItemListRow
                        virtualized
                        item={item}
                        onOpen={() => onItemOpen(item)}
                        onMouseEnter={() => onItemMouseEnter?.(item)}
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
                    </div>
                  );
                })}
              </div>
            ) : (
              filtered.map((item) => (
                <ItemListRow
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onOpen={() => onItemOpen(item)}
                  onMouseEnter={() => onItemMouseEnter?.(item)}
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
              ))
            )}
          </div>
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
