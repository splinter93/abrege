import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from './route';
undefined';

// Mock Supabase
vi.mock('@/utils/supabase', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: { id: 'test-id' } }))
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null }))
      }))
    }))
  }))
}));

// Mock ResourceResolver
vi.mock('@/utils/resourceResolver', () => ({
  ResourceResolver: {
    resolveRef: vi.fn()
  }
}));

// Mock middleware
vi.mock('@/middleware/resourceResolver', () => ({
  resolveNoteRef: vi.fn(() => Promise.resolve('test-id'))
}));

describe('Note API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/note/[ref]', () => {
    it('should get note by ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/note/123e4567-e89b-12d3-a456-426614174000');
      
      const response = await GET(request, { params: Promise.resolve({ ref: '123e4567-e89b-12d3-a456-426614174000' }) });
      
      expect(response.status).toBe(200);
    });

    it('should get note by slug', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/note/ma-premiere-note');
      
      const response = await GET(request, { params: Promise.resolve({ ref: 'ma-premiere-note' }) });
      
      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent note', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/note/note-inexistante');
      
      const response = await GET(request, { params: Promise.resolve({ ref: 'note-inexistante' }) });
      
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/note/[ref]', () => {
    it('should delete note by ID', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/note/123e4567-e89b-12d3-a456-426614174000', {
        method: 'DELETE'
      });
      
      const response = await DELETE(request, { params: Promise.resolve({ ref: '123e4567-e89b-12d3-a456-426614174000' }) });
      
      expect(response.status).toBe(200);
    });

    it('should delete note by slug', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/note/ma-premiere-note', {
        method: 'DELETE'
      });
      
      const response = await DELETE(request, { params: Promise.resolve({ ref: 'ma-premiere-note' }) });
      
      expect(response.status).toBe(200);
    });
  });
}); 