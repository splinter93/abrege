import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function Page(props: any) {
  const { username, slug } = await props.params;

  // Décoder l'username (retirer le @ et décoder l'URL)
  const decodedUsername = decodeURIComponent(username).replace(/^@/, '');

  // Chercher l'utilisateur par username
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('username', decodedUsername)
    .single();



  if (userError || !user) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Utilisateur non trouvé</h1>
        <p>Vérifiez l'URL ou contactez l'auteur.</p>
        <p>Debug: error = {userError?.message}</p>
      </div>
    );
  }

  // Chercher la note par slug et user_id, ispublished = true
  const { data: note, error: noteError } = await supabase
    .from('articles')
    .select('source_title, html_content, header_image, created_at, updated_at')
    .eq('slug', slug)
    .eq('user_id', user.id)
    .eq('ispublished', true)
    .single();

  if (noteError || !note) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1>Note non trouvée ou non publiée</h1>
        <p>Vérifiez l'URL ou contactez l'auteur.</p>
      </div>
    );
  }

  // Afficher directement le contenu (pas de redirection)
  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '2rem',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      lineHeight: 1.6,
      color: '#333'
    }}>
      {/* Header Image */}
      {note.header_image && (
        <img 
          src={note.header_image} 
          alt="Header"
          style={{ 
            width: '100%', 
            height: '300px', 
            objectFit: 'cover', 
            borderRadius: '12px',
            marginBottom: '2rem'
          }}
        />
      )}
      
      {/* Titre */}
      <h1 style={{ 
        fontSize: '2.5rem', 
        fontWeight: '700', 
        marginBottom: '1rem',
        color: '#1a1a1a'
      }}>
        {note.source_title}
      </h1>
      
      {/* Métadonnées */}
      <div style={{ 
        color: '#666', 
        fontSize: '0.9rem', 
        marginBottom: '2rem',
        borderBottom: '1px solid #eee',
        paddingBottom: '1rem'
      }}>
        <span>Créé le {new Date(note.created_at).toLocaleDateString('fr-FR')}</span>
        {note.updated_at !== note.created_at && (
          <span style={{ marginLeft: '1rem' }}>
            • Modifié le {new Date(note.updated_at).toLocaleDateString('fr-FR')}
          </span>
        )}
      </div>
      
      {/* Contenu HTML */}
      <div 
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: note.html_content || '' }}
        style={{
          fontSize: '1.1rem',
          lineHeight: 1.7
        }}
      />
      
      {/* Footer */}
      <div style={{ 
        marginTop: '3rem', 
        paddingTop: '2rem', 
        borderTop: '1px solid #eee',
        textAlign: 'center',
        color: '#666',
        fontSize: '0.9rem'
      }}>
        <p>Partagé via Abrège</p>
      </div>
    </div>
  );
} 