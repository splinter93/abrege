/**
 * Tests unitaires pour StreamParser
 * Démontre la testabilité du nouveau design
 */

import { StreamParser } from '../StreamParser';

describe('StreamParser', () => {
  let parser: StreamParser;

  beforeEach(() => {
    parser = new StreamParser();
  });

  describe('parseChunk', () => {
    it('should parse a complete SSE chunk', () => {
      const chunk = new TextEncoder().encode('data: {"type":"delta","content":"Hello"}\n\n');
      const parsed = parser.parseChunk(chunk);

      expect(parsed).toEqual([{
        type: 'delta',
        content: 'Hello'
      }]);
    });

    it('should parse multiple chunks in one call', () => {
      const chunk = new TextEncoder().encode(
        'data: {"type":"delta","content":"Hello"}\n\n' +
        'data: {"type":"delta","content":" World"}\n\n'
      );
      const parsed = parser.parseChunk(chunk);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].content).toBe('Hello');
      expect(parsed[1].content).toBe(' World');
    });

    it('should handle partial chunks with buffer', () => {
      // Premier chunk incomplet
      const chunk1 = new TextEncoder().encode('data: {"type":"del');
      const parsed1 = parser.parseChunk(chunk1);

      expect(parsed1).toEqual([]); // Pas de chunk complet

      // Deuxième chunk complète
      const chunk2 = new TextEncoder().encode('ta","content":"Hi"}\n\n');
      const parsed2 = parser.parseChunk(chunk2);

      expect(parsed2).toEqual([{
        type: 'delta',
        content: 'Hi'
      }]);
    });

    it('should ignore lines without data: prefix', () => {
      const chunk = new TextEncoder().encode(
        ': comment line\n' +
        'data: {"type":"delta","content":"Hello"}\n\n' +
        '\n' +
        'data: {"type":"done"}\n\n'
      );
      const parsed = parser.parseChunk(chunk);

      expect(parsed).toHaveLength(2);
      expect(parsed[0].type).toBe('delta');
      expect(parsed[1].type).toBe('done');
    });

    it('should handle invalid JSON gracefully', () => {
      const chunk = new TextEncoder().encode('data: {invalid json}\n\n');
      const parsed = parser.parseChunk(chunk);

      expect(parsed).toEqual([]); // Chunk ignoré
    });
  });

  describe('reset', () => {
    it('should clear the buffer', () => {
      const chunk = new TextEncoder().encode('data: {"type":"del');
      parser.parseChunk(chunk);

      const stateBefore = parser.getBufferState();
      expect(stateBefore.hasData).toBe(true);

      parser.reset();

      const stateAfter = parser.getBufferState();
      expect(stateAfter.hasData).toBe(false);
      expect(stateAfter.length).toBe(0);
    });
  });

  describe('getBufferState', () => {
    it('should return correct buffer state', () => {
      const state1 = parser.getBufferState();
      expect(state1.hasData).toBe(false);
      expect(state1.length).toBe(0);

      const chunk = new TextEncoder().encode('partial');
      parser.parseChunk(chunk);

      const state2 = parser.getBufferState();
      expect(state2.hasData).toBe(true);
      expect(state2.length).toBeGreaterThan(0);
    });
  });
});

