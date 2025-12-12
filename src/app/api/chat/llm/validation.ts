/**
 * Validation Zod pour les routes API chat
 * Garantit la sûreté des types et la validation stricte des inputs
 */

import { z } from 'zod';

/**
 * Schéma pour les métadonnées de note (lightweight)
 */
const noteMentionSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  word_count: z.number().int().nonnegative().optional(),
  created_at: z.string().optional()
});

/**
 * Schéma pour les métadonnées de prompt
 */
const promptMentionSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string(),
  description: z.string().nullable().optional(),
  context: z.enum(['editor', 'chat', 'both']).optional(),
  agent_id: z.string().uuid().nullable().optional(),
  placeholderValues: z.record(z.string()).optional()
});

/**
 * Schéma pour les notes attachées (full content)
 */
const attachedNoteSchema = z.object({
  id: z.string().uuid(),
  slug: z.string().min(1),
  title: z.string(),
  markdown_content: z.string()
});

/**
 * Schéma pour un message text simple
 */
const textContentSchema = z.object({
  type: z.literal('text'),
  text: z.string()
});

/**
 * Schéma pour un message image
 */
const imageContentSchema = z.object({
  type: z.literal('image_url'),
  image_url: z.object({
    url: z.string(),
    detail: z.enum(['auto', 'low', 'high']).optional()
  })
});

/**
 * Schéma pour MessageContent (string ou array multi-modal)
 */
const messageContentSchema = z.union([
  z.string(),
  z.array(z.union([textContentSchema, imageContentSchema]))
]);

/**
 * Schéma pour le contexte UI
 */
const uiContextSchema = z.object({
  sessionId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  provider: z.string().optional(),
  type: z.string().optional(),
  name: z.string().optional(),
  id: z.string().optional(),
  attachedNotes: z.array(attachedNoteSchema).optional(),
  mentionedNotes: z.array(noteMentionSchema).optional(),
  prompts: z.array(promptMentionSchema).optional(),
  canva_context: z.unknown().optional() // Structure complexe, validation partielle
}).passthrough(); // Autoriser champs additionnels pour extensibilité

/**
 * Schéma pour l'historique (messages simples)
 */
const chatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['system', 'user', 'assistant', 'tool']),
  content: z.union([z.string(), z.null()]),
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal('function').optional(),
    function: z.object({
      name: z.string(),
      arguments: z.string()
    })
  })).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
  timestamp: z.string().optional(),
  channel: z.string().optional()
});

/**
 * Schéma pour le body de /api/chat/llm
 */
export const llmRequestSchema = z.object({
  message: z.string().min(1, 'Message requis'),
  context: uiContextSchema,
  history: z.array(chatMessageSchema),
  provider: z.string().optional()
});

/**
 * Schéma pour le body de /api/chat/llm/stream
 */
export const llmStreamRequestSchema = z.object({
  message: messageContentSchema.optional(), // Optionnel si skipAddingUserMessage = true
  context: uiContextSchema,
  history: z.array(chatMessageSchema),
  agentConfig: z.unknown().optional(), // AgentConfig complexe, validation partielle
  skipAddingUserMessage: z.boolean().optional().default(false)
}).refine(
  (data) => {
    // Si skipAddingUserMessage est false, message est requis
    if (!data.skipAddingUserMessage) {
      return data.message !== undefined && data.message !== null;
    }
    return true;
  },
  {
    message: 'Message requis quand skipAddingUserMessage est false',
    path: ['message']
  }
);

/**
 * Types inférés depuis les schémas Zod
 */
export type LLMRequest = z.infer<typeof llmRequestSchema>;
export type LLMStreamRequest = z.infer<typeof llmStreamRequestSchema>;
export type UIContext = z.infer<typeof uiContextSchema>;
export type ChatMessageValidated = z.infer<typeof chatMessageSchema>;




