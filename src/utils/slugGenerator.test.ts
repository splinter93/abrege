import { describe, it, expect, vi, beforeEach } from 'vitest';
// import.*SlugGenerator.*from './slugGenerator';

// Mock Supabase client
  // const mockSupabase = [^;]+;

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
      // const userId = [^;]+;

      // const result = [^;]+;
      
      expect(result).toBe('ma-premiere-note');
    });

    it('should handle special characters and accents', async () => {
      const title = 'Note avec caractères spéciaux: éàç!';
      const type = 'note';
      // const userId = [^;]+;

      // const result = [^;]+;
      
      expect(result).toBe('note-avec-caracteres-speciaux-eac');
    });

    it('should handle multiple spaces', async () => {
      const title = 'Dossier   avec   espaces   multiples';
      const type = 'folder';
      // const userId = [^;]+;

      // const result = [^;]+;
      
      expect(result).toBe('dossier-avec-espaces-multiples');
    });

    it('should handle empty title', async () => {
      const title = '';
      const type = 'note';
      // const userId = [^;]+;

      // const result = [^;]+;
      
      expect(result).toBe('');
    });

    it('should handle numbers and special characters', async () => {
      const title = 'Note 123 avec @#$% caractères';
      const type = 'note';
      // const userId = [^;]+;

      // const result = [^;]+;
      
      expect(result).toBe('note-123-avec-caracteres');
    });
  });

  describe('slugify function', () => {
    it('should normalize unicode characters', () => {
      const input = 'café résumé naïve';
      const expected = 'cafe-resume-naive';
      
      // Test the slugify logic directly
      // const result = [^;]+;
      
      expect(result).toBe(expected);
    });

    it('should handle multiple hyphens', () => {
      const input = 'note---avec---trop---de---tirets';
      const expected = 'note-avec-trop-de-tirets';
      
      // const result = [^;]+;
      
      expect(result).toBe(expected);
    });
  });
}); 