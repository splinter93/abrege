"use client";

import React, { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Folder } from "lucide-react";
import { Feather } from "react-feather";
import type { ClasseurItem } from "@/components/classeurs/types";
import RenameInput from "@/components/RenameInput";
import { DRAG_JSON, getFolderIconBoxClasses, getFolderIconClasses } from "./utils";

/**
 * État de drag natif partagé entre carte grille et ligne liste.
 */
export function useDraggableItem(
  item: ClasseurItem,
  onDragStart?: (e: React.DragEvent, item: ClasseurItem) => void
) {
  const [isDragging, setIsDragging] = useState(false);
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      setIsDragging(true);
      if (onDragStart) {
        e.dataTransfer.setData("itemId", item.id);
        e.dataTransfer.setData("itemType", item.type);
        e.dataTransfer.setData(DRAG_JSON, JSON.stringify({ id: item.id, type: item.type }));
        e.dataTransfer.effectAllowed = "move";
        onDragStart(e, item);
      }
    },
    [item, onDragStart]
  );
  const handleDragEnd = useCallback(() => setIsDragging(false), []);
  return { isDragging, handleDragStart, handleDragEnd };
}

export interface ItemCardProps {
  item: ClasseurItem;
  onOpen: () => void;
  onMouseEnter?: () => void;
  onOptions?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent, item: ClasseurItem) => void;
  onDropOnFolder?: (e: React.DragEvent, folderId: string) => void;
  onFolderDragOver?: (folderId: string) => void;
  onFolderDragLeave?: () => void;
  isDropTarget?: boolean;
  isRenaming?: boolean;
  onRename?: (name: string) => void;
  onCancelRename?: () => void;
}

export function ItemCard({
  item,
  onOpen,
  onMouseEnter,
  onOptions,
  onDragStart,
  onDropOnFolder,
  onFolderDragOver,
  onFolderDragLeave,
  isDropTarget,
  isRenaming,
  onRename,
  onCancelRename,
}: ItemCardProps) {
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
  const { isDragging, handleDragStart, handleDragEnd } = useDraggableItem(item, onDragStart);

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
        className={`group relative flex min-h-[160px] min-w-0 cursor-pointer flex-col justify-between rounded-xl p-5 shadow-sm transition-all duration-300 h-full ${
          isDropTarget
            ? "border-orange-500/40 bg-orange-500/5 border"
            : "classeurs-block classeurs-card hover:shadow-md hover:shadow-black/10"
        } ${isDragging ? "opacity-40 scale-[0.97]" : ""}`}
        onClick={() => !isRenaming && onOpen()}
        onKeyDown={(e) => e.key === "Enter" && !isRenaming && onOpen()}
        onMouseEnter={onMouseEnter}
        draggable={!!onDragStart && !isRenaming}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragOver={
          isFolder && (onDropOnFolder || onFolderDragOver)
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                e.dataTransfer.dropEffect = "move";
                onFolderDragOver?.(item.id);
              }
            : undefined
        }
        onDragLeave={isFolder ? () => onFolderDragLeave?.() : undefined}
        onDrop={
          isFolder && onDropOnFolder
            ? (e) => {
                e.preventDefault();
                e.stopPropagation();
                onDropOnFolder(e, item.id);
              }
            : undefined
        }
        onContextMenu={(e) => {
          e.preventDefault();
          onOptions?.(e);
        }}
      >
        <div className="flex items-start justify-between">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform duration-300 group-hover:scale-[1.02] ${iconBoxClasses}`}
          >
            <Icon className={`h-5 w-5 ${iconClasses}`} strokeWidth={1.5} />
          </div>
          <p className="text-[12px] font-medium text-neutral-500 truncate">{item.subtitle}</p>
        </div>

        <div className="mt-auto flex min-w-0 flex-col">
          {isRenaming && onRename && onCancelRename ? (
            <div className="min-w-0 text-[15px] font-semibold" onClick={(e) => e.stopPropagation()}>
              <RenameInput
                initialValue={item.name}
                onSubmit={onRename}
                onCancel={onCancelRename}
                autoFocus
                variant="item"
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
