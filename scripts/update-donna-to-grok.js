import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function updateDonnaToGrok() {
  console.log('🚀 Mise à jour de Donna vers Grok...');
  
  try {
    // 1. Récupérer l'agent Donna actuel
    console.log('\n📊 1. Récupération de Donna...');
    const { data: currentDonna, error: fetchError } = await supabase
      .from('agents')
      .select('*')
      .eq('name', 'Donna')
      .single();

    if (fetchError || !currentDonna) {
      console.error('❌ Erreur récupération Donna:', fetchError);
      return;
    }

    console.log('✅ Donna trouvée !');
    console.log(`   - ID: ${currentDonna.id}`);
    console.log(`   - Modèle actuel: ${currentDonna.model}`);
    console.log(`   - Provider actuel: ${currentDonna.provider}`);

    // 2. Mettre à jour vers Grok
    console.log('\n🔄 2. Mise à jour vers Grok...');
    const { data: updatedDonna, error: updateError } = await supabase
      .from('agents')
      .update({
        model: 'grok-beta',
        provider: 'xai',
        api_config: {
          baseUrl: 'https://api.x.ai/v1',
          endpoint: '/chat/completions'
        }
      })
      .eq('id', currentDonna.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Erreur mise à jour:', updateError);
      return;
    }

    console.log('✅ Donna mise à jour avec succès !');
    console.log(`   - Nouveau modèle: ${updatedDonna.model}`);
    console.log(`   - Nouveau provider: ${updatedDonna.provider}`);
    console.log(`   - Nouvelle API: ${updatedDonna.api_config.baseUrl}`);

    // 3. Vérification
    console.log('\n🔍 3. Vérification...');
    const { data: verifyDonna, error: verifyError } = await supabase
      .from('agents')
      .select('*')
      .eq('id', currentDonna.id)
      .single();

    if (verifyError) {
      console.error('❌ Erreur vérification:', verifyError);
      return;
    }

    console.log('✅ Vérification réussie !');
    console.log(`   - Modèle: ${verifyDonna.model}`);
    console.log(`   - Provider: ${verifyDonna.provider}`);

    console.log('\n🎉 Donna utilise maintenant le modèle Grok !');
    console.log('\n💡 Avantages de Grok :');
    console.log('   - Raisonnement avancé');
    console.log('   - Compréhension contextuelle améliorée');
    console.log('   - Réponses plus naturelles');
    console.log('   - Meilleure gestion des tools');

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter le script
updateDonnaToGrok(); 