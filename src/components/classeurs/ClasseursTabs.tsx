"use client";

import React, { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users } from "lucide-react";
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
import type { ClasseurTab } from "@/components/classeurs/types";
import RenameInput from "@/components/RenameInput";

// Contraint le drag à l'axe horizontal uniquement (évite la disparition sur mouvement vertical)
const restrictToHorizontalAxis: Modifier = ({ transform }) => ({
  ...transform,
  y: 0,
});

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
  disableSortable,
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
  disableSortable?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tab.id,
    disabled: !!disableSortable,
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
      {...(isRenaming || disableSortable ? {} : listeners)}
      onDragOver={(e) => {
        if (disableSortable || !isNativeDrag(e)) return;
        e.preventDefault();
        e.stopPropagation();
        onDragOver?.(e, tab);
      }}
      onDragLeave={(e) => {
        if (disableSortable || !isNativeDrag(e)) return;
        onDragLeave?.(e);
      }}
      onDrop={(e) => {
        if (disableSortable || !isNativeDrag(e)) return;
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
        <div className="tab-rename-wrapper flex items-center gap-1.5 w-full text-left" onClick={(e) => e.stopPropagation()}>
          {tab.emoji && <span className="text-base leading-none flex-shrink-0">{tab.emoji}</span>}
          <RenameInput
            initialValue={tab.name}
            onSubmit={onRenameSubmit}
            onCancel={onRenameCancel}
            autoFocus
            variant="tab"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => onSelect(tab.id)}
          onContextMenu={(e) => onContextMenu?.(e, tab)}
          className="flex items-center gap-1.5 w-full text-left"
          title={
            tab.kind === "shared" && tab.sharedBy
              ? `Partagé par ${tab.sharedBy}`
              : undefined
          }
        >
          {tab.emoji && <span className="text-base leading-none">{tab.emoji}</span>}
          {tab.name}
          {tab.kind === "shared" ? (
            <Users className="h-3 w-3 shrink-0 text-current" aria-hidden />
          ) : null}
        </button>
      )}
    </div>
  );
}

export interface ClasseursTabsProps {
  tabs: ClasseurTab[];
  activeId: string;
  onSelect: (id: string) => void;
  onContextMenu?: (e: React.MouseEvent, tab: ClasseurTab) => void;
  onCreateTab?: () => void;
  onTabDragOver?: (e: React.DragEvent, tab: ClasseurTab) => void;
  onTabDragLeave?: (e: React.DragEvent) => void;
  onTabDrop?: (e: React.DragEvent, tab: ClasseurTab) => void;
  dragOverTabId: string | null;
  /** Après réordonnancement horizontal des onglets (possédés + partagés). */
  onTabsReorder: (newTabs: ClasseurTab[]) => void;
  renamingTabId?: string | null;
  onTabRenameSubmit?: (tabId: string, newName: string) => void;
  onTabRenameCancel?: () => void;
}

export function ClasseursTabs({
  tabs,
  activeId,
  onSelect,
  onContextMenu,
  onCreateTab,
  onTabDragOver,
  onTabDragLeave,
  onTabDrop,
  dragOverTabId,
  onTabsReorder,
  renamingTabId,
  onTabRenameSubmit,
  onTabRenameCancel,
}: ClasseursTabsProps) {
  void onCreateTab;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const handleDragEnd = useCallback(
    (e: DragEndEvent) => {
      const { active, over } = e;
      if (!over || active.id === over.id || tabs.length === 0) return;
      const oldIndex = tabs.findIndex((t) => t.id === active.id);
      const newIndex = tabs.findIndex((t) => t.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;
      onTabsReorder(arrayMove(tabs, oldIndex, newIndex));
    },
    [tabs, onTabsReorder]
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
          <div className="flex gap-1 items-end">
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
