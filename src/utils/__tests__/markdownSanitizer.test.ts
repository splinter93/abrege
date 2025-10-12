/**
 * Tests pour le système de sanitization bidirectionnel
 * Serveur ↔ Client
 * 
 * @description Tests unitaires pour valider le cycle complet:
 * 1. Serveur échappe le HTML (sanitizeMarkdownContent)
 * 2. Client dé-échappe pour l'éditeur (unescapeHtmlEntities)
 * 3. Cycle complet fonctionne sans perte de données
 */

import { describe, it, expect } from 'vitest';
import { sanitizeMarkdownContent, isMarkdownSafe, cleanAndSanitizeMarkdown } from '../markdownSanitizer.server';
import { unescapeHtmlEntities, prepareMarkdownForEditor, sanitizeForEditor, detectDangerousHtml } from '../markdownSanitizer.client';

describe('Sanitization côté serveur', () => {
  describe('sanitizeMarkdownContent', () => {
    it('devrait échapper le HTML brut', () => {
      const input = '# Title\n<script>alert("XSS")</script>';
      const expected = '# Title\n&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
      expect(sanitizeMarkdownContent(input)).toBe(expected);
    });

    it('devrait gérer les balises imbriquées', () => {
      const input = '<div><span onclick="alert()">Click</span></div>';
      const expected = '&lt;div&gt;&lt;span onclick=&quot;alert()&quot;&gt;Click&lt;/span&gt;&lt;/div&gt;';
      expect(sanitizeMarkdownContent(input)).toBe(expected);
    });

    it('ne devrait pas modifier le markdown pur', () => {
      const input = '# Title\n\n**Bold** and *italic* text\n\n- List item';
      expect(sanitizeMarkdownContent(input)).toBe(input);
    });

    it('devrait échapper les caractères spéciaux dans l\'ordre correct', () => {
      const input = 'Text with & < > " \' symbols';
      const expected = 'Text with &amp; &lt; &gt; &quot; &#039; symbols';
      expect(sanitizeMarkdownContent(input)).toBe(expected);
    });

    it('devrait gérer les chaînes vides', () => {
      expect(sanitizeMarkdownContent('')).toBe('');
      expect(sanitizeMarkdownContent(null as any)).toBe(null);
      expect(sanitizeMarkdownContent(undefined as any)).toBe(undefined);
    });
  });

  describe('isMarkdownSafe', () => {
    it('devrait détecter les scripts dangereux', () => {
      expect(isMarkdownSafe('<script>alert("XSS")</script>')).toBe(false);
      expect(isMarkdownSafe('<iframe src="evil.com"></iframe>')).toBe(false);
      expect(isMarkdownSafe('<img onerror="alert()" />')).toBe(false);
    });

    it('devrait accepter le markdown sécurisé', () => {
      expect(isMarkdownSafe('# Title\n\n**Bold**')).toBe(true);
      expect(isMarkdownSafe('![image](./test.png)')).toBe(true);
    });
  });

  describe('cleanAndSanitizeMarkdown', () => {
    it('devrait supprimer les éléments dangereux ET échapper le reste', () => {
      const input = '<script>alert()</script>\n<div>Safe content</div>';
      const output = cleanAndSanitizeMarkdown(input);
      
      expect(output).not.toContain('<script>');
      expect(output).toContain('&lt;div&gt;');
      expect(output).toContain('&lt;/div&gt;');
    });

    it('devrait normaliser les sauts de ligne', () => {
      const input = 'Line 1\r\nLine 2\r\nLine 3';
      const output = cleanAndSanitizeMarkdown(input);
      expect(output).toBe('Line 1\nLine 2\nLine 3');
    });
  });
});

