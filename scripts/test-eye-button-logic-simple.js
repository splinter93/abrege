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

async function testEyeButtonLogic() {
  try {
    console.log('🧪 Test de la logique du bouton œil...\n');

    // 1. Vérifier l'authentification
    console.log('1️⃣ Test d\'authentification...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('❌ Utilisateur non authentifié');
      console.log('💡 Connectez-vous d\'abord via l\'interface web');
      return;
    }

    console.log('✅ Utilisateur authentifié:', user.id);
    console.log('');

    // 2. Récupérer le username
    console.log('2️⃣ Récupération du username...');
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();

    if (userError || !userData?.username) {
      console.error('❌ Erreur récupération username:', userError?.message);
      return;
    }

    const username = userData.username;
    console.log('✅ Username récupéré:', username);
    console.log('');

    // 3. Récupérer les notes avec leurs paramètres de visibilité
    console.log('3️⃣ Récupération des notes...');
    
    const { data: notes, error: notesError } = await supabase
      .from('articles')
      .select('id, source_title, slug, share_settings')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (notesError) {
      console.error('❌ Erreur récupération notes:', notesError.message);
      return;
    }

    console.log(`📊 ${notes.length} note(s) trouvée(s)`);
    console.log('');

    // 4. Tester la logique du bouton œil pour chaque note
    console.log('4️⃣ Test de la logique du bouton œil...\n');
    
    notes.forEach((note, index) => {
      console.log(`📝 Note ${index + 1}: "${note.source_title}"`);
      console.log(`   - ID: ${note.id}`);
      console.log(`   - Slug: ${note.slug || '❌ MANQUANT'}`);
      console.log(`   - Visibilité: ${note.share_settings?.visibility || '❌ NON DÉFINIE'}`);
      
      // Simuler la logique du bouton œil
      console.log('   🔍 Test de la logique du bouton œil:');
      
      // Vérification 1: Visibilité
      if (note.share_settings?.visibility === 'private') {
        console.log('   ❌ BLOQUÉ: Note privée → Message: "Cette note est privée. Changez sa visibilité pour la prévisualiser."');
        console.log('');
        return;
      }
      
      // Vérification 2: Slug
      if (!note.slug) {
        console.log('   ❌ BLOQUÉ: Pas de slug → Message: "Cette note n\'a pas de slug. Publiez-la d\'abord."');
        console.log('');
        return;
      }
      
      // Vérification 3: Construction de l'URL
      const url = `https://scrivia.app/@${username}/${note.slug}`;
      console.log('   ✅ AUTORISÉ: Note accessible');
      console.log(`   🎯 URL construite: ${url}`);
      console.log(`   📱 Action: Ouverture dans un nouvel onglet`);
      console.log('');
    });

    // 5. Résumé des tests
    console.log('5️⃣ Résumé des tests...\n');
    
    const privateNotes = notes.filter(note => note.share_settings?.visibility === 'private');
    const notesWithoutSlug = notes.filter(note => !note.slug);
    const accessibleNotes = notes.filter(note => 
      note.slug && note.share_settings?.visibility !== 'private'
    );
    
    console.log('📊 Résultats des tests:');
    console.log(`   - Notes totales: ${notes.length}`);
    console.log(`   - Notes privées (bouton bloqué): ${privateNotes.length}`);
    console.log(`   - Notes sans slug (bouton bloqué): ${notesWithoutSlug.length}`);
    console.log(`   - Notes accessibles (bouton fonctionnel): ${accessibleNotes.length}`);
    console.log('');
    
    if (privateNotes.length > 0) {
      console.log('🔒 Notes privées (bouton œil bloqué):');
      privateNotes.forEach(note => {
        console.log(`   - "${note.source_title}" → Message: "Cette note est privée..."`);
      });
      console.log('');
    }
    
    if (notesWithoutSlug.length > 0) {
      console.log('⚠️  Notes sans slug (bouton œil bloqué):');
      notesWithoutSlug.forEach(note => {
        console.log(`   - "${note.source_title}" → Message: "Cette note n'a pas de slug..."`);
      });
      console.log('');
    }
    
    if (accessibleNotes.length > 0) {
      console.log('✅ Notes accessibles (bouton œil fonctionnel):');
      accessibleNotes.forEach(note => {
        console.log(`   - "${note.source_title}" → URL: /@${username}/${note.slug}`);
      });
      console.log('');
    }

    // 6. Recommandations
    console.log('6️⃣ Recommandations...\n');
    
    if (accessibleNotes.length === 0) {
      console.log('⚠️  Aucune note accessible trouvée');
      console.log('💡 Pour tester le bouton œil:');
      console.log('   1. Changez la visibilité d\'une note de "private" à "link-private"');
      console.log('   2. Ou créez une nouvelle note avec visibilité "link-private"');
    } else {
      console.log('🎯 Bouton œil testable sur les notes accessibles');
      console.log('💡 Testez en ouvrant l\'éditeur et en cliquant sur le bouton œil');
    }
    
    console.log('\n🎯 Test terminé!');

  } catch (error) {
    console.error('💥 Erreur fatale:', error);
  }
}

// Exécuter le test
testEyeButtonLogic().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
}); 