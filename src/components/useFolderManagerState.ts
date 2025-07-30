"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Folder, FileArticle } from './types';
import {
  updateItemPositions
} from '../services/supabase';
import { optimizedApi } from '@/services/optimizedApi';
import { clientPollingTrigger } from '@/services/clientPollingTrigger';

import { useRealtime } from '@/hooks/useRealtime';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState, Note } from '@/store/useFileSystemStore';
import { generateUniqueNoteName } from '@/utils/generateUniqueName';

const selectFoldersData = (s: FileSystemState) => s.folders;
const selectNotesData = (s: FileSystemState) => s.notes;
const selectClasseursData = (s: FileSystemState) => s.classeurs;
const selectActiveClasseurId = (s: FileSystemState) => s.activeClasseurId;

// Types pour le renommage
export type RenamingType = 'folder' | 'file' | null;

// Types pour les données Zustand
interface ZustandFolder {
  id: string;
  name: string;
  parent_id?: string | null;
  classeur_id?: string;
  [key: string]: any;
}

interface ZustandNote {
  id: string;
  source_title?: string;
  title?: string;
  source_type?: string;
  updated_at?: string;
  classeur_id?: string;
  folder_id?: string | null;
  [key: string]: any;
}

interface CreateNotePayload {
  source_title: string;
  notebook_id: string;
  markdown_content?: string;
  header_image?: string;
  folder_id?: string | null;
}

interface FolderManagerResult {
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
  createFile: (name: string, parentFolderId: string | null) => Promise<Note | undefined>;
  deleteFolder: (id: string) => Promise<void>;
  deleteFile: (id: string) => Promise<void>;

  // Imbrication DnD
  moveItem: (id: string, newParentId: string | null, type: 'folder' | 'file') => Promise<void>;
}

// Adaptateur pour convertir les Folder Zustand en Folder UI
function toUIFolder(f: ZustandFolder): Folder {
  return {
    id: f.id,
    name: f.name,
    parent_id: f.parent_id === null ? undefined : f.parent_id,
    classeur_id: f.classeur_id, // Ajouté pour le filtrage correct
  };
}

// Adaptateur pour convertir les notes Zustand en FileArticle UI
function toUIFile(n: ZustandNote): FileArticle {
  return {
    id: n.id,
    source_title: n.source_title || n.title || '',
    source_type: n.source_type,
    updated_at: n.updated_at,
    classeur_id: n.classeur_id, // Ajouté pour le filtrage correct
    folder_id: n.folder_id,     // Ajouté pour la navigation
  };
}

export function useFolderManagerState(classeurId: string, parentFolderId?: string, refreshKey?: number): FolderManagerResult {
  // --- ÉTAT PRINCIPAL ---
  const foldersMap = useFileSystemStore(selectFoldersData);
  const folders = useMemo(() => Object.values(foldersMap), [foldersMap]);
  const notesMap = useFileSystemStore(selectNotesData);
  const notes = useMemo(() => Object.values(notesMap), [notesMap]);
  const classeurs = useFileSystemStore(selectClasseursData);
  const activeClasseurId = useFileSystemStore(selectActiveClasseurId);

  // Correction : filtrage par classeurId et parentFolderId
  const filteredFolders: Folder[] = useMemo(
    () => folders
      .filter((f: ZustandFolder) => f.classeur_id === classeurId && (f.parent_id === parentFolderId || (!f.parent_id && !parentFolderId)))
      .map(toUIFolder),
    [folders, classeurId, parentFolderId]
  );
  const filteredFiles: FileArticle[] = useMemo(
    () => notes
      .filter((n: ZustandNote) => n.classeur_id === classeurId && (n.folder_id === parentFolderId || (!n.folder_id && !parentFolderId)))
      .map(toUIFile),
    [notes, classeurId, parentFolderId]
  );
  // Supprimé : la navigation est contrôlée par le parent (FolderManager)
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // --- RENOMMAGE ---
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [renamingType, setRenamingType] = useState<RenamingType>(null);

  // --- CHARGEMENT INITIAL ---
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[EFFECT] useEffect triggered in useFolderManagerState (loading)', { classeurId, refreshKey });
    }
    setLoading(false); // On considère que le chargement Zustand est instantané
    setError(null);
  }, [classeurId, refreshKey]); // parentFolderId retiré pour éviter toute boucle

  // --- SYNCHRO TEMPS RÉEL (Supabase Realtime) ---
  // Le RealtimeProvider gère déjà les souscriptions, pas besoin d'appeler useSupabaseRealtime ici
  // const { isConnected } = useSupabaseRealtime();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[EFFECT] useEffect triggered in useFolderManagerState (realtime status)', { 
        classeurId, 
        parentFolderId, 
        refreshKey
        // isConnected retiré car géré par RealtimeProvider
      });
    }
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
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] 📁 Création dossier avec API optimisée...', { name, classeurId, parentFolderId });
      }
      const result = await optimizedApi.createFolder({
        name,
        notebook_id: classeurId,
        parent_id: parentFolderId,
      });
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] ✅ Dossier créé avec API optimisée:', result.folder.name);
      }
      return toUIFolder(result.folder);
    } catch (err) {
      console.error('[UI] ❌ Erreur création dossier:', err);
      setError('Erreur lors de la création du dossier.');
      return undefined;
    }
  }, [classeurId, parentFolderId]);

  const DEFAULT_HEADER_IMAGE = 'https://images.unsplash.com/photo-1443890484047-5eaa67d1d630?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

  const createFile = useCallback(async (name: string, parentFolderId: string | null): Promise<Note | undefined> => {
    try {
      // Générer un nom unique pour la note
      const uniqueName = generateUniqueNoteName(filteredFiles);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] 📝 Création note, en attente du patch realtime...', { name: uniqueName, classeurId, parentFolderId });
      }
      const payload: CreateNotePayload = {
        source_title: uniqueName,
        notebook_id: classeurId,
        markdown_content: '', // Contenu vide par défaut
        header_image: DEFAULT_HEADER_IMAGE,
      };
      if (parentFolderId) {
        payload.folder_id = parentFolderId;
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('Payload createNote optimisée', payload);
      }
      const result = await optimizedApi.createNote(payload);
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] ✅ Note créée avec API optimisée:', result.note.source_title);
      }
      return result.note;
    } catch (err) {
      console.error('[UI] ❌ Erreur création note:', err);
      setError('Erreur lors de la création du fichier.');
      return undefined;
    }
  }, [classeurId, parentFolderId, filteredFiles]);

  const deleteFolder = useCallback(async (id: string) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] 🗑️ Suppression dossier avec API optimisée...', { id });
      }
      await optimizedApi.deleteFolder(id);
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] ✅ Dossier supprimé avec API optimisée');
      }
      if (parentFolderId === id) {
        // setCurrentFolderId(null); // Supprimé
        // setCurrentFolder(null); // Supprimé
      }
    } catch (err) {
      console.error('[UI] ❌ Erreur suppression dossier:', err);
      setError('Erreur lors de la suppression du dossier.');
    }
  }, [parentFolderId]);

  const updateFile = useCallback(async (id: string, name: string): Promise<void> => {
    const originalNote = notes.find(n => n.id === id);
    if (!originalNote) return;

    useFileSystemStore.getState().updateNoteOptimistic(id, { source_title: name });

    try {
      await optimizedApi.updateNote(id, { source_title: name });
    } catch (error) {
      console.error('Erreur renommage note:', error);
      useFileSystemStore.getState().updateNote(id, { source_title: originalNote.source_title });
    }
  }, [notes]);

  const updateFolder = useCallback(async (id: string, name: string): Promise<void> => {
    const originalFolder = folders.find(f => f.id === id);
    if (!originalFolder) return;

    useFileSystemStore.getState().updateFolder(id, { name });

    try {
      await optimizedApi.updateFolder(id, { name });
    } catch (error) {
      console.error('Erreur renommage dossier:', error);
      useFileSystemStore.getState().updateFolder(id, { name: originalFolder.name });
    }
  }, [folders]);

  const deleteFile = useCallback(async (id: string): Promise<void> => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] 🗑️ Suppression note avec API optimisée...', { id });
      }
      await optimizedApi.deleteNote(id);
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] ✅ Note supprimée avec API optimisée');
      }
    } catch (err) {
      console.error('[UI] ❌ Erreur suppression note:', err);
      setError('Erreur lors de la suppression du fichier.');
    }
  }, []);

  // --- RENOMMAGE ---
  const submitRename = useCallback(async (id: string, newName: string, type: 'folder' | 'file') => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] ✏️ Renommage item avec API optimisée...', { id, newName, type });
      }
      if (type === 'file') {
        await optimizedApi.updateNote(id, { source_title: newName });
      } else {
        await optimizedApi.updateFolder(id, { name: newName });
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] ✅ Item renommé avec API optimisée');
      }
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
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] 🔄 Réordonnancement dossiers, en attente du patch realtime...', newOrder.length);
      }
      await updateItemPositions(newOrder.map((item, idx) => ({ id: item.id, position: idx, type: 'folder' })));
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] ✅ Dossiers réordonnés via API, patch realtime attendu...');
      }
    } catch (err) {
      console.error('[UI] ❌ Erreur réordonnancement dossiers:', err);
      setError('Erreur lors du réordonnancement des dossiers.');
    }
  }, []);

  const reorderFiles = useCallback(async (newOrder: FileArticle[]) => {
    // setFiles(newOrder); // Supprimé
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] 🔄 Réordonnancement notes, en attente du patch realtime...', newOrder.length);
      }
      await updateItemPositions(newOrder.map((item, idx) => ({ id: item.id, position: idx, type: 'file' })));
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] ✅ Notes réordonnées via API, patch realtime attendu...');
      }
    } catch (err) {
      console.error('[UI] ❌ Erreur réordonnancement notes:', err);
      setError('Erreur lors du réordonnancement des fichiers.');
    }
  }, []);

  // --- IMBRICATION DnD ---
  const moveItem = useCallback(async (id: string, newParentId: string | null, type: 'folder' | 'file') => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] 📦 Déplacement item avec API...', { id, newParentId, type });
      }
      if (type === 'folder') {
        const response = await fetch(`/api/v1/dossier/${id}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_parent_id: newParentId,
            target_classeur_id: activeClasseurId
          })
        });
        if (!response.ok) {
          throw new Error(`Erreur déplacement dossier: ${response.statusText}`);
        }
        const result = await response.json();
        const store = useFileSystemStore.getState();
        store.moveFolder(id, newParentId, activeClasseurId || undefined);
        await clientPollingTrigger.triggerFoldersPolling('UPDATE');
        if (process.env.NODE_ENV === 'development') {
          console.log('[UI] ✅ Dossier déplacé:', result.folder?.name || id);
        }
      } else {
        const response = await fetch(`/api/v1/note/${id}/move`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            target_folder_id: newParentId,
            target_classeur_id: activeClasseurId
          })
        });
        if (!response.ok) {
          throw new Error(`Erreur déplacement note: ${response.statusText}`);
        }
        const result = await response.json();
        const store = useFileSystemStore.getState();
        store.moveNote(id, newParentId, activeClasseurId || undefined);
        await clientPollingTrigger.triggerArticlesPolling('UPDATE');
        if (process.env.NODE_ENV === 'development') {
          console.log('[UI] ✅ Note déplacée:', result.note?.source_title || id);
        }
      }
      if (process.env.NODE_ENV === 'development') {
        console.log('[UI] ✅ Item déplacé avec API + Zustand + polling');
      }
    } catch (err) {
      console.error('[UI] ❌ Erreur déplacement item:', err);
      setError('Erreur lors du déplacement de l\'élément.');
    }
  }, [activeClasseurId]);

  // --- EXPORT ---
  return {
    folders: filteredFolders,
    files: filteredFiles,
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