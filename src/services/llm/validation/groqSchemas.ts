import { z } from 'zod';

/**
 * Schémas de validation Zod pour la validation stricte des données Groq
 */

// 🎯 Schéma pour un tool call individuel
export const ToolCallSchema = z.object({
  id: z.string().min(1, 'ID du tool call requis'),
  type: z.literal('function'),
  function: z.object({
    name: z.string().min(1, 'Nom de la fonction requis'),
    arguments: z.string().min(1, 'Arguments requis')
  })
});

// 🎯 Schéma pour un message assistant avec tool calls
export const AssistantWithToolCallsSchema = z.object({
  role: z.literal('assistant'),
  content: z.string().nullable().optional(),
  tool_calls: z.array(ToolCallSchema).min(1, 'Au moins un tool call requis'),
  timestamp: z.string().optional()
});

// 🎯 Schéma pour un message tool
export const ToolMessageSchema = z.object({
  role: z.literal('tool'),
  tool_call_id: z.string().min(1, 'tool_call_id requis'),
  name: z.string().min(1, 'Nom du tool requis'),
  content: z.string().min(1, 'Contenu du tool requis'),
  success: z.boolean().optional(),
  error: z.string().optional(),
  duration_ms: z.number().optional(),
  timestamp: z.string().optional()
});

// 🎯 Schéma pour un message utilisateur
export const UserMessageSchema = z.object({
  role: z.literal('user'),
  content: z.string().min(1, 'Contenu du message requis'),
  timestamp: z.string().optional()
});

// 🎯 Schéma pour un message système
export const SystemMessageSchema = z.object({
  role: z.literal('system'),
  content: z.string().min(1, 'Contenu système requis'),
  timestamp: z.string().optional()
});

// 🎯 Schéma pour un message générique
export const ChatMessageSchema = z.discriminatedUnion('role', [
  UserMessageSchema,
  AssistantWithToolCallsSchema,
  ToolMessageSchema,
  SystemMessageSchema
]);

// 🎯 Schéma pour le payload de l'API batch
export const BatchApiPayloadSchema = z.object({
  messages: z.array(z.union([
    AssistantWithToolCallsSchema,
    ToolMessageSchema
  ])).min(2, 'Au moins 2 messages requis (assistant + tool)'),
  operationId: z.string().min(1, 'ID de l\'opération requis'),
  sessionId: z.string().min(1, 'ID de la session requis'),
  roundId: z.string().min(1, 'ID du round requis')
});

// 🎯 Schéma pour la réponse de l'API batch
export const BatchApiResponseSchema = z.object({
  success: z.boolean(),
  applied: z.boolean(),
  operationId: z.string(),
  messageIds: z.array(z.string()),
  sequence: z.number(),
  error: z.string().optional()
});

// 🎯 Schéma pour la configuration d'un round
export const RoundConfigSchema = z.object({
  maxToolCalls: z.number().min(1).max(50),
  maxRelances: z.number().min(0).max(5),
  maxContextMessages: z.number().min(5).max(100),
  maxHistoryMessages: z.number().min(10).max(200)
});

// 🎯 Schéma pour les paramètres d'un round
export const RoundParamsSchema = z.object({
  message: z.string().min(1, 'Message utilisateur requis'),
  appContext: z.object({
    type: z.enum(['chat_session', 'article', 'folder']),
    name: z.string(),
    id: z.string(),
    content: z.string()
  }),
  sessionHistory: z.array(ChatMessageSchema),
  agentConfig: z.unknown().optional(),
  userToken: z.string().min(1, 'Token utilisateur requis'),
  sessionId: z.string().min(1, 'ID de session requis')
});

// 🎯 Schéma pour le résultat d'un round
export const RoundResultSchema = z.object({
  success: z.boolean(),
  content: z.string().optional(),
  reasoning: z.string().optional(),
  tool_calls: z.array(ToolCallSchema).optional(),
  tool_results: z.array(z.unknown()).optional(),
  sessionId: z.string(),
  is_relance: z.boolean().optional(),
  has_new_tool_calls: z.boolean().optional(),
  has_failed_tools: z.boolean().optional(),
  error: z.string().optional(),
  details: z.string().optional(),
  status: z.number().optional()
});

// 🎯 Schémas de validation pour les tests
export const TestSchemas = {
  // Test mono-tool
  monoToolTest: z.object({
    userMessage: z.string(),
    expectedToolCall: ToolCallSchema,
    expectedToolResult: ToolMessageSchema,
    expectedFinalResponse: z.string()
  }),

  // Test multi-tools
  multiToolsTest: z.object({
    userMessage: z.string(),
    expectedToolCalls: z.array(ToolCallSchema).min(2),
    expectedToolResults: z.array(ToolMessageSchema).min(2),
    expectedFinalResponse: z.string()
  }),

  // Test d'idempotence
  idempotenceTest: z.object({
    operationId: z.string(),
    payload: BatchApiPayloadSchema,
    expectedApplied: z.boolean(),
    expectedConflict: z.boolean()
  })
};

