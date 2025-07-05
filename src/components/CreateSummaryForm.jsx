'use client';
import React, { useState, useEffect } from 'react';
import './CreateSummaryForm.css';
import { sendPayloadToSynesia } from '../actions/synesia';
import { getClasseurs } from '../services/supabase';
import { toast } from 'react-hot-toast';

const CreateSummaryForm = () => {
  const [url, setUrl] = useState('');
  const [contentType, setContentType] = useState('YouTube');
  const [classeurs, setClasseurs] = useState([]);
  const [selectedClasseur, setSelectedClasseur] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchClasseurs = async () => {
      const fetchedClasseurs = await getClasseurs();
      setClasseurs(fetchedClasseurs);
      // Sélectionner le premier classeur par défaut
      if (fetchedClasseurs.length > 0) {
        setSelectedClasseur(fetchedClasseurs[0].id);
      }
    };
    fetchClasseurs();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!url || !selectedClasseur || isLoading) return;

    setIsLoading(true);
    
    const payload = {
      url: url,
      type: contentType,
      classeurId: selectedClasseur
    };

    console.log('Envoi à Synesia...', payload);

    try {
      const result = await sendPayloadToSynesia(payload);
      console.log('Résultat de Synesia :', result);
      toast.success('Votre résumé arrive dans une minute !');
      setUrl('');
    } catch (error) {
      console.error("Erreur lors de la récupération du résumé :", error);
      toast.error("Une erreur est survenue lors de la création du résumé.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <form className="create-summary-form" onSubmit={handleSubmit}>
        <div className="form-content">
          <input
            type="text"
            className="url-input"
            placeholder="Collez une URL (YouTube, article, podcast...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            disabled={isLoading}
            required
          />
          <div className="form-actions">
            <select
              className="content-type-select"
              value={selectedClasseur}
              onChange={(e) => setSelectedClasseur(e.target.value)}
              disabled={isLoading || classeurs.length === 0}
              required
            >
              <option value="" disabled>Choisir un classeur</option>
              {classeurs.map(classeur => (
                <option key={classeur.id} value={classeur.id}>
                  {classeur.name}
                </option>
              ))}
            </select>
            <select
              className="content-type-select"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              disabled={isLoading}
            >
              <option>YouTube</option>
              <option>Podcast</option>
              <option>Texte</option>
              <option>PDF</option>
            </select>
            <button type="submit" className="submit-button" disabled={isLoading || !selectedClasseur}>
              {isLoading ? 'En cours...' : 'Résumer !'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
};

export default CreateSummaryForm;
