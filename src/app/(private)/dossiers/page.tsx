"use client";
import React, { useState, useEffect } from "react";
import FolderManager from "../../../components/FolderManager";
import ClasseurTabs, { Classeur } from "../../../components/ClasseurTabs";
import DynamicIcon from "../../../components/DynamicIcon";
import { getClasseurs, createClasseur, updateClasseur, deleteClasseur, updateClasseurPositions } from "../../../services/supabase";
import { supabase } from "../../../supabaseClient";
import { toast } from "react-hot-toast";
import "./DossiersPage.css";
import { useRealtime } from '@/hooks/useRealtime';

const DossiersPage: React.FC = () => {
  // TOUS les hooks doivent être ici, AVANT tout return conditionnel
  const [classeurs, setClasseurs] = useState<Classeur[]>([]);
  const [activeClasseurId, setActiveClasseurId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Helper pour sélectionner le premier classeur valide
  const selectFirstClasseur = (classeurs: Classeur[]) => {
    if (classeurs.length === 0) {
      setActiveClasseurId(null);
      localStorage.removeItem("activeClasseurId");
    } else {
      setActiveClasseurId(classeurs[0].id);
      localStorage.setItem("activeClasseurId", classeurs[0].id);
    }
  };

  // Helper pour garantir un tableau
  const ensureArray = (val: any) => Array.isArray(val) ? val : [];

  useEffect(() => {
    const fetchClasseurs = async () => {
      try {
        setLoading(true);
        let fetchedClasseurs = await getClasseurs();
        fetchedClasseurs = ensureArray(fetchedClasseurs);
        setClasseurs(fetchedClasseurs);
        // Vérifier que l'ID actif existe encore
        const lastActiveId = localStorage.getItem("activeClasseurId");
        const activeId = fetchedClasseurs.find((c: Classeur) => c.id === lastActiveId)
          ? lastActiveId
          : fetchedClasseurs[0]?.id || null;
        setActiveClasseurId(activeId);
        if (activeId) {
          localStorage.setItem("activeClasseurId", activeId);
        } else {
          localStorage.removeItem("activeClasseurId");
        }
        setError(null);
      } catch (err: any) {
        setClasseurs([]);
        console.error("Erreur lors de la récupération des classeurs:", err);
        setError("Impossible de charger les classeurs. Veuillez rafraîchir la page.");
        toast.error("Impossible de charger les classeurs.");
      } finally {
        setLoading(false);
      }
    };
    fetchClasseurs();

    // Realtime pour les classeurs
    const { subscribe, unsubscribe } = useRealtime({
      userId: "3223651c-5580-4471-affb-b3f4456bd729", // [TEMP] USER_ID HARDCODED
      type: 'polling',
      interval: 5000
    });

    useEffect(() => {
      const handleClasseurChange = (event: any) => {
        if (event.table === 'classeurs') {
          fetchClasseurs();
        }
      };

      subscribe('classeurs', handleClasseurChange);

      return () => {
        unsubscribe('classeurs');
      };
    }, [subscribe, unsubscribe]);

  }, []);

  useEffect(() => {
    // Si l'ID actif n'existe plus, sélectionner le premier classeur
    if (activeClasseurId && !classeurs.find(c => c.id === activeClasseurId)) {
      selectFirstClasseur(classeurs);
    }
  }, [classeurs, activeClasseurId]);

  const handleSelectClasseur = (id: string) => {
    if (classeurs.find(c => c.id === id)) {
      setActiveClasseurId(id);
      localStorage.setItem("activeClasseurId", id);
    } else {
      selectFirstClasseur(classeurs);
    }
  };

  const handleCreateClasseur = async () => {
    const newName = prompt("Entrez le nom du nouveau classeur :");
    if (newName && newName.trim() !== "") {
      try {
        setError(null);
        toast.loading("Création du classeur...");
        const newClasseurData = {
          name: newName.trim(),
          position: classeurs.length,
          emoji: "FileText",
          color: "#808080",
        };
        const newClasseur = await createClasseur(newClasseurData);
        setClasseurs(prev => [...prev, newClasseur]);
        setActiveClasseurId(newClasseur.id);
        localStorage.setItem("activeClasseurId", newClasseur.id);
        toast.dismiss();
        toast.success("Classeur créé avec succès.");
      } catch (err: any) {
        toast.dismiss();
        console.error("Erreur technique lors de la création du classeur:", err);
        setError(`Erreur technique : ${err.message}`);
        toast.error("Erreur lors de la création du classeur.");
      }
    }
  };

  const handleUpdateClasseur = async (id: string, updates: Partial<Classeur>) => {
    try {
      toast.loading("Mise à jour du classeur...");
      const updatedClasseur = await updateClasseur(id, updates);
      setClasseurs(classeurs.map((c) => (c.id === id ? updatedClasseur : c)));
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
      const newClasseurs = classeurs.filter((c) => c.id !== id);
      setClasseurs(newClasseurs);
      if (activeClasseurId === id) {
        selectFirstClasseur(newClasseurs);
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
  if (loading) return <div>Chargement...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="dossiers-page-layout">
      <ClasseurTabs
        classeurs={safeClasseurs}
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
        {activeClasseur ? (
          <FolderManager
            key={activeClasseur.id}
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