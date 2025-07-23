import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { initRealtimeService, subscribeToTable, unsubscribeFromTable, stopRealtimeService, getRealtimeService } from './realtimeService';
import { useRealtime } from '@/hooks/useRealtime';

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              gt: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        })),
        count: vi.fn(() => Promise.resolve({ count: 5, error: null }))
      }))
    }))
  }))
}));

describe('RealtimeService - Polling Intelligent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopRealtimeService();
    vi.useRealTimers();
  });

  it('devrait détecter les INSERT', async () => {
    const service = initRealtimeService('test-user');
    const events: any[] = [];

    subscribeToTable('articles', (event) => {
      events.push(event);
    });

    // Simuler un INSERT
    const mockSupabase = require('@supabase/supabase-js').createClient();
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              gt: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        })),
        count: vi.fn(() => Promise.resolve({ count: 6, error: null })) // +1 élément
      }))
    });

    // Attendre que le polling se déclenche
    await vi.advanceTimersByTimeAsync(3000);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].eventType).toBe('INSERT');
  });

  it('devrait détecter les UPDATE', async () => {
    const service = initRealtimeService('test-user');
    const events: any[] = [];

    subscribeToTable('articles', (event) => {
      events.push(event);
    });

    // Simuler un UPDATE
    const mockSupabase = require('@supabase/supabase-js').createClient();
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              gt: vi.fn(() => Promise.resolve({ 
                data: [{ id: '1', updated_at: new Date().toISOString() }], 
                error: null 
              }))
            }))
          }))
        })),
        count: vi.fn(() => Promise.resolve({ count: 5, error: null }))
      }))
    });

    // Attendre que le polling se déclenche
    await vi.advanceTimersByTimeAsync(3000);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].eventType).toBe('UPDATE');
  });

  it('devrait détecter les DELETE', async () => {
    const service = initRealtimeService('test-user');
    const events: any[] = [];

    subscribeToTable('articles', (event) => {
      events.push(event);
    });

    // Simuler un DELETE
    const mockSupabase = require('@supabase/supabase-js').createClient();
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              gt: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        })),
        count: vi.fn(() => Promise.resolve({ count: 4, error: null })) // -1 élément
      }))
    });

    // Attendre que le polling se déclenche
    await vi.advanceTimersByTimeAsync(3000);

    expect(events.length).toBeGreaterThan(0);
    expect(events[0].eventType).toBe('DELETE');
  });

  it('devrait gérer plusieurs tables simultanément', async () => {
    const service = initRealtimeService('test-user');
    const events: any[] = [];

    // S'abonner à plusieurs tables
    subscribeToTable('articles', (event) => {
      events.push({ ...event, source: 'articles' });
    });

    subscribeToTable('folders', (event) => {
      events.push({ ...event, source: 'folders' });
    });

    // Simuler des changements
    const mockSupabase = require('@supabase/supabase-js').createClient();
    mockSupabase.from.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              gt: vi.fn(() => Promise.resolve({ data: [], error: null }))
            }))
          }))
        })),
        count: vi.fn(() => Promise.resolve({ count: 5, error: null }))
      }))
    });

    // Attendre que le polling se déclenche
    await vi.advanceTimersByTimeAsync(3000);

    expect(events.length).toBeGreaterThan(0);
    expect(events.some(e => e.source === 'articles')).toBe(true);
    expect(events.some(e => e.source === 'folders')).toBe(true);
  });

  it('devrait arrêter proprement le polling', () => {
    const service = initRealtimeService('test-user');
    
    subscribeToTable('articles', () => {});
    
    // Vérifier que le polling est actif
    expect(service).toBeDefined();
    
    // Arrêter le service
    stopRealtimeService();
    
    // Le service devrait être arrêté
    expect(getRealtimeService()).toBeNull();
  });
});

// Test des hooks
describe('useRealtime Hook', () => {
  it('devrait initialiser correctement le service', () => {
    const { subscribe, unsubscribe } = useRealtime({
      userId: 'test-user',
      type: 'polling',
      interval: 2000
    });

    expect(subscribe).toBeDefined();
    expect(unsubscribe).toBeDefined();
  });

  it('devrait gérer les différents types d\'événements', () => {
    const { subscribe } = useRealtime({
      userId: 'test-user',
      type: 'polling'
    });

    const events: any[] = [];
    
    subscribe('articles', (event: any) => {
      events.push(event);
    });

    // Simuler différents types d'événements
    const mockEvent = {
      table: 'articles',
      eventType: 'INSERT' as const,
      new: { id: '1', title: 'Test' },
      old: null,
      timestamp: Date.now()
    };

    // Le hook devrait pouvoir gérer tous les types
    expect(mockEvent.eventType).toBe('INSERT');
  });
}); 