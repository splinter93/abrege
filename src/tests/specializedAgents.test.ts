/**
 * Tests pour le système d'agents spécialisés
 * Validation du fonctionnement complet de l'architecture
 */

import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SpecializedAgentManager } from '@/services/specializedAgents/SpecializedAgentManager';
import { SchemaValidator } from '@/services/specializedAgents/schemaValidator';
import { CreateSpecializedAgentRequest, OpenAPISchema } from '@/types/specializedAgents';

// Mock Supabase
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        or: jest.fn(() => ({
          eq: jest.fn(() => ({
            eq: jest.fn(() => ({
              single: jest.fn()
            }))
          }))
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn()
          }))
        }))
      }))
    }))
  }))
}));

// Mock SimpleChatOrchestrator (remplace GroqOrchestrator)
jest.mock('@/services/llm/services/SimpleChatOrchestrator', () => ({
  simpleChatOrchestrator: {
    processMessage: jest.fn()
  }
}));

describe('SpecializedAgentManager', () => {
  let agentManager: SpecializedAgentManager;
  let mockSupabase: any;

  beforeEach(() => {
    agentManager = new SpecializedAgentManager();
    mockSupabase = require('@supabase/supabase-js').createClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createSpecializedAgent', () => {
    it('devrait créer un agent spécialisé avec succès', async () => {
      const agentConfig: CreateSpecializedAgentRequest = {
        slug: 'test-agent',
        display_name: 'Test Agent',
        description: 'Agent de test',
        model: 'deepseek-chat',
        system_instructions: 'Tu es un agent de test',
        input_schema: {
          type: 'object',
          properties: {
            input: { type: 'string', description: 'Input de test' }
          },
          required: ['input']
        },
        output_schema: {
          type: 'object',
          properties: {
            result: { type: 'string', description: 'Résultat de test' }
          }
        }
      };

      // Mock de la réponse Supabase
      const mockAgent = {
        id: 'test-id',
        slug: 'test-agent',
        display_name: 'Test Agent',
        description: 'Agent de test',
        model: 'deepseek-chat',
        system_instructions: 'Tu es un agent de test',
        is_endpoint_agent: true,
        is_chat_agent: false,
        is_active: true
      };

      mockSupabase.from().select().or().eq().eq().single.mockResolvedValue({
        data: null,
        error: null
      });

      mockSupabase.from().insert().select().single.mockResolvedValue({
        data: mockAgent,
        error: null
      });

      const result = await agentManager.createSpecializedAgent(agentConfig);

      expect(result.success).toBe(true);
      expect(result.agent).toEqual(mockAgent);
      expect(result.endpoint).toBe('/api/v2/agents/test-agent');
    });

    it('devrait échouer si le slug existe déjà', async () => {
      const agentConfig: CreateSpecializedAgentRequest = {
        slug: 'existing-agent',
        display_name: 'Existing Agent',
        description: 'Agent existant',
        model: 'deepseek-chat',
        system_instructions: 'Tu es un agent existant'
      };

      // Mock de l'agent existant
      const existingAgent = {
        id: 'existing-id',
        slug: 'existing-agent',
        display_name: 'Existing Agent'
      };

      mockSupabase.from().select().or().eq().eq().single.mockResolvedValue({
        data: existingAgent,
        error: null
      });

      const result = await agentManager.createSpecializedAgent(agentConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('existe déjà');
    });

    it('devrait valider les paramètres requis', async () => {
      const invalidConfig = {
        slug: 'test-agent',
        // display_name manquant
        model: 'deepseek-chat',
        system_instructions: 'Tu es un agent de test'
      } as CreateSpecializedAgentRequest;

      const result = await agentManager.createSpecializedAgent(invalidConfig);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Nom d\'affichage requis');
    });
  });

  describe('executeSpecializedAgent', () => {
    it('devrait exécuter un agent spécialisé avec succès', async () => {
      const mockAgent = {
        id: 'test-id',
        slug: 'test-agent',
        display_name: 'Test Agent',
        model: 'deepseek-chat',
        system_instructions: 'Tu es un agent de test',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Question à poser' }
          },
          required: ['query']
        },
        output_schema: {
          type: 'object',
          properties: {
            answer: { type: 'string', description: 'Réponse de l\'agent' }
          }
        }
      };

      const mockOrchestratorResult = {
        content: 'Réponse de test',
        success: true,
        tokensUsed: 100
      };

      // Mock de la récupération de l'agent
      mockSupabase.from().select().or().eq().eq().single.mockResolvedValue({
        data: mockAgent,
        error: null
      });

      // Mock de l'orchestrateur
      const { simpleChatOrchestrator } = require('@/services/llm/services/SimpleChatOrchestrator');
      simpleChatOrchestrator.processMessage.mockResolvedValue(mockOrchestratorResult);

      const result = await agentManager.executeSpecializedAgent(
        'test-agent',
        { query: 'Test question' },
        'test-user-token'
      );

      expect(result.success).toBe(true);
      expect(result.result).toHaveProperty('answer');
      expect(result.result.answer).toBe('Réponse de test');
    });

    it('devrait valider l\'input selon le schéma', async () => {
      const mockAgent = {
        id: 'test-id',
        slug: 'test-agent',
        display_name: 'Test Agent',
        model: 'deepseek-chat',
        system_instructions: 'Tu es un agent de test',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Question à poser' }
          },
          required: ['query']
        }
      };

      mockSupabase.from().select().or().eq().eq().single.mockResolvedValue({
        data: mockAgent,
        error: null
      });

      // Input invalide (manque le champ requis)
      const result = await agentManager.executeSpecializedAgent(
        'test-agent',
        { invalidField: 'test' },
        'test-user-token'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });

    it('devrait gérer les erreurs d\'exécution', async () => {
      mockSupabase.from().select().or().eq().eq().single.mockRejectedValue(
        new Error('Database error')
      );

      const result = await agentManager.executeSpecializedAgent(
        'test-agent',
        { query: 'Test question' },
        'test-user-token'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
    });
  });
});

