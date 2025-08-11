"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/supabaseClient";
import { useFileSystemStore } from "@/store/useFileSystemStore";
import { OptimizedApi } from "@/services/optimizedApi";
import type { Folder, Classeur } from "@/components/types";

export function useDossiersPage() {
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
        await OptimizedApi.getInstance().loadClasseursWithContent();
        // Zustand will update the store, and the component will re-render
      } catch (e) {
        setError("Erreur lors du chargement des données.");
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadInitialData();
  }, []);
  
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
      await OptimizedApi.getInstance().loadClasseursWithContent();
    } catch (e) {
      console.error(e);
      setError("Impossible de créer le classeur.");
    }
  }, []);
  
  const handleRenameClasseur = useCallback(async (id: string, name: string) => {
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const resp = await fetch(`/api/v2/classeur/${encodeURIComponent(id)}/update`, { method: "PUT", headers, body: JSON.stringify({ name }) });
      if (!resp.ok) throw new Error(await resp.text());
      await OptimizedApi.getInstance().loadClasseursWithContent();
    } catch (e) {
      console.error(e);
      setError("Impossible de renommer le classeur.");
    }
  }, []);

  const handleDeleteClasseur = useCallback(async (id: string) => {
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const resp = await fetch(`/api/v2/classeur/${encodeURIComponent(id)}/delete`, { method: "DELETE", headers });
      if (!resp.ok) throw new Error(await resp.text());
      await OptimizedApi.getInstance().loadClasseursWithContent();
    } catch (e) {
      console.error(e);
      setError("Impossible de supprimer le classeur.");
    }
  }, []);

  const handleUpdateClasseur = useCallback(async (id: string, updates: Partial<Classeur>) => {
    try {
        const headers: HeadersInit = { "Content-Type": "application/json" };
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
        const resp = await fetch(`/api/v2/classeur/${encodeURIComponent(id)}/update`, { method: "PUT", headers, body: JSON.stringify(updates) });
        if (!resp.ok) throw new Error(await resp.text());
        await OptimizedApi.getInstance().loadClasseursWithContent();
    } catch (e) {
        console.error(e);
        setError("Impossible de mettre à jour le classeur.");
    }
  }, []);

  const handleUpdateClasseurPositions = useCallback(async (positions: { id: string, position: number }[]) => {
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
      const resp = await fetch("/api/v1/classeur/reorder", { method: "POST", headers, body: JSON.stringify({ positions }) });
      if (!resp.ok) throw new Error(await resp.text());
      await OptimizedApi.getInstance().loadClasseursWithContent();
    } catch (e) {
      console.error(e);
      setError("Impossible de réorganiser les classeurs.");
    }
  }, []);

  const handleFolderOpen = useCallback((folder: Folder) => {
    setCurrentFolderId(folder.id);
  }, []);

  const handleGoBack = useCallback(() => {
    setCurrentFolderId(undefined);
  }, []);

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
  };
} 