/**
 * Script pour ajouter le serveur MCP Origins (test) à la base de données
 * Usage: npx tsx scripts/add-mcp-origins-test.ts [USER_ID]
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// ✅ Charger les variables d'environnement depuis .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', !!supabaseServiceRoleKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function addOriginsServer(userId: string) {
  console.log('🚀 Ajout du serveur MCP Origins...\n');

  const mcpServer = {
    user_id: userId,
    name: 'Origins Test',
    description: 'Serveur Origins pour tests MCP hybrides (OpenAPI + MCP)',
    url: 'https://origins-server.up.railway.app/mcp/5a2133e4-926a-4cf5-9e02-f6080fe12771',
    header: 'x-api-key',
    api_key: 'apiKey.12.YmI0NmM0OGUtYTgyYy00NjgyLWIyZGEtYjhhYTFjNmRlNDJh',
    is_active: true,
  };

  // Vérifier si le serveur existe déjà
  const { data: existingServers, error: searchError } = await supabase
    .from('mcp_servers')
    .select('*')
    .eq('user_id', userId)
    .eq('url', mcpServer.url);

  if (searchError) {
    console.error('❌ Erreur lors de la recherche:', searchError);
    process.exit(1);
  }

  if (existingServers && existingServers.length > 0) {
    console.log('⚠️  Serveur Origins déjà existant:');
    console.log('   ID:', existingServers[0].id);
    console.log('   Name:', existingServers[0].name);
    console.log('   URL:', existingServers[0].url);
    console.log('\n✅ Rien à faire.\n');
    return existingServers[0].id;
  }

  // Insérer le nouveau serveur
  const { data, error } = await supabase
    .from('mcp_servers')
    .insert(mcpServer)
    .select()
    .single();

  if (error) {
    console.error('❌ Erreur lors de l\'insertion:', error);
    process.exit(1);
  }

  console.log('✅ Serveur Origins ajouté avec succès!\n');
  console.log('📋 Détails:');
  console.log('   ID:', data.id);
  console.log('   Name:', data.name);
  console.log('   URL:', data.url);
  console.log('   Header:', data.header);
  console.log('   Active:', data.is_active);
  console.log('\n');

  return data.id;
}

async function main() {
  // Récupérer l'ID du premier utilisateur (ou spécifier manuellement)
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id')
    .limit(1)
    .single();

  if (userError || !users) {
    console.error('❌ Erreur lors de la récupération de l\'utilisateur:', userError);
    console.log('\n💡 Spécifiez manuellement l\'user_id en argument:');
    console.log('   npx tsx scripts/add-mcp-origins-test.ts <USER_ID>');
    process.exit(1);
  }

  const userId = process.argv[2] || users.id;
  console.log('👤 User ID:', userId, '\n');

  await addOriginsServer(userId);

  console.log('🎯 Pour lier ce serveur à un agent, utilisez:');
  console.log('   npx tsx scripts/link-mcp-to-agent.ts <AGENT_ID> <MCP_SERVER_ID>\n');
}

main().catch(console.error);

