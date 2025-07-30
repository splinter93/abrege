"use client";
import React, { useCallback, useEffect } from "react";
import FolderManager from "../../../components/FolderManager";
import ClasseurTabs, { Classeur } from "../../../components/ClasseurTabs";
import { getClasseurs } from "../../../services/supabase";
import { optimizedApi } from "../../../services/optimizedApi";
import { supabase } from "../../../supabaseClient";
import { toast } from "react-hot-toast";
import "./DossiersPage.css";
import { useFileSystemStore } from '@/store/useFileSystemStore';
import type { FileSystemState } from '@/store/useFileSystemStore';
import { useRealtime } from '@/hooks/useRealtime';


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
  
  // ===== ACTIVATION DU POLLING TEMPS RÉEL =====
  const { subscribe, unsubscribe } = useRealtime({
    userId: "3223651c-5580-4471-affb-b3f4456bd729",
    type: 'polling',
    interval: 3000,
    debug: true
  });

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
    const loadInitialData = async () => {
      try {
        console.log('[DossiersPage] 🔄 Chargement des données initiales...');
        
        // Charger les classeurs
        const { data: classeursData, error: classeursError } = await supabase
          .from('classeurs')
          .select('*')
          .eq('user_id', "3223651c-5580-4471-affb-b3f4456bd729")
          .order('created_at', { ascending: false });

        if (classeursError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[DossiersPage] ❌ Erreur chargement classeurs:', classeursError);
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[DossiersPage] ✅ Classeurs chargés:', classeursData?.length || 0);
          }
          // Ajouter au store Zustand
          classeursData?.forEach(classeur => {
            useFileSystemStore.getState().addClasseur(classeur);
          });
          
          // Définir le premier classeur comme classeur par défaut
          if (classeursData && classeursData.length > 0) {
            const firstClasseur = classeursData[0];
            useFileSystemStore.getState().setActiveClasseurId(firstClasseur.id);
            if (process.env.NODE_ENV === 'development') {
              console.log('[DossiersPage] 🎯 Premier classeur défini par défaut:', firstClasseur.name);
            }
          }
        }

        // Charger les dossiers
        const { data: foldersData, error: foldersError } = await supabase
          .from('folders')
          .select('*')
          .eq('user_id', "3223651c-5580-4471-affb-b3f4456bd729")
          .order('created_at', { ascending: false });

        if (foldersError) {
          console.error('[DossiersPage] ❌ Erreur chargement dossiers:', foldersError);
        } else {
          console.log('[DossiersPage] ✅ Dossiers chargés:', foldersData?.length || 0);
          // Ajouter au store Zustand
          foldersData?.forEach(folder => {
            useFileSystemStore.getState().addFolder(folder);
          });
        }

        // Charger les notes
        const { data: notesData, error: notesError } = await supabase
          .from('articles')
          .select('*')
          .eq('user_id', "3223651c-5580-4471-affb-b3f4456bd729")
          .order('updated_at', { ascending: false });

        if (notesError) {
          console.error('[DossiersPage] ❌ Erreur chargement notes:', notesError);
        } else {
          console.log('[DossiersPage] ✅ Notes chargées:', notesData?.length || 0);
          // Ajouter au store Zustand
          notesData?.forEach(note => {
            useFileSystemStore.getState().addNote(note);
          });
        }

        console.log('[DossiersPage] ✅ Données initiales chargées avec succès');
      } catch (error) {
        console.error('[DossiersPage] ❌ Erreur lors du chargement initial:', error);
      }
    };
    
    loadInitialData();
  }, []); // Dépendances vides = exécuté une seule fois au montage
  
  // ===== ACTIVATION DU POLLING TEMPS RÉEL =====
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DossiersPage] 🔄 Activation du polling temps réel...');
    }
    
    const loadInitialData = async () => {
      try {
        if (process.env.NODE_ENV === 'development') {
          console.log('[DossiersPage] 🔄 Rechargement des données...');
        }
        
        // Charger les classeurs
        const { data: classeursData, error: classeursError } = await supabase
          .from('classeurs')
          .select('*')
          .eq('user_id', "3223651c-5580-4471-affb-b3f4456bd729")
          .order('created_at', { ascending: false });

        if (classeursError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[DossiersPage] ❌ Erreur chargement classeurs:', classeursError);
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[DossiersPage] ✅ Classeurs rechargés:', classeursData?.length || 0);
          }
          // Réinitialiser et ajouter au store Zustand
          useFileSystemStore.getState().setClasseurs(classeursData || []);
        }

        // Charger les dossiers
        const { data: foldersData, error: foldersError } = await supabase
          .from('folders')
          .select('*')
          .eq('user_id', "3223651c-5580-4471-affb-b3f4456bd729")
          .order('created_at', { ascending: false });

        if (foldersError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[DossiersPage] ❌ Erreur chargement dossiers:', foldersError);
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[DossiersPage] ✅ Dossiers rechargés:', foldersData?.length || 0);
          }
          // Réinitialiser et ajouter au store Zustand
          useFileSystemStore.getState().setFolders(foldersData || []);
        }

        // Charger les notes
        const { data: notesData, error: notesError } = await supabase
          .from('articles')
          .select('*')
          .eq('user_id', "3223651c-5580-4471-affb-b3f4456bd729")
          .order('updated_at', { ascending: false });

        if (notesError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('[DossiersPage] ❌ Erreur chargement notes:', notesError);
          }
        } else {
          if (process.env.NODE_ENV === 'development') {
            console.log('[DossiersPage] ✅ Notes rechargées:', notesData?.length || 0);
          }
          // Réinitialiser et ajouter au store Zustand
          useFileSystemStore.getState().setNotes(notesData || []);
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('[DossiersPage] ✅ Données rechargées avec succès');
        }
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[DossiersPage] ❌ Erreur lors du rechargement:', error);
        }
      }
    };
    
    const handleArticleChange = (event: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DossiersPage] 📡 Événement articles reçu:', event);
      }
      
      switch (event.eventType) {
        case 'UPDATE':
          if (event.new) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[DossiersPage] 🔄 Mise à jour note:', event.new.source_title);
            }
            useFileSystemStore.getState().updateNote(event.new.id, event.new);
          }
          break;
        case 'INSERT':
          if (event.new) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[DossiersPage] ➕ Nouvelle note créée:', event.new.source_title);
            }
            useFileSystemStore.getState().addNote(event.new);
          }
          break;
        case 'DELETE':
          if (process.env.NODE_ENV === 'development') {
            console.log('[DossiersPage] 🗑️ Note supprimée');
          }
          // Pour les DELETE, on ne peut pas identifier précisément quelle note a été supprimée
          // car l'élément n'existe plus dans la base. On peut soit :
          // 1. Recharger complètement les données
          // 2. Utiliser un cache local pour identifier l'élément supprimé
          // Pour l'instant, on recharge les données
          loadInitialData();
          break;
      }
    };

    const handleFolderChange = (event: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DossiersPage] 📡 Événement folders reçu:', event);
      }
      
      switch (event.eventType) {
        case 'UPDATE':
          if (event.new) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[DossiersPage] 🔄 Mise à jour dossier:', event.new.name);
            }
            useFileSystemStore.getState().updateFolder(event.new.id, event.new);
          }
          break;
        case 'INSERT':
          if (event.new) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[DossiersPage] ➕ Nouveau dossier créé:', event.new.name);
            }
            useFileSystemStore.getState().addFolder(event.new);
          }
          break;
        case 'DELETE':
          if (process.env.NODE_ENV === 'development') {
            console.log('[DossiersPage] 🗑️ Dossier supprimé');
          }
          // Recharger les données pour les dossiers supprimés
          loadInitialData();
          break;
      }
    };

    const handleClasseurChange = (event: any) => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DossiersPage] 📡 Événement classeurs reçu:', event);
      }
      
      switch (event.eventType) {
        case 'UPDATE':
          if (event.new) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[DossiersPage] 🔄 Mise à jour classeur:', event.new.name);
            }
            useFileSystemStore.getState().updateClasseur(event.new.id, event.new);
          }
          break;
        case 'INSERT':
          if (event.new) {
            if (process.env.NODE_ENV === 'development') {
              console.log('[DossiersPage] ➕ Nouveau classeur créé:', event.new.name);
            }
            useFileSystemStore.getState().addClasseur(event.new);
          }
          break;
        case 'DELETE':
          if (process.env.NODE_ENV === 'development') {
            console.log('[DossiersPage] 🗑️ Classeur supprimé');
          }
          // Recharger les données pour les classeurs supprimés
          loadInitialData();
          break;
      }
    };

    // S'abonner aux changements
    subscribe('articles', handleArticleChange);
    subscribe('folders', handleFolderChange);
    subscribe('classeurs', handleClasseurChange);

    if (process.env.NODE_ENV === 'development') {
      console.log('[DossiersPage] ✅ Polling temps réel activé');
    }

    // Nettoyage au démontage
    return () => {
      if (process.env.NODE_ENV === 'development') {
        console.log('[DossiersPage] 🛑 Désactivation du polling temps réel...');
      }
      unsubscribe('articles', handleArticleChange);
      unsubscribe('folders', handleFolderChange);
      unsubscribe('classeurs', handleClasseurChange);
    };
  }, [subscribe, unsubscribe]);
  
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
          user_id: "3223651c-5580-4471-affb-b3f4456bd729",
          position: classeurs.length,
          emoji: "📁",
          color: "#808080",
        };
        const result = await optimizedApi.createClasseur(newClasseurData);
        setActiveClasseurId(result.classeur.id);
        localStorage.setItem("activeClasseurId", result.classeur.id);
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
      await optimizedApi.updateClasseur(id, updates);
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
      await optimizedApi.deleteClasseur(id);
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
      console.log('[DossiersPage] 🔄 Réorganisation classeurs avec API optimisée');
      const result = await optimizedApi.reorderClasseurs(updatedClasseurs);
      console.log('[DossiersPage] ✅ Classeurs réorganisés avec API optimisée');
      toast.success("Ordre des classeurs sauvegardé.");
      return result;
    } catch (error) {
      console.error('[DossiersPage] ❌ Erreur réorganisation classeurs:', error);
      toast.error("Erreur lors de la sauvegarde de l'ordre.");
      throw error;
    }
  };

  const activeClasseur = classeurs.find((c) => c.id === activeClasseurId) || null;

  // Fallback dans le rendu
  const safeClasseurs = Array.isArray(classeurs) ? classeurs : [];

  // return conditionnels APRÈS tous les hooks
  // L'UI est toujours pilotée par Zustand, pas de loading/error local

  // Plus aucun useEffect, polling, subscribe, ou cache local pour la liste des classeurs

  // Fonction pour créer une note avec API optimisée
  const createNoteOptimized = async (noteData: any) => {
    try {
      console.log('[DossiersPage] 🚀 Création note avec API optimisée');
      const result = await optimizedApi.createNote(noteData);
      console.log('[DossiersPage] ✅ Note créée avec API optimisée:', result.note.source_title);
      return result;
    } catch (error) {
      console.error('[DossiersPage] ❌ Erreur création note:', error);
      throw error;
    }
  };

  // Fonction pour créer un dossier avec API optimisée
  const createFolderOptimized = async (folderData: any) => {
    try {
      console.log('[DossiersPage] 🚀 Création dossier avec API optimisée');
      const result = await optimizedApi.createFolder(folderData);
      console.log('[DossiersPage] ✅ Dossier créé avec API optimisée:', result.folder.name);
      return result;
    } catch (error) {
      console.error('[DossiersPage] ❌ Erreur création dossier:', error);
      throw error;
    }
  };

  // Fonction pour supprimer une note avec API optimisée
  const deleteNoteOptimized = async (noteId: string) => {
    try {
      console.log('[DossiersPage] 🗑️ Suppression note avec API optimisée');
      const result = await optimizedApi.deleteNote(noteId);
      console.log('[DossiersPage] ✅ Note supprimée avec API optimisée');
      return result;
    } catch (error) {
      console.error('[DossiersPage] ❌ Erreur suppression note:', error);
      throw error;
    }
  };

  // Fonction pour supprimer un dossier avec API optimisée
  const deleteFolderOptimized = async (folderId: string) => {
    try {
      console.log('[DossiersPage] 🗑️ Suppression dossier avec API optimisée');
      const result = await optimizedApi.deleteFolder(folderId);
      console.log('[DossiersPage] ✅ Dossier supprimé avec API optimisée');
      return result;
    } catch (error) {
      console.error('[DossiersPage] ❌ Erreur suppression dossier:', error);
      throw error;
    }
  };

  return (
    <div className="dossiers-page">
      {/* Indicateur de polling en temps réel */}
      
      
      {/* Contenu existant */}
      <div className="dossiers-container">
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
    </div>
  );
};

export default DossiersPage; 