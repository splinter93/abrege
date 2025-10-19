import { z } from 'zod';
import { simpleLogger as logger } from '@/utils/logger';

// ========================================
// VALIDATION DES PROPS DES COMPOSANTS CHAT
// ========================================

/**
 * Schéma de validation pour les messages de chat
 */
export const ChatMessageSchema = z.object({
  id: z.string().optional(),
  role: z.enum(['user', 'assistant', 'system', 'tool']),
  content: z.string().nullable(),
  reasoning: z.string().nullable().optional(),
  timestamp: z.string(),
  tool_calls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string()
    })
  })).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
  tool_results: z.array(z.object({
    tool_call_id: z.string(),
    name: z.string(),
    content: z.string(),
    success: z.boolean().optional()
  })).optional(),
  isStreaming: z.boolean().optional()
});

/**
 * Schéma de validation pour les sessions de chat
 */
export const ChatSessionSchema = z.object({
  id: z.string(),
  name: z.string(),
  thread: z.array(ChatMessageSchema),
  history_limit: z.number().min(1).max(1000),
  created_at: z.string(),
  updated_at: z.string()
});

/**
 * Schéma de validation pour les agents
 */
export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  model: z.string(),
  provider: z.string(),
  system_instructions: z.string().optional(),
  context_template: z.string().optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().min(1).max(100000).optional()
});

/**
 * Schéma de validation pour les props du composant ChatMessageOptimized
 */
export const ChatMessageOptimizedPropsSchema = z.object({
  message: ChatMessageSchema,
  className: z.string().optional(),
  animateContent: z.boolean().optional()
});

/**
 * Schéma de validation pour les props du composant ChatInput
 */
export const ChatInputPropsSchema = z.object({
  onSend: z.function().args(z.string()).returns(z.void()),
  loading: z.boolean(),
  textareaRef: z.object({
    current: z.unknown().nullable()
  })
});

/**
 * Schéma de validation pour les props du composant CopyButton
 */
export const CopyButtonPropsSchema = z.object({
  content: z.string(),
  className: z.string().optional()
});

/**
 * Schéma de validation pour les props du composant ToolCallMessage
 */
export const ToolCallMessagePropsSchema = z.object({
  toolCalls: z.array(z.object({
    id: z.string(),
    type: z.literal('function'),
    function: z.object({
      name: z.string(),
      arguments: z.string()
    })
  })),
  toolResults: z.array(z.object({
    tool_call_id: z.string(),
    name: z.string(),
    content: z.string(),
    success: z.boolean().optional()
  })).optional(),
  className: z.string().optional()
});

/**
 * Schéma de validation pour les props du composant LoadingSpinner
 */
export const LoadingSpinnerPropsSchema = z.object({
  size: z.number().min(1).max(100).optional(),
  className: z.string().optional(),
  variant: z.enum(['default', 'dots', 'pulse', 'spinner']).optional(),
  color: z.string().optional()
});

// ========================================
// FONCTIONS DE VALIDATION UTILITAIRES
// ========================================

/**
 * Valide les props d'un composant et retourne un objet avec les données validées
 * ou une erreur de validation
 */
export function validateProps<T>(
  schema: z.ZodSchema<T>,
  props: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(props);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join(', ');
      return { success: false, error: `Validation failed: ${errorMessage}` };
    }
    return { success: false, error: 'Unknown validation error' };
  }
}

/**
 * Hook de validation pour les composants React
 * Affiche des warnings en développement si les props sont invalides
 */
export function usePropsValidation<T>(
  schema: z.ZodSchema<T>,
  props: unknown,
  componentName: string
): T {
  if (process.env.NODE_ENV === 'development') {
    const validation = validateProps(schema, props);
    if (!validation.success) {
      logger.warn(
        `[${componentName}] Props validation failed:`,
        validation.error,
        '\nProps received:',
        props
      );
    }
  }
  
  // En production, on fait confiance aux props
  return props as T;
} 