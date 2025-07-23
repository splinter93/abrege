import { useState, useEffect, useCallback } from 'react';
import { Folder, FileArticle } from './types';
import {
  getFolders,
  getArticles,
  createFolder as apiCreateFolder,
  createArticle as apiCreateFile,
  deleteFolder as apiDeleteFolder,
  deleteArticle as apiDeleteFile,
  renameItem as apiRenameItem,
  updateItemPositions,
  moveItemUniversal
} from '../services/supabase';
import { supabase } from '../supabaseClient';
import {
  createNoteREST,
  createFolderREST,
  renameItemREST,
  deleteNoteREST,
  deleteFolderREST,
  moveNoteREST,
  moveFolderREST
} from '../services/api';

import { useRealtime } from '@/hooks/useRealtime';

// Types pour le renommage
export type RenamingType = 'folder' | 'file' | null;

interface UseFolderManagerState {
  folders: Folder[];
  files: FileArticle[];
  currentFolderId: string | null;
  currentFolder: Folder | null;
  loading: boolean;
  error: string | null;

  // Renommage
  renamingItemId: string | null;
  renamingType: RenamingType;
  startRename: (id: string, type: 'folder' | 'file') => void;
  submitRename: (id: string, newName: string, type: 'folder' | 'file') => Promise<void>;
  cancelRename: () => void;

  // DnD
  reorderFolders: (newOrder: Folder[]) => Promise<void>;
  reorderFiles: (newOrder: FileArticle[]) => Promise<void>;

  // Navigation
  goToFolder: (id: string) => void;
  goBack: () => void;

  // Création / suppression
  createFolder: (name: string) => Promise<Folder | undefined>;
  createFile: (name: string) => Promise<FileArticle | undefined>;
  deleteFolder: (id: string) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;

  // Imbrication DnD
  moveItem: (id: string, newParentId: string | null, type: 'folder' | 'file') => Promise<void>;
}

