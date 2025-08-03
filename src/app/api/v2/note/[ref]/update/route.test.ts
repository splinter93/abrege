import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock des utilitaires V2
vi.mock('@/utils/logger', () => ({
  logApi: vi.fn()
}));

vi.mock('@/utils/v2ResourceResolver', () => ({
  V2ResourceResolver: {
    resolveRef: vi.fn(() => Promise.resolve({ success: true, id: 'test-id' }))
  }
}));

vi.mock('@/utils/authUtils', () => ({
  getAuthenticatedUser: vi.fn(() => Promise.resolve({ 
    success: true, 
    userId: 'test-user-id' 
  })),
  checkUserPermission: vi.fn(() => Promise.resolve({ 
    success: true, 
    hasPermission: true 
  }))
}));

vi.mock('@/utils/v2ValidationSchemas', () => ({
  validatePayload: vi.fn(() => ({ success: true, data: {} })),
  createValidationErrorResponse: vi.fn(() => new Response())
}));

vi.mock('@/services/clientPollingTrigger', () => ({
  clientPollingTrigger: {
    triggerArticlesPolling: vi.fn(),
    triggerClasseursPolling: vi.fn()
  }
}));

// Mock Supabase
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' } }))
      }))
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' } }))
        }))
      }))
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
    }))
  }))
};

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => mockSupabase)
}));

describe('Note Update V2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('PUT /api/v2/note/[ref]/update', () => {
    it('should handle successful put request', async () => {
      const request = new NextRequest('http://localhost:3000/api/v2/note/[ref]/update', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ test: "data" })
      });
      
      const { PUT } = await import('./route');
      
      const response = await PUT(request, { 
        params: Promise.resolve({ ref: 'test-ref' }) 
      });
      
      expect(response.status).toBe(200);
    });

    it('should handle authentication error', async () => {
      const { getAuthenticatedUser } = await import('@/utils/authUtils');
      getAuthenticatedUser.mockResolvedValueOnce({ 
        success: false, 
        error: 'Token invalide' 
      });

      const request = new NextRequest('http://localhost:3000/api/v2/note/[ref]/update', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });
      
      const { PUT } = await import('./route');
      
      const response = await PUT(request, { 
        params: Promise.resolve({ ref: 'test-ref' }) 
      });
      
      expect(response.status).toBe(401);
    });

    it('should handle validation error', async () => {
      const { validatePayload } = await import('@/utils/v2ValidationSchemas');
      validatePayload.mockReturnValueOnce({ 
        success: false, 
        error: 'Validation failed',
        details: ['Invalid data']
      });

      const request = new NextRequest('http://localhost:3000/api/v2/note/[ref]/update', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ invalid: 'data' })
      });
      
      const { PUT } = await import('./route');
      
      const response = await PUT(request, { 
        params: Promise.resolve({ ref: 'test-ref' }) 
      });
      
      expect(response.status).toBe(422);
    });

    it('should handle permission error', async () => {
      const { checkUserPermission } = await import('@/utils/authUtils');
      checkUserPermission.mockResolvedValueOnce({ 
        success: true, 
        hasPermission: false 
      });

      const request = new NextRequest('http://localhost:3000/api/v2/note/[ref]/update', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });
      
      const { PUT } = await import('./route');
      
      const response = await PUT(request, { 
        params: Promise.resolve({ ref: 'test-ref' }) 
      });
      
      expect(response.status).toBe(403);
    });

    it('should handle server error', async () => {
      mockSupabase.from.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const request = new NextRequest('http://localhost:3000/api/v2/note/[ref]/update', {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer test-token',
          'Content-Type': 'application/json'
        }
      });
      
      const { PUT } = await import('./route');
      
      const response = await PUT(request, { 
        params: Promise.resolve({ ref: 'test-ref' }) 
      });
      
      expect(response.status).toBe(500);
    });
  });
});
