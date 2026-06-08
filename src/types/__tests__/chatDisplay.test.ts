import { describe, expect, it } from 'vitest';
import { isDisplayableChatMessage } from '@/types/chat';
import type { ChatMessage } from '@/types/chat';

describe('isDisplayableChatMessage', () => {
  it('affiche les messages user', () => {
    const msg: ChatMessage = {
      id: 'u1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date().toISOString(),
    };
    expect(isDisplayableChatMessage(msg)).toBe(true);
  });

  it('masque les messages tool (présents en DB pour le LLM)', () => {
    const msg: ChatMessage = {
      id: 't1',
      role: 'tool',
      content: '{"success":true}',
      tool_call_id: 'call-1',
      name: 'search',
      timestamp: new Date().toISOString(),
    };
    expect(isDisplayableChatMessage(msg)).toBe(false);
  });

  it('masque les observations internes', () => {
    const msg: ChatMessage = {
      id: 'o1',
      role: 'assistant',
      name: 'observation',
      content: 'hidden',
      timestamp: new Date().toISOString(),
    };
    expect(isDisplayableChatMessage(msg)).toBe(false);
  });

  it('masque les assistants vides sans timeline', () => {
    const msg: ChatMessage = {
      id: 'a1',
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
    };
    expect(isDisplayableChatMessage(msg)).toBe(false);
  });

  it('affiche les assistants avec timeline même sans content', () => {
    const msg: ChatMessage = {
      id: 'a2',
      role: 'assistant',
      content: '',
      stream_timeline: {
        items: [{ type: 'tool_execution', roundNumber: 1, toolCalls: [], toolCount: 0 }],
      },
      timestamp: new Date().toISOString(),
    };
    expect(isDisplayableChatMessage(msg)).toBe(true);
  });

  it('affiche les assistants avec reasoning même sans content', () => {
    const msg: ChatMessage = {
      id: 'a-reason',
      role: 'assistant',
      content: '',
      reasoning: 'Chain of thought...',
      timestamp: new Date().toISOString(),
    };
    expect(isDisplayableChatMessage(msg)).toBe(true);
  });

  it('affiche les assistants en streaming même vides', () => {
    const msg: ChatMessage = {
      id: 'a3',
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date().toISOString(),
    };
    expect(isDisplayableChatMessage(msg)).toBe(true);
  });
});
