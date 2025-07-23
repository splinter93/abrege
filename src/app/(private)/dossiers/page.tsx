"use client";
import React, { useCallback } from "react";
import FolderManager from "../../../components/FolderManager";
import ClasseurTabs, { Classeur } from "../../../components/ClasseurTabs";
import DynamicIcon from "../../../components/DynamicIcon";
import { getClasseurs, createClasseur, updateClasseur, deleteClasseur, updateClasseurPositions } from "../../../services/supabase";
import { supabase } from "../../../supabaseClient";
import { toast } from "react-hot-toast";
import "./DossiersPage.css";
import { useRealtime } from '@/hooks/useRealtime';
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState } from '@/store/useFileSystemStore';

const selectFolders = (s: FileSystemState) => s.folders;
const selectNotes = (s: FileSystemState) => s.notes;
const selectClasseurs = (s: FileSystemState) => s.classeurs;
// useCallback et Classeur déjà importés plus haut si besoin

// Merge ciblé : ajoute, met à jour, supprime les items par ID
const mergeClasseursState = (prev: Classeur[], fetched: Classeur[]) => {
  const prevMap = new Map(prev.map(c => [c.id, c]));
  const fetchedMap = new Map(fetched.map(c => [c.id, c]));
  // Ajouts et updates
  const merged = fetched.map(c => {
    const prevItem = prevMap.get(c.id);
    if (!prevItem) return c; // Ajout
    if (JSON.stringify(prevItem) !== JSON.stringify(c)) return c; // Update
    return prevItem; // Inchangé
  });
  // Suppressions
  prev.forEach(c => {
    if (!fetchedMap.has(c.id)) {
      // Item supprimé
      // On ne l'ajoute pas à merged
    }
  });
  return merged;
};

