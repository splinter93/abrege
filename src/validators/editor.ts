/**
 * Validators Zod pour l'éditeur
 * 
 * Conformité GUIDE-EXCELLENCE-CODE.md: Validation Zod inputs API/DB
 * 
 * Schemas:
 * - EditorTitleSchema : string, max 200 chars
 * - EditorContentSchema : string, max 1M chars (markdown)
 */

import { z } from 'zod';

/**
 * Schema pour valider le titre d'une note
 * - String non vide
 * - Max 200 caractères
 */
export const EditorTitleSchema = z
  .string()
  .min(1, 'Le titre ne peut pas être vide')
  .max(200, 'Le titre ne peut pas dépasser 200 caractères')
  .trim();

/**
 * Schema pour valider le contenu markdown d'une note
 * - String (peut être vide)
 * - Max 1M caractères (1,000,000)
 */
export const EditorContentSchema = z
  .string()
  .max(1_000_000, 'Le contenu ne peut pas dépasser 1M caractères')
  .default('');

/**
 * Type inféré depuis EditorTitleSchema
 */
export type EditorTitle = z.infer<typeof EditorTitleSchema>;

/**
 * Type inféré depuis EditorContentSchema
 */
export type EditorContent = z.infer<typeof EditorContentSchema>;

/**
 * Valider le titre d'une note
 * 
 * @param title - Titre à valider
 * @returns Résultat de validation (success: true/false, data/error)
 */
export function validateEditorTitle(title: string): {
  success: boolean;
  data?: EditorTitle;
  error?: z.ZodError;
} {
  try {
    const data = EditorTitleSchema.parse(title);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Valider le contenu markdown d'une note
 * 
 * @param content - Contenu à valider
 * @returns Résultat de validation (success: true/false, data/error)
 */
export function validateEditorContent(content: string): {
  success: boolean;
  data?: EditorContent;
  error?: z.ZodError;
} {
  try {
    const data = EditorContentSchema.parse(content);
    return { success: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

/**
 * Valider le titre et le contenu ensemble
 * 
 * @param title - Titre à valider
 * @param content - Contenu à valider
 * @returns Résultat de validation (success: true/false, data/error)
 */
export function validateEditorData(title: string, content: string): {
  success: boolean;
  data?: { title: EditorTitle; content: EditorContent };
  errors?: { title?: z.ZodError; content?: z.ZodError };
} {
  const titleResult = validateEditorTitle(title);
  const contentResult = validateEditorContent(content);

  if (titleResult.success && contentResult.success) {
    return {
      success: true,
      data: {
        title: titleResult.data!,
        content: contentResult.data!,
      },
    };
  }

  return {
    success: false,
    errors: {
      ...(titleResult.error ? { title: titleResult.error } : {}),
      ...(contentResult.error ? { content: contentResult.error } : {}),
    },
  };
}



