import { z } from 'zod';

// 🎯 Schéma pour les tool calls dans les messages assistant
export const ToolCallSchema = z.object({
  id: z.string().min(1, 'Tool call ID ne peut pas être vide'),
  type: z.literal('function'),
  function: z.object({
    name: z.string().min(1, 'Nom de fonction ne peut pas être vide'),
    arguments: z.string().min(1, 'Arguments ne peuvent pas être vides')
      .refine((val) => {
        try {
          JSON.parse(val);
          return true;
        } catch {
          return false;
        }
      }, 'Arguments doivent être du JSON valide')
  })
});

// 🎯 Schéma pour les messages assistant avec tool calls
export const AssistantWithToolCallsSchema = z.object({
  role: z.literal('assistant'),
  tool_calls: z.array(ToolCallSchema).min(1, 'Au moins un tool call requis'),
  content: z.union([z.string(), z.null()]).optional(),
  timestamp: z.string().datetime().optional()
});

// 🎯 Schéma pour les messages tool (résultats d'exécution)
export const ToolMessageSchema = z.object({
  role: z.literal('tool'),
  tool_call_id: z.string().min(1, 'Tool call ID ne peut pas être vide'),
  name: z.string().min(1, 'Nom du tool ne peut pas être vide'),
  content: z.string().min(1, 'Contenu doit être une string JSON')
    .refine((val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    }, 'Contenu doit être du JSON valide stringifié'),
  duration_ms: z.number().positive().optional(),
  success: z.boolean().optional(),
  error: z.object({
    code: z.string().min(1, 'Code d\'erreur requis'),
    message: z.string().min(1, 'Message d\'erreur requis')
  }).optional(),
  timestamp: z.string().datetime().optional()
});

// 🎯 Schéma pour les messages utilisateur
export const UserMessageSchema = z.object({
  role: z.literal('user'),
  content: z.string().min(1, 'Contenu utilisateur requis'),
  timestamp: z.string().datetime().optional()
});

// 🎯 Schéma pour les messages système
export const SystemMessageSchema = z.object({
  role: z.literal('system'),
  content: z.string().min(1, 'Contenu système requis'),
  timestamp: z.string().datetime().optional()
});

// 🎯 Union de tous les types de messages
export const ChatMessageSchema = z.union([
  UserMessageSchema,
  SystemMessageSchema,
  AssistantWithToolCallsSchema,
  ToolMessageSchema
]);

// 🎯 Schéma pour un thread complet
export const ThreadSchema = z.array(ChatMessageSchema);

// 🎯 Schéma pour la validation des arguments de tool
export const ToolArgumentsSchema = z.record(z.unknown()).refine(
  (args) => {
    // Vérifier que les arguments sont sérialisables en JSON
    try {
      JSON.stringify(args);
      return true;
    } catch {
      return false;
    }
  },
  'Arguments doivent être sérialisables en JSON'
);

// 🎯 Schéma pour la validation des résultats de tool
export const ToolResultSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional()
  }).optional(),
  duration_ms: z.number().positive().optional(),
  timestamp: z.string().datetime().optional()
});

// 🎯 Guards TypeScript pour la validation runtime
export const isAssistantWithToolCalls = (message: unknown): message is z.infer<typeof AssistantWithToolCallsSchema> => {
  try {
    AssistantWithToolCallsSchema.parse(message);
    return true;
  } catch {
    return false;
  }
};

export const isToolMessage = (message: unknown): message is z.infer<typeof ToolMessageSchema> => {
  try {
    ToolMessageSchema.parse(message);
    return true;
  } catch {
    return false;
  }
};

export const isUserMessage = (message: unknown): message is z.infer<typeof UserMessageSchema> => {
  try {
    UserMessageSchema.parse(message);
    return true;
  } catch {
    return false;
  }
};

export const isSystemMessage = (message: unknown): message is z.infer<typeof SystemMessageSchema> => {
  try {
    SystemMessageSchema.parse(message);
    return true;
  } catch {
    return false;
  }
};

