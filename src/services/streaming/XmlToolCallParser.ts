/**
 * XmlToolCallParser — parser de secours pour les tool calls XML hors-format natif.
 *
 * Formats supportés :
 *   1. Grok/xAI  : <tool_calls>[{...}]</tool_calls>          (JSON array)
 *   2. GLM/Qwen  : <function_call>{"name":…,"arguments":…}</function_call>  (JSON object)
 *   3. Minimax   : <tool_call>{"name":…,"parameters":…}</tool_call>         (JSON object, "parameters" alias)
 *   4. Générique : <tool_use>{"name":…,"input":…}</tool_use>                (JSON object, "input" alias)
 *
 * Chaque format est détecté, normalisé vers ToolCall, et retiré du contenu visible.
 */

import { simpleLogger as logger } from '@/utils/logger';
import type { ToolCall } from '@/hooks/useChatHandlers';

// ---------------------------------------------------------------------------
// Types internes
// ---------------------------------------------------------------------------

interface RawToolCallObject {
  name?: string;
  function?: string; // alternative à name pour certains modèles
  arguments?: string | Record<string, unknown>;
  parameters?: string | Record<string, unknown>; // alias Minimax
  input?: string | Record<string, unknown>;       // alias Anthropic-like
  id?: string;
}

// ---------------------------------------------------------------------------
// Patterns de détection — ordre du plus spécifique au plus générique
// ---------------------------------------------------------------------------

/** Grok : <tool_calls>[{…}]</tool_calls> — contient un JSON array */
const PATTERN_TOOL_CALLS = /<tool_calls>([\s\S]*?)<\/tool_calls>/i;

/** GLM/Qwen/ChatGLM : <function_call>{…}</function_call> — JSON object unique */
const PATTERN_FUNCTION_CALL = /<function_call>([\s\S]*?)<\/function_call>/gi;

/** Minimax : <tool_call>{…}</tool_call> — JSON object (singular) */
const PATTERN_TOOL_CALL_SINGULAR = /<tool_call>([\s\S]*?)<\/tool_call>/gi;

