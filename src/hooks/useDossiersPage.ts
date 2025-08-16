"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import { v2UnifiedApi } from "@/services/V2UnifiedApi";
import type { Folder } from "@/components/types";
import type { Classeur } from "@/store/useFileSystemStore";

export function useDossiersPage(userId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Correction: Lire le store directement et mémoiser le résultat
  const classeursStore = useFileSystemStore((state) => state.classeurs);
  const setClasseurs = useFileSystemStore((state) => state.setClasseurs);
  
  // Mémoiser la conversion en array pour éviter les re-renders
  const classeurs = useMemo(() => Object.values(classeursStore), [classeursStore]);

  const [activeClasseurId, setActiveClasseurId] = useState<string | undefined>();
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>();
  const router = useRouter();

  useEffect(() => {
    async function loadInitialData() {
      try {
        setLoading(true);
        await v2UnifiedApi.loadClasseursWithContent(userId);
        // Zustand will update the store, and the component will re-render
      } catch (e) {
        setError("Erreur lors du chargement des données.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, [userId]);
  
    // Auto-select the first classeur when available
   useEffect(() => {
     if (!activeClasseurId && classeurs.length > 0) {
       setActiveClasseurId(classeurs[0].id);
       setCurrentFolderId(undefined);
     }
   }, [classeurs, activeClasseurId]);


  const handleCreateClasseur = useCallback(async () => {
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const resp = await fetch("/api/v2/classeur/create", { method: "POST", headers, body: JSON.stringify({ name: "Nouveau classeur" }) });
      if (!resp.ok) throw new Error(await resp.text());
      await v2UnifiedApi.loadClasseursWithContent(userId);
    } catch (e) {
      console.error(e);
      setError("Impossible de créer le classeur.");
    }
  }, [userId]);
  
  const handleRenameClasseur = useCallback(async (id: string, name: string) => {
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const resp = await fetch(`/api/v2/classeur/${encodeURIComponent(id)}/update`, { method: "PUT", headers, body: JSON.stringify({ name }) });
      if (!resp.ok) throw new Error(await resp.text());
      await v2UnifiedApi.loadClasseursWithContent(userId);
    } catch (e) {
      console.error(e);
      setError("Impossible de renommer le classeur.");
    }
  }, [userId]);

  const handleDeleteClasseur = useCallback(async (id: string) => {
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const resp = await fetch(`/api/v2/classeur/${encodeURIComponent(id)}/delete`, { method: "DELETE", headers });
      if (!resp.ok) throw new Error(await resp.text());
      await v2UnifiedApi.loadClasseursWithContent(userId);
    } catch (e) {
      console.error(e);
      setError("Impossible de supprimer le classeur.");
    }
  }, [userId]);

  const handleUpdateClasseur = useCallback(async (id: string, updates: Partial<Classeur>) => {
    try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        const resp = await fetch(`/api/v2/classeur/${encodeURIComponent(id)}/update`, { method: "PUT", headers, body: JSON.stringify(updates) });
        if (!resp.ok) throw new Error(await resp.text());
        await v2UnifiedApi.loadClasseursWithContent(userId);
    } catch (e) {
        console.error(e);
        setError("Impossible de mettre à jour le classeur.");
    }
  }, [userId]);

  const handleUpdateClasseurPositions = useCallback(async (positions: { id: string, position: number }[]) => {
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      
      // 🔧 CORRECTION: Utiliser l'API V2 au lieu de l'API V1
      const resp = await fetch("/api/v2/classeur/reorder", { 
        method: "PUT", 
        headers, 
        body: JSON.stringify({ classeurs: positions }) // 🔧 Format V2: { classeurs: [...] }
      });
      
      if (!resp.ok) throw new Error(await resp.text());
      await v2UnifiedApi.loadClasseursWithContent(userId);
    } catch (e) {
      console.error(e);
      setError("Impossible de réorganiser les classeurs.");
    }
  }, [userId]);

  // --- NAVIGATION HIÉRARCHIQUE ---
  const [folderPath, setFolderPath] = useState<Folder[]>([]);

  const handleFolderOpen = useCallback((folder: Folder) => {
    // 🔧 CORRECTION: Implémenter un vrai nesting avec breadcrumb
    setCurrentFolderId(folder.id);
    
    // Ajouter le dossier au chemin de navigation
    setFolderPath(prevPath => {
      // Vérifier si le dossier est déjà dans le chemin (éviter les doublons)
      const existingIndex = prevPath.findIndex(f => f.id === folder.id);
      if (existingIndex !== -1) {
        // Si le dossier existe déjà, tronquer le chemin à partir de ce point
        return prevPath.slice(0, existingIndex + 1);
      } else {
        // Ajouter le nouveau dossier au chemin
        return [...prevPath, folder];
      }
    });
  }, []);

  const handleGoBack = useCallback(() => {
    // 🔧 CORRECTION: Navigation intelligente dans la hiérarchie
    if (folderPath.length > 0) {
      // Retirer le dernier dossier du chemin
      const newPath = folderPath.slice(0, -1);
      setFolderPath(newPath);
      
      if (newPath.length > 0) {
        // Aller au dossier parent
        const parentFolder = newPath[newPath.length - 1];
        setCurrentFolderId(parentFolder.id);
      } else {
        // Retour à la racine du classeur
        setCurrentFolderId(undefined);
      }
    } else {
      // Retour à la racine du classeur
      setCurrentFolderId(undefined);
    }
  }, [folderPath]);

  const handleGoToRoot = useCallback(() => {
    // 🔧 NOUVEAU: Retour à la racine du classeur
    setCurrentFolderId(undefined);
    setFolderPath([]);
  }, []);

  const handleGoToFolder = useCallback((folderId: string) => {
    // 🔧 NOUVEAU: Navigation directe vers un dossier spécifique
    const targetFolder = folderPath.find(f => f.id === folderId);
    if (targetFolder) {
      const targetIndex = folderPath.findIndex(f => f.id === folderId);
      const newPath = folderPath.slice(0, targetIndex + 1);
      setFolderPath(newPath);
      setCurrentFolderId(folderId);
    }
  }, [folderPath]);

  return {
    loading,
    error,
    classeurs,
    setClasseurs,
    activeClasseurId,
    currentFolderId,
    setActiveClasseurId,
    setCurrentFolderId,
    handleCreateClasseur,
    handleRenameClasseur,
    handleDeleteClasseur,
    handleUpdateClasseur,
    handleUpdateClasseurPositions,
    handleFolderOpen,
    handleGoBack,
    handleGoToRoot,
    handleGoToFolder,
    folderPath, // 🔧 NOUVEAU: Chemin de navigation pour le breadcrumb
  };
} 