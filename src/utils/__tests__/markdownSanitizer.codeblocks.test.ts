/**
 * Tests spécifiques pour la préservation des blocs de code
 * dans le système de sanitization
 */

import { describe, it, expect } from 'vitest';
import { sanitizeMarkdownContent } from '../markdownSanitizer.server';

describe('Préservation des blocs de code', () => {
  describe('Blocs de code avec backticks triples', () => {
    it('devrait préserver les blocs de code TypeScript', () => {
      const input = `# Title

\`\`\`typescript
function process<T>(items: Array<T>): T[] {
  return items.filter(x => x !== null);
}
\`\`\`

Text after`;

      const output = sanitizeMarkdownContent(input);
      
      // Le bloc de code doit être préservé
      expect(output).toContain('Array<T>');
      expect(output).not.toContain('Array&lt;T&gt;');
      expect(output).toContain('=> x !== null');
    });

    it('devrait préserver les blocs Mermaid', () => {
      const input = `\`\`\`mermaid
graph TB
    A --> B
    A --> C
\`\`\``;

      const output = sanitizeMarkdownContent(input);
      
      // Les flèches doivent être préservées
      expect(output).toContain('-->');
      expect(output).not.toContain('--&gt;');
    });

    it('devrait échapper le HTML en dehors des blocs de code', () => {
      const input = `<script>alert('XSS')</script>

\`\`\`typescript
const x: Array<T> = [];
\`\`\`

<div>Dangerous</div>`;

      const output = sanitizeMarkdownContent(input);
      
      // HTML hors code doit être échappé
      expect(output).toContain('&lt;script&gt;');
      expect(output).toContain('&lt;div&gt;');
      
      // Code doit être préservé
      expect(output).toContain('Array<T>');
      expect(output).not.toContain('Array&lt;T&gt;');
    });
  });

  describe('Code inline avec backticks simples', () => {
    it('devrait préserver le code inline', () => {
      const input = 'Use `<Component />` in React.';
      const output = sanitizeMarkdownContent(input);
      
      expect(output).toContain('`<Component />`');
      expect(output).not.toContain('&lt;Component');
    });

    it('devrait échapper le HTML hors code inline', () => {
      const input = '<div>Text with `<code>` inline</div>';
      const output = sanitizeMarkdownContent(input);
      
      // HTML hors backticks doit être échappé
      expect(output).toContain('&lt;div&gt;');
      
      // Code inline préservé
      expect(output).toContain('`<code>`');
    });

    it('devrait gérer plusieurs blocs inline', () => {
      const input = 'Use `<A>` and `<B>` and `<C>` tags.';
      const output = sanitizeMarkdownContent(input);
      
      expect(output).toContain('`<A>`');
      expect(output).toContain('`<B>`');
      expect(output).toContain('`<C>`');
    });
  });

  describe('Cas mixtes complexes', () => {
    it('devrait gérer code + HTML + texte normal', () => {
      const input = `# Title

<script>alert('XSS')</script>

Use \`Array<T>\` in TypeScript.

\`\`\`typescript
const map: Map<K, V> = new Map();
\`\`\`

<div>Dangerous</div>

More text with "quotes" and 'apostrophes'.`;

      const output = sanitizeMarkdownContent(input);
      
      // Scripts échappés
      expect(output).toContain('&lt;script&gt;');
      expect(output).toContain('&lt;div&gt;');
      
      // Code inline préservé
      expect(output).toContain('`Array<T>`');
      
      // Bloc de code préservé
      expect(output).toContain('Map<K, V>');
      
      // Quotes échappés hors code
      expect(output).toContain('&quot;quotes&quot;');
    });

    it('devrait gérer les blocs de code imbriqués (markdown dans markdown)', () => {
      const input = `\`\`\`markdown
# Example

Use \`<Component />\` here.
\`\`\``;

      const output = sanitizeMarkdownContent(input);
      
      // Tout le bloc externe doit être préservé
      expect(output).toContain('`<Component />`');
    });
  });

  describe('Edge cases avec backticks', () => {
    it('devrait gérer les backticks non fermés', () => {
      const input = 'Text with `open backtick and <tag>';
      const output = sanitizeMarkdownContent(input);
      
      // Le backtick non fermé ne protège pas
      expect(output).toContain('&lt;tag&gt;');
    });

    it('devrait gérer les blocs de code vides', () => {
      const input = '```\n\n```\n<script>alert()</script>';
      const output = sanitizeMarkdownContent(input);
      
      expect(output).toContain('&lt;script&gt;');
    });

    it('devrait gérer les multiples blocs de code', () => {
      const input = `\`\`\`ts
const a: Array<T> = [];
\`\`\`

<script>XSS</script>

\`\`\`js
const b: Set<U> = new Set();
\`\`\``;

      const output = sanitizeMarkdownContent(input);
      
      expect(output).toContain('Array<T>');
      expect(output).toContain('Set<U>');
      expect(output).toContain('&lt;script&gt;');
    });
  });
});

