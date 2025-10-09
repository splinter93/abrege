#!/usr/bin/env ts-node
/**
 * Script pour configurer les serveurs MCP sur un agent
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
 * Serveurs MCP disponibles
 * ⚠️ Note : Les URLs sont des exemples, à adapter selon les services réels
 */
const AVAILABLE_MCP_SERVERS = {
  // 🔍 Websearch
  exa: {
    server_label: 'exa',
    server_url: 'https://api.exa.ai/mcp', // À vérifier
    description: 'Recherche web sémantique avancée',
    requires_api_key: true,
    env_var: 'EXA_API_KEY'
  },
  
  // ✅ Task Management
  clickup: {
    server_label: 'clickup',
    server_url: 'https://api.clickup.com/api/v2/mcp', // À vérifier
    description: 'Gestion de tâches et projets',
    requires_api_key: true,
    env_var: 'CLICKUP_API_KEY'
  },
  
  linear: {
    server_label: 'linear',
    server_url: 'https://api.linear.app/mcp', // À vérifier
    description: 'Issue tracking',
    requires_api_key: true,
    env_var: 'LINEAR_API_KEY'
  },
  
  // 📝 Notes & Docs
  notion: {
    server_label: 'notion',
    server_url: 'https://api.notion.com/v1/mcp', // À vérifier
    description: 'Notes et bases de données Notion',
    requires_api_key: true,
    env_var: 'NOTION_API_KEY'
  },
  
  // 📧 Communication
  gmail: {
    server_label: 'gmail',
    server_url: 'https://gmail.googleapis.com/mcp', // À vérifier
    description: 'Envoi et lecture d\'emails',
    requires_api_key: true,
    env_var: 'GMAIL_API_KEY'
  },
  
  slack: {
    server_label: 'slack',
    server_url: 'https://slack.com/api/mcp', // À vérifier
    description: 'Messagerie Slack',
    requires_api_key: true,
    env_var: 'SLACK_BOT_TOKEN'
  }
};

/**
 * Configure les serveurs MCP sur un agent
 */
async function configureMcp(
  agentSlug: string,
  mcpServers: string[], // ex: ['exa', 'clickup']
  hybridMode: boolean = true
) {
  console.log(`\n🔧 Configuration MCP pour l'agent "${agentSlug}"`);
  console.log(`📦 Serveurs demandés: ${mcpServers.join(', ')}\n`);

  // 1. Valider les serveurs demandés
  const servers = [];
  for (const serverKey of mcpServers) {
    const serverConfig = AVAILABLE_MCP_SERVERS[serverKey as keyof typeof AVAILABLE_MCP_SERVERS];
    
    if (!serverConfig) {
      console.error(`❌ Serveur MCP inconnu: ${serverKey}`);
      console.log(`   Serveurs disponibles: ${Object.keys(AVAILABLE_MCP_SERVERS).join(', ')}`);
      continue;
    }

    // 2. Vérifier si l'API key est disponible
    let apiKey: string | undefined;
    if (serverConfig.requires_api_key) {
      apiKey = process.env[serverConfig.env_var];
      if (!apiKey) {
        console.warn(`⚠️  ${serverConfig.server_label}: API key manquante (${serverConfig.env_var})`);
        console.log(`   → Le serveur sera ajouté mais ne fonctionnera pas sans l'API key\n`);
      } else {
        console.log(`✅ ${serverConfig.server_label}: API key trouvée`);
      }
    }

    // 3. Construire la config du serveur
    servers.push({
      server_label: serverConfig.server_label,
      server_url: serverConfig.server_url,
      headers: apiKey ? { 'x-api-key': apiKey } : undefined
    });
  }

  if (servers.length === 0) {
    console.error('\n❌ Aucun serveur MCP valide à configurer');
    return;
  }

  // 4. Construire l'objet mcp_config
  const mcpConfig = {
    enabled: true,
    servers,
    hybrid_mode: hybridMode
  };

  console.log('\n📋 Configuration MCP finale:');
  console.log(JSON.stringify(mcpConfig, null, 2));

  // 5. Mettre à jour l'agent dans la DB
  const { data, error } = await supabase
    .from('agents')
    .update({ mcp_config: mcpConfig })
    .eq('slug', agentSlug)
    .select()
    .single();

  if (error) {
    console.error(`\n❌ Erreur lors de la mise à jour de l'agent:`, error);
    return;
  }

  if (!data) {
    console.error(`\n❌ Agent "${agentSlug}" introuvable`);
    return;
  }

  console.log(`\n✅ Agent "${agentSlug}" configuré avec succès!`);
  console.log(`📊 Résumé:`);
  console.log(`   - Serveurs MCP: ${servers.length}`);
  console.log(`   - Mode: ${hybridMode ? 'Hybride (OpenAPI + MCP)' : 'MCP pur'}`);
  console.log(`   - Tools disponibles: ~${hybridMode ? 42 : 0} OpenAPI + ${servers.length} MCP\n`);
}

