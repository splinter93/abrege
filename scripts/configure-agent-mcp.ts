#!/usr/bin/env ts-node
/**
 * Script pour lier des serveurs MCP Factoria aux agents
 * Usage: ts-node scripts/configure-agent-mcp.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Liste les serveurs MCP disponibles dans Factoria
 */
async function listMcpServers() {
  console.log('\n📋 Serveurs MCP Factoria disponibles:\n');
  
  const { data: servers, error } = await supabase
    .from('mcp_servers')
    .select('id, name, description, deployment_url, status, tools_count')
    .eq('status', 'deployed')
    .order('name');

  if (error) {
    console.error('❌ Erreur lors de la récupération des serveurs MCP:', error);
    return;
  }

  if (!servers || servers.length === 0) {
    console.log('⚠️  Aucun serveur MCP disponible');
    return;
  }

  for (const server of servers) {
    console.log(`✅ ${server.name} (ID: ${server.id.substring(0, 8)}...)`);
    console.log(`   Description: ${server.description || 'N/A'}`);
    console.log(`   URL: ${server.deployment_url}`);
    console.log(`   Tools: ${server.tools_count || 0}\n`);
  }
}

/**
 * Lie des serveurs MCP Factoria à un agent
 */
async function linkMcpServers(
  agentSlug: string,
  mcpServerIds: string[] // ex: ['c8d47664-01bf-44a5-a189-05842dd641f5']
) {
  console.log(`\n🔧 Liaison des serveurs MCP à l'agent "${agentSlug}"`);
  console.log(`📦 Serveurs demandés: ${mcpServerIds.length}\n`);

  // 1. Récupérer l'agent
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, slug, display_name')
    .eq('slug', agentSlug)
    .single();

  if (agentError || !agent) {
    console.error(`❌ Agent "${agentSlug}" introuvable`);
    return;
  }

  // 2. Vérifier que tous les serveurs MCP existent
  const { data: servers, error: serversError } = await supabase
    .from('mcp_servers')
    .select('id, name, deployment_url, status')
    .in('id', mcpServerIds);

  if (serversError) {
    console.error('❌ Erreur lors de la vérification des serveurs MCP:', serversError);
    return;
  }

  if (!servers || servers.length === 0) {
    console.error('❌ Aucun serveur MCP trouvé avec ces IDs');
    return;
  }

  if (servers.length !== mcpServerIds.length) {
    console.warn(`⚠️  Seulement ${servers.length}/${mcpServerIds.length} serveurs trouvés`);
  }

  // 3. Créer les liaisons dans agent_mcp_servers
  const linksToInsert = servers.map((server, index) => ({
    agent_id: agent.id,
    mcp_server_id: server.id,
    is_active: true,
    priority: index
  }));

  const { data: links, error: linksError } = await supabase
    .from('agent_mcp_servers')
    .upsert(linksToInsert, { onConflict: 'agent_id,mcp_server_id' })
    .select();

  if (linksError) {
    console.error('❌ Erreur lors de la création des liaisons:', linksError);
    return;
  }

  console.log(`\n✅ Agent "${agent.display_name || agent.slug}" configuré!`);
  console.log(`📊 Résumé:`);
  console.log(`   - Serveurs MCP liés: ${links?.length || 0}`);
  for (const server of servers) {
    console.log(`     ✓ ${server.name} (${server.status})`);
  }
  console.log();
}

/**
 * Affiche les serveurs MCP liés à un agent
 */
async function showAgentMcp(agentSlug: string) {
  console.log(`\n📊 Serveurs MCP de l'agent "${agentSlug}":\n`);

  // 1. Récupérer l'agent
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id, slug, display_name')
    .eq('slug', agentSlug)
    .single();

  if (agentError || !agent) {
    console.error(`❌ Agent "${agentSlug}" introuvable`);
    return;
  }

  // 2. Récupérer les serveurs MCP liés
  const { data: links, error: linksError } = await supabase
    .from('agent_mcp_servers')
    .select(`
      id,
      is_active,
      priority,
      mcp_servers (
        id,
        name,
        description,
        deployment_url,
        status,
        tools_count
      )
    `)
    .eq('agent_id', agent.id)
    .order('priority');

  if (linksError) {
    console.error('❌ Erreur lors de la récupération des liaisons:', linksError);
    return;
  }

  if (!links || links.length === 0) {
    console.log('⚠️  Aucun serveur MCP lié à cet agent');
    return;
  }

  for (const link of links) {
    const server = (link as any).mcp_servers;
    const status = link.is_active ? '✅' : '❌';
    console.log(`${status} ${server.name} (Priority: ${link.priority})`);
    console.log(`   URL: ${server.deployment_url}`);
    console.log(`   Tools: ${server.tools_count || 0}\n`);
  }
}

