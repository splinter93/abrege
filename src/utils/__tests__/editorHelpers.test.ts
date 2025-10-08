/**
 * Tests unitaires pour editorHelpers
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { debounce, cleanEscapedMarkdown, hashString } from '../editorHelpers';

describe('editorHelpers', () => {
  describe('debounce', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should delay function execution', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 500);

      debouncedFn('test');
      expect(mockFn).not.toHaveBeenCalled();

      jest.advanceTimersByTime(500);
      expect(mockFn).toHaveBeenCalledWith('test');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should cancel previous calls', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 500);

      debouncedFn('call1');
      jest.advanceTimersByTime(250);
      debouncedFn('call2');
      jest.advanceTimersByTime(250);
      debouncedFn('call3');

      jest.advanceTimersByTime(500);

      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call3');
    });

    it('should execute immediately when immediate=true', () => {
      const mockFn = jest.fn();
      const debouncedFn = debounce(mockFn, 500, true);

      debouncedFn('test');
      expect(mockFn).toHaveBeenCalledWith('test');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('cleanEscapedMarkdown', () => {
    it('should remove backslash escaping', () => {
      const input = '\\*bold\\* text with \\_underscore\\_';
      const expected = '*bold* text with _underscore_';
      expect(cleanEscapedMarkdown(input)).toBe(expected);
    });

    it('should handle table pipes', () => {
      const input = '\\| Col 1 \\| Col 2 \\|';
      const expected = '| Col 1 | Col 2 |';
      expect(cleanEscapedMarkdown(input)).toBe(expected);
    });

    it('should convert tilde approximation symbol', () => {
      const input = 'Text with ≈ symbol';
      const expected = 'Text with ~ symbol';
      expect(cleanEscapedMarkdown(input)).toBe(expected);
    });

    it('should handle HTML entities', () => {
      const input = '&lt;div&gt; &amp; text';
      const expected = '<div> & text';
      expect(cleanEscapedMarkdown(input)).toBe(expected);
    });

    it('should return empty string for empty input', () => {
      expect(cleanEscapedMarkdown('')).toBe('');
    });

    it('should handle complex markdown', () => {
      const input = '\\# Title\\n\\*\\*bold\\*\\* and \\~strikethrough\\~';
      const expected = '# Title\n**bold** and ~strikethrough~';
      expect(cleanEscapedMarkdown(input)).toBe(expected);
    });
  });

  describe('hashString', () => {
    it('should return 0 for empty string', () => {
      expect(hashString('')).toBe(0);
    });

    it('should return same hash for same string', () => {
      const hash1 = hashString('test content');
      const hash2 = hashString('test content');
      expect(hash1).toBe(hash2);
    });

    it('should return different hash for different strings', () => {
      const hash1 = hashString('content 1');
      const hash2 = hashString('content 2');
      expect(hash1).not.toBe(hash2);
    });

    it('should return number', () => {
      const hash = hashString('test');
      expect(typeof hash).toBe('number');
    });

    it('should be consistent across calls', () => {
      const content = 'Lorem ipsum dolor sit amet';
      const hashes = [
        hashString(content),
        hashString(content),
        hashString(content),
      ];
      expect(hashes[0]).toBe(hashes[1]);
      expect(hashes[1]).toBe(hashes[2]);
    });
  });
});