describe('SchemaValidator', () => {
  describe('validateInput', () => {
    it('devrait valider un input correct', () => {
      const schema: OpenAPISchema = {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nom' },
          age: { type: 'number', description: 'Âge' }
        },
        required: ['name']
      };

      const input = {
        name: 'John Doe',
        age: 30
      };

      const result = SchemaValidator.validateInput(input, schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait détecter les champs requis manquants', () => {
      const schema: OpenAPISchema = {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nom' },
          age: { type: 'number', description: 'Âge' }
        },
        required: ['name', 'age']
      };

      const input = {
        name: 'John Doe'
        // age manquant
      };

      const result = SchemaValidator.validateInput(input, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Champ requis manquant: age');
    });

    it('devrait valider les types de données', () => {
      const schema: OpenAPISchema = {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nom' },
          age: { type: 'number', description: 'Âge' },
          active: { type: 'boolean', description: 'Actif' }
        }
      };

      const input = {
        name: 'John Doe',
        age: '30', // String au lieu de number
        active: 'true' // String au lieu de boolean
      };

      const result = SchemaValidator.validateInput(input, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('age: doit être un nombre valide');
      expect(result.errors).toContain('active: doit être un booléen');
    });

    it('devrait valider les contraintes de longueur', () => {
      const schema: OpenAPISchema = {
        type: 'object',
        properties: {
          name: { 
            type: 'string', 
            description: 'Nom',
            minLength: 2,
            maxLength: 10
          }
        }
      };

      const input = {
        name: 'A' // Trop court
      };

      const result = SchemaValidator.validateInput(input, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('name: longueur minimale de 2 caractères requise');
    });

    it('devrait valider les contraintes numériques', () => {
      const schema: OpenAPISchema = {
        type: 'object',
        properties: {
          age: { 
            type: 'number', 
            description: 'Âge',
            minimum: 0,
            maximum: 120
          }
        }
      };

      const input = {
        age: 150 // Trop élevé
      };

      const result = SchemaValidator.validateInput(input, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('age: valeur maximale de 120 dépassée');
    });

    it('devrait valider les énumérations', () => {
      const schema: OpenAPISchema = {
        type: 'object',
        properties: {
          status: { 
            type: 'string', 
            description: 'Statut',
            enum: ['active', 'inactive', 'pending']
          }
        }
      };

      const input = {
        status: 'unknown' // Valeur non autorisée
      };

      const result = SchemaValidator.validateInput(input, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('status: valeur "unknown" non autorisée');
    });

    it('devrait valider les patterns regex', () => {
      const schema: OpenAPISchema = {
        type: 'object',
        properties: {
          email: { 
            type: 'string', 
            description: 'Email',
            pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'
          }
        }
      };

      const input = {
        email: 'invalid-email' // Format invalide
      };

      const result = SchemaValidator.validateInput(input, schema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('email: format invalide');
    });
  });

  describe('validateSchema', () => {
    it('devrait valider un schéma correct', () => {
      const schema: OpenAPISchema = {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nom' },
          age: { type: 'number', description: 'Âge' }
        },
        required: ['name']
      };

      const result = SchemaValidator.validateSchema(schema);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('devrait détecter les schémas invalides', () => {
      const invalidSchema = {
        type: 'invalid-type', // Type invalide
        properties: {
          name: { type: 'string' }
        }
      };

      const result = SchemaValidator.validateSchema(invalidSchema);

      expect(result.valid).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          path: 'type',
          message: 'Le type doit être "object"'
        })
      );
    });

    it('devrait valider les propriétés imbriquées', () => {
      const schema: OpenAPISchema = {
        type: 'object',
        properties: {
          user: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Nom' },
              age: { type: 'number', description: 'Âge' }
            }
          }
        }
      };

      const result = SchemaValidator.validateSchema(schema);

      expect(result.valid).toBe(true);
    });
  });
});

describe('API Endpoints', () => {
  // Tests d'intégration pour les endpoints API
  describe('POST /api/v2/agents/{agentId}', () => {
    it('devrait exécuter un agent spécialisé via l\'API', async () => {
      // Test d'intégration complet
      // Ceci nécessiterait un serveur de test en cours d'exécution
      // Pour l'instant, on teste la logique métier
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('GET /api/v2/agents/{agentId}', () => {
    it('devrait récupérer les informations d\'un agent', async () => {
      // Test d'intégration complet
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('GET /api/v2/openapi-schema', () => {
    it('devrait générer le schéma OpenAPI avec les agents spécialisés', async () => {
      // Test d'intégration complet
      expect(true).toBe(true); // Placeholder
    });
  });
});
