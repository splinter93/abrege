"use client";
import React, { useCallback, useEffect } from "react";
import FolderManager from "../../../components/FolderManager";
import ClasseurTabs, { Classeur } from "../../../components/ClasseurTabs";
import { getClasseurs, createClasseur, updateClasseur, deleteClasseur, updateClasseurPositions } from "../../../services/supabase";
import { supabase } from "../../../supabaseClient";
import { toast } from "react-hot-toast";
import "./DossiersPage.css";
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState } from '@/store/useFileSystemStore';
import { subscribeToNotes, subscribeToDossiers, subscribeToClasseurs, unsubscribeFromAll, startSubscriptionMonitoring } from '@/realtime/dispatcher';

const selectFolders = (s: FileSystemState) => s.folders;
const selectNotes = (s: FileSystemState) => s.notes;
const selectClasseurs = (s: FileSystemState) => s.classeurs;
// useCallback et Classeur déjà importés plus haut si besoin



const DossiersPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Scrivia - Notebooks';
  }, []);
  // TOUS les hooks doivent être ici, AVANT tout return conditionnel
  const foldersObj = useFileSystemStore(selectFolders);
  const notesObj = useFileSystemStore(selectNotes);
  const classeursObj = useFileSystemStore(selectClasseurs);
  const activeClasseurId = useFileSystemStore(s => s.activeClasseurId || null);
  const setActiveClasseurId = useFileSystemStore(s => s.setActiveClasseurId);
  
  // Optimisation : éviter les re-calculs inutiles
  const folders = React.useMemo(() => Object.values(foldersObj), [foldersObj]);
  const notes = React.useMemo(() => Object.values(notesObj), [notesObj]);
  const classeurs = React.useMemo(() => Object.values(classeursObj), [classeursObj]);
  
  // ===== VÉRIFICATION AUTHENTIFICATION =====
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('[DossiersPage] ❌ Erreur authentification:', error);
        } else if (user) {
          console.log('[DossiersPage] ✅ Utilisateur authentifié:', user.id);
        } else {
          console.log('[DossiersPage] ⚠️ Aucun utilisateur authentifié');
        }
      } catch (err) {
        console.error('[DossiersPage] ❌ Erreur lors de la vérification auth:', err);
      }
    };
    
    checkAuth();
  }, []);
  
  // ===== EFFET D'HYDRATATION INITIALE =====
  React.useEffect(() => {
    console.log('[DossiersPage] 🔄 Chargement des données initiales...');
    
    const loadInitialData = async () => {
      try {
        // Charger les classeurs
        const classeursData = await getClasseurs();
        console.log('[DossiersPage] 📚 Classeurs chargés:', classeursData.length);
        useFileSystemStore.getState().setClasseurs(classeursData);
        
        // Sélectionner immédiatement le premier classeur par défaut
        if (classeursData.length > 0) {
          const firstClasseurId = classeursData[0].id;
          console.log('[DossiersPage] 🎯 Sélection immédiate du premier classeur:', firstClasseurId);
          useFileSystemStore.getState().setActiveClasseurId(firstClasseurId);
        }
        
        // Charger toutes les notes (articles) de tous les classeurs
        const { data: notesData, error: notesError } = await supabase
          .from('articles')
          .select('*')
          .order('position');
        
        if (!notesError && notesData) {
          console.log('[DossiersPage] 📝 Notes chargées:', notesData.length);
          useFileSystemStore.getState().setNotes(notesData);
        } else {
          console.error('[DossiersPage] ❌ Erreur lors du chargement des notes:', notesError);
        }
        
        // Charger tous les dossiers
        const { data: foldersData, error: foldersError } = await supabase
          .from('folders')
          .select('*')
          .order('position');
        
        if (!foldersError && foldersData) {
          console.log('[DossiersPage] 📁 Dossiers chargés:', foldersData.length);
          useFileSystemStore.getState().setFolders(foldersData);
        } else {
          console.error('[DossiersPage] ❌ Erreur lors du chargement des dossiers:', foldersError);
        }
        
        console.log('[DossiersPage] ✅ Données initiales chargées');
        
        // ===== SÉLECTION AUTOMATIQUE DU CLASSEUR =====
        const selectInitialClasseur = () => {
          // Vérifier si on a un dernier classeur sélectionné dans localStorage
          const lastActiveClasseurId = localStorage.getItem("activeClasseurId");
          
          if (lastActiveClasseurId && classeursData.find(c => c.id === lastActiveClasseurId)) {
            console.log('[DossiersPage] 🎯 Récupération du dernier classeur utilisé:', lastActiveClasseurId);
            setActiveClasseurId(lastActiveClasseurId);
            return;
          }
          
          // Sinon, garder le premier classeur déjà sélectionné
          console.log('[DossiersPage] ✅ Premier classeur déjà sélectionné par défaut');
        };
        
        // Sélectionner le classeur après le chargement
        selectInitialClasseur();
        
      } catch (error) {
        console.error('[DossiersPage] ❌ Erreur lors du chargement des données initiales:', error);
      }
    };
    
    loadInitialData();
  }, []); // Dépendances vides = exécuté une seule fois au montage
  
  // ===== PHASE 3: SOUSCRIPTIONS REALTIME =====
  React.useEffect(() => {
    console.log('[DossiersPage] 🔄 Démarrage des souscriptions realtime...');
    console.log('[DossiersPage] 📊 État actuel - Classeurs:', classeurs.length, 'Notes:', notes.length, 'Dossiers:', folders.length);
    
    const setupRealtime = async () => {
      try {
        // Vérifier l'authentification d'abord
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('[DossiersPage] ❌ Erreur authentification:', authError);
          return;
        }
        
        if (!user) {
          console.log('[DossiersPage] ⚠️ Aucun utilisateur authentifié - souscriptions différées');
          // Réessayer dans 2 secondes
          setTimeout(setupRealtime, 2000);
          return;
        }
        
        console.log('[DossiersPage] ✅ Utilisateur authentifié:', user.id);
        
        // Attendre un peu que l'authentification soit stable
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // S'abonner aux événements realtime
        console.log('[DossiersPage] 📝 Activation souscription notes...');
        const notesSubscription = subscribeToNotes();
        
        console.log('[DossiersPage] 📁 Activation souscription dossiers...');
        const dossiersSubscription = subscribeToDossiers();
        
        console.log('[DossiersPage] 📚 Activation souscription classeurs...');
        const classeursSubscription = subscribeToClasseurs();
        
        console.log('[DossiersPage] ✅ Souscriptions realtime activées');
        console.log('[DossiersPage] 📡 Canaux créés:', { notesSubscription, dossiersSubscription, classeursSubscription });
        
        // Démarrer le monitoring des souscriptions
        startSubscriptionMonitoring();
        
      } catch (error) {
        console.error('[DossiersPage] ❌ Erreur lors de l\'activation des souscriptions realtime:', error);
        // Réessayer dans 3 secondes en cas d'erreur
        setTimeout(setupRealtime, 3000);
      }
    };
    
    // Attendre 2 secondes que l'authentification soit établie
    setTimeout(setupRealtime, 2000);
    
    // Nettoyage au démontage
    return () => {
      console.log('[DossiersPage] 🛑 Arrêt des souscriptions realtime...');
      try {
        unsubscribeFromAll();
        console.log('[DossiersPage] ✅ Souscriptions realtime désactivées');
      } catch (error) {
        console.error('[DossiersPage] ❌ Erreur lors de la désactivation des souscriptions:', error);
      }
    };
  }, [setActiveClasseurId]); // Ajout de la dépendance manquante
  
  // Navigation locale (dossier courant)
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
    }).sort((a, b) => {
      // Tri stable par position ou par titre
      if (a.position !== undefined && b.position !== undefined) {
        return a.position - b.position;
      }
      return a.source_title.localeCompare(b.source_title);
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
      } catch (err: unknown) {
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