// 🎯 Validation complète d'un message
export const validateMessage = (message: unknown): { isValid: boolean; errors: string[] } => {
  try {
    ChatMessageSchema.parse(message);
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
};

// 🎯 Validation d'un thread complet
export const validateThread = (thread: unknown[]): { isValid: boolean; errors: string[]; validMessages: unknown[] } => {
  const errors: string[] = [];
  const validMessages: unknown[] = [];

  for (let i = 0; i < thread.length; i++) {
    const message = thread[i];
    const validation = validateMessage(message);
    
    if (!validation.isValid) {
      errors.push(`Message ${i}: ${validation.errors.join(', ')}`);
    } else {
      validMessages.push(message);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    validMessages
  };
};

// 🎯 Validation spécifique des tool calls
export const validateToolCalls = (toolCalls: unknown[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  for (let i = 0; i < toolCalls.length; i++) {
    try {
      ToolCallSchema.parse(toolCalls[i]);
    } catch (error) {
      if (error instanceof z.ZodError) {
        errors.push(`Tool call ${i}: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
      } else {
        errors.push(`Tool call ${i}: Erreur de validation inconnue`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Parse les arguments d'un tool call de façon robuste.
 * Gère les cas où l'API renvoie le même JSON concaténé plusieurs fois
 * (ex: {"ref":"Alteria"}{"ref":"Alteria"}...) en ne gardant que le premier objet.
 */
export function parseToolArgumentsSafe(raw: string): Record<string, unknown> {
  const str = (raw ?? '').trim();
  if (!str) return {};

  let parseError: Error | null = null;
  try {
    const parsed = JSON.parse(str);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch (e) {
    parseError = e instanceof Error ? e : new Error(String(e));
  }

  if (!str.includes('}{')) {
    throw parseError ?? new Error(`Arguments JSON invalides: chaîne non parseable`);
  }

  // Extraire le premier objet complet (du premier { au } équilibré)
  let depth = 0;
  let end = -1;
  const start = str.indexOf('{');
  if (start === -1) throw new Error(`Arguments JSON invalides: aucun objet trouvé`);

  for (let i = start; i < str.length; i++) {
    if (str[i] === '{') depth++;
    else if (str[i] === '}') {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }

  if (end === -1) throw new Error(`Arguments JSON invalides: objet non fermé`);
  const firstJson = str.slice(start, end + 1);
  const parsed = JSON.parse(firstJson);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  throw new Error(`Arguments JSON invalides: premier objet invalide`);
}

// 🎯 Validation des arguments JSON
export const validateToolArguments = (argumentsStr: string): { isValid: boolean; parsed: unknown; error?: string } => {
  try {
    const parsed = parseToolArgumentsSafe(argumentsStr);
    return { isValid: true, parsed };
  } catch (error) {
    return {
      isValid: false,
      parsed: null,
      error: `Arguments JSON invalides: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
    };
  }
};

// 🎯 Validation des résultats de tool
export const validateToolResult = (result: unknown): { isValid: boolean; normalized: unknown; errors: string[] } => {
  try {
    const normalized = ToolResultSchema.parse(result);
    return { isValid: true, normalized, errors: [] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return { isValid: false, normalized: result, errors };
    }
    return { isValid: false, normalized: result, errors: ['Erreur de validation inconnue'] };
  }
};

// 🎯 Types TypeScript exportés
export type AssistantWithToolCalls = z.infer<typeof AssistantWithToolCallsSchema>;
export type ToolMessage = z.infer<typeof ToolMessageSchema>;
export type UserMessage = z.infer<typeof UserMessageSchema>;
export type SystemMessage = z.infer<typeof SystemMessageSchema>;
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
export type Thread = z.infer<typeof ThreadSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
export type ToolResult = z.infer<typeof ToolResultSchema>;
export type ToolArguments = z.infer<typeof ToolArgumentsSchema>; 