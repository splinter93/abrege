import { describe, it, expect } from 'vitest';
import { streamCancelBodySchema } from '../validation';

describe('streamCancelBodySchema', () => {
  it('accepts minimal cancel payload', () => {
    const result = streamCancelBodySchema.safeParse({
      assistantOperationId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'user_stop'
    });
    expect(result.success).toBe(true);
  });

  it('accepts partial with interrupted timeline fields', () => {
    const result = streamCancelBodySchema.safeParse({
      assistantOperationId: '550e8400-e29b-41d4-a716-446655440000',
      userOperationId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      reason: 'superseded',
      partial: {
        content: 'Hello partial',
        streamTimeline: {
          items: [],
          startTime: Date.now(),
          interrupted: true
        }
      }
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid reason', () => {
    const result = streamCancelBodySchema.safeParse({
      assistantOperationId: '550e8400-e29b-41d4-a716-446655440000',
      reason: 'invalid'
    });
    expect(result.success).toBe(false);
  });
});