/**
 * Affiche la liste des serveurs MCP disponibles
 */
function listAvailableServers() {
  console.log('\n📋 Serveurs MCP disponibles:\n');
  
  for (const [key, config] of Object.entries(AVAILABLE_MCP_SERVERS)) {
    const hasApiKey = process.env[config.env_var] ? '✅' : '❌';
    console.log(`${hasApiKey} ${key.padEnd(10)} - ${config.description}`);
    console.log(`   URL: ${config.server_url}`);
    console.log(`   Env: ${config.env_var}\n`);
  }
}

/**
 * Supprime la config MCP d'un agent
 */
async function removeMcp(agentSlug: string) {
  console.log(`\n🗑️  Suppression de la config MCP pour l'agent "${agentSlug}"`);

  const { data, error } = await supabase
    .from('agents')
    .update({ mcp_config: null })
    .eq('slug', agentSlug)
    .select()
    .single();

  if (error) {
    console.error(`\n❌ Erreur:`, error);
    return;
  }

  if (!data) {
    console.error(`\n❌ Agent "${agentSlug}" introuvable`);
    return;
  }

  console.log(`✅ Config MCP supprimée de l'agent "${agentSlug}"\n`);
}

// ============================================================================
// CLI Interface
// ============================================================================

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case 'list':
    listAvailableServers();
    break;

  case 'add':
    const agentSlug = args[1];
    const servers = args.slice(2);
    
    if (!agentSlug || servers.length === 0) {
      console.log('\n❌ Usage: ts-node scripts/configure-agent-mcp.ts add <agent-slug> <server1> [server2] ...\n');
      console.log('Exemple: ts-node scripts/configure-agent-mcp.ts add donna exa clickup\n');
      process.exit(1);
    }
    
    configureMcp(agentSlug, servers, true).then(() => process.exit(0));
    break;

  case 'remove':
    const agentSlugToRemove = args[1];
    
    if (!agentSlugToRemove) {
      console.log('\n❌ Usage: ts-node scripts/configure-agent-mcp.ts remove <agent-slug>\n');
      process.exit(1);
    }
    
    removeMcp(agentSlugToRemove).then(() => process.exit(0));
    break;

  default:
    console.log(`
🔧 Script de Configuration MCP pour Agents

Usage:
  ts-node scripts/configure-agent-mcp.ts <command> [options]

Commands:
  list                              Liste les serveurs MCP disponibles
  add <agent> <server1> [server2]  Ajoute des serveurs MCP à un agent
  remove <agent>                    Supprime la config MCP d'un agent

Exemples:
  # Lister les serveurs disponibles
  ts-node scripts/configure-agent-mcp.ts list

  # Ajouter Exa (websearch) à Donna
  ts-node scripts/configure-agent-mcp.ts add donna exa

  # Ajouter Exa + ClickUp à Harvey
  ts-node scripts/configure-agent-mcp.ts add harvey exa clickup

  # Supprimer la config MCP de Donna
  ts-node scripts/configure-agent-mcp.ts remove donna

Variables d'environnement requises:
  - NEXT_PUBLIC_SUPABASE_URL
  - SUPABASE_SERVICE_ROLE_KEY
  - [API_KEY du service MCP] (ex: EXA_API_KEY, CLICKUP_API_KEY)
    `);
}

