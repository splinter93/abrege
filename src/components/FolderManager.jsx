'use client';
import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { FolderPlus, Grid, List, ArrowLeft, Pencil } from 'lucide-react';
import './FolderManager.css';
import { getFolders, getArticles, getFolderById, updateItemPositions, renameItem, createFolder, createArticle, moveItem, deleteFolder, deleteArticle } from '../services/supabase';
// import { useToast } from '../contexts/ToastContext';
import ContextMenu from './ContextMenu';
// DnD Kit imports
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, rectSortingStrategy, verticalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DynamicIcon from './DynamicIcon';

// --- Icônes ---
const FolderIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="folderGradient" x1="2" y1="4" x2="22" y2="20">
        <stop offset="0%" stopColor="#c24118"/>
        <stop offset="100%" stopColor="#9e3411"/>
      </linearGradient>
    </defs>
    <path d="M2 6C2 4.89543 2.89543 4 4 4H9L11 6H20C21.1046 6 22 6.89543 22 8V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z" fill="url(#folderGradient)"/>
  </svg>
);
const SummaryIcon = () => (
  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="fileLogoGradient" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ff6b3d" />
        <stop offset="100%" stopColor="#e55a2c" />
      </linearGradient>
    </defs>
    <path d="M2 6C2 4.89543 2.89543 4 4 4H20C21.1046 4 22 4.89543 22 6V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z" fill="#333333"/>
    
    <path d="M6 11H14" stroke="#777777" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M6 14H15" stroke="#777777" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M6 17H12" stroke="#777777" strokeWidth="1.5" strokeLinecap="round"/>

    <g transform="translate(15.5, 4.5) scale(0.25)">
      <rect width="24" height="24" rx="6" fill="url(#fileLogoGradient)" />
      <path d="M17 7L7 17M7 11v6h6" stroke="#121212" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </g>
  </svg>
);

const getFileType = (item) => {
  if (item.type === 'folder') return 'Dossier';

  switch (item.source_type) {
    case 'markdown': return 'Note Markdown';
    case 'pdf': return 'Document PDF';
    case 'youtube': return 'Vidéo YouTube';
    case 'text': return 'Fichier Texte';
    default: return 'Fichier';
  }
};

// --- Merged Item Component ---
const Item = ({ item, viewMode, onRename, isRenaming, onStartRename, onCancelRename }) => {
  const [name, setName] = useState(item.name || item.source_title);
  const inputRef = useRef(null);
  const nameContainerRef = useRef(null);
  const [isNameTruncated, setIsNameTruncated] = useState(false);

  const displayedName = item.name || item.source_title;

  useLayoutEffect(() => {
    if (nameContainerRef.current) {
      const element = nameContainerRef.current;
      const isOverflowing = element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
      setIsNameTruncated(isOverflowing);
    }
  }, [displayedName, viewMode, isRenaming]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await onRename(item.id, item.type, name);
    } else if (e.key === 'Escape') {
      onCancelRename();
    }
  };

  const handleBlur = async () => {
    await onRename(item.id, item.type, name);
  };

  const isFolder = item.type === 'folder';

  const nameSpan = (
    <motion.span
      key="span"
      ref={nameContainerRef}
      className="item-name"
      title={isNameTruncated ? displayedName : ''}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.2 }}
    >
      {displayedName}
    </motion.span>
  );

  const inputField = (
     <motion.input
        key="input"
        ref={inputRef}
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className="item-rename-input"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
      />
  );

  if (viewMode === 'list') {
    return (
      <div className="list-item">
        <div className="list-item-name-col">
          {isFolder ? <FolderIcon /> : <SummaryIcon />}
          <AnimatePresence mode="wait">
            {isRenaming ? inputField : nameSpan}
          </AnimatePresence>
        </div>
        <div className="list-item-type-col">{getFileType(item)}</div>
        <div className="list-item-date-col">{item.type !== 'folder' && new Date(item.updated_at).toLocaleDateString()}</div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="grid-item file-item">
      {isFolder ? <FolderIcon /> : <SummaryIcon />}
      <AnimatePresence mode="wait">{isRenaming ? inputField : nameSpan}</AnimatePresence>
    </div>
  );
};

const SortableItem = ({ id, item, viewMode, onRename, isRenaming, onStartRename, onCancelRename, onContextMenu, onClick }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id, data: { item } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'none',
    opacity: isDragging ? 0 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onContextMenu={onContextMenu}
      onClick={onClick}
      className="motion-item-wrapper"
      title={item.name || item.source_title}
    >
      <Item
        item={item}
        viewMode={viewMode}
        onRename={onRename}
        isRenaming={isRenaming}
        onStartRename={onStartRename}
        onCancelRename={onCancelRename}
      />
    </div>
  );
};

const SortableList = ({ items, viewMode, onRename, renamingItemId, onStartRename, onCancelRename, handleContextMenu, handleItemClick }) => {
  return (
    <div className={`dnd-container ${viewMode === 'grid' ? 'grid-view' : 'list-container'}`}>
      {items.map(item => (
        <SortableItem
          key={item.id}
          id={item.id}
          item={item}
          viewMode={viewMode}
          onRename={onRename}
          isRenaming={item.id === renamingItemId}
          onStartRename={onStartRename}
          onCancelRename={onCancelRename}
          onContextMenu={(e) => handleContextMenu(e, item)}
          onClick={() => handleItemClick(item)}
        />
      ))}
    </div>
  );
};

const FolderManager = ({ classeurId, classeurName, classeurIcon }) => {
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [viewMode, setViewMode] = useState('grid');
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [contextMenu, setContextMenu] = useState({
    visible: false,
    x: 0,
    y: 0,
    item: null,
  });
  const [renamingItemId, setRenamingItemId] = useState(null);
  const [activeId, setActiveId] = useState(null);
  const router = useRouter();
  const allItems = [...folders, ...files];

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const collisionDetectionStrategy = closestCenter;

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const handleDragEnd = async (event) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const activeItem = allItems.find(i => i.id === active.id);
    const overItem = allItems.find(i => i.id === over.id);

    if (!activeItem || !overItem || activeItem.type !== overItem.type) {
      // Cannot reorder between different types (folders vs files)
      return;
    }

    // --- Reordering Logic ---
    const list = activeItem.type === 'folder' ? folders : files;
    const setList = activeItem.type === 'folder' ? setFolders : setFiles;
    
    const oldIndex = list.findIndex(i => i.id === active.id);
    const newIndex = list.findIndex(i => i.id === over.id);
    
    if (oldIndex === -1 || newIndex === -1) return;

    const newList = arrayMove(list, oldIndex, newIndex);
    setList(newList);

    try {
      const itemsToUpdate = newList.map((item, index) => ({ id: item.id, position: index, type: item.type }));
      await updateItemPositions(itemsToUpdate);
    } catch (error) {
      console.error('Failed to update positions:', error);
      setList(list); // Rollback optimistic update
    }
  };

  // Load data for current folder
  useEffect(() => {
    if (!classeurId) return; // Garde anti-crash : ne charge rien sans ID
    const loadItems = async () => {
      try {
        const [fetchedFolders, fetchedArticles] = await Promise.all([
          getFolders(classeurId),
          getArticles(classeurId)
        ]);

        const sortedFolders = fetchedFolders.sort((a, b) => (a.position || 0) - (b.position || 0));
        const sortedFiles = fetchedArticles.sort((a, b) => (a.position || 0) - (b.position || 0));

        setFolders(sortedFolders.map(f => ({ ...f, type: 'folder' })));
        setFiles(sortedFiles.map(f => ({ ...f, type: 'file' })));
        
      } catch (error) {
        console.error('Failed to load items:', error);
      }
    };
    loadItems();
  }, [classeurId, currentFolderId]);

  // Navigation handlers
  const handleFolderOpen = (folder) => setCurrentFolderId(folder.id);
  const handleBack = () => {
    if (currentFolder?.parent_id) {
      setCurrentFolderId(currentFolder.parent_id);
    } else {
      setCurrentFolderId(null);
    }
  };

  const handleContextMenu = (e, item) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      item: item,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleStartRename = (item) => {
    closeContextMenu();
    setRenamingItemId(item.id);
  };

  const handleCancelRename = () => {
    setRenamingItemId(null);
  };

  const handleRename = async (itemId, itemType, newName) => {
    closeContextMenu();

    const trimmedName = newName.trim();
    if (!trimmedName) {
      return; // Garde l'input ouvert pour correction
    }

    const originalItem = folders.find(i => i.id === itemId) || files.find(i => i.id === itemId);
    const originalName = originalItem?.name || originalItem?.source_title;

    if (trimmedName === originalName) {
      setRenamingItemId(null); // Pas de changement, on ferme juste
      return;
    }

    try {
      await renameItem(itemId, itemType, trimmedName);
      if (itemType === 'folder') {
        setFolders(folders.map(i => i.id === itemId ? { ...i, name: trimmedName, source_title: i.source_type === 'file' ? trimmedName : i.source_title } : i));
      } else {
        setFiles(files.map(i => i.id === itemId ? { ...i, name: trimmedName, source_title: i.source_type === 'folder' ? trimmedName : i.source_title } : i));
      }
    } catch (error) {
      console.error("Failed to rename item:", error);
    } finally {
      setRenamingItemId(null);
    }
  };

  const handleDelete = async () => {
    if (!contextMenu.item) return;
    if (window.confirm(`Supprimer définitivement « ${contextMenu.item.name || contextMenu.item.source_title} » ?`)) {
      try {
        if (contextMenu.item.type === 'folder') {
          await deleteFolder(contextMenu.item.id);
          setFolders(folders.filter(f => f.id !== contextMenu.item.id));
        } else {
          await deleteArticle(contextMenu.item.id);
          setFiles(files.filter(f => f.id !== contextMenu.item.id));
        }
        closeContextMenu();
      } catch (error) {
        alert('Erreur lors de la suppression.');
        console.error(error);
      }
    }
  };
  
  const handleItemClick = (item) => {
    if (renamingItemId === item.id) return;
    if (item.type === 'folder') {
      handleFolderOpen(item);
    } else {
      if (item.source_type === 'markdown') {
        router.push(`/note/${item.id}`);
      } else {
        router.push(`/summary/${item.id}`);
      }
    }
  };

  const handleCreateFolder = async () => {
    try {
      const newFolder = await createFolder({
        name: 'Nouveau dossier',
        classeurId: classeurId,
        parentId: currentFolderId,
        position: folders.length,
      });
      setFolders(prev => [...prev, { ...newFolder, type: 'folder' }]);
      setRenamingItemId(newFolder.id);
    } catch (error) {
      console.error('Failed to create folder:', error);
    }
  };

  const handleCreateNote = async () => {
    try {
      const newNote = await createArticle({
        sourceTitle: 'Nouvelle note',
        sourceType: 'markdown',
        markdown_content: '',
        html_content: '',
        classeurId: classeurId,
        folderId: currentFolderId,
        position: files.length,
        source_url: `/note/${crypto.randomUUID()}`
      });
      setFiles(prev => [...prev, { ...newNote, type: 'file' }]);
      setRenamingItemId(newNote.id);
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const contextMenuItems = [
    { label: 'Renommer', action: () => handleStartRename(contextMenu.item) },
    { label: 'Supprimer', action: () => handleDelete() },
  ];

  const activeItem = activeId ? allItems.find(i => i.id === activeId) : null;

  return (
    <div className="folder-manager-root folder-manager-container" onContextMenu={(e) => e.preventDefault()} onClick={closeContextMenu}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%'}}>
        <div className="classeur-header-glass">
          <h2 className="classeur-header-title">{classeurName}</h2>
        </div>
        <div className="view-controls">
          <button onClick={handleCreateNote} className="control-btn" title="Nouvelle note">
            <Pencil size={20} />
          </button>
          <button onClick={handleCreateFolder} className="control-btn" title="Nouveau dossier">
            <FolderPlus size={20} />
          </button>
          <button onClick={() => setViewMode('list')} className={`control-btn ${viewMode === 'list' ? 'active' : ''}`} title="Vue liste">
            <List size={20} />
          </button>
          <button onClick={() => setViewMode('grid')} className={`control-btn ${viewMode === 'grid' ? 'active' : ''}`} title="Vue grille">
            <Grid size={20} />
          </button>
        </div>
      </div>
      <header className="folder-manager-header">
        <div className="breadcrumbs">
          {currentFolderId && (
            <button onClick={handleBack} className="control-btn" title="Retour">
              <ArrowLeft size={20} />
            </button>
          )}
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className={`folder-manager-content ${viewMode === 'list' ? 'list' : 'grid'}`}>
          
          {folders.length > 0 && (
            <div className="item-group-container">
              <h3 className="item-group-title">Folders</h3>
              <SortableContext items={folders.map(f => f.id)} strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
                <SortableList 
                  items={folders}
                  viewMode={viewMode}
                  onRename={handleRename}
                  renamingItemId={renamingItemId}
                  onStartRename={handleStartRename}
                  onCancelRename={handleCancelRename}
                  handleContextMenu={handleContextMenu}
                  handleItemClick={handleItemClick}
                />
              </SortableContext>
            </div>
          )}
          
          {files.length > 0 && folders.length > 0 && <div className="item-group-separator" />}
          
          {files.length > 0 && (
            <div className="item-group-container">
              <h3 className="item-group-title">Files</h3>
              <SortableContext items={files.map(f => f.id)} strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}>
                <SortableList 
                  items={files}
                  viewMode={viewMode}
                  onRename={handleRename}
                  renamingItemId={renamingItemId}
                  onStartRename={handleStartRename}
                  onCancelRename={handleCancelRename}
                  handleContextMenu={handleContextMenu}
                  handleItemClick={handleItemClick}
                />
              </SortableContext>
            </div>
          )}

        </div>
        
        <DragOverlay adjustScale={false}>
          {activeItem ? (
            <div className="motion-item-wrapper dragged">
              <Item 
                item={activeItem} 
                viewMode={viewMode}
                isRenaming={false} 
                onRename={() => {}} 
                onStartRename={() => {}} 
                onCancelRename={() => {}}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      
      {contextMenu.visible && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          visible={contextMenu.visible}
          items={contextMenuItems}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};

export default FolderManager; 