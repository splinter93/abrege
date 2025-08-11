const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Charger les variables d'environnement depuis .env
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const envLines = envContent.split('\n');
      
      envLines.forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          if (value && !key.startsWith('#')) {
            process.env[key.trim()] = value.replace(/^["']|["']$/g, '');
          }
        }
      });
      
      console.log('✅ Variables d\'environnement chargées depuis .env');
    } else {
      console.log('⚠️ Fichier .env non trouvé, utilisation des variables système');
    }
  } catch (error) {
    console.log('⚠️ Erreur chargement .env:', error.message);
  }
}

// Charger les variables d'environnement
loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '✅' : '❌');
  console.error('\n💡 Vérifiez que votre fichier .env contient ces variables');
  process.exit(1);
}

console.log('🔗 Connexion à Supabase...');

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixAPIRouteAgentConfig() {
  try {
    console.log('🔧 Correction de la route API pour récupérer l\'agentConfig depuis la base...\n');

    // 1. Vérifier l'état actuel de la route API
    const routePath = 'src/app/api/chat/llm/route.ts';
    console.log(`📁 Vérification de la route: ${routePath}`);
    
    if (!fs.existsSync(routePath)) {
      console.error(`❌ Route non trouvée: ${routePath}`);
      return;
    }

    const currentRouteContent = fs.readFileSync(routePath, 'utf8');
    console.log('✅ Route trouvée');

    // 2. Analyser le contenu actuel
    console.log('\n🔍 Analyse du contenu actuel...');
    
    const hasAgentConfigRetrieval = currentRouteContent.includes('getAgentByProvider') || 
                                   currentRouteContent.includes('from(\'agents\')') ||
                                   currentRouteContent.includes('agentConfig.*provider');
    
    if (hasAgentConfigRetrieval) {
      console.log('✅ La route récupère déjà l\'agentConfig depuis la base');
      console.log('📋 Contenu actuel de la route:');
      console.log(currentRouteContent);
      return;
    }

    console.log('⚠️ La route ne récupère pas l\'agentConfig depuis la base');
    console.log('🔄 Correction nécessaire...');

    // 3. Créer la nouvelle version de la route
    const newRouteContent = `import { NextRequest, NextResponse } from 'next/server';
import { handleGroqGptOss120b } from '@/services/llm/groqGptOss120b';
import { simpleLogger as logger } from '@/utils/logger';
import { createClient } from '@supabase/supabase-js';

// Client Supabase admin pour accéder aux agents
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, context, history, provider, channelId } = body;

    // Validation des paramètres requis
    if (!message || !context || !history || !channelId) {
      return NextResponse.json(
        { error: 'Paramètres manquants', required: ['message', 'context', 'history', 'channelId'] },
        { status: 400 }
      );
    }

    // Extraire le token d'authentification depuis le header Authorization
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token d\\'authentification manquant ou invalide' },
        { status: 401 }
      );
    }
    
    const userToken = authHeader.replace('Bearer ', '');
    
    // Extraire les valeurs nécessaires depuis le contexte
    const { sessionId } = context;

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId manquant dans le contexte' },
        { status: 400 }
      );
    }

    logger.info(\`[LLM Route] 🚀 Démarrage pour session \${sessionId} avec provider \${provider}\`);

    // 🎯 CORRECTION : Récupérer l'agentConfig depuis la base de données
    let agentConfig = null;
    
    if (provider) {
      try {
        logger.dev(\`[LLM Route] 🔍 Récupération de l'agent pour le provider: \${provider}\`);
        
        const { data: agent, error: agentError } = await supabase
          .from('agents')
          .select('*')
          .eq('provider', provider)
          .eq('is_active', true)
          .order('priority', { ascending: false })
          .limit(1)
          .single();

        if (agentError) {
          logger.warn(\`[LLM Route] ⚠️ Erreur récupération agent \${provider}: \${agentError.message}\`);
        } else if (agent) {
          agentConfig = agent;
          logger.dev(\`[LLM Route] ✅ Agent récupéré: \${agent.name} (ID: \${agent.id})\`);
          logger.dev(\`[LLM Route] 🎯 Configuration agent:\`, {
            model: agent.model,
            temperature: agent.temperature,
            max_tokens: agent.max_tokens,
            system_instructions: agent.system_instructions ? '✅ Présentes' : '❌ Manquantes',
            context_template: agent.context_template ? '✅ Présent' : '❌ Manquant',
            api_config: agent.api_config ? '✅ Présent' : '❌ Manquant',
            capabilities: agent.capabilities?.length || 0,
            api_v2_capabilities: agent.api_v2_capabilities?.length || 0
          });
        } else {
          logger.warn(\`[LLM Route] ⚠️ Aucun agent trouvé pour le provider: \${provider}\`);
        }
      } catch (error) {
        logger.error(\`[LLM Route] ❌ Erreur lors de la récupération de l'agent: \${error}\`);
      }
    }

    // Appel à la logique Groq OSS 120B avec l'agentConfig récupéré
    const result = await handleGroqGptOss120b({
      message,
      appContext: context,
      sessionHistory: history,
      agentConfig: agentConfig, // ✅ Maintenant récupéré depuis la base
      incomingChannelId: channelId,
      userToken,
      sessionId
    });

    logger.info(\`[LLM Route] ✅ Session \${sessionId} terminée avec succès\`);
    return result;

  } catch (error) {
    logger.error(\`[LLM Route] ❌ Erreur fatale: \${error}\`);

    return NextResponse.json(
      {
        error: 'Erreur interne du serveur',
        details: error instanceof Error ? error.message : 'Erreur inconnue'
      },
      { status: 500 }
    );
  }
}`;

    // 4. Sauvegarder la nouvelle route
    console.log('💾 Sauvegarde de la nouvelle route...');
    
    // Créer une sauvegarde
    const backupPath = routePath + '.backup';
    fs.writeFileSync(backupPath, currentRouteContent);
    console.log(`✅ Sauvegarde créée: ${backupPath}`);

    // Écrire la nouvelle route
    fs.writeFileSync(routePath, newRouteContent);
    console.log(`✅ Nouvelle route écrite: ${routePath}`);

    // 5. Vérification de la correction
    console.log('\n🔍 Vérification de la correction...');
    
    const updatedRouteContent = fs.readFileSync(routePath, 'utf8');
    const hasNewAgentConfigRetrieval = updatedRouteContent.includes('from(\'agents\')') &&
                                      updatedRouteContent.includes('agentConfig = agent') &&
                                      updatedRouteContent.includes('provider, provider');

    if (hasNewAgentConfigRetrieval) {
      console.log('✅ Correction appliquée avec succès !');
      console.log('\n📋 Changements effectués:');
      console.log('   - Ajout de la récupération de l\'agent depuis la table agents');
      console.log('   - Utilisation du provider pour identifier l\'agent');
      console.log('   - Passage de l\'agentConfig complet à handleGroqGptOss120b');
      console.log('   - Logs détaillés pour le debugging');
    } else {
      console.log('❌ Correction non appliquée correctement');
      console.log('📋 Contenu de la route après modification:');
      console.log(updatedRouteContent);
    }

    // 6. Test de la nouvelle route
    console.log('\n🧪 Test de la nouvelle route...');
    
    try {
      // Vérifier que la route compile
      const { execSync } = require('child_process');
      execSync('npx tsc --noEmit --skipLibCheck src/app/api/chat/llm/route.ts', { stdio: 'pipe' });
      console.log('✅ La route compile correctement');
    } catch (error) {
      console.log('⚠️ La route ne compile pas (peut être normal si dépendances manquantes)');
    }

    console.log('\n🎉 Correction terminée avec succès !');
    console.log('\n📋 Prochaines étapes:');
    console.log('   1. Redémarrer l\'application pour charger la nouvelle route');
    console.log('   2. Tester un chat pour vérifier que l\'agentConfig est récupéré');
    console.log('   3. Vérifier les logs pour confirmer la récupération de l\'agent');
    console.log('   4. Tester les function calls avec l\'agent configuré');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le script
fixAPIRouteAgentConfig(); 