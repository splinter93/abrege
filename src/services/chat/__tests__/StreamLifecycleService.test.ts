import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

vi.mock('@/utils/supabaseClient', () => ({
  createSupabaseClient: vi.fn(() => ({ from: vi.fn() }))
}));

import { StreamLifecycleService } from '../StreamLifecycleService';

type QueryResult = { data: unknown; error: { message: string } | null };

function createMockSupabase(handlers: {
  streamRuns?: Record<string, QueryResult>;
  sessions?: QueryResult;
  parentUser?: QueryResult;
  latestUser?: QueryResult;
  upsertError?: { message: string } | null;
  upsertErrorsByConflict?: Partial<Record<'user_operation_id' | 'assistant_operation_id', { message: string }>>;
}): SupabaseClient {
  const streamRunsTable = handlers.streamRuns ?? {};
  const upsertCalls: Array<{ onConflict?: string }> = [];

  const from = vi.fn((table: string) => {
    const chain: Record<string, unknown> = {};
    const self = () => chain;

    chain.select = vi.fn(() => self());
    chain.eq = vi.fn((col: string, val: string) => {
      if (table === 'chat_stream_runs' && col === 'assistant_operation_id') {
        chain._assistantOp = val;
      }
      if (table === 'chat_messages' && col === 'operation_id') {
        chain._userOp = val;
      }
      if (table === 'chat_sessions') {
        chain._sessionId = val;
      }
      return self();
    });
    chain.order = vi.fn(() => {
      chain._userOp = undefined;
      return self();
    });
    chain.limit = vi.fn(() => self());
    chain.maybeSingle = vi.fn(async () => {
      if (table === 'chat_stream_runs') {
        const key = chain._assistantOp as string;
        return streamRunsTable[key] ?? { data: null, error: null };
      }
      if (table === 'chat_sessions') {
        return handlers.sessions ?? { data: { id: 'session-1' }, error: null };
      }
      if (table === 'chat_messages' && chain._userOp) {
        return handlers.parentUser ?? { data: null, error: null };
      }
      if (table === 'chat_messages') {
        return handlers.latestUser ?? { data: { sequence_number: 1 }, error: null };
      }
      return { data: null, error: null };
    });
    chain.upsert = vi.fn(async (_row: unknown, options?: { onConflict?: string }) => {
      upsertCalls.push({ onConflict: options?.onConflict });
      const conflictKey = options?.onConflict as 'user_operation_id' | 'assistant_operation_id' | undefined;
      const conflictError =
        conflictKey && handlers.upsertErrorsByConflict?.[conflictKey]
          ? handlers.upsertErrorsByConflict[conflictKey]
          : null;
      return { error: conflictError ?? handlers.upsertError ?? null };
    });
    chain.update = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({
              data: { id: 'run-1' },
              error: null
            }))
          }))
        }))
      }))
    }));

    return chain;
  });

  const client = { from, upsertCalls } as unknown as SupabaseClient & {
    upsertCalls: Array<{ onConflict?: string }>;
  };
  return client;
}

