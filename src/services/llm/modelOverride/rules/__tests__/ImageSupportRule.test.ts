/**
 * Tests unitaires pour ImageSupportRule
 * 
 * Vérifie :
 * - Détection correcte des cas nécessitant un switch
 * - Pas de switch pour xAI (vision native)
 * - Pas de switch si pas d'images
 * - Pas de switch si modèle supporte déjà les images
 * - Switch vers Llama 4 Maverick si nécessaire
 */

import { ImageSupportRule } from '../ImageSupportRule';
import type { ModelOverrideContext } from '../../types';

// Mock getModelInfo
jest.mock('@/constants/groqModels', () => ({
  getModelInfo: (modelId: string) => {
    const models: Record<string, { capabilities: string[] }> = {
      'openai/gpt-oss-20b': { capabilities: ['text', 'function_calling'] },
      'openai/gpt-oss-120b': { capabilities: ['text', 'function_calling'] },
      'meta-llama/llama-4-maverick-17b-128e-instruct': { capabilities: ['text', 'images', 'function_calling'] },
      'meta-llama/llama-4-scout-17b-16e-instruct': { capabilities: ['text', 'images', 'function_calling'] }
    };
    return models[modelId] || undefined;
  }
}));

describe('ImageSupportRule', () => {
  let rule: ImageSupportRule;

  beforeEach(() => {
    rule = new ImageSupportRule();
  });

  describe('shouldApply', () => {
    it('devrait retourner false pour xAI (vision native)', () => {
      const context: ModelOverrideContext = {
        originalModel: 'grok-4-1-fast-reasoning',
        provider: 'xai',
        hasImages: true,
        reasoningOverride: null,
        originalParams: {}
      };

      expect(rule.shouldApply(context)).toBe(false);
    });

    it('devrait retourner false si pas d\'images', () => {
      const context: ModelOverrideContext = {
        originalModel: 'openai/gpt-oss-20b',
        provider: 'groq',
        hasImages: false,
        reasoningOverride: null,
        originalParams: {}
      };

      expect(rule.shouldApply(context)).toBe(false);
    });

    it('devrait retourner false si modèle supporte déjà les images', () => {
      const context: ModelOverrideContext = {
        originalModel: 'meta-llama/llama-4-maverick-17b-128e-instruct',
        provider: 'groq',
        hasImages: true,
        reasoningOverride: null,
        originalParams: {}
      };

      expect(rule.shouldApply(context)).toBe(false);
    });

    it('devrait retourner true si images présentes et modèle sans vision (non-xAI)', () => {
      const context: ModelOverrideContext = {
        originalModel: 'openai/gpt-oss-20b',
        provider: 'groq',
        hasImages: true,
        reasoningOverride: null,
        originalParams: {}
      };

      expect(rule.shouldApply(context)).toBe(true);
    });
  });

  describe('apply', () => {
    it('devrait retourner Llama 4 Maverick comme modèle fallback', () => {
      const context: ModelOverrideContext = {
        originalModel: 'openai/gpt-oss-20b',
        provider: 'groq',
        hasImages: true,
        reasoningOverride: null,
        originalParams: {}
      };

      const result = rule.apply(context);

      expect(result.model).toBe('meta-llama/llama-4-maverick-17b-128e-instruct');
      expect(result.originalModel).toBe('openai/gpt-oss-20b');
      expect(result.wasOverridden).toBe(true);
      expect(result.reason).toContain('Llama 4 Maverick');
    });
  });
});

