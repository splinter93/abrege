/**
 * Test minimal xAI avec 3 tools simples
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { XAIProvider } from '../src/services/llm/providers/implementations/xai';
import type { Tool } from '../src/services/llm/types/strictTypes';

async function test() {
  console.log('🧪 Test xAI avec 3 tools simples\n');

  const xai = new XAIProvider({
    model: 'grok-4-1-fast-reasoning',
    temperature: 0.7
  });

  // 3 tools ultra-simples
  const tools: Tool[] = [
    {
      type: 'function',
      function: {
        name: 'createNote',
        description: 'Créer une nouvelle note',
        parameters: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Titre de la note'
            },
            content: {
              type: 'string',
              description: 'Contenu de la note'
            }
          },
          required: ['title', 'content']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'searchNotes',
        description: 'Rechercher des notes',
        parameters: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Requête de recherche'
            }
          },
          required: ['query']
        }
      }
    },
    {
      type: 'function',
      function: {
        name: 'listNotes',
        description: 'Lister les notes récentes',
        parameters: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Nombre maximum de notes'
            }
          }
        }
      }
    }
  ];

  console.log('📋 Tools à envoyer:');
  tools.forEach((t, i) => {
    console.log(`  ${i + 1}. ${t.function.name}`);
  });

  try {
    const messages = [
      {
        role: 'system' as const,
        content: 'Tu es un assistant.'
      },
      {
        role: 'user' as const,
        content: 'Crée une note "Test xAI"'
      }
    ];

    console.log('\n🚀 Appel xAI...');
    const response = await xai.callWithMessages(messages, tools);

    console.log('✅ SUCCÈS !');
    console.log('Réponse:', response.content);
    console.log('Tool calls:', response.tool_calls?.length || 0);

  } catch (error) {
    console.error('❌ ERREUR:', error instanceof Error ? error.message : error);
  }
}

test();

