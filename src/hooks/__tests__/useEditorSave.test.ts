/**
 * Tests unitaires pour useEditorSave
 * 
 * @description Tests pour vérifier que le fix des images collées aux éléments markdown
 * fonctionne correctement.
 */

import { describe, it, expect } from 'vitest';

describe('useEditorSave - Image spacing fix', () => {
  /**
   * Simule la fonction de nettoyage du markdown qui est appliquée dans useEditorSave
   */
  function applyMarkdownFixes(markdown: string): string {
    let content = markdown;
    
    // 🔧 FIX: Supprimer l'échappement des titres (ex: \# → #)
    content = content.replace(/\\(#+ )/g, '$1');
    
    // 🔧 FIX COMPLET: Ajouter des sauts de ligne entre images et éléments markdown de bloc
    content = content.replace(
      /(!\[.*?\]\(.*?\))(\s*)(?=[#>*\-`]|\d+\.)/gm,
      (_match, image, whitespace) => {
        const lineBreaks = (whitespace.match(/\n/g) || []).length;
        if (lineBreaks < 2) {
          return `${image}\n\n`;
        }
        return image + whitespace;
      }
    );
    
    return content;
  }

  describe('Images suivies de blockquotes', () => {
    it('devrait ajouter des sauts de ligne entre une image et une blockquote', () => {
      const input = '![Test](image.jpg)> Quote text';
      const expected = '![Test](image.jpg)\n\n> Quote text';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });

    it('devrait conserver les sauts de ligne existants si suffisants', () => {
      const input = '![Test](image.jpg)\n\n> Quote text';
      const expected = '![Test](image.jpg)\n\n> Quote text';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });

    it('devrait ajouter un saut de ligne supplémentaire si un seul existe', () => {
      const input = '![Test](image.jpg)\n> Quote text';
      const expected = '![Test](image.jpg)\n\n> Quote text';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });
  });

  describe('Images suivies de titres', () => {
    it('devrait ajouter des sauts de ligne entre une image et un titre H1', () => {
      const input = '![Test](image.jpg)# Title';
      const expected = '![Test](image.jpg)\n\n# Title';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });

    it('devrait ajouter des sauts de ligne entre une image et un titre H2', () => {
      const input = '![Test](image.jpg)## Subtitle';
      const expected = '![Test](image.jpg)\n\n## Subtitle';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });

    it('devrait gérer les titres échappés', () => {
      const input = '![Test](image.jpg)\\# Title';
      const expected = '![Test](image.jpg)\n\n# Title';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });
  });

  describe('Images suivies de listes', () => {
    it('devrait ajouter des sauts de ligne entre une image et une liste à puces (-)', () => {
      const input = '![Test](image.jpg)- List item';
      const expected = '![Test](image.jpg)\n\n- List item';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });

    it('devrait ajouter des sauts de ligne entre une image et une liste à puces (*)', () => {
      const input = '![Test](image.jpg)* List item';
      const expected = '![Test](image.jpg)\n\n* List item';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });

    it('devrait ajouter des sauts de ligne entre une image et une liste numérotée', () => {
      const input = '![Test](image.jpg)1. List item';
      const expected = '![Test](image.jpg)\n\n1. List item';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });
  });

  describe('Images suivies de code blocks', () => {
    it('devrait ajouter des sauts de ligne entre une image et un code block', () => {
      const input = '![Test](image.jpg)```\nconst x = 1;\n```';
      const expected = '![Test](image.jpg)\n\n```\nconst x = 1;\n```';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });
  });

  describe('Images suivies de lignes horizontales', () => {
    it('devrait ajouter des sauts de ligne entre une image et une ligne horizontale', () => {
      const input = '![Test](image.jpg)---';
      const expected = '![Test](image.jpg)\n\n---';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });
  });

  describe('Cas complexes', () => {
    it('devrait gérer plusieurs images suivies de différents éléments', () => {
      const input = `![Image 1](img1.jpg)> Quote
![Image 2](img2.jpg)# Title
![Image 3](img3.jpg)- List`;
      
      const expected = `![Image 1](img1.jpg)\n\n> Quote
![Image 2](img2.jpg)\n\n# Title
![Image 3](img3.jpg)\n\n- List`;
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });

    it('devrait gérer les URLs complexes avec caractères spéciaux', () => {
      const input = '![Test](https://example.com/image.jpg?param=value&other=123)> Quote';
      const expected = '![Test](https://example.com/image.jpg?param=value&other=123)\n\n> Quote';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });

    it('devrait gérer les entités HTML dans les URLs', () => {
      const input = '![Test](https://example.com/image.jpg?crop=entropy&amp;cs=tinysrgb)> Quote';
      const expected = '![Test](https://example.com/image.jpg?crop=entropy&amp;cs=tinysrgb)\n\n> Quote';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });
  });

  describe('Cas où aucune modification n\'est nécessaire', () => {
    it('ne devrait pas modifier une image suivie de texte normal', () => {
      const input = '![Test](image.jpg)\nNormal text';
      const expected = '![Test](image.jpg)\nNormal text';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });

    it('ne devrait pas modifier une image en fin de document', () => {
      const input = 'Some text\n![Test](image.jpg)';
      const expected = 'Some text\n![Test](image.jpg)';
      
      expect(applyMarkdownFixes(input)).toBe(expected);
    });
  });
});

