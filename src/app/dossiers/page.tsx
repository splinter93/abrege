"use client";
import React, { useState, useEffect } from "react";
import FolderManager from "../../components/FolderManager";
import ClasseurTabs, { Classeur } from "../../components/ClasseurTabs";
import DynamicIcon from "../../components/DynamicIcon";
import { getClasseurs, createClasseur, updateClasseur, deleteClasseur, updateClasseurPositions } from "../../services/supabase";
import { supabase } from "../../supabaseClient";
import { toast } from "react-hot-toast";
import "./DossiersPage.css";

const DossiersPage: React.FC = () => {
  const [classeurs, setClasseurs] = useState<Classeur[]>([]);
  const [activeClasseurId, setActiveClasseurId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchClasseurs = async () => {
      try {
        setLoading(true);
        const fetchedClasseurs = await getClasseurs();
        setClasseurs(fetchedClasseurs);
        if (fetchedClasseurs.length > 0) {
          const lastActiveId = localStorage.getItem("activeClasseurId");
          const activeId = fetchedClasseurs.find((c: Classeur) => c.id === lastActiveId)
            ? lastActiveId
            : fetchedClasseurs[0].id;
          setActiveClasseurId(activeId);
        }
        setError(null);
        console.log("DossiersPage - classeurs:", fetchedClasseurs);
      } catch (err: any) {
        console.error("Erreur lors de la récupération des classeurs:", err);
        setError("Impossible de charger les classeurs. Veuillez rafraîchir la page.");
      } finally {
        setLoading(false);
      }
    };
    fetchClasseurs();

    // Abonnement Realtime à la table 'classeurs'
    const classeurChannel = supabase
      .channel('realtime:classeurs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'classeurs' }, (payload: any) => {
        // Rafraîchir la liste des classeurs à chaque changement
        fetchClasseurs();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(classeurChannel);
    };
  }, []);

  useEffect(() => {
    console.log("DossiersPage - activeClasseurId:", activeClasseurId);
  }, [activeClasseurId]);

  const handleSelectClasseur = (id: string) => {
    setActiveClasseurId(id);
    localStorage.setItem("activeClasseurId", id);
  };

  const handleCreateClasseur = async () => {
    const newName = prompt("Entrez le nom du nouveau classeur :");
    if (newName && newName.trim() !== "") {
      try {
        setError(null);
        const newClasseurData = {
          name: newName.trim(),
          position: classeurs.length,
          emoji: "FileText",
          color: "#808080",
        };
        const newClasseur = await createClasseur(newClasseurData);
        setClasseurs([...classeurs, newClasseur]);
        handleSelectClasseur(newClasseur.id);
      } catch (err: any) {
        console.error("Erreur technique lors de la création du classeur:", err);
        setError(`Erreur technique : ${err.message}`);
      }
    }
  };

  const handleUpdateClasseur = async (id: string, updates: Partial<Classeur>) => {
    try {
      const updatedClasseur = await updateClasseur(id, updates);
      setClasseurs(classeurs.map((c) => (c.id === id ? updatedClasseur : c)));
      if (updates.name) {
        toast.success("Classeur mis à jour avec succès.");
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
  };

  const handleDeleteClasseur = async (id: string) => {
    try {
      await deleteClasseur(id);
      const newClasseurs = classeurs.filter((c) => c.id !== id);
      setClasseurs(newClasseurs);
      if (activeClasseurId === id) {
        const newActiveId = newClasseurs.length > 0 ? newClasseurs[0].id : null;
        setActiveClasseurId(newActiveId);
        if (newActiveId) {
          localStorage.setItem("activeClasseurId", newActiveId);
        } else {
          localStorage.removeItem("activeClasseurId");
        }
      }
      toast.success("Classeur supprimé avec succès.");
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  const handleUpdateClasseurPositions = async (updatedClasseurs: { id: string; position: number }[]) => {
    try {
      await updateClasseurPositions(updatedClasseurs);
      toast.success("Ordre des classeurs sauvegardé.");
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'ordre:", error);
    }
  };

  const activeClasseur = classeurs.find((c) => c.id === activeClasseurId);

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="dossiers-page-layout">
      <ClasseurTabs
        classeurs={classeurs}
        setClasseurs={setClasseurs}
        activeClasseurId={activeClasseurId}
        onSelectClasseur={handleSelectClasseur}
        onCreateClasseur={handleCreateClasseur}
        onRenameClasseur={(id, name) => handleUpdateClasseur(id, { name })}
        onUpdateClasseur={handleUpdateClasseur}
        onDeleteClasseur={handleDeleteClasseur}
        onUpdateClasseurPositions={handleUpdateClasseurPositions}
      />
      <div className="page-content">
        {activeClasseur && activeClasseur.id && activeClasseur.name ? (
            <FolderManager
              key={activeClasseurId ?? undefined}
            classeurId={activeClasseur.id}
              classeurName={activeClasseur.name}
            classeurIcon={activeClasseur.emoji}
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