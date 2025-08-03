import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';
undefined';

// Mock SlugGenerator
vi.mock('@/utils/slugGenerator', () => ({
  SlugGenerator: {
    generateSlug: vi.fn(() => Promise.resolve('generated-slug'))
  }
}));

describe('Slug Generation API Endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/v1/slug/generate', () => {
    it('should generate slug for note', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/slug/generate', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Ma nouvelle note',
          type: 'note'
        })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.slug).toBe('generated-slug');
    });

    it('should generate slug for folder', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/slug/generate', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Mon nouveau dossier',
          type: 'folder'
        })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.slug).toBe('generated-slug');
    });

    it('should generate slug for classeur', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/slug/generate', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Mon nouveau classeur',
          type: 'classeur'
        })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
      
      const responseData = await response.json();
      expect(responseData.slug).toBe('generated-slug');
    });

    it('should validate required fields', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/slug/generate', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test'
          // Missing type field
        })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(422);
    });

    it('should validate type field', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/slug/generate', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Test',
          type: 'invalid-type'
        })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(422);
    });

    it('should handle empty title', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/slug/generate', {
        method: 'POST',
        body: JSON.stringify({
          title: '',
          type: 'note'
        })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(422);
    });

    it('should handle invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/slug/generate', {
        method: 'POST',
        body: 'invalid json'
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(422);
    });

    it('should handle special characters in title', async () => {
      const request = new NextRequest('http://localhost:3000/api/v1/slug/generate', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Note avec caractères spéciaux: éàç!',
          type: 'note'
        })
      });
      
      const response = await POST(request);
      
      expect(response.status).toBe(200);
    });
  });
}); 