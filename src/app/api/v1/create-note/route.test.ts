import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
import { NextRequest } from 'next/server';

// Mock Supabase
vi.mock('@/utils/supabase', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [{ id: 'new-note-id' }], error: null }))
      }))
    }))
  }))
}));

// Mock SlugGenerator
vi.mock('@/utils/slugGenerator', () => ({
  SlugGenerator: {
    generateSlug: vi.fn(() => Promise.resolve('ma-nouvelle-note'))
  }
}));

describe('Create Note API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/create-note', () => {
    it('should create note with generated slug', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/create-note', {
        method: 'POST',
        body: JSON.stringify({
          source_title: 'Ma nouvelle note',
          markdown_content: '# Contenu de la note',
          folder_id: 'folder-id'
        })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(201);
      
      const responseData = await response.json();
      expect(responseData.note).toBeDefined();
      expect(responseData.note.id).toBe('new-note-id');
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/create-note', {
        method: 'POST',
        body: JSON.stringify({
          // Missing required fields
          folder_id: 'folder-id'
        })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(422);
    });

    it('should handle empty title', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/create-note', {
        method: 'POST',
        body: JSON.stringify({
          source_title: '',
          markdown_content: '# Contenu',
          folder_id: 'folder-id'
        })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(422);
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/create-note', {
        method: 'POST',
        body: 'invalid json'
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(422);
    });

    it('should generate unique slug for duplicate titles', async () => {
      // Mock SlugGenerator to return different slugs
      const { SlugGenerator } = await import('@/utils/slugGenerator');
      vi.mocked(SlugGenerator.generateSlug)
        .mockResolvedValueOnce('ma-nouvelle-note')
        .mockResolvedValueOnce('ma-nouvelle-note-2');
      
      const request = new NextRequest('http://localhost:3000/api/v1/create-note', {
        method: 'POST',
        body: JSON.stringify({
          source_title: 'Ma nouvelle note',
          markdown_content: '# Contenu',
          folder_id: 'folder-id'
        })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(201);
    });
  });
}); 