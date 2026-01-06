/**
 * Helpers pour les mutations de notes
 * Logique réutilisable extraite pour respecter limite 300 lignes
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md:
 * - Max 300 lignes par fichier
 * - Fonctions < 50 lignes
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { logApi } from '@/utils/logger';
import { SlugAndUrlService } from '@/services/slugAndUrlService';
import { sanitizeMarkdownContent } from '@/utils/markdownSanitizer.server';
import { sanitizeNoteEmbedHtml } from '@/utils/sanitizeNoteEmbedHtml';
import type { UpdateNoteData } from '@/utils/database/types/databaseTypes';

/**
 * Préparer les données de mise à jour d'une note
 * @param currentNote - Note actuelle depuis la DB
 * @param data - Données de mise à jour
 * @param noteId - ID de la note
 * @param userId - ID utilisateur
 * @param supabase - Client Supabase
 * @returns Données préparées pour UPDATE
 */
export async function prepareNoteUpdateData(
  currentNote: {
    id: string;
    slug: string | null;
    public_url: string | null;
    wide_mode: boolean | null;
    a4_mode: boolean | null;
    slash_lang: string | null;
    font_family: string | null;
    folder_id: string | null;
    description: string | null;
    source_title: string | null;
    header_image: string | null;
    header_image_offset: number | null;
    header_image_blur: number | null;
    header_image_overlay: number | null;
    header_title_in_image: boolean | null;
  },
  data: UpdateNoteData,
  noteId: string,
  userId: string,
  supabase: SupabaseClient
): Promise<Record<string, unknown>> {
  // Préparer les données de mise à jour avec valeurs par défaut
  const updateData: Record<string, unknown> = {
    wide_mode: currentNote.wide_mode,
    a4_mode: currentNote.a4_mode,
    slash_lang: currentNote.slash_lang,
    font_family: currentNote.font_family,
    folder_id: currentNote.folder_id,
    description: currentNote.description
  };
  
  // Préserver header_image et settings si non fournis
  if (data.header_image === undefined) updateData.header_image = currentNote.header_image;
  if (data.header_image_offset === undefined) updateData.header_image_offset = currentNote.header_image_offset;
  if (data.header_image_blur === undefined) updateData.header_image_blur = currentNote.header_image_blur;
  if (data.header_image_overlay === undefined) updateData.header_image_overlay = currentNote.header_image_overlay;
  if (data.header_title_in_image === undefined) updateData.header_title_in_image = currentNote.header_title_in_image;
  
  // Mettre à jour le titre et slug si nécessaire
  if (data.source_title !== undefined) {
    const normalizedTitle = String(data.source_title).trim();
    updateData.source_title = normalizedTitle;
    
    if (normalizedTitle && normalizedTitle !== currentNote.source_title) {
      try {
        const supabaseForSlug = supabase as unknown as Parameters<typeof SlugAndUrlService.updateNoteSlugAndUrl>[3];
        const currentNoteForSlug = {
          id: currentNote.id ?? '',
          source_title: currentNote.source_title ?? '',
          slug: currentNote.slug ?? '',
          public_url: currentNote.public_url ?? null
        };
        const { slug: newSlug, publicUrl } = await SlugAndUrlService.updateNoteSlugAndUrl(
          noteId,
          normalizedTitle,
          userId,
          supabaseForSlug,
          currentNoteForSlug
        );
        updateData.slug = newSlug;
        updateData.public_url = publicUrl;
      } catch (error) {
        logApi.error(`❌ Erreur mise à jour slug/URL: ${error}`);
      }
    }
  }
  
  // Sanitizer le contenu
  if (data.markdown_content !== undefined) {
    updateData.markdown_content = sanitizeMarkdownContent(data.markdown_content);
  }
  if (data.html_content !== undefined) {
    updateData.html_content = sanitizeNoteEmbedHtml(data.html_content);
  }
  
  // Mettre à jour les autres champs
  if (data.header_image !== undefined) updateData.header_image = data.header_image;
  if (data.header_image_offset !== undefined) {
    updateData.header_image_offset = Math.round(data.header_image_offset * 10) / 10;
  }
  if (data.header_image_blur !== undefined) updateData.header_image_blur = data.header_image_blur;
  if (data.header_image_overlay !== undefined) updateData.header_image_overlay = data.header_image_overlay;
  if (data.header_title_in_image !== undefined) updateData.header_title_in_image = data.header_title_in_image;
  if (data.wide_mode !== undefined) updateData.wide_mode = data.wide_mode;
  if (data.a4_mode !== undefined) updateData.a4_mode = data.a4_mode;
  if (data.slash_lang !== undefined) updateData.slash_lang = data.slash_lang;
  if (data.font_family !== undefined) updateData.font_family = data.font_family;
  if (data.folder_id !== undefined) updateData.folder_id = data.folder_id;
  if (data.description !== undefined) updateData.description = data.description;
  
  updateData.updated_at = new Date().toISOString();
  
  return updateData;
}