describe('StreamLifecycleService', () => {
  let service: StreamLifecycleService;

  beforeEach(() => {
    service = StreamLifecycleService.resetForTests();
  });

  it('isActive returns true when run status is running', async () => {
    const supabase = createMockSupabase({
      streamRuns: {
        'asst-op-1': {
          data: {
            assistant_operation_id: 'asst-op-1',
            status: 'running'
          },
          error: null
        }
      }
    });
    service = StreamLifecycleService.resetForTests(supabase);
    await expect(service.isActive('asst-op-1')).resolves.toBe(true);
  });

  it('isActive returns true when no lifecycle row (legacy)', async () => {
    const supabase = createMockSupabase({
      streamRuns: {
        'unknown-op': { data: null, error: null }
      }
    });
    service = StreamLifecycleService.resetForTests(supabase);
    await expect(service.isActive('unknown-op')).resolves.toBe(true);
  });

  it('isActive returns false when run is cancelled', async () => {
    const supabase = createMockSupabase({
      streamRuns: {
        'asst-op-1': {
          data: {
            assistant_operation_id: 'asst-op-1',
            status: 'cancelled'
          },
          error: null
        }
      }
    });
    service = StreamLifecycleService.resetForTests(supabase);
    await expect(service.isActive('asst-op-1')).resolves.toBe(false);
  });

  it('assertCanPersistAssistant blocks when parent user missing', async () => {
    const supabase = createMockSupabase({
      streamRuns: {
        'asst-op-1': {
          data: { assistant_operation_id: 'asst-op-1', status: 'running' },
          error: null
        }
      },
      parentUser: { data: null, error: null }
    });
    service = StreamLifecycleService.resetForTests(supabase);

    const result = await service.assertCanPersistAssistant({
      sessionId: 'session-1',
      userId: 'user-1',
      userOperationId: 'user-op-1',
      assistantOperationId: 'asst-op-1'
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('parent_user_missing');
  });

  it('assertCanPersistAssistant blocks stale user turn', async () => {
    const supabase = createMockSupabase({
      streamRuns: {
        'asst-op-1': {
          data: { assistant_operation_id: 'asst-op-1', status: 'running' },
          error: null
        }
      },
      parentUser: { data: { sequence_number: 1 }, error: null },
      latestUser: { data: { sequence_number: 3 }, error: null }
    });
    service = StreamLifecycleService.resetForTests(supabase);

    const result = await service.assertCanPersistAssistant({
      sessionId: 'session-1',
      userId: 'user-1',
      userOperationId: 'user-op-1',
      assistantOperationId: 'asst-op-1'
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('stale_user_turn');
  });

  it('registerRun upserts on user_operation_id first', async () => {
    const supabase = createMockSupabase({}) as SupabaseClient & {
      upsertCalls: Array<{ onConflict?: string }>;
    };
    service = StreamLifecycleService.resetForTests(supabase);

    await service.registerRun({
      sessionId: 'session-1',
      userId: 'user-1',
      userOperationId: 'user-op-1',
      assistantOperationId: 'asst-op-1'
    });

    expect(supabase.upsertCalls[0]?.onConflict).toBe('user_operation_id');
    expect(supabase.upsertCalls).toHaveLength(1);
  });

  it('registerRun falls back to assistant_operation_id upsert on user_operation_id conflict', async () => {
    const supabase = createMockSupabase({
      upsertErrorsByConflict: {
        user_operation_id: { message: 'unique violation user_operation_id' }
      }
    }) as SupabaseClient & { upsertCalls: Array<{ onConflict?: string }> };
    service = StreamLifecycleService.resetForTests(supabase);

    await service.registerRun({
      sessionId: 'session-1',
      userId: 'user-1',
      userOperationId: 'user-op-1',
      assistantOperationId: 'asst-op-2'
    });

    expect(supabase.upsertCalls[0]?.onConflict).toBe('user_operation_id');
    expect(supabase.upsertCalls[1]?.onConflict).toBe('assistant_operation_id');
  });

  it('resolveRunForSession returns mismatch when session differs', async () => {
    const supabase = createMockSupabase({
      streamRuns: {
        'asst-op-1': {
          data: {
            session_id: 'other-session',
            assistant_operation_id: 'asst-op-1',
            status: 'running'
          },
          error: null
        }
      }
    });
    service = StreamLifecycleService.resetForTests(supabase);

    await expect(
      service.resolveRunForSession('asst-op-1', 'session-1')
    ).resolves.toBe('session_mismatch');
  });

  it('resolveRunForSession returns run when session matches', async () => {
    const runRow = {
      session_id: 'session-1',
      assistant_operation_id: 'asst-op-1',
      status: 'running'
    };
    const supabase = createMockSupabase({
      streamRuns: {
        'asst-op-1': { data: runRow, error: null }
      }
    });
    service = StreamLifecycleService.resetForTests(supabase);

    await expect(service.resolveRunForSession('asst-op-1', 'session-1')).resolves.toEqual(
      runRow
    );
  });

  it('resolveRunForSession returns null when run missing', async () => {
    const supabase = createMockSupabase({
      streamRuns: { 'missing': { data: null, error: null } }
    });
    service = StreamLifecycleService.resetForTests(supabase);

    await expect(service.resolveRunForSession('missing', 'session-1')).resolves.toBeNull();
  });

  it('assertCanPersistAssistant blocks when stream run not active', async () => {
    const supabase = createMockSupabase({
      streamRuns: {
        'asst-op-1': {
          data: { assistant_operation_id: 'asst-op-1', status: 'cancelled' },
          error: null
        }
      }
    });
    service = StreamLifecycleService.resetForTests(supabase);

    const result = await service.assertCanPersistAssistant({
      sessionId: 'session-1',
      userId: 'user-1',
      userOperationId: 'user-op-1',
      assistantOperationId: 'asst-op-1'
    });

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('stream_run_not_active');
  });
});