describe('Sanitization côté client', () => {
  describe('unescapeHtmlEntities', () => {
    it('devrait dé-échapper les entités HTML', () => {
      const input = '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;';
      const expected = '<script>alert("XSS")</script>';
      expect(unescapeHtmlEntities(input)).toBe(expected);
    });

    it('devrait dé-échapper dans l\'ordre inverse', () => {
      const input = 'Text with &amp; &lt; &gt; &quot; &#039; symbols';
      const expected = 'Text with & < > " \' symbols';
      expect(unescapeHtmlEntities(input)).toBe(expected);
    });

    it('ne devrait pas modifier le texte sans entités', () => {
      const input = '# Title\n\n**Bold** text';
      expect(unescapeHtmlEntities(input)).toBe(input);
    });

    it('devrait gérer les chaînes vides', () => {
      expect(unescapeHtmlEntities('')).toBe('');
      expect(unescapeHtmlEntities(null as any)).toBe(null);
      expect(unescapeHtmlEntities(undefined as any)).toBe(undefined);
    });
  });

  describe('prepareMarkdownForEditor', () => {
    it('devrait dé-échapper ET normaliser', () => {
      const input = '&lt;div&gt;Content&lt;/div&gt;\r\nLine 2  \r\nLine 3';
      const output = prepareMarkdownForEditor(input);
      
      expect(output).toContain('<div>Content</div>');
      expect(output).not.toContain('\r\n');
      expect(output).not.toContain('  \n'); // Espaces en fin de ligne supprimés
    });

    it('devrait ajouter un saut de ligne final si absent', () => {
      const input = 'Content without newline';
      const output = prepareMarkdownForEditor(input);
      expect(output).toBe('Content without newline\n');
    });

    it('ne devrait pas doubler le saut de ligne final', () => {
      const input = 'Content with newline\n';
      const output = prepareMarkdownForEditor(input);
      expect(output).toBe('Content with newline\n');
    });
  });

  describe('detectDangerousHtml', () => {
    it('devrait détecter les patterns dangereux', () => {
      expect(detectDangerousHtml('<script>')).toBe(true);
      expect(detectDangerousHtml('<iframe')).toBe(true);
      expect(detectDangerousHtml('onclick="')).toBe(true);
      expect(detectDangerousHtml('<embed')).toBe(true);
    });

    it('ne devrait pas déclencher de faux positifs', () => {
      expect(detectDangerousHtml('# Title\n\n**Bold**')).toBe(false);
      expect(detectDangerousHtml('Email: test@example.com')).toBe(false);
    });
  });

  describe('sanitizeForEditor', () => {
    it('devrait combiner toutes les étapes de nettoyage', () => {
      const input = '&lt;div&gt;Content&lt;/div&gt;\r\nLine 2  ';
      const output = sanitizeForEditor(input);
      
      expect(output).toContain('<div>Content</div>');
      expect(output).not.toContain('\r\n');
      expect(output).toMatch(/\n$/); // Se termine par un saut de ligne
    });
  });
});

