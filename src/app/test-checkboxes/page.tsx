'use client';

import React from 'react';
import '@/styles/public-note.css';

export default function TestCheckboxes() {
  return (
    <div className="public-note-container">
      <div className="noteLayout noImage">
        <div className="public-note-content-wrapper">
          <div className="noteLayout-title">
            <h1>🧪 Test des Checkboxes</h1>
          </div>
          
          <div className="noteLayout-content">
            <div className="editor-content markdown-body">
              <h2>Liste de tâches avec checkboxes</h2>
              
              <ul>
                <li>
                  <input type="checkbox" checked readOnly />
                  Première tâche terminée
                </li>
                <li>
                  <input type="checkbox" readOnly />
                  Deuxième tâche à faire
                </li>
                <li>
                  <input type="checkbox" checked readOnly />
                  Troisième tâche terminée
                </li>
                <li>
                  <input type="checkbox" readOnly />
                  Quatrième tâche à faire
                </li>
              </ul>

              <h2>Liste avec paragraphes</h2>
              
              <ul>
                <li>
                  <input type="checkbox" checked readOnly />
                  <p>Tâche avec paragraphe terminée</p>
                </li>
                <li>
                  <input type="checkbox" readOnly />
                  <p>Tâche avec paragraphe à faire</p>
                </li>
              </ul>

              <h2>Checkboxes individuels</h2>
              
              <p>
                <input type="checkbox" checked readOnly />
                Checkbox coché dans un paragraphe
              </p>
              
              <p>
                <input type="checkbox" readOnly />
                Checkbox non coché dans un paragraphe
              </p>

              <h2>Styles appliqués</h2>
              
              <p>Cette page utilise les styles <code>public-note.css</code> pour corriger l'affichage des checkboxes.</p>
              
              <ul>
                <li>✅ Checkboxes avec bordure et fond personnalisés</li>
                <li>✅ Checkmark ✓ visible quand coché</li>
                <li>✅ Alignement vertical correct</li>
                <li>✅ Espacement approprié</li>
                <li>✅ Couleurs du thème sombre</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 