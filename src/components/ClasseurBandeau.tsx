"use client";
import React from "react";
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
}

const ClasseurBandeau: React.FC<ClasseurBandeauProps> = ({
  classeurs,
  activeClasseurId,
  onSelectClasseur,
  onCreateClasseur,
}) => {
  return (
    <div className="classeur-bandeau">
      <div className="bandeau-content">
        {classeurs.map((classeur) => (
          <button
            key={classeur.id}
            className={`classeur-pill ${activeClasseurId === classeur.id ? 'active' : ''}`}
            onClick={() => onSelectClasseur(classeur.id)}
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
    </div>
  );
};

export default ClasseurBandeau; 