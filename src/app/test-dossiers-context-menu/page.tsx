"use client";

import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import FolderManager from '@/components/FolderManager';
import SimpleContextMenu from '@/components/SimpleContextMenu';

/**
 * Page de test pour vérifier le menu contextuel dans la page dossiers
 */
export default function TestDossiersContextMenuPage() {
  const { user } = useAuth();
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
  }>({ visible: false, x: 0, y: 0 });

  if (!user) {
    return <div>Veuillez vous connecter pour tester le menu contextuel.</div>;
  }

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 text-center">
          Test Menu Contextuel - Page Dossiers
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Zone de test simple */}
          <div 
            className="p-8 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl cursor-context-menu"
            onContextMenu={handleContextMenu}
          >
            <h2 className="text-xl font-semibold text-white mb-4">
              Zone de Test Simple
            </h2>
            <p className="text-white/80">
              Clic droit ici pour voir le menu contextuel de test.
            </p>
          </div>

          {/* FolderManager de test */}
          <div className="p-8 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
            <h2 className="text-xl font-semibold text-white mb-4">
              FolderManager de Test
            </h2>
            <p className="text-white/80 mb-4">
              Le FolderManager avec le menu contextuel intégré :
            </p>
            <div className="bg-black/20 rounded-lg p-4">
              <FolderManager
                classeurId="test-classeur"
                classeurName="Test Classeur"
                classeurIcon="📁"
                parentFolderId={null}
                onFolderOpen={(folder) => console.log('Ouvrir dossier:', folder)}
                onGoBack={() => console.log('Retour')}
                onGoToRoot={() => console.log('Racine')}
                onGoToFolder={(id) => console.log('Aller au dossier:', id)}
                folderPath={[]}
                preloadedFolders={[]}
                preloadedNotes={{}}
                skipApiCalls={true}
                viewMode="grid"
                onToggleView={() => {}}
                onCreateFolder={() => console.log('Créer dossier')}
                onCreateFile={() => console.log('Créer note')}
              />
            </div>
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-white/60 text-sm">
            Testez le clic droit sur la zone de test ou dans le FolderManager
          </p>
        </div>
      </div>

      {/* Menu contextuel de test */}
      <SimpleContextMenu
        visible={contextMenu.visible}
        x={contextMenu.x}
        y={contextMenu.y}
        options={[
          { label: 'Test Ouvrir', onClick: () => handleAction('Test Ouvrir') },
          { label: 'Test Renommer', onClick: () => handleAction('Test Renommer') },
          { label: 'Test Supprimer', onClick: () => handleAction('Test Supprimer') },
        ]}
        onClose={closeContextMenu}
      />
    </div>
  );
}
