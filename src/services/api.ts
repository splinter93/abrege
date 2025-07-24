// src/services/api.js

// Ce fichier sert de passerelle entre l'UI et les services Supabase.
// Il permet de centraliser la logique et de ne pas appeler Supabase directement depuis les composants.

import {
  getClasseurs as sbGetClasseurs,
  createClasseur as sbCreateClasseur,
  getFolders as sbGetFolders,
  createFolder as sbCreateFolder,
  updateFolder as sbUpdateFolder,
  deleteFolder as sbDeleteFolder,
  getArticles as sbGetArticles,
  createArticle as sbCreateArticle,
  updateArticle as sbUpdateArticle,
  deleteArticle as sbDeleteArticle,
  getFolderById as sbGetFolderById,
  updateItemPositions as sbUpdateItemPositions,
  renameItem as sbRenameItem,
  moveItem as sbMoveItem,
  updateClasseur as sbUpdateClasseur,
  deleteClasseur as sbDeleteClasseur,
  updateClasseurPositions as sbUpdateClasseurPositions
} from './supabase';

// --- Fonctions exportées pour l'application ---

// Classeurs
export const getClasseurs = (): Promise<any[]> => sbGetClasseurs();
export const createClasseur = (data: any): Promise<any> => sbCreateClasseur(data);
export const updateClasseur = (id: string, updates: any): Promise<any> => sbUpdateClasseur(id, updates);
export const deleteClasseur = (id: string): Promise<any> => sbDeleteClasseur(id);
export const updateClasseurPositions = (classeurs: any[]): Promise<any> => sbUpdateClasseurPositions(classeurs);

// Folders
export const getFolders = (classeurId: string): Promise<any[]> => sbGetFolders(classeurId);
export const createFolder = (data: any): Promise<any> => sbCreateFolder(data);
export const updateFolder = (id: string, updates: any): Promise<any> => sbUpdateFolder(id, updates);
export const deleteFolder = (id: string): Promise<any> => sbDeleteFolder(id);
export const getFolderById = (id: string): Promise<any> => sbGetFolderById(id);
export const moveFolder = (folderId: string, targetFolderId: string): Promise<any> => sbMoveItem(folderId, targetFolderId);

// Articles
export const getArticles = (folderId: string): Promise<any[]> => sbGetArticles(folderId);
export const createArticle = (data: any): Promise<any> => sbCreateArticle(data);
export const updateArticle = (id: string, updates: any): Promise<any> => sbUpdateArticle(id, updates);
export const deleteArticle = (id: string): Promise<any> => sbDeleteArticle(id);
export const moveArticle = (articleId: string, targetFolderId: string): Promise<any> => sbMoveItem(articleId, targetFolderId);

// Divers
export const updateItemPositions = (items: any[]): Promise<any> => sbUpdateItemPositions(items);
export const renameItem = (id: string, type: 'folder' | 'file', newName: string): Promise<any> => sbRenameItem(id, type, newName);
export const moveItem = (id: string, newParentId: string): Promise<any> => sbMoveItem(id, newParentId);

// --- NOUVELLES FONCTIONS REST LLM-FRIENDLY ---

// Création de note via l'API REST
const createNoteREST = async (payload: Record<string, any>) => {
  const res = await fetch('/api/v1/note/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur création note: ' + (await res.text()));
  const data = await res.json();
  return data.note;
};

// Création de dossier via l'API REST
const createFolderREST = async (payload: Record<string, any>) => {
  const res = await fetch('/api/v1/folder/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur création dossier: ' + (await res.text()));
  const data = await res.json();
  return data.folder;
};

// Création de classeur via l'API REST
const createNotebookREST = async (payload: Record<string, any>) => {
  const res = await fetch('/api/v1/notebook/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur création classeur: ' + (await res.text()));
  const data = await res.json();
  return data.notebook;
};

