'use client';
import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import './CreateSummaryForm.css';
import { sendPayloadToSynesia } from '../actions/synesia';
import { toast } from 'react-hot-toast';

async function getClasseurs(): Promise<Array<{ id: string; name: string }>> {
  return [];
}

interface Classeur {
  id: string;
  name: string;
  [key: string]: unknown;
}

const CreateSummaryForm: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [contentType, setContentType] = useState<string>('YouTube');
  const [classeurs, setClasseurs] = useState<Classeur[]>([]);
  const [selectedClasseur, setSelectedClasseur] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchClasseurs = async () => {
      const fetchedClasseurs = await getClasseurs();
      setClasseurs(fetchedClasseurs);
      if (fetchedClasseurs.length > 0) {
        setSelectedClasseur(fetchedClasseurs[0].id);
      }
    };
    fetchClasseurs();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!url || !selectedClasseur || isLoading) return;

    setIsLoading(true);
    const payload = {
      url: url,
      type: contentType,
      classeurId: selectedClasseur
    };

    try {
      await sendPayloadToSynesia(payload);
      toast.success('Votre résumé arrive dans une minute !');
      setUrl('');
    } catch {
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
            onChange={(e: ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
            disabled={isLoading}
            required
          />
          <div className="form-actions">
            <select
              className="content-type-select"
              value={selectedClasseur}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSelectedClasseur(e.target.value)}
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
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setContentType(e.target.value)}
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