const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDonnaAgent() {
  console.log('🔍 TEST DE L\'AGENT DONNA');
  console.log('=' .repeat(40));

  try {
    // 1. Récupérer tous les agents
    console.log('\n📊 1. Récupération de tous les agents...');
    
    const { data: agents, error: error1 } = await supabase
      .from('agents')
      .select('*')
      .eq('is_active', true);

    if (error1) {
      console.error('❌ Erreur récupération agents:', error1);
      return;
    }

    console.log(`✅ ${agents.length} agents actifs trouvés`);
    
    // 2. Chercher Donna spécifiquement
    console.log('\n🎯 2. Recherche de l\'agent Donna...');
    
    const donna = agents.find(a => a.name.toLowerCase().includes('donna'));
    
    if (donna) {
      console.log('✅ Donna trouvée !');
      console.log(`   - ID: ${donna.id}`);
      console.log(`   - Nom: ${donna.name}`);
      console.log(`   - Modèle: ${donna.model}`);
      console.log(`   - Température: ${donna.temperature}`);
      console.log(`   - Instructions: ${donna.system_instructions?.substring(0, 100)}...`);
      console.log(`   - Capacités: ${donna.capabilities?.join(', ')}`);
      console.log(`   - Par défaut: ${donna.is_default ? 'Oui' : 'Non'}`);
    } else {
      console.log('❌ Donna non trouvée');
      console.log('Agents disponibles:');
      agents.forEach(agent => {
        console.log(`   - ${agent.name} (${agent.model})`);
      });
    }

    // 3. Tester la récupération par ID
    if (donna) {
      console.log('\n🔍 3. Test de récupération par ID...');
      
      const { data: donnaById, error: error2 } = await supabase
        .from('agents')
        .select('*')
        .eq('id', donna.id)
        .single();

      if (error2) {
        console.error('❌ Erreur récupération par ID:', error2);
      } else {
        console.log('✅ Récupération par ID réussie');
        console.log(`   - Nom: ${donnaById.name}`);
        console.log(`   - Modèle: ${donnaById.model}`);
      }
    }

    // 4. Vérifier la configuration complète
    if (donna) {
      console.log('\n⚙️ 4. Vérification de la configuration...');
      
      const requiredFields = ['model', 'max_tokens', 'system_instructions', 'context_template', 'api_config'];
      const missingFields = requiredFields.filter(field => !donna[field]);
      
      if (missingFields.length > 0) {
        console.warn(`⚠️ Champs manquants: ${missingFields.join(', ')}`);
      } else {
        console.log('✅ Configuration complète');
      }
      
      console.log('\n📋 Configuration détaillée:');
      console.log(`   - Modèle: ${donna.model}`);
      console.log(`   - Max tokens: ${donna.max_tokens}`);
      console.log(`   - Température: ${donna.temperature}`);
      console.log(`   - Top P: ${donna.top_p}`);
      console.log(`   - API Config: ${JSON.stringify(donna.api_config)}`);
    }

  } catch (error) {
    console.error('❌ Erreur lors du test:', error);
  }
}

testDonnaAgent(); 