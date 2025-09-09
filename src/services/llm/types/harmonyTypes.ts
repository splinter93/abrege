/**
 * Types stricts pour le format Harmony GPT-OSS
 * Production-ready, zéro any, validation complète
 */

import { z } from 'zod';

// ============================================================================
// TOKENS SPÉCIAUX HARMONY
// ============================================================================

export const HARMONY_TOKENS = {
  START: '<|start|>',
  END: '<|end|>',
  MESSAGE: '<|message|>',
  CHANNEL: '<|channel|>',
} as const;

export type HarmonyToken = typeof HARMONY_TOKENS[keyof typeof HARMONY_TOKENS];

// ============================================================================
// RÔLES HARMONY
// ============================================================================

export const HARMONY_ROLES = {
  SYSTEM: 'system',
  DEVELOPER: 'developer', 
  USER: 'user',
  ASSISTANT: 'assistant',
  TOOL: 'tool',
} as const;

export type HarmonyRole = typeof HARMONY_ROLES[keyof typeof HARMONY_ROLES];

// ============================================================================
// CANAUX HARMONY
// ============================================================================

export const HARMONY_CHANNELS = {
  ANALYSIS: 'analysis',    // Raisonnement interne (CoT)
  COMMENTARY: 'commentary', // Appels d'outils et préambules
  FINAL: 'final',          // Réponses destinées à l'utilisateur
} as const;

export type HarmonyChannel = typeof HARMONY_CHANNELS[keyof typeof HARMONY_CHANNELS];

// ============================================================================
// SCHEMAS ZOD STRICTS
// ============================================================================

export const HarmonyRoleSchema = z.enum([
  HARMONY_ROLES.SYSTEM,
  HARMONY_ROLES.DEVELOPER,
  HARMONY_ROLES.USER,
  HARMONY_ROLES.ASSISTANT,
  HARMONY_ROLES.TOOL,
]);

export const HarmonyChannelSchema = z.enum([
  HARMONY_CHANNELS.ANALYSIS,
  HARMONY_CHANNELS.COMMENTARY,
  HARMONY_CHANNELS.FINAL,
]).optional();

export const ToolCallSchema = z.object({
  id: z.string().min(1),
  type: z.literal('function'),
  function: z.object({
    name: z.string().min(1),
    arguments: z.string(), // JSON string
  }),
});

export const ToolResultSchema = z.object({
  tool_call_id: z.string().min(1),
  name: z.string().min(1),
  content: z.string(),
  success: z.boolean().optional(),
  error: z.string().optional(),
});

// ============================================================================
// MESSAGE HARMONY STRICT
// ============================================================================

export const HarmonyMessageSchema = z.object({
  role: HarmonyRoleSchema,
  channel: HarmonyChannelSchema,
  content: z.string(),
  timestamp: z.string().datetime().optional(),
  
  // Support tool calls
  tool_calls: z.array(ToolCallSchema).optional(),
  
  // Support tool results (tool uniquement)
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
});

export type HarmonyMessage = z.infer<typeof HarmonyMessageSchema>;

// ============================================================================
// MESSAGE PARSÉ HARMONY
// ============================================================================

export const ParsedHarmonyMessageSchema = z.object({
  role: HarmonyRoleSchema,
  channel: HarmonyChannelSchema,
  content: z.string(),
  rawTokens: z.object({
    start: z.string(),
    end: z.string(),
    message: z.string(),
    channel: z.string().optional(),
  }),
  isValid: z.boolean(),
  errors: z.array(z.string()).optional(),
});

export type ParsedHarmonyMessage = z.infer<typeof ParsedHarmonyMessageSchema>;

// ============================================================================
// CONVERSATION HARMONY
// ============================================================================

export const HarmonyConversationSchema = z.object({
  messages: z.array(HarmonyMessageSchema),
  metadata: z.object({
    sessionId: z.string().optional(),
    traceId: z.string().optional(),
    timestamp: z.string().datetime(),
  }).optional(),
});

export type HarmonyConversation = z.infer<typeof HarmonyConversationSchema>;

// ============================================================================
// CONFIGURATION HARMONY
// ============================================================================

export const HarmonyConfigSchema = z.object({
  enableAnalysisChannel: z.boolean().default(true),
  enableCommentaryChannel: z.boolean().default(true),
  enableFinalChannel: z.boolean().default(true),
  strictValidation: z.boolean().default(true),
  maxMessageLength: z.number().positive().default(50000),
  preserveRawTokens: z.boolean().default(false),
});

export type HarmonyConfig = z.infer<typeof HarmonyConfigSchema>;

// ============================================================================
// RÉSULTATS DE FORMATAGE
// ============================================================================

export const HarmonyFormatResultSchema = z.object({
  success: z.boolean(),
  formattedMessage: z.string(),
  originalMessage: HarmonyMessageSchema,
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

export type HarmonyFormatResult = z.infer<typeof HarmonyFormatResultSchema>;

export const HarmonyParseResultSchema = z.object({
  success: z.boolean(),
  parsedMessage: ParsedHarmonyMessageSchema.optional(),
  rawInput: z.string(),
  errors: z.array(z.string()).optional(),
  warnings: z.array(z.string()).optional(),
});

export type HarmonyParseResult = z.infer<typeof HarmonyParseResultSchema>;

// ============================================================================
// ERREURS HARMONY
// ============================================================================

export class HarmonyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HarmonyError';
  }
}

export class HarmonyValidationError extends HarmonyError {
  constructor(
    message: string,
    public readonly validationErrors: string[],
    public readonly input?: unknown
  ) {
    super(message, 'VALIDATION_ERROR', { validationErrors, input });
    this.name = 'HarmonyValidationError';
  }
}

export class HarmonyParseError extends HarmonyError {
  constructor(
    message: string,
    public readonly rawInput: string,
    public readonly position?: number
  ) {
    super(message, 'PARSE_ERROR', { rawInput, position });
    this.name = 'HarmonyParseError';
  }
}
