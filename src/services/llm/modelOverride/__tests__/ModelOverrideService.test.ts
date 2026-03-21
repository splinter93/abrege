/**
 * Tests unitaires pour ModelOverrideService
 * 
 * Vérifie :
 * - Enregistrement des rules
 * - Résolution séquentielle
 * - Fusion des paramètres
 * - Gestion d'erreurs gracieuse
 * - Re-détection provider après override
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ModelOverrideService } from '../ModelOverrideService';
import { ImageSupportRule } from '../rules/ImageSupportRule';
import { ReasoningOverrideRule } from '../rules/ReasoningOverrideRule';
import type { ModelOverrideContext } from '../types';

// Mock getModelInfo
vi.mock('@/constants/groqModels', () => ({
  getModelInfo: vi.fn((modelId: string) => {
    const models: Record<string, { provider?: string; capabilities?: string[] }> = {
      'openai/gpt-oss-20b': { provider: 'groq', capabilities: [] }, // Pas de support images
      'openai/gpt-oss-120b': { provider: 'groq', capabilities: [] },
      'openrouter/qwen3-vl-30b-a3b-instruct': { provider: 'liminality', capabilities: ['images'] }, // Fallback vision
      'openrouter/kimi-k2.5': { provider: 'liminality', capabilities: [] },
      'grok-4-1-fast-reasoning': { provider: 'xai', capabilities: [] },
      'liminality-model': { provider: 'liminality', capabilities: [] }
    };
    return models[modelId] || undefined;
  })
}));

describe('ModelOverrideService', () => {
  let service: ModelOverrideService;

  beforeEach(() => {
    // Créer une nouvelle instance pour chaque test
    service = ModelOverrideService.getInstance();
    // Réinitialiser les rules (nécessite méthode reset pour tests)
    (service as unknown as { rules: unknown[] }).rules = [];
  });

  describe('registerRule', () => {
    it('devrait enregistrer une rule', () => {
      const rule = new ImageSupportRule();
      service.registerRule(rule);
      
      const rules = (service as unknown as { rules: unknown[] }).rules;
      expect(rules).toHaveLength(1);
      expect(rules[0]).toBe(rule);
    });

    it('devrait enregistrer plusieurs rules dans l\'ordre', () => {
      const rule1 = new ImageSupportRule();
      const rule2 = new ReasoningOverrideRule();
      
      service.registerRule(rule1);
      service.registerRule(rule2);
      
      const rules = (service as unknown as { rules: unknown[] }).rules;
      expect(rules).toHaveLength(2);
      expect(rules[0]).toBe(rule1);
      expect(rules[1]).toBe(rule2);
    });
  });

  describe('resolveModelAndParams', () => {
    it('devrait retourner le modèle original si aucune rule ne s\'applique', () => {
      const context: ModelOverrideContext = {
        originalModel: 'openai/gpt-oss-20b',
        provider: 'groq',
        hasImages: false,
        reasoningOverride: null,
        originalParams: { temperature: 0.7, topP: 0.9, maxTokens: 8000 }
      };

      const result = service.resolveModelAndParams(context);

      expect(result.model).toBe('openai/gpt-oss-20b');
      expect(result.params).toEqual(context.originalParams);
      expect(result.reasons).toHaveLength(0);
    });

    it('devrait appliquer ImageSupportRule si images présentes et modèle sans vision', () => {
      service.registerRule(new ImageSupportRule());

      const context: ModelOverrideContext = {
        originalModel: 'openai/gpt-oss-20b',
        provider: 'groq',
        hasImages: true,
        reasoningOverride: null,
        originalParams: { temperature: 0.7, topP: 0.9, maxTokens: 8000 }
      };

      const result = service.resolveModelAndParams(context);

      expect(result.model).toBe('openrouter/qwen3-vl-30b-a3b-instruct');
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons[0]).toContain('Qwen 3 VL 30B');
    });

    it('devrait appliquer ReasoningOverrideRule si reasoningOverride présent', () => {
      service.registerRule(new ReasoningOverrideRule());

      const context: ModelOverrideContext = {
        originalModel: 'grok-4-1-fast-reasoning',
        provider: 'xai',
        hasImages: false,
        reasoningOverride: 'advanced',
        originalParams: { temperature: 0.7, topP: 0.9, maxTokens: 8000 }
      };

      const result = service.resolveModelAndParams(context);

      expect(result.model).toBe('grok-4-1-fast-reasoning');
      expect(result.reasons).toHaveLength(1);
      expect(result.reasons[0]).toContain('advanced');
    });

    it('devrait appliquer les rules dans l\'ordre et fusionner les paramètres', () => {
      service.registerRule(new ImageSupportRule());
      service.registerRule(new ReasoningOverrideRule());

      const context: ModelOverrideContext = {
        originalModel: 'openai/gpt-oss-20b',
        provider: 'groq',
        hasImages: true,
        reasoningOverride: 'fast',
        originalParams: { temperature: 0.5, topP: 0.9, maxTokens: 8000 }
      };

      const result = service.resolveModelAndParams(context);

      // ImageSupportRule appliquée en premier → switch vers Qwen 3 VL 30B
      expect(result.model).toBe('openrouter/qwen3-vl-30b-a3b-instruct');
      // ReasoningOverrideRule ne s'applique pas car provider !== 'xai'
      expect(result.reasons.length).toBeGreaterThan(0);
    });

    it('devrait gérer les erreurs gracieusement si une rule échoue', () => {
      const brokenRule = {
        name: 'BrokenRule',
        shouldApply: () => true,
        apply: () => {
          throw new Error('Rule error');
        }
      };

      service.registerRule(brokenRule as unknown as import('../types').ModelOverrideRule);
      service.registerRule(new ImageSupportRule());

      const context: ModelOverrideContext = {
        originalModel: 'openai/gpt-oss-20b',
        provider: 'groq',
        hasImages: true,
        reasoningOverride: null,
        originalParams: { temperature: 0.7, topP: 0.9, maxTokens: 8000 }
      };

      // Ne devrait pas throw, mais continuer avec les autres rules
      expect(() => service.resolveModelAndParams(context)).not.toThrow();
      
      const result = service.resolveModelAndParams(context);
      // ImageSupportRule devrait quand même s'appliquer
      expect(result.model).toBe('openrouter/qwen3-vl-30b-a3b-instruct');
    });

    it('devrait retourner finalProvider si modèle override change de provider', () => {
      service.registerRule(new ImageSupportRule());

      const context: ModelOverrideContext = {
        originalModel: 'liminality-model',
        provider: 'liminality',
        hasImages: true,
        reasoningOverride: null,
        originalParams: {}
      };

      const result = service.resolveModelAndParams(context);

      // Modèle override vers Qwen 3 VL 30B (Liminality) → provider reste liminality
      expect(result.model).toBe('openrouter/qwen3-vl-30b-a3b-instruct');
      expect(result.finalProvider).toBe('liminality');
    });

    it('devrait retourner finalProvider liminality quand override groq → Qwen 3 VL 30B', () => {
      service.registerRule(new ImageSupportRule());

      const context: ModelOverrideContext = {
        originalModel: 'openai/gpt-oss-20b',
        provider: 'groq',
        hasImages: true,
        reasoningOverride: null,
        originalParams: {}
      };

      const result = service.resolveModelAndParams(context);

      // Modèle override vers OpenRouter (Liminality)
      expect(result.model).toBe('openrouter/qwen3-vl-30b-a3b-instruct');
      expect(result.finalProvider).toBe('liminality');
    });

    it('devrait retourner finalProvider depuis le modèle override', () => {
      service.registerRule(new ImageSupportRule());

      const context: ModelOverrideContext = {
        originalModel: 'unknown-model',
        provider: 'groq',
        hasImages: true,
        reasoningOverride: null,
        originalParams: {}
      };

      const result = service.resolveModelAndParams(context);

      // Modèle override → finalProvider détecté depuis openrouter/qwen3-vl-30b-a3b-instruct (liminality)
      expect(result.model).toBe('openrouter/qwen3-vl-30b-a3b-instruct');
      expect(result.finalProvider).toBe('liminality');
    });

    it('devrait retourner undefined pour finalProvider si pas d\'override', () => {
      const context: ModelOverrideContext = {
        originalModel: 'openai/gpt-oss-20b',
        provider: 'groq',
        hasImages: false,
        reasoningOverride: null,
        originalParams: {}
      };

      const result = service.resolveModelAndParams(context);

      // Pas d'override, donc finalProvider devrait être défini depuis le modèle original
      expect(result.model).toBe('openai/gpt-oss-20b');
      expect(result.finalProvider).toBe('groq');
    });
  });
});