describe('Cycle complet serveur → client', () => {
  it('devrait préserver le contenu après un cycle complet', () => {
    const original = '# Title\n\n**Bold** text with <special> & "quotes"';
    
    // Serveur échappe
    const escaped = sanitizeMarkdownContent(original);
    expect(escaped).not.toBe(original);
    expect(escaped).toContain('&lt;');
    expect(escaped).toContain('&amp;');
    
    // Client dé-échappe
    const unescaped = unescapeHtmlEntities(escaped);
    expect(unescaped).toBe(original);
  });

  it('devrait gérer les tableaux markdown correctement', () => {
    const table = `| Column 1 | Column 2 |
|----------|----------|
| Value 1  | Value 2  |`;

    const escaped = sanitizeMarkdownContent(table);
    const unescaped = unescapeHtmlEntities(escaped);
    expect(unescaped).toBe(table);
  });

  it('devrait préserver le code inline avec <>', () => {
    const code = 'Use `<Component>` in your code';
    
    const escaped = sanitizeMarkdownContent(code);
    // Les blocs de code inline doivent être préservés (pas échappés)
    expect(escaped).toContain('`<Component>`');
    expect(escaped).not.toContain('&lt;Component&gt;');
  });

  it('devrait gérer les blocs de code', () => {
    const codeBlock = '```typescript\nconst x: Array<string> = [];\n```';
    
    const escaped = sanitizeMarkdownContent(codeBlock);
    const unescaped = unescapeHtmlEntities(escaped);
    expect(unescaped).toBe(codeBlock);
  });

  it('ne devrait pas perdre de caractères spéciaux', () => {
    const special = 'Symbols: & < > " \' @ # $ % ^ * ( ) [ ] { } | \\ / ? ! ~ `';
    
    const escaped = sanitizeMarkdownContent(special);
    const unescaped = unescapeHtmlEntities(escaped);
    expect(unescaped).toBe(special);
  });

  it('devrait gérer les multiples cycles sans dégradation', () => {
    const original = 'Text with <html> & "quotes"';
    
    // Cycle 1
    let escaped = sanitizeMarkdownContent(original);
    let unescaped = unescapeHtmlEntities(escaped);
    expect(unescaped).toBe(original);
    
    // Cycle 2 (simuler une re-sauvegarde)
    escaped = sanitizeMarkdownContent(unescaped);
    unescaped = unescapeHtmlEntities(escaped);
    expect(unescaped).toBe(original);
    
    // Cycle 3
    escaped = sanitizeMarkdownContent(unescaped);
    unescaped = unescapeHtmlEntities(escaped);
    expect(unescaped).toBe(original);
  });
});

describe('Cas réels du bug de la note', () => {
  it('devrait gérer le contenu de la note problématique', () => {
    // Extrait du contenu de la note qui causait le bug
    const problematicContent = `# Title\n\n\`\`\`typescript\nconst x = () =&gt; {\n  return true;\n};\n\`\`\``;
    
    // Dé-échapper pour l'éditeur
    const unescaped = unescapeHtmlEntities(problematicContent);
    expect(unescaped).toContain('=>');
    expect(unescaped).not.toContain('&gt;');
  });

  it('devrait gérer les entités HTML dans les balises code', () => {
    const content = '`&lt;Component /&gt;`';
    const unescaped = unescapeHtmlEntities(content);
    expect(unescaped).toBe('`<Component />`');
  });

  it('devrait gérer les citations avec guillemets échappés', () => {
    const content = 'Il a dit &quot;Bonjour&quot;';
    const unescaped = unescapeHtmlEntities(content);
    expect(unescaped).toBe('Il a dit "Bonjour"');
  });
});

describe('Cas limites et edge cases', () => {
  it('devrait gérer les entités HTML incomplètes', () => {
    const input = 'Text with &lt; but no close';
    const unescaped = unescapeHtmlEntities(input);
    expect(unescaped).toBe('Text with < but no close');
  });

  it('devrait gérer les doubles échappements', () => {
    // Simuler un double échappement accidentel
    const doubleEscaped = '&amp;lt;div&amp;gt;';
    const unescaped = unescapeHtmlEntities(doubleEscaped);
    expect(unescaped).toBe('&lt;div&gt;'); // Un seul dé-échappement
  });

  it('devrait gérer les très grands contenus', () => {
    const largeContent = '# Title\n\n' + 'a'.repeat(100000) + '\n\n<tag>';
    const escaped = sanitizeMarkdownContent(largeContent);
    const unescaped = unescapeHtmlEntities(escaped);
    expect(unescaped.length).toBe(largeContent.length);
  });

  it('devrait gérer les contenus multilignes complexes', () => {
    const complex = `# Titre

## Section 1

Texte avec <balise> et &amp; symboles.

\`\`\`typescript
function test<T>(): T {
  return {} as T;
}
\`\`\`

| Col 1 | Col 2 |
|-------|-------|
| <val> | "text" |

> Citation avec 'guillemets'

**Fin**`;

    const escaped = sanitizeMarkdownContent(complex);
    const unescaped = unescapeHtmlEntities(escaped);
    expect(unescaped).toBe(complex);
  });
});

