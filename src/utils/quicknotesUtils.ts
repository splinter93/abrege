/**
 * Utilitaires pour Quicknotes (classeur par défaut)
 * Gestion des dossiers "PDF" et "Canvas" pour organiser les notes créées depuis le chat
 */

import { simpleLogger as logger } from '@/utils/logger';
import { V2UnifiedApi } from '@/services/V2UnifiedApi';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Classeur } from '@/store/useFileSystemStore';

const QUICKNOTES_NAME = 'Quicknotes';
const PDF_FOLDER_NAME = 'PDF';
const CANVAS_FOLDER_NAME = 'Canvas';

interface QuicknotesFolders {
  quicknotesClasseurId: string;
  pdfFolderId: string | null;
  canvasFolderId: string | null;
}

/**
 * Récupère ou crée les dossiers PDF et Canvas dans Quicknotes
 * @returns IDs du classeur Quicknotes et des dossiers PDF/Canvas
 */
export async function getOrCreateQuicknotesFolders(): Promise<QuicknotesFolders> {
  const v2Api = V2UnifiedApi.getInstance();

  // 1. Récupérer le classeur Quicknotes
  const classeursResult = await v2Api.getClasseurs();
  if (!classeursResult.success || !classeursResult.classeurs) {
    throw new Error('Erreur lors de la récupération des classeurs');
  }

  const quicknotesClasseur = (classeursResult.classeurs as Classeur[]).find(
    (c: Classeur) => c.name === QUICKNOTES_NAME
  );
  if (!quicknotesClasseur) {
    throw new Error(
      `Classeur "${QUICKNOTES_NAME}" non trouvé. Veuillez créer ce classeur d'abord.`
    );
  }

  const quicknotesClasseurId = quicknotesClasseur.id;

  // 2. Récupérer l'arborescence du classeur (retourne folders[] plat)
  const treeResult = await v2Api.getClasseurTree(quicknotesClasseurId);
  if (!treeResult.success) {
    throw new Error('Erreur lors de la récupération de l\'arborescence');
  }

  // Chercher les dossiers existants dans le tableau plat folders[]
  const folders = (treeResult.folders || []) as Array<{ id: string; name: string }>;
  let pdfFolderId: string | null =
    folders.find((f) => f.name === PDF_FOLDER_NAME)?.id ?? null;
  let canvasFolderId: string | null =
    folders.find((f) => f.name === CANVAS_FOLDER_NAME)?.id ?? null;

  // 3. Créer les dossiers manquants
  if (!pdfFolderId) {
    logger.info('[quicknotesUtils] Création dossier PDF dans Quicknotes');
    const createResult = await v2Api.createFolder({
      name: PDF_FOLDER_NAME,
      classeur_id: quicknotesClasseurId,
      parent_id: null,
    });
    if (createResult.success && createResult.folder) {
      pdfFolderId = createResult.folder.id;
      logger.info('[quicknotesUtils] ✅ Dossier PDF créé', { folderId: pdfFolderId });
    } else {
      logger.warn('[quicknotesUtils] ⚠️ Échec création dossier PDF', {
        error: createResult.error,
      });
    }
  }

  if (!canvasFolderId) {
    logger.info('[quicknotesUtils] Création dossier Canvas dans Quicknotes');
    const createResult = await v2Api.createFolder({
      name: CANVAS_FOLDER_NAME,
      classeur_id: quicknotesClasseurId,
      parent_id: null,
    });
    if (createResult.success && createResult.folder) {
      canvasFolderId = createResult.folder.id;
      logger.info('[quicknotesUtils] ✅ Dossier Canvas créé', {
        folderId: canvasFolderId,
      });
    } else {
      logger.warn('[quicknotesUtils] ⚠️ Échec création dossier Canvas', {
        error: createResult.error,
      });
    }
  }

  return {
    quicknotesClasseurId,
    pdfFolderId,
    canvasFolderId,
  };
}

/**
 * Version serveur : récupère ou crée les dossiers PDF et Canvas dans Quicknotes
 * Utilise Supabase directement (pour usage côté serveur)
 * @param userId - ID utilisateur
 * @param supabaseClient - Client Supabase (optionnel, utilise supabase par défaut)
 * @returns IDs du classeur Quicknotes et des dossiers PDF/Canvas
 */
export async function getOrCreateQuicknotesFoldersServer(
  userId: string,
  supabaseClient?: SupabaseClient
): Promise<QuicknotesFolders> {
  const { supabase } = await import('@/supabaseClient');
  const client = supabaseClient ?? supabase;

  // 1. Récupérer le classeur Quicknotes
  const { data: classeurs, error: classeursError } = await client
    .from('classeurs')
    .select('id, name')
    .eq('user_id', userId)
    .eq('name', QUICKNOTES_NAME)
    .single();

  if (classeursError || !classeurs) {
    throw new Error(
      `Classeur "${QUICKNOTES_NAME}" non trouvé. Veuillez créer ce classeur d'abord.`
    );
  }

  const quicknotesClasseurId = classeurs.id;

  // 2. Récupérer les dossiers existants du classeur
  const { data: folders, error: foldersError } = await client
    .from('folders')
    .select('id, name')
    .eq('classeur_id', quicknotesClasseurId)
    .eq('user_id', userId)
    .is('trashed_at', null);

  if (foldersError) {
    logger.warn('[quicknotesUtils] Erreur récupération dossiers', {
      error: foldersError.message,
    });
  }

  const foldersList = folders || [];
  let pdfFolderId: string | null =
    foldersList.find((f) => f.name === PDF_FOLDER_NAME)?.id ?? null;
  let canvasFolderId: string | null =
    foldersList.find((f) => f.name === CANVAS_FOLDER_NAME)?.id ?? null;

  // 3. Créer les dossiers manquants
  if (!pdfFolderId) {
    logger.info('[quicknotesUtils] Création dossier PDF dans Quicknotes (serveur)');
    const timestamp = Date.now().toString(36);
    const slug = `pdf-${timestamp}`;
    const { data: newFolder, error: createError } = await client
      .from('folders')
      .insert({
        name: PDF_FOLDER_NAME,
        classeur_id: quicknotesClasseurId,
        parent_id: null,
        user_id: userId,
        slug,
      })
      .select('id')
      .single();

    if (!createError && newFolder) {
      pdfFolderId = newFolder.id;
      logger.info('[quicknotesUtils] ✅ Dossier PDF créé (serveur)', {
        folderId: pdfFolderId,
      });
    } else {
      logger.warn('[quicknotesUtils] ⚠️ Échec création dossier PDF (serveur)', {
        error: createError?.message,
      });
    }
  }

  if (!canvasFolderId) {
    logger.info('[quicknotesUtils] Création dossier Canvas dans Quicknotes (serveur)');
    const timestamp = Date.now().toString(36);
    const slug = `canvas-${timestamp}`;
    const { data: newFolder, error: createError } = await client
      .from('folders')
      .insert({
        name: CANVAS_FOLDER_NAME,
        classeur_id: quicknotesClasseurId,
        parent_id: null,
        user_id: userId,
        slug,
      })
      .select('id')
      .single();

    if (!createError && newFolder) {
      canvasFolderId = newFolder.id;
      logger.info('[quicknotesUtils] ✅ Dossier Canvas créé (serveur)', {
        folderId: canvasFolderId,
      });
    } else {
      logger.warn('[quicknotesUtils] ⚠️ Échec création dossier Canvas (serveur)', {
        error: createError?.message,
      });
    }
  }

  return {
    quicknotesClasseurId,
    pdfFolderId,
    canvasFolderId,
  };
}