/** Générique Anthropic-like : <tool_use>{…}</tool_use> */
const PATTERN_TOOL_USE = /<tool_use>([\s\S]*?)<\/tool_use>/gi;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toArgumentsString(value: string | Record<string, unknown> | undefined): string {
  if (value === undefined || value === null) return '{}';
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function normalizeRawObject(raw: RawToolCallObject, index: number): ToolCall | null {
  const name = raw.name || raw.function;
  if (!name) {
    logger.warn(`[XmlToolCallParser] ⚠️ Tool call ${index + 1} sans nom — ignoré`, { raw });
    return null;
  }
  const args = raw.arguments ?? raw.parameters ?? raw.input;
  return {
    id: raw.id || `call_${Date.now()}_${index}_${Math.random().toString(36).substring(7)}`,
    type: 'function',
    function: { name, arguments: toArgumentsString(args) }
  };
}

function safeParseJson(str: string): unknown | null {
  try {
    return JSON.parse(str.trim());
  } catch {
    return null;
  }
}

/** Retire toutes les occurrences d'un pattern du contenu puis normalise les blancs. */
function stripPattern(content: string, pattern: RegExp): string {
  return content
    .replace(pattern, '')
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

// ---------------------------------------------------------------------------
// Parser principal
// ---------------------------------------------------------------------------

export class XmlToolCallParser {
  // ----- Détection rapide ---------------------------------------------------

  static hasXmlToolCalls(content: string): boolean {
    if (!content || typeof content !== 'string') return false;
    return (
      PATTERN_TOOL_CALLS.test(content) ||
      PATTERN_FUNCTION_CALL.test(content) ||
      PATTERN_TOOL_CALL_SINGULAR.test(content) ||
      PATTERN_TOOL_USE.test(content)
    );
  }

  // ----- Entrée principale --------------------------------------------------

  /**
   * Extrait et normalise les tool calls XML en ToolCall[].
   * Tente chaque format dans l'ordre ; prend le premier qui produit des résultats.
   */
  static parseXmlToolCalls(content: string): {
    cleanContent: string;
    toolCalls: ToolCall[];
  } {
    if (!content || typeof content !== 'string') {
      return { cleanContent: content, toolCalls: [] };
    }

    // 1 — Grok : <tool_calls>[…]</tool_calls>
    const grokResult = XmlToolCallParser.parseGrokFormat(content);
    if (grokResult.toolCalls.length > 0) return grokResult;

    // 2 — GLM/Qwen : <function_call>{…}</function_call>
    const glmResult = XmlToolCallParser.parseRepeatedObjectFormat(
      content, PATTERN_FUNCTION_CALL, '<function_call>…</function_call>'
    );
    if (glmResult.toolCalls.length > 0) return glmResult;

    // 3 — Minimax : <tool_call>{…}</tool_call>
    const minimaxResult = XmlToolCallParser.parseRepeatedObjectFormat(
      content, PATTERN_TOOL_CALL_SINGULAR, '<tool_call>…</tool_call>'
    );
    if (minimaxResult.toolCalls.length > 0) return minimaxResult;

    // 4 — Générique : <tool_use>{…}</tool_use>
    const toolUseResult = XmlToolCallParser.parseRepeatedObjectFormat(
      content, PATTERN_TOOL_USE, '<tool_use>…</tool_use>'
    );
    if (toolUseResult.toolCalls.length > 0) return toolUseResult;

    // Aucun format reconnu
    return { cleanContent: content.trim(), toolCalls: [] };
  }

  // ----- Format Grok : array JSON dans <tool_calls> -------------------------

  private static parseGrokFormat(content: string): { cleanContent: string; toolCalls: ToolCall[] } {
    const match = content.match(PATTERN_TOOL_CALLS);
    if (!match?.[1]) return { cleanContent: content.trim(), toolCalls: [] };

    logger.warn('[XmlToolCallParser] ⚠️ Format Grok détecté (<tool_calls>)');

    const parsed = safeParseJson(match[1]);
    if (!Array.isArray(parsed)) {
      logger.error('[XmlToolCallParser] ❌ <tool_calls> content n\'est pas un array');
      return { cleanContent: stripPattern(content, PATTERN_TOOL_CALLS), toolCalls: [] };
    }

    const toolCalls = (parsed as RawToolCallObject[])
      .map((tc, i) => normalizeRawObject(tc, i))
      .filter((tc): tc is ToolCall => tc !== null);

    logger.info(`[XmlToolCallParser] ✅ ${toolCalls.length} tool calls extraits (Grok format)`);
    return { cleanContent: stripPattern(content, PATTERN_TOOL_CALLS), toolCalls };
  }

  // ----- Formats à objets répétés (GLM, Minimax, tool_use) -----------------

  private static parseRepeatedObjectFormat(
    content: string,
    pattern: RegExp,
    label: string
  ): { cleanContent: string; toolCalls: ToolCall[] } {
    // RegExp stateless copy pour exec loop (flags 'g')
    const re = new RegExp(pattern.source, pattern.flags);
    const toolCalls: ToolCall[] = [];
    let match: RegExpExecArray | null;
    let index = 0;

    while ((match = re.exec(content)) !== null) {
      const inner = match[1]?.trim();
      if (!inner) continue;
      const parsed = safeParseJson(inner);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        logger.warn(`[XmlToolCallParser] ⚠️ ${label} contenu non-objet — ignoré`);
        continue;
      }
      const tc = normalizeRawObject(parsed as RawToolCallObject, index++);
      if (tc) toolCalls.push(tc);
    }

    if (toolCalls.length === 0) return { cleanContent: content.trim(), toolCalls: [] };

    logger.warn(`[XmlToolCallParser] ⚠️ Format ${label} détecté`);
    logger.info(`[XmlToolCallParser] ✅ ${toolCalls.length} tool calls extraits (${label})`);
    return { cleanContent: stripPattern(content, pattern), toolCalls };
  }

  // ----- Nettoyage seul (sans parsing) --------------------------------------

  static removeXmlToolCalls(content: string): string {
    return content
      .replace(PATTERN_TOOL_CALLS, '')
      .replace(PATTERN_FUNCTION_CALL, '')
      .replace(PATTERN_TOOL_CALL_SINGULAR, '')
      .replace(PATTERN_TOOL_USE, '')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();
  }
}
