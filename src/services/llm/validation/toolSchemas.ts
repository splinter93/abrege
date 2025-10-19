/**
 * Schémas de validation Zod pour les arguments des tool calls
 * Validation stricte avant exécution pour éviter les erreurs API
 */

import { z } from 'zod';

// ==================== NOTES ====================

export const createNoteSchema = z.object({
  source_title: z.string().min(1, 'Le titre est requis').max(255, 'Titre trop long (max 255 caractères)'),
  markdown_content: z.string().optional(),
  notebook_id: z.string().uuid('notebook_id doit être un UUID valide'),
  folder_id: z.string().uuid('folder_id doit être un UUID valide').optional(),
  header_image: z.string().url('header_image doit être une URL valide').optional()
});

export const getNoteSchema = z.object({
  ref: z.string().min(1, 'ref est requis (ID ou slug)')
});

export const updateNoteSchema = z.object({
  ref: z.string().min(1, 'ref est requis (ID ou slug)'),
  source_title: z.string().min(1).max(255).optional(),
  markdown_content: z.string().optional(),
  description: z.string().max(500).optional(),
  folder_id: z.string().uuid().optional(),
  header_image: z.string().url().optional(),
  header_image_blur: z.number().min(0).max(5).optional(),
  header_image_offset: z.number().min(0).max(100).optional(),
  header_image_overlay: z.number().min(0).max(5).optional(),
  a4_mode: z.boolean().optional(),
  wide_mode: z.boolean().optional(),
  header_title_in_image: z.boolean().optional()
});

export const moveNoteSchema = z.object({
  ref: z.string().min(1, 'ref est requis'),
  classeur_id: z.string().uuid('classeur_id doit être un UUID'),
  folder_id: z.string().uuid().optional(),
  position: z.number().int().min(0).optional()
});

export const insertNoteContentSchema = z.object({
  ref: z.string().min(1, 'ref est requis'),
  content: z.string().min(1, 'content est requis'),
  position: z.number().int().min(0).optional(),
  where: z.enum(['before', 'after', 'replace']).optional()
});

export const getNoteTOCSchema = z.object({
  ref: z.string().min(1, 'ref est requis')
});

export const getNoteShareSettingsSchema = z.object({
  ref: z.string().min(1, 'ref est requis')
});

export const updateNoteShareSettingsSchema = z.object({
  ref: z.string().min(1, 'ref est requis'),
  visibility: z.enum(['private', 'link-private', 'link-public', 'limited', 'scrivia']).optional(),
  allow_comments: z.boolean().optional(),
  allow_edit: z.boolean().optional(),
  invited_users: z.array(z.string()).optional(),
  link_expires: z.string().datetime().optional()
});

// ==================== CLASSEURS ====================

export const listClasseursSchema = z.object({});

export const getClasseurSchema = z.object({
  ref: z.string().min(1, 'ref est requis')
});

export const createClasseurSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Nom trop long'),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Format couleur invalide (ex: #FF5733)').optional(),
  position: z.number().int().min(0).optional()
});

export const updateClasseurSchema = z.object({
  ref: z.string().min(1, 'ref est requis'),
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  position: z.number().int().min(0).optional()
});

export const getClasseurTreeSchema = z.object({
  ref: z.string().min(1, 'ref est requis')
});

export const reorderClasseursSchema = z.object({
  classeur_orders: z.array(z.object({
    classeur_id: z.string().uuid('classeur_id doit être un UUID'),
    position: z.number().int().min(0, 'Position doit être >= 0')
  })).min(1, 'classeur_orders ne peut pas être vide')
});

// ==================== FOLDERS ====================

export const getFolderSchema = z.object({
  ref: z.string().min(1, 'ref est requis')
});

export const createFolderSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(255, 'Nom trop long'),
  classeur_id: z.string().uuid('classeur_id doit être un UUID'),
  parent_folder_id: z.string().uuid().optional(),
  position: z.number().int().min(0).optional()
});

export const updateFolderSchema = z.object({
  ref: z.string().min(1, 'ref est requis'),
  name: z.string().min(1).max(255).optional(),
  position: z.number().int().min(0).optional()
});

export const moveFolderSchema = z.object({
  ref: z.string().min(1, 'ref est requis'),
  classeur_id: z.string().uuid('classeur_id doit être un UUID'),
  parent_folder_id: z.string().uuid().optional(),
  position: z.number().int().min(0).optional()
});

export const getFolderTreeSchema = z.object({
  ref: z.string().min(1, 'ref est requis')
});

// ==================== SEARCH ====================

export const searchContentSchema = z.object({
  q: z.string().min(1, 'La requête de recherche est requise'),
  limit: z.number().int().min(1).max(100).optional(),
  classeur_id: z.string().uuid().optional(),
  type: z.enum(['all', 'notes', 'classeurs', 'files']).optional()
});

export const searchFilesSchema = z.object({
  q: z.string().min(1, 'La requête de recherche est requise'),
  limit: z.number().int().min(1).max(100).optional(),
  classeur_id: z.string().uuid().optional(),
  file_type: z.enum(['all', 'image', 'document', 'pdf', 'text']).optional()
});

// ==================== DELETE ====================

export const deleteResourceSchema = z.object({
  resource: z.enum(['note', 'folder', 'classeur', 'file'], {
    errorMap: () => ({ message: 'Type de ressource invalide' })
  }),
  ref: z.string().min(1, 'ref est requis')
});

