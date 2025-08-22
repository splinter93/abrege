import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Charger les variables d'environnement
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Variables d\'environnement manquantes');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function quickNoteCheck() {
  try {
    console.log('🔍 Vérification rapide de la note...\n');

    // 1. Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('❌ Utilisateur non authentifié');
      return;
    }

    console.log('✅ Utilisateur connecté:', user.id);

    // 2. Récupérer le username
    const { data: userData } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();

    const username = userData?.username;
    console.log('✅ Username:', username);
    console.log('');

    // 3. Vérifier la note spécifique
    const targetSlug = 'article-sur-le-lbo-2';
    console.log(`🎯 Recherche de la note: "${targetSlug}"`);
    
    // Recherche directe par slug
    const { data: noteBySlug, error: slugError } = await supabase
      .from('articles')
      .select('*')
      .eq('slug', targetSlug)
      .single();

    if (slugError) {
      console.log('❌ Note non trouvée par slug:', slugError.message);
    } else {
      console.log('✅ Note trouvée par slug:');
      console.log(`   - ID: ${noteBySlug.id}`);
      console.log(`   - Titre: "${noteBySlug.source_title}"`);
      console.log(`   - Slug: ${noteBySlug.slug}`);
      console.log(`   - User ID: ${noteBySlug.user_id}`);
      console.log(`   - Visibilité: ${noteBySlug.share_settings?.visibility || 'NON DÉFINIE'}`);
      console.log(`   - Créée: ${new Date(noteBySlug.created_at).toLocaleDateString()}`);
    }
    console.log('');

    // 4. Vérifier si la note appartient à l'utilisateur connecté
    if (noteBySlug) {
      if (noteBySlug.user_id === user.id) {
        console.log('✅ La note vous appartient');
        
        // Vérifier la visibilité
        if (noteBySlug.share_settings?.visibility === 'private') {
          console.log('🔒 La note est privée - pas accessible publiquement');
        } else {
          console.log('🌐 La note est accessible publiquement');
          console.log(`   URL: /@${username}/${noteBySlug.slug}`);
        }
      } else {
        console.log('⚠️  La note appartient à un autre utilisateur');
        console.log(`   - Votre ID: ${user.id}`);
        console.log(`   - ID propriétaire: ${noteBySlug.user_id}`);
      }
    }
    console.log('');

    // 5. Lister toutes vos notes pour comparaison
    console.log('📋 Vos notes:');
    const { data: yourNotes } = await supabase
      .from('articles')
      .select('id, source_title, slug, share_settings')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (yourNotes && yourNotes.length > 0) {
      yourNotes.forEach((note, index) => {
        console.log(`   ${index + 1}. "${note.source_title}"`);
        console.log(`      - Slug: ${note.slug || '❌ MANQUANT'}`);
        console.log(`      - Visibilité: ${note.share_settings?.visibility || '❌ NON DÉFINIE'}`);
        if (note.slug) {
          console.log(`      - URL: /@${username}/${note.slug}`);
        }
        console.log('');
      });
    } else {
      console.log('   Aucune note trouvée');
    }

    // 6. Résumé
    console.log('🎯 Résumé:');
    if (noteBySlug && noteBySlug.user_id === user.id) {
      if (noteBySlug.share_settings?.visibility === 'private') {
        console.log('❌ Note trouvée mais privée - changez sa visibilité');
      } else {
        console.log('✅ Note trouvée et accessible - l\'URL devrait fonctionner');
      }
    } else if (noteBySlug) {
      console.log('❌ Note trouvée mais appartient à un autre utilisateur');
    } else {
      console.log('❌ Note non trouvée avec ce slug');
    }

  } catch (error) {
    console.error('💥 Erreur:', error);
  }
}

// Exécuter la vérification
quickNoteCheck().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
}); 