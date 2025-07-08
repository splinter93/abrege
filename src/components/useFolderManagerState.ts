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
  submitRename: (id: string, newName: string) => Promise<void>;
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
  moveItem: (id: string, newParentId: string, type: 'folder' | 'file') => Promise<void>;
}

export function useFolderManagerState(classeurId: string, parentFolderId?: string): UseFolderManagerState {
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
  }, [classeurId, parentFolderId]);

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

  const submitRename = useCallback(async (id: string, newName: string) => {
    if (!renamingType) return;
    try {
      await apiRenameItem(id, renamingType, newName);
      if (renamingType === 'folder') {
        setFolders(folders => folders.map(f => f.id === id ? { ...f, name: newName } : f));
      } else {
        setFiles(files => files.map(f => f.id === id ? { ...f, source_title: newName } : f));
      }
      setRenamingItemId(null);
      setRenamingType(null);
    } catch (err) {
      setError('Erreur lors du renommage.');
    }
  }, [renamingType]);

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

  // --- CRÉATION / SUPPRESSION ---
  const createFolder = useCallback(async (name: string): Promise<Folder | undefined> => {
    try {
      const newFolder = await apiCreateFolder({
        name,
        classeurId,
        parentId: currentFolderId,
        position: folders.length,
        type: 'folder',
      });
      setFolders(folders => [...folders, newFolder]);
      return newFolder;
    } catch (err) {
      setError('Erreur lors de la création du dossier.');
      return undefined;
    }
  }, [classeurId, currentFolderId, folders.length]);

  const createFile = useCallback(async (name: string): Promise<FileArticle | undefined> => {
    try {
      const newFile = await apiCreateFile({
        source_title: name,
        classeur_id: classeurId,
        folder_id: currentFolderId,
        position: files.length,
        source_type: 'markdown',
      });
      setFiles(files => [...files, newFile]);
      return newFile;
    } catch (err) {
      setError('Erreur lors de la création du fichier.');
      return undefined;
    }
  }, [classeurId, currentFolderId, files.length]);

  const deleteFolder = useCallback(async (id: string) => {
    try {
      await apiDeleteFolder(id);
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
      await apiDeleteFile(id);
      setFiles(files => files.filter(f => f.id !== id));
    } catch (err) {
      setError('Erreur lors de la suppression du fichier.');
    }
  }, []);

  // --- IMBRICATION DnD ---
  const moveItem = useCallback(async (id: string, newParentId: string, type: 'folder' | 'file') => {
    console.log('[DND] useFolderManagerState moveItem', { id, newParentId, type });
    try {
      await moveItemUniversal(id, newParentId, type);
      if (type === 'folder') {
        setFolders(currentFolders => currentFolders.filter(f => f.id !== id));
      } else {
        setFiles(currentFiles => currentFiles.filter(f => f.id !== id));
      }
    } catch (err) {
      console.error("Erreur lors du déplacement de l'élément:", err);
      setError('Erreur lors du déplacement de l\'élément.');
    }
  }, []);

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