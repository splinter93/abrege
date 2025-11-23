/**
 * Schemas Zod pour validation requetes API Canva V2
 * 
 * Architecture REST clean:
 * - POST /canva/sessions → createCanvaSessionSchema
 * - GET /canva/sessions?chat_session_id=X → listCanvaSessionsSchema
 * - PATCH /canva/sessions/{id} → updateCanvaSessionSchema
 * - DELETE /canva/sessions/{id} → pas de body
 */

import { z } from 'zod';

/**
 * Schema statut canva (enum reusable)
 */
export const canvaStatusSchema = z.enum(['open', 'closed', 'saved', 'deleted'], {
  errorMap: () => ({ message: 'status doit etre: open, closed, saved ou deleted' })
});

/**
 * Schema POST /canva/sessions
 * Creer ou ouvrir session canva
 * 
 * Logique simple :
 * - Si note_id est fourni → ouvre cette note existante
 * - Si note_id est absent → crée un nouveau canvas (title devient obligatoire)
 */
export const createCanvaSessionSchema = z.object({
  chat_session_id: z.string().uuid('chat_session_id doit être un UUID valide'),
  note_id: z.string().min(1).optional(),
  title: z.string().min(1).max(255).optional(),
  classeur_id: z.string().min(1).optional(),
  initial_content: z.string().max(100_000).optional(),
  metadata: z.record(z.any()).optional()
}).superRefine((data, ctx) => {
  // Si note_id est absent, title devient obligatoire (création d'un nouveau canvas)
  if (!data.note_id && !data.title) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'title est obligatoire quand note_id est absent (création d\'un nouveau canvas)',
      path: ['title']
    });
  }
});

/**
 * Schema GET /canva/sessions (query params)
 */
export const listCanvaSessionsSchema = z.object({
  chat_session_id: z.string().uuid('chat_session_id doit être un UUID valide'),
  status: z.array(canvaStatusSchema).optional(),
  include_note: z.boolean().optional()
});

/**
 * Schema PATCH /canva/sessions/{id}
 * Update statut ou metadata
 */
export const updateCanvaSessionSchema = z.object({
  status: canvaStatusSchema.optional(),
  metadata: z.record(z.any()).optional(),
  reason: z.enum(['user_action', 'inactivity', 'llm_tool']).optional()
}).refine((data) => data.status || data.metadata, {
  message: 'Au moins status ou metadata doit être fourni'
});

/**
 * Schema sauvegarde canva (legacy, peut etre deprecated)
 */
export const saveCanvaSchema = z.object({
  classeur_id: z.string().uuid('classeur_id doit etre un UUID valide'),
  folder_id: z.string().uuid('folder_id doit etre un UUID valide').nullable().optional()
});

/**
 * Type inference
 */
export type CanvaStatusInput = z.infer<typeof canvaStatusSchema>;
export type CreateCanvaSessionInput = z.infer<typeof createCanvaSessionSchema>;
export type ListCanvaSessionsInput = z.infer<typeof listCanvaSessionsSchema>;
export type UpdateCanvaSessionInput = z.infer<typeof updateCanvaSessionSchema>;
export type SaveCanvaInput = z.infer<typeof saveCanvaSchema>;

