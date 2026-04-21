"use client";

import React from "react";
import { motion } from "framer-motion";
import { Folder } from "lucide-react";
import { Feather } from "react-feather";
import type { ClasseurItem } from "@/components/classeurs/types";
import RenameInput from "@/components/RenameInput";
import { useDraggableItem } from "./ClasseursItemCard";
import { getFolderIconClasses } from "./utils";

export interface ItemListRowProps {
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
  /** Liste virtualisée : pas de motion.div pour éviter coût par ligne */
  virtualized?: boolean;
}

export function ItemListRow({
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
  virtualized = false,
}: ItemListRowProps) {
  const Icon = item.type === "folder" ? Folder : Feather;
  const iconClasses =
    item.type === "folder"
      ? getFolderIconClasses("orange")
      : "text-zinc-400 fill-zinc-500/10";
  const isFolder = item.type === "folder";
  const { isDragging, handleDragStart, handleDragEnd } = useDraggableItem(item, onDragStart);

  const rowInner = (
    <div
      role="button"
      tabIndex={0}
      className={`group flex items-center justify-between rounded-md border px-3 py-2 transition-all duration-200 cursor-pointer ${
        isDropTarget ? "border-orange-500/35 bg-orange-500/5" : "border-transparent hover:border-zinc-800/50"
      } ${isDragging ? "opacity-40" : ""}`}
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
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Icon className={`h-[18px] w-[18px] flex-shrink-0 ${iconClasses}`} strokeWidth={1.5} />
        {isRenaming && onRename && onCancelRename ? (
          <div className="min-w-0 flex-1 text-sm" onClick={(e) => e.stopPropagation()}>
            <RenameInput
              initialValue={item.name}
              onSubmit={onRename}
              onCancel={onCancelRename}
              autoFocus
              variant="item-list"
            />
          </div>
        ) : (
          <span className="min-w-0 flex-1 truncate text-sm text-zinc-100">{item.name}</span>
        )}
      </div>
      <span className="flex-shrink-0 text-xs text-zinc-500 ml-4">{item.subtitle}</span>
    </div>
  );

  if (virtualized) {
    return rowInner;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      {rowInner}
    </motion.div>
  );
}
