/**
 * Script pour lier le serveur MCP Scrivia à un agent
 * Permet aux agents d'accéder aux données Scrivia via MCP avec JWT dynamique
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Lier le serveur MCP Scrivia à un agent
 */
async function linkScriviaMcpToAgent(agentSlugOrId: string, priority: number = 0) {
  console.log('🔗 Liaison du serveur MCP Scrivia à un agent\n');

  try {
    // 1. Récupérer le serveur MCP Scrivia
    console.log('📡 Recherche du serveur MCP Scrivia...');
    const { data: mcpServer, error: mcpError } = await supabase
      .from('mcp_servers')
      .select('*')
      .eq('name', 'Scrivia API')
      .single();

    if (mcpError || !mcpServer) {
      console.error('❌ Serveur MCP Scrivia non trouvé');
      console.log('');
      console.log('💡 Pour créer le serveur MCP Scrivia, exécutez :');
      console.log('   npx tsx scripts/create-scrivia-mcp.ts');
      return;
    }

    console.log(`✅ Serveur MCP Scrivia trouvé: ${mcpServer.id}`);
    console.log(`   URL: ${mcpServer.url}`);
    console.log(`   Header: ${mcpServer.header}`);
    console.log('');

    // 2. Récupérer l'agent
    console.log(`🤖 Recherche de l'agent: ${agentSlugOrId}...`);
    
    // Essayer d'abord par slug, puis par ID
    let agent;
    const { data: agentBySlug } = await supabase
      .from('agents')
      .select('*')
      .eq('slug', agentSlugOrId)
      .single();

    if (agentBySlug) {
      agent = agentBySlug;
    } else {
      const { data: agentById } = await supabase
        .from('agents')
        .select('*')
        .eq('id', agentSlugOrId)
        .single();
      
      if (agentById) {
        agent = agentById;
      }
    }

    if (!agent) {
      console.error(`❌ Agent non trouvé: ${agentSlugOrId}`);
      console.log('');
      console.log('💡 Agents disponibles :');
      
      const { data: agents } = await supabase
        .from('agents')
        .select('id, name, slug, display_name')
        .limit(10);

      if (agents && agents.length > 0) {
        agents.forEach(a => {
          console.log(`   - ${a.display_name || a.name} (slug: ${a.slug || 'N/A'}, id: ${a.id})`);
        });
      }
      return;
    }

    console.log(`✅ Agent trouvé: ${agent.display_name || agent.name}`);
    console.log(`   ID: ${agent.id}`);
    console.log('');

    // 3. Vérifier si la liaison existe déjà
    console.log('🔍 Vérification de la liaison existante...');
    const { data: existingLink } = await supabase
      .from('agent_mcp_servers')
      .select('*')
      .eq('agent_id', agent.id)
      .eq('mcp_server_id', mcpServer.id)
      .single();

    if (existingLink) {
      console.log('⚠️  La liaison existe déjà !');
      console.log(`   Priorité: ${existingLink.priority}`);
      console.log(`   Active: ${existingLink.is_active}`);
      console.log('');
      console.log('💡 Pour supprimer la liaison :');
      console.log(`   DELETE FROM agent_mcp_servers WHERE id = '${existingLink.id}';`);
      return;
    }

    // 4. Créer la liaison
    console.log('✨ Création de la liaison...');
    const { data: link, error: linkError } = await supabase
      .from('agent_mcp_servers')
      .insert({
        agent_id: agent.id,
        mcp_server_id: mcpServer.id,
        priority: priority,
        is_active: true
      })
      .select()
      .single();

    if (linkError) {
      console.error('❌ Erreur lors de la création de la liaison:', linkError);
      return;
    }

    console.log('✅ Liaison créée avec succès !');
    console.log('');
    console.log('📊 Détails de la liaison :');
    console.log(`   ID: ${link.id}`);
    console.log(`   Agent: ${agent.display_name || agent.name}`);
    console.log(`   Serveur MCP: ${mcpServer.name}`);
    console.log(`   Priorité: ${link.priority}`);
    console.log(`   Active: ${link.is_active}`);
    console.log('');
    console.log('🎉 L\'agent peut maintenant utiliser le serveur MCP Scrivia !');
    console.log('   Le JWT de l\'utilisateur sera automatiquement injecté lors des appels.');
    console.log('');
    console.log('💡 Capacités disponibles via MCP Scrivia :');
    console.log('   - Créer, lire, mettre à jour, supprimer des notes');
    console.log('   - Gérer les classeurs et dossiers');
    console.log('   - Rechercher dans le contenu');
    console.log('   - Exécuter d\'autres agents spécialisés');
    console.log('   - Accéder au profil utilisateur');

  } catch (error) {
    console.error('❌ Erreur:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
    }
  }
}

/**
 * Lister tous les agents et leurs serveurs MCP
 */
async function listAgentsWithMcp() {
  console.log('📋 Liste des agents avec leurs serveurs MCP\n');

  try {
    const { data: agents, error } = await supabase
      .from('agents')
      .select(`
        id,
        name,
        slug,
        display_name,
        is_active,
        agent_mcp_servers (
          priority,
          is_active,
          mcp_servers (
            name,
            url
          )
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('❌ Erreur:', error);
      return;
    }

    if (!agents || agents.length === 0) {
      console.log('ℹ️  Aucun agent trouvé');
      return;
    }

    for (const agent of agents) {
      const mcpCount = agent.agent_mcp_servers?.length || 0;
      console.log(`🤖 ${agent.display_name || agent.name}`);
      console.log(`   Slug: ${agent.slug || 'N/A'}`);
      console.log(`   ID: ${agent.id}`);
      console.log(`   Serveurs MCP: ${mcpCount}`);
      
      if (mcpCount > 0) {
        agent.agent_mcp_servers.forEach((link: any) => {
          if (link.mcp_servers) {
            console.log(`      - ${link.mcp_servers.name} (priorité: ${link.priority})`);
          }
        });
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

// Exécuter selon les arguments
const command = process.argv[2];
const agentSlugOrId = process.argv[3];
const priority = parseInt(process.argv[4] || '0', 10);

if (command === 'link' && agentSlugOrId) {
  linkScriviaMcpToAgent(agentSlugOrId, priority);
} else if (command === 'list') {
  listAgentsWithMcp();
} else {
  console.log('📖 Usage:');
  console.log('');
  console.log('  Lier le serveur MCP Scrivia à un agent :');
  console.log('    npx tsx scripts/link-scrivia-mcp-to-agent.ts link <agent-slug-or-id> [priority]');
  console.log('');
  console.log('  Lister tous les agents et leurs serveurs MCP :');
  console.log('    npx tsx scripts/link-scrivia-mcp-to-agent.ts list');
  console.log('');
  console.log('  Exemples :');
  console.log('    npx tsx scripts/link-scrivia-mcp-to-agent.ts link research-agent');
  console.log('    npx tsx scripts/link-scrivia-mcp-to-agent.ts link abc123-def456-ghi789 5');
  console.log('    npx tsx scripts/link-scrivia-mcp-to-agent.ts list');
}

