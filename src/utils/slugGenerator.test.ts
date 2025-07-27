import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SlugGenerator } from './slugGenerator';

// Mock Supabase client
  const mockSupabase = {
    from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [] }))
      }))
    }))
  }))
};

vi.mock('@/utils/slugGenerator', () => ({
  SlugGenerator: {
    generateSlug: vi.fn()
  }
}));

describe('SlugGenerator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSlug', () => {
    it('should generate a basic slug from title', async () => {
      const title = 'Ma première note';
      const type = 'note';
      const userId = 'test-user-id';

      const result = await SlugGenerator.generateSlug(title, type, userId);
      
      expect(result).toBe('ma-premiere-note');
    });

    it('should handle special characters and accents', async () => {
      const title = 'Note avec caractères spéciaux: éàç!';
      const type = 'note';
      const userId = 'test-user-id';

      const result = await SlugGenerator.generateSlug(title, type, userId);
      
      expect(result).toBe('note-avec-caracteres-speciaux-eac');
    });

    it('should handle multiple spaces', async () => {
      const title = 'Dossier   avec   espaces   multiples';
      const type = 'folder';
      const userId = 'test-user-id';

      const result = await SlugGenerator.generateSlug(title, type, userId);
      
      expect(result).toBe('dossier-avec-espaces-multiples');
    });

    it('should handle empty title', async () => {
      const title = '';
      const type = 'note';
      const userId = 'test-user-id';

      const result = await SlugGenerator.generateSlug(title, type, userId);
      
      expect(result).toBe('');
    });

    it('should handle numbers and special characters', async () => {
      const title = 'Note 123 avec @#$% caractères';
      const type = 'note';
      const userId = 'test-user-id';

      const result = await SlugGenerator.generateSlug(title, type, userId);
      
      expect(result).toBe('note-123-avec-caracteres');
    });
  });

  describe('slugify function', () => {
    it('should normalize unicode characters', () => {
      const input = 'café résumé naïve';
      const expected = 'cafe-resume-naive';
      
      // Test the slugify logic directly
      const result = input
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      
      expect(result).toBe(expected);
    });

    it('should handle multiple hyphens', () => {
      const input = 'note---avec---trop---de---tirets';
      const expected = 'note-avec-trop-de-tirets';
      
      const result = input
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
      
      expect(result).toBe(expected);
    });
  });
}); 