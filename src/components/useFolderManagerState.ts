"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Folder, FileArticle } from './types';
import {
  updateItemPositions
} from '../services/supabase';
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
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState } from '@/store/useFileSystemStore';
import { generateUniqueNoteName } from '@/utils/generateUniqueName';
const selectFolders = (s: FileSystemState) => s.folders;
const selectNotes = (s: FileSystemState) => s.notes;

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

// Adaptateur pour convertir les Folder Zustand en Folder UI
function toUIFolder(f: any): Folder {
  return {
    id: f.id,
    name: f.name,
    parent_id: f.parent_id === null ? undefined : f.parent_id,
    classeur_id: f.classeur_id, // Ajouté pour le filtrage correct
  };
}
// Adaptateur pour convertir les notes Zustand en FileArticle UI
function toUIFile(n: any): FileArticle {
  return {
    id: n.id,
    source_title: n.source_title || n.title || '',
    source_type: n.source_type,
    updated_at: n.updated_at,
    classeur_id: n.classeur_id, // Ajouté pour le filtrage correct
    folder_id: n.folder_id,     // Ajouté pour la navigation
  };
}

export function useFolderManagerState(classeurId: string, parentFolderId?: string, refreshKey?: number): UseFolderManagerState {
  // --- ÉTAT PRINCIPAL ---
  const rawFoldersObj = useFileSystemStore(selectFolders);
  const rawNotesObj = useFileSystemStore(selectNotes);
  const rawFolders = useMemo(() => Object.values(rawFoldersObj), [rawFoldersObj]);
  const rawNotes = useMemo(() => Object.values(rawNotesObj), [rawNotesObj]);

  // Correction : filtrage par classeurId et parentFolderId
  const folders: Folder[] = useMemo(
    () => rawFolders
      .filter(f => f.classeur_id === classeurId && (f.parent_id === parentFolderId || (!f.parent_id && !parentFolderId)))
      .map(toUIFolder),
    [rawFolders, classeurId, parentFolderId]
  );
  const files: FileArticle[] = useMemo(
    () => rawNotes
      .filter(n => n.classeur_id === classeurId && (n.folder_id === parentFolderId || (!n.folder_id && !parentFolderId)))
      .map(toUIFile),
    [rawNotes, classeurId, parentFolderId]
  );
  // Supprimé : la navigation est contrôlée par le parent (FolderManager)
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- RENOMMAGE ---
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [renamingType, setRenamingType] = useState<RenamingType>(null);

  // --- CHARGEMENT INITIAL ---
  useEffect(() => {
    console.log('[EFFECT] useEffect triggered in useFolderManagerState (loading)', { classeurId, refreshKey });
    setLoading(false); // On considère que le chargement Zustand est instantané
    setError(null);
  }, [classeurId, refreshKey]); // parentFolderId retiré pour éviter toute boucle

  // --- SYNCHRO TEMPS RÉEL (Supabase Realtime) ---
  // Le RealtimeProvider gère déjà les souscriptions, pas besoin d'appeler useSupabaseRealtime ici
  // const { isConnected } = useSupabaseRealtime();

  useEffect(() => {
    console.log('[EFFECT] useEffect triggered in useFolderManagerState (realtime status)', { 
      classeurId, 
      parentFolderId, 
      refreshKey
      // isConnected retiré car géré par RealtimeProvider
    });
  }, [classeurId, parentFolderId, refreshKey]);

  // --- NAVIGATION ---
  // Navigation contrôlée par le parent, plus de setCurrentFolderId ici
  const goToFolder = () => {};
  const goBack = () => {};

  // --- RENOMMAGE ---
  const startRename = useCallback((id: string, type: 'folder' | 'file') => {
    setRenamingItemId(id);
    setRenamingType(type);
  }, []);

  // --- CRÉATION / SUPPRESSION ---
  const createFolder = useCallback(async (name: string): Promise<Folder | undefined> => {
    try {
      console.log('[UI] 📁 Création dossier, en attente du patch realtime...', { name, classeurId, parentFolderId });
      const newFolder = await createFolderREST({
        name,
        notebook_id: classeurId,
        parent_id: parentFolderId,
      });
      console.log('[UI] ✅ Dossier créé via API, patch realtime attendu...', newFolder);
      return newFolder;
    } catch (err) {
      console.error('[UI] ❌ Erreur création dossier:', err);
      setError('Erreur lors de la création du dossier.');
      return undefined;
    }
  }, [classeurId, parentFolderId]);

  const DEFAULT_HEADER_IMAGE = 'https://images.unsplash.com/photo-1443890484047-5eaa67d1d630?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

  const createFile = useCallback(async (name: string): Promise<FileArticle | undefined> => {
    try {
      // Générer un nom unique pour la note
      const uniqueName = generateUniqueNoteName(files);
      
      console.log('[UI] 📝 Création note, en attente du patch realtime...', { name: uniqueName, classeurId, parentFolderId });
      const payload: any = {
        source_title: uniqueName,
        notebook_id: classeurId,
        markdown_content: '', // Contenu vide par défaut
        header_image: DEFAULT_HEADER_IMAGE,
      };
      if (parentFolderId) {
        payload.folder_id = parentFolderId;
      }
      console.log('Payload createNoteREST', payload);
      const newFile = await createNoteREST(payload);
      console.log('[UI] ✅ Note créée via API, patch realtime attendu...', newFile);
      return newFile;
    } catch (err) {
      console.error('[UI] ❌ Erreur création note:', err);
      setError('Erreur lors de la création du fichier.');
      return undefined;
    }
  }, [classeurId, parentFolderId, files]);

  const deleteFolder = useCallback(async (id: string) => {
    try {
      console.log('[UI] 🗑️ Suppression dossier, en attente du patch realtime...', { id });
      await deleteFolderREST(id);
      console.log('[UI] ✅ Dossier supprimé via API, patch realtime attendu...');
      if (parentFolderId === id) {
        // setCurrentFolderId(null); // Supprimé
        // setCurrentFolder(null); // Supprimé
      }
    } catch (err) {
      console.error('[UI] ❌ Erreur suppression dossier:', err);
      setError('Erreur lors de la suppression du dossier.');
    }
  }, [parentFolderId]);

  const deleteFile = useCallback(async (id: string) => {
    try {
      console.log('[UI] 🗑️ Suppression note, en attente du patch realtime...', { id });
      await deleteNoteREST(id);
      console.log('[UI] ✅ Note supprimée via API, patch realtime attendu...');
    } catch (err) {
      console.error('[UI] ❌ Erreur suppression note:', err);
      setError('Erreur lors de la suppression du fichier.');
    }
  }, []);

  // --- RENOMMAGE ---
  const submitRename = useCallback(async (id: string, newName: string, type: 'folder' | 'file') => {
    try {
      console.log('[UI] ✏️ Renommage item, en attente du patch realtime...', { id, newName, type });
      await renameItemREST(id, type === 'file' ? 'note' : 'folder', newName);
      console.log('[UI] ✅ Item renommé via API, patch realtime attendu...');
    } catch (err) {
      console.error('[UI] ❌ Erreur renommage:', err);
      setError('Erreur lors du renommage.');
    } finally {
      setRenamingItemId(null);
      setRenamingType(null);
    }
  }, []);

  const cancelRename = useCallback(() => {
    setRenamingItemId(null);
    setRenamingType(null);
  }, []);

  // --- DnD ---
  const reorderFolders = useCallback(async (newOrder: Folder[]) => {
    // setFolders(newOrder); // Supprimé
    try {
      console.log('[UI] 🔄 Réordonnancement dossiers, en attente du patch realtime...', newOrder.length);
      await updateItemPositions(newOrder.map((item, idx) => ({ id: item.id, position: idx, type: 'folder' })));
      console.log('[UI] ✅ Dossiers réordonnés via API, patch realtime attendu...');
    } catch (err) {
      console.error('[UI] ❌ Erreur réordonnancement dossiers:', err);
      setError('Erreur lors du réordonnancement des dossiers.');
    }
  }, []);

  const reorderFiles = useCallback(async (newOrder: FileArticle[]) => {
    // setFiles(newOrder); // Supprimé
    try {
      console.log('[UI] 🔄 Réordonnancement notes, en attente du patch realtime...', newOrder.length);
      await updateItemPositions(newOrder.map((item, idx) => ({ id: item.id, position: idx, type: 'file' })));
      console.log('[UI] ✅ Notes réordonnées via API, patch realtime attendu...');
    } catch (err) {
      console.error('[UI] ❌ Erreur réordonnancement notes:', err);
      setError('Erreur lors du réordonnancement des fichiers.');
    }
  }, []);

  // --- IMBRICATION DnD ---
  const moveItem = useCallback(async (id: string, newParentId: string | null, type: 'folder' | 'file') => {
    try {
      console.log('[UI] 📦 Déplacement item, en attente du patch realtime...', { id, newParentId, type });
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
      console.log('[UI] ✅ Item déplacé via API, patch realtime attendu...');
      // Rafraîchir les dossiers/fichiers
      // const [fetchedFolders, fetchedFiles] = await Promise.all([ // Supprimé
      //   getFolders(classeurId, parentFolderId),
      //   getArticles(classeurId, parentFolderId)
      // ]);
      // setFolders(fetchedFolders.sort((a, b) => (a.position || 0) - (b.position || 0))); // Supprimé
      // setFiles(fetchedFiles.sort((a, b) => (a.position || 0) - (b.position || 0))); // Supprimé
    } catch (err) {
      console.error('[UI] ❌ Erreur déplacement item:', err);
      setError('Erreur lors du déplacement de l\'élément.');
    }
  }, [classeurId, parentFolderId]);

  // --- EXPORT ---
  return {
    folders,
    files,
    currentFolderId: parentFolderId ?? null, // Expose parentFolderId comme currentFolderId, typé string | null
    currentFolder: null, // currentFolder n'est plus géré ici
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