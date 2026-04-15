import { describe, expect, it } from 'vitest';
import type { ChatMessage } from '@/types/chat';
import { hasToolCalls } from '@/types/chat';
import {
  compressToolResults,
  INTERNAL_TOOL_COMPRESSED_MARKER,
  truncateHistory
} from '../ContextCompressor';

function user(content: string): ChatMessage {
  return { role: 'user', content };
}

function assistantToolCalls(
  id: string,
  callIds: string[],
  fnName = 'search'
): ChatMessage {
  return {
    role: 'assistant',
    content: '',
    tool_calls: callIds.map((callId) => ({
      id: callId,
      type: 'function' as const,
      function: { name: fnName, arguments: '{}' }
    }))
  };
}

function tool(callId: string, name: string, content: string, success = true): ChatMessage {
  return {
    role: 'tool',
    tool_call_id: callId,
    name,
    content,
    success
  };
}

describe('truncateHistory', () => {
  it('returns a copy when already under max', () => {
    const msgs: ChatMessage[] = [user('a'), user('b')];
    const out = truncateHistory(msgs, 40);
    expect(out).toEqual(msgs);
    expect(out).not.toBe(msgs);
  });

  it('repairs head ending with assistant(tool_calls) without tools in head', () => {
    const msgs: ChatMessage[] = [
      user('u1'),
      user('u2'),
      assistantToolCalls('a1', ['c1']),
      ...Array.from({ length: 41 }, (_, i) => user(`fill-${i}`)),
      user('recent')
    ];
    const out = truncateHistory(msgs, 40);
    const headBeforeSynth = out.slice(0, out.findIndex((m) => m.role === 'system'));
    expect(headBeforeSynth.some((m) => hasToolCalls(m))).toBe(false);
  });

  it('strips orphan tool messages at start of tail', () => {
    const longMiddle = Array.from({ length: 36 }, (_, i) => user(`m-${i}`));
    const afterOrphan = Array.from({ length: 35 }, (_, i) => user(`tail-${i}`));
    const msgs: ChatMessage[] = [
      user('h1'),
      user('h2'),
      user('h3'),
      ...longMiddle,
      tool('orphan', 'x', '{}'),
      ...afterOrphan
    ];
    const out = truncateHistory(msgs, 40);
    const sysIdx = out.findIndex((m) => m.role === 'system');
    expect(sysIdx).toBeGreaterThan(-1);
    expect(out[sysIdx + 1]?.role).not.toBe('tool');
  });

  it('falls back to tail-only slice when repair empties head', () => {
    const msgs: ChatMessage[] = [
      assistantToolCalls('a1', ['t1']),
      assistantToolCalls('a2', ['t2']),
      assistantToolCalls('a3', ['t3']),
      ...Array.from({ length: 45 }, (_, i) => user(`u-${i}`))
    ];
    const out = truncateHistory(msgs, 40);
    expect(out.length).toBe(40);
    expect(out.some((m) => m.role === 'system')).toBe(false);
  });
});

describe('compressToolResults', () => {
  it('replaces large old tool content but keeps tool_call_id and name', () => {
    const big = 'x'.repeat(900);
    const msgs: ChatMessage[] = [
      assistantToolCalls('as0', ['t0']),
      tool('t0', 'fn', big, true),
      assistantToolCalls('as1', ['t1']),
      tool('t1', 'fn', 'ok', true),
      assistantToolCalls('as2', ['t2']),
      tool('t2', 'fn', 'ok', true),
      assistantToolCalls('as3', ['t3']),
      tool('t3', 'fn', big, true)
    ];
    compressToolResults(msgs, 800);
    const t0 = msgs[1] as { role: string; content: string; tool_call_id: string; name: string };
    const t3 = msgs[7] as { role: string; content: string };
    expect(t0.content).toContain('Result compressed');
    expect(t0.content).toContain('900');
    expect(t0.tool_call_id).toBe('t0');
    expect(t0.name).toBe('fn');
    expect(t3.content).toBe(big);
  });

  it('compresses __plan_update tool results before cutoff regardless of length', () => {
    const planFeedback = 'Plan updated (1/3 done). In progress: "x".';
    const msgs: ChatMessage[] = [
      assistantToolCalls('as0', ['t0']),
      tool('t0', '__plan_update', planFeedback, true),
      assistantToolCalls('as1', ['t1']),
      tool('t1', '__plan_update', planFeedback, true),
      assistantToolCalls('as2', ['t2']),
      tool('t2', '__plan_update', planFeedback, true),
      assistantToolCalls('as3', ['t3']),
      tool('t3', '__plan_update', planFeedback, true)
    ];
    const planNames = new Set(['__plan_update']);
    compressToolResults(msgs, 800, planNames);
    const t0 = msgs[1] as { content: string };
    const t3 = msgs[7] as { content: string };
    expect(t0.content).toBe(INTERNAL_TOOL_COMPRESSED_MARKER);
    expect(t3.content).toBe(planFeedback);
  });

  it('compresses plan-only round: assistant(tool_calls:[__plan_update]) + tool result', () => {
    // Scénario bug #1 : le LLM appelle __plan_update seul dans le 1er round,
    // puis 3 rounds normaux. Avec RECENT_ROUNDS_PROTECTED = 2, le cutoff est au
    // 3ème assistant depuis la fin (as1 dans cet exemple), donc seul le round 0
    // (plan-only) est avant le cutoff et éligible à la compression.
    const planFeedback = 'Plan updated (0/2 done).';
    const bigResult = 'x'.repeat(900);
    const msgs: ChatMessage[] = [
      // Round 0 : plan-only (avant le cutoff → éligible)
      assistantToolCalls('as0', ['p0'], '__plan_update'),
      tool('p0', '__plan_update', planFeedback, true),
      // Round 1 : au cutoff (as1 = 3ème depuis la fin) → protégé
      assistantToolCalls('as1', ['t1']),
      tool('t1', 'search', bigResult, true),
      // Round 2 : round récent protégé (RECENT_ROUNDS_PROTECTED = 2)
      assistantToolCalls('as2', ['t2']),
      tool('t2', 'search', bigResult, true),
      // Round 3 : round récent protégé
      assistantToolCalls('as3', ['t3']),
      tool('t3', 'search', bigResult, true)
    ];
    const planNames = new Set(['__plan_update']);
    compressToolResults(msgs, 800, planNames);
    const planResult = msgs[1] as { content: string };
    const round1Result = msgs[3] as { content: string };
    // Le résultat du plan-only est avant le cutoff → compressé avec le marker interne
    expect(planResult.content).toBe(INTERNAL_TOOL_COMPRESSED_MARKER);
    // Round 1 est au cutoff (protégé) → contenu intact
    expect(round1Result.content).toBe(bigResult);
  });
});
