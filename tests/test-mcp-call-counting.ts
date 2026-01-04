/**
 * Test manuel pour vérifier le fix du bug "Double MCP Calls"
 * 
 * Ce script permet de tester que :
 * 1. Un MCP call est compté une seule fois (pas 2)
 * 2. Le reasoning est bien disponible mais ne pollue pas le comptage
 * 3. Les logs sont cohérents
 * 
 * Usage :
 * 1. Démarrer le serveur : npm run dev
 * 2. Aller dans l'UI chat
 * 3. Sélectionner un agent avec MCP tools (ex: Josselin avec Kazumi)
 * 4. Envoyer une demande de tool call : "Ask Kazumi about Spinoza"
 * 5. Vérifier les logs dans le terminal
 * 
 * Logs attendus AVANT le fix :
 * [GroqProvider] 🔧 MCP call: Kazumi sur synesia_agentz
 * [Stream Route] 🔧 MCP calls détectés dans chunk: 2  ❌ ERREUR
 * 
 * Logs attendus APRÈS le fix :
 * [GroqProvider] 🔧 MCP call: Kazumi sur synesia_agentz
 * [Stream Route] 🔧 MCP calls détectés dans chunk: 1  ✅ CORRECT
 */

import { GroqProvider } from '@/services/llm/providers/implementations/groq';
import type { McpTool } from '@/services/llm/types/strictTypes';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MCP_SERVER_URL = 'https://origins-server.up.railway.app/mcp/5a2133e4-926a-4cf5-9e02-f6080fe12771';
const MCP_API_KEY = 'apiKey.11.YzQ4N2QxZDQtMTFhOC00ZTI0LWJhYzYtZTljYTAyYjVkMTNi';

async function testMcpCallCounting() {
  console.log('🧪 Test : Comptage des MCP calls');
  console.log('═'.repeat(60));
  
  if (!GROQ_API_KEY) {
    console.error('❌ GROQ_API_KEY non défini');
    process.exit(1);
  }
  
  // ✅ Configuration du provider
  const provider = new GroqProvider({
    apiKey: GROQ_API_KEY,
    model: 'openai/gpt-oss-120b',
    temperature: 1,
    maxTokens: 8000
  });
  
  // ✅ Configuration du MCP tool
  const mcpTools: McpTool[] = [
    {
      type: 'mcp',
      server_label: 'synesia-agentz',
      server_url: MCP_SERVER_URL,
      headers: {
        'x-api-key': MCP_API_KEY
      },
      require_approval: 'never',
      allowed_tools: null,
      name: 'synesia-agentz'
    }
  ];
  
  // ✅ Messages de test
  const messages = [
    {
      role: 'system' as const,
      content: 'You are a helpful assistant with access to MCP tools.'
    },
    {
      role: 'user' as const,
      content: 'Call Kazumi to find images about Spinoza philosophy. Do it once.'
    }
  ];
  
  console.log('\n📤 Envoi de la requête avec MCP tools...');
  
  try {
    const response = await provider.callWithMessages(messages, mcpTools);
    
    console.log('\n📥 Réponse reçue:');
    console.log(`   Content: ${response.content.substring(0, 100)}...`);
    console.log(`   Tool calls: ${response.tool_calls?.length || 0}`);
    console.log(`   Reasoning: ${response.reasoning ? 'Oui' : 'Non'}`);
    
    if (response.x_groq?.mcp_calls) {
      const mcpCalls = response.x_groq.mcp_calls;
      console.log(`   MCP calls: ${mcpCalls.length}`);
      
      console.log('\n🔍 Détail des MCP calls:');
      mcpCalls.forEach((call, index) => {
        console.log(`   ${index + 1}. ${call.name} sur ${call.server_label}`);
      });
      
      // ✅ Vérification
      console.log('\n✅ Vérification:');
      if (mcpCalls.length === response.tool_calls?.length) {
        console.log(`   ✅ Comptage cohérent: ${mcpCalls.length} MCP calls = ${response.tool_calls?.length} tool calls`);
      } else {
        console.log(`   ❌ Comptage INCOHÉRENT: ${mcpCalls.length} MCP calls ≠ ${response.tool_calls?.length} tool calls`);
      }
      
      // ✅ Vérifier qu'il n'y a pas de commentary
      const hasCommentary = mcpCalls.some((call: { name: string; server_label: string }) => 
        call.name === '' && call.server_label === ''
      );
      if (hasCommentary) {
        console.log('   ❌ Des commentary sont présents dans mcpCalls (BUG)');
      } else {
        console.log('   ✅ Aucun commentary dans mcpCalls');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Erreur:', error);
    process.exit(1);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('🎯 Test terminé\n');
}

// Exécuter le test
if (require.main === module) {
  testMcpCallCounting().catch(console.error);
}

export { testMcpCallCounting };












