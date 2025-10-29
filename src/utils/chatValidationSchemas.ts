/**
 * Schémas Zod pour validation des données chat
 * 
 * Remplace les z.any() par des types stricts
 * 
 * @module utils/chatValidationSchemas
 */

import { z } from 'zod';

/**
 * Schéma pour un item de la StreamTimeline
 */
export const streamTimelineItemSchema = z.union([
  z.object({
    type: z.literal('text'),
    content: z.string(),
    timestamp: z.number(),
    roundNumber: z.number().optional()
  }),
  z.object({
    type: z.literal('tool_execution'),
    toolCalls: z.array(z.object({
      id: z.string(),
      type: z.string(),
      function: z.object({
        name: z.string(),
        arguments: z.string()
      }),
      success: z.boolean().optional(),
      result: z.string().optional()
    })),
    toolCount: z.number(),
    timestamp: z.number(),
    roundNumber: z.number()
  }),
  z.object({
    type: z.literal('tool_result'),
    toolCallId: z.string(),
    toolName: z.string(),
    result: z.unknown(), // Unknown data (peut être n'importe quoi)
    success: z.boolean(),
    timestamp: z.number()
  })
]);

/**
 * Schéma pour StreamTimeline complète
 */
export const streamTimelineSchema = z.object({
  items: z.array(streamTimelineItemSchema),
  startTime: z.number(),
  endTime: z.number().optional()
});

/**
 * Schéma pour ToolResult
 */
export const toolResultSchema = z.object({
  tool_call_id: z.string(),
  name: z.string(),
  content: z.string(),
  success: z.boolean(),
  error: z.string().optional()
});

/**
 * Schéma pour ToolCall
 */
export const toolCallSchema = z.object({
  id: z.string(),
  type: z.literal('function'),
  function: z.object({
    name: z.string(),
    arguments: z.string()
  })
});

/**
 * Schéma pour un message chat complet
 */
export const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'tool', 'system']),
  content: z.string(),
  tool_calls: z.array(toolCallSchema).optional(),
  tool_call_id: z.string().optional(),
  name: z.string().optional(),
  reasoning: z.string().optional(),
  stream_timeline: streamTimelineSchema.optional(),
  tool_results: z.array(toolResultSchema).optional(),
  timestamp: z.string().optional(),
  sequence_number: z.number().optional()
});

