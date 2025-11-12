/**
 * Schemas Zod pour validation requetes API Canva
 * 
 * Conformite standards GAFAM: validation stricte, messages clairs
 */

import { z } from 'zod';

/**
 * Schema creation canva
 */
export const createCanvaSchema = z.object({
  chat_session_id: z.string().uuid('chat_session_id doit etre un UUID valide'),
  title: z.string().max(255, 'title trop long (max 255 caracteres)').optional(),
  initial_content: z.string().optional()
});

/**
 * Schema sauvegarde canva
 */
export const saveCanvaSchema = z.object({
  classeur_id: z.string().uuid('classeur_id doit etre un UUID valide'),
  folder_id: z.string().uuid('folder_id doit etre un UUID valide').nullable().optional()
});

/**
 * Schema statut canva
 */
export const canvaStatusSchema = z.enum(['open', 'closed', 'saved', 'deleted'], {
  errorMap: () => ({ message: 'status doit etre: open, closed, saved ou deleted' })
});

/**
 * Schema update statut canva
 */
export const updateCanvaStatusSchema = z.object({
  status: canvaStatusSchema
});

/**
 * Type inference
 */
export type CreateCanvaInput = z.infer<typeof createCanvaSchema>;
export type SaveCanvaInput = z.infer<typeof saveCanvaSchema>;
export type CanvaStatusInput = z.infer<typeof canvaStatusSchema>;
export type UpdateCanvaStatusInput = z.infer<typeof updateCanvaStatusSchema>;

