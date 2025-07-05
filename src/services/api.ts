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
export const renameItem = (id: string, newName: string): Promise<any> => sbRenameItem(id, newName);
export const moveItem = (id: string, newParentId: string): Promise<any> => sbMoveItem(id, newParentId);

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
