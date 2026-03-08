"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Folder, FileArticle } from './types';
import { v2UnifiedApi } from '@/services/V2UnifiedApi';

import { simpleLogger as logger } from '@/utils/logger';


import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState, Note } from '@/store/useFileSystemStore';
import { generateUniqueNoteName } from '@/utils/generateUniqueName';


const selectFoldersData = (s: FileSystemState) => s.folders;
const selectNotesData = (s: FileSystemState) => s.notes;
const selectActiveClasseurId = (s: FileSystemState) => s.activeClasseurId;

// Types pour le renommage
export type RenamingType = 'folder' | 'file' | null;

// Types pour les données Zustand
interface ZustandFolder {
  id: string;
  name: string;
  parent_id?: string | null;
  classeur_id?: string;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  position?: number;
  [key: string]: unknown;
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
    parent_id: f.parent_id || null,
    classeur_id: f.classeur_id || '', // Ajouté pour le filtrage correct
    user_id: 'unknown', // Valeur par défaut car pas dans le type Zustand
    created_at: f.created_at || new Date().toISOString(), // Valeur par défaut si manquante
    updated_at: f.updated_at || new Date().toISOString(), // Valeur par défaut si manquante
    position: f.position || 0, // Valeur par défaut si manquante
  };
}

// Adaptateur pour convertir les notes Zustand en FileArticle UI
function toUIFile(n: Note): FileArticle {
  return {
    id: n.id,
    source_title: n.source_title || 'Sans titre',
    classeur_id: n.classeur_id || '',
    folder_id: n.folder_id || null,
    user_id: 'unknown', // Valeur par défaut car pas dans le type Zustand
    created_at: n.created_at || new Date().toISOString(), // Valeur par défaut si manquante
    updated_at: n.updated_at || new Date().toISOString(), // Valeur par défaut si manquante
    position: n.position || 0, // Valeur par défaut si manquante
  };
}

export function useFolderManagerState(classeurId: string, userId: string, parentFolderId?: string, refreshKey?: number): FolderManagerResult {
  // --- ÉTAT PRINCIPAL ---
  const foldersMap = useFileSystemStore(selectFoldersData);
  const folders = useMemo(() => Object.values(foldersMap), [foldersMap]);
  const notesMap = useFileSystemStore(selectNotesData);
  const notes = useMemo(() => Object.values(notesMap), [notesMap]);
  const activeClasseurId = useFileSystemStore(selectActiveClasseurId);

  // Correction : filtrage par classeurId et parentFolderId
  // folders est un array de ZustandFolder (du store)
  const filteredFolders: Folder[] = useMemo(
    () => folders
      .filter((f): f is ZustandFolder => {
        // Type guard pour s'assurer que f est un ZustandFolder avec les propriétés nécessaires
        return f && typeof f === 'object' && 'id' in f && 'classeur_id' in f && 
               f.classeur_id === classeurId && 
               (f.parent_id === parentFolderId || (!f.parent_id && !parentFolderId));
      })
      .map(toUIFolder),
    [folders, classeurId, parentFolderId]
  );
  const filteredFiles: FileArticle[] = useMemo(
    () => notes
      .filter((n: Note) => n.classeur_id === classeurId && (n.folder_id === parentFolderId || (!n.folder_id && !parentFolderId)))
      .map(toUIFile),
    [notes, classeurId, parentFolderId]
  );
  
  // --- CHARGEMENT INITIAL OPTIMISÉ ---
  const [loading, setLoading] = useState<boolean>(false); // Changé à false par défaut
  const [error, setError] = useState<string | null>(null);

  // --- RENOMMAGE ---
  const [renamingItemId, setRenamingItemId] = useState<string | null>(null);
  const [renamingType, setRenamingType] = useState<RenamingType>(null);

  // --- CHARGEMENT INITIAL ---
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[EFFECT] useEffect triggered in useFolderManagerState (loading)', { classeurId, refreshKey });
    }
    
    // Chargement immédiat si les données sont déjà disponibles
    const hasData = folders.length > 0 || notes.length > 0;
    if (hasData) {
      setLoading(false);
    } else {
      setLoading(true);
      // Simuler un chargement rapide pour éviter le blocage
      const timer = setTimeout(() => setLoading(false), 100);
      return () => clearTimeout(timer);
    }
    
    setError(null);
  }, [classeurId, refreshKey, folders.length, notes.length]); // Ajout des dépendances de données

  // --- SYNCHRO TEMPS RÉEL (Supabase Realtime) ---
  // Le RealtimeProvider gère déjà les souscriptions, pas besoin d'appeler useSupabaseRealtime ici
  // const { isConnected } = useSupabaseRealtime();

  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logger.dev('[EFFECT] useEffect triggered in useFolderManagerState (realtime status)', { 
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
        logger.dev('[UI] 📁 Création dossier avec API optimisée...', { name, classeurId, parentFolderId });
      }
      const result = await v2UnifiedApi.createFolder({
        name,
        classeur_id: classeurId,
        parent_id: parentFolderId,
      });
      
      if (!result.success || !result.folder) {
        throw new Error(result.error || 'Erreur lors de la création du dossier');
      }
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] ✅ Dossier créé avec API optimisée:', result.folder.name);
      }
      
      const newFolder = toUIFolder(result.folder);
      
      // 🎯 NOUVEAU: Déclencher automatiquement le renommage inline
      setTimeout(() => {
        startRename(newFolder.id, 'folder');
      }, 100); // Petit délai pour s'assurer que l'élément est rendu
      
      return newFolder;
    } catch (err) {
      logger.error('[UI] ❌ Erreur création dossier', err instanceof Error ? err : new Error(String(err)));
      setError('Erreur lors de la création du dossier.');
      return undefined;
    }
  }, [classeurId, parentFolderId, startRename]);

  const DEFAULT_HEADER_IMAGE = 'https://images.unsplash.com/photo-1443890484047-5eaa67d1d630?q=80&w=2940&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D';

  const createFile = useCallback(async (name: string, parentFolderId: string | null): Promise<Note | undefined> => {
    try {
      // Générer un nom unique pour la note
      const uniqueName = generateUniqueNoteName(filteredFiles);
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] 📝 Création note avec V2UnifiedApi uniquement...', { name: uniqueName, classeurId, parentFolderId });
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

      // ✅ NETTOYAGE COMPLET: Laisser V2UnifiedApi gérer entièrement l'optimisme
      const result = await v2UnifiedApi.createNote(payload);
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] ✅ Note créée avec V2UnifiedApi uniquement:', result.note?.source_title || 'Titre non défini');
      }

      // Vérifier que la note a bien un source_title
      if (!result.note || !result.note.source_title) {
        logger.error('[UI] ❌ Note créée sans source_title', { result });
        setError('Erreur lors de la création du fichier: titre manquant.');
        return undefined;
      }

      // 🎯 NOUVEAU: Déclencher automatiquement le renommage inline
      setTimeout(() => {
        startRename(result.note.id, 'file');
      }, 100); // Petit délai pour s'assurer que l'élément est rendu

      return result.note;
    } catch (err) {
      logger.error('[UI] ❌ Erreur création note', err instanceof Error ? err : new Error(String(err)));
      setError('Erreur lors de la création du fichier.');
      return undefined;
    }
  }, [classeurId, parentFolderId, filteredFiles, userId, startRename]);

  const deleteFolder = useCallback(async (id: string) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] 🗑️ Suppression dossier avec V2UnifiedApi uniquement...', { id, userId });
      }
      
      // Vérifier que l'utilisateur est connecté
      if (!userId || userId.trim() === '') {
        logger.error('[UI] ❌ Utilisateur non connecté', { userId });
        setError('Vous devez être connecté pour supprimer un dossier.');
        return;
      }
      
      // Vérifier que le dossier existe
      const originalFolder = folders.find(f => f.id === id);
      if (!originalFolder) {
        logger.error('[UI] ❌ Dossier non trouvé dans le store local', { id });
        setError('Dossier non trouvé dans l\'interface.');
        return;
      }
      
      // ✅ NETTOYAGE: Laisser V2UnifiedApi gérer entièrement la suppression optimiste
      await v2UnifiedApi.deleteFolder(id);
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] ✅ Dossier supprimé avec V2UnifiedApi uniquement');
      }
      
      // Gestion du dossier actuel si supprimé
      if (parentFolderId === id) {
        // Navigation gérée par le parent
      }
    } catch (err) {
      logger.error('[UI] ❌ Erreur suppression dossier', err instanceof Error ? err : new Error(String(err)));
      setError('Erreur lors de la suppression du dossier.');
    }
  }, [folders, parentFolderId, userId]);

  const updateFile = useCallback(async (id: string, name: string): Promise<void> => {
    const originalNote = notes.find(n => n.id === id);
    if (!originalNote) return;

    // 🔧 CORRECTION: Mise à jour optimiste immédiate
    const store = useFileSystemStore.getState();
    store.updateNote(id, { source_title: name });

    try {
      await v2UnifiedApi.updateNote(id, { source_title: name });
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] ✅ Note renommée avec succès:', { id, newName: name });
      }
    } catch (error) {
      logger.error('[UI] ❌ Erreur renommage note', error instanceof Error ? error : new Error(String(error)));
      
      // 🔧 CORRECTION: Rollback en cas d'erreur
      store.updateNote(id, { source_title: originalNote.source_title });
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] 🔄 Rollback: Nom de note restauré');
      }
      
      setError('Erreur lors du renommage de la note.');
    }
  }, [notes, userId]);

  const updateFolder = useCallback(async (id: string, name: string): Promise<void> => {
    const originalFolder = folders.find(f => f.id === id);
    if (!originalFolder) return;

    // 🔧 CORRECTION: Mise à jour optimiste immédiate
    const store = useFileSystemStore.getState();
    store.updateFolder(id, { name });

    try {
      await v2UnifiedApi.updateFolder(id, { name });
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] ✅ Dossier renommé avec succès:', { id, newName: name });
      }
    } catch (error) {
      logger.error('[UI] ❌ Erreur renommage dossier', error instanceof Error ? error : new Error(String(error)));
      
      // 🔧 CORRECTION: Rollback en cas d'erreur
      store.updateFolder(id, { name: originalFolder.name });
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] 🔄 Rollback: Nom de dossier restauré');
      }
      
      setError('Erreur lors du renommage du dossier.');
    }
  }, [folders, userId]);

  const deleteFile = useCallback(async (id: string): Promise<void> => {
    try {
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] 🗑️ Suppression note avec V2UnifiedApi uniquement...', { id, userId });
      }
      
      // Vérifier que l'utilisateur est connecté
      if (!userId || userId.trim() === '') {
        logger.error('[UI] ❌ Utilisateur non connecté', { userId });
        setError('Vous devez être connecté pour supprimer une note.');
        return;
      }
      
      // Vérifier que la note existe dans le store local
      const note = Object.values(notes).find(n => n.id === id);
      if (!note) {
        logger.error('[UI] ❌ Note non trouvée dans le store local', { id });
        setError('Note non trouvée dans l\'interface.');
        return;
      }
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] 🔍 Note trouvée dans le store:', { id, title: note.source_title });
      }
      
      // ✅ NETTOYAGE: Laisser V2UnifiedApi gérer entièrement la suppression optimiste
      await v2UnifiedApi.deleteNote(id);
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] ✅ Note supprimée avec V2UnifiedApi uniquement');
      }
    } catch (err) {
      logger.error('[UI] ❌ Erreur suppression note', err instanceof Error ? err : new Error(String(err)));
      setError('Erreur lors de la suppression du fichier.');
    }
  }, [notes, userId]);

  // --- RENOMMAGE ---
  const submitRename = useCallback(async (id: string, newName: string, type: 'folder' | 'file') => {
    // Fermeture immédiate du mode renommage pour un retour visuel fluide
    setRenamingItemId(null);
    setRenamingType(null);

    try {
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] ✏️ Renommage item avec API optimisée...', { id, newName, type });
      }
      
      // 🔧 CORRECTION: Mise à jour optimiste immédiate selon le type
      const store = useFileSystemStore.getState();
      
      if (type === 'file') {
        // Récupérer la note originale pour le rollback
        const originalNote = notes.find(n => n.id === id);
        if (!originalNote) {
          logger.error('[UI] ❌ Note non trouvée pour renommage', { id });
          setError('Note non trouvée.');
          return;
        }
        
        // Mise à jour optimiste immédiate
        store.updateNote(id, { source_title: newName });
        
        // Appel API
        await v2UnifiedApi.updateNote(id, { source_title: newName });
        
        if (process.env.NODE_ENV === 'development') {
          logger.dev('[UI] ✅ Note renommée avec succès:', { id, newName });
        }
      } else {
        // Récupérer le dossier original pour le rollback
        const originalFolder = folders.find(f => f.id === id);
        if (!originalFolder) {
          logger.error('[UI] ❌ Dossier non trouvé pour renommage', { id });
          setError('Dossier non trouvé.');
          return;
        }
        
        // Mise à jour optimiste immédiate
        store.updateFolder(id, { name: newName });
        
        // Appel API
        await v2UnifiedApi.updateFolder(id, { name: newName });
        
        if (process.env.NODE_ENV === 'development') {
          logger.dev('[UI] ✅ Dossier renommé avec succès:', { id, newName });
        }
      }
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] ✅ Item renommé avec API optimisée');
      }
    } catch (err) {
      logger.error('[UI] ❌ Erreur renommage', err instanceof Error ? err : new Error(String(err)));
      
      // 🔧 CORRECTION: Rollback en cas d'erreur
      const store = useFileSystemStore.getState();
      
      if (type === 'file') {
        const originalNote = notes.find(n => n.id === id);
        if (originalNote) {
          store.updateNote(id, { source_title: originalNote.source_title });
          if (process.env.NODE_ENV === 'development') {
            logger.dev('[UI] 🔄 Rollback: Nom de note restauré');
          }
        }
      } else {
        const originalFolder = folders.find(f => f.id === id);
        if (originalFolder) {
          store.updateFolder(id, { name: originalFolder.name });
          if (process.env.NODE_ENV === 'development') {
            logger.dev('[UI] 🔄 Rollback: Nom de dossier restauré');
          }
        }
      }
      
      setError('Erreur lors du renommage.');
    }
  }, [notes, folders, userId]);

  const cancelRename = useCallback(() => {
    setRenamingItemId(null);
    setRenamingType(null);
  }, []);

  // --- DnD ---
  const reorderFolders = useCallback(async (newOrder: Folder[]) => {
    // Fonctionnalité de réordonnancement des dossiers
    logger.dev('[UI] 🔄 Réordonnancement dossiers - Fonctionnalité en cours de développement');
  }, []);

  const reorderFiles = useCallback(async (newOrder: FileArticle[]) => {
    // Fonctionnalité de réordonnancement des notes
    logger.dev('[UI] 🔄 Réordonnancement notes - Fonctionnalité en cours de développement');
  }, []);

  // --- IMBRICATION DnD ---
  const moveItem = useCallback(async (id: string, newParentId: string | null, type: 'folder' | 'file') => {
    try {
      // Vérifier si le déplacement est nécessaire
      let shouldMove = false;
      
      if (type === 'folder') {
        const folder = folders.find(f => f.id === id);
        shouldMove = folder ? folder.parent_id !== newParentId : false;
      } else {
        const note = notes.find(n => n.id === id);
        shouldMove = note ? note.folder_id !== newParentId : false;
      }
      
      // Ne déplacer que si nécessaire
      if (!shouldMove) {
        if (process.env.NODE_ENV === 'development') {
          logger.dev('[UI] 📦 Déplacement ignoré : élément déjà à la bonne position', { id, newParentId, type });
        }
        return;
      }
      
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] 📦 Déplacement item avec API...', { id, newParentId, type });
      }
      if (type === 'folder') {
        await v2UnifiedApi.moveFolder(id, newParentId);
      } else {
        // Utiliser l'API unifiée V2 pour le déplacement de note
        const result = await v2UnifiedApi.moveNote(id, newParentId);
        if (process.env.NODE_ENV === 'development') {
          logger.dev('[UI] ✅ Note déplacée avec API unifiée V2:', result.note?.source_title || id);
        }
      }
      if (process.env.NODE_ENV === 'development') {
        logger.dev('[UI] ✅ Item déplacé avec API + Zustand');
      }
    } catch (err) {
      logger.error('[UI] ❌ Erreur déplacement item', err instanceof Error ? err : new Error(String(err)));
      setError('Erreur lors du déplacement de l\'élément.');
    }
  }, [activeClasseurId, folders, notes]);

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