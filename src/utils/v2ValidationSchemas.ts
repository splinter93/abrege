import { z } from 'zod';
import { NextResponse } from 'next/server';

// ============================================================================
// NOTE MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Schéma pour créer une note V2
 */
export const createNoteV2Schema = z.object({
  source_title: z.string().min(1, 'source_title requis').max(255, 'source_title trop long'),
  notebook_id: z.string().min(1, 'notebook_id OBLIGATOIRE'),
  markdown_content: z.string().optional().default(''),
  header_image: z.string().url('header_image doit être une URL valide').optional(),
  folder_id: z.string().uuid('folder_id doit être un UUID valide').optional(),
});

/**
 * Schéma pour mettre à jour une note V2
 */
export const updateNoteV2Schema = z.object({
  source_title: z.string().min(1, 'source_title requis').max(255, 'source_title trop long').optional(),
  markdown_content: z.string().optional(),
  html_content: z.string().optional(),
  header_image: z.string().url('header_image doit être une URL valide').optional(),
  folder_id: z.string().uuid('folder_id doit être un UUID valide').optional(),
  description: z.string().max(500, 'description trop longue').optional(),
});

/**
 * Schéma pour déplacer une note V2
 */
export const moveNoteV2Schema = z.object({
  folder_id: z.string().uuid('folder_id doit être un UUID valide').nullable(),
});

/**
 * Schéma pour fusionner des notes V2
 */
export const mergeNoteV2Schema = z.object({
  targetNoteId: z.string().uuid('targetNoteId doit être un UUID valide'),
  mergeStrategy: z.enum(['append', 'prepend', 'replace'], {
    errorMap: () => ({ message: 'mergeStrategy doit être append, prepend ou replace' })
  }),
});

// ============================================================================
// NOTE CONTENT SCHEMAS
// ============================================================================

/**
 * Schéma pour ajouter du contenu V2
 */
export const addContentV2Schema = z.object({
  content: z.string().min(1, 'content requis'),
});

/**
 * Schéma pour insérer du contenu à une position spécifique V2
 */
export const insertContentV2Schema = z.object({
  content: z.string().min(1, 'content requis'),
  position: z.number().int('position doit être un entier').min(0, 'position doit être >= 0'),
});

/**
 * Schéma pour ajouter du contenu à une section V2
 */
export const addToSectionV2Schema = z.object({
  sectionId: z.string().min(1, 'sectionId requis'),
  content: z.string().min(1, 'content requis'),
});

/**
 * Schéma pour vider une section V2
 */
export const clearSectionV2Schema = z.object({
  sectionId: z.string().min(1, 'sectionId requis'),
});

/**
 * Schéma pour supprimer une section V2
 */
export const eraseSectionV2Schema = z.object({
  sectionId: z.string().min(1, 'sectionId requis'),
});

/**
 * Schéma pour remplacer le contenu V2
 */
export const updateContentV2Schema = z.object({
  content: z.string().min(1, 'content requis'),
});

/**
 * Schéma pour publier une note V2
 */
export const publishNoteV2Schema = z.object({
  visibility: z.enum(['private', 'public', 'link-private', 'link-public', 'limited', 'scrivia']),
});

// ============================================================================
// FOLDER MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Schéma pour créer un dossier V2
 */
export const createFolderV2Schema = z.object({
  name: z.string().min(1, 'name requis').max(255, 'name trop long'),
  notebook_id: z.string().min(1, 'notebook_id OBLIGATOIRE'),
  parent_id: z.string().uuid('parent_id doit être un UUID valide').optional(),
});

/**
 * Schéma pour mettre à jour un dossier V2
 */
export const updateFolderV2Schema = z.object({
  name: z.string().min(1, 'name requis').max(255, 'name trop long').optional(),
  parent_id: z.string().uuid('parent_id doit être un UUID valide').optional(),
});

/**
 * Schéma pour déplacer un dossier V2
 */
export const moveFolderV2Schema = z.object({
  parent_id: z.string().uuid('parent_id doit être un UUID valide').nullable(),
});

// ============================================================================
// CLASSEUR MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Schéma pour créer un classeur V2
 */
export const createClasseurV2Schema = z.object({
  name: z.string().min(1, 'name requis').max(255, 'name trop long'),
  description: z.string().max(500, 'description trop longue').optional(),
  icon: z.string().optional(),
});

/**
 * Schéma pour mettre à jour un classeur V2
 */
export const updateClasseurV2Schema = z.object({
  name: z.string().min(1, 'name requis').max(255, 'name trop long').optional(),
  description: z.string().max(500, 'description trop longue').optional(),
  icon: z.string().optional(),
  position: z.number().int('position doit être un entier').min(0, 'position doit être >= 0').optional(),
});

/**
 * Schéma pour réorganiser les classeurs V2
 */
export const reorderClasseursV2Schema = z.object({
  classeurs: z.array(
    z.object({
      id: z.string().uuid('id doit être un UUID valide'),
      position: z.number().int('position doit être un entier').min(0, 'position doit être >= 0'),
    })
  ).min(1, 'au moins un classeur requis'),
});

/**
 * Schéma pour générer un slug V2
 */
export const generateSlugV2Schema = z.object({
  text: z.string().min(1, 'text requis'),
  type: z.enum(['note', 'classeur', 'folder'], {
    errorMap: () => ({ message: 'type doit être note, classeur ou folder' })
  }),
});

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Schéma de réponse pour les insights V2
 */
export const insightsResponseV2Schema = z.object({
  success: z.boolean(),
  insight: z.string().optional(),
  noteId: z.string().uuid(),
  title: z.string(),
});

/**
 * Schéma de réponse pour le contenu V2
 */
export const contentResponseV2Schema = z.object({
  success: z.boolean(),
  content: z.string().optional(),
  noteId: z.string().uuid(),
});

/**
 * Schéma de réponse pour les métadonnées V2
 */
export const metadataResponseV2Schema = z.object({
  success: z.boolean(),
  metadata: z.object({
    source_title: z.string(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
    folder_id: z.string().uuid().nullable(),
    description: z.string().nullable(),
    visibility: z.enum(['private', 'shared', 'members', 'public']),
    view_count: z.number().int().min(0),
  }),
});

/**
 * Schéma de réponse pour l'arborescence V2
 */
export const treeResponseV2Schema = z.object({
  success: z.boolean(),
  tree: z.object({
    id: z.string().uuid(),
    name: z.string(),
    children: z.array(z.any()).optional(),
    folders: z.array(z.any()).optional(),
    notes: z.array(z.any()).optional(),
  }),
});

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Valide un payload avec un schéma Zod et retourne une réponse d'erreur si invalide
 */
export function validatePayload<T>(schema: z.ZodSchema<T>, payload: any): { success: true; data: T } | { success: false; error: string; details: string[] } {
  const parseResult = schema.safeParse(payload);
  
  if (!parseResult.success) {
    return {
      success: false,
      error: 'Payload invalide',
      details: parseResult.error.errors.map(e => e.message)
    };
  }
  
  return {
    success: true,
    data: parseResult.data
  };
}

/**
 * Crée une réponse d'erreur de validation
 */
export function createValidationErrorResponse(validationResult: { success: false; error: string; details: string[] }): NextResponse {
  return NextResponse.json(
    {
      error: validationResult.error,
      details: validationResult.details
    },
    { status: 422 }
  );
} 