const DossiersPage: React.FC = () => {
  // TOUS les hooks doivent être ici, AVANT tout return conditionnel
  const foldersObj = useFileSystemStore(selectFolders);
  const notesObj = useFileSystemStore(selectNotes);
  const classeursObj = useFileSystemStore(selectClasseurs);
  const folders = React.useMemo(() => Object.values(foldersObj), [foldersObj]);
  const notes = React.useMemo(() => Object.values(notesObj), [notesObj]);
  const classeurs = React.useMemo(() => Object.values(classeursObj), [classeursObj]);
  
  // Effet d'hydratation minimal (à adapter à ta source réelle)
  React.useEffect(() => {
    // Exemple avec API REST locale, adapte à Supabase ou autre si besoin
    fetch('/api/v1/classeurs')
      .then(res => res.json())
      .then(data => useFileSystemStore.getState().setClasseurs(data));
    fetch('/api/v1/dossiers')
      .then(res => res.json())
      .then(data => useFileSystemStore.getState().setFolders(data));
    fetch('/api/v1/notes')
      .then(res => res.json())
      .then(data => useFileSystemStore.getState().setNotes(data));
  }, []);
  // Navigation locale (dossier courant)
  const [activeClasseurId, setActiveClasseurId] = React.useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = React.useState<string | undefined>(undefined);
  const handleFolderOpen = useCallback((folder: { id: string }) => setCurrentFolderId(folder.id), []);
  const handleGoBack = useCallback(() => setCurrentFolderId(undefined), []);
  
  // Filtrage par classeur actif ET navigation imbriquée
  const filteredFolders = React.useMemo(() => {
    if (!activeClasseurId) return [];
    
    return folders.filter(f => {
      // Filtre par classeur
      if (f.classeur_id !== activeClasseurId) return false;
      
      // Filtre par parent_id pour navigation imbriquée
      if (currentFolderId === undefined) {
        // À la racine : afficher seulement les dossiers sans parent
        return f.parent_id === null;
      } else {
        // Dans un dossier : afficher seulement les sous-dossiers du dossier courant
        return f.parent_id === currentFolderId;
      }
    });
  }, [folders, activeClasseurId, currentFolderId]);
  
  const filteredNotes = React.useMemo(() => {
    if (!activeClasseurId) return [];
    
    return notes.filter(n => {
      // Filtre par classeur
      if (n.classeur_id !== activeClasseurId) return false;
      
      // Filtre par folder_id pour navigation imbriquée
      if (currentFolderId === undefined) {
        // À la racine : afficher seulement les notes sans dossier
        return n.folder_id === null;
      } else {
        // Dans un dossier : afficher seulement les notes du dossier courant
        return n.folder_id === currentFolderId;
      }
    });
  }, [notes, activeClasseurId, currentFolderId]);
  
  // Les helpers de déduplication et d'extraction d'IDs ne sont plus nécessaires

  // Toute la logique de fetch/cache/écriture Zustand automatique est supprimée.
  // La source de vérité est useFileSystemStore(s => Object.values(s.classeurs)).

  const handleSelectClasseur = (id: string) => {
    if (classeurs.find(c => c.id === id)) {
      setActiveClasseurId(id);
      localStorage.setItem("activeClasseurId", id);
    } else {
      // selectFirstClasseur(classeurs); // This line is removed
    }
  };

  const handleCreateClasseur = async () => {
    const newName = prompt("Entrez le nom du nouveau classeur :");
    if (newName && newName.trim() !== "") {
      try {
        toast.loading("Création du classeur...");
        const newClasseurData = {
          name: newName.trim(),
          position: classeurs.length,
          emoji: "FileText",
          color: "#808080",
        };
        const newClasseur = await createClasseur(newClasseurData);
        setActiveClasseurId(newClasseur.id);
        localStorage.setItem("activeClasseurId", newClasseur.id);
        toast.dismiss();
        toast.success("Classeur créé avec succès.");
      } catch (err: any) {
        toast.dismiss();
        console.error("Erreur technique lors de la création du classeur:", err);
        toast.error("Erreur lors de la création du classeur.");
      }
    }
  };

  const handleUpdateClasseur = async (id: string, updates: Partial<Classeur>) => {
    try {
      toast.loading("Mise à jour du classeur...");
      await updateClasseur(id, updates);
      toast.dismiss();
      toast.success("Classeur mis à jour avec succès.");
    } catch (error) {
      toast.dismiss();
      console.error("Erreur lors de la mise à jour:", error);
      toast.error("Erreur lors de la mise à jour du classeur.");
    }
  };

  const handleDeleteClasseur = async (id: string) => {
    try {
      toast.loading("Suppression du classeur...");
      await deleteClasseur(id);
      if (activeClasseurId === id) {
        setActiveClasseurId(classeurs[0]?.id || null);
      }
      toast.dismiss();
      toast.success("Classeur supprimé avec succès.");
    } catch (error) {
      toast.dismiss();
      console.error("Erreur lors de la suppression:", error);
      toast.error("Erreur lors de la suppression du classeur.");
    }
  };

  const handleUpdateClasseurPositions = async (updatedClasseurs: { id: string; position: number }[]) => {
    try {
      await updateClasseurPositions(updatedClasseurs);
      toast.success("Ordre des classeurs sauvegardé.");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'ordre:", error);
      toast.error("Erreur lors de la sauvegarde de l'ordre.");
    }
  };

  const activeClasseur = classeurs.find((c) => c.id === activeClasseurId) || null;

  // Fallback dans le rendu
  const safeClasseurs = Array.isArray(classeurs) ? classeurs : [];

  // return conditionnels APRÈS tous les hooks
  // L'UI est toujours pilotée par Zustand, pas de loading/error local

  // Plus aucun useEffect, polling, subscribe, ou cache local pour la liste des classeurs

  return (
    <div className="dossiers-page-layout">
      <ClasseurTabs
        classeurs={safeClasseurs}
        setClasseurs={() => {}} // plus utilisé, mais prop requise
        activeClasseurId={activeClasseurId}
        onSelectClasseur={handleSelectClasseur}
        onCreateClasseur={handleCreateClasseur}
        onRenameClasseur={(id, name) => handleUpdateClasseur(id, { name })}
        onUpdateClasseur={handleUpdateClasseur}
        onDeleteClasseur={handleDeleteClasseur}
        onUpdateClasseurPositions={handleUpdateClasseurPositions}
      />
      <div className="page-content">
        {activeClasseur ? (
          <FolderManager
            key={activeClasseur.id}
            classeurId={activeClasseur.id}
            classeurName={activeClasseur.name}
            classeurIcon={activeClasseur.emoji}
            parentFolderId={currentFolderId}
            onFolderOpen={handleFolderOpen}
            onGoBack={handleGoBack}
            // Ajout des données filtrées
            filteredFolders={filteredFolders}
            filteredNotes={filteredNotes}
          />
        ) : (
          <div className="empty-state">
            <h2>Aucun classeur trouvé.</h2>
            <button onClick={handleCreateClasseur}>Créer votre premier classeur</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DossiersPage; 