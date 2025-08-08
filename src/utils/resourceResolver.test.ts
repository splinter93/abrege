import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ResourceResolver } from './resourceResolver';

// Mock Supabase client
    // const mockSupabase = [^;]+;

vi.mock('@/utils/resourceResolver', () => ({
  ResourceResolver: {
    resolveRef: vi.fn()
  }
}));

describe('ResourceResolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveRef', () => {
    it('should resolve note by ID', async () => {
      const ref = '123e4567-e89b-12d3-a456-426614174000';
      const type = 'note';
      // const userId = [^;]+;

      // const result = [^;]+;
      
      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should resolve note by slug', async () => {
      const ref = 'ma-premiere-note';
      const type = 'note';
      // const userId = [^;]+;

      // const result = [^;]+;
      
      expect(result).toBe('test-id');
    });

    it('should resolve folder by ID', async () => {
      const ref = '123e4567-e89b-12d3-a456-426614174000';
      const type = 'folder';
      // const userId = [^;]+;

      // const result = [^;]+;
      
      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should resolve folder by slug', async () => {
      const ref = 'mon-dossier-important';
      const type = 'folder';
      // const userId = [^;]+;

      // const result = [^;]+;
      
      expect(result).toBe('test-id');
    });

    it('should resolve classeur by ID', async () => {
      const ref = '123e4567-e89b-12d3-a456-426614174000';
      const type = 'classeur';
      // const userId = [^;]+;

      // const result = [^;]+;
      
      expect(result).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should resolve classeur by slug', async () => {
      const ref = 'classeur-de-travail';
      const type = 'classeur';
      // const userId = [^;]+;

      // const result = [^;]+;
      
      expect(result).toBe('test-id');
    });

    it('should return null for non-existent resource', async () => {
      const ref = 'resource-inexistante';
      const type = 'note';
      // const userId = [^;]+;

      // const result = [^;]+;
      
      expect(result).toBeNull();
    });
  });

  describe('isUUID', () => {
    it('should identify valid UUIDs', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000',
        '6ba7b810-9dad-11d1-80b4-00c04fd430c8'
      ];

      validUUIDs.forEach(uuid => {
        expect(ResourceResolver['isUUID'](uuid)).toBe(true);
      });
    });

    it('should reject invalid UUIDs', () => {
      const invalidUUIDs = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456', // too short
        '123e4567-e89b-12d3-a456-426614174000-extra', // too long
        '123e4567-e89b-12d3-a456-42661417400g' // invalid character
      ];

      invalidUUIDs.forEach(uuid => {
        expect(ResourceResolver['isUUID'](uuid)).toBe(false);
      });
    });
  });

  describe('getTableName', () => {
    it('should return correct table names', () => {
      expect(ResourceResolver['getTableName']('note')).toBe('articles');
      expect(ResourceResolver['getTableName']('folder')).toBe('folders');
      expect(ResourceResolver['getTableName']('classeur')).toBe('classeurs');
    });
  });
}); 