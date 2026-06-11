import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  cancelStreamOnServer,
  isAssistantOperationCancelled,
  markAssistantOperationCancelled,
  clearActiveStream,
  setActiveStream,
  getActiveStream
} from '../useStreamCancellation';

describe('useStreamCancellation', () => {
  beforeEach(() => {
    clearActiveStream();
    vi.restoreAllMocks();
  });

  it('tracks active stream context', () => {
    setActiveStream({
      sessionId: 's1',
      userOperationId: 'u1',
      assistantOperationId: 'a1'
    });
    expect(getActiveStream()?.assistantOperationId).toBe('a1');
    clearActiveStream();
    expect(getActiveStream()).toBeNull();
  });

  it('marks assistant operation cancelled on API success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      })
    );

    const assistantId = '550e8400-e29b-41d4-a716-446655440000';
    const result = await cancelStreamOnServer({
      sessionId: 'session-1',
      assistantOperationId: assistantId,
      reason: 'user_stop',
      token: 'token'
    });

    expect(result.success).toBe(true);
    expect(isAssistantOperationCancelled(assistantId)).toBe(true);
  });

  it('marks cancelled even when network fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    const assistantId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const result = await cancelStreamOnServer({
      sessionId: 'session-1',
      assistantOperationId: assistantId,
      reason: 'superseded',
      token: 'token'
    });

    expect(result.success).toBe(false);
    expect(isAssistantOperationCancelled(assistantId)).toBe(true);
  });

  it('exposes manual mark for realtime guard', () => {
    markAssistantOperationCancelled('op-xyz');
    expect(isAssistantOperationCancelled('op-xyz')).toBe(true);
  });
});