export function useFolderManagerState(classeurId: string, parentFolderId?: string, refreshKey?: number): UseFolderManagerState {
  // --- ÉTAT PRINCIPAL ---
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileArticle[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- RENOMMAGE ---
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [renamingType, setRenamingType] = useState<RenamingType>(null);

  // --- CHARGEMENT INITIAL ---
  useEffect(() => {
    setLoading(true);
    setError(null);
    const fetchData = async () => {
      try {
        const [fetchedFolders, fetchedFiles] = await Promise.all([
          getFolders(classeurId, parentFolderId),
          getArticles(classeurId, parentFolderId)
        ]);
        setFolders(fetchedFolders.sort((a, b) => (a.position || 0) - (b.position || 0)));
        setFiles(fetchedFiles.sort((a, b) => (a.position || 0) - (b.position || 0)));
        setCurrentFolderId(parentFolderId || null);
        setCurrentFolder(null);
      } catch (err: any) {
        setError('Erreur lors du chargement des dossiers/fichiers.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [classeurId, parentFolderId, refreshKey]);

  // --- SYNCHRO TEMPS RÉEL (Polling Intelligent) ---
  const { subscribe, unsubscribe } = useRealtime({
    userId: "3223651c-5580-4471-affb-b3f4456bd729", // [TEMP] USER_ID HARDCODED
    type: 'polling',
    interval: 3000
  });

  useEffect(() => {
    if (!classeurId) return;

    const handleArticleChange = (event: any) => {
      // Vérifie que la note concerne le bon classeur/dossier
      if (
        event.table === 'articles' &&
        event.new?.classeur_id === classeurId &&
        ((parentFolderId && event.new.folder_id === parentFolderId) || (!parentFolderId && !event.new.folder_id))
      ) {
        setFiles((files) => {
          // Évite les doublons si la note existe déjà
          if (files.some(f => f.id === event.new.id)) return files;
          const newFile: FileArticle = {
            id: event.new.id,
            source_title: event.new.source_title,
            source_type: event.new.source_type,
            updated_at: event.new.updated_at,
          };
          return [...files, newFile];
        });
      }
    };

    const handleFolderChange = (event: any) => {
      if (event.table === 'folders' && event.new?.classeur_id === classeurId) {
        // Rafraîchir la liste des dossiers à chaque changement
        getFolders(classeurId, parentFolderId).then(setFolders);
      }
    };

    // S'abonner aux changements
    subscribe('articles', handleArticleChange);
    subscribe('folders', handleFolderChange);

    return () => {
      unsubscribe('articles', handleArticleChange);
      unsubscribe('folders', handleFolderChange);
    };
  }, [classeurId, parentFolderId, refreshKey, subscribe, unsubscribe]);

  // --- NAVIGATION ---
  const goToFolder = useCallback((id: string) => {
    setCurrentFolderId(id);
    const folder = folders.find(f => f.id === id) || null;
    setCurrentFolder(folder);
  }, [folders]);

  const goBack = useCallback(() => {
    setCurrentFolderId(null);
    setCurrentFolder(null);
  }, []);

  // --- RENOMMAGE ---
  const startRename = useCallback((id: string, type: 'folder' | 'file') => {
    setRenamingItemId(id);
    setRenamingType(type);
  }, []);

  // --- CRÉATION / SUPPRESSION ---
  const createFolder = useCallback(async (name: string): Promise<Folder | undefined> => {
    try {
      const newFolder = await createFolderREST({
        name,
        notebook_id: classeurId,
        parent_id: currentFolderId,
      });
      setFolders(folders => [...folders, newFolder]);
      return newFolder;
    } catch (err) {
      setError('Erreur lors de la création du dossier.');
      return undefined;
    }
  }, [classeurId, currentFolderId, folders.length]);

  const DEFAULT_HEADER_IMAGE = 'https://images.unsplash.com/photo-1443890484047-5eaa67d1d630?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

  const createFile = useCallback(async (name: string): Promise<FileArticle | undefined> => {
    try {
      const payload: any = {
        source_title: name,
        notebook_id: classeurId,
        markdown_content: '# ' + name,
        header_image: DEFAULT_HEADER_IMAGE,
      };
      if (currentFolderId) {
        payload.folder_id = currentFolderId;
      }
      console.log('Payload createNoteREST', payload);
      const newFile = await createNoteREST(payload);
      setFiles(files => [...files, newFile]);
      return newFile;
    } catch (err) {
      setError('Erreur lors de la création du fichier.');
      return undefined;
    }
  }, [classeurId, currentFolderId, files.length]);

  const deleteFolder = useCallback(async (id: string) => {
    try {
      await deleteFolderREST(id);
      setFolders(folders => folders.filter(f => f.id !== id));
      if (currentFolderId === id) {
        setCurrentFolderId(null);
        setCurrentFolder(null);
      }
    } catch (err) {
      setError('Erreur lors de la suppression du dossier.');
    }
  }, [currentFolderId]);

  const deleteFile = useCallback(async (id: string) => {
    try {
      await deleteNoteREST(id);
      setFiles(files => files.filter(f => f.id !== id));
    } catch (err) {
      setError('Erreur lors de la suppression du fichier.');
    }
  }, []);

  // --- RENOMMAGE ---
  const submitRename = useCallback(async (id: string, newName: string, type: 'folder' | 'file') => {
    try {
      await renameItemREST(id, type === 'file' ? 'note' : 'folder', newName);
      if (type === 'folder') {
        setFolders(folders => folders.map(f => f.id === id ? { ...f, name: newName } : f));
      } else {
        setFiles(files => files.map(f => f.id === id ? { ...f, source_title: newName } : f));
      }
    } catch (err) {
      setError('Erreur lors du renommage.');
    } finally {
      setRenamingItemId(null);
      setRenamingType(null);
    }
  }, [setFolders, setFiles]);

  const cancelRename = useCallback(() => {
    setRenamingItemId(null);
    setRenamingType(null);
  }, []);

  // --- DnD ---
  const reorderFolders = useCallback(async (newOrder: Folder[]) => {
    setFolders(newOrder);
    try {
      await updateItemPositions(newOrder.map((item, idx) => ({ id: item.id, position: idx, type: 'folder' })));
    } catch (err) {
      setError('Erreur lors du réordonnancement des dossiers.');
    }
  }, []);

  const reorderFiles = useCallback(async (newOrder: FileArticle[]) => {
    setFiles(newOrder);
    try {
      await updateItemPositions(newOrder.map((item, idx) => ({ id: item.id, position: idx, type: 'file' })));
    } catch (err) {
      setError('Erreur lors du réordonnancement des fichiers.');
    }
  }, []);

  // --- IMBRICATION DnD ---
  const moveItem = useCallback(async (id: string, newParentId: string | null, type: 'folder' | 'file') => {
    try {
      if (type === 'folder') {
        await moveFolderREST(id, {
          target_classeur_id: classeurId,
          target_parent_id: newParentId,
        });
      } else {
        await moveNoteREST(id, {
          target_classeur_id: classeurId,
          target_folder_id: newParentId,
        });
      }
      // Rafraîchir les dossiers/fichiers
      const [fetchedFolders, fetchedFiles] = await Promise.all([
        getFolders(classeurId, parentFolderId),
        getArticles(classeurId, parentFolderId)
      ]);
      setFolders(fetchedFolders.sort((a, b) => (a.position || 0) - (b.position || 0)));
      setFiles(fetchedFiles.sort((a, b) => (a.position || 0) - (b.position || 0)));
    } catch (err) {
      setError('Erreur lors du déplacement de l\'élément.');
    }
  }, [classeurId, parentFolderId]);

  // --- EXPORT ---
  return {
    folders,
    files,
    currentFolderId,
    currentFolder,
    loading,
    error,
    renamingItemId,
    renamingType,
    startRename,
    submitRename,
    cancelRename,
    reorderFolders,
    reorderFiles,
    goToFolder,
    goBack,
    createFolder,
    createFile,
    deleteFolder,
    deleteFile,
    moveItem,
  };
} 