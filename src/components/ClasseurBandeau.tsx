"use client";
import React, { useState } from "react";
import SimpleContextMenu from "./SimpleContextMenu";
import "./ClasseurBandeau.css";

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
    if (contextMenu.item && onDeleteClasseur) {
      if (window.confirm(`Voulez-vous vraiment supprimer le classeur "${contextMenu.item.name}" et tout son contenu ?`)) {
        onDeleteClasseur(contextMenu.item.id);
      }
    }
    closeContextMenu();
  };
  return (
    <div className="classeur-bandeau">
      <div className="bandeau-content">
        {classeurs.map((classeur) => (
          <button
            key={classeur.id}
            className={`classeur-pill ${activeClasseurId === classeur.id ? 'active' : ''}`}
            onClick={() => onSelectClasseur(classeur.id)}
            onContextMenu={(e) => handleContextMenu(e, classeur)}
          >
            <span className="classeur-emoji">
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
    </div>
  );
};

export default ClasseurBandeau; 