/**
 * Fonctions de validation utilitaires
 */

/**
 * Valide un tool call et retourne les erreurs
 */
export function validateToolCall(toolCall: unknown): { isValid: boolean; errors: string[] } {
  try {
    ToolCallSchema.parse(toolCall);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { isValid: false, errors: ['Erreur de validation inconnue'] };
  }
}

/**
 * Valide un message tool et retourne les erreurs
 */
export function validateToolMessage(toolMessage: unknown): { isValid: boolean; errors: string[] } {
  try {
    ToolMessageSchema.parse(toolMessage);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { isValid: false, errors: ['Erreur de validation inconnue'] };
  }
}

/**
 * Valide un payload d'API batch et retourne les erreurs
 */
export function validateBatchPayload(payload: unknown): { isValid: boolean; errors: string[] } {
  try {
    BatchApiPayloadSchema.parse(payload);
    return { isValid: true, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { isValid: false, errors: ['Erreur de validation inconnue'] };
  }
}

/**
 * Valide que les arguments d'un tool call sont du JSON valide
 */
export function validateToolCallArguments(toolCall: unknown): { isValid: boolean; errors: string[] } {
  const validation = validateToolCall(toolCall);
  if (!validation.isValid) {
    return validation;
  }

  try {
    const tc = toolCall as { function: { arguments: string } };
    JSON.parse(tc.function.arguments);
    return { isValid: true, errors: [] };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Arguments JSON invalides: ${error}`]
    };
  }
}

/**
 * Valide que le contenu d'un message tool est du JSON stringifié
 */
export function validateToolMessageContent(toolMessage: unknown): { isValid: boolean; errors: string[] } {
  const validation = validateToolMessage(toolMessage);
  if (!validation.isValid) {
    return validation;
  }

  try {
    const tm = toolMessage as { content: string };
    JSON.parse(tm.content);
    return { isValid: true, errors: [] };
  } catch (error) {
    return {
      isValid: false,
      errors: [`Contenu du tool non JSON stringifié: ${error}`]
    };
  }
}

/**
 * Valide l'appariement tool_call_id entre tool calls et tool results
 */
export function validateToolCallIdMapping(
  toolCalls: unknown[], 
  toolResults: unknown[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Vérifier que tous les tool calls ont un tool result correspondant
  for (const toolCall of toolCalls) {
    const tc = toolCall as { id: string };
    const hasMatchingResult = toolResults.some(result => {
      const tr = result as { tool_call_id: string };
      return tr.tool_call_id === tc.id;
    });
    
    if (!hasMatchingResult) {
      errors.push(`Tool call ${tc.id} n'a pas de résultat correspondant`);
    }
  }

  // Vérifier que tous les tool results ont un tool call correspondant
  for (const toolResult of toolResults) {
    const tr = toolResult as { tool_call_id: string };
    const hasMatchingCall = toolCalls.some(call => {
      const tc = call as { id: string };
      return tc.id === tr.tool_call_id;
    });
    
    if (!hasMatchingCall) {
      errors.push(`Tool result ${tr.tool_call_id} n'a pas d'appel correspondant`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Valide l'ordre des messages dans un batch
 */
export function validateBatchMessageOrder(messages: unknown[]): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (messages.length < 2) {
    errors.push('Un batch doit contenir au moins 2 messages');
    return { isValid: false, errors };
  }

  // Le premier message doit être un assistant avec tool calls
  const firstMessage = messages[0] as { role: string; tool_calls?: unknown[] };
  if (firstMessage.role !== 'assistant' || !firstMessage.tool_calls) {
    errors.push('Le premier message doit être un assistant avec tool calls');
  }

  // Les messages suivants doivent être des tools
  for (let i = 1; i < messages.length; i++) {
    const message = messages[i] as { role: string };
    if (message.role !== 'tool') {
      errors.push(`Le message ${i + 1} doit être un message tool, reçu: ${message.role}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export default {
  ToolCallSchema,
  AssistantWithToolCallsSchema,
  ToolMessageSchema,
  UserMessageSchema,
  SystemMessageSchema,
  ChatMessageSchema,
  BatchApiPayloadSchema,
  BatchApiResponseSchema,
  RoundConfigSchema,
  RoundParamsSchema,
  RoundResultSchema,
  TestSchemas,
  validateToolCall,
  validateToolMessage,
  validateBatchPayload,
  validateToolCallArguments,
  validateToolMessageContent,
  validateToolCallIdMapping,
  validateBatchMessageOrder
}; 