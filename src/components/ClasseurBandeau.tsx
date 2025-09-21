"use client";
import React, { useState, useCallback, useEffect } from "react";
import { DndContext, DragEndEvent, DragOverlay, closestCenter, DragStartEvent, Modifier } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useCrossClasseurDrag } from "@/hooks/useCrossClasseurDrag";
import { DRAG_SENSOR_CONFIG, DRAG_ANIMATION_CONFIG } from "@/constants/dragAndDropConfig";
import SimpleContextMenu from "./SimpleContextMenu";
import TrashConfirmationModal from "./TrashConfirmationModal";
import SortableClasseurItem from "./SortableClasseurItem";
import "./ClasseurBandeau.css";
import "./TrashConfirmationModal.css";

export interface Classeur {
  id: string;
  name: string;
  emoji?: string;
  color?: string;
  slug?: string;
}

interface ClasseurBandeauProps {
  classeurs: Classeur[];
  activeClasseurId: string | null;
  onSelectClasseur: (id: string) => void;
  onCreateClasseur: () => void;
  onRenameClasseur?: (id: string, name: string) => void;
  onDeleteClasseur?: (id: string) => void;
  onReorderClasseurs?: (reorderedClasseurs: Classeur[]) => void;
}

const ClasseurBandeau: React.FC<ClasseurBandeauProps> = ({
  classeurs,
  activeClasseurId,
  onSelectClasseur,
  onCreateClasseur,
  onRenameClasseur,
  onDeleteClasseur,
  onReorderClasseurs,
}) => {
  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; item: Classeur | null }>({ visible: false, x: 0, y: 0, item: null });
  /**
   * État pour le drag over visuel sur les icônes des classeurs
   */
  const [dragOverClasseurId, setDragOverClasseurId] = useState<string | null>(null);
  
  /**
   * État pour le modal de confirmation de suppression
   */
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [classeurToDelete, setClasseurToDelete] = useState<Classeur | null>(null);
  
  /**
   * État pour le drag and drop des classeurs
   */
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isExternalDrag, setIsExternalDrag] = useState(false);

  /**
   * Modifier personnalisé pour centrer l'élément draggé sur le curseur
   */
  const centerOnCursor: Modifier = ({ transform }) => {
    return {
      ...transform,
      x: transform.x - 40, // Offset pour centrer horizontalement
      y: transform.y - 20, // Offset pour centrer verticalement
    };
  };

  /**
   * Effet pour détecter les drags externes (notes/dossiers)
   * 🔧 FIX: Amélioration de la détection des drags externes
   */
  useEffect(() => {
    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      
      // Vérifier si le drag vient d'un élément externe (pas un classeur)
      const isClasseurDrag = target.closest('.classeur-pill') || target.closest('.classeur-tab-glassmorphism');
      const isFolderItem = target.closest('.folder-item-wrapper') || target.closest('.file-item-wrapper');
      const isDndKitDrag = target.hasAttribute('data-dnd-kit-draggable');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[ClasseurBandeau] 🎯 Drag start détecté:', {
          target: target.tagName,
          classes: target.className,
          isClasseurDrag: !!isClasseurDrag,
          isFolderItem: !!isFolderItem,
          isDndKitDrag: !!isDndKitDrag
        });
      }
      
      // Si c'est un drag de note/dossier (externe), activer le mode externe
      if (isFolderItem && !isDndKitDrag) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[ClasseurBandeau] 🎯 Drag externe détecté - isExternalDrag = true');
        }
        setIsExternalDrag(true);
      } else if (isClasseurDrag || isDndKitDrag) {
        if (process.env.NODE_ENV === 'development') {
          console.log('[ClasseurBandeau] 🎯 Drag classeur détecté - isExternalDrag = false');
        }
        setIsExternalDrag(false);
      }
    };

    const handleDragEnd = () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[ClasseurBandeau] 🎯 Drag end - isExternalDrag = false');
      }
      setIsExternalDrag(false);
    };

    document.addEventListener('dragstart', handleDragStart, true);
    document.addEventListener('dragend', handleDragEnd, true);

    return () => {
      document.removeEventListener('dragstart', handleDragStart, true);
      document.removeEventListener('dragend', handleDragEnd, true);
    };
  }, []);

  /**
   * Effet pour gérer les classes CSS du body pendant le drag
   */
  useEffect(() => {
    if (activeId) {
      document.body.classList.add('dnd-kit-dragging');
    } else {
      document.body.classList.remove('dnd-kit-dragging');
    }

    // Cleanup au démontage du composant
    return () => {
      document.body.classList.remove('dnd-kit-dragging');
    };
  }, [activeId]);

  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>, classeur: Classeur) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item: classeur });
  };
  
  const closeContextMenu = () => setContextMenu({ ...contextMenu, visible: false });
  
  const handleOpen = () => {
    if (contextMenu.item) {
      onSelectClasseur(contextMenu.item.id);
    }
    closeContextMenu();
  };
  
  const handleRename = () => {
    if (contextMenu.item && onRenameClasseur) {
      const newName = prompt("Nouveau nom du classeur :", contextMenu.item.name);
      if (newName && newName.trim() !== "") {
        onRenameClasseur(contextMenu.item.id, newName.trim());
      }
    }
    closeContextMenu();
  };
  
  const handleDelete = () => {
    if (contextMenu.item) {
      setClasseurToDelete(contextMenu.item);
      setShowDeleteModal(true);
    }
    closeContextMenu();
  };

  const handleConfirmDelete = () => {
    if (classeurToDelete && onDeleteClasseur) {
      onDeleteClasseur(classeurToDelete.id);
    }
    setShowDeleteModal(false);
    setClasseurToDelete(null);
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
    setClasseurToDelete(null);
  };

  /**
   * Handler pour le drag end des classeurs (reorder)
   */
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveId(null);
      return;
    }

    const oldIndex = classeurs.findIndex((classeur) => classeur.id === active.id);
    const newIndex = classeurs.findIndex((classeur) => classeur.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      setActiveId(null);
      return;
    }

    // Créer le nouvel ordre des classeurs
    const newClasseurs = [...classeurs];
    const [reorderedItem] = newClasseurs.splice(oldIndex, 1);
    newClasseurs.splice(newIndex, 0, reorderedItem);

    // Appeler le callback de reorder
    if (onReorderClasseurs) {
      onReorderClasseurs(newClasseurs);
    }

    setActiveId(null);
  }, [classeurs, onReorderClasseurs]);

  // Hook pour le drag & drop cross-classeur
  const {
    handleDrop: handleCrossClasseurDrop,
    handleDragOver: handleCrossClasseurDragOver,
    handleDragLeave: handleCrossClasseurDragLeave,
    setupCrossClasseurListener,
    cleanupCrossClasseurListener
  } = useCrossClasseurDrag({
    classeurId: activeClasseurId || '',
    onRefresh: () => {}, // Pas de refresh nécessaire ici
    onSetRefreshKey: () => {} // Pas de refresh key nécessaire ici
  });

  // Configurer l'écouteur cross-classeur
  useEffect(() => {
    const handler = setupCrossClasseurListener();
    return () => cleanupCrossClasseurListener(handler);
  }, [setupCrossClasseurListener, cleanupCrossClasseurListener]);

  /**
   * Handler pour le drop sur les icônes des classeurs
   * Utilise le hook commun pour la logique cross-classeur
   */
  const handleDrop = useCallback((e: React.DragEvent, classeur: Classeur) => {
    setDragOverClasseurId(null);
    handleCrossClasseurDrop(e, classeur.id);
  }, [handleCrossClasseurDrop]);

  /**
   * Handlers pour l'état visuel de drag over
   * Utilise le hook commun pour la logique cross-classeur
   */
  const handleDragOver = useCallback((e: React.DragEvent, classeur: Classeur) => {
    handleCrossClasseurDragOver(e, classeur.id);
    setDragOverClasseurId(classeur.id);
  }, [handleCrossClasseurDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    handleCrossClasseurDragLeave(e);
    setDragOverClasseurId(null);
  }, [handleCrossClasseurDragLeave]);

  // Debug log pour l'état (développement seulement)
  if (process.env.NODE_ENV === 'development') {
    console.log('[ClasseurBandeau] isExternalDrag:', isExternalDrag);
  }

  return (
    <div className="classeur-bandeau">
      {/* DndContext conditionnel - seulement pour les classeurs */}
      {!isExternalDrag ? (
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={(event: DragStartEvent) => {
            if (process.env.NODE_ENV === 'development') {
              console.log('[ClasseurBandeau] 🎯 DndKit drag start:', event.active.id);
            }
            setActiveId(event.active.id as string);
          }}
          onDragEnd={handleDragEnd}
          modifiers={[centerOnCursor]}
        >
        <div className="bandeau-content">
          <SortableContext items={classeurs.map(c => c.id)} strategy={horizontalListSortingStrategy}>
            {classeurs.map((classeur) => (
              <SortableClasseurItem
                key={classeur.id}
                classeur={classeur}
                isActive={activeClasseurId === classeur.id}
                isDragOver={dragOverClasseurId === classeur.id}
                onSelect={onSelectClasseur}
                onContextMenu={handleContextMenu}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              />
            ))}
          </SortableContext>
          
          <button className="classeur-pill add-classeur" onClick={onCreateClasseur}>
            <span className="add-icon">+</span>
          </button>
        </div>

        {!isExternalDrag && (
          <DragOverlay
            dropAnimation={DRAG_ANIMATION_CONFIG.dropAnimation}
          >
            {activeId ? (
              <div className="drag-overlay-classeur">
                <span className="classeur-emoji">
                  {classeurs.find(c => c.id === activeId)?.emoji || "📁"}
                </span>
                <span className="classeur-name">
                  {classeurs.find(c => c.id === activeId)?.name || ""}
                </span>
              </div>
            ) : null}
          </DragOverlay>
        )}
        </DndContext>
      ) : (
        // Rendu simple sans DndContext pour les drags externes
        <div className="bandeau-content">
          {classeurs.map((classeur) => (
            <button
              key={classeur.id}
              className={`classeur-pill ${activeClasseurId === classeur.id ? 'active' : ''} ${dragOverClasseurId === classeur.id ? 'drag-over' : ''}`}
              onClick={() => onSelectClasseur(classeur.id)}
              onContextMenu={(e) => handleContextMenu(e, classeur)}
              onDragOver={(e) => handleDragOver(e, classeur)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, classeur)}
            >
              <span className={`classeur-emoji ${dragOverClasseurId === classeur.id ? 'drag-over' : ''}`}>
                {classeur.emoji && classeur.emoji.trim() !== "" ? classeur.emoji : "📁"}
              </span>
              <span className="classeur-name">{classeur.name}</span>
            </button>
          ))}
          
          <button className="classeur-pill add-classeur" onClick={onCreateClasseur}>
            <span className="add-icon">+</span>
          </button>
        </div>
      )}
      
      <SimpleContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        options={[
          { label: "Ouvrir", onClick: handleOpen },
          { label: "Renommer", onClick: handleRename },
          { label: "Supprimer", onClick: handleDelete },
        ]}
        onClose={closeContextMenu}
      />

      {/* Modal de confirmation pour la suppression */}
      {classeurToDelete && (
        <TrashConfirmationModal
          isOpen={showDeleteModal}
          onClose={handleCancelDelete}
          onConfirm={handleConfirmDelete}
          itemType="classeur"
          itemName={classeurToDelete.name}
          hasChildren={true}
          childrenCount={0} // Compteur temporaire - sera calculé dynamiquement
        />
      )}
    </div>
  );
};

export default ClasseurBandeau; 