// ==================== AGENTS ====================

export const listAgentsSchema = z.object({});

export const getAgentSchema = z.object({
  agentId: z.string().min(1, 'agentId est requis')
});

export const createAgentSchema = z.object({
  display_name: z.string().min(1).max(255, 'Nom trop long'),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, 'Slug invalide (a-z, 0-9, -)'),
  description: z.string().max(1000),
  model: z.enum([
    'openai/gpt-oss-20b',
    'openai/gpt-oss-120b',
    'meta-llama/llama-4-scout-17b-16e-instruct',
    'meta-llama/llama-4-maverick-17b-128e-instruct',
    'kimi-k2-0905'
  ], { errorMap: () => ({ message: 'Modèle non supporté' }) }),
  system_instructions: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(10000).optional(),
  provider: z.enum(['groq', 'openai', 'anthropic']).optional(),
  is_chat_agent: z.boolean().optional(),
  input_schema: z.record(z.unknown()).optional(),
  output_schema: z.record(z.unknown()).optional(),
  api_v2_capabilities: z.array(z.string()).optional()
});

export const executeAgentSchema = z.object({
  ref: z.string().min(1, 'ref est requis (ID ou slug)'),
  input: z.string().min(1, 'input est requis'),
  image: z.string().url().optional(),
  options: z.object({
    temperature: z.number().min(0).max(2).optional(),
    max_tokens: z.number().int().min(1).max(10000).optional(),
    stream: z.boolean().optional()
  }).optional()
});

// ==================== PROFILE ====================

export const getUserProfileSchema = z.object({});

// ==================== CONTENT OPERATIONS ====================

export const applyContentOperationsSchema = z.object({
  ref: z.string().min(1, 'ref est requis'),
  ops: z.array(z.object({
    id: z.string().min(1, 'id est requis'),
    action: z.enum(['insert', 'replace', 'delete', 'upsert_section']),
    target: z.object({
      type: z.enum(['heading', 'regex', 'position', 'anchor']),
      heading: z.object({
        heading_id: z.string().optional(),
        level: z.number().int().min(1).max(6).optional(),
        path: z.array(z.string()).optional()
      }).optional(),
      regex: z.object({
        pattern: z.string().max(1000),
        flags: z.string().max(10).optional(),
        nth: z.number().int().optional()
      }).optional(),
      position: z.object({
        mode: z.enum(['offset', 'start', 'end']),
        offset: z.number().int().min(0).optional()
      }).optional(),
      anchor: z.object({
        name: z.enum(['doc_start', 'doc_end', 'after_toc', 'before_first_heading'])
      }).optional()
    }),
    where: z.enum(['before', 'after', 'inside_start', 'inside_end', 'at', 'replace_match']),
    content: z.string().max(100000).optional(),
    options: z.object({
      surround_with_blank_lines: z.number().int().min(0).max(3).optional(),
      dedent: z.boolean().optional(),
      ensure_heading: z.boolean().optional()
    }).optional()
  })).min(1, 'ops ne peut pas être vide'),
  dry_run: z.boolean().optional(),
  transaction: z.enum(['all_or_nothing', 'best_effort']).optional(),
  conflict_strategy: z.enum(['fail', 'skip']).optional(),
  return: z.enum(['content', 'diff', 'none']).optional(),
  idempotency_key: z.string().uuid().optional()
});

// ==================== MAP DE TOUS LES SCHÉMAS ====================

export const TOOL_SCHEMAS: Record<string, z.ZodType<unknown>> = {
  // Notes
  createNote: createNoteSchema,
  getNote: getNoteSchema,
  updateNote: updateNoteSchema,
  moveNote: moveNoteSchema,
  insertNoteContent: insertNoteContentSchema,
  getNoteTOC: getNoteTOCSchema,
  getNoteShareSettings: getNoteShareSettingsSchema,
  updateNoteShareSettings: updateNoteShareSettingsSchema,
  
  // Classeurs
  listClasseurs: listClasseursSchema,
  getClasseur: getClasseurSchema,
  createClasseur: createClasseurSchema,
  updateClasseur: updateClasseurSchema,
  getClasseurTree: getClasseurTreeSchema,
  reorderClasseurs: reorderClasseursSchema,
  
  // Folders
  getFolder: getFolderSchema,
  createFolder: createFolderSchema,
  updateFolder: updateFolderSchema,
  moveFolder: moveFolderSchema,
  getFolderTree: getFolderTreeSchema,
  
  // Search
  searchContent: searchContentSchema,
  searchFiles: searchFilesSchema,
  
  // Delete
  deleteResource: deleteResourceSchema,
  
  // Agents
  listAgents: listAgentsSchema,
  getAgent: getAgentSchema,
  createAgent: createAgentSchema,
  executeAgent: executeAgentSchema,
  
  // Profile
  getUserProfile: getUserProfileSchema,
  
  // Content Operations
  applyContentOperations: applyContentOperationsSchema
};

/**
 * Valide les arguments d'un tool call
 * @param toolName Nom du tool
 * @param args Arguments à valider
 * @returns Résultat de validation Zod
 */
export function validateToolArgs(toolName: string, args: unknown) {
  const schema = TOOL_SCHEMAS[toolName];
  
  if (!schema) {
    // Pas de schéma défini pour ce tool → skip validation
    return { success: true, data: args };
  }
  
  return schema.safeParse(args);
}

