"use client";
import React, { useState, useCallback } from "react";
import SimpleContextMenu from "./SimpleContextMenu";
import TrashConfirmationModal from "./TrashConfirmationModal";
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
}

const ClasseurBandeau: React.FC<ClasseurBandeauProps> = ({
  classeurs,
  activeClasseurId,
  onSelectClasseur,
  onCreateClasseur,
  onRenameClasseur,
  onDeleteClasseur,
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
   * Handler pour le drop sur les icônes des classeurs
   * Gère le déplacement cross-classeur des dossiers et notes
   */
  const handleDrop = useCallback((e: React.DragEvent, classeur: Classeur) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Réinitialiser l'état de drag over
    setDragOverClasseurId(null);
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data && data.id && data.type) {
        // Déclencher l'événement custom pour le drop sur classeur
        window.dispatchEvent(new CustomEvent('drop-to-classeur', {
          detail: { 
            classeurId: classeur.id, 
            itemId: data.id, 
            itemType: data.type 
          }
        }));
      }
    } catch (error) {
      // Fallback pour les données non-JSON (compatibilité)
      const itemId = e.dataTransfer.getData('itemId');
      const itemType = e.dataTransfer.getData('itemType') as 'folder' | 'file';
      
      if (itemId && itemType) {
        window.dispatchEvent(new CustomEvent('drop-to-classeur', {
          detail: { 
            classeurId: classeur.id, 
            itemId: itemId, 
            itemType: itemType 
          }
        }));
      }
    }
  }, []);

  /**
   * Handlers pour l'état visuel de drag over
   * Améliore l'expérience utilisateur avec des indicateurs visuels
   */
  const handleDragOver = useCallback((e: React.DragEvent, classeur: Classeur) => {
    e.preventDefault();
    setDragOverClasseurId(classeur.id);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOverClasseurId(null);
  }, []);

  return (
    <div className="classeur-bandeau">
      <div className="bandeau-content">
        {classeurs.map((classeur) => (
          <button
            key={classeur.id}
            className={`classeur-pill ${activeClasseurId === classeur.id ? 'active' : ''}`}
            onClick={() => onSelectClasseur(classeur.id)}
            onContextMenu={(e) => handleContextMenu(e, classeur)}
            onDragOver={(e) => handleDragOver(e, classeur)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, classeur)}
            draggable={false}
          >
            <span 
              className={`classeur-emoji ${dragOverClasseurId === classeur.id ? 'drag-over' : ''}`}
              onDragOver={(e) => handleDragOver(e, classeur)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, classeur)}
            >
              {classeur.emoji && classeur.emoji.trim() !== "" ? classeur.emoji : "📁"}
            </span>
            <span className="classeur-name">{classeur.name}</span>
          </button>
        ))}
        
        <button className="classeur-pill add-classeur" onClick={onCreateClasseur}>
          <span className="add-icon">+</span>
        </button>
      </div>
      
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
          childrenCount={0} // TODO: Calculer le nombre réel d'éléments
        />
      )}
    </div>
  );
};

export default ClasseurBandeau; 