/**
 * Supprime toutes les liaisons MCP d'un agent
 */
async function unlinkAllMcp(agentSlug: string) {
  console.log(`\n🗑️  Suppression de tous les serveurs MCP pour l'agent "${agentSlug}"`);

  // 1. Récupérer l'agent
  const { data: agent, error: agentError } = await supabase
    .from('agents')
    .select('id')
    .eq('slug', agentSlug)
    .single();

  if (agentError || !agent) {
    console.error(`❌ Agent "${agentSlug}" introuvable`);
    return;
  }

  // 2. Supprimer toutes les liaisons
  const { error: deleteError } = await supabase
    .from('agent_mcp_servers')
    .delete()
    .eq('agent_id', agent.id);

  if (deleteError) {
    console.error('❌ Erreur lors de la suppression:', deleteError);
    return;
  }

  console.log(`✅ Tous les serveurs MCP ont été supprimés de l'agent "${agentSlug}"\n`);
}

// ============================================================================
// CLI Interface
// ============================================================================

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'list':
    // Liste les serveurs MCP disponibles dans Factoria
    listMcpServers().then(() => process.exit(0));
    break;

  case 'link':
    // Lie des serveurs MCP à un agent
    const agentSlug = args[1];
    const serverIds = args.slice(2);
    
    if (!agentSlug || serverIds.length === 0) {
      console.log('\n❌ Usage: npm run mcp:add <agent-slug> <mcp-server-id-1> [mcp-server-id-2] ...\n');
      console.log('Exemple: npm run mcp:add donna c8d47664-01bf-44a5-a189-05842dd641f5\n');
      console.log('💡 Astuce: Utilise "npm run mcp:list" pour voir les serveurs disponibles\n');
      process.exit(1);
    }
    
    linkMcpServers(agentSlug, serverIds).then(() => process.exit(0));
    break;

  case 'show':
    // Affiche les serveurs MCP liés à un agent
    const agentSlugToShow = args[1];
    
    if (!agentSlugToShow) {
      console.log('\n❌ Usage: ts-node scripts/configure-agent-mcp.ts show <agent-slug>\n');
      process.exit(1);
    }
    
    showAgentMcp(agentSlugToShow).then(() => process.exit(0));
    break;

  case 'unlink':
    // Supprime toutes les liaisons MCP d'un agent
    const agentSlugToUnlink = args[1];
    
    if (!agentSlugToUnlink) {
      console.log('\n❌ Usage: npm run mcp:remove <agent-slug>\n');
      process.exit(1);
    }
    
    unlinkAllMcp(agentSlugToUnlink).then(() => process.exit(0));
    break;

  default:
    console.log(`
🏭 Script de Liaison Agents <-> Serveurs MCP Factoria

Usage:
  npm run mcp:list                         Liste les serveurs MCP Factoria
  npm run mcp:add <agent> <id1> [id2...]  Lie des serveurs MCP à un agent
  npm run mcp:remove <agent>               Supprime tous les MCP d'un agent
  ts-node scripts/configure-agent-mcp.ts show <agent>  Affiche les MCP d'un agent

Workflow:
  1. Liste les serveurs MCP Factoria disponibles
     npm run mcp:list

  2. Copie l'ID du serveur MCP que tu veux utiliser
  
  3. Lie-le à un agent
     npm run mcp:add donna c8d47664-01bf-44a5-a189-05842dd641f5

  4. Vérifie la config
     ts-node scripts/configure-agent-mcp.ts show donna

Exemples:
  # Lister les serveurs MCP Factoria
  npm run mcp:list
  
  # Lier le serveur Scrivia à Donna
  npm run mcp:add donna c8d47664-01bf-44a5-a189-05842dd641f5
  
  # Lier plusieurs serveurs à Harvey
  npm run mcp:add harvey <id-exa> <id-clickup>
  
  # Afficher les MCP de Donna
  ts-node scripts/configure-agent-mcp.ts show donna
  
  # Supprimer tous les MCP de Johnny
  npm run mcp:remove johnny

Variables d'environnement requises:
  - NEXT_PUBLIC_SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
    `);
}

