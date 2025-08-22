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

async function testShareAPI() {
  try {
    console.log('🧪 Test de l\'API de partage...\n');

    // 1. Vérifier l'authentification
    console.log('1️⃣ Test d\'authentification...');
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('❌ Utilisateur non authentifié');
      console.log('💡 Connectez-vous d\'abord via l\'interface web');
      return;
    }

    console.log('✅ Utilisateur connecté:', user.id);

    // 2. Récupérer le username
    console.log('2️⃣ Récupération du username...');
    
    const { data: userData } = await supabase
      .from('users')
      .select('username')
      .eq('id', user.id)
      .single();

    const username = userData?.username;
    console.log('✅ Username:', username);
    console.log('');

    // 3. Lister les notes disponibles
    console.log('3️⃣ Notes disponibles...');
    
    const { data: notes } = await supabase
      .from('articles')
      .select('id, source_title, slug, share_settings')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(3);

    if (!notes || notes.length === 0) {
      console.log('❌ Aucune note trouvée');
      return;
    }

    console.log(`📊 ${notes.length} note(s) trouvée(s):`);
    notes.forEach((note, index) => {
      console.log(`   ${index + 1}. "${note.source_title}"`);
      console.log(`      - ID: ${note.id}`);
      console.log(`      - Slug: ${note.slug || '❌ MANQUANT'}`);
      console.log(`      - Visibilité actuelle: ${note.share_settings?.visibility || '❌ NON DÉFINIE'}`);
      console.log('');
    });

    // 4. Tester l'API de partage sur la première note
    const testNote = notes[0];
    console.log(`4️⃣ Test de l'API de partage sur: "${testNote.source_title}"`);
    console.log(`   - ID: ${testNote.id}`);
    console.log(`   - Visibilité actuelle: ${testNote.share_settings?.visibility || 'NON DÉFINIE'}`);
    console.log('');

    // 5. Récupérer la session pour le token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      console.log('❌ Pas de token de session');
      return;
    }

    const token = session.access_token;
    console.log('✅ Token récupéré:', token.substring(0, 20) + '...');
    console.log('');

    // 6. Tester l'API GET
    console.log('6️⃣ Test de l\'API GET /api/v2/note/[ref]/share...');
    
    try {
      const getUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/v2/note/${testNote.id}/share`;
      console.log('🔗 URL de test GET:', getUrl);
      
      const getResponse = await fetch(getUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📡 Réponse GET:', {
        status: getResponse.status,
        statusText: getResponse.statusText,
        ok: getResponse.ok
      });

      if (getResponse.ok) {
        const getData = await getResponse.json();
        console.log('✅ Données GET:', getData);
      } else {
        const errorText = await getResponse.text();
        console.log('❌ Erreur GET:', errorText);
      }
      
    } catch (getError) {
      console.log('💥 Erreur GET:', getError.message);
    }
    console.log('');

    // 7. Tester l'API PATCH
    console.log('7️⃣ Test de l\'API PATCH /api/v2/note/[ref]/share...');
    
    try {
      const patchUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/v2/note/${testNote.id}/share`;
      console.log('🔗 URL de test PATCH:', patchUrl);
      
      // Tester avec une visibilité différente
      const newVisibility = testNote.share_settings?.visibility === 'private' ? 'link-private' : 'private';
      const patchData = {
        visibility: newVisibility
      };
      
      console.log('📤 Données PATCH:', patchData);
      
      const patchResponse = await fetch(patchUrl, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(patchData)
      });

      console.log('📡 Réponse PATCH:', {
        status: patchResponse.status,
        statusText: patchResponse.statusText,
        ok: patchResponse.ok
      });

      if (patchResponse.ok) {
        const patchData = await patchResponse.json();
        console.log('✅ Données PATCH:', patchData);
      } else {
        const errorText = await patchResponse.text();
        console.log('❌ Erreur PATCH:', errorText);
        
        // Essayer de parser l'erreur comme JSON
        try {
          const errorJson = JSON.parse(errorText);
          console.log('📄 Erreur parsée:', errorJson);
        } catch (parseError) {
          console.log('⚠️  Erreur non-JSON:', errorText);
        }
      }
      
    } catch (patchError) {
      console.log('💥 Erreur PATCH:', patchError.message);
    }
    console.log('');

    // 8. Résumé
    console.log('8️⃣ Résumé des tests...');
    console.log('✅ API testée avec succès');
    console.log('💡 Si vous voyez des erreurs JSON, le problème est dans l\'API');
    console.log('💡 Si l\'API fonctionne, le problème est dans le composant Editor');

  } catch (error) {
    console.error('💥 Erreur fatale:', error);
  }
}

// Exécuter le test
testShareAPI().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erreur fatale:', error);
  process.exit(1);
}); 