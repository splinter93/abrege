/**
 * Tests unitaires pour ReasoningOverrideRule
 * 
 * Vérifie :
 * - Détection correcte des cas nécessitant un override
 * - Mapping correct par provider et niveau reasoning
 * - Override des paramètres selon le niveau
 * - Pas d'override si reasoningOverride === null
 */

import { ReasoningOverrideRule } from '../ReasoningOverrideRule';
import type { ModelOverrideContext } from '../../types';

describe('ReasoningOverrideRule', () => {
  let rule: ReasoningOverrideRule;

  beforeEach(() => {
    rule = new ReasoningOverrideRule();
  });

  describe('shouldApply', () => {
    it('devrait retourner false si reasoningOverride === null', () => {
      const context: ModelOverrideContext = {
        originalModel: 'grok-4-1-fast-reasoning',
        provider: 'xai',
        hasImages: false,
        reasoningOverride: null,
        originalParams: {}
      };

      expect(rule.shouldApply(context)).toBe(false);
    });

    it('devrait retourner true si reasoningOverride présent', () => {
      const context: ModelOverrideContext = {
        originalModel: 'grok-4-1-fast-non-reasoning',
        provider: 'xai',
        hasImages: false,
        reasoningOverride: 'advanced',
        originalParams: {}
      };

      expect(rule.shouldApply(context)).toBe(true);
    });
  });

  describe('apply', () => {
    it('devrait mapper advanced → grok-beta pour xAI', () => {
      const context: ModelOverrideContext = {
        originalModel: 'grok-4-1-fast-non-reasoning',
        provider: 'xai',
        hasImages: false,
        reasoningOverride: 'advanced',
        originalParams: { temperature: 0.7, topP: 0.9, maxTokens: 8000 }
      };

      const result = rule.apply(context);

      expect(result.model).toBe('grok-beta');
      expect(result.wasOverridden).toBe(true);
      expect(result.reason).toContain('advanced');
      
      // Advanced : température plus basse
      expect(result.paramsOverride?.temperature).toBeLessThanOrEqual(0.5);
    });

    it('devrait mapper general → grok-4-1-fast-reasoning pour xAI', () => {
      const context: ModelOverrideContext = {
        originalModel: 'grok-4-1-fast-non-reasoning',
        provider: 'xai',
        hasImages: false,
        reasoningOverride: 'general',
        originalParams: { temperature: 0.7, topP: 0.9, maxTokens: 8000 }
      };

      const result = rule.apply(context);

      expect(result.model).toBe('grok-4-1-fast-reasoning');
      expect(result.wasOverridden).toBe(true);
      expect(result.reason).toContain('general');
      
      // General : pas d'override params
      expect(result.paramsOverride).toBeUndefined();
    });

    it('devrait mapper fast → grok-4-1-fast-non-reasoning pour xAI', () => {
      const context: ModelOverrideContext = {
        originalModel: 'grok-4-1-fast-reasoning',
        provider: 'xai',
        hasImages: false,
        reasoningOverride: 'fast',
        originalParams: { temperature: 0.5, topP: 0.9, maxTokens: 8000 }
      };

      const result = rule.apply(context);

      expect(result.model).toBe('grok-4-1-fast-non-reasoning');
      expect(result.wasOverridden).toBe(true);
      expect(result.reason).toContain('fast');
      
      // Fast : température plus haute
      expect(result.paramsOverride?.temperature).toBeGreaterThanOrEqual(0.8);
    });

    it('devrait retourner pas d\'override si provider non supporté', () => {
      const context: ModelOverrideContext = {
        originalModel: 'openai/gpt-oss-20b',
        provider: 'groq',
        hasImages: false,
        reasoningOverride: 'advanced',
        originalParams: {}
      };

      const result = rule.apply(context);

      expect(result.wasOverridden).toBe(false);
      expect(result.model).toBe('openai/gpt-oss-20b');
    });

    it('devrait override température pour advanced (max 0.5)', () => {
      const context: ModelOverrideContext = {
        originalModel: 'grok-4-1-fast-non-reasoning',
        provider: 'xai',
        hasImages: false,
        reasoningOverride: 'advanced',
        originalParams: { temperature: 0.9, topP: 0.9, maxTokens: 8000 }
      };

      const result = rule.apply(context);

      expect(result.paramsOverride?.temperature).toBe(0.5);
    });

    it('devrait override température pour fast (min 0.8)', () => {
      const context: ModelOverrideContext = {
        originalModel: 'grok-4-1-fast-reasoning',
        provider: 'xai',
        hasImages: false,
        reasoningOverride: 'fast',
        originalParams: { temperature: 0.3, topP: 0.9, maxTokens: 8000 }
      };

      const result = rule.apply(context);

      expect(result.paramsOverride?.temperature).toBe(0.8);
    });
  });
});

