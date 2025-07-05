'use client';
import React, { useState, useEffect } from 'react';
import FolderManager from '../../components/FolderManager';
import ClasseurTabs from '../../components/ClasseurTabs';
import DynamicIcon from '../../components/DynamicIcon';
import { getClasseurs, createClasseur, updateClasseur, deleteClasseur, updateClasseurPositions } from '../../services/supabase';
import { toast } from 'react-hot-toast';
// import { useToast } from '../../contexts/ToastContext';
import './DossiersPage.css';

const DossiersPage = () => {
  const [classeurs, setClasseurs] = useState([]);
  const [activeClasseurId, setActiveClasseurId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchClasseurs = async () => {
      try {
        setLoading(true);
        const fetchedClasseurs = await getClasseurs();
        setClasseurs(fetchedClasseurs);
        if (fetchedClasseurs.length > 0) {
          // Si un ID est dans le localStorage, on l'utilise, sinon on prend le premier
          const lastActiveId = localStorage.getItem('activeClasseurId');
          const activeId = fetchedClasseurs.find(c => c.id === lastActiveId) 
            ? lastActiveId 
            : fetchedClasseurs[0].id;
          setActiveClasseurId(activeId);
        }
        setError(null);
        // Ajout du log
        console.log('DossiersPage - classeurs:', fetchedClasseurs);
      } catch (err) {
        console.error("Erreur lors de la récupération des classeurs:", err);
        setError("Impossible de charger les classeurs. Veuillez rafraîchir la page.");
      } finally {
        setLoading(false);
      }
    };
    fetchClasseurs();
  }, []);

  useEffect(() => {
    console.log('DossiersPage - activeClasseurId:', activeClasseurId);
  }, [activeClasseurId]);

  const handleSelectClasseur = (id) => {
    setActiveClasseurId(id);
    localStorage.setItem('activeClasseurId', id);
  };

  const handleCreateClasseur = async () => {
    const newName = prompt("Entrez le nom du nouveau classeur :");
    if (newName && newName.trim() !== '') {
      try {
        setError(null);
        const newClasseurData = {
          name: newName.trim(),
          position: classeurs.length,
          icon: 'FileText',
          color: '#808080',
        };
        const newClasseur = await createClasseur(newClasseurData);
        setClasseurs([...classeurs, newClasseur]);
        handleSelectClasseur(newClasseur.id);
      } catch (err) {
        console.error("Erreur technique lors de la création du classeur:", err);
        setError(`Erreur technique : ${err.message}`);
      }
    }
  };

  const handleUpdateClasseur = async (id, updates) => {
    try {
      const updatedClasseur = await updateClasseur(id, updates);
      setClasseurs(classeurs.map(c => (c.id === id ? updatedClasseur : c)));
      if (updates.name) {
        toast.success('Classeur mis à jour avec succès.');
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
    }
  };

  const handleDeleteClasseur = async (id) => {
    try {
      await deleteClasseur(id);
      const newClasseurs = classeurs.filter(c => c.id !== id);
      setClasseurs(newClasseurs);

      // Si le classeur supprimé était l'actif, on passe au premier de la liste
      if (activeClasseurId === id) {
        const newActiveId = newClasseurs.length > 0 ? newClasseurs[0].id : null;
        setActiveClasseurId(newActiveId);
        if (newActiveId) {
          localStorage.setItem('activeClasseurId', newActiveId);
        } else {
          localStorage.removeItem('activeClasseurId');
        }
      }
      toast.success('Classeur supprimé avec succès.');
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
    }
  };

  const handleUpdateClasseurPositions = async (updatedClasseurs) => {
    try {
      // L'état est déjà mis à jour localement, on envoie juste à l'API
      await updateClasseurPositions(updatedClasseurs);
      toast.success('Ordre des classeurs sauvegardé.');
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de l'ordre:", error);
    }
  };

  const activeClasseur = classeurs.find(c => c.id === activeClasseurId);

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
        {activeClasseur ? (
          <>
            <header className="page-title-header">
              <DynamicIcon name={activeClasseur.icon} size={32} />
              <h1>{activeClasseur.name}</h1>
            </header>
            <FolderManager key={activeClasseurId} classeurId={activeClasseurId} />
          </>
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