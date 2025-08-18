import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabaseClient';

export interface FileItem {
  id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  url: string;
  thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  note_id?: string;
  folder_id?: string;
  notebook_id?: string;
}

export function useFilesPage(userId: string) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [files, setFiles] = useState<FileItem[]>([]);

  // Fonction pour récupérer les fichiers de l'utilisateur
  const fetchFiles = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setFiles(data || []);
    } catch (err) {
      console.error('Erreur lors du chargement des fichiers:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fonction pour supprimer un fichier
  const deleteFile = useCallback(async (fileId: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', fileId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // Mettre à jour la liste locale
      setFiles(prev => prev.filter(file => file.id !== fileId));
    } catch (err) {
      console.error('Erreur lors de la suppression du fichier:', err);
      throw err;
    }
  }, [userId]);

  // Fonction pour renommer un fichier
  const renameFile = useCallback(async (fileId: string, newName: string) => {
    if (!userId) return;

    try {
      const { error } = await supabase
        .from('files')
        .update({ filename: newName })
        .eq('id', fileId)
        .eq('user_id', userId);

      if (error) {
        throw error;
      }

      // Mettre à jour la liste locale
      setFiles(prev => prev.map(file => 
        file.id === fileId 
          ? { ...file, filename: newName }
          : file
      ));
    } catch (err) {
      console.error('Erreur lors du renommage du fichier:', err);
      throw err;
    }
  }, [userId]);

  // Charger les fichiers au montage et quand userId change
  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return {
    loading,
    error,
    files,
    setFiles,
    fetchFiles,
    deleteFile,
    renameFile,
  };
} 