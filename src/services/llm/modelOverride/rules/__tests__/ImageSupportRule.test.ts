/**
 * Tests unitaires pour ImageSupportRule
 * 
 * Vérifie :
 * - Détection correcte des cas nécessitant un switch
 * - Pas de switch pour xAI (vision native)
 * - Pas de switch si pas d'images
 * - Pas de switch si modèle supporte déjà les images
 * - Switch vers MiMo v2.5 (OpenRouter) si nécessaire
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ImageSupportRule } from '../ImageSupportRule';
import type { ModelOverrideContext } from '../../types';

// Mock getModelInfo
vi.mock('@/constants/groqModels', () => ({
  getModelInfo: vi.fn((modelId: string) => {
    const models: Record<string, { capabilities: string[] }> = {
      'openai/gpt-oss-20b': { capabilities: ['text', 'function_calling'] },
      'openai/gpt-oss-120b': { capabilities: ['text', 'function_calling'] },
      'openrouter/kimi-k2.5': { capabilities: ['text', 'images', 'function_calling'] },
      'openrouter/mimo-v2.5': { capabilities: ['text', 'images', 'function_calling'] }
    };
    return models[modelId] || undefined;
  })
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
        originalModel: 'openrouter/kimi-k2.5',
        provider: 'liminality',
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
    it('devrait retourner MiMo v2.5 (OpenRouter) comme modèle fallback', () => {
      const context: ModelOverrideContext = {
        originalModel: 'openai/gpt-oss-20b',
        provider: 'groq',
        hasImages: true,
        reasoningOverride: null,
        originalParams: {}
      };

      const result = rule.apply(context);

      expect(result.model).toBe('openrouter/mimo-v2.5');
      expect(result.originalModel).toBe('openai/gpt-oss-20b');
      expect(result.wasOverridden).toBe(true);
      expect(result.reason).toContain('MiMo v2.5');
      expect(result.paramsOverride).toEqual({ temperature: 0.5, topP: 0.8 });
    });
  });
});

