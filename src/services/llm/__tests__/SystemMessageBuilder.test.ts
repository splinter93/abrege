/**
 * Tests unitaires pour SystemMessageBuilder
 * Vérifie notamment l'injection du prompt mode vocal (TTS) quand vocalMode === true
 */

import { describe, it, expect } from 'vitest';
import { SystemMessageBuilder } from '../SystemMessageBuilder';
import type { SystemMessageContext } from '../SystemMessageBuilder';

describe('SystemMessageBuilder', () => {
  const builder = SystemMessageBuilder.getInstance();

  describe('vocalMode (TTS injection)', () => {
    it('injecte le prompt TTS quand vocalMode === true', () => {
      const context: SystemMessageContext = {
        type: 'chat',
        name: 'Session',
        id: 'default',
        vocalMode: true
      };

      const result = builder.buildSystemMessage({}, context);

      expect(result.content).toContain('Tu es en mode vocal');
      expect(result.content).toContain('speech tags');
      expect(result.content).toContain('réponses courtes');
    });

    it('n\'injecte pas le prompt TTS quand vocalMode === false', () => {
      const context: SystemMessageContext = {
        type: 'chat',
        name: 'Session',
        id: 'default',
        vocalMode: false
      };

      const result = builder.buildSystemMessage({}, context);

      expect(result.content).not.toContain('Tu es en mode vocal');
      expect(result.content).not.toContain('speech tags');
    });

    it('n\'injecte pas le prompt TTS quand vocalMode est absent', () => {
      const context: SystemMessageContext = {
        type: 'chat',
        name: 'Session',
        id: 'default'
      };

      const result = builder.buildSystemMessage({}, context);

      expect(result.content).not.toContain('Tu es en mode vocal');
    });
  });
});
