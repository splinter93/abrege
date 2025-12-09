/**
 * Utilitaires pour la synchronisation des dossiers imbriqués
 * Gère la cohérence des dossiers parents et enfants lors des déplacements
 */

import { useFileSystemStore } from '@/store/useFileSystemStore';

/**
 * Met à jour récursivement tous les dossiers enfants dans le store Zustand
 * @param parentFolderId - ID du dossier parent
 * @param targetClasseurId - ID du classeur de destination
 */
export const updateChildFoldersInStore = (parentFolderId: string, targetClasseurId: string) => {
  const store = useFileSystemStore.getState();
  
  // Fonction récursive pour mettre à jour tous les dossiers enfants
  const updateRecursive = (folderId: string) => {
    const childFolders = Object.values(store.folders).filter(folder => folder.parent_id === folderId);
    
    childFolders.forEach(childFolder => {
      // Mettre à jour le classeur_id du dossier enfant
      const parentId = childFolder.parent_id ?? null;
      store.moveFolder(childFolder.id, parentId, targetClasseurId);
      
      // Récursivement mettre à jour les dossiers enfants de ce dossier
      updateRecursive(childFolder.id);
    });
  };
  
  updateRecursive(parentFolderId);
};

/**
 * Met à jour toutes les notes d'un dossier et de ses enfants dans le store Zustand
 * @param folderId - ID du dossier parent
 * @param targetClasseurId - ID du classeur de destination
 */
export const updateChildNotesInStore = (folderId: string, targetClasseurId: string) => {
  const store = useFileSystemStore.getState();
  
  // Fonction récursive pour collecter tous les IDs de dossiers (parent + enfants)
  const getAllFolderIds = (parentId: string): string[] => {
    const folderIds = [parentId];
    const childFolders = Object.values(store.folders).filter(folder => folder.parent_id === parentId);
    
    childFolders.forEach(childFolder => {
      folderIds.push(...getAllFolderIds(childFolder.id));
    });
    
    return folderIds;
  };
  
  // Récupérer tous les IDs de dossiers (parent + enfants)
  const allFolderIds = getAllFolderIds(folderId);
  
  // Mettre à jour toutes les notes de ces dossiers
  const notesToUpdate = Object.values(store.notes).filter(note => 
    allFolderIds.includes(note.folder_id || '')
  );
  
  notesToUpdate.forEach(note => {
    store.moveNote(note.id, note.folder_id, targetClasseurId);
  });
  
  return notesToUpdate.length;
};

/**
 * Force la synchronisation complète d'un dossier et de ses enfants
 * @param folderId - ID du dossier parent
 * @param targetClasseurId - ID du classeur de destination
 */
export const syncFolderHierarchy = (folderId: string, targetClasseurId: string) => {
  updateChildFoldersInStore(folderId, targetClasseurId);
  const notesCount = updateChildNotesInStore(folderId, targetClasseurId);
  
  if (process.env.NODE_ENV === 'development') {
    // Utiliser console.log pour éviter les imports async dans une fonction sync
    console.log(`[FolderSyncUtils] ✅ Synchronisation terminée: ${notesCount} notes mises à jour`);
  }
  
  return notesCount;
};
