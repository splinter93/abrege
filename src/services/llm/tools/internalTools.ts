/**
 * Internal tools — exécutés localement dans le stream route, sans appel HTTP.
 * Le LLM les appelle comme des tools normaux. Le backend intercepte et émet un SSE spécial.
 */

import type { FunctionTool } from '@/services/llm/types/strictTypes';

export const PLAN_UPDATE_TOOL: FunctionTool = {
  type: 'function',
  function: {
    name: '__plan_update',
    description: 'Use for tasks with 3 or more distinct steps requiring sequential tool calls. Declare the full plan once (all steps pending), mark each step in_progress before its tools, completed right after. Never use for single-step or conversational responses. Never start step N+1 without marking step N completed.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Short plan title' },
        steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              content: { type: 'string' },
              status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] }
            },
            required: ['id', 'content', 'status']
          }
        }
      },
      required: ['steps']
    }
  }
};

export const INTERNAL_TOOLS: FunctionTool[] = [PLAN_UPDATE_TOOL];

export const INTERNAL_TOOL_NAMES = new Set(
  INTERNAL_TOOLS.map(t => t.function.name)
);
