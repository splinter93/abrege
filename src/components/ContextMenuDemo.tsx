"use client";

import React, { useState } from 'react';
import SimpleContextMenu from './SimpleContextMenu';

/**
 * Composant de démonstration pour tester le nouveau style du menu contextuel
 */
const ContextMenuDemo: React.FC = () => {
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const closeContextMenu = () => {
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleAction = (action: string) => {
    console.log(`Action sélectionnée: ${action}`);
    closeContextMenu();
  };

  return (
    <div className="p-8 min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Démonstration Menu Contextuel Glassmorphique
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Zone de test 1 */}
          <div 
            className="p-8 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl cursor-context-menu"
            onContextMenu={handleContextMenu}
          >
            <h2 className="text-xl font-semibold text-white mb-4">
              Zone de Test 1
            </h2>
            <p className="text-white/80">
              Clic droit ici pour voir le menu contextuel avec le nouveau style glassmorphique.
            </p>
          </div>

          {/* Zone de test 2 */}
          <div 
            className="p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl cursor-context-menu"
            onContextMenu={handleContextMenu}
          >
            <h2 className="text-xl font-semibold text-white mb-4">
              Zone de Test 2
            </h2>
            <p className="text-white/80">
              Une autre zone pour tester le positionnement du menu contextuel.
            </p>
          </div>

          {/* Zone de test 3 */}
          <div 
            className="p-8 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-white/20 rounded-xl cursor-context-menu"
            onContextMenu={handleContextMenu}
          >
            <h2 className="text-xl font-semibold text-white mb-4">
              Zone de Test 3
            </h2>
            <p className="text-white/80">
              Zone avec gradient pour tester la visibilité du menu.
            </p>
          </div>

          {/* Zone de test 4 */}
          <div 
            className="p-8 bg-white/15 backdrop-blur-sm border border-white/30 rounded-xl cursor-context-menu"
            onContextMenu={handleContextMenu}
          >
            <h2 className="text-xl font-semibold text-white mb-4">
              Zone de Test 4
            </h2>
            <p className="text-white/80">
              Zone plus claire pour tester le contraste du menu.
            </p>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/60 text-sm">
            Clic droit sur n'importe quelle zone pour tester le menu contextuel
          </p>
        </div>
      </div>

      {/* Menu contextuel */}
      <SimpleContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        options={[
          { label: 'Ouvrir', onClick: () => handleAction('Ouvrir') },
          { label: 'Renommer', onClick: () => handleAction('Renommer') },
          { label: 'Copier', onClick: () => handleAction('Copier') },
          { label: 'Déplacer', onClick: () => handleAction('Déplacer') },
          { label: 'Supprimer', onClick: () => handleAction('Supprimer') },
        ]}
        onClose={closeContextMenu}
      />
    </div>
  );
};

export default ContextMenuDemo;