// Mise à jour de note via l'API REST
const updateNoteREST = async (ref: string, payload: Record<string, any>) => {
  console.log('[updateNoteREST] Payload envoyé:', payload); // DEBUG
  const res = await fetch(`/api/v1/note/${ref}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorText = await res.text();
    console.error('[updateNoteREST] Erreur API:', errorText); // DEBUG
    throw new Error('Erreur update note: ' + errorText);
  }
  const data = await res.json();
  return data.note;
};

// Mise à jour de dossier via l'API REST
const updateFolderREST = async (ref: string, payload: Record<string, any>) => {
  const res = await fetch(`/api/v1/folder/${ref}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur update dossier: ' + (await res.text()));
  const data = await res.json();
  return data.folder;
};

// Mise à jour de classeur via l'API REST
const updateNotebookREST = async (ref: string, payload: Record<string, any>) => {
  const res = await fetch(`/api/v1/notebook/${ref}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur update classeur: ' + (await res.text()));
  const data = await res.json();
  return data.notebook;
};

// Renommage universel via l'API REST (note, folder, classeur)
const renameItemREST = async (ref: string, type: 'note' | 'folder' | 'classeur', newName: string) => {
  let endpoint = '';
  let payload: Record<string, any> = {};
  switch (type) {
    case 'note':
      endpoint = `/api/v1/note/${ref}`;
      payload = { source_title: newName };
      break;
    case 'folder':
      endpoint = `/api/v1/folder/${ref}`;
      payload = { name: newName };
      break;
    case 'classeur':
      endpoint = `/api/v1/notebook/${ref}`;
      payload = { name: newName };
      break;
    default:
      throw new Error('Type non supporté pour renameItemREST');
  }
  const res = await fetch(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur renommage: ' + (await res.text()));
  const data = await res.json();
  if (type === 'note') return data.note;
  if (type === 'folder') return data.folder;
  if (type === 'classeur') return data.notebook;
};

// Déplacement de note via l'API REST
const moveNoteREST = async (ref: string, payload: Record<string, any>) => {
  const res = await fetch(`/api/v1/note/${ref}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur move note: ' + (await res.text()));
  const data = await res.json();
  return data.note;
};

// Déplacement de dossier via l'API REST
const moveFolderREST = async (ref: string, payload: Record<string, any>) => {
  const res = await fetch(`/api/v1/dossier/${ref}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Erreur move dossier: ' + (await res.text()));
  const data = await res.json();
  return data.folder;
};

// Suppression de note via l'API REST
const deleteNoteREST = async (ref: string) => {
  const res = await fetch(`/api/v1/note/${ref}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Erreur suppression note: ' + (await res.text()));
  const data = await res.json();
  return data.success;
};

// Suppression de dossier via l'API REST
const deleteFolderREST = async (ref: string) => {
  const res = await fetch(`/api/v1/folder/${ref}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Erreur suppression dossier: ' + (await res.text()));
  const data = await res.json();
  return data.success;
};

// Suppression de classeur via l'API REST
const deleteNotebookREST = async (ref: string) => {
  const res = await fetch(`/api/v1/notebook/${ref}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Erreur suppression classeur: ' + (await res.text()));
  const data = await res.json();
  return data.success;
};

// Publication/dépublication d'une note via l'API REST
const publishNoteREST = async (ref: string, isPublished: boolean) => {
  const res = await fetch('/api/v1/note/publish', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref, isPublished }),
  });
  if (!res.ok) throw new Error('Erreur publication note: ' + (await res.text()));
  return await res.json();
};

export {
  createNoteREST,
  createFolderREST,
  createNotebookREST,
  updateNoteREST,
  updateFolderREST,
  updateNotebookREST,
  renameItemREST,
  moveNoteREST,
  moveFolderREST,
  deleteNoteREST,
  deleteFolderREST,
  deleteNotebookREST,
  publishNoteREST
};

const api = {
  getClasseurs,
  createClasseur,
  updateClasseur,
  deleteClasseur,
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  getFolderById,
  moveFolder,
  getArticles,
  createArticle,
  updateArticle,
  deleteArticle,
  moveArticle,
  updateItemPositions,
  renameItem,
  moveItem,
  updateClasseurPositions
};

